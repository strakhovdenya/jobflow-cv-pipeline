const { execFileSync } = require('child_process');
const { BLOCK_LABEL, GENERIC_BLOCK_LABEL } = require('./config');

// --- git/gh helpers ---

function git(args, opts) {
  return execFileSync('git', args, { encoding: 'utf8', ...opts }).trim();
}

// `git status --porcelain` is position-significant (`XY path`, X/Y are one status char each and
// often a literal space, e.g. ` M path` for an unstaged edit). The generic git() above .trim()s the
// WHOLE output, which eats that leading space on the FIRST line only — a fixed-offset parser
// (`line.slice(3)`) then loses one real path character there. Only the trailing newline is safe to
// strip. See README "Incidents" (porcelain trim).
function gitPorcelainStatus(opts) {
  return execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8', ...opts }).replace(/\r?\n$/, '');
}

function gh(args, opts) {
  return execFileSync('gh', args, { encoding: 'utf8', ...opts }).trim();
}

function issueState(id) {
  try {
    const out = gh(['issue', 'view', String(id), '--json', 'number,title,body,url,state,labels']);
    return JSON.parse(out);
  } catch {
    return null;
  }
}

function hasExistingPr(config, id) {
  try {
    const out = gh(['pr', 'list', '--state', 'all', '--search', `head:${config.branchPrefix}${id}-`, '--json', 'number,state']);
    return JSON.parse(out).length > 0;
  } catch {
    return false;
  }
}

function slugify(title) {
  const slug = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return slug || 'issue';
}

function branchNameFor(config, id, title) {
  return `${config.branchPrefix}${id}-${slugify(title)}`;
}

// Classifies every configured Issue against live GitHub state. Adds:
// - 'blocked' / 'blocked-by-dependency': ralph-needs-prompt-change label,
//   direct or transitive through dependsOn.
// - for 'not-started' entries only, `ready: boolean` — true when every
//   dependsOn entry already has a usable base to branch from (done/merged,
//   or in-flight with its own branch/PR already existing).
function classify(config) {
  const raw = config.issues.map((entry) => {
    const info = issueState(entry.id);
    if (!info) return { ...entry, status: 'unknown' };
    if (info.state !== 'OPEN') return { ...entry, status: 'done', title: info.title };
    if ((info.labels || []).some((l) => l.name === BLOCK_LABEL || l.name === GENERIC_BLOCK_LABEL)) return { ...entry, status: 'blocked', title: info.title, body: info.body };
    return { ...entry, status: hasExistingPr(config, entry.id) ? 'in-flight' : 'not-started', title: info.title, body: info.body };
  });

  const byId = new Map(raw.map((e) => [e.id, e]));

  function isBlockedTransitively(id, seen) {
    if (seen.has(id)) return false;
    seen.add(id);
    const entry = byId.get(id);
    if (!entry) return false;
    if (entry.status === 'blocked') return true;
    return (entry.dependsOn || []).some((depId) => isBlockedTransitively(depId, seen));
  }

  const withBlocking = raw.map((entry) => {
    if (entry.status === 'not-started' && isBlockedTransitively(entry.id, new Set())) {
      return { ...entry, status: 'blocked-by-dependency' };
    }
    return entry;
  });

  const byId2 = new Map(withBlocking.map((e) => [e.id, e]));
  return withBlocking.map((entry) => {
    if (entry.status !== 'not-started') return entry;
    const ready = (entry.dependsOn || []).every((depId) => {
      const dep = byId2.get(depId);
      return dep && (dep.status === 'done' || dep.status === 'in-flight');
    });
    return { ...entry, ready };
  });
}

// Which ref a new branch should be created from: origin/main for an
// independent issue, or the dependency's own remote branch (stacked PR) if
// it's not merged yet — always returned as an origin/... ref, since a fresh
// clone only has remote-tracking refs, no local branches of its own yet.
function resolveBaseRef(config, byId, entry) {
  if (!entry.dependsOn || entry.dependsOn.length === 0) return 'origin/main';
  const depId = entry.dependsOn[0];
  const dep = byId.get(depId);
  if (dep.status === 'done') return 'origin/main';
  return `origin/${branchNameFor(config, depId, dep.title)}`;
}

// --- controller-owned git/gh mutations (the agent never does these) ---

