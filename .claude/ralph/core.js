// Ralph loop controller — module map (read this before making a change):
//   config.js    — config.json/state.json/run.lock, BLOCK_LABEL/GENERIC_BLOCK_LABEL, turn/attempt budgets
//   github.js    — every git/gh mutation and query (the agent never does these itself)
//   workspace.js — per-issue clone lifecycle: prepareClone, trust, deps, agent permissions,
//                  DEL_RALPH marker handling (find/rename marked files + re-run the project gate)
//   prompts.js   — all text sent to the agent (implementer, fixer, self-review, code-review)
//   parsing.js   — pure parsing of agent output and porcelain status (no side effects)
//   agent.js     — spawns `claude -p` and streams its output
//   boundary.js  — controller-side agent boundary checks (scrubbed env, protected paths, tooling
//                  changes outside Affects, .git fingerprint, whole-task budget) — issue #398
// This file only orchestrates one issue's run (runIssue()) by composing the above — see
// .claude/ralph/README.md for the full design rationale.

const fs = require('fs');
const path = require('path');
const {
  DEFAULT_REVIEW_MAX_TURNS,
  MAX_REVIEW_FIX_ATTEMPTS,
  MAX_CODE_REVIEW_FIX_ATTEMPTS,
  PROTECTED_PATHS,
  DEFAULT_AGENT_TIMEOUT_MINUTES,
  DEFAULT_TASK_MAX_MINUTES,
  DEFAULT_TASK_MAX_USD,
} = require('./config');
const {
  branchNameFor,
  resolveBaseRef,
  postBlockedComment,
  postTestEvidenceComment,
  checkOffAcceptanceCriteria,
  postOutOfScopeNote,
  commitChanges,
  pushBranch,
  createPr,
  git,
  gitPorcelainStatus,
} = require('./github');
const {
  runDirFor,
  removeRunDirIfExists,
  handleDelRalphMarkers,
  runProjectGateForPorcelain,
  gitStatusZ,
  prepareClone,
  enablePush,
  trustRunDir,
  installDependencies,
  syncLockfileIfPackageJsonChanged,
  listInstalledSkillNames,
  writeAgentPermissions,
  writeReviewerPermissions,
  writeCodeReviewPermissions,
} = require('./workspace');
const {
  buildPrompt,
  buildFixPrompt,
  buildReviewPrompt,
  buildCodeReviewPrompt,
  missingRequiredSkills,
  extractAffectsSection,
} = require('./prompts');
const {
  hasCodeChanges,
  parseVerdict,
  parseReviewVerdict,
  parseCodeReviewVerdict,
  extractAcceptanceCriteriaItems,
  parseAcceptanceCriteriaSelfReport,
  reconcileAcceptanceCriteria,
  summarizeSelfReportedCoverage,
} = require('./parsing');
const { runAgent } = require('./agent');
const {
  buildAgentEnv,
  parseStatusZ,
  findProtectedChanges,
  findUndeclaredToolingChanges,
  gitMetaFingerprint,
  createTaskBudget,
} = require('./boundary');

// --- one issue, full state machine ---

// Shared by all three points in runIssue() that take a fresh porcelain after an agent verdict
// (initial DONE, self-review fix, code-review fix) — each previously repeated this same
// handleDelRalphMarkers()-call + blockedReason-check + postBlockedComment + cleanup + early-return
// block verbatim (found by /code-review: three near-identical copies risked silently drifting
// apart on a future change). Returns either an updated `diff` to keep going with, or a `blocked`
// result object ready to return directly from runIssue().
function applyDelRalphOrBail(runDir, chosen, diff, agentOutput) {
  const delRalph = handleDelRalphMarkers(runDir, diff);
  if (!delRalph.blockedReason) return { diff: delRalph.porcelain, blocked: null };
  try {
    postBlockedComment(chosen.id, delRalph.blockedReason, false, coverageFor(chosen, agentOutput));
  } catch (err) {
    console.log(`⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`);
  }
  // runDir intentionally kept on BLOCKED (see README incident: BLOCKED cleanup) — prepareClone()
  // wipes it on the next run for this issue.
  return { diff: delRalph.porcelain, blocked: { status: 'blocked', reason: delRalph.blockedReason, promptChange: false } };
}

