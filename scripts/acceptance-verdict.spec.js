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
  checkRefs,
  countIssueItems,
  checkCoverage,
  parseCiFailures,
} = require('./acceptance-verdict');

const SCRIPT = path.join(__dirname, 'acceptance-verdict.js');

const ref = (overrides = {}) => ({
  path: 'apps/api/x.ts',
  line: 1,
  quote: 'export const x',
  ...overrides,
});

const criterion = (status, text = 'AC one', overrides = {}) => ({
  text,
  status,
  summary: 'checked',
  refs: [ref()],
  ...overrides,
});

const report = (overrides = {}) =>
  JSON.stringify({
    criteria: [criterion('PASS')],
    test_tampering: [],
    risk_zones: ['none'],
    out_of_scope_files: [],
    ...overrides,
  });

const evaluateChecked = (raw, options = {}) =>
  evaluate(raw, { refsProblems: [], ciFailures: [], ...options });

const codeqlSuccess = {
  name: 'Analyze (javascript-typescript)',
  status: 'completed',
  conclusion: 'success',
};

const ciJson = ({
  checks = [codeqlSuccess],
  statuses = [],
  conclusion = 'success',
  headSha = '0123456789abcdef',
} = {}) =>
  JSON.stringify({
    head_sha: headSha,
    ci_workflow_conclusion: conclusion,
    checks,
    statuses,
  });

const makeCheckout = (files) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkout-'));
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return dir;
};

test('passes when every criterion passes and nothing is tampered', () => {
  assert.strictEqual(evaluateChecked(report()).passed, true);
});

test('fails when a changed file is out of scope', () => {
  const raw = report({ out_of_scope_files: ['docs/x.md'] });
  const result = evaluateChecked(raw);
  assert.strictEqual(result.passed, false);
  assert.ok(result.failures.includes('out of scope file: docs/x.md'));
});

test('manual-verified does not excuse an out of scope file', () => {
  const raw = report({ out_of_scope_files: ['docs/x.md'] });
  const result = evaluateChecked(raw, { manualVerified: true });
  assert.strictEqual(result.passed, false);
});

test('fails on zero criteria', () => {
  const result = evaluateChecked(report({ criteria: [] }));
  assert.strictEqual(result.passed, false);
});

test('fails on invalid JSON', () => {
  assert.strictEqual(evaluateChecked('{oops').passed, false);
});

test('fails when a report is missing', () => {
  assert.strictEqual(evaluateChecked(null).passed, false);
});

test('fails when the report violates the schema', () => {
  const invalid = report({ criteria: [{ text: 'a', status: 'MAYBE' }] });
  assert.strictEqual(evaluateChecked(invalid).passed, false);
  const missingField = JSON.stringify({ criteria: [criterion('PASS')] });
  assert.strictEqual(evaluateChecked(missingField).passed, false);
});

test('fails on the old evidence-string shape', () => {
  const legacy = report({
    criteria: [{ text: 'a', status: 'PASS', evidence: 'x.ts:1' }],
  });
  assert.strictEqual(evaluateChecked(legacy).passed, false);
});

test('fails when a reference is malformed', () => {
  const badLine = criterion('PASS', 'AC', { refs: [ref({ line: 0 })] });
  assert.strictEqual(
    evaluateChecked(report({ criteria: [badLine] })).passed,
    false,
  );
  const noQuote = criterion('PASS', 'AC', { refs: [ref({ quote: ' ' })] });
  assert.strictEqual(
    evaluateChecked(report({ criteria: [noQuote] })).passed,
    false,
  );
});

test('fails when any criterion fails', () => {
  const raw = report({ criteria: [criterion('PASS'), criterion('FAIL')] });
  assert.strictEqual(evaluateChecked(raw).passed, false);
});

test('PASS without references fails', () => {
  const raw = report({ criteria: [criterion('PASS', 'AC', { refs: [] })] });
  const result = evaluateChecked(raw);
  assert.strictEqual(result.passed, false);
  assert.ok(result.failures[0].includes('without references'));
});

