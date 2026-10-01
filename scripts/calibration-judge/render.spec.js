'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  COMMENT_MARKER,
  DISCLAIMER,
  render,
  decodeHiddenBlock,
} = require('./render');

const HIDDEN_PREFIX = '<!-- calibration-judge-analysis:';

const assembled = (overrides = {}) => ({
  round_key: {
    repository: 'owner/repo',
    verifier_run_id: 101,
    verifier_run_attempt: 2,
  },
  head_sha: 'b'.repeat(40),
  inputs: {
    issue: { status: 'present', historical: true },
    diff: { status: 'present', historical: true },
  },
  error: null,
  independent: {
    independent_expected_verdict: 'PASS',
    requirements: [
      {
        id: 'AC-1',
        literal_requirement: 'x',
        evidence_expected: 'y',
        single_interpretation: true,
        verify_proves_requirement: true,
        status: 'SATISFIED',
        rationale: 'covered by a test',
      },
    ],
  },
  analysis: {
    observed_verdict: 'FAIL',
    independent_expected_verdict: 'PASS',
    primary_cause: 'VERIFIER_FALSE_FAIL',
    responsibility: 'verifier',
    confidence: 'MEDIUM',
    issue_defects: [
      {
        finding_id: 'F-2',
        criterion_id: 'TR-1',
        subtype: 'MISSING_EDGE_CASE',
        description: 'edge case not named',
        evidence: [{ type: 'input', ref: 'issue.md', note: 'TR-1 text' }],
      },
    ],
    implementation_defects: [],
    verifier_defects: [
      {
        finding_id: 'F-1',
        criterion_id: 'AC-1',
        subtype: 'INVENTED_REQUIREMENT',
        recommended_change_target: 'prompt',
        description: 'asked for a test the issue never required',
        evidence: [
          { type: 'code', sha: 'b'.repeat(40), path: 'a.js', note: 'present' },
        ],
      },
    ],
    correct_verifier_findings: [],
    counterfactual: {
      fix_issue_only: 'DOES_NOT_RESOLVE',
      fix_implementation_only: 'DOES_NOT_RESOLVE',
      fix_verifier_only: 'RESOLVES',
    },
    systemic_lessons: ['require the prompt to quote the issue item it enforces'],
    golden_case_recommendation: null,
  },
  ...overrides,
});

