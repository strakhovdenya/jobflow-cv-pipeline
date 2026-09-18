const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { RUNS_ROOT } = require('./config');
const { changedFilePathsFromPorcelain } = require('./parsing');
const { git } = require('./github');

// --- per-issue clone (replaces git worktree — see .claude/ralph/README.md) ---

function runDirFor(id) {
  return path.join(RUNS_ROOT, `issue-${id}`);
}

// Never throws — this is a best-effort cleanup, called from both the happy
// path (done/blocked) and error paths. A leftover process the agent started
// in the background (e.g. `npm run dev`, allowed via `Bash(npm run *)`) can
// hold an OS-level lock on files inside runDir well after the agent's own
// turn ends, making `rmSync` fail with EBUSY on Windows. Found live: a real
// BLOCKED run on #321 correctly posted its GitHub comment/label, then this
// call (previously unguarded) threw EBUSY and crashed the whole `run.js`
// process before it could move on to the next queued issue. Cleanup best-
// effort is an acceptable trade-off — a leftover `.ralph-runs/issue-N`
// directory is harmless clutter (the next run for that issue re-clones over
// it via `prepareClone()`'s own `removeRunDirIfExists()` call, or a human
// deletes it manually), whereas crashing the controller mid-loop silently
// drops every issue still queued after the current one.
function removeRunDirIfExists(runDir) {
  if (!fs.existsSync(runDir)) return;
  try {
    fs.rmSync(runDir, { recursive: true, force: true });
  } catch (err) {
    console.log(`⚠️ Не удалось удалить ${runDir} (не критично, продолжаю): ${err.message}`);
  }
}

// --- DEL_RALPH marker: agent marks a file for removal, controller renames it ---
//
// The agent never gets rm/mv/Remove-Item/unlinkSync permissions (see writeAgentPermissions()) —
// deliberate, same principle as the agent having no git/gh access at all: irreversible file
// mutations are owned by the deterministic controller, reacting to an explicit, checkable signal,
// never by the autonomous LLM unsupervised. Convention instead: the agent creates the new file as
// usual (Edit/Write already allowed), and leaves a `DEL_RALPH: <reason>` marker as the FIRST line
// of whatever file it wants removed, then finishes its turn normally (DONE) — even if the gate is
// red purely because the old (marked) and new file coexist under a conflicting name, that's an
// expected, temporary state (see buildTaskRules()'s explicit carve-out). This section's job is the
// controller side: find marker files among the CURRENT run's changed files only (not a full-repo
// scan — never want to pick up a marker left in some unrelated, already-committed file), rename
// them to `del_ralph_<original name>` (never delete — content survives, shows as a rename in the
// diff/PR), and re-run the real project gate itself before trusting the result, since the agent's
// own in-turn check necessarily ran against the still-conflicting layout.

const DEL_RALPH_MARKER_RE = /^DEL_RALPH:\s*(.*)$/m;

// Reads just enough of the file to see the marker line. Isolated into its own function
// (rather than inlined in findDelRalphMarkedFiles()) so a later retry layer can wrap exactly
// this call without touching the scanning/renaming logic around it.
function readFileHeadForMarker(absPath) {
  return fs.readFileSync(absPath, 'utf8').slice(0, 200);
}

function findDelRalphMarkedFiles(runDir, porcelain) {
  const files = changedFilePathsFromPorcelain(porcelain);
  const marked = [];
  for (const file of files) {
    let head;
    try {
      head = readFileHeadForMarker(path.join(runDir, file));
    } catch {
      continue; // file doesn't exist (legitimately removed) or isn't readable — not a candidate
    }
    if (DEL_RALPH_MARKER_RE.test(head)) marked.push(file);
  }
  return marked;
}

// Which of apps/api, apps/web the given changed-file paths (porcelain-derived, `/`-separated)
// actually touch — drives which app's own gate (tsc/lint/test, per its own CLAUDE.md) is worth
// re-running. A change confined to one app never pays for re-checking the other.
function determineTouchedApps(files) {
  const apps = new Set();
  for (const f of files) {
    if (f.startsWith('apps/api/')) apps.add('apps/api');
    else if (f.startsWith('apps/web/')) apps.add('apps/web');
  }
  return [...apps];
}

// Each app's own CLAUDE.md documents the same three commands as its "mandatory checks after any
// change": `npx tsc --noEmit`, `npm run lint`, `npm run test`. `npm`/`npx` are .cmd shims on
// Windows, same shell:true requirement as installDependencies() above.
const GATE_COMMANDS = [
  ['npx', ['tsc', '--noEmit']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'test']],
];

