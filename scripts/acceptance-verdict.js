'use strict';

const fs = require('node:fs');
const path = require('node:path');

const COMMENT_MARKER = '<!-- acceptance-verifier -->';
const STATUS_PASS = 'PASS';
const STATUS_FAIL = 'FAIL';
const STATUS_UNVERIFIABLE = 'UNVERIFIABLE';
const STATUS_NOT_APPLICABLE = 'N/A';
const CRITERION_STATUSES = new Set([
  STATUS_PASS,
  STATUS_FAIL,
  STATUS_UNVERIFIABLE,
]);
const INVARIANT_STATUSES = new Set([
  STATUS_PASS,
  STATUS_FAIL,
  STATUS_NOT_APPLICABLE,
]);
const SPEC_NOT_CHECKED = 'spec was not checked';
const APPROVAL_NOT_CHECKED = 'spec approval was not checked';
const SPEC_NOT_APPROVED = 'spec not approved';
const SPEC_CHANGED = 'spec changed after approval';
const LEGACY_NOT_APPROVED = 'Spec approval: not approved (legacy)';
const SHA256_HEX = /^[0-9a-f]{64}$/;

const RISK_NONE = 'none';
const RISK_ZONES = new Set([
  'auth',
  'secrets',
  'ci',
  'migrations',
  'fs_shell_sinks',
  'state_machine',
  'dependencies',
  'adr_034_manual_note',
  RISK_NONE,
]);

const REF_KINDS = new Set(['impl', 'test', 'doc', 'config', 'ci']);
const BEHAVIOR_TYPE = 'behavior';
const BEHAVIOR_REQUIRED_KINDS = ['impl', 'test'];
const DETERMINISTIC_TYPES = new Set(['ci', 'absence']);
const CI_VERIFY_PATTERN = /^ci "([^"]+)"$/;
const ABSENCE_VERIFY_PATTERN = /^absent "([^"]+)" in (\S+)$/;
const COMPUTED_SUFFIX = ' (computed)';

const OWN_CHECKS = new Set(['Verify', 'Report', 'Acceptance Verifier']);
const FAILED_CONCLUSIONS = new Set([
  'failure',
  'cancelled',
  'timed_out',
  'action_required',
  'startup_failure',
]);
const FAILED_STATES = new Set(['failure', 'error']);

const MAX_REF_FILE_BYTES = 2 * 1024 * 1024;
const FORBIDDEN_REF_ROOTS = new Set(['.git', 'trusted']);
const MAX_QUOTE_CHARS = 200;

const isStringArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isReference = (value) =>
  value !== null &&
  typeof value === 'object' &&
  typeof value.path === 'string' &&
  value.path !== '' &&
  Number.isInteger(value.line) &&
  value.line >= 1 &&
  typeof value.quote === 'string' &&
  value.quote.trim() !== '' &&
  typeof value.kind === 'string' &&
  REF_KINDS.has(value.kind);

const isCriterion = (value) =>
  value !== null &&
  typeof value === 'object' &&
  typeof value.id === 'string' &&
  typeof value.text === 'string' &&
  CRITERION_STATUSES.has(value.status) &&
  typeof value.summary === 'string' &&
  Array.isArray(value.refs) &&
  value.refs.every(isReference);

const isInvariant = (value) =>
  value !== null &&
  typeof value === 'object' &&
  typeof value.id === 'string' &&
  INVARIANT_STATUSES.has(value.status) &&
  typeof value.summary === 'string' &&
  Array.isArray(value.refs) &&
  value.refs.every(isReference);

// A v2 report names its entries by issue ID; a legacy one leaves id empty.
const labelOf = ({ id, text = '' }) => (id !== '' ? id : text);

const isRiskZones = (value) =>
  isStringArray(value) &&
  value.length > 0 &&
  value.every((zone) => RISK_ZONES.has(zone)) &&
  (!value.includes(RISK_NONE) || value.length === 1);

const isSpecItem = (value) =>
  isObject(value) &&
  typeof value.id === 'string' &&
  typeof value.text === 'string' &&
  (value.type === null || typeof value.type === 'string');

