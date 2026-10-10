const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { changedFilePathsFromPorcelain } = require('./parsing');
const { git, gitPorcelainStatus } = require('./github');
const { CREDENTIAL_ISOLATION_ENV } = require('./boundary');
const sandbox = require('./sandbox');

// `git status --porcelain -z -uall`: every untracked file individually (not collapsed to its
// directory) and raw paths — the form boundary.parseStatusZ() expects (issue #398). fsmonitor is
// forced off: the clone's .git is untrusted input for the host (#506).
function gitStatusZ(runDir) {
  return execFileSync('git', ['-c', 'core.fsmonitor=false', 'status', '--porcelain', '-z', '-uall'], { cwd: runDir, encoding: 'utf8' });
}

// --- per-issue clone (replaces git worktree — see .claude/ralph/README.md) ---

// Clone and session journals sit side by side under the runs root (sandbox.resolveRunsRoot):
// the journals dir is outside the clone, so nothing in it ever shows up in the clone's git status.
function runDirFor(runsRoot, id) {
  return path.join(runsRoot, `issue-${id}`);
}

function sessionsRootFor(runsRoot, id) {
  return path.join(runsRoot, `issue-${id}-sessions`);
}

const timestampForFile = (date = new Date()) => date.toISOString().replace(/[:.]/g, '-');

// One subfolder per run of an issue (start time), so a re-run never mixes its journals and install
// logs with an earlier run's, and nothing from an earlier run is deleted.
function runSessionsDirFor(runsRoot, id, startedAt = new Date()) {
  return path.join(sessionsRootFor(runsRoot, id), timestampForFile(startedAt));
}

// `box.timeoutMs` is a number or a function returning the time left for one sandbox step.
const stepTimeoutMs = (box) => (typeof box.timeoutMs === 'function' ? box.timeoutMs() : box.timeoutMs);

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

