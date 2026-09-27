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
  value.quote.trim() !== '';

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

// Untrusted: `ref.path` comes from model output. It must stay inside the
// checkout, be a regular file (no symlink at any level) and be small.
const readReferencedLine = (root, ref) => {
  const rootReal = fs.realpathSync(root);
  const target = path.resolve(rootReal, ref.path);
  if (!isInside(rootReal, target)) {
    return { content: null, problem: 'path is outside the checkout' };
  }
  let stat;
  try {
    stat = fs.lstatSync(target);
  } catch (error) {
    return { content: null, problem: `file not readable: ${error.code}` };
  }
  if (!stat.isFile() || !isInside(rootReal, fs.realpathSync(target))) {
    return { content: null, problem: 'not a regular file inside the checkout' };
  }
  if (stat.size > MAX_REF_FILE_BYTES) {
    return { content: null, problem: 'file is too large to check' };
  }
  const lines = fs.readFileSync(target, 'utf8').split(/\r?\n/);
  if (ref.line > lines.length) {
    return {
      content: null,
      problem: `line ${ref.line} is past the end (${lines.length} lines)`,
    };
  }
  return { content: lines[ref.line - 1], problem: null };
};

const normalizeSpaces = (text) => text.replace(/\s+/g, ' ').trim();

const checkRefs = (report, root) => {
  const problems = [];
  for (const entry of [...report.criteria, ...report.invariants]) {
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
const idsOf = (items, isInvariantKind) =>
  new Set(
    items
      .filter((item) => (item.type === null) === isInvariantKind)
      .map((item) => item.id),
  );

const checkIds = (report, items) => [
  ...compareIds(
    'criterion',
    report.criteria.map((entry) => entry.id),
    idsOf(items, false),
  ),
  ...compareIds(
    'invariant',
    report.invariants.map((entry) => entry.id),
    idsOf(items, true),
  ),
];

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
const parseCiFailures = (raw) => {
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
  if (!isValid) return null;
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
      criterion.status === STATUS_PASS && criterion.refs.length === 0;
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

const evaluate = (
  raw,
  {
    manualVerified = false,
    refsProblems = null,
    ciFailures = null,
    spec,
  } = {},
) => {
  const specFormat =
    spec !== undefined && spec !== null ? spec.format : undefined;
  const specItems = specItemsOf(spec);
  const fail = (failures) => ({
    passed: false,
    report: null,
    failures,
    specFormat,
    specItems,
  });
  if (spec !== undefined && isSpecInvalid(spec)) {
    return fail(spec.problems.map((problem) => `spec invalid: ${problem}`));
  }
  const specNotChecked = spec === null ? [SPEC_NOT_CHECKED] : [];
  if (raw === null) return fail([...specNotChecked, 'no report']);
  const { report, problem } = parseReport(raw);
  if (report === null) return fail([...specNotChecked, problem]);
  const failures = [
    ...specNotChecked,
    ...collectFailures(report, { manualVerified, refsProblems, ciFailures }),
  ];
  return {
    passed: failures.length === 0,
    report,
    failures,
    specFormat,
    specItems,
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
    const { status, summary, refs } = entry;
    const cells = [nameOf(entry), status, summary, renderRefs(refs)];
    lines.push(`| ${cells.map(escapeCell).join(' | ')} |`);
  }
  return lines;
};

const renderComment = (
  { passed, report, failures, specFormat, specItems = null },
  { problem = null },
) => {
  const verdict = passed ? STATUS_PASS : STATUS_FAIL;
  const lines = [COMMENT_MARKER, `## Acceptance verifier: ${verdict}`];
  if (specFormat === 'legacy') lines.push('Issue format: legacy');
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
    else if (options.file === null) options.file = arg;
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

const readCiFailures = (file) => {
  if (file === null) return null;
  try {
    return parseCiFailures(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

const USAGE =
  'usage:\n' +
  '  acceptance-verdict.js --check-refs <verdict.json> --root <dir> ' +
  '--out <refs-problems.json> [--issue <issue.md>] ' +
  '[--spec <spec-lint.json>]\n' +
  '  acceptance-verdict.js <verdict.json> --out <comment.md> ' +
  '[--refs-problems <refs-problems.json>] [--ci <ci.json>] ' +
  '[--spec <spec-lint.json>] [--manual-verified]';

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

const runCheckRefs = ({ file, root, out, issue, spec }) => {
  const { raw } = readReport(file);
  const { report } = raw === null ? { report: null } : parseReport(raw);
  const problems =
    report === null
      ? null
      : [
          ...checkRefs(report, root),
          ...readSpecCoverage(report, { issue, spec }),
        ];
  fs.writeFileSync(out, JSON.stringify(problems));
  console.log(problems === null ? 'SKIPPED' : `${problems.length} problem(s)`);
  return 0;
};

const runVerdict = ({ file, out, manualVerified, refsProblems, ci, spec }) => {
  const specResult = readSpecResult(spec);
  const skipReport = specResult !== undefined && isSpecInvalid(specResult);
  const { raw, problem } = skipReport
    ? { raw: null, problem: null }
    : readReport(file);
  const result = evaluate(raw, {
    manualVerified,
    refsProblems: readRefsProblems(refsProblems),
    ciFailures: readCiFailures(ci),
    spec: specResult,
  });
  fs.writeFileSync(out, renderComment(result, { problem }));
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
  countIssueItems,
  checkCoverage,
  checkIds,
  checkIssueCoverage,
  parseCiFailures,
  readSpecResult,
};