// items is optional: without it a v2 spec expects no IDs, so every reported
// ID is foreign to the issue and the verdict still fails closed.
const isSpecShape = (value) =>
  isObject(value) &&
  (value.format === 'v2' || value.format === 'legacy') &&
  isStringArray(value.problems) &&
  (value.items === undefined ||
    (Array.isArray(value.items) && value.items.every(isSpecItem)));

const isV2Spec = (spec) => isObject(spec) && spec.format === 'v2';

const specItemsOf = (spec) => (isV2Spec(spec) ? (spec.items ?? []) : null);

// Fail closed: undefined means --spec was not passed (no effect on the
// verdict); null means a spec file was expected but could not be read or
// parsed, or did not match the linter's output shape.
const readSpecResult = (file) => {
  if (file === null) return undefined;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return isSpecShape(data) ? data : null;
  } catch {
    return null;
  }
};

// A genuinely invalid v2 spec is the only case where the model report is not
// worth reading at all (AC-5): the issue itself fails the contract, so no
// report could satisfy it. A merely unreadable spec (readSpecResult() -> null)
// is an unrelated infra concern and must not hide real report/CI diagnostics,
// so it is folded into the normal failure list instead (see evaluate()).
const isSpecInvalid = (spec) =>
  spec !== null && spec.format === 'v2' && spec.problems.length > 0;

const isSha = (value) => typeof value === 'string' && SHA256_HEX.test(value);

const isApprovalShape = (value) =>
  isObject(value) &&
  (value.approved_hash === null || isSha(value.approved_hash)) &&
  isSha(value.current_hash);

// Written by spec-hash.js check. undefined means --approval was not passed
// (no effect on the verdict); null means the file was expected but could not
// be read or parsed, or lacks approved_hash/current_hash (fail closed).
const readApproval = (file) => {
  if (file === null) return undefined;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return isApprovalShape(data) ? data : null;
  } catch {
    return null;
  }
};

// A changed spec fails for every format; a missing approval fails unless the
// issue is known to be legacy, where it is only noted in the comment.
const checkApproval = (approval, specFormat) => {
  const result = (failures, note = null) => ({ failures, note });
  if (approval === undefined) return result([]);
  if (approval === null) return result([APPROVAL_NOT_CHECKED]);
  if (approval.approved_hash === null) {
    if (specFormat === 'legacy') return result([], LEGACY_NOT_APPROVED);
    return result([SPEC_NOT_APPROVED]);
  }
  if (approval.approved_hash !== approval.current_hash) {
    return result([SPEC_CHANGED]);
  }
  return result([]);
};

const parseReport = (raw) => {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    return { report: null, problem: `invalid JSON: ${error.message}` };
  }
  const isValid =
    data !== null &&
    typeof data === 'object' &&
    Array.isArray(data.criteria) &&
    data.criteria.every(isCriterion) &&
    Array.isArray(data.invariants) &&
    data.invariants.every(isInvariant) &&
    isStringArray(data.test_tampering) &&
    isRiskZones(data.risk_zones) &&
    isStringArray(data.out_of_scope_files);
  if (!isValid) return { report: null, problem: 'report violates schema' };
  return { report: data, problem: null };
};

const readReport = (file) => {
  try {
    return { raw: fs.readFileSync(file, 'utf8'), problem: null };
  } catch (error) {
    return { raw: null, problem: `report not readable: ${error.code}` };
  }
};

const isInside = (rootReal, target) => {
  const relative = path.relative(rootReal, target);
  if (relative === '' || path.isAbsolute(relative)) return false;
  if (relative === '..' || relative.startsWith(`..${path.sep}`)) return false;
  const [first] = relative.split(path.sep);
  return !FORBIDDEN_REF_ROOTS.has(first);
};

