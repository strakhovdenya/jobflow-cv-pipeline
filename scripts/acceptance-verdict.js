'use strict';

const fs = require('node:fs');

const COMMENT_MARKER = '<!-- acceptance-verifier -->';
const STATUS_PASS = 'PASS';
const STATUS_FAIL = 'FAIL';
const STATUS_UNVERIFIABLE = 'UNVERIFIABLE';
const CRITERION_STATUSES = new Set([
  STATUS_PASS,
  STATUS_FAIL,
  STATUS_UNVERIFIABLE,
]);

const isStringArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isCriterion = (value) =>
  value !== null &&
  typeof value === 'object' &&
  typeof value.text === 'string' &&
  CRITERION_STATUSES.has(value.status) &&
  typeof value.evidence === 'string';

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
    isStringArray(data.risk_zones) &&
    isStringArray(data.out_of_scope_files);
  if (!isValid) return { report: null, problem: 'report violates schema' };
  return { report: data, problem: null };
};

const readReport = (path) => {
  try {
    return { raw: fs.readFileSync(path, 'utf8'), problem: null };
  } catch (error) {
    return { raw: null, problem: `report not readable: ${error.code}` };
  }
};

const collectFailures = (report, manualVerified) => {
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
  }
  for (const item of report.test_tampering) {
    failures.push(`test tampering: ${item}`);
  }
  return failures;
};

const evaluate = (raw, { manualVerified = false } = {}) => {
  if (raw === null) {
    return { passed: false, report: null, failures: ['no report'] };
  }
  const { report, problem } = parseReport(raw);
  if (report === null) return { passed: false, report, failures: [problem] };
  const failures = collectFailures(report, manualVerified);
  return { passed: failures.length === 0, report, failures };
};

const escapeCell = (text) =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');

const renderList = (title, items) =>
  items.length === 0
    ? []
    : ['', `**${title}**`, ...items.map((item) => `- ${item}`)];

const renderComment = ({ passed, report, failures }, { problem = null }) => {
  const verdict = passed ? STATUS_PASS : STATUS_FAIL;
  const lines = [COMMENT_MARKER, `## Acceptance verifier: ${verdict}`];
  if (report !== null && report.criteria.length > 0) {
    lines.push('', '| Criterion | Status | Evidence |', '|---|---|---|');
    for (const { text, status, evidence } of report.criteria) {
      const cells = [text, status, evidence].map(escapeCell);
      lines.push(`| ${cells.join(' | ')} |`);
    }
  }
  if (report !== null) {
    lines.push(...renderList('Test tampering', report.test_tampering));
    lines.push(...renderList('Risk zones', report.risk_zones));
    lines.push(...renderList('Out of scope files', report.out_of_scope_files));
  }
  const reasons = problem === null ? failures : [problem, ...failures];
  lines.push(...renderList('Why not PASS', passed ? [] : reasons));
  return `${lines.join('\n')}\n`;
};

const parseArgs = (argv) => {
  const options = { file: null, out: null, manualVerified: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--manual-verified') options.manualVerified = true;
    else if (arg === '--out') options.out = argv[++index] ?? null;
    else if (options.file === null) options.file = arg;
  }
  return options;
};

const main = (argv) => {
  const { file, out, manualVerified } = parseArgs(argv);
  if (file === null || out === null) {
    console.error(
      'usage: acceptance-verdict.js <verdict.json> --out <comment.md> ' +
        '[--manual-verified]',
    );
    return 2;
  }
  const { raw, problem } = readReport(file);
  const result = evaluate(raw, { manualVerified });
  fs.writeFileSync(out, renderComment(result, { problem }));
  console.log(result.passed ? STATUS_PASS : STATUS_FAIL);
  return 0;
};

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { COMMENT_MARKER, evaluate, renderComment, parseArgs };