// Matches ONE line (no `m` flag). Accepts the bare form and a leading comment token (`//`, `#`,
// `/*`, `<!--`, `--`), because the prompt tells the agent to write `// DEL_RALPH: <reason>` in
// .ts/.js/.tsx files — a bare-only regex never found those markers.
const DEL_RALPH_MARKER_RE = /^\s*(?:\/\/|#|\/\*|<!--|--)?\s*DEL_RALPH:\s*(.*)$/;

// Only the FIRST line of the file counts (what the prompt promises) — a `DEL_RALPH:` mention
// deeper in the file (docs, comments about the mechanism itself) is not a removal request.
function hasDelRalphMarker(head) {
  const firstLine = head.replace(/^﻿/, '').split(/\r?\n/, 1)[0];
  return DEL_RALPH_MARKER_RE.test(firstLine);
}

// Retry delays for readFileHeadForMarker() below — found via a live incident (issue about
// migrating src/middleware.ts -> src/proxy.ts in a sibling project, 2026-09-18): right after
// `npm run build` fails inside the same runDir (the agent's own in-turn check on the still-
// conflicting old+new layout), a SEPARATE Node process reading one of those files a moment later
// can transiently get EPERM/EBUSY on Windows (worker-pool handles not yet released / AV scanning
// the freshly-written file) — reproduced live: a plain `node -e` read failed once with
// "Permission denied" immediately after `next build`, then succeeded on the very next attempt
// with zero code changes. Two short retries (not more — this is meant to ride out a millisecond-
// scale race, not mask a real, persistent failure) at increasing delays.
const MARKER_READ_RETRY_DELAYS_MS = [100, 250];

// Blocks THIS call only, via a zero-length SharedArrayBuffer — core.js/workspace.js are
// synchronous throughout (no async/await in the marker-read call chain), so a real sleep would
// otherwise require threading a Promise through every caller just for this one narrow case.
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Reads just enough of the file to see the marker line. Isolated into its own function
// (rather than inlined in findDelRalphMarkedFiles()) so the retry logic below wraps exactly
// this call without touching the scanning/renaming logic around it. `ENOENT` (file genuinely
// doesn't exist) is never retried — retrying it can't help and only delays the scan. Any other
// error is retried up to MARKER_READ_RETRY_DELAYS_MS.length times; if it's still failing with a
// non-ENOENT error after all attempts, that's logged explicitly rather than silently swallowed —
// the exact silent-failure class the live incident above found (a transient read error was
// previously caught by findDelRalphMarkedFiles() and treated identically to "file legitimately
// removed," with nothing printed, so the marker mechanism appeared to just do nothing).
function readFileHeadForMarker(absPath) {
  let lastErr;
  for (let attempt = 0; attempt <= MARKER_READ_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return fs.readFileSync(absPath, 'utf8').slice(0, 200);
    } catch (err) {
      lastErr = err;
      if (err.code === 'ENOENT') throw err;
      if (attempt < MARKER_READ_RETRY_DELAYS_MS.length) {
        sleepSync(MARKER_READ_RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  console.log(`⚠️ DEL_RALPH: не удалось прочитать ${absPath} после ${MARKER_READ_RETRY_DELAYS_MS.length} повторных попыток (${lastErr.code || lastErr.message}) — файл пропущен, маркер (если он там есть) не будет найден в этом прогоне.`);
  throw lastErr;
}

function findDelRalphMarkedFiles(runDir, porcelain) {
  const files = changedFilePathsFromPorcelain(porcelain);
  const marked = [];
  for (const file of files) {
    let head;
    try {
      head = readFileHeadForMarker(path.join(runDir, file));
    } catch {
      continue; // file doesn't exist (legitimately removed), or unreadable after retries (logged above)
    }
    if (hasDelRalphMarker(head)) marked.push(file);
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

// Each app's own CLAUDE.md documents typecheck, lint and test as its mandatory checks. The gate
// runs the tool binaries directly with `node`, not `npm run <script>` (issue #398): `scripts` in
// package.json is agent-editable, so `npm run lint` would run whatever the agent wrote there, with
// the operator's shell. No shell, no `--fix` (a gate must not change the tree it judges). The lint
// verdict matches CI on main, which runs each app's `npm run lint`: apps/api lints with `--fix`, so
// only problems left after auto-fixing fail it — `--fix-dry-run` computes the same fixes in memory
// and writes nothing. apps/web lints without fixing, as in CI.
const GATE_COMMANDS = {
  'apps/api': [
    ['node_modules/typescript/bin/tsc', ['--noEmit']],
    ['node_modules/eslint/bin/eslint.js', ['--fix-dry-run', '{src,libs,test}/**/*.ts']],
    ['node_modules/jest/bin/jest.js', []],
  ],
  'apps/web': [
    ['node_modules/typescript/bin/tsc', ['--noEmit']],
    ['node_modules/eslint/bin/eslint.js', ['.']],
    ['node_modules/vitest/vitest.mjs', ['run']],
  ],
};

// Gate commands run in the sandbox with no network at all (issue #506): the tests are agent-written
// code. Same `runCommand(dir, script, args)` contract as before — returns stdout, throws an error
// carrying stdout/stderr on a non-zero exit. `.git` is mounted read-only and every command has a
// time limit. `box`: { image, rootKey, runLabel, timeoutMs?, docker? }.
function createSandboxGateRunner(runDir, box) {
  return (dir, script, args) => {
    const result = sandbox.runInSandboxSync(
      {
        image: box.image,
        rootKey: box.rootKey,
        runLabel: box.runLabel,
        runDir,
        workdir: path.relative(runDir, dir),
        network: 'none',
        readOnlyGit: true,
        publicEnv: { ...CREDENTIAL_ISOLATION_ENV },
        command: ['node', script, ...args],
      },
      { docker: box.docker, timeoutMs: stepTimeoutMs(box) },
    );
    if (result.status === 0) return result.stdout;
    const reason = result.error ? result.error.message : `exit ${result.status}`;
    throw Object.assign(new Error(`node ${script} failed in the sandbox (${reason})`), { stdout: result.stdout, stderr: result.stderr });
  };
}

// Shared by the post-DEL_RALPH-rename check below and the unconditional pre-commit final gate —
// both need "is the real project gate green right now," not the agent's own self-report of it.
// `runCommand` is createSandboxGateRunner() in a real run, and the gate fails if the working tree
// changed while it ran (a test or tool rewriting files is not a green gate). Each command is
// announced on the console before it starts and reported with its duration when it ends: a
// command runs synchronously with its output captured, so without this the console is silent for
// minutes and the gate looks hung.
const secondsSince = (startMs) => Math.round((Date.now() - startMs) / 1000);

function runProjectGate(runDir, touchedApps, runCommand, log = console.log) {
  if (touchedApps.length === 0) {
    return { ok: true, output: '(no apps/api or apps/web files touched — gate skipped)' };
  }
  const statusBefore = gitStatusZ(runDir);
  const outputs = [];
  for (const app of touchedApps) {
    const dir = path.join(runDir, app);
    for (const [script, args] of GATE_COMMANDS[app]) {
      const label = `${app}: node ${script} ${args.join(' ')}`.trim();
      log(`   ⏳ ${label}...`);
      const startMs = Date.now();
      try {
        const out = runCommand(dir, script, args);
        log(`   ✅ ${label} — ${secondsSince(startMs)}s`);
        outputs.push(`✅ ${label}\n${String(out).slice(-2000)}`);
      } catch (error) {
        log(`   ❌ ${label} — ${secondsSince(startMs)}s`);
        const detail = `${error.stdout || ''}${error.stderr || error.message || ''}`.slice(-4000);
        outputs.push(`❌ ${label}\n${detail}`);
        return { ok: false, output: outputs.join('\n\n') };
      }
    }
  }
  if (gitStatusZ(runDir) !== statusBefore) {
    outputs.push('❌ git status changed while the gate was running — a check modified the working tree.');
    return { ok: false, output: outputs.join('\n\n') };
  }
  return { ok: true, output: outputs.join('\n\n') };
}

// Composes changedFilePathsFromPorcelain -> determineTouchedApps -> runProjectGate — shared by
// applyDelRalphRenames() below and core.js's own unconditional final gate, which both need "run
// the real gate for whichever app(s) this porcelain touches" and previously each wrote out the
// same three-function chain by hand (found by /code-review).
function runProjectGateForPorcelain(runDir, porcelain, runCommand, log) {
  return runProjectGate(runDir, determineTouchedApps(changedFilePathsFromPorcelain(porcelain)), runCommand, log);
}

// Renames every DEL_RALPH-marked file found in `porcelain`, then re-runs the real gate for
// whichever app(s) the CURRENT diff touches (not just the renamed files — the old+new conflict can
// break a build even for files that aren't themselves marked). `porcelain` in the return value is
// refreshed post-rename so the caller's next steps (review, commit) see the real, current state.
function applyDelRalphRenames(runDir, porcelain, runCommand) {
  const marked = findDelRalphMarkedFiles(runDir, porcelain);
  if (marked.length === 0) return { applied: false, porcelain, gateOk: true, gateOutput: '' };

  for (const file of marked) {
    const absPath = path.join(runDir, file);
    const renamedPath = path.join(path.dirname(absPath), `del_ralph_${path.basename(absPath)}`);
    console.log(`🗑️ DEL_RALPH: переименовываю ${file} -> ${path.relative(runDir, renamedPath).replace(/\\/g, '/')}`);
    fs.renameSync(absPath, renamedPath);
  }

  const gate = runProjectGateForPorcelain(runDir, porcelain, runCommand);
  const freshPorcelain = gitPorcelainStatus({ cwd: runDir });
  return { applied: true, porcelain: freshPorcelain, gateOk: gate.ok, gateOutput: gate.output };
}

// Call site helper for runIssue(): applies any pending DEL_RALPH renames against the freshest
// porcelain, and turns a still-red post-rename gate into the same BLOCKED shape every other
// blocking outcome in runIssue() uses — the controller must never let a PR out with a build it
// knows is red, even though the agent itself is allowed to leave the pre-rename state red.
function handleDelRalphMarkers(runDir, porcelain, runCommand) {
  const result = applyDelRalphRenames(runDir, porcelain, runCommand);
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

// While agents run, `origin` has an unusable push URL (issue #398): git credentials come from the
// OS credential helper, not from env, so a scrubbed env alone would not stop `git push`. The
// controller restores the real URL with enablePush() right before its own pushBranch().
const DISABLED_PUSH_URL = 'no-push://ralph-agent-push-disabled';

// `originUrl` defaults to this repository's origin; tests pass a local repository.
function prepareClone(runsRoot, runDir, baseRef, branchName, originUrl = getOriginUrl()) {
  fs.mkdirSync(runsRoot, { recursive: true });
  removeRunDirIfExists(runDir);
  git(['clone', originUrl, runDir]);
  git(['checkout', '-b', branchName, baseRef], { cwd: runDir });
  git(['remote', 'set-url', '--push', 'origin', DISABLED_PUSH_URL], { cwd: runDir });
}

function enablePush(runDir) {
  git(['remote', 'set-url', '--push', 'origin', getOriginUrl()], { cwd: runDir });
}

// `claude -p` skips the interactive workspace-trust DIALOG in non-interactive
// mode (confirmed via `claude --help`), but a directory that has never been
// trusted still silently drops permissions.allow entries from BOTH
// .claude/settings.json and settings.local.json ("this workspace has not
// been trusted") — same net effect as being blocked, just without a prompt
// to accept. Most passes (Edit/Write/Bash) apparently don't require it, but
// `Skill(code-review)` does — that's exactly what made #321's post-self-review
// code-review pass silently lose its Skill permission and end without a
// parseable verdict, escalating to a false BLOCKED.
//
// In the sandbox (issue #506) claude reads its config from CLAUDE_CONFIG_DIR, which is this call's
// own session dir, so the trust entry is written there for the container path of the clone — the
// operator's ~/.claude.json is never read or written. One fresh dir per agent call: a session dir
// the implementer could write into (settings, hooks) is never reused by a later read-only pass.
function prepareAgentSessionDir(sessionsRoot, label) {
  const dir = path.join(sessionsRoot, label);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const config = { projects: { [sandbox.CONTAINER_WORKDIR]: { hasTrustDialogAccepted: true } } };
  fs.writeFileSync(path.join(dir, '.claude.json'), JSON.stringify(config, null, 2) + '\n');
  return dir;
}

// One npm/node step of a dependency install, in the sandbox on the run's proxy network. The full
// output goes to a log file in the run's sessions root (next to the journals, outside the clone),
// whose path is part of any failure message. `.git` is mounted read-only. `box`: { image, rootKey,
// runLabel, network, proxyUrl, installEnv, logsDir, timeoutMs?, docker? }.
function runInstallStep(runDir, box, { label, workdir, command }) {
  fs.mkdirSync(box.logsDir, { recursive: true });
  const logPath = path.join(box.logsDir, `install-${label.replace(/[^A-Za-z0-9_-]+/g, '_')}-${timestampForFile()}.log`);
  const where = workdir || '.';
  console.log(`📦 ${command.join(' ')} в ${where} (песочница, лог: ${logPath})...`);
  const result = sandbox.runInSandboxSync(
    {
      image: box.image,
      rootKey: box.rootKey,
      runLabel: box.runLabel,
      runDir,
      workdir,
      network: box.network,
      proxyUrl: box.proxyUrl,
      readOnlyGit: true,
      // Isolation last: an install env entry can never switch the credential-helper reset off.
      publicEnv: { ...(box.installEnv || {}), ...CREDENTIAL_ISOLATION_ENV },
      command,
    },
    { docker: box.docker, timeoutMs: stepTimeoutMs(box) },
  );
  const reason = result.error ? result.error.message : `exit ${result.status}`;
  const log = [
    `$ ${command.join(' ')}  (cwd: ${where}, container: ${result.name})`,
    '--- stdout',
    result.stdout,
    '--- stderr',
    result.stderr,
    `--- ${reason}`,
    '',
  ].join('\n');
  fs.writeFileSync(logPath, log);
  if (result.status === 0) return { ok: true, logPath, error: null };
  return { ok: false, logPath, error: `${command.join(' ')} in ${where} failed (${reason}); full output: ${logPath}` };
}

// A fresh clone has no node_modules at all (gitignored, like any checkout).
// The agent has no `npm install` permission — installing deps is
// environment setup, not part of "implement the issue," so the controller
// does it deterministically before the agent ever runs, not on the agent's
// own turns/time. Found the hard way: a real run against #215 sat silent
// for 23 minutes with almost no diff — most likely stuck on missing deps,
// since plain-text `-p` mode doesn't surface what a blocked/failing Bash
// call was even trying to do. Runs in the sandbox (issue #506): package scripts never see the
// operator's HOME, and the network is the proxy allowlist.
function installDependencies(runDir, box) {
  // Repo root: only to obtain the `metaskills` skill copies in .claude/skills (root postinstall).
  // `--ignore-scripts` on purpose — root's `prepare: husky` would otherwise point the clone's
  // core.hooksPath at the repo's pre-commit hook and interfere with the controller's own commit —
  // so the copy script is run explicitly afterwards. Best-effort: never blocks the run.
  if (fs.existsSync(path.join(runDir, 'package.json'))) {
    const steps = [
      { label: 'root', workdir: '', command: ['npm', 'install', '--ignore-scripts'] },
      { label: 'root-metaskills', workdir: '', command: ['node', 'scripts/setup-metaskills.js'] },
    ];
    for (const step of steps) {
      const result = runInstallStep(runDir, box, step);
      if (!result.ok) {
        console.log(`⚠️ root install / setup-metaskills не удался (не блокирует прогон): ${result.error}`);
        break;
      }
    }
  }
  for (const app of ['apps/api', 'apps/web']) {
    if (!fs.existsSync(path.join(runDir, app, 'package.json'))) continue;
    const result = runInstallStep(runDir, box, { label: app, workdir: app, command: ['npm', 'install'] });
    if (!result.ok) throw new Error(result.error);
  }
}

// The agent has no `npm install` permission (deliberately — see installDependencies()), so when an
// issue needs a NEW dependency its only option is hand-editing package.json, leaving
// package-lock.json stale. tsc/lint/build all run against the already-warm node_modules and never
// notice; only `npm ci` (CI) does. So the controller regenerates the lock file itself, after the
// agent's turn and BEFORE the final gate — same "controller does deterministically what the agent
// may not" pattern as DEL_RALPH. Runs `npm install` in the directory of every changed package.json
// (apps/api, apps/web, repo root), in the sandbox like installDependencies().
function syncLockfileIfPackageJsonChanged(runDir, box) {
  let porcelain;
  try {
    porcelain = gitPorcelainStatus({ cwd: runDir });
  } catch (err) {
    return { ok: false, ran: false, error: `git status failed: ${err.message}` };
  }
  const dirs = [
    ...new Set(
      changedFilePathsFromPorcelain(porcelain)
        .filter((f) => f === 'package.json' || f.endsWith('/package.json'))
        .map((f) => path.posix.dirname(f))
    ),
  ];
  if (dirs.length === 0) return { ok: true, ran: false };

  for (const rel of dirs) {
    console.log(`package.json изменён этим прогоном в '${rel}' — пересобираю package-lock.json (npm install --ignore-scripts)...`);
    // No lifecycle scripts: a dependency the agent added does not get to run its install scripts
    // (issue #398). Not --package-lock-only: the final gate typechecks and tests against
    // node_modules, so a new import must actually be installed.
    const workdir = rel === '.' ? '' : rel;
    const step = { label: `lockfile-${rel}`, workdir, command: ['npm', 'install', '--ignore-scripts'] };
    const result = runInstallStep(runDir, box, step);
    if (!result.ok) return { ok: false, ran: true, error: result.error, logPath: result.logPath };
  }
  return { ok: true, ran: true };
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

// Commands every profile may run. Explicit tools only (issue #398): no `npm run *` (runs agent-
// editable package.json scripts) and no bare `npx *` (runs any package, including one that pushes).
const CHECK_COMMANDS = ['tsc', 'jest', 'eslint', 'vitest'].flatMap((tool) => [
  `Bash(npx ${tool})`,
  `Bash(npx ${tool} *)`,
]);
const READ_ONLY_GIT = ['Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)'];

// Denied for every profile, whatever allow says.
const COMMON_DENY = [
  'Bash(npx prisma migrate reset*)',
  'Bash(npx prisma db push*)',
  'Bash(git push*)',
  'Bash(git commit*)',
  'Bash(gh *)',
];

// Protected paths also checked after every turn by the controller (config.js PROTECTED_PATHS);
// these deny rules stop the ordinary Edit/Write attempt before it happens.
const PROTECTED_EDIT_DENY = [
  '.claude/**',
  'scripts/**',
  '.github/**',
  '.husky/**',
  '.git/**',
  'apps/api/prisma/prompts/**',
  'apps/api/knowledge-sources/**',
].flatMap((pattern) => [`Edit(${pattern})`, `Write(${pattern})`]);

// settings.local.json is gitignored, so a link planted there by code the run executed (a test, an
// npm script) would not show up in git status. The controller never writes through a link: the
// `.claude` dir must resolve inside the clone, and an existing file or link is removed first, then
// the file is created exclusively (#506).
function writeSettings(runDir, permissions) {
  const dir = path.join(runDir, '.claude');
  fs.mkdirSync(dir, { recursive: true });
  const relative = path.relative(fs.realpathSync(runDir), fs.realpathSync(dir));
  const isInsideClone = relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  if (!isInsideClone) throw new Error(`refusing to write agent settings: ${dir} resolves outside the clone`);
  const file = path.join(dir, 'settings.local.json');
  fs.rmSync(file, { force: true });
  fs.writeFileSync(file, JSON.stringify({ permissions }, null, 2) + '\n', { flag: 'wx' });
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
// prepareAgentSessionDir()'s comment above for the sibling case of a silently-dropped
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
  writeSettings(runDir, {
    allow: [
      'Edit',
      'Write',
      ...READ_ONLY_GIT,
      ...CHECK_COMMANDS,
      ...skillNames.map((name) => `Skill(${name})`),
      // Headless `claude -p` silently denies the Agent tool unless granted here (same class
      // as the Skill grant above). Granted for all subagents in .claude/agents/ — a subagent
      // runs in this same runDir under this same settings.local.json, so it is bound by the
      // deny rules below.
      'Agent',
    ],
    // Deny rules take precedence over the blanket 'Edit'/'Write' allow above (and over the
    // shared .claude/settings.json `Edit(apps/**)`):
    //  - .claude/** — its own permission files ("don't self-grant access").
    //  - scripts/**, .github/**, .husky/**, .git/** — code the controller, hooks or CI execute.
    //  - apps/api/prisma/prompts/** and apps/api/knowledge-sources/** — AI prompts and the
    //    knowledge-source corpus; changing these is a deliberate product decision for a human
    //    (the prompt's BLOCKED-PROMPT-CHANGE rule asks the agent to stop instead).
    deny: [...PROTECTED_EDIT_DENY, ...COMMON_DENY],
  });
}

// Overwrites the same settings.local.json with a strictly read-only profile for the post-DONE
// self-review pass (see runIssue()). No 'Edit'/'Write' in `allow`, and since #398 an explicit
// `Edit(**)`/`Write(**)` deny as well: the shared .claude/settings.json allows `Edit(apps/**)`,
// and only a deny overrides that. The reviewer's only job is to read the diff and run
// verification commands, never to fix anything itself — if it finds a real problem, the
// iteration goes to a fixer or is BLOCKED, rather than the reviewer "helpfully" patching its way
// to a false PASS. core.js additionally blocks if the working tree changed during the pass.
function writeReviewerPermissions(runDir) {
  writeSettings(runDir, {
    allow: [...READ_ONLY_GIT, 'Bash(git show:*)', ...CHECK_COMMANDS],
    deny: ['Edit(**)', 'Write(**)', 'NotebookEdit', ...COMMON_DENY],
  });
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
function writeCodeReviewPermissions(runDir) {
  writeSettings(runDir, {
    allow: [...READ_ONLY_GIT, 'Bash(git show:*)', ...CHECK_COMMANDS, 'Skill(code-review)'],
    deny: ['Edit(**)', 'Write(**)', 'NotebookEdit', ...COMMON_DENY],
  });
}

module.exports = {
  runDirFor,
  sessionsRootFor,
  runSessionsDirFor,
  removeRunDirIfExists,
  findDelRalphMarkedFiles,
  hasDelRalphMarker,
  determineTouchedApps,
  runProjectGate,
  runProjectGateForPorcelain,
  applyDelRalphRenames,
  handleDelRalphMarkers,
  getOriginUrl,
  gitStatusZ,
  prepareClone,
  enablePush,
  prepareAgentSessionDir,
  createSandboxGateRunner,
  installDependencies,
  syncLockfileIfPackageJsonChanged,
  listInstalledSkillNames,
  writeAgentPermissions,
  writeReviewerPermissions,
  writeCodeReviewPermissions,
};