// Untrusted: a model- or issue-supplied path must stay inside the checkout,
// be a regular file (no symlink at any level) and be small.
const resolveInsideCheckout = (root, filePath) => {
  const rootReal = fs.realpathSync(root);
  const target = path.resolve(rootReal, filePath);
  if (!isInside(rootReal, target)) {
    return { real: null, problem: 'path is outside the checkout' };
  }
  let stat;
  try {
    stat = fs.lstatSync(target);
  } catch (error) {
    return { real: null, problem: `file not readable: ${error.code}` };
  }
  if (!stat.isFile() || !isInside(rootReal, fs.realpathSync(target))) {
    return { real: null, problem: 'not a regular file inside the checkout' };
  }
  if (stat.size > MAX_REF_FILE_BYTES) {
    return { real: null, problem: 'file is too large to check' };
  }
  return { real: target, problem: null };
};

const readReferencedLine = (root, ref) => {
  const { real, problem } = resolveInsideCheckout(root, ref.path);
  if (problem !== null) return { content: null, problem };
  const lines = fs.readFileSync(real, 'utf8').split(/\r?\n/);
  if (ref.line > lines.length) {
    return {
      content: null,
      problem: `line ${ref.line} is past the end (${lines.length} lines)`,
    };
  }
  return { content: lines[ref.line - 1], problem: null };
};

const readReferencedFile = (root, filePath) => {
  const { real, problem } = resolveInsideCheckout(root, filePath);
  if (problem !== null) return { content: null, problem };
  return { content: fs.readFileSync(real, 'utf8'), problem: null };
};

const normalizeSpaces = (text) => text.replace(/\s+/g, ' ').trim();

// items is optional: without it (legacy issues) nothing is a computed item,
// matching TR-1.
const deterministicIdsOf = (items) =>
  new Set(
    (items ?? [])
      .filter((item) => DETERMINISTIC_TYPES.has(item.type))
      .map((item) => item.id),
  );

// A model report entry for a ci/absence id is entirely ignored (AC-8): the
// script computes those, so it never enters reference/id checking.
const checkRefs = (report, root, specItems = null) => {
  const skip = deterministicIdsOf(specItems);
  const problems = [];
  for (const entry of [...report.criteria, ...report.invariants]) {
    if (skip.has(entry.id)) continue;
    if (entry.status === STATUS_PASS && entry.refs.length === 0) {
      problems.push(`${labelOf(entry)}: PASS without references`);
    }
    for (const ref of entry.refs) {
      const label = `${labelOf(entry)}: ${ref.path}:${ref.line}`;
      const { content, problem } = readReferencedLine(root, ref);
      if (problem !== null) {
        problems.push(`${label} - ${problem}`);
        continue;
      }
      const found = normalizeSpaces(content).includes(
        normalizeSpaces(ref.quote),
      );
      if (!found) {
        const quote = JSON.stringify(ref.quote.slice(0, MAX_QUOTE_CHARS));
        problems.push(`${label} - quote not found on that line: ${quote}`);
      }
    }
  }
  return problems;
};

// Applies only to v2 "behavior" items (specItems null for legacy issues, or
// the item simply isn't type "behavior"): a PASS needs both an "impl" and a
// "test" reference, not a description of one alone.
const checkBehaviorRefs = (report, specItems) => {
  if (!Array.isArray(specItems)) return [];
  const typeOf = new Map(specItems.map((item) => [item.id, item.type]));
  const problems = [];
  for (const criterion of report.criteria) {
    if (criterion.status !== STATUS_PASS) continue;
    if (typeOf.get(criterion.id) !== BEHAVIOR_TYPE) continue;
    const kinds = new Set(criterion.refs.map((ref) => ref.kind));
    const hasBoth = BEHAVIOR_REQUIRED_KINDS.every((kind) => kinds.has(kind));
    if (!hasBoth) {
      problems.push(
        `behavior item passed without impl and test references: ${criterion.id}`,
      );
    }
  }
  return problems;
};

const computedEntry = (id, status, summary) => ({
  id,
  text: '',
  status,
  summary,
  refs: [],
  computed: true,
});