// `coverage` (optional, from parsing.js summarizeSelfReportedCoverage()) shows how close the run got
// to done — the run directory is kept on BLOCKED, so this tells a human whether to finish by hand
// or re-run. Explicitly labeled as the agent's own unverified claim, like the DONE comment.
function postBlockedComment(id, reason, promptChange, coverage) {
  const coverageLine = coverage
    ? `\n\nСамоотчёт агента на момент блокировки (не проверено независимо): ${coverage.covered} из ${coverage.total} пунктов Acceptance Criteria отмечены как COVERED.`
    : '';
  gh(['issue', 'comment', String(id), '--body', `BLOCKED: ${reason}${coverageLine}`]);
  gh(['issue', 'edit', String(id), '--add-label', GENERIC_BLOCK_LABEL]);
  if (promptChange) {
    gh(['issue', 'edit', String(id), '--add-label', BLOCK_LABEL]);
  }
}

// Posts ONE combined GitHub Issue comment per DONE — the agent's Acceptance
// Criteria self-report AND the test-evidence record (commands/result/evidence)
// that `project-management/TEST_LOG.md` used to hold before ADR-035 migrated
// it to issue comments. Deliberately one comment, not two: an earlier draft of
// this had a separate postAcceptanceCriteriaComment() call right next to what
// was then appendTestLogEntry()'s file-append — both fired on every DONE, so a
// batch run's issue history would carry two Ralph comments per issue for what
// is really one event (one DONE verdict). Combined here instead.
//
// Independent of whether the AC self-report fully reconciled (see
// reconcileAcceptanceCriteria()) — this always posts, since transparency about
// a partial/failed match matters at least as much as a clean one, and a batch
// run's intermediate PRs need to stay auditable without anyone digging through
// a `.ralph-runs/issue-N` log that gets deleted after the run. `allCovered`
// only changes the header wording, not whether the comment is posted.
//
// The agent itself never writes this (no `gh` access at all — see
// writeAgentPermissions()) and never touched `TEST_LOG.md` for the same
// reason before it existed: this record has to be something a human would
// agree is honest, and the controller can only report what it actually
// observed (the agent's own DONE verdict) — hence the explicit "self-reported,
// not independently re-verified" framing kept below, unchanged from the old
// TEST_LOG.md entry's wording.
function postTestEvidenceComment(chosen, verdict, branchName, acItems, selfReport, allCovered, checkedOff) {
  const date = new Date().toISOString().slice(0, 10);
  const sections = [];

  if (acItems.length > 0) {
    const byIndex = new Map(selfReport.map((e) => [e.index, e]));
    const acLines = acItems.map((text, i) => {
      const entry = byIndex.get(i + 1);
      const mark = entry && entry.status === 'covered' ? '✅' : '⏳';
      const detail = entry ? entry.detail : 'нет соответствующей строки в самоотчёте агента';
      return `${mark} ${i + 1}. ${text}\n   ${detail}`;
    });
    // `checkedOff` (not `allCovered`) drives the wording — allCovered only
    // says the self-report reconciled; checkedOff confirms `gh issue edit`
    // actually succeeded. A reconciled-but-failed-to-edit case (rare `gh`
    // failure) must not claim the boxes were checked when they weren't.
    const acHeader = checkedOff
      ? '**Acceptance Criteria** — все пункты покрыты, чек-боксы отмечены автоматически:'
      : allCovered
        ? '**Acceptance Criteria** — все пункты покрыты по самоотчёту, но отметить чек-боксы через `gh issue edit` не удалось (см. лог контроллера) — нужна ручная отметка:'
        : '**Acceptance Criteria** — не все пункты подтверждены (см. ⏳ ниже), чек-боксы НЕ отмечены автоматически, нужна ручная проверка перед мержем:';
    sections.push(`${acHeader}\n\n${acLines.join('\n\n')}`);
  }

  sections.push(
    [
      `**Test evidence** — ${date}, branch \`${branchName}\`.`,
      '',
      'Agent-reported DONE — self-reported by the autonomous agent, not independently re-verified by the controller.',
      '',
      `- TYPE: ${verdict.type}`,
      `- SUMMARY: ${verdict.summary}`,
    ].join('\n'),
  );

  gh(['issue', 'comment', String(chosen.id), '--body', sections.join('\n\n---\n\n')]);
}

