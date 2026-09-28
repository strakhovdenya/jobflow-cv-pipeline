'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { checkRefs, checkBehaviorRefs } = require('./refs');
const {
  ref,
  criterion,
  report,
  makeCheckout,
  specItem,
} = require('./test-helpers');

test('checkRefs accepts a matching quote, ignoring whitespace', () => {
  const root = makeCheckout({
    'apps/api/x.ts': 'a\n  export   const x = 1;\n',
  });
  const parsed = JSON.parse(
    report({
      criteria: [
        criterion('PASS', 'AC', {
          refs: [ref({ line: 2, quote: 'export const x' })],
        }),
      ],
    }),
  );
  assert.deepStrictEqual(checkRefs(parsed, root), []);
  fs.rmSync(root, { recursive: true });
});

test('checkRefs reports a missing file, bad line and wrong quote', () => {
  const root = makeCheckout({ 'apps/api/x.ts': 'export const x = 1;\n' });
  const refs = [
    ref({ path: 'apps/api/absent.ts' }),
    ref({ line: 99 }),
    ref({ quote: 'something else' }),
  ];
  const parsed = JSON.parse(
    report({ criteria: [criterion('PASS', 'AC', { refs })] }),
  );
  const problems = checkRefs(parsed, root);
  assert.strictEqual(problems.length, 3);
  assert.ok(problems[0].includes('file not readable'));
  assert.ok(problems[1].includes('past the end'));
  assert.ok(problems[2].includes('quote not found'));
  fs.rmSync(root, { recursive: true });
});

test('checkRefs rejects paths that escape the checkout or hit .git', () => {
  const root = makeCheckout({ '.git/config': 'export const x', 'a.ts': 'x' });
  const refs = [
    ref({ path: '../outside.ts' }),
    ref({ path: '.git/config' }),
    ref({ path: path.resolve(root, '..', 'other.ts') }),
  ];
  const parsed = JSON.parse(
    report({ criteria: [criterion('PASS', 'AC', { refs })] }),
  );
  const problems = checkRefs(parsed, root);
  assert.strictEqual(problems.length, 3);
  for (const problem of problems) assert.ok(problem.includes('outside'));
  fs.rmSync(root, { recursive: true });
});

// A real symlink needs elevated privileges on Windows (no developer mode),
// which made this test environment-dependent. resolveInsideCheckout only
// ever asks fs.lstatSync().isFile() to reject a symlink target, so mocking
// that one call exercises the same rejection path deterministically on
// every platform, with no real symlink on disk.
test('checkRefs rejects a symlink', (t) => {
  const root = makeCheckout({});
  const target = path.resolve(fs.realpathSync(root), 'link.ts');
  const originalLstatSync = fs.lstatSync;
  t.mock.method(fs, 'lstatSync', (targetPath, options) =>
    path.resolve(targetPath) === target
      ? { isFile: () => false, isSymbolicLink: () => true }
      : originalLstatSync(targetPath, options),
  );
  const parsed = JSON.parse(
    report({
      criteria: [criterion('PASS', 'AC', { refs: [ref({ path: 'link.ts' })] })],
    }),
  );
  assert.strictEqual(checkRefs(parsed, root).length, 1);
  fs.rmSync(root, { recursive: true });
});

test('checkRefs prints the rejected quote', () => {
  const root = makeCheckout({ 'apps/api/x.ts': 'export const x = 1;\n' });
  const refs = [ref({ quote: 'export const x = 1;},{"' })];
  const parsed = JSON.parse(
    report({ criteria: [criterion('PASS', 'AC', { refs })] }),
  );
  const problems = checkRefs(parsed, root);
  assert.strictEqual(problems.length, 1);
  assert.ok(problems[0].includes('"export const x = 1;},{\\""'));
  fs.rmSync(root, { recursive: true });
});

const BEHAVIOR_SPEC_ITEMS = [specItem('AC-1', 'behavior', 'a behavior item')];
const DOC_SPEC_ITEMS = [specItem('AC-1', 'doc', 'a doc item')];

const behaviorReport = (refs) =>
  JSON.parse(
    report({ criteria: [criterion('PASS', 'model text', { id: 'AC-1', refs })] }),
  );

test('behavior PASS without an impl reference fails', () => {
  const parsed = behaviorReport([ref({ kind: 'test' })]);
  const problems = checkBehaviorRefs(parsed, BEHAVIOR_SPEC_ITEMS);
  assert.deepStrictEqual(problems, [
    'behavior item passed without impl and test references: AC-1',
  ]);
});

test('behavior PASS without a test reference fails', () => {
  const parsed = behaviorReport([ref({ kind: 'impl' })]);
  const problems = checkBehaviorRefs(parsed, BEHAVIOR_SPEC_ITEMS);
  assert.deepStrictEqual(problems, [
    'behavior item passed without impl and test references: AC-1',
  ]);
});

test('behavior PASS with impl and test references does not fail', () => {
  const parsed = behaviorReport([
    ref({ kind: 'impl' }),
    ref({ kind: 'test', path: 'apps/api/x.spec.ts' }),
  ]);
  assert.deepStrictEqual(checkBehaviorRefs(parsed, BEHAVIOR_SPEC_ITEMS), []);
});

test('doc PASS with a single doc reference does not fail', () => {
  const parsed = behaviorReport([ref({ kind: 'doc' })]);
  assert.deepStrictEqual(checkBehaviorRefs(parsed, DOC_SPEC_ITEMS), []);
});

test('legacy PASS without a test reference does not fail', () => {
  const parsed = behaviorReport([ref({ kind: 'impl' })]);
  assert.deepStrictEqual(checkBehaviorRefs(parsed, null), []);
});
