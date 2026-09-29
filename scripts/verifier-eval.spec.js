'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  parseArgs,
  readCases,
  readActualsRaw,
  parseActual,
  summarize,
  render,
} = require('./verifier-eval');

const SCRIPT = path.join(__dirname, 'verifier-eval.js');

const actualJson = (verdict) => JSON.stringify({ actual: verdict });

test('parseActual accepts PASS and FAIL', () => {
  assert.strictEqual(parseActual(actualJson('PASS')), 'PASS');
  assert.strictEqual(parseActual(actualJson('FAIL')), 'FAIL');
});

test('parseActual rejects invalid JSON', () => {
  assert.strictEqual(parseActual('not json'), null);
});

test('parseActual rejects a value other than PASS/FAIL', () => {
  assert.strictEqual(parseActual(JSON.stringify({ actual: 'MAYBE' })), null);
});

test('reports a matching case without incrementing false PASS or false FAIL', () => {
  const cases = [{ name: '434', expected: 'FAIL' }];
  const summary = summarize(cases, { 434: actualJson('FAIL') });
  assert.strictEqual(summary.falsePass, 0);
  assert.strictEqual(summary.falseFail, 0);
  assert.strictEqual(summary.runFailures, 0);
  assert.deepStrictEqual(summary.rows, [
    { name: '434', expected: 'FAIL', actual: 'FAIL' },
  ]);
});

test('counts a FAIL-expected case that actually passed as false PASS', () => {
  const cases = [{ name: '434', expected: 'FAIL' }];
  const summary = summarize(cases, { 434: actualJson('PASS') });
  assert.strictEqual(summary.falsePass, 1);
  assert.strictEqual(summary.falseFail, 0);
});

test('counts a PASS-expected case that actually failed as false FAIL', () => {
  const cases = [{ name: '900', expected: 'PASS' }];
  const summary = summarize(cases, { 900: actualJson('FAIL') });
  assert.strictEqual(summary.falsePass, 0);
  assert.strictEqual(summary.falseFail, 1);
});

test('treats a missing actual result as a run failure', () => {
  const cases = [{ name: '434', expected: 'FAIL' }];
  const summary = summarize(cases, {});
  assert.strictEqual(summary.runFailures, 1);
  assert.strictEqual(summary.falsePass, 0);
  assert.strictEqual(summary.falseFail, 0);
  assert.deepStrictEqual(summary.rows, [
    { name: '434', expected: 'FAIL', actual: null },
  ]);
});

test('treats a malformed actual result as a run failure', () => {
  const cases = [{ name: '434', expected: 'FAIL' }];
  const malformed = summarize(cases, { 434: 'not json' });
  assert.strictEqual(malformed.runFailures, 1);
  const wrongValue = summarize(cases, {
    434: JSON.stringify({ actual: 'MAYBE' }),
  });
  assert.strictEqual(wrongValue.runFailures, 1);
  assert.strictEqual(wrongValue.falsePass, 0);
  assert.strictEqual(wrongValue.falseFail, 0);
});

test('prints exact false PASS and false FAIL counts for a mixed set of cases', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verifier-eval-'));
  const casesDir = path.join(dir, 'golden');
  const resultsDir = path.join(dir, 'results');
  const writeCase = (name, expected) => {
    fs.mkdirSync(path.join(casesDir, name), { recursive: true });
    fs.writeFileSync(
      path.join(casesDir, name, 'case.json'),
      JSON.stringify({ expected, reason: 'x' }),
    );
  };
  writeCase('434', 'FAIL'); // matches (FAIL/FAIL)
  writeCase('446', 'FAIL'); // false PASS (FAIL/PASS)
  writeCase('900', 'PASS'); // false FAIL (PASS/FAIL)
  writeCase('463', 'FAIL'); // missing actual result
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(path.join(resultsDir, '434.json'), actualJson('FAIL'));
  fs.writeFileSync(path.join(resultsDir, '446.json'), actualJson('PASS'));
  fs.writeFileSync(path.join(resultsDir, '900.json'), actualJson('FAIL'));
  const run = spawnSync(process.execPath, [SCRIPT, casesDir, resultsDir], {
    encoding: 'utf8',
  });
  assert.ok(run.stdout.includes('false PASS: 1, false FAIL: 1'));
  assert.ok(run.stdout.includes('run failures: 1'));
  fs.rmSync(dir, { recursive: true });
});