// Shared by the post-DEL_RALPH-rename check below and the unconditional pre-commit final gate —
// both need "is the real project gate green right now," not the agent's own self-report of it.
function runProjectGate(runDir, touchedApps) {
  if (touchedApps.length === 0) {
    return { ok: true, output: '(no apps/api or apps/web files touched — gate skipped)' };
  }
  const outputs = [];
  for (const app of touchedApps) {
    const dir = path.join(runDir, app);
    for (const [cmd, args] of GATE_COMMANDS) {
      const label = `${app}: ${cmd} ${args.join(' ')}`;
      try {
        const out = execFileSync(cmd, args, { cwd: dir, encoding: 'utf8', shell: true });
        outputs.push(`✅ ${label}\n${out.slice(-2000)}`);
      } catch (err) {
        const detail = `${err.stdout || ''}${err.stderr || err.message || ''}`.slice(-4000);
        outputs.push(`❌ ${label}\n${detail}`);
        return { ok: false, output: outputs.join('\n\n') };
      }
    }
  }
  return { ok: true, output: outputs.join('\n\n') };
}

// Renames every DEL_RALPH-marked file found in `porcelain`, then re-runs the real gate for
// whichever app(s) the CURRENT diff touches (not just the renamed files — the old+new conflict can
// break a build even for files that aren't themselves marked). `porcelain` in the return value is
// refreshed post-rename so the caller's next steps (review, commit) see the real, current state.
function applyDelRalphRenames(runDir, porcelain) {
  const marked = findDelRalphMarkedFiles(runDir, porcelain);
  if (marked.length === 0) return { applied: false, porcelain, gateOk: true, gateOutput: '' };

  for (const file of marked) {
    const absPath = path.join(runDir, file);
    const renamedPath = path.join(path.dirname(absPath), `del_ralph_${path.basename(absPath)}`);
    console.log(`🗑️ DEL_RALPH: переименовываю ${file} -> ${path.relative(runDir, renamedPath).replace(/\\/g, '/')}`);
    fs.renameSync(absPath, renamedPath);
  }

  const touchedApps = determineTouchedApps(changedFilePathsFromPorcelain(porcelain));
  const gate = runProjectGate(runDir, touchedApps);
  const freshPorcelain = git(['status', '--porcelain'], { cwd: runDir });
  return { applied: true, porcelain: freshPorcelain, gateOk: gate.ok, gateOutput: gate.output };
}

// Call site helper for runIssue(): applies any pending DEL_RALPH renames against the freshest
// porcelain, and turns a still-red post-rename gate into the same BLOCKED shape every other
// blocking outcome in runIssue() uses — the controller must never let a PR out with a build it
// knows is red, even though the agent itself is allowed to leave the pre-rename state red.
function handleDelRalphMarkers(runDir, porcelain) {
  const result = applyDelRalphRenames(runDir, porcelain);
  if (!result.applied) return { porcelain, blockedReason: null };
  if (!result.gateOk) {
    const reason = `DEL_RALPH: renamed marked file(s), but the project gate is still red afterwards — not safe to proceed:\n\n${result.gateOutput}`;
    return { porcelain: result.porcelain, blockedReason: reason };
  }
  console.log('✅ DEL_RALPH: rename applied, project gate green.');
  return { porcelain: result.porcelain, blockedReason: null };
}

function getOriginUrl() {
  return git(['remote', 'get-url', 'origin']);
}

function prepareClone(runDir, baseRef, branchName) {
  fs.mkdirSync(RUNS_ROOT, { recursive: true });
  removeRunDirIfExists(runDir);
  const originUrl = getOriginUrl();
  git(['clone', originUrl, runDir]);
  git(['checkout', '-b', branchName, baseRef], { cwd: runDir });
}