test('UNVERIFIABLE fails unless manual-verified is set', () => {
  const raw = report({ criteria: [criterion('UNVERIFIABLE')] });
  assert.strictEqual(evaluateChecked(raw).passed, false);
  const manual = evaluateChecked(raw, { manualVerified: true });
  assert.strictEqual(manual.passed, true);
});

test('manual-verified does not excuse a FAIL criterion', () => {
  const raw = report({ criteria: [criterion('FAIL')] });
  const result = evaluateChecked(raw, { manualVerified: true });
  assert.strictEqual(result.passed, false);
});

test('non-empty test_tampering fails, even when manual-verified', () => {
  const raw = report({ test_tampering: ['x.spec.ts: assertion removed'] });
  const result = evaluateChecked(raw, { manualVerified: true });
  assert.strictEqual(result.passed, false);
});

test('ignores a verdict field supplied by the model', () => {
  const raw = report({ verdict: 'PASS', criteria: [criterion('FAIL')] });
  assert.strictEqual(evaluateChecked(raw).passed, false);
});

test('risk_zones must be non-empty and come from the closed list', () => {
  assert.strictEqual(evaluateChecked(report({ risk_zones: [] })).passed, false);
  assert.strictEqual(
    evaluateChecked(report({ risk_zones: ['made_up'] })).passed,
    false,
  );
  assert.strictEqual(
    evaluateChecked(report({ risk_zones: ['ci', 'adr_034_manual_note'] }))
      .passed,
    true,
  );
});

test('risk_zones "none" cannot be combined with other zones', () => {
  const raw = report({ risk_zones: ['none', 'ci'] });
  assert.strictEqual(evaluateChecked(raw).passed, false);
});

test('fails when references were not checked', () => {
  const result = evaluate(report());
  assert.strictEqual(result.passed, false);
  assert.ok(result.failures.includes('references were not checked'));
});

test('fails when a reference problem was reported', () => {
  const result = evaluateChecked(report(), {
    refsProblems: ['AC one: apps/api/x.ts:1 - quote not found on that line'],
  });
  assert.strictEqual(result.passed, false);
  assert.ok(result.failures[0].startsWith('bad reference:'));
});

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

test('checkRefs rejects a symlink', (t) => {
  const root = makeCheckout({ 'real.ts': 'export const x' });
  try {
    fs.symlinkSync(path.join(root, 'real.ts'), path.join(root, 'link.ts'));
  } catch {
    t.skip('symlinks are not available here');
    fs.rmSync(root, { recursive: true });
    return;
  }
  const parsed = JSON.parse(
    report({
      criteria: [criterion('PASS', 'AC', { refs: [ref({ path: 'link.ts' })] })],
    }),
  );
  assert.strictEqual(checkRefs(parsed, root).length, 1);
  fs.rmSync(root, { recursive: true });
});

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

test('comment explains why it is not PASS', () => {
  const comment = renderComment(evaluate('{oops'), { problem: 'boom' });
  assert.ok(comment.includes('Acceptance verifier: FAIL'));
  assert.ok(comment.includes('boom'));
});