// A literal is matched as a plain substring, never as a pattern: a
// regex-like literal (e.g. "a.b*") only matches itself.
const computeAbsenceItems = (specItems, root) => {
  if (!Array.isArray(specItems)) return [];
  const items = [];
  for (const item of specItems) {
    if (item.type !== 'absence') continue;
    const match = ABSENCE_VERIFY_PATTERN.exec(item.verify ?? '');
    if (!match) {
      const summary = 'malformed absence Verify grammar';
      items.push(computedEntry(item.id, STATUS_FAIL, summary));
      continue;
    }
    const [, literal, filePath] = match;
    const { content, problem } = readReferencedFile(root, filePath);
    if (problem !== null) {
      const summary = `${filePath}: ${problem}`;
      items.push(computedEntry(item.id, STATUS_FAIL, summary));
      continue;
    }
    const found = content.includes(literal);
    const quoted = JSON.stringify(literal);
    const summary = found
      ? `${item.id}: literal ${quoted} found in ${filePath}`
      : `${item.id}: literal ${quoted} not found in ${filePath}`;
    const status = found ? STATUS_FAIL : STATUS_PASS;
    items.push(computedEntry(item.id, status, summary));
  }
  return items;
};

const isCheckRunMatch = (checks, name) => {
  const matches = checks.filter((check) => check.name === name);
  return (
    matches.length === 1 &&
    matches[0].status === 'completed' &&
    matches[0].conclusion === 'success'
  );
};

// ciRaw is the raw ci.json text, read once by the CLI and reused here.
const computeCiItems = (specItems, ciRaw) => {
  if (!Array.isArray(specItems)) return [];
  const ciData = ciRaw === null ? null : parseCiData(ciRaw);
  const items = [];
  for (const item of specItems) {
    if (item.type !== 'ci') continue;
    const match = CI_VERIFY_PATTERN.exec(item.verify ?? '');
    if (!match) {
      items.push(
        computedEntry(item.id, STATUS_FAIL, 'malformed ci Verify grammar'),
      );
      continue;
    }
    const [, checkName] = match;
    if (ciData === null) {
      items.push(
        computedEntry(item.id, STATUS_FAIL, 'CI results were not checked'),
      );
      continue;
    }
    const ok = isCheckRunMatch(ciData.checks, checkName);
    const summary = ok
      ? `CI check "${checkName}" succeeded`
      : `CI check "${checkName}" is missing, in progress, or not successful`;
    items.push(computedEntry(item.id, ok ? STATUS_PASS : STATUS_FAIL, summary));
  }
  return items;
};