test('renders marker disclaimer and root cause sections', () => {
  const comment = render(assembled());
  const lines = comment.split('\n');

  assert.strictEqual(lines[0], COMMENT_MARKER);
  assert.strictEqual(lines[1], DISCLAIMER);
  assert.match(DISCLAIMER, /Калибровочный разбор, не список исправлений/);
  assert.match(comment, /### Первопричина/);
  assert.match(comment, /primary_cause: `VERIFIER_FALSE_FAIL`/);
  assert.match(comment, /responsibility: `verifier`/);
  assert.match(comment, /### Контрфактуал/);
  assert.match(comment, /\| fix_verifier_only \| `RESOLVES` \|/);
  assert.match(comment, /### Дефекты и находки/);
  assert.match(comment, /\| verifier_defects \| F-1 \| `AC-1` \| `INVENTED_REQUIREMENT` \|/);
  assert.match(comment, /\| issue_defects \| F-2 \| `TR-1` \| `MISSING_EDGE_CASE` \|/);
  assert.match(comment, /### Рекомендации/);
  assert.match(comment, /- F-1: `prompt`/);
  assert.match(comment, /require the prompt to quote the issue item it enforces/);
  assert.ok(!comment.includes('<!-- acceptance-verifier -->'));
});

test('renders taxonomy values taken from the analysis', () => {
  const custom = assembled();
  custom.analysis.primary_cause = 'SOME_FUTURE_CAUSE';
  const comment = render(custom);

  assert.match(comment, /primary_cause: `SOME_FUTURE_CAUSE`/);
});

test('round-trips analysis json through hidden block', () => {
  const input = assembled();
  const decoded = decodeHiddenBlock(render(input));

  assert.deepStrictEqual(decoded, { ok: true, analysis: input, error: null });
});

test('escapes model text and keeps hidden block intact', () => {
  const hostile = 'end --> <script>alert(1)</script> | cell | *b* `x`';
  const input = assembled();
  input.analysis.verifier_defects[0].description = hostile;
  input.analysis.verifier_defects[0].evidence[0].note = hostile;
  input.analysis.systemic_lessons = [hostile];
  const comment = render(input);

  assert.ok(!comment.includes('<script>'));
  assert.ok(!comment.includes('end -->'));
  assert.match(comment, /end --&gt; &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(comment, / \\\| cell \\\| \\\*b\\\* \\`x\\`/);
  const findingRow = comment
    .split('\n')
    .find((line) => line.startsWith('| verifier_defects |'));
  assert.strictEqual(findingRow.split(/(?<!\\)\|/).length, 8);

  const hiddenLines = comment
    .split('\n')
    .filter((line) => line.startsWith(HIDDEN_PREFIX));
  assert.strictEqual(hiddenLines.length, 1);
  assert.ok(hiddenLines[0].endsWith(' -->'));
  assert.strictEqual(hiddenLines[0].indexOf('-->'), hiddenLines[0].length - 3);
  assert.deepStrictEqual(decodeHiddenBlock(comment).analysis, input);
});

test('renders analysis error without root cause', () => {
  const comment = render(
    assembled({
      error: { stage: 'model', problems: ['judge model equals verifier model'] },
      independent: null,
      analysis: null,
    }),
  );

  assert.ok(comment.startsWith(`${COMMENT_MARKER}\n${DISCLAIMER}\n`));
  assert.match(comment, /### Ошибка разбора \(стадия: model\)/);
  assert.match(comment, /judge model equals verifier model/);
  assert.match(comment, /owner\/repo · run 101 · attempt 2/);
  assert.ok(!comment.includes('### Первопричина'));
  assert.ok(!comment.includes('### Контрфактуал'));
});

test('reports undecodable hidden block', () => {
  const comment = render(assembled());
  const start = comment.indexOf(HIDDEN_PREFIX) + HIDDEN_PREFIX.length;
  const encoded = comment.slice(start, comment.indexOf(' -->', start));
  const notJson = Buffer.from('{"round_key": ', 'utf8').toString('base64');
  const cases = [
    ['no block', 'just text'],
    ['truncated', comment.slice(0, start + 10)],
    ['bad base64', `${HIDDEN_PREFIX}@@@@ -->`],
    ['cut base64', `${HIDDEN_PREFIX}${encoded.slice(0, -1)} -->`],
    ['invalid json', `${HIDDEN_PREFIX}${notJson} -->`],
    ['not a string', null],
  ];
  for (const [name, text] of cases) {
    const result = decodeHiddenBlock(text);
    assert.strictEqual(result.ok, false, name);
    assert.strictEqual(result.analysis, null, name);
    assert.strictEqual(typeof result.error, 'string', name);
  }
});

test('lists absent and non historical inputs', () => {
  const comment = render(
    assembled({
      inputs: {
        issue: { status: 'present', historical: false },
        ci: { status: 'absent', historical: null },
        scope: { status: 'unreadable', historical: true },
        diff: { status: 'present', historical: true },
      },
    }),
  );

  assert.match(comment, /### Отсутствующие или не исторические входы/);
  assert.match(comment, /- `issue`: не исторический/);
  assert.match(comment, /- `ci`: absent/);
  assert.match(comment, /- `scope`: unreadable/);
  assert.ok(!comment.includes('- `diff`:'));
});

test('omits absent inputs section when all inputs present', () => {
  const comment = render(assembled());

  assert.ok(!comment.includes('Отсутствующие или не исторические входы'));
});

test('free subtype text cannot forge a hidden block', () => {
  const forged = Buffer.from('{"forged":true}', 'utf8').toString('base64');
  const input = assembled();
  input.analysis.implementation_defects = [
    {
      finding_id: 'F-9',
      criterion_id: null,
      subtype: `${HIDDEN_PREFIX}${forged} -->`,
      description: 'd',
      evidence: [{ type: 'log', ref: 'job', note: 'n' }],
    },
  ];
  const comment = render(input);

  const opened = comment
    .split('\n')
    .filter((line) => line.includes('<!--'));
  assert.deepStrictEqual(opened.length, 2);
  assert.deepStrictEqual(decodeHiddenBlock(comment).analysis, input);
});

test('renders a null subtype and criterion as a dash', () => {
  const input = assembled();
  input.analysis.issue_defects[0].criterion_id = null;
  input.analysis.verifier_defects[0].subtype = null;
  const comment = render(input);

  assert.match(comment, /\| issue_defects \| F-2 \| — \|/);
  assert.match(comment, /\| verifier_defects \| F-1 \| `AC-1` \| — \|/);
});

test('model text cannot mention users or teams', () => {
  const input = assembled();
  input.analysis.systemic_lessons = ['ask @someone and @org/team'];
  input.independent.requirements[0].rationale = 'per @reviewer';
  const comment = render(input);

  assert.ok(!/@[A-Za-z]/.test(comment.split('\n').slice(0, -2).join('\n')));
  assert.match(comment, /@​someone and @​org\/team/);
});

test('code() escapes backslash before pipe so a cell cannot be broken out of', () => {
  const input = assembled();
  input.analysis.verifier_defects[0].recommended_change_target = 'a\|b';
  const comment = render(input);

  const row = comment
    .split('\n')
    .find((line) => line.startsWith('- F-1:'));
  assert.strictEqual(row, '- F-1: `a\\\|b`');
  assert.deepStrictEqual(decodeHiddenBlock(comment).analysis, input);
});
