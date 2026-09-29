'use strict';

const fs = require('node:fs');
const path = require('node:path');

const VERDICTS = new Set(['PASS', 'FAIL']);

const usage = () =>
  'usage: node scripts/verifier-eval.js <cases-dir> <results-dir> [--out <file>]';

// A case is a subdirectory of casesDir holding a case.json with an
// `expected` verdict (PASS/FAIL). An unreadable or malformed case.json is
// skipped rather than crashing the whole eval run.
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
    if (parsed && VERDICTS.has(parsed.expected)) {
      cases.push({ name, expected: parsed.expected });
    }
  }
  return cases;
};

// One actual-result file per case, named `<case>.json`, holding
// `{ "actual": "PASS" | "FAIL" }` (the verdict the eval workflow computed
// by running acceptance-verdict.js against that case's frozen inputs).
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

const parseActual = (raw) => {
  if (typeof raw !== 'string') return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') return null;
  return VERDICTS.has(parsed.actual) ? parsed.actual : null;
};

// Pure summary over in-memory data (cases + raw actual-result text), so
// this can be tested without touching the filesystem. `false PASS`
// (expected FAIL, actual PASS) is the main metric; `false FAIL` is counted
// for visibility only. A missing or malformed actual result is a run
// failure — counted separately from both, never miscounted as a false
// PASS/FAIL.
const summarize = (cases, actualsRaw) => {
  const rows = [];
  let falsePass = 0;
  let falseFail = 0;
  let runFailures = 0;
  for (const { name, expected } of cases) {
    const raw = Object.prototype.hasOwnProperty.call(actualsRaw, name)
      ? actualsRaw[name]
      : undefined;
    const actual = raw === undefined ? null : parseActual(raw);
    if (actual === null) {
      runFailures += 1;
      rows.push({ name, expected, actual: null });
      continue;
    }
    if (expected === 'FAIL' && actual === 'PASS') falsePass += 1;
    if (expected === 'PASS' && actual === 'FAIL') falseFail += 1;
    rows.push({ name, expected, actual });
  }
  return { rows, falsePass, falseFail, runFailures };
};

const render = ({ rows, falsePass, falseFail, runFailures }) => {
  const lines = [];
  if (rows.length === 0) {
    lines.push('no cases found');
  } else {
    lines.push('case | expected | actual');
    for (const row of rows) {
      lines.push(`${row.name} | ${row.expected} | ${row.actual ?? 'ERROR'}`);
    }
  }
  lines.push(`run failures: ${runFailures}`);
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
  return summary.falsePass > 0 || summary.runFailures > 0 ? 1 : 0;
};

if (require.main === module) process.exitCode = main();

module.exports = {
  usage,
  parseArgs,
  main,
  readCases,
  readActualsRaw,
  parseActual,
  summarize,
  render,
};