const ITEM_SECTIONS = [
  'acceptance criteria',
  'definition of done',
  'test requirement',
];
const HEADING = /^#{1,6}\s+(.+?)\s*$/;
const FENCE = /^\s*(```|~~~)/;
const TOP_LEVEL_ITEM = /^ ?(?:[-*+]|\d+[.)])\s+\S/;

const sectionOf = (title) => {
  const name = title.toLowerCase();
  return ITEM_SECTIONS.find((section) => name.startsWith(section)) ?? null;
};

// Lower bound of report entries the prompt requires: one per top-level list
// item under Acceptance Criteria / Definition of Done / Test Requirement, and
// one for a Test Requirement written as prose. The model may split further.
const countIssueItems = (markdown) => {
  const counts = new Map(ITEM_SECTIONS.map((section) => [section, 0]));
  const hasText = new Set();
  let current = null;
  let isFenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (FENCE.test(line)) isFenced = !isFenced;
    const heading = isFenced ? null : HEADING.exec(line);
    if (heading !== null) {
      current = sectionOf(heading[1]);
      continue;
    }
    if (current === null || line.trim() === '') continue;
    hasText.add(current);
    if (!isFenced && TOP_LEVEL_ITEM.test(line)) {
      counts.set(current, counts.get(current) + 1);
    }
  }
  const testRequirement = 'test requirement';
  if (counts.get(testRequirement) === 0 && hasText.has(testRequirement)) {
    counts.set(testRequirement, 1);
  }
  let total = 0;
  for (const count of counts.values()) total += count;
  return total;
};

const checkCoverage = (report, issueMarkdown) => {
  const expected = countIssueItems(issueMarkdown);
  const actual = report.criteria.length;
  if (actual >= expected) return [];
  return [
    `report covers ${actual} of ${expected} issue items ` +
      '(Acceptance Criteria, Definition of Done, Test Requirement)',
  ];
};

const compareIds = (kind, reportedIds, issueIds) => {
  const problems = [];
  const seen = new Set();
  for (const id of reportedIds) {
    const name = JSON.stringify(id);
    if (seen.has(id)) {
      problems.push(`duplicate ${kind} id in report: ${name}`);
      continue;
    }
    seen.add(id);
    if (!issueIds.has(id)) problems.push(`${kind} id not in issue: ${name}`);
  }
  for (const id of issueIds) {
    if (seen.has(id)) continue;
    const name = JSON.stringify(id);
    problems.push(`issue ${kind} id missing from report: ${name}`);
  }
  return problems;
};

// The linter gives invariants type null; every other item has a type.
// ci/absence ids are excluded from the required criterion set (INV-4): the
// script computes them, so the model report is never required to carry them.
const idsOf = (items, isInvariantKind) =>
  new Set(
    items
      .filter((item) => (item.type === null) === isInvariantKind)
      .filter((item) => !DETERMINISTIC_TYPES.has(item.type))
      .map((item) => item.id),
  );

const checkIds = (report, items) => {
  const skip = deterministicIdsOf(items);
  const criteria = report.criteria.filter((entry) => !skip.has(entry.id));
  return [
    ...compareIds(
      'criterion',
      criteria.map((entry) => entry.id),
      idsOf(items, false),
    ),
    ...compareIds(
      'invariant',
      report.invariants.map((entry) => entry.id),
      idsOf(items, true),
    ),
  ];
};

// v2: exact ID sets replace the count; legacy: the count as before.
const checkIssueCoverage = (report, { spec = null, issueMarkdown = null }) => {
  if (isV2Spec(spec)) return checkIds(report, specItemsOf(spec));
  if (issueMarkdown === null) return [];
  return checkCoverage(report, issueMarkdown);
};

const isObject = (value) => value !== null && typeof value === 'object';

// conclusion is null while a check is still running
const isCheckRun = (value) =>
  isObject(value) &&
  typeof value.name === 'string' &&
  typeof value.status === 'string' &&
  (value.conclusion === null || typeof value.conclusion === 'string');

const isCommitStatus = (value) =>
  isObject(value) &&
  typeof value.name === 'string' &&
  typeof value.state === 'string';

// ci.json is GitHub API data gathered by the workflow, not model output.
const parseCiData = (raw) => {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const isValid =
    data !== null &&
    typeof data === 'object' &&
    typeof data.head_sha === 'string' &&
    data.head_sha !== '' &&
    typeof data.ci_workflow_conclusion === 'string' &&
    Array.isArray(data.checks) &&
    data.checks.every(isCheckRun) &&
    Array.isArray(data.statuses) &&
    data.statuses.every(isCommitStatus);
  return isValid ? data : null;
};

const ciFailuresOf = (data) => {
  const failures = [];
  if (data.ci_workflow_conclusion !== 'success') {
    failures.push(
      `CI workflow did not succeed (${data.ci_workflow_conclusion})`,
    );
  }

  const codeqlChecks = data.checks.filter(
    ({ name }) => name === 'Analyze (javascript-typescript)',
  );
  if (codeqlChecks.length !== 1) {
    failures.push(
      `required CodeQL check count is ${codeqlChecks.length}, expected 1`,
    );
  } else {
    const [codeql] = codeqlChecks;
    if (codeql.status !== 'completed' || codeql.conclusion !== 'success') {
      failures.push(
        `required CodeQL check is not successful (${codeql.status}/${codeql.conclusion})`,
      );
    }
  }

  for (const { name, conclusion } of data.checks) {
    if (OWN_CHECKS.has(name) || !FAILED_CONCLUSIONS.has(conclusion)) continue;
    failures.push(`ci check failed: ${name} (${conclusion})`);
  }
  for (const { name, state } of data.statuses) {
    if (OWN_CHECKS.has(name) || !FAILED_STATES.has(state)) continue;
    failures.push(`ci status failed: ${name} (${state})`);
  }
  return failures;
};

const parseCiFailures = (raw) => {
  const data = parseCiData(raw);
  return data === null ? null : ciFailuresOf(data);
};

const collectFailures = (
  report,
  { manualVerified, refsProblems, ciFailures },
) => {
  const failures = [];
  if (report.criteria.length === 0) failures.push('no criteria were checked');
  for (const criterion of report.criteria) {
    const label = labelOf(criterion);
    if (criterion.status === STATUS_FAIL) {
      failures.push(`criterion failed: ${label}`);
    }
    const isBlockingUnverifiable =
      criterion.status === STATUS_UNVERIFIABLE && !manualVerified;
    if (isBlockingUnverifiable) {
      failures.push(`criterion unverifiable: ${label}`);
    }
    const isUnsupportedPass =
      !criterion.computed &&
      criterion.status === STATUS_PASS &&
      criterion.refs.length === 0;
    if (isUnsupportedPass) {
      failures.push(`criterion passed without references: ${label}`);
    }
  }
  for (const invariant of report.invariants) {
    if (invariant.status === STATUS_FAIL) {
      failures.push(`invariant failed: ${invariant.id}`);
    }
    const isUnsupportedPass =
      invariant.status === STATUS_PASS && invariant.refs.length === 0;
    if (isUnsupportedPass) {
      failures.push(`invariant passed without references: ${invariant.id}`);
    }
  }
  for (const item of report.test_tampering) {
    failures.push(`test tampering: ${item}`);
  }
  for (const file of report.out_of_scope_files) {
    failures.push(`out of scope file: ${file}`);
  }
  if (refsProblems === null) {
    failures.push('references were not checked');
  } else {
    for (const item of refsProblems) failures.push(`bad reference: ${item}`);
  }
  if (ciFailures === null) failures.push('CI results were not checked');
  else failures.push(...ciFailures);
  return failures;
};

// Merges deterministically computed ci/absence entries into the model's own
// criteria: a computed id always wins over whatever the model reported for
// it (AC-8 — a stray model entry for that id is discarded, not compared).
const mergeComputed = (report, computedItems) => {
  if (computedItems.length === 0) return report;
  const computedIds = new Set(computedItems.map((entry) => entry.id));
  const criteria = [
    ...report.criteria.filter((entry) => !computedIds.has(entry.id)),
    ...computedItems,
  ];
  return { ...report, criteria };
};

const evaluate = (
  raw,
  {
    manualVerified = false,
    refsProblems = null,
    ciFailures = null,
    spec,
    approval,
    computedItems = [],
  } = {},
) => {
  const specFormat =
    spec !== undefined && spec !== null ? spec.format : undefined;
  const specItems = specItemsOf(spec);
  const approvalCheck = checkApproval(approval, specFormat);
  const approvalNote = approvalCheck.note;
  const fail = (failures) => ({
    passed: false,
    report: null,
    failures,
    specFormat,
    specItems,
    approvalNote,
  });
  if (spec !== undefined && isSpecInvalid(spec)) {
    return fail(spec.problems.map((problem) => `spec invalid: ${problem}`));
  }
  const preFailures = [
    ...(spec === null ? [SPEC_NOT_CHECKED] : []),
    ...approvalCheck.failures,
  ];
  if (raw === null) return fail([...preFailures, 'no report']);
  const { report: parsed, problem } = parseReport(raw);
  if (parsed === null) return fail([...preFailures, problem]);
  const report = mergeComputed(parsed, computedItems);
  const failures = [
    ...preFailures,
    ...collectFailures(report, { manualVerified, refsProblems, ciFailures }),
  ];
  return {
    passed: failures.length === 0,
    report,
    failures,
    specFormat,
    specItems,
    approvalNote,
  };
};

const escapeCell = (text) =>
  text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

const renderList = (title, items, { showNone = false } = {}) => {
  if (items.length === 0 && !showNone) return [];
  const lines = items.length === 0 ? ['- none'] : items.map((i) => `- ${i}`);
  return ['', `**${title}**`, ...lines];
};

const renderRefs = (refs) =>
  refs.map(({ path: file, line }) => `${file}:${line}`).join(', ');

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

const renderTable = (title, entries, nameOf) => {
  if (entries.length === 0) return [];
  const lines = [
    '',
    `| ${title} | Status | Summary | References |`,
    '|---|---|---|---|',
  ];
  for (const entry of entries) {
    const { status, summary, refs, computed } = entry;
    const displayStatus = computed ? `${status}${COMPUTED_SUFFIX}` : status;
    const cells = [nameOf(entry), displayStatus, summary, renderRefs(refs)];
    lines.push(`| ${cells.map(escapeCell).join(' | ')} |`);
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
  },
  { problem = null, manualVerifiedIgnoredBy },
) => {
  const verdict = passed ? STATUS_PASS : STATUS_FAIL;
  const lines = [COMMENT_MARKER, `## Acceptance verifier: ${verdict}`];
  if (specFormat === 'legacy') lines.push('Issue format: legacy');
  if (approvalNote !== null) lines.push(approvalNote);
  if (manualVerifiedIgnoredBy !== undefined) {
    const actor = manualVerifiedIgnoredBy ?? 'unknown';
    lines.push('', `manual-verified ignored: set by ${actor}`);
  }
  if (report !== null) {
    const nameOf = createNamer(specItems);
    lines.push(...renderTable('Criterion', report.criteria, nameOf));
    lines.push(...renderTable('Invariant', report.invariants, nameOf));
    const options = { showNone: true };
    lines.push(...renderList('Test tampering', report.test_tampering, options));
    lines.push(...renderList('Risk zones', report.risk_zones, options));
    lines.push(
      ...renderList('Out of scope files', report.out_of_scope_files, options),
    );
  }
  const reasons = problem === null ? failures : [problem, ...failures];
  lines.push(...renderList('Why not PASS', passed ? [] : reasons));
  return `${lines.join('\n')}\n`;
};

