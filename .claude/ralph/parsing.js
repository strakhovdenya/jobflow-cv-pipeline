// Doc-only changes skip the post-DONE review entirely (see runIssue()) — a
// pure prose/markdown edit (like #271/#272/#273) has no code-level Key
// Invariant to violate the way #287's real fix did, so spending a second
// full agent invocation on it is pure cost with no corresponding safety
// benefit. Deliberately conservative: anything NOT matching one of these
// patterns counts as "code" and triggers review, including config/schema/
// prompt files — false positives (reviewing something that turns out to be
// harmless) are cheap; false negatives (skipping review on something that
// wasn't actually just docs) are exactly the risk this whole feature exists
// to close.
const DOC_ONLY_PATH_PATTERNS = [/\.md$/i, /(^|\/)docs\//, /(^|\/)project-management\//];

// `porcelain` is `git status --porcelain` output — reused as-is from the
// caller rather than a fresh `git diff --name-only`, since porcelain format
// already covers untracked new files (`??`) that a plain `git diff` misses.
function changedFilePathsFromPorcelain(porcelain) {
  return porcelain
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

function hasCodeChanges(porcelainStatus) {
  const files = changedFilePathsFromPorcelain(porcelainStatus);
  return files.some((f) => !DOC_ONLY_PATH_PATTERNS.some((re) => re.test(f)));
}

// Takes the LAST match of `re` in `text`, not the first — the agent's
// transcript can legitimately contain earlier text that quotes/plans around
// these exact sentinel words (e.g. restating the instructions) before the
// real, final verdict. Matching the first occurrence risked treating that
// as the verdict instead of what the agent actually concluded with.
function lastMatch(text, re) {
  const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  let match;
  let last = null;
  while ((match = global.exec(text)) !== null) {
    last = match;
    if (match.index === global.lastIndex) global.lastIndex++; // avoid infinite loop on zero-width match
  }
  return last;
}

// The agent sometimes wraps the sentinel line in markdown emphasis
// (`**DONE**` instead of `DONE`) despite the prompt asking for a literal
// line — found live on a real #282 run, where an otherwise fully-valid,
// fully-tested implementation was reported as agent_failed purely because
// the strict `^DONE\s*$` regex didn't match the bold-wrapped line. Strip
// leading/trailing markdown emphasis/code markers (`*`, `_`, backtick) from
// each line before matching, rather than trying to enumerate every possible
// wrapping in the regex itself.
function stripLineMarkdownEmphasis(text) {
  return text.replace(/^[ \t]*[*_`]+|[*_`]+[ \t]*$/gm, '');
}

// `rawOutput` accumulates the assistant's text across EVERY turn of the
// whole agent run (runAgent() does `output += block.text` per turn, not
// just the final message) — a long run can easily echo one of these
// sentinel words in passing (e.g. reasoning about why something is *not*
// a BLOCKED-PROMPT-CHANGE case) well before the real, final verdict. Fixed
// by index (each `lastMatch()` gives the last occurrence's index): pick
// whichever sentinel actually occurs LAST in the whole text, not the first
// one found by checking patterns in a fixed priority order — a fixed
// priority order would let an early, incidental mention of
// "BLOCKED-PROMPT-CHANGE:" win over a legitimate final DONE.
function parseVerdict(rawOutput) {
  const output = stripLineMarkdownEmphasis(rawOutput);
  const blockedPromptMatch = lastMatch(output, /^BLOCKED-PROMPT-CHANGE:\s*([\s\S]*)$/m);
  const blockedMatch = lastMatch(output, /^BLOCKED:\s*([\s\S]*)$/m);
  const doneMatch = lastMatch(output, /^DONE\s*$/m);

  const candidates = [];
  if (blockedPromptMatch) candidates.push({ index: blockedPromptMatch.index, kind: 'blocked-prompt-change', reason: blockedPromptMatch[1].trim() });
  if (blockedMatch) candidates.push({ index: blockedMatch.index, kind: 'blocked', reason: blockedMatch[1].trim() });
  if (doneMatch) candidates.push({ index: doneMatch.index, kind: 'done' });

  if (candidates.length === 0) return { kind: 'unknown' };
  candidates.sort((a, b) => b.index - a.index);
  const winner = candidates[0];

  if (winner.kind === 'done') {
    const typeMatch = lastMatch(output, /^TYPE:\s*(\w+)/m);
    const summaryMatch = lastMatch(output, /^SUMMARY:\s*(.+)$/m);
    return {
      kind: 'done',
      type: typeMatch ? typeMatch[1] : 'chore',
      summary: summaryMatch ? summaryMatch[1].trim() : 'implement issue',
    };
  }
  return { kind: winner.kind, reason: winner.reason };
}

// Extracts the `## Acceptance Criteria` checklist from the issue body itself
// (not the agent's output) — the canonical, ordered list the self-report
// below is checked against. Stops at the next `##` heading. Each returned
// entry is the raw bullet text (without the leading `- [ ]`/`- [x]`), used
// only for the comment the controller posts, not for matching logic (index
// order is what's actually compared — see reconcileAcceptanceCriteria()).
function extractAcceptanceCriteriaItems(issueBody) {
  if (!issueBody) return [];
  // Deliberately not a single regex with a `(?=^##\s|\Z)` lookahead: JS has no
  // `\Z`, and `$` under the `/m` flag needed for `^##` matches every line
  // ending, not just end-of-string — a lazy `[\s\S]*?` would then stop at the
  // section's very first line break instead of its actual end. Slicing by
  // index sidesteps both problems.
  const headingMatch = /^##\s*Acceptance Criteria\s*$/m.exec(issueBody);
  if (!headingMatch) return [];
  const afterHeading = issueBody.slice(headingMatch.index + headingMatch[0].length);
  const nextHeadingMatch = /^##\s/m.exec(afterHeading);
  const section = nextHeadingMatch ? afterHeading.slice(0, nextHeadingMatch.index) : afterHeading;
  const items = [];
  const lineRe = /^-\s*\[[ xX]\]\s*(.+)$/gm;
  let m;
  while ((m = lineRe.exec(section)) !== null) {
    items.push(m[1].trim());
  }
  return items;
}

// Parses the agent's `=== ACCEPTANCE CRITERIA SELF-REPORT ===` block (see
// buildTaskRules()) from its LAST occurrence in the output (same
// last-occurrence-wins reasoning as parseVerdict() — a fix pass's own,
// later self-report supersedes the original DONE's). Returns an array of
// `{ index, status: 'covered' | 'not_verified', detail }` in the order the
// agent wrote them — does NOT itself check this against the issue's real
// AC list; that's reconcileAcceptanceCriteria()'s job, kept separate so a
// malformed/missing self-report (empty array here) fails that comparison
// safely rather than throwing.
function parseAcceptanceCriteriaSelfReport(rawOutput) {
  const output = stripLineMarkdownEmphasis(rawOutput);
  const blockRe = /=== ACCEPTANCE CRITERIA SELF-REPORT ===([\s\S]*?)=== END ACCEPTANCE CRITERIA SELF-REPORT ===/g;
  let last = null;
  let m;
  while ((m = blockRe.exec(output)) !== null) last = m;
  if (!last) return [];

  const lineRe = /^\s*(\d+)\.\s*(COVERED|NOT VERIFIED):\s*(.+)$/gim;
  const items = [];
  let lm;
  while ((lm = lineRe.exec(last[1])) !== null) {
    items.push({
      index: Number(lm[1]),
      status: lm[2].toUpperCase() === 'COVERED' ? 'covered' : 'not_verified',
      detail: lm[3].trim(),
    });
  }
  return items;
}

// The actual gate: the self-report only counts as a full, honest match when
// it has exactly one entry per real AC item (no skipped/merged items, no
// extras), in order, and every single one is 'covered' — a single
// 'not_verified' entry, or any count mismatch, means the controller must
// NOT check off anything automatically (see the callers below for why this
// is fine for batch autonomy — resolveBaseRef() never waits on this).
function reconcileAcceptanceCriteria(acItems, selfReport) {
  if (acItems.length === 0) return { allCovered: false, coveredIndices: [] };
  if (selfReport.length !== acItems.length) return { allCovered: false, coveredIndices: [] };
  const byIndex = new Map(selfReport.map((e) => [e.index, e]));
  const coveredIndices = [];
  for (let i = 1; i <= acItems.length; i++) {
    const entry = byIndex.get(i);
    if (!entry || entry.status !== 'covered') return { allCovered: false, coveredIndices: [] };
    coveredIndices.push(i);
  }
  return { allCovered: true, coveredIndices };
}

// Same last-occurrence-wins approach as parseVerdict() above, for the
// separate post-DONE self-review pass's own sentinel lines.
function parseReviewVerdict(rawOutput) {
  const output = stripLineMarkdownEmphasis(rawOutput);
  const failMatch = lastMatch(output, /^REVIEW: FAIL:\s*([\s\S]*)$/m);
  const passMatch = lastMatch(output, /^REVIEW: PASS\s*$/m);

  const candidates = [];
  if (failMatch) candidates.push({ index: failMatch.index, kind: 'fail', reason: failMatch[1].trim() });
  if (passMatch) candidates.push({ index: passMatch.index, kind: 'pass' });

  if (candidates.length === 0) return { kind: 'unknown' };
  candidates.sort((a, b) => b.index - a.index);
  return candidates[0];
}

// Same last-occurrence-wins approach again, for the separate post-self-review
// code-review pass's own sentinel lines (buildCodeReviewPrompt()).
function parseCodeReviewVerdict(rawOutput) {
  const output = stripLineMarkdownEmphasis(rawOutput);
  const failMatch = lastMatch(output, /^CODEREVIEW: FAIL:\s*([\s\S]*)$/m);
  const outOfScopeMatch = lastMatch(output, /^CODEREVIEW: PASS-OUT-OF-SCOPE:\s*([\s\S]*)$/m);
  const passMatch = lastMatch(output, /^CODEREVIEW: PASS\s*$/m);

  const candidates = [];
  if (failMatch) candidates.push({ index: failMatch.index, kind: 'fail', reason: failMatch[1].trim() });
  if (outOfScopeMatch) candidates.push({ index: outOfScopeMatch.index, kind: 'pass-out-of-scope', reason: outOfScopeMatch[1].trim() });
  if (passMatch) candidates.push({ index: passMatch.index, kind: 'pass' });

  if (candidates.length === 0) return { kind: 'unknown' };
  candidates.sort((a, b) => b.index - a.index);
  return candidates[0];
}

module.exports = {
  DOC_ONLY_PATH_PATTERNS,
  changedFilePathsFromPorcelain,
  hasCodeChanges,
  lastMatch,
  stripLineMarkdownEmphasis,
  parseVerdict,
  extractAcceptanceCriteriaItems,
  parseAcceptanceCriteriaSelfReport,
  reconcileAcceptanceCriteria,
  parseReviewVerdict,
  parseCodeReviewVerdict,
};