// `claude -p` skips the interactive workspace-trust DIALOG in non-interactive
// mode (confirmed via `claude --help`), but a directory that has never been
// trusted still silently drops permissions.allow entries from BOTH
// .claude/settings.json and settings.local.json ("this workspace has not
// been trusted") — same net effect as being blocked, just without a prompt
// to accept. Found live: every single `.ralph-runs/issue-*` directory ever
// created by this loop (confirmed via ~/.claude.json, including several from
// already-merged issues) has `hasTrustDialogAccepted: false`. Most passes
// (Edit/Write/Bash) apparently don't require it, but `Skill(code-review)`
// does — that's exactly what made #321's post-self-review code-review pass
// silently lose its Skill permission and end without a parseable verdict,
// escalating to a false BLOCKED even though the implementation itself was
// fine. Fixed at the source: mark the runDir trusted before the first
// `claude -p` call against it, the same fix the error message itself points
// at ('set projects[...].hasTrustDialogAccepted: true in ~/.claude.json').
function trustRunDir(runDir) {
  const claudeConfigPath = path.join(os.homedir(), '.claude.json');
  const resolved = path.resolve(runDir).replace(/\\/g, '/');
  // Windows drive-letter casing isn't guaranteed consistent between what
  // Node's path.resolve() produces here and whatever the `claude` CLI itself
  // normalizes a spawned `cwd` to internally — confirmed live: this same
  // machine's ~/.claude.json already has both "D:/projects_js/..." and
  // "d:/projects_js/.../.ralph-runs/issue-215" as separate project keys from
  // earlier runs. Writing both casings is cheap and removes the guesswork —
  // whichever one the CLI actually looks up will be trusted.
  const keys =
    /^[A-Za-z]:\//.test(resolved)
      ? [resolved.charAt(0).toUpperCase() + resolved.slice(1), resolved.charAt(0).toLowerCase() + resolved.slice(1)]
      : [resolved];
  let config;
  try {
    config = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));
  } catch (err) {
    console.log(`⚠️ Не удалось прочитать ${claudeConfigPath} для доверия рабочей директории (не критично): ${err.message}`);
    return;
  }
  config.projects = config.projects || {};
  for (const key of keys) {
    config.projects[key] = { ...(config.projects[key] || {}), hasTrustDialogAccepted: true };
  }
  try {
    fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2) + '\n');
  } catch (err) {
    console.log(`⚠️ Не удалось записать ${claudeConfigPath} для доверия рабочей директории (не критично): ${err.message}`);
  }
}

// A fresh clone has no node_modules at all (gitignored, like any checkout).
// The agent has no `npm install` permission — installing deps is
// environment setup, not part of "implement the issue," so the controller
// does it deterministically before the agent ever runs, not on the agent's
// own turns/time. Found the hard way: a real run against #215 sat silent
// for 23 minutes with almost no diff — most likely stuck on missing deps,
// since plain-text `-p` mode doesn't surface what a blocked/failing Bash
// call was even trying to do.
function installDependencies(runDir) {
  for (const app of ['apps/api', 'apps/web']) {
    const dir = path.join(runDir, app);
    if (!fs.existsSync(path.join(dir, 'package.json'))) continue;
    console.log(`📦 npm install в ${app}...`);
    // `npm` is a .cmd shim on Windows — execFileSync needs shell:true to
    // resolve it (unlike git/gh, which are plain .exe). Found via a real
    // ENOENT on a live smoke test.
    execFileSync('npm', ['install'], { cwd: dir, stdio: 'inherit', shell: true });
  }
}

// Reads the real .claude/skills/ directory inside the cloned runDir so the
// agent's permission list and prompt (see writeAgentPermissions() below and
// buildTaskRules() in prompts.js) always match whatever skills actually exist in
// this repo, instead of a hardcoded list that silently drifts the next time
// a skill is added/removed under .claude/skills/.
function listInstalledSkillNames(runDir) {
  const skillsDir = path.join(runDir, '.claude', 'skills');
  try {
    return fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

// A fresh clone only ever gets tracked files — .claude/settings.local.json
// (where a human's personal git*/gh* allow-list would live) never reaches
// it, and that's deliberate here: the agent gets NO git-mutation and NO gh
// permissions at all. It only edits code and reports DONE/BLOCKED; every
// git/gh mutation (commit, push, PR, issue comments/labels) is owned by
// this controller. See .claude/ralph/README.md for why.
//
// `skillNames` (from listInstalledSkillNames()) is granted here as
// `Skill(<name>)` per skill, minus `code-review` — that one is deliberately
// left out because it already has its own, narrower pass
// (writeCodeReviewPermissions()/buildCodeReviewPrompt()) with a
// report-only contract (no --fix/--comment); granting it here too would let
// the implementer invoke it mid-task without that same restriction,
// duplicating or conflicting with the dedicated pass. Without this grant at
// all, the Skill tool call is silently denied in headless (`claude -p`)
// mode — confirmed by the exact same class of bug already found and fixed
// for `code-review` itself (see writeCodeReviewPermissions()'s own note and
// trustRunDir()'s comment above for the sibling case of a silently-dropped
// permission).
function writeAgentPermissions(runDir) {
  const skillNames = listInstalledSkillNames(runDir).filter((name) => name !== 'code-review');
  // Self-sufficient on purpose — must not depend on whatever happens to be
  // committed in the repo's own .claude/settings.json at clone time (e.g.
  // right after this very redesign, main won't have it yet). Covers exactly
  // what ralph's prompt asks the agent to run.
  // 'Edit' and 'Write' are two separate tools/permissions — Edit only
  // covers modifying an existing file, Write covers creating a new one.
  // Missing 'Write' here once made a real run silently unable to create a
  // new spec file: the Write tool call was denied with nothing to approve
  // it in headless mode, and the agent burned many turns trying to work
  // around it via Bash (echo/heredoc/python/node -e/PowerShell), none of
  // which were allowlisted either.
  const settings = {
    permissions: {
      allow: [
        'Edit',
        'Write',
        'Bash(git status:*)',
        'Bash(git diff:*)',
        'Bash(git log:*)',
        // Broad on purpose (not one exact string per invocation) — a real
        // run tried `npm run test -- --testPathPattern=...`, which the
        // narrower exact-match version of this list didn't cover, and burned
        // several turns trying different shell syntax (cd/Set-Location/
        // --prefix) before we noticed. `npm run *`/`npx *` still can't touch
        // git/gh/the filesystem outside runDir — just covers "any npm
        // script, any npx tool, with any flags."
        'Bash(npm run *)',
        'Bash(npx *)',
        ...skillNames.map((name) => `Skill(${name})`),
      ],
      // Backstop for two of the prompt's own rules — a prompt instruction is
      // only a request, not an enforcement. Deny rules take precedence over
      // the blanket 'Edit'/'Write' allow above, so even if the agent ignores
      // the prompt (or a future prompt edit drops one of these rules), it
      // still cannot touch these paths:
      //  - .claude/** — its own permission files ("don't self-grant access").
      //  - apps/api/prisma/prompts/** and apps/api/knowledge-sources/** — AI
      //    prompts and the knowledge-source corpus; changing these is a
      //    deliberate product decision for a human, not an autonomous agent
      //    (the prompt's BLOCKED-PROMPT-CHANGE rule already asks the agent to
      //    stop instead of editing them — this makes that non-optional).
      deny: [
        'Edit(.claude/**)',
        'Write(.claude/**)',
        'Edit(apps/api/prisma/prompts/**)',
        'Write(apps/api/prisma/prompts/**)',
        'Edit(apps/api/knowledge-sources/**)',
        'Write(apps/api/knowledge-sources/**)',
      ],
    },
  };
  const dir = path.join(runDir, '.claude');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'settings.local.json'), JSON.stringify(settings, null, 2) + '\n');
}