const parseArgs = (argv) => {
  const options = {
    file: null,
    out: null,
    manualVerified: false,
    checkRefs: false,
    root: null,
    refsProblems: null,
    ci: null,
    issue: null,
    spec: null,
    absence: null,
    absenceOut: null,
    approval: null,
    manualVerifiedIgnoredBy: undefined,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--manual-verified') options.manualVerified = true;
    else if (arg === '--check-refs') options.checkRefs = true;
    else if (arg === '--out') options.out = argv[++index] ?? null;
    else if (arg === '--root') options.root = argv[++index] ?? null;
    else if (arg === '--refs-problems') {
      options.refsProblems = argv[++index] ?? null;
    } else if (arg === '--ci') options.ci = argv[++index] ?? null;
    else if (arg === '--issue') options.issue = argv[++index] ?? null;
    else if (arg === '--spec') options.spec = argv[++index] ?? null;
    else if (arg === '--absence') options.absence = argv[++index] ?? null;
    else if (arg === '--approval') options.approval = argv[++index] ?? null;
    else if (arg === '--absence-out') {
      options.absenceOut = argv[++index] ?? null;
    } else if (arg === '--manual-verified-ignored') {
      options.manualVerifiedIgnoredBy = argv[++index] ?? null;
    } else if (arg === '--manual-verified-ignored-unknown') {
      options.manualVerifiedIgnoredBy = null;
    } else if (options.file === null) options.file = arg;
  }
  return options;
};