test('parseArgs reads file, --out, --refs-problems and flags', () => {
  assert.deepStrictEqual(
    parseArgs([
      'v.json',
      '--out',
      'c.md',
      '--refs-problems',
      'r.json',
      '--manual-verified',
    ]),
    {
      file: 'v.json',
      out: 'c.md',
      manualVerified: true,
      checkRefs: false,
      root: null,
      refsProblems: 'r.json',
      ci: null,
      issue: null,
    },
  );
  assert.strictEqual(parseArgs(['v.json', '--ci', 'ci.json']).ci, 'ci.json');
  const check = parseArgs([
    '--check-refs',
    'v.json',
    '--root',
    '.',
    '--out',
    'o',
  ]);
  assert.strictEqual(check.checkRefs, true);
  assert.strictEqual(check.root, '.');
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

test('CLI end to end: check refs, then compute a PASS verdict', () => {
  const root = makeCheckout({ 'apps/api/x.ts': 'export const x = 1;\n' });
  const file = path.join(root, 'verdict.json');
  fs.writeFileSync(file, report());
  const problems = path.join(root, 'refs-problems.json');
  const ci = path.join(root, 'ci.json');
  fs.writeFileSync(ci, ciJson());
  const check = spawnSync(
    process.execPath,
    [SCRIPT, '--check-refs', file, '--root', root, '--out', problems],
    { encoding: 'utf8' },
  );
  assert.strictEqual(check.status, 0);
  assert.strictEqual(fs.readFileSync(problems, 'utf8'), '[]');
  const verdict = spawnSync(
    process.execPath,
    [
      SCRIPT,
      file,
      '--out',
      path.join(root, 'c.md'),
      '--refs-problems',
      problems,
      '--ci',
      ci,
    ],
    { encoding: 'utf8' },
  );
  assert.strictEqual(verdict.stdout.trim(), 'PASS');
  fs.rmSync(root, { recursive: true });
});

test('CLI is FAIL when the refs-problems file is absent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-'));
  const file = path.join(dir, 'verdict.json');
  fs.writeFileSync(file, report());
  const run = spawnSync(
    process.execPath,
    [SCRIPT, file, '--out', path.join(dir, 'c.md')],
    { encoding: 'utf8' },
  );
  assert.strictEqual(run.stdout.trim(), 'FAIL');
  fs.rmSync(dir, { recursive: true });
});

test('CLI exits 2 on missing arguments', () => {
  const run = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.strictEqual(run.status, 2);
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
    'required CodeQL check is not successful (completed/failure)',
    'ci check failed: Analyze (javascript-typescript) (failure)',
  ]);
  assert.ok(renderComment(result, {}).includes('CodeQL'));
});

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

