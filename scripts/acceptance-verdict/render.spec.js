'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { COMMENT_MARKER, renderComment } = require('./render');
const { evaluate } = require('./verdict');
const { checkIds } = require('./coverage');
const { parseCiFailures } = require('./ci');
const { parseArgs } = require('../acceptance-verdict');
const {
  ref,
  criterion,
  report,
  evaluateChecked,
  ciJson,
  V2_SPEC,
  v2Report,
  CI_ABSENCE_SPEC_ITEMS,
  APPROVAL_V2_SPEC,
  APPROVAL_LEGACY_SPEC,
  approvalOf,
  SHA_CURRENT,
  LOSS,
} = require('./test-helpers');

test('comment carries the marker, verdict and escaped table cells', () => {
  const raw = report({ criteria: [criterion('PASS', 'a | b')] });
  const comment = renderComment(evaluateChecked(raw), { problem: null });
  assert.ok(comment.startsWith(COMMENT_MARKER));
  assert.ok(comment.includes('Acceptance verifier: PASS'));
  assert.ok(comment.includes('a \\| b'));
  assert.ok(comment.includes('apps/api/x.ts:1'));
});

test('comment escapes backslashes before pipes in table cells', () => {
  const raw = report({ criteria: [criterion('PASS', 'a\\|b')] });
  const comment = renderComment(evaluateChecked(raw), { problem: null });
  assert.ok(comment.includes('a\\\\\\|b'));
});

test('comment always lists tampering, risk zones and scope, even as none', () => {
  const comment = renderComment(evaluateChecked(report()), { problem: null });
  assert.ok(comment.includes('**Test tampering**\n- none'));
  assert.ok(comment.includes('**Risk zones**\n- none'));
  assert.ok(comment.includes('**Out of scope files**\n- none'));
});

test('comment lists reported risk zones and out of scope files', () => {
  const raw = report({
    risk_zones: ['ci', 'adr_034_manual_note'],
    out_of_scope_files: ['docs/x.md'],
  });
  const comment = renderComment(evaluateChecked(raw), { problem: null });
  assert.ok(comment.includes('- adr_034_manual_note'));
  assert.ok(comment.includes('- docs/x.md'));
});

test('model scope hints render without failing verdict', () => {
  const raw = report({ out_of_scope_files: ['docs/model-guess.md'] });
  const scope = { out_of_scope: [] };
  const SCOPE_V2_SPEC = { format: 'v2', problems: [] };
  const result = evaluateChecked(raw, { spec: SCOPE_V2_SPEC, scope });
  assert.strictEqual(result.passed, true);
  const comment = renderComment(result, { problem: null });
  assert.ok(comment.includes('**Model scope hints**\n- docs/model-guess.md'));
  assert.ok(!comment.includes('**Out of scope files**'));
});

test('comment explains why it is not PASS', () => {
  const comment = renderComment(evaluate('{oops'), { problem: 'boom' });
  assert.ok(comment.includes('Acceptance verifier: FAIL'));
  assert.ok(comment.includes('boom'));
});

test('renders manual-verified ignored when the label was set by an unauthorized actor', () => {
  const comment = renderComment(evaluateChecked(report()), {
    problem: null,
    manualVerifiedIgnoredBy: 'someone-else',
  });
  assert.ok(comment.includes('manual-verified ignored: set by someone-else'));
});

test('does not render manual-verified ignored when the label is authorized', () => {
  const comment = renderComment(evaluateChecked(report()), {
    problem: null,
    manualVerifiedIgnoredBy: undefined,
  });
  assert.ok(!comment.includes('manual-verified ignored'));
});

test('renders manual-verified ignored with an unknown actor', () => {
  const comment = renderComment(evaluateChecked(report()), {
    problem: null,
    manualVerifiedIgnoredBy: null,
  });
  assert.ok(comment.includes('manual-verified ignored: set by unknown'));
});

test('a failed CI check-run is a FAIL that names the check', () => {
  const ci = parseCiFailures(
    ciJson({
      checks: [
        {
          name: 'Analyze (javascript-typescript)',
          status: 'completed',
          conclusion: 'failure',
        },
      ],
    }),
  );
  const result = evaluateChecked(report(), { ciFailures: ci });
  assert.strictEqual(result.passed, false);
  assert.deepStrictEqual(result.failures, [
    'ci check failed: Analyze (javascript-typescript) (failure)',
  ]);
  assert.ok(
    renderComment(result, {}).includes('Analyze (javascript-typescript)'),
  );
});

test('a legacy spec labels the comment and keeps the existing PASS verdict path', () => {
  const spec = { format: 'legacy', problems: [] };
  const result = evaluateChecked(report(), { spec });
  assert.strictEqual(result.passed, true);
  const comment = renderComment(result, { problem: null });
  assert.ok(comment.includes('Issue format: legacy'));
  assert.ok(comment.includes('Acceptance verifier: PASS'));
});

test('a legacy spec keeps an existing FAIL verdict and still labels the comment', () => {
  const spec = { format: 'legacy', problems: [] };
  const raw = report({ criteria: [criterion('FAIL')] });
  const result = evaluateChecked(raw, { spec });
  assert.strictEqual(result.passed, false);
  const comment = renderComment(result, { problem: null });
  assert.ok(comment.includes('Issue format: legacy'));
  assert.ok(comment.includes('Acceptance verifier: FAIL'));
});