const readRefsProblems = (file) => {
  if (file === null) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return isStringArray(data) ? data : null;
  } catch {
    return null;
  }
};

const readRawFile = (file) => {
  if (file === null) return null;
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};

// Written by --check-refs (--absence-out), which alone has --root.
const readAbsenceItems = (file) => {
  if (file === null) return [];
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const USAGE =
  'usage:\n' +
  '  acceptance-verdict.js --check-refs <verdict.json> --root <dir> ' +
  '--out <refs-problems.json> [--issue <issue.md>] ' +
  '[--spec <spec-lint.json>] [--absence-out <absence.json>]\n' +
  '  acceptance-verdict.js <verdict.json> --out <comment.md> ' +
  '[--refs-problems <refs-problems.json>] [--ci <ci.json>] ' +
  '[--spec <spec-lint.json>] [--absence <absence.json>] ' +
  '[--approval <spec-approval.json>] [--manual-verified] ' +
  '[--manual-verified-ignored <actor> | --manual-verified-ignored-unknown]';

const readIssueCoverage = (report, issue) => {
  if (issue === null) return [];
  try {
    const issueMarkdown = fs.readFileSync(issue, 'utf8');
    return checkIssueCoverage(report, { issueMarkdown });
  } catch (error) {
    return [`issue not readable, coverage not checked: ${error.code}`];
  }
};

// Fail closed: a --spec that was passed but could not be read means the ID
// match did not run; the count check still runs as a floor.
const readSpecCoverage = (report, { issue, spec }) => {
  const specResult = readSpecResult(spec);
  if (isV2Spec(specResult)) {
    return checkIssueCoverage(report, { spec: specResult });
  }
  const coverage = readIssueCoverage(report, issue);
  if (specResult !== null) return coverage;
  return [`${SPEC_NOT_CHECKED}, issue ids were not matched`, ...coverage];
};

const runCheckRefs = ({ file, root, out, issue, spec, absenceOut }) => {
  const { raw } = readReport(file);
  const { report } = raw === null ? { report: null } : parseReport(raw);
  const specItems = specItemsOf(readSpecResult(spec));
  const problems =
    report === null
      ? null
      : [
          ...checkRefs(report, root, specItems),
          ...checkBehaviorRefs(report, specItems),
          ...readSpecCoverage(report, { issue, spec }),
        ];
  fs.writeFileSync(out, JSON.stringify(problems));
  if (absenceOut !== null) {
    fs.writeFileSync(
      absenceOut,
      JSON.stringify(computeAbsenceItems(specItems, root)),
    );
  }
  console.log(problems === null ? 'SKIPPED' : `${problems.length} problem(s)`);
  return 0;
};

const runVerdict = ({
  file,
  out,
  manualVerified,
  refsProblems,
  ci,
  spec,
  absence,
  approval,
  manualVerifiedIgnoredBy,
}) => {
  const specResult = readSpecResult(spec);
  const skipReport = specResult !== undefined && isSpecInvalid(specResult);
  const { raw, problem } = skipReport
    ? { raw: null, problem: null }
    : readReport(file);
  const ciRaw = readRawFile(ci);
  const ciItems = computeCiItems(specItemsOf(specResult), ciRaw);
  const computedItems = [...ciItems, ...readAbsenceItems(absence)];
  const result = evaluate(raw, {
    manualVerified,
    refsProblems: readRefsProblems(refsProblems),
    ciFailures: ciRaw === null ? null : parseCiFailures(ciRaw),
    spec: specResult,
    approval: readApproval(approval),
    computedItems,
  });
  fs.writeFileSync(
    out,
    renderComment(result, { problem, manualVerifiedIgnoredBy }),
  );
  console.log(result.passed ? STATUS_PASS : STATUS_FAIL);
  return 0;
};

const main = (argv) => {
  const options = parseArgs(argv);
  const { file, out, root, checkRefs: isCheckRefs } = options;
  if (file === null || out === null || (isCheckRefs && root === null)) {
    console.error(USAGE);
    return 2;
  }
  return isCheckRefs ? runCheckRefs(options) : runVerdict(options);
};

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = {
  COMMENT_MARKER,
  evaluate,
  renderComment,
  parseArgs,
  checkRefs,
  checkBehaviorRefs,
  countIssueItems,
  checkCoverage,
  checkIds,
  checkIssueCoverage,
  parseCiFailures,
  readSpecResult,
  readApproval,
  computeAbsenceItems,
  computeCiItems,
};
