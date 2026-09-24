'use strict';

const fs = require('node:fs');
const path = require('node:path');

const COMMENT_MARKER = '<!-- acceptance-verifier -->';
const STATUS_PASS = 'PASS';
const STATUS_FAIL = 'FAIL';
const STATUS_UNVERIFIABLE = 'UNVERIFIABLE';
const CRITERION_STATUSES = new Set([
  STATUS_PASS,
  STATUS_FAIL,
  STATUS_UNVERIFIABLE,
]);

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
  typeof value.text === 'string' &&
  CRITERION_STATUSES.has(value.status) &&
  typeof value.summary === 'string' &&
  Array.isArray(value.refs) &&
  value.refs.every(isReference);

const isRiskZones = (value) =>
  isStringArray(value) &&
  value.length > 0 &&
  value.every((zone) => RISK_ZONES.has(zone)) &&
  (!value.includes(RISK_NONE) || value.length === 1);

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
  for (const { text, refs } of report.criteria) {
    for (const ref of refs) {
      const label = `${text}: ${ref.path}:${ref.line}`;
      const { content, problem } = readReferencedLine(root, ref);
      if (problem !== null) {
        problems.push(`${label} - ${problem}`);
        continue;
      }
      const found = normalizeSpaces(content).includes(
        normalizeSpaces(ref.quote),
      );
      if (!found) problems.push(`${label} - quote not found on that line`);
    }
  }
  return problems;
};

const isNamed = (value) =>
  value !== null && typeof value === 'object' && typeof value.name === 'string';

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
    Array.isArray(data.checks) &&
    data.checks.every(isNamed) &&
    Array.isArray(data.statuses) &&
    data.statuses.every(isNamed);
  if (!isValid) return null;
  const failures = [];
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
    if (criterion.status === STATUS_FAIL) {
      failures.push(`criterion failed: ${criterion.text}`);
    }
    const isBlockingUnverifiable =
      criterion.status === STATUS_UNVERIFIABLE && !manualVerified;
    if (isBlockingUnverifiable) {
      failures.push(`criterion unverifiable: ${criterion.text}`);
    }
    const isUnsupportedPass =
      criterion.status === STATUS_PASS && criterion.refs.length === 0;
    if (isUnsupportedPass) {
      failures.push(`criterion passed without references: ${criterion.text}`);
    }
  }
  for (const item of report.test_tampering) {
    failures.push(`test tampering: ${item}`);
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
  { manualVerified = false, refsProblems = null, ciFailures = null } = {},
) => {
  if (raw === null) {
    return { passed: false, report: null, failures: ['no report'] };
  }
  const { report, problem } = parseReport(raw);
  if (report === null) return { passed: false, report, failures: [problem] };
  const failures = collectFailures(report, {
    manualVerified,
    refsProblems,
    ciFailures,
  });
  return { passed: failures.length === 0, report, failures };
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

const renderComment = ({ passed, report, failures }, { problem = null }) => {
  const verdict = passed ? STATUS_PASS : STATUS_FAIL;
  const lines = [COMMENT_MARKER, `## Acceptance verifier: ${verdict}`];
  if (report !== null && report.criteria.length > 0) {
    lines.push(
      '',
      '| Criterion | Status | Summary | References |',
      '|---|---|---|---|',
    );
    for (const { text, status, summary, refs } of report.criteria) {
      const cells = [text, status, summary, renderRefs(refs)].map(escapeCell);
      lines.push(`| ${cells.join(' | ')} |`);
    }
  }
  if (report !== null) {
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
  '--out <refs-problems.json>\n' +
  '  acceptance-verdict.js <verdict.json> --out <comment.md> ' +
  '[--refs-problems <refs-problems.json>] [--ci <ci.json>] ' +
  '[--manual-verified]';

const runCheckRefs = ({ file, root, out }) => {
  const { raw } = readReport(file);
  const { report } = raw === null ? { report: null } : parseReport(raw);
  const problems = report === null ? null : checkRefs(report, root);
  fs.writeFileSync(out, JSON.stringify(problems));
  console.log(problems === null ? 'SKIPPED' : `${problems.length} problem(s)`);
  return 0;
};

const runVerdict = ({ file, out, manualVerified, refsProblems, ci }) => {
  const { raw, problem } = readReport(file);
  const result = evaluate(raw, {
    manualVerified,
    refsProblems: readRefsProblems(refsProblems),
    ciFailures: readCiFailures(ci),
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
  parseCiFailures,
};