// Agent's self-reported AC progress for a BLOCKED comment (parsing.js summarizeSelfReportedCoverage()).
// `agentOutput` must be the output of the agent call that produced the state being blocked on — NOT
// blindly `finalOutput`, which lags one step behind right after a fix pass (see call sites). Returns
// null (comment omits the line) when there is no output/self-report/AC list — never a fake "0 of N".
function coverageFor(chosen, agentOutput) {
  if (!agentOutput) return null;
  try {
    const acItems = extractAcceptanceCriteriaItems(chosen.body);
    const selfReport = parseAcceptanceCriteriaSelfReport(agentOutput);
    if (selfReport.length === 0) return null;
    return summarizeSelfReportedCoverage(acItems, selfReport);
  } catch {
    return null;
  }
}

function readAtHead(runDir, filePath) {
  try {
    return git(['show', `HEAD:${filePath}`], { cwd: runDir, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

function readWorkingTree(runDir, filePath) {
  try {
    return fs.readFileSync(path.join(runDir, filePath), 'utf8');
  } catch {
    return null;
  }
}

// Deterministic check after every agent turn (issue #398) — the prompt asks the agent to stay out
// of these places, this is what enforces it. Returns a reason string, or null when clean.
//  - any change (either side of a rename) under config.js PROTECTED_PATHS, from `git status -z -uall`;
//  - .git/config or .git/hooks changed (git status never lists .git itself);
//  - package.json scripts/dependencies/jest config or a jest/vitest/eslint/tsconfig file changed
//    without its path in the issue's `## Affects`.
function findBoundaryViolation(runDir, chosen, gitFingerprint) {
  const entries = parseStatusZ(gitStatusZ(runDir));
  const problems = [];
  const protectedHits = findProtectedChanges(entries, PROTECTED_PATHS);
  if (protectedHits.length > 0) problems.push(`changes in protected paths: ${protectedHits.join(', ')}`);
  if (gitMetaFingerprint(runDir) !== gitFingerprint) problems.push('.git/config or .git/hooks was modified');
  const tooling = findUndeclaredToolingChanges(
    entries,
    extractAffectsSection(chosen.body),
    (filePath) => readAtHead(runDir, filePath),
    (filePath) => readWorkingTree(runDir, filePath),
  );
  if (tooling.length > 0) {
    problems.push(`package.json scripts/dependencies or tool configs changed without being named in ## Affects: ${tooling.join(', ')}`);
  }
  if (problems.length === 0) return null;
  return `Agent boundary violated (controller check after the agent's turn, issue #398) — no commit, no PR:\n- ${problems.join('\n- ')}`;
}

async function runIssue(config, byId, chosen) {
  const branchName = branchNameFor(config, chosen.id, chosen.title);
  const baseRef = resolveBaseRef(config, byId, chosen);
  const runDir = runDirFor(chosen.id);
  const reviewMaxTurns = config.reviewMaxTurns ?? DEFAULT_REVIEW_MAX_TURNS;

  console.log(`🌱 Клон ${runDir}, ветка ${branchName} от ${baseRef}.`);
  try {
    prepareClone(runDir, baseRef, branchName);
    trustRunDir(runDir);
    writeAgentPermissions(runDir);
    installDependencies(runDir);
  } catch (err) {
    return { status: 'prepare_failed', error: err.message };
  }

  // Baseline for the .git/ check, taken after the controller's own setup (clone, push-URL, deps).
  const gitFingerprint = gitMetaFingerprint(runDir);
  const agentEnv = buildAgentEnv(process.env);
  const agentTimeoutMs = (config.agentTimeoutMinutes ?? DEFAULT_AGENT_TIMEOUT_MINUTES) * 60000;
  const budget = createTaskBudget({
    maxWallClockMs: (config.taskMaxMinutes ?? DEFAULT_TASK_MAX_MINUTES) * 60000,
    maxUsd: config.taskMaxUsd === undefined ? DEFAULT_TASK_MAX_USD : config.taskMaxUsd,
  });

  // Every agent call of this issue goes through here: whole-task budget first (no new call once it
  // is spent), then scrubbed env + per-call timeout + what is left of the USD budget.
  const callAgent = async (prompt, maxTurns) => {
    const exhausted = budget.exhaustedReason();
    if (exhausted) return { ok: false, error: exhausted, output: '' };
    const maxBudgetUsd = budget.remainingUsd();
    const result = await runAgent(prompt, runDir, maxTurns, {
      env: agentEnv,
      timeoutMs: Math.min(agentTimeoutMs, budget.remainingMs()),
      maxBudgetUsd,
    });
    // A call killed by the timeout never sends its `result` event, so its cost is unknown. Count
    // the cap it ran under (the CLI enforces --max-budget-usd) rather than zero, so the next call
    // cannot get the full budget again.
    budget.record(result.costUsd ?? maxBudgetUsd);
    return result;
  };

  const blockOnBoundary = (agentOutput) => {
    const reason = findBoundaryViolation(runDir, chosen, gitFingerprint);
    if (!reason) return null;
    try {
      postBlockedComment(chosen.id, reason, false, coverageFor(chosen, agentOutput));
    } catch (err) {
      console.log(`⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`);
    }
    return { status: 'blocked', reason, promptChange: false };
  };

  // Read-only passes must leave the tree exactly as they found it.
  const runReadOnlyPass = async (prompt) => {
    const statusBefore = gitStatusZ(runDir);
    const result = await callAgent(prompt, reviewMaxTurns);
    const boundaryBlock = blockOnBoundary(null);
    if (boundaryBlock) return { result, blocked: boundaryBlock };
    if (gitStatusZ(runDir) !== statusBefore) {
      const reason = 'A read-only review pass changed the working tree (git status differs before/after) — no commit, no PR.';
      try {
        postBlockedComment(chosen.id, reason, false, null);
      } catch (err) {
        console.log(`⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`);
      }
      return { result, blocked: { status: 'blocked', reason, promptChange: false } };
    }
    return { result, blocked: null };
  };

  // Computed once, right after the clone exists, and reused for every
  // implementer/fixer prompt below (first attempt, fix-after-self-review,
  // fix-after-code-review) — must stay in sync with whatever
  // writeAgentPermissions() actually granted, so the prompt never names a
  // skill the agent has no permission to call.
  const skillNames = listInstalledSkillNames(runDir).filter((name) => name !== 'code-review');

  const missingSkills = missingRequiredSkills(chosen.body, skillNames);
  if (missingSkills.length > 0) {
    return {
      status: 'agent_failed',
      error: `Required skills are not installed in the clone: ${missingSkills.join(', ')}`,
      runDir,
    };
  }

  const prompt = buildPrompt(chosen, config.maxTurns, skillNames);
  const agentResult = await callAgent(prompt, config.maxTurns);
  {
    const boundaryBlock = blockOnBoundary(agentResult.output);
    if (boundaryBlock) return boundaryBlock;
  }
  if (!agentResult.ok) {
    return { status: 'agent_failed', error: agentResult.error, runDir };
  }

  let verdict = parseVerdict(agentResult.output);
  // Tracks whichever agent invocation produced the CURRENT verdict — a fix
  // pass's own self-report supersedes the original DONE's (see the two
  // reassignments below), same reasoning as `verdict` itself being reassigned.
  let finalOutput = agentResult.output;

  if (verdict.kind === 'blocked' || verdict.kind === 'blocked-prompt-change') {
    try {
      postBlockedComment(chosen.id, verdict.reason, verdict.kind === 'blocked-prompt-change');
    } catch (err) {
      console.log(`⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`);
    }
    return { status: 'blocked', reason: verdict.reason, promptChange: verdict.kind === 'blocked-prompt-change' };
  }

  if (verdict.kind !== 'done') {
    return { status: 'agent_failed', error: 'agent did not return DONE or BLOCKED', runDir, output: agentResult.output.slice(-2000) };
  }

  let diff = gitPorcelainStatus({ cwd: runDir });
  if (!diff) {
    return { status: 'validate_failed', error: 'agent said DONE but produced no diff', runDir };
  }

  {
    const result = applyDelRalphOrBail(runDir, chosen, diff, finalOutput);
    diff = result.diff;
    if (result.blocked) return result.blocked;
  }

  // Post-DONE self-review — only for diffs that actually touch code, not
  // pure docs (see hasCodeChanges()/DOC_ONLY_PATH_PATTERNS above). A
  // doc-only change like #271/#272/#273 has no code-level Key Invariant to
  // silently violate, so a second full agent invocation on it is pure cost.
  // Exists because tsc/lint/test all green does not prove a CODE diff
  // actually satisfies the issue's own Key Invariants — found on ISSUE-287's
  // own autonomous run (see buildReviewPrompt()'s comment).
  //
  // On a real finding, this does NOT jump straight to BLOCKED — it gives the
  // implementer up to MAX_REVIEW_FIX_ATTEMPTS point-fix-then-re-review
  // cycles first (a SEPARATE agent invocation per attempt, framed around
  // fixing exactly what was found — buildFixPrompt()). Only exhausting that
  // budget (or the fixer itself saying BLOCKED, or an unparseable review
  // verdict) escalates to the same BLOCKED handling as an implementer
  // BLOCKED: no commit, no PR, `ralph-blocked` label so it isn't silently
  // re-picked next run.
  if (hasCodeChanges(diff)) {
    let reviewAttempt = 0;
    for (;;) {
      console.log(`🔎 Пост-DONE self-review для issue #${chosen.id} (попытка ${reviewAttempt + 1}/${MAX_REVIEW_FIX_ATTEMPTS + 1})...`);
      writeReviewerPermissions(runDir);
      const diffText = git(['diff', 'HEAD'], { cwd: runDir });
      const reviewPrompt = buildReviewPrompt(chosen, diffText);
      const reviewPass = await runReadOnlyPass(reviewPrompt);
      if (reviewPass.blocked) return reviewPass.blocked;
      const reviewAgentResult = reviewPass.result;
      if (!reviewAgentResult.ok) {
        return { status: 'review_failed', error: reviewAgentResult.error, runDir };
      }

      const reviewVerdict = parseReviewVerdict(reviewAgentResult.output);

      if (reviewVerdict.kind === 'pass') {
        console.log(`✅ Self-review пройден для issue #${chosen.id}${reviewAttempt > 0 ? ` (после ${reviewAttempt} фикс-итераци${reviewAttempt === 1 ? 'и' : 'й'})` : ''}.`);
        break;
      }

      const unparseable = reviewVerdict.kind !== 'fail';
      const outOfAttempts = reviewAttempt >= MAX_REVIEW_FIX_ATTEMPTS;

      if (unparseable || outOfAttempts) {
        const reason = unparseable
          ? 'Self-review (Ralph loop code-review pass) did not return a clear PASS/FAIL verdict — treating as blocked out of caution.'
          : `Self-review (Ralph loop code-review pass) still found a real issue after ${reviewAttempt} fix attempt(s): ${reviewVerdict.reason}`;
        try {
          postBlockedComment(chosen.id, reason, false, coverageFor(chosen, finalOutput));
        } catch (err) {
          console.log(`⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`);
        }
        return { status: 'review_blocked', reason };
      }

      // Real, fixable-in-principle finding, and attempts remain — try a
      // point fix. Restore full Edit/Write permissions (writeReviewerPermissions()
      // above stripped them) before running the fixer.
      console.log(`🔧 Self-review нашёл проблему для issue #${chosen.id}, пробую точечный фикс: ${reviewVerdict.reason}`);
      writeAgentPermissions(runDir);
      const fixPrompt = buildFixPrompt(chosen, reviewVerdict.reason, config.maxTurns, skillNames);
      const fixAgentResult = await callAgent(fixPrompt, config.maxTurns);
      {
        const boundaryBlock = blockOnBoundary(fixAgentResult.output);
        if (boundaryBlock) return boundaryBlock;
      }
      if (!fixAgentResult.ok) {
        return { status: 'agent_failed', error: fixAgentResult.error, runDir };
      }

      const fixVerdict = parseVerdict(fixAgentResult.output);

      if (fixVerdict.kind === 'blocked' || fixVerdict.kind === 'blocked-prompt-change') {
        try {
          postBlockedComment(chosen.id, fixVerdict.reason, fixVerdict.kind === 'blocked-prompt-change', coverageFor(chosen, finalOutput));
        } catch (err) {
          console.log(`⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`);
        }
        return { status: 'blocked', reason: fixVerdict.reason, promptChange: fixVerdict.kind === 'blocked-prompt-change' };
      }

      if (fixVerdict.kind !== 'done') {
        return { status: 'agent_failed', error: 'fix agent did not return DONE or BLOCKED', runDir, output: fixAgentResult.output.slice(-2000) };
      }

      // Fix applied — re-verify there's still an actual diff, adopt the
      // fixer's TYPE/SUMMARY as the current verdict (it superseeds the
      // original one for commit-message purposes), and loop back to review
      // it again from scratch.
      diff = gitPorcelainStatus({ cwd: runDir });
      if (!diff) {
        return { status: 'validate_failed', error: 'fix agent said DONE but produced no diff', runDir };
      }

      {
        const result = applyDelRalphOrBail(runDir, chosen, diff, fixAgentResult.output);
        diff = result.diff;
        if (result.blocked) return result.blocked;
      }

      verdict = fixVerdict;
      finalOutput = fixAgentResult.output;
      reviewAttempt++;
    }
  }

  // Post-self-review code-review pass (buildCodeReviewPrompt()) — runs only
  // once self-review above has already passed, as a second, independent
  // check covering what self-review explicitly excludes (style/simplification/
  // reuse — see buildCodeReviewPrompt()'s comment). Same doc-only skip and
  // same "point-fix, then re-review, up to a bounded attempt count before
  // BLOCKED" shape as the self-review loop above, but with its own separate
  // budget (MAX_CODE_REVIEW_FIX_ATTEMPTS) so the two passes can't starve each
  // other's retry budget. `diff` is re-checked fresh here (not reused from
  // before the self-review loop) since a self-review-triggered fix may have
  // changed what's actually in the working tree.
  if (hasCodeChanges(diff)) {
    let codeReviewAttempt = 0;
    for (;;) {
      console.log(`🔎 Пост-self-review code-review (skill) для issue #${chosen.id} (попытка ${codeReviewAttempt + 1}/${MAX_CODE_REVIEW_FIX_ATTEMPTS + 1})...`);
      writeCodeReviewPermissions(runDir);
      const codeReviewPrompt = buildCodeReviewPrompt(chosen);
      const codeReviewPass = await runReadOnlyPass(codeReviewPrompt);
      if (codeReviewPass.blocked) return codeReviewPass.blocked;
      const codeReviewAgentResult = codeReviewPass.result;
      if (!codeReviewAgentResult.ok) {
        return { status: 'code_review_failed', error: codeReviewAgentResult.error, runDir };
      }

      const codeReviewVerdict = parseCodeReviewVerdict(codeReviewAgentResult.output);

      if (codeReviewVerdict.kind === 'pass') {
        console.log(`✅ Code-review (skill) пройден для issue #${chosen.id}${codeReviewAttempt > 0 ? ` (после ${codeReviewAttempt} фикс-итераци${codeReviewAttempt === 1 ? 'и' : 'й'})` : ''}.`);
        break;
      }

      if (codeReviewVerdict.kind === 'pass-out-of-scope') {
        console.log(`✅ Code-review (skill) пройден для issue #${chosen.id} — есть находки вне скоупа этой issue, не блокируют: ${codeReviewVerdict.reason}`);
        try {
          postOutOfScopeNote(chosen.id, codeReviewVerdict.reason);
        } catch (err) {
          console.log(`⚠️ Не удалось записать out-of-scope находку в issue #${chosen.id}: ${err.message}`);
        }
        break;
      }

      const unparseable = codeReviewVerdict.kind !== 'fail';
      const outOfAttempts = codeReviewAttempt >= MAX_CODE_REVIEW_FIX_ATTEMPTS;

      if (unparseable || outOfAttempts) {
        const reason = unparseable
          ? 'Post-self-review code-review pass (Ralph loop, code-review skill) did not return a clear PASS/FAIL verdict — treating as blocked out of caution.'
          : `Code-review pass (Ralph loop, code-review skill) still found a real issue after ${codeReviewAttempt} fix attempt(s): ${codeReviewVerdict.reason}`;
        try {
          postBlockedComment(chosen.id, reason, false, coverageFor(chosen, finalOutput));
        } catch (err) {
          console.log(`⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`);
        }
        return { status: 'code_review_blocked', reason };
      }

      console.log(`🔧 Code-review (skill) нашёл проблему для issue #${chosen.id}, пробую точечный фикс: ${codeReviewVerdict.reason}`);
      writeAgentPermissions(runDir);
      const codeReviewFixPrompt = buildFixPrompt(chosen, codeReviewVerdict.reason, config.maxTurns, skillNames);
      const codeReviewFixAgentResult = await callAgent(codeReviewFixPrompt, config.maxTurns);
      {
        const boundaryBlock = blockOnBoundary(codeReviewFixAgentResult.output);
        if (boundaryBlock) return boundaryBlock;
      }
      if (!codeReviewFixAgentResult.ok) {
        return { status: 'agent_failed', error: codeReviewFixAgentResult.error, runDir };
      }

      const codeReviewFixVerdict = parseVerdict(codeReviewFixAgentResult.output);

      if (codeReviewFixVerdict.kind === 'blocked' || codeReviewFixVerdict.kind === 'blocked-prompt-change') {
        try {
          postBlockedComment(chosen.id, codeReviewFixVerdict.reason, codeReviewFixVerdict.kind === 'blocked-prompt-change', coverageFor(chosen, finalOutput));
        } catch (err) {
          console.log(`⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`);
        }
        return { status: 'blocked', reason: codeReviewFixVerdict.reason, promptChange: codeReviewFixVerdict.kind === 'blocked-prompt-change' };
      }

      if (codeReviewFixVerdict.kind !== 'done') {
        return { status: 'agent_failed', error: 'code-review fix agent did not return DONE or BLOCKED', runDir, output: codeReviewFixAgentResult.output.slice(-2000) };
      }

      diff = gitPorcelainStatus({ cwd: runDir });
      if (!diff) {
        return { status: 'validate_failed', error: 'code-review fix agent said DONE but produced no diff', runDir };
      }

      {
        const result = applyDelRalphOrBail(runDir, chosen, diff, codeReviewFixAgentResult.output);
        diff = result.diff;
        if (result.blocked) return result.blocked;
      }

      verdict = codeReviewFixVerdict;
      finalOutput = codeReviewFixAgentResult.output;
      codeReviewAttempt++;
    }
  }

  // Independent, unconditional final gate — right before commit/push/PR, after every review/fix
  // cycle above is done. This is a SECOND, independent layer, not a replacement for the
  // DEL_RALPH retry in workspace.js's readFileHeadForMarker(): even if that retry doesn't help
  // (a longer-than-expected transient failure), or the diff was never DEL_RALPH-related in the
  // first place, this makes sure the real project gate is green right now — not trusting the
  // agent's own self-report, an earlier pass's now-possibly-stale result, or the assumption that
  // "the DEL_RALPH gate already covered this." Skipped only for a pure doc-only diff, same
  // criterion already used to skip the review passes above. Incident-driven: a live run (issue
  // about migrating src/middleware.ts -> src/proxy.ts in a sibling project, 2026-09-18) produced
  // a PR whose CI build failed, even though the whole Ralph run reported DONE and CODEREVIEW:
  // PASS, because the DEL_RALPH marker-scan silently found nothing (see workspace.js) — this gate
  // is the backstop that makes that specific failure mode impossible to ship regardless of why
  // the earlier layer missed it.
  // Lock-file sync BEFORE the final gate: the agent can't run `npm install`, so a new dependency
  // hand-added to package.json leaves package-lock.json stale, which only CI's `npm ci` catches
  // (see workspace.js syncLockfileIfPackageJsonChanged() / README incident). Refresh `diff` after it,
  // since the lock file is now part of the change set.
  {
    const lockfileSync = syncLockfileIfPackageJsonChanged(runDir);
    if (!lockfileSync.ok) {
      const reason = `Не удалось синхронизировать package-lock.json перед коммитом — PR не создаётся: ${lockfileSync.error}`;
      try {
        postBlockedComment(chosen.id, reason, false, coverageFor(chosen, finalOutput));
      } catch (err) {
        console.log(`⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`);
      }
      return { status: 'lockfile_sync_blocked', reason };
    }
    if (lockfileSync.ran) diff = gitPorcelainStatus({ cwd: runDir });
  }

  if (hasCodeChanges(diff)) {
    console.log(`🔒 Финальный гейт перед коммитом для issue #${chosen.id}...`);
    const finalGate = runProjectGateForPorcelain(runDir, diff);
    if (!finalGate.ok) {
      const reason = `Финальный гейт перед коммитом красный — PR не создаётся:\n\n${finalGate.output}`;
      try {
        postBlockedComment(chosen.id, reason, false, coverageFor(chosen, finalOutput));
      } catch (err) {
        console.log(`⚠️ Не удалось записать BLOCKED в issue #${chosen.id}: ${err.message}`);
      }
      return { status: 'final_gate_blocked', reason };
    }
    console.log(`✅ Финальный гейт зелёный для issue #${chosen.id}.`);
  }

  // Acceptance Criteria reconciliation (see extractAcceptanceCriteriaItems()/
  // parseAcceptanceCriteriaSelfReport()/reconcileAcceptanceCriteria() above) —
  // the only place the controller ever checks off an issue's AC checkboxes,
  // and only when the agent's own self-report is a complete, honest 1:1 match
  // against the issue's real AC list. A partial match just leaves the boxes
  // unchecked for whoever reviews later — never blocks or changes `verdict`/
  // the PR outcome. The reconciliation result feeds into the single combined
  // comment posted below (postTestEvidenceComment) — see ADR-035/#355: this
  // used to be two separate `gh issue comment` calls (AC self-report +
  // TEST_LOG.md file entry), merged into one so a batch run's issue history
  // carries one Ralph comment per DONE, not two.
  let acItems = [];
  let selfReport = [];
  let allCovered = false;
  // Deliberately separate from `allCovered`: that's just what the self-report
  // reconciled to (used for the ⏳/✅ marks per item and the comment header
  // wording), whereas this tracks whether `gh issue edit` actually succeeded.
  // If reconciliation says allCovered but the edit call itself throws (e.g. a
  // transient `gh` failure), the comment must NOT claim the boxes were
  // checked — found by re-reading this code, not a live failure — the
  // original version fell into the catch block below with `allCovered`
  // already `true` from the line above the throw, which would have posted a
  // "чек-боксы отмечены автоматически" comment even though the edit failed.
  let checkedOff = false;
  try {
    acItems = extractAcceptanceCriteriaItems(chosen.body);
    if (acItems.length > 0) {
      selfReport = parseAcceptanceCriteriaSelfReport(finalOutput);
      ({ allCovered } = reconcileAcceptanceCriteria(acItems, selfReport));
      if (allCovered) {
        checkOffAcceptanceCriteria(chosen.id);
        checkedOff = true;
      }
    }
  } catch (err) {
    console.log(`⚠️ Не удалось сверить/отметить Acceptance Criteria для issue #${chosen.id}: ${err.message}`);
  }

  try {
    postTestEvidenceComment(chosen, verdict, branchName, acItems, selfReport, allCovered, checkedOff);
  } catch (err) {
    console.log(`⚠️ Не удалось запостить test evidence комментарий в issue #${chosen.id}: ${err.message}`);
  }

  let commitMessage;
  try {
    commitMessage = commitChanges(runDir, chosen, verdict);
  } catch (err) {
    return { status: 'commit_failed', error: err.message, runDir };
  }

  try {
    enablePush(runDir);
    pushBranch(runDir, branchName);
  } catch (err) {
    return { status: 'push_failed', error: err.message, runDir };
  }

  let pr;
  try {
    pr = createPr(chosen, branchName, baseRef, commitMessage);
  } catch (err) {
    return { status: 'pr_failed', error: err.message, runDir };
  }

  removeRunDirIfExists(runDir);
  return { status: 'done', pr };
}

module.exports = {
  runIssue,
};