// Overwrites the same settings.local.json with a strictly read-only profile
// for the post-DONE self-review pass (see runIssue()) — deliberately no
// 'Edit'/'Write' in `allow` at all (not even denied explicitly; omission is
// enough in headless mode, same as any other unlisted tool). The reviewer's
// only job is to read the diff and run verification commands, never to fix
// anything itself — if it finds a real problem, the whole iteration is
// BLOCKED and a human looks at it, rather than letting the reviewer "helpfully"
// patch its way to a false PASS.
function writeReviewerPermissions(runDir) {
  const settings = {
    permissions: {
      allow: [
        'Bash(git status:*)',
        'Bash(git diff:*)',
        'Bash(git log:*)',
        'Bash(git show:*)',
        'Bash(npm run *)',
        'Bash(npx *)',
      ],
    },
  };
  const dir = path.join(runDir, '.claude');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'settings.local.json'), JSON.stringify(settings, null, 2) + '\n');
}

// Same read-only rationale as writeReviewerPermissions() above, plus explicit
// permission to invoke the `code-review` skill via the Skill tool (not
// allowed by default) — this pass's whole job is to run that skill against
// the diff and report its findings, nothing else. `--fix`/`--comment` are
// deliberately never requested in the prompt (buildCodeReviewPrompt()) even
// though the skill supports them: this pass reports only, the same
// point-fix-then-re-review loop already used for self-review handles fixes,
// so a real human-equivalent second pass reviews the fix too instead of the
// skill silently patching its own finding.
//
// NOTE: the exact permission string for scoping the Skill tool to one named
// skill was not independently verified against a live headless run before
// this was written — if the first real run shows `code-review` being denied
// despite this entry, check the actual permission syntax Claude Code expects
// for Skill invocations (may need `'Skill'` unscoped, or a different pattern
// entirely) and fix this list, the same way writeAgentPermissions()'s
// Bash(npm run *) / Edit-vs-Write split were each found empirically (see
// README.md's "Ещё три находки" section).
function writeCodeReviewPermissions(runDir) {
  const settings = {
    permissions: {
      allow: [
        'Bash(git status:*)',
        'Bash(git diff:*)',
        'Bash(git log:*)',
        'Bash(git show:*)',
        'Bash(npm run *)',
        'Bash(npx *)',
        'Skill(code-review)',
      ],
    },
  };
  const dir = path.join(runDir, '.claude');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'settings.local.json'), JSON.stringify(settings, null, 2) + '\n');
}

module.exports = {
  runDirFor,
  removeRunDirIfExists,
  findDelRalphMarkedFiles,
  determineTouchedApps,
  runProjectGate,
  applyDelRalphRenames,
  handleDelRalphMarkers,
  getOriginUrl,
  prepareClone,
  trustRunDir,
  installDependencies,
  listInstalledSkillNames,
  writeAgentPermissions,
  writeReviewerPermissions,
  writeCodeReviewPermissions,
};
