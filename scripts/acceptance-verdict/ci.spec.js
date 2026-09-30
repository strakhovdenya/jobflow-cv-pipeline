'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parseCiFailures } = require('./ci');
const { evaluate } = require('./verdict');
const { report, ciJson, codeqlSuccess } = require('./test-helpers');

test('cancelled, timed_out, action_required and startup_failure fail', () => {
  const checks = [
    'cancelled',
    'timed_out',
    'action_required',
    'startup_failure',
  ].map((conclusion, index) => ({
    name: `job ${index}`,
    status: 'completed',
    conclusion,
  }));
  assert.strictEqual(
    parseCiFailures(ciJson({ checks: [codeqlSuccess, ...checks] })).length,
    4,
  );
});

test('a failed or errored commit status fails', () => {
  const statuses = [
    { name: 'codecov/patch', state: 'failure' },
    { name: 'other', state: 'error' },
  ];
  assert.deepStrictEqual(parseCiFailures(ciJson({ statuses })), [
    'ci status failed: codecov/patch (failure)',
    'ci status failed: other (error)',
  ]);
});

test('the verifier own checks are ignored', () => {
  const checks = ['Verify', 'Report'].map((name) => ({
    name,
    status: 'completed',
    conclusion: 'failure',
  }));
  const statuses = [{ name: 'Acceptance Verifier', state: 'failure' }];
  assert.deepStrictEqual(
    parseCiFailures(ciJson({ checks: [codeqlSuccess, ...checks], statuses })),
    [],
  );
});

test('missing or malformed ci.json fails closed', () => {
  assert.strictEqual(parseCiFailures('{oops'), null);
  assert.strictEqual(parseCiFailures('{"checks":[]}'), null);
  assert.strictEqual(parseCiFailures('{"checks":[1],"statuses":[]}'), null);
  const noStatus = ciJson({
    checks: [{ name: 'Analyze (javascript-typescript)' }],
  });
  assert.strictEqual(parseCiFailures(noStatus), null);
  const noConclusion = ciJson({
    checks: [{ name: 'Analyze (javascript-typescript)', status: 'x' }],
  });
  assert.strictEqual(parseCiFailures(noConclusion), null);
  const noState = ciJson({ statuses: [{ name: 'codecov/patch' }] });
  assert.strictEqual(parseCiFailures(noState), null);
  const result = evaluate(report(), { refsProblems: [] });
  assert.strictEqual(result.passed, false);
  assert.ok(result.failures.includes('CI results were not checked'));
});

test('CI workflow conclusion must be success', () => {
  assert.deepStrictEqual(parseCiFailures(ciJson({ conclusion: 'failure' })), [
    'CI workflow did not succeed (failure)',
  ]);
});

const REQUIRED_CHECKS = ['Lint', 'Build'];

test('reports required check missing when absent from ci.json', () => {
  const failures = parseCiFailures(ciJson({ checks: [] }), REQUIRED_CHECKS);
  assert.ok(failures.includes('required check missing: Lint'));
  assert.ok(failures.includes('required check missing: Build'));
});

test('reports required check not completed when still running', () => {
  const checks = [
    { name: 'Lint', status: 'in_progress', conclusion: null },
    { name: 'Build', status: 'completed', conclusion: 'success' },
  ];
  const failures = parseCiFailures(ciJson({ checks }), REQUIRED_CHECKS);
  assert.deepStrictEqual(failures, ['required check not completed: Lint']);
});

test('reports required check failed for non-success conclusion', () => {
  const checks = [
    { name: 'Lint', status: 'completed', conclusion: 'success' },
    { name: 'Build', status: 'completed', conclusion: 'failure' },
  ];
  const failures = parseCiFailures(ciJson({ checks }), REQUIRED_CHECKS);
  assert.ok(failures.includes('required check failed: Build (failure)'));
});

test('reports no required-check failure when all required checks succeed', () => {
  const checks = REQUIRED_CHECKS.map((name) => ({
    name,
    status: 'completed',
    conclusion: 'success',
  }));
  const failures = parseCiFailures(ciJson({ checks }), REQUIRED_CHECKS);
  assert.deepStrictEqual(failures, []);
});

test('reports no required-check failure when the required list is empty', () => {
  const failures = parseCiFailures(ciJson({ checks: [] }), []);
  assert.deepStrictEqual(failures, []);
});

test('duplicate check-run entries for a required check fail closed', () => {
  const success = { name: 'Lint', status: 'completed', conclusion: 'success' };
  const failures = parseCiFailures(
    ciJson({ checks: [success, success] }),
    ['Lint'],
  );
  assert.deepStrictEqual(failures, [
    'required check ambiguous: Lint (2 matches)',
  ]);
});

test('required-checks.json matches the 13 names from INV-3/ISSUE-488 and excludes codecov/patch', () => {
  const file = path.join(
    __dirname,
    '..',
    '..',
    '.github',
    'verifier',
    'required-checks.json',
  );
  const requiredChecks = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepStrictEqual(requiredChecks, [
    'Lint',
    'Typecheck',
    'Lint (apps/web)',
    'Typecheck (apps/web)',
    'Test (apps/api)',
    'Test (e2e)',
    'Build',
    'Docker Build & Smoke Test',
    'Test (apps/web)',
    'Test (scripts)',
    'Dependabot Severity Gate',
    'Analyze (javascript-typescript)',
    'Factory separation',
  ]);
  assert.ok(!requiredChecks.includes('codecov/patch'));
});
