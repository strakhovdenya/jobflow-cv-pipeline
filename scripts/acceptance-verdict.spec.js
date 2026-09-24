'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  COMMENT_MARKER,
  evaluate,
  renderComment,
  parseArgs,
} = require('./acceptance-verdict');

const SCRIPT = path.join(__dirname, 'acceptance-verdict.js');

const criterion = (status, text = 'AC one') => ({
  text,
  status,
  evidence: 'apps/api/x.ts:1',
});

const report = (overrides = {}) =>
  JSON.stringify({
    criteria: [criterion('PASS')],
    test_tampering: [],
    risk_zones: [],
    out_of_scope_files: [],
    ...overrides,
  });

test('passes when every criterion passes and nothing is tampered', () => {
  assert.strictEqual(evaluate(report()).passed, true);
});

test('fails on zero criteria', () => {
  const result = evaluate(report({ criteria: [] }));
  assert.strictEqual(result.passed, false);
});

test('fails on invalid JSON', () => {
  assert.strictEqual(evaluate('{oops').passed, false);
});

test('fails when a report is missing', () => {
  assert.strictEqual(evaluate(null).passed, false);
});

test('fails when the report violates the schema', () => {
  const invalid = report({ criteria: [{ text: 'a', status: 'MAYBE' }] });
  assert.strictEqual(evaluate(invalid).passed, false);
  const missingField = JSON.stringify({ criteria: [criterion('PASS')] });
  assert.strictEqual(evaluate(missingField).passed, false);
});

test('fails when any criterion fails', () => {
  const raw = report({ criteria: [criterion('PASS'), criterion('FAIL')] });
  assert.strictEqual(evaluate(raw).passed, false);
});

test('UNVERIFIABLE fails unless manual-verified is set', () => {
  const raw = report({ criteria: [criterion('UNVERIFIABLE')] });
  assert.strictEqual(evaluate(raw).passed, false);
  assert.strictEqual(evaluate(raw, { manualVerified: true }).passed, true);
});

test('manual-verified does not excuse a FAIL criterion', () => {
  const raw = report({ criteria: [criterion('FAIL')] });
  assert.strictEqual(evaluate(raw, { manualVerified: true }).passed, false);
});

test('non-empty test_tampering fails, even when manual-verified', () => {
  const raw = report({ test_tampering: ['x.spec.ts: assertion removed'] });
  assert.strictEqual(evaluate(raw, { manualVerified: true }).passed, false);
});

test('ignores a verdict field supplied by the model', () => {
  const raw = report({ verdict: 'PASS', criteria: [criterion('FAIL')] });
  assert.strictEqual(evaluate(raw).passed, false);
});

test('comment carries the marker, verdict and escaped table cells', () => {
  const raw = report({ criteria: [criterion('PASS', 'a | b')] });
  const comment = renderComment(evaluate(raw), { problem: null });
  assert.ok(comment.startsWith(COMMENT_MARKER));
  assert.ok(comment.includes('Acceptance verifier: PASS'));
  assert.ok(comment.includes('a \\| b'));
});

test('comment explains why it is not PASS', () => {
  const comment = renderComment(evaluate('{oops'), { problem: 'boom' });
  assert.ok(comment.includes('Acceptance verifier: FAIL'));
  assert.ok(comment.includes('boom'));
});

test('parseArgs reads file, --out and --manual-verified', () => {
  assert.deepStrictEqual(
    parseArgs(['v.json', '--out', 'c.md', '--manual-verified']),
    { file: 'v.json', out: 'c.md', manualVerified: true },
  );
});

test('CLI writes a FAIL comment when the report file is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-'));
  const out = path.join(dir, 'comment.md');
  const run = spawnSync(
    process.execPath,
    [SCRIPT, path.join(dir, 'absent.json'), '--out', out],
    { encoding: 'utf8' },
  );
  assert.strictEqual(run.status, 0);
  assert.strictEqual(run.stdout.trim(), 'FAIL');
  assert.ok(fs.readFileSync(out, 'utf8').includes('report not readable'));
  fs.rmSync(dir, { recursive: true });
});

test('CLI prints PASS for a passing report', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-'));
  const file = path.join(dir, 'verdict.json');
  fs.writeFileSync(file, report());
  const run = spawnSync(
    process.execPath,
    [SCRIPT, file, '--out', path.join(dir, 'c.md')],
    { encoding: 'utf8' },
  );
  assert.strictEqual(run.stdout.trim(), 'PASS');
  fs.rmSync(dir, { recursive: true });
});

test('CLI exits 2 on missing arguments', () => {
  const run = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.strictEqual(run.status, 2);
});
