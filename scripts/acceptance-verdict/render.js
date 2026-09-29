'use strict';

const { STATUS_PASS, STATUS_FAIL, labelOf } = require('./common');

const COMMENT_MARKER = '<!-- acceptance-verifier -->';
const COMPUTED_SUFFIX = ' (computed)';
const SHIFT_ARROW = '→';

const escapeCell = (text) =>
  text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

const renderList = (title, items, { showNone = false } = {}) => {
  if (items.length === 0 && !showNone) return [];
  const lines = items.length === 0 ? ['- none'] : items.map((i) => `- ${i}`);
  return ['', `**${title}**`, ...lines];
};

// A note for (list, entryId, refIndex) means the model's cited line was
// accepted from within the ±2-line window, not on the line itself — shown
// as cited→found so the model's slip stays visible instead of silently
// absorbed (INV-5: this never affects the verdict, display only).
const renderRefs = (refs, { list, entryId, notesByKey }) =>
  refs
    .map(({ path: file, line }, index) => {
      const note = notesByKey.get(`${list}:${entryId}:${index}`);
      if (note === undefined) return `${file}:${line}`;
      return `${file}:${note.cited}${SHIFT_ARROW}${note.found}`;
    })
    .join(', ');

// v2: the issue's own ID and text, never the model's wording.
const createNamer = (specItems) => {
  if (specItems === null) return (entry) => labelOf(entry);
  const texts = new Map(specItems.map((item) => [item.id, item.text]));
  return ({ id }) => {
    const text = texts.get(id);
    if (text !== undefined) return `${id} ${text}`;
    return `${id !== '' ? id : '(no id)'} (not in issue)`;
  };
};

const renderTable = (title, entries, nameOf, { list, notesByKey }) => {
  if (entries.length === 0) return [];
  const lines = [
    '',
    `| ${title} | Status | Summary | References |`,
    '|---|---|---|---|',
  ];
  for (const entry of entries) {
    const { id, status, summary, refs, computed } = entry;
    const displayStatus = computed ? `${status}${COMPUTED_SUFFIX}` : status;
    const refsCell = renderRefs(refs, { list, entryId: id, notesByKey });
    const cells = [nameOf(entry), displayStatus, summary, refsCell];
    lines.push(`| ${cells.map(escapeCell).join(' | ')} |`);
  }
  return lines;
};

// The moved count is information only and never changes the verdict.
const renderAssertions = (assertions) => {
  if (assertions === null) return [];
  const { losses, moved, isApproved } = assertions;
  const lines = [];
  if (moved > 0) lines.push('', `Moved assertion lines: ${moved}`);
  if (isApproved && losses.length > 0) {
    const approved = losses.map(({ path: file, lost }) => `${file}: ${lost}`);
    lines.push(...renderList('Approved assertion losses', approved));
  }
  return lines;
};

const renderComment = (
  {
    passed,
    report,
    failures,
    specFormat,
    specItems = null,
    approvalNote = null,
    assertions = null,
    refsNotesByKey = new Map(),
  },
  { problem = null, manualVerifiedIgnoredBy, testRemovalIgnoredBy },
) => {
  const verdict = passed ? STATUS_PASS : STATUS_FAIL;
  const lines = [COMMENT_MARKER, `## Acceptance verifier: ${verdict}`];
  if (specFormat === 'legacy') lines.push('Issue format: legacy');
  if (approvalNote !== null) lines.push(approvalNote);
  if (manualVerifiedIgnoredBy !== undefined) {
    const actor = manualVerifiedIgnoredBy ?? 'unknown';
    lines.push('', `manual-verified ignored: set by ${actor}`);
  }
  if (testRemovalIgnoredBy !== undefined) {
    const actor = testRemovalIgnoredBy ?? 'unknown';
    lines.push('', `test removal approval ignored: set by ${actor}`);
  }
  lines.push(...renderAssertions(assertions));
  if (report !== null) {
    const nameOf = createNamer(specItems);
    const criteriaCtx = { list: 'criteria', notesByKey: refsNotesByKey };
    const invariantsCtx = { list: 'invariants', notesByKey: refsNotesByKey };
    lines.push(
      ...renderTable('Criterion', report.criteria, nameOf, criteriaCtx),
    );
    lines.push(
      ...renderTable('Invariant', report.invariants, nameOf, invariantsCtx),
    );
    const options = { showNone: true };
    lines.push(...renderList('Test tampering', report.test_tampering, options));
    lines.push(...renderList('Risk zones', report.risk_zones, options));
    const scopeTitle =
      specFormat === 'v2' ? 'Model scope hints' : 'Out of scope files';
    lines.push(...renderList(scopeTitle, report.out_of_scope_files, options));
  }
  const reasons = problem === null ? failures : [problem, ...failures];
  lines.push(...renderList('Why not PASS', passed ? [] : reasons));
  return `${lines.join('\n')}\n`;
};

module.exports = {
  COMMENT_MARKER,
  renderComment,
};
