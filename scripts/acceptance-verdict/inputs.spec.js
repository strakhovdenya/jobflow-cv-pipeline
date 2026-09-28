'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readRequiredChecks, readSpecResult } = require('./inputs');

test('readRequiredChecks distinguishes omitted, unreadable and valid files', () => {
  assert.strictEqual(readRequiredChecks(null), undefined);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'required-checks-'));
  assert.strictEqual(readRequiredChecks(path.join(dir, 'absent.json')), null);
  const notArray = path.join(dir, 'not-array.json');
  fs.writeFileSync(notArray, JSON.stringify({ foo: 'bar' }));
  assert.strictEqual(readRequiredChecks(notArray), null);
  const valid = path.join(dir, 'valid.json');
  fs.writeFileSync(valid, JSON.stringify(['Lint', 'Build']));
  assert.deepStrictEqual(readRequiredChecks(valid), ['Lint', 'Build']);
  fs.rmSync(dir, { recursive: true });
});

test('readSpecResult returns null for a file that does not match the linter shape', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-shape-'));
  const file = path.join(dir, 'spec-lint.json');
  fs.writeFileSync(file, JSON.stringify({ notFormat: 'v2' }));
  assert.strictEqual(readSpecResult(file), null);
  fs.rmSync(dir, { recursive: true });
});
