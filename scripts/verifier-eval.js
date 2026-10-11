'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { REASON_CODE_SET } = require('./acceptance-verdict/result');

const VERDICTS = new Set(['PASS', 'FAIL']);

const OUTCOME = Object.freeze({
  MATCHED: 'matched',
  FALSE_PASS: 'false_pass',
  FALSE_FAIL: 'false_fail',
  RUN_FAILURE: 'run_failure',
  REASON_MISMATCH: 'reason_mismatch',
});

const usage = () =>
  'usage: node scripts/verifier-eval.js <cases-dir> <results-dir> [--out <file>]';

const isNonEmptyString = (value) => typeof value === 'string' && value !== '';

// A PASS case checks no reason, so both fields must be null. A FAIL case
// names the reason code (from the closed list the verifier exports) and the
// issue item it is about, or null for a rule without an ID (INV-3, INV-4).
const isValidExpectation = (parsed) => {
  const {
    expected,
    expected_criterion_id: id,
    expected_reason_code: code,
  } = parsed;
  if (expected === 'PASS') return id === null && code === null;
  return REASON_CODE_SET.has(code) && (id === null || isNonEmptyString(id));
};

// A case is a subdirectory of casesDir holding a case.json with an
// `expected` verdict (PASS/FAIL). An unreadable or malformed case.json is
// skipped rather than crashing the whole eval run. A case whose reason
// expectation is missing or invalid is kept but marked, so it is counted as
// a run failure instead of being checked by verdict alone.
const readCases = (casesDir) => {
  let entries;
  try {
    entries = fs.readdirSync(casesDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const names = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const cases = [];
  for (const name of names) {
    let raw;
    try {
      raw = fs.readFileSync(path.join(casesDir, name, 'case.json'), 'utf8');
    } catch {
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!parsed || !VERDICTS.has(parsed.expected)) continue;
    const isValid = isValidExpectation(parsed);
    cases.push({
      name,
      expected: parsed.expected,
      criterionId: isValid ? parsed.expected_criterion_id : null,
      reasonCode: isValid ? parsed.expected_reason_code : null,
      isValid,
    });
  }
  return cases;
};

// One actual-result file per case, named `<case>.json`, holding
// `{ "actual": "PASS" | "FAIL", "reasons": [{ "code", "id" }] }` (the
// reconciled verdict and the coded reasons the eval workflow took from the
// verifier's result.json for that case's frozen inputs).
const readActualsRaw = (resultsDir, cases) => {
  const actualsRaw = {};
  for (const { name } of cases) {
    try {
      actualsRaw[name] = fs.readFileSync(
        path.join(resultsDir, `${name}.json`),
        'utf8',
      );
    } catch {
      // Missing result — left unset; summarize() counts it as a run failure.
    }
  }
  return actualsRaw;
};

const isReason = (reason) =>
  reason !== null &&
  typeof reason === 'object' &&
  isNonEmptyString(reason.code) &&
  (reason.id === null || isNonEmptyString(reason.id));

const parseActual = (raw) => {
  if (typeof raw !== 'string') return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') return null;
  if (!VERDICTS.has(parsed.actual)) return null;
  if (!Array.isArray(parsed.reasons) || !parsed.reasons.every(isReason)) {
    return null;
  }
  const reasons = parsed.reasons.map(({ code, id }) => ({ code, id }));
  return { verdict: parsed.actual, reasons };
};

const hasExpectedReason = ({ reasonCode, criterionId }, reasons) =>
  reasons.some(
    (reason) => reason.code === reasonCode && reason.id === criterionId,
  );

// The single place that puts a case into exactly one category (INV-2).
const classify = (testCase, actual) => {
  if (!testCase.isValid || actual === null) return OUTCOME.RUN_FAILURE;
  const { expected } = testCase;
  if (expected === 'FAIL' && actual.verdict === 'PASS') {
    return OUTCOME.FALSE_PASS;
  }
  if (expected === 'PASS' && actual.verdict === 'FAIL') {
    return OUTCOME.FALSE_FAIL;
  }
  if (expected === 'PASS') return OUTCOME.MATCHED;
  return hasExpectedReason(testCase, actual.reasons)
    ? OUTCOME.MATCHED
    : OUTCOME.REASON_MISMATCH;
};

// Pure summary over in-memory data (cases + raw actual-result text), so
// this can be tested without touching the filesystem. `false PASS`
// (expected FAIL, actual PASS) is the main metric; `false FAIL` is counted
// for visibility only. A FAIL that carries no reason with the expected code
// and ID is a reason mismatch: the verifier failed the case, but not for the
// defect the case exists to catch. A missing or malformed actual result, or a
// case with no valid reason expectation, is a run failure — counted
// separately from all of them.
const summarize = (cases, actualsRaw) => {
  const counts = new Map(Object.values(OUTCOME).map((key) => [key, 0]));
  const rows = [];
  for (const testCase of cases) {
    const { name, expected, criterionId, reasonCode } = testCase;
    const raw = Object.prototype.hasOwnProperty.call(actualsRaw, name)
      ? actualsRaw[name]
      : undefined;
    const actual = raw === undefined ? null : parseActual(raw);
    const outcome = classify(testCase, actual);
    counts.set(outcome, counts.get(outcome) + 1);
    rows.push({
      name,
      expected,
      actual: actual === null ? null : actual.verdict,
      expectedReason:
        reasonCode === null ? null : { code: reasonCode, id: criterionId },
      actualReasons: actual === null ? [] : actual.reasons,
      outcome,
    });
  }
  return {
    rows,
    falsePass: counts.get(OUTCOME.FALSE_PASS),
    falseFail: counts.get(OUTCOME.FALSE_FAIL),
    runFailures: counts.get(OUTCOME.RUN_FAILURE),
    reasonMismatches: counts.get(OUTCOME.REASON_MISMATCH),
  };
};

const formatReason = ({ code, id }) => (id === null ? code : `${code}#${id}`);

const formatReasons = (reasons) =>
  reasons.length === 0 ? '-' : reasons.map(formatReason).join(', ');

const render = ({
  rows,
  falsePass,
  falseFail,
  runFailures,
  reasonMismatches,
}) => {
  const lines = [];
  if (rows.length === 0) {
    lines.push('no cases found');
  } else {
    lines.push('case | expected | actual | expected reason | actual reasons');
    for (const row of rows) {
      const expectedReason =
        row.expectedReason === null ? '-' : formatReason(row.expectedReason);
      lines.push(
        `${row.name} | ${row.expected} | ${row.actual ?? 'ERROR'} | ` +
          `${expectedReason} | ${formatReasons(row.actualReasons)}`,
      );
    }
  }
  lines.push(`run failures: ${runFailures}`);
  lines.push(`reason mismatches: ${reasonMismatches}`);
  lines.push(`false PASS: ${falsePass}, false FAIL: ${falseFail}`);
  return lines.join('\n');
};

const parseArgs = (argv) => {
  let casesDir = null;
  let resultsDir = null;
  let out = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out') {
      const value = argv[index + 1];
      if (!value) return null;
      out = value;
      index += 1;
    } else if (!arg.startsWith('--') && casesDir === null) {
      casesDir = arg;
    } else if (!arg.startsWith('--') && resultsDir === null) {
      resultsDir = arg;
    } else {
      return null;
    }
  }
  return casesDir !== null && resultsDir !== null
    ? { casesDir, resultsDir, out }
    : null;
};

const main = (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv);
  if (!args) {
    process.stderr.write(`${usage()}\n`);
    return 2;
  }
  const cases = readCases(args.casesDir);
  const actualsRaw = readActualsRaw(args.resultsDir, cases);
  const summary = summarize(cases, actualsRaw);
  const rendered = render(summary);
  console.log(rendered);
  if (args.out !== null) fs.writeFileSync(args.out, rendered);
  const isFailing =
    summary.falsePass > 0 ||
    summary.runFailures > 0 ||
    summary.reasonMismatches > 0;
  return isFailing ? 1 : 0;
};

if (require.main === module) process.exitCode = main();

module.exports = {
  usage,
  parseArgs,
  main,
  readCases,
  readActualsRaw,
  parseActual,
  classify,
  summarize,
  render,
};