// The only place the controller mutates an issue's Acceptance Criteria
// checkboxes — and only ever to `[x]`, only for indices reconcileAcceptanceCriteria()
// confirmed as an exact, honest match (see its own comment for why a partial
// match checks off nothing rather than just the matched subset: a self-report
// that skips one item is a sign the agent itself wasn't sure about it, and
// silently checking off the rest would look more verified than it is).
// Re-fetches the issue body fresh (not `chosen.body`, which was captured at
// classify() time and could be stale) so this can't clobber an edit someone
// made to the issue in the meantime.
function checkOffAcceptanceCriteria(id) {
  const freshBody = gh(['issue', 'view', String(id), '--json', 'body', '-q', '.body']);
  // Same index-slicing approach as extractAcceptanceCriteriaItems() above, for
  // the same reason (no `\Z` in JS, `$` under `/m` is line-scoped not
  // string-scoped) — isolate the Acceptance Criteria section's exact span,
  // edit only within it, then splice it back into the untouched rest of the body.
  const headingMatch = /^##\s*Acceptance Criteria\s*$/m.exec(freshBody);
  if (!headingMatch) return;
  const sectionStart = headingMatch.index + headingMatch[0].length;
  const afterHeading = freshBody.slice(sectionStart);
  const nextHeadingMatch = /^##\s/m.exec(afterHeading);
  const sectionEnd = nextHeadingMatch ? sectionStart + nextHeadingMatch.index : freshBody.length;
  const section = freshBody.slice(sectionStart, sectionEnd);
  const updatedSection = section.replace(/^-\s*\[ \]/gm, '- [x]');
  if (updatedSection === section) return; // nothing to change — already checked
  const updated = freshBody.slice(0, sectionStart) + updatedSection + freshBody.slice(sectionEnd);
  gh(['issue', 'edit', String(id), '--body', updated]);
}

// Fixed project infrastructure, same convention as BLOCK_LABEL/GENERIC_BLOCK_LABEL
// (config.js — not per-run config.json — this is a repo-wide constant, not something
// that varies between Ralph invocations). See issue #334's own body for the
// full rationale/triage process. If this tracker issue is ever recreated
// (closed and replaced), update this number.
const TECH_DEBT_TRACKER_ISSUE = 334;

// Non-blocking — unlike postBlockedComment() above, this does NOT add
// ralph-blocked/ralph-needs-prompt-change and does NOT stop this issue's own
// run. Code-review findings outside this issue's own `## Affects` list (see
// buildCodeReviewPrompt()'s scope-check) are NOT safe to fix inline (the
// flagged code may exist that way because of a deliberate decision in a
// different, already-closed issue that this pass can't see) and NOT safe to
// silently drop either — so they go to a single persistent tracker issue
// (#334) as a raw backlog entry for a human to triage later, with a short
// pointer comment left on the current issue too so the connection is visible
// from either side.
function postOutOfScopeNote(id, findings) {
  gh(['issue', 'comment', String(TECH_DEBT_TRACKER_ISSUE), '--body', `From issue #${id} (code-review, Ralph loop, out-of-scope for that issue — not auto-fixed):\n\n${findings}`]);
  gh(['issue', 'comment', String(id), '--body', `code-review (Ralph loop) found out-of-scope finding(s) while reviewing this issue's diff — filed to tech-debt tracker #${TECH_DEBT_TRACKER_ISSUE} instead of fixing here: ${findings}`]);
}

function commitChanges(runDir, chosen, verdict) {
  git(['add', '-A'], { cwd: runDir });
  const message = `${verdict.type}: ISSUE-${chosen.id} ${verdict.summary}`;
  git(['commit', '-m', message], { cwd: runDir });
  return message;
}

function pushBranch(runDir, branchName) {
  git(['push', '-u', 'origin', branchName], { cwd: runDir });
}

function createPr(chosen, branchName, baseRef, commitMessage) {
  const base = baseRef.replace(/^origin\//, '');
  // The controller deliberately never runs `gh issue edit` to check off Acceptance Criteria —
  // same reasoning as postTestEvidenceComment() above: doing so would claim "verified" for something
  // only the agent's self-report actually observed, including any Test Requirement step needing a
  // live server/DB the agent has no access to (see buildTaskRules()). This is intentionally left
  // unchecked rather than routed to a human prompt: a chained batch run (resolveBaseRef() branches
  // issue N+1 directly off issue N's still-open, unmerged PR branch — see dependsOn) never waits
  // for a human to look at an intermediate PR, so a "please check this before merging" note here
  // would go unread for however long the chain keeps running. An honest, unchecked box is the
  // correct state until someone actually reviews it — no prompt needed or wanted.
  const body = `Closes #${chosen.id}\n\nImplemented by Ralph loop. Passed an automated post-DONE self-review pass (separate read-only agent invocation) — still review the diff yourself before merging.`;
  return gh(['pr', 'create', '--base', base, '--head', branchName, '--title', commitMessage, '--body', body]);
}

module.exports = {
  git,
  gitPorcelainStatus,
  gh,
  issueState,
  hasExistingPr,
  slugify,
  branchNameFor,
  classify,
  resolveBaseRef,
  postBlockedComment,
  postTestEvidenceComment,
  checkOffAcceptanceCriteria,
  TECH_DEBT_TRACKER_ISSUE,
  postOutOfScopeNote,
  commitChanges,
  pushBranch,
  createPr,
};