test('reports zero counts and no crash for an empty case directory', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verifier-eval-'));
  const casesDir = path.join(dir, 'golden');
  const resultsDir = path.join(dir, 'results');
  fs.mkdirSync(casesDir, { recursive: true });
  fs.mkdirSync(resultsDir, { recursive: true });
  const run = spawnSync(process.execPath, [SCRIPT, casesDir, resultsDir], {
    encoding: 'utf8',
  });
  assert.strictEqual(run.status, 0);
  assert.ok(run.stdout.includes('no cases found'));
  assert.ok(run.stdout.includes('false PASS: 0, false FAIL: 0'));
  fs.rmSync(dir, { recursive: true });
});

test('readCases skips a subdirectory without a valid case.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verifier-eval-'));
  fs.mkdirSync(path.join(dir, '434'));
  fs.writeFileSync(
    path.join(dir, '434', 'case.json'),
    JSON.stringify({ expected: 'FAIL', reason: 'x', head_sha: 'a'.repeat(40) }),
  );
  fs.mkdirSync(path.join(dir, 'broken'));
  fs.writeFileSync(path.join(dir, 'broken', 'case.json'), 'not json');
  fs.mkdirSync(path.join(dir, 'no-case-file'));
  const cases = readCases(dir);
  assert.deepStrictEqual(cases, [{ name: '434', expected: 'FAIL' }]);
  fs.rmSync(dir, { recursive: true });
});

test('readActualsRaw reads only files for known case names', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verifier-eval-'));
  fs.writeFileSync(path.join(dir, '434.json'), actualJson('FAIL'));
  fs.writeFileSync(path.join(dir, 'unrelated.json'), actualJson('PASS'));
  const actualsRaw = readActualsRaw(dir, [{ name: '434', expected: 'FAIL' }]);
  assert.deepStrictEqual(actualsRaw, { 434: actualJson('FAIL') });
  fs.rmSync(dir, { recursive: true });
});

test('parseArgs reads positional dirs and an optional --out', () => {
  assert.deepStrictEqual(parseArgs(['cases', 'results']), {
    casesDir: 'cases',
    resultsDir: 'results',
    out: null,
  });
  assert.deepStrictEqual(parseArgs(['cases', 'results', '--out', 'x.md']), {
    casesDir: 'cases',
    resultsDir: 'results',
    out: 'x.md',
  });
  assert.strictEqual(parseArgs(['cases']), null);
  assert.strictEqual(parseArgs([]), null);
});

test('CLI reports usage and exits 2 on missing args', () => {
  const run = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.strictEqual(run.status, 2);
  assert.ok(run.stderr.includes('usage:'));
});

test('CLI evaluates a cases/results directory pair end to end', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verifier-eval-'));
  const casesDir = path.join(dir, 'golden');
  const resultsDir = path.join(dir, 'results');
  fs.mkdirSync(path.join(casesDir, '434'), { recursive: true });
  fs.writeFileSync(
    path.join(casesDir, '434', 'case.json'),
    JSON.stringify({ expected: 'FAIL', reason: 'CodeQL failed' }),
  );
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(path.join(resultsDir, '434.json'), actualJson('FAIL'));
  const out = path.join(dir, 'summary.md');
  const run = spawnSync(
    process.execPath,
    [SCRIPT, casesDir, resultsDir, '--out', out],
    { encoding: 'utf8' },
  );
  assert.strictEqual(run.status, 0);
  const summary = fs.readFileSync(out, 'utf8');
  assert.ok(summary.includes('434 | FAIL | FAIL'));
  assert.ok(summary.includes('false PASS: 0, false FAIL: 0'));
  fs.rmSync(dir, { recursive: true });
});

test('CLI exits 1 when a false PASS is present', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verifier-eval-'));
  const casesDir = path.join(dir, 'golden');
  const resultsDir = path.join(dir, 'results');
  fs.mkdirSync(path.join(casesDir, '434'), { recursive: true });
  fs.writeFileSync(
    path.join(casesDir, '434', 'case.json'),
    JSON.stringify({ expected: 'FAIL', reason: 'CodeQL failed' }),
  );
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(path.join(resultsDir, '434.json'), actualJson('PASS'));
  const run = spawnSync(process.execPath, [SCRIPT, casesDir, resultsDir], {
    encoding: 'utf8',
  });
  assert.strictEqual(run.status, 1);
  assert.ok(run.stdout.includes('false PASS: 1, false FAIL: 0'));
  fs.rmSync(dir, { recursive: true });
});