const evaluateV2 = (raw) => {
  const refsProblems = checkIds(JSON.parse(raw), V2_SPEC.items);
  return evaluateChecked(raw, { spec: V2_SPEC, refsProblems });
};

test('v2 comment shows issue id and issue text instead of model text', () => {
  const result = evaluateV2(v2Report());
  const comment = renderComment(result, { problem: null });
  assert.ok(comment.includes('| AC-1 first behavior | PASS |'));
  assert.ok(comment.includes('| INV-1 first invariant | PASS |'));
  assert.ok(comment.includes('| INV-2 second invariant | N/A |'));
  assert.ok(!comment.includes('model text'));
});

test('v2 comment marks a report id that is not in the issue', () => {
  const result = evaluateV2(
    v2Report({ ids: ['AC-1', 'TR-1', 'DOD-1', 'AC-9'] }),
  );
  const comment = renderComment(result, { problem: null });
  assert.ok(comment.includes('| AC-9 (not in issue) | PASS |'));
  assert.ok(!comment.includes('model text AC-9'));
});

test('the comment marks ci/absence items as (computed)', () => {
  const spec = { format: 'v2', problems: [], items: CI_ABSENCE_SPEC_ITEMS };
  const computedItems = [
    {
      id: 'DOD-1',
      text: '',
      status: 'PASS',
      summary: 'ci computed',
      refs: [],
      computed: true,
    },
    {
      id: 'DOD-2',
      text: '',
      status: 'FAIL',
      summary: 'absence computed',
      refs: [],
      computed: true,
    },
  ];
  const raw = report({
    criteria: [criterion('PASS', 'model text AC-1', { id: 'AC-1' })],
  });
  const result = evaluateChecked(raw, { spec, computedItems });
  const comment = renderComment(result, { problem: null });
  assert.ok(
    comment.includes('| DOD-1 checks are green | PASS (computed) | ci computed |'),
  );
  assert.ok(
    comment.includes(
      '| DOD-2 no TODO left | FAIL (computed) | absence computed |',
    ),
  );
});

test('the comment does not mark non-ci/absence items as (computed)', () => {
  const result = evaluateChecked(report());
  const comment = renderComment(result, { problem: null });
  assert.ok(!comment.includes('(computed)'));
});

test('matching approval hash keeps PASS', () => {
  const approval = approvalOf(SHA_CURRENT);
  for (const spec of [APPROVAL_V2_SPEC, APPROVAL_LEGACY_SPEC]) {
    const result = evaluateChecked(report(), { spec, approval });
    assert.strictEqual(result.passed, true);
    assert.deepStrictEqual(result.failures, []);
    const comment = renderComment(result, { problem: null });
    assert.ok(!comment.includes('Spec approval: not approved'));
  }
});

test('legacy spec without approval is labelled, not failed', () => {
  const approval = approvalOf(null);
  const result = evaluateChecked(report(), { spec: APPROVAL_LEGACY_SPEC, approval });
  assert.strictEqual(result.passed, true);
  const comment = renderComment(result, { problem: null });
  assert.ok(comment.includes('Spec approval: not approved (legacy)'));
  assert.ok(comment.includes('Acceptance verifier: PASS'));
});

test('does not fail on assertion losses with test-removal approval', () => {
  const result = evaluateChecked(report(), {
    assertionLosses: [LOSS],
    testRemovalApproved: true,
  });
  assert.strictEqual(result.passed, true);
  const comment = renderComment(result, { problem: null });
  assert.ok(comment.includes('Approved assertion losses'));
  assert.ok(comment.includes('apps/api/x.spec.ts: 3'));
});

test('renders ignored test-removal label and still fails', () => {
  const result = evaluateChecked(report(), { assertionLosses: [LOSS] });
  assert.strictEqual(result.passed, false);
  const comment = renderComment(result, {
    problem: null,
    testRemovalIgnoredBy: 'octocat',
  });
  assert.ok(comment.includes('test removal approval ignored: set by octocat'));
});

test('treats test-removal-ignored without a value as unknown actor', () => {
  const options = parseArgs(['v.json', '--test-removal-ignored']);
  assert.strictEqual(options.testRemovalIgnoredBy, null);
  const result = evaluateChecked(report(), { assertionLosses: [LOSS] });
  const comment = renderComment(result, {
    problem: null,
    testRemovalIgnoredBy: options.testRemovalIgnoredBy,
  });
  assert.ok(comment.includes('test removal approval ignored: set by unknown'));
});

test('renders moved assertion count without failing the verdict', () => {
  const result = evaluateChecked(report(), { assertionMoved: 12 });
  assert.strictEqual(result.passed, true);
  const comment = renderComment(result, { problem: null });
  assert.ok(comment.includes('Moved assertion lines: 12'));
});

test('comment shows the cited and found line for a shifted reference', () => {
  const refs = [
    ref({ line: 313, quote: 'export const x' }),
    ref({ path: 'apps/api/y.ts', line: 10, quote: 'other' }),
  ];
  const raw = report({ criteria: [criterion('PASS', 'AC one', { refs })] });
  const refsNotes = [{ list: 'criteria', entry: 0, ref: 0, cited: 313, found: 312 }];
  const result = evaluateChecked(raw, { refsNotes });
  const comment = renderComment(result, { problem: null });
  assert.ok(comment.includes('apps/api/x.ts:313→312'));
  assert.ok(comment.includes('apps/api/y.ts:10'));
  assert.ok(!comment.includes('apps/api/y.ts:10→'));
});