test('success, neutral, skipped and running checks do not fail', () => {
  const checks = [
    { name: 'a', status: 'completed', conclusion: 'success' },
    { name: 'b', status: 'completed', conclusion: 'neutral' },
    { name: 'c', status: 'completed', conclusion: 'skipped' },
    { name: 'd', status: 'in_progress', conclusion: null },
  ];
  const statuses = [{ name: 'e', state: 'pending' }];
  const ci = parseCiFailures(
    ciJson({ checks: [codeqlSuccess, ...checks], statuses }),
  );
  assert.deepStrictEqual(ci, []);
  assert.strictEqual(
    evaluateChecked(report(), { ciFailures: ci }).passed,
    true,
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

test('CLI is FAIL on a failed CI check and PASS when CI is green', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-'));
  const file = path.join(dir, 'verdict.json');
  const problems = path.join(dir, 'refs-problems.json');
  const ci = path.join(dir, 'ci.json');
  fs.writeFileSync(file, report());
  fs.writeFileSync(problems, '[]');
  const run = () =>
    spawnSync(
      process.execPath,
      [
        SCRIPT,
        file,
        '--out',
        path.join(dir, 'c.md'),
        '--refs-problems',
        problems,
        '--ci',
        ci,
      ],
      { encoding: 'utf8' },
    ).stdout.trim();
  assert.strictEqual(run(), 'FAIL');
  fs.writeFileSync(
    ci,
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
  assert.strictEqual(run(), 'FAIL');
  fs.writeFileSync(ci, ciJson());
  assert.strictEqual(run(), 'PASS');
  fs.rmSync(dir, { recursive: true });
});


test('CI workflow conclusion must be success', () => {
  assert.deepStrictEqual(parseCiFailures(ciJson({ conclusion: 'failure' })), [
    'CI workflow did not succeed (failure)',
  ]);
});

test('required CodeQL check must exist and be successful', () => {
  assert.deepStrictEqual(parseCiFailures(ciJson({ checks: [] })), [
    'required CodeQL check count is 0, expected 1',
  ]);
  assert.deepStrictEqual(
    parseCiFailures(
      ciJson({
        checks: [
          {
            name: 'Analyze (javascript-typescript)',
            status: 'in_progress',
            conclusion: null,
          },
        ],
      }),
    ),
    ['required CodeQL check is not successful (in_progress/null)'],
  );
});

test('duplicate required CodeQL checks fail closed', () => {
  assert.deepStrictEqual(
    parseCiFailures(ciJson({ checks: [codeqlSuccess, codeqlSuccess] })),
    ['required CodeQL check count is 2, expected 1'],
  );
});

const ISSUE_MD = [
  '# Title',
  '',
  '## Context',
  '- not counted',
  '',
  '## Acceptance Criteria',
  '- [x] first',
  '- [ ] second',
  '  - nested, not counted',
  '1. third',
  '',
  '## Definition of Done',
  '- [ ] Acceptance Criteria above are met',
  '',
  '## Test Requirement',
  'Unit tests in x.spec.js, CI-check `Test (scripts)`.',
  '',
  '## Manual verification (owner, not gated)',
  '- not counted',
  '',
  '```',
  '## Acceptance Criteria',
  '- fenced, not counted',
  '```',
].join('\n');

test('countIssueItems counts top-level items and prose Test Requirement', () => {
  assert.strictEqual(countIssueItems(ISSUE_MD), 5);
});

test('countIssueItems counts Test Requirement bullets individually', () => {
  const markdown = '## Test Requirement\n- a.spec.js\n- b.spec.js\n';
  assert.strictEqual(countIssueItems(markdown), 2);
});

test('checkCoverage reports a report with fewer entries than issue items', () => {
  const short = JSON.parse(
    report({ criteria: [criterion('PASS', 'a'), criterion('PASS', 'b')] }),
  );
  const problems = checkCoverage(short, ISSUE_MD);
  assert.strictEqual(problems.length, 1);
  assert.ok(problems[0].includes('report covers 2 of 5 issue items'));
});

test('checkCoverage accepts as many or more entries than issue items', () => {
  const texts = ['a', 'b', 'c', 'd', 'e', 'f'];
  const full = JSON.parse(
    report({ criteria: texts.map((text) => criterion('PASS', text)) }),
  );
  assert.deepStrictEqual(checkCoverage(full, ISSUE_MD), []);
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

test('CLI check-refs adds a coverage problem from --issue', () => {
  const root = makeCheckout({ 'apps/api/x.ts': 'export const x = 1;\n' });
  const file = path.join(root, 'verdict.json');
  fs.writeFileSync(file, report());
  const issue = path.join(root, 'issue.md');
  fs.writeFileSync(issue, ISSUE_MD);
  const problems = path.join(root, 'refs-problems.json');
  const run = spawnSync(
    process.execPath,
    [SCRIPT, '--check-refs', file, '--root', root, '--out', problems,
      '--issue', issue],
    { encoding: 'utf8' },
  );
  assert.strictEqual(run.status, 0);
  const written = JSON.parse(fs.readFileSync(problems, 'utf8'));
  assert.strictEqual(written.length, 1);
  assert.ok(written[0].startsWith('report covers 1 of 5'));
  fs.rmSync(root, { recursive: true });
});

test('CLI check-refs fails closed when --issue is unreadable', () => {
  const root = makeCheckout({ 'apps/api/x.ts': 'export const x = 1;\n' });
  const file = path.join(root, 'verdict.json');
  fs.writeFileSync(file, report());
  const problems = path.join(root, 'refs-problems.json');
  spawnSync(
    process.execPath,
    [SCRIPT, '--check-refs', file, '--root', root, '--out', problems,
      '--issue', path.join(root, 'absent.md')],
    { encoding: 'utf8' },
  );
  const written = JSON.parse(fs.readFileSync(problems, 'utf8'));
  assert.ok(written[0].startsWith('issue not readable'));
  fs.rmSync(root, { recursive: true });
});
