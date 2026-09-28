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
  checkBehaviorRefs,
  countIssueItems,
  checkCoverage,
  checkIds,
  checkIssueCoverage,
  parseCiFailures,
  readSpecResult,
  readScopeResult,
  readRequiredChecks,
  computeAbsenceItems,
  computeCiItems,
} = require('./acceptance-verdict');

const SCRIPT = path.join(__dirname, 'acceptance-verdict.js');

const ref = (overrides = {}) => ({
  path: 'apps/api/x.ts',
  line: 1,
  quote: 'export const x',
  kind: 'impl',
  ...overrides,
});

const criterion = (status, text = 'AC one', overrides = {}) => ({
  id: '',
  text,
  status,
  summary: 'checked',
  refs: [ref()],
  ...overrides,
});

const report = (overrides = {}) =>
  JSON.stringify({
    criteria: [criterion('PASS')],
    invariants: [],
    test_tampering: [],
    risk_zones: ['none'],
    out_of_scope_files: [],
    ...overrides,
  });

const evaluateChecked = (raw, options = {}) =>
  evaluate(raw, {
    refsProblems: [],
    ciFailures: [],
    scope: { out_of_scope: [] },
    ...options,
  });

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

const SCOPE_V2_SPEC = { format: 'v2', problems: [] };

test('computed out of scope path fails v2 verdict', () => {
  const raw = report({ out_of_scope_files: [] });
  const scope = { out_of_scope: ['docs/unrelated.md'] };
  const result = evaluateChecked(raw, { spec: SCOPE_V2_SPEC, scope });
  assert.strictEqual(result.passed, false);
  assert.ok(
    result.failures.includes(
      'out of scope file (computed): docs/unrelated.md',
    ),
  );
});

test('model scope hints render without failing verdict', () => {
  const raw = report({ out_of_scope_files: ['docs/model-guess.md'] });
  const scope = { out_of_scope: [] };
  const result = evaluateChecked(raw, { spec: SCOPE_V2_SPEC, scope });
  assert.strictEqual(result.passed, true);
  const comment = renderComment(result, { problem: null });
  assert.ok(comment.includes('**Model scope hints**\n- docs/model-guess.md'));
  assert.ok(!comment.includes('**Out of scope files**'));
});

test('legacy out_of_scope_files still fails verdict', () => {
  const raw = report({ out_of_scope_files: ['docs/x.md'] });
  const spec = { format: 'legacy', problems: [] };
  const result = evaluateChecked(raw, { spec });
  assert.strictEqual(result.passed, false);
  assert.ok(result.failures.includes('out of scope file: docs/x.md'));
});

test('missing scope file fails v2 verdict as not checked', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-'));
  const scopeResult = readScopeResult(path.join(dir, 'absent.json'));
  assert.strictEqual(scopeResult, null);
  const result = evaluateChecked(report(), { spec: SCOPE_V2_SPEC, scope: scopeResult });
  assert.strictEqual(result.passed, false);
  assert.ok(result.failures.includes('scope was not checked'));
  fs.rmSync(dir, { recursive: true });
});

test('malformed scope file fails v2 verdict as not checked', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-'));
  const file = path.join(dir, 'scope.json');
  fs.writeFileSync(file, '{oops');
  const scopeResult = readScopeResult(file);
  assert.strictEqual(scopeResult, null);
  const result = evaluateChecked(report(), { spec: SCOPE_V2_SPEC, scope: scopeResult });
  assert.strictEqual(result.passed, false);
  assert.ok(result.failures.includes('scope was not checked'));
  fs.rmSync(dir, { recursive: true });
});

test('in scope path does not fail verdict', () => {
  const raw = report({ out_of_scope_files: [] });
  const scope = { out_of_scope: [] };
  const result = evaluateChecked(raw, { spec: SCOPE_V2_SPEC, scope });
  assert.strictEqual(result.passed, true);
});

test('legacy issue skips scope-file check', () => {
  const spec = { format: 'legacy', problems: [] };
  const result = evaluateChecked(report(), { spec, scope: undefined });
  assert.strictEqual(result.passed, true);
  assert.ok(!result.failures.includes('scope was not checked'));
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
      spec: null,
      absence: null,
      absenceOut: null,
      approval: null,
      scope: null,
      requiredChecks: null,
      manualVerifiedIgnoredBy: undefined,
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

test('parseArgs reads --manual-verified-ignored and --manual-verified-ignored-unknown', () => {
  const named = parseArgs([
    'v.json',
    '--out',
    'c.md',
    '--manual-verified-ignored',
    'someone-else',
  ]);
  assert.strictEqual(named.manualVerifiedIgnoredBy, 'someone-else');
  const unknown = parseArgs([
    'v.json',
    '--out',
    'c.md',
    '--manual-verified-ignored-unknown',
  ]);
  assert.strictEqual(unknown.manualVerifiedIgnoredBy, null);
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

test('CLI end to end: --manual-verified-ignored-unknown renders the unknown actor', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-'));
  const file = path.join(dir, 'verdict.json');
  fs.writeFileSync(file, report());
  const out = path.join(dir, 'comment.md');
  const run = spawnSync(
    process.execPath,
    [SCRIPT, file, '--out', out, '--manual-verified-ignored-unknown'],
    { encoding: 'utf8' },
  );
  assert.strictEqual(run.status, 0);
  assert.ok(
    fs.readFileSync(out, 'utf8').includes('manual-verified ignored: set by unknown'),
  );
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
    'ci check failed: Analyze (javascript-typescript) (failure)',
  ]);
  assert.ok(
    renderComment(result, {}).includes('Analyze (javascript-typescript)'),
  );
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

test('fails with required checks were not checked when file is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'required-checks-'));
  const file = path.join(dir, 'verdict.json');
  const ci = path.join(dir, 'ci.json');
  const commentFile = path.join(dir, 'c.md');
  fs.writeFileSync(file, report());
  fs.writeFileSync(ci, ciJson());
  const run = spawnSync(
    process.execPath,
    [
      SCRIPT,
      file,
      '--out',
      commentFile,
      '--ci',
      ci,
      '--required-checks',
      path.join(dir, 'absent.json'),
    ],
    { encoding: 'utf8' },
  );
  assert.strictEqual(run.stdout.trim(), 'FAIL');
  const comment = fs.readFileSync(commentFile, 'utf8');
  assert.ok(comment.includes('required checks were not checked'));
  fs.rmSync(dir, { recursive: true });
});

test('fails with required checks were not checked when file content is not a string array', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'required-checks-'));
  const file = path.join(dir, 'verdict.json');
  const ci = path.join(dir, 'ci.json');
  const commentFile = path.join(dir, 'c.md');
  const requiredChecksFile = path.join(dir, 'required-checks.json');
  fs.writeFileSync(file, report());
  fs.writeFileSync(ci, ciJson());
  fs.writeFileSync(requiredChecksFile, JSON.stringify({ not: 'an array' }));
  const run = spawnSync(
    process.execPath,
    [
      SCRIPT,
      file,
      '--out',
      commentFile,
      '--ci',
      ci,
      '--required-checks',
      requiredChecksFile,
    ],
    { encoding: 'utf8' },
  );
  assert.strictEqual(run.stdout.trim(), 'FAIL');
  const comment = fs.readFileSync(commentFile, 'utf8');
  assert.ok(comment.includes('required checks were not checked'));
  fs.rmSync(dir, { recursive: true });
});

test('required-checks.json matches the 12 names from INV-3 and excludes codecov/patch', () => {
  const file = path.join(
    __dirname,
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
  ]);
  assert.ok(!requiredChecks.includes('codecov/patch'));
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

test('an invalid v2 spec fails closed without reading the model report', () => {
  const spec = { format: 'v2', problems: ['AC-1: invalid item syntax'] };
  // Malformed raw: if evaluate read it, it would add an 'invalid JSON'
  // failure alongside the spec one, which this test rules out.
  const result = evaluate('{oops', { spec });
  assert.strictEqual(result.passed, false);
  assert.strictEqual(result.report, null);
  assert.deepStrictEqual(result.failures, [
    'spec invalid: AC-1: invalid item syntax',
  ]);
});

test('a valid v2 spec does not change the verdict compared to omitting --spec', () => {
  const spec = { format: 'v2', problems: [] };
  const withSpec = evaluateChecked(report(), { spec });
  const withoutSpec = evaluateChecked(report());
  assert.strictEqual(withSpec.passed, true);
  assert.deepStrictEqual(withSpec.failures, withoutSpec.failures);
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

test('a missing spec file fails closed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-'));
  const specResult = readSpecResult(path.join(dir, 'absent.json'));
  assert.strictEqual(specResult, null);
  const result = evaluateChecked(report(), { spec: specResult });
  assert.strictEqual(result.passed, false);
  assert.deepStrictEqual(result.failures, ['spec was not checked']);
  fs.rmSync(dir, { recursive: true });
});

test('an unparsable spec file fails closed the same way as a missing one', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-'));
  const file = path.join(dir, 'spec-lint.json');
  fs.writeFileSync(file, '{oops');
  const specResult = readSpecResult(file);
  assert.strictEqual(specResult, null);
  const result = evaluateChecked(report(), { spec: specResult });
  assert.strictEqual(result.passed, false);
  assert.deepStrictEqual(result.failures, ['spec was not checked']);
  fs.rmSync(dir, { recursive: true });
});

test('CLI --spec flag fails closed on an invalid v2 spec even without a verdict file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-'));
  const spec = path.join(dir, 'spec-lint.json');
  fs.writeFileSync(
    spec,
    JSON.stringify({ format: 'v2', problems: ['custom marker text'] }),
  );
  const out = path.join(dir, 'comment.md');
  const run = spawnSync(
    process.execPath,
    [SCRIPT, path.join(dir, 'verdict.json'), '--out', out, '--spec', spec],
    { encoding: 'utf8' },
  );
  assert.strictEqual(run.status, 0);
  assert.strictEqual(run.stdout.trim(), 'FAIL');
  const comment = fs.readFileSync(out, 'utf8');
  assert.ok(comment.includes('spec invalid: custom marker text'));
  fs.rmSync(dir, { recursive: true });
});

test('an unreadable spec is folded in alongside real report diagnostics, not instead of them', () => {
  const result = evaluate(null, { spec: null, refsProblems: [], ciFailures: [] });
  assert.strictEqual(result.passed, false);
  assert.deepStrictEqual(result.failures, ['spec was not checked', 'no report']);
});

test('CLI --spec flag with a legacy spec keeps the existing PASS comment', () => {
  const root = makeCheckout({ 'apps/api/x.ts': 'export const x = 1;\n' });
  const file = path.join(root, 'verdict.json');
  fs.writeFileSync(file, report());
  const problems = path.join(root, 'refs-problems.json');
  fs.writeFileSync(problems, '[]');
  const ci = path.join(root, 'ci.json');
  fs.writeFileSync(ci, ciJson());
  const spec = path.join(root, 'spec-lint.json');
  fs.writeFileSync(spec, JSON.stringify({ format: 'legacy', problems: [] }));
  const runVerdictCli = (out, extra = []) =>
    spawnSync(
      process.execPath,
      [
        SCRIPT,
        file,
        '--out',
        out,
        '--refs-problems',
        problems,
        '--ci',
        ci,
        ...extra,
      ],
      { encoding: 'utf8' },
    );
  const outWithSpec = path.join(root, 'c-with-spec.md');
  const outWithoutSpec = path.join(root, 'c-without-spec.md');
  const withSpec = runVerdictCli(outWithSpec, ['--spec', spec]);
  const withoutSpec = runVerdictCli(outWithoutSpec);
  assert.strictEqual(withSpec.stdout.trim(), 'PASS');
  assert.strictEqual(withoutSpec.stdout.trim(), 'PASS');
  const commentWithSpec = fs.readFileSync(outWithSpec, 'utf8');
  const commentWithoutSpec = fs.readFileSync(outWithoutSpec, 'utf8');
  assert.ok(commentWithSpec.includes('Issue format: legacy'));
  assert.strictEqual(
    commentWithSpec.replace('Issue format: legacy\n', ''),
    commentWithoutSpec,
  );
  fs.rmSync(root, { recursive: true });
});

const specItem = (id, type, text) => ({
  id,
  section: 'section',
  type,
  text,
  verify: type === null ? null : 'verify',
});

const absenceItem = (id, literal, filePath, text = 'absence check') => ({
  ...specItem(id, 'absence', text),
  verify: `absent "${literal}" in ${filePath}`,
});

const ciItem = (id, checkName, text = 'ci check') => ({
  ...specItem(id, 'ci', text),
  verify: `ci "${checkName}"`,
});

const V2_SPEC = {
  format: 'v2',
  problems: [],
  items: [
    specItem('INV-1', null, 'first invariant'),
    specItem('INV-2', null, 'second invariant'),
    specItem('AC-1', 'behavior', 'first behavior'),
    specItem('TR-1', 'behavior', 'test behavior'),
    specItem('DOD-1', 'doc', 'checks are green'),
  ],
};

const invariant = (id, status, overrides = {}) => ({
  id,
  status,
  summary: 'checked',
  refs: status === 'N/A' ? [] : [ref()],
  ...overrides,
});

const v2Report = ({
  ids = ['AC-1', 'TR-1', 'DOD-1'],
  invariants = [invariant('INV-1', 'PASS'), invariant('INV-2', 'N/A')],
} = {}) =>
  report({
    criteria: ids.map((id) => criterion('PASS', `model text ${id}`, { id })),
    invariants,
  });

const evaluateV2 = (raw) => {
  const refsProblems = checkIds(JSON.parse(raw), V2_SPEC.items);
  return evaluateChecked(raw, { spec: V2_SPEC, refsProblems });
};

const hasFailureWith = (result, text) =>
  result.failures.some((failure) => failure.includes(text));

test('v2 report whose criteria ids equal the issue ids has no id problems', () => {
  const raw = v2Report({ ids: ['DOD-1', 'AC-1', 'TR-1'] });
  assert.deepStrictEqual(checkIds(JSON.parse(raw), V2_SPEC.items), []);
  assert.strictEqual(evaluateV2(raw).passed, true);
});

test('v2 report missing an issue id fails naming the id', () => {
  const result = evaluateV2(v2Report({ ids: ['AC-1', 'TR-1'] }));
  assert.strictEqual(result.passed, false);
  assert.ok(
    hasFailureWith(result, 'issue criterion id missing from report: "DOD-1"'),
  );
});

test('v2 report with an id absent from the issue fails naming the id', () => {
  const result = evaluateV2(
    v2Report({ ids: ['AC-1', 'TR-1', 'DOD-1', 'AC-7'] }),
  );
  assert.strictEqual(result.passed, false);
  assert.ok(hasFailureWith(result, 'criterion id not in issue: "AC-7"'));
});

test('v2 report with a duplicate id fails naming the id', () => {
  const result = evaluateV2(
    v2Report({ ids: ['AC-1', 'TR-1', 'DOD-1', 'TR-1'] }),
  );
  assert.strictEqual(result.passed, false);
  assert.ok(
    hasFailureWith(result, 'duplicate criterion id in report: "TR-1"'),
  );
});

test('v2 invariants with PASS and N/A statuses do not fail', () => {
  const raw = v2Report();
  const parsed = JSON.parse(raw);
  assert.deepStrictEqual(parsed.invariants[1].refs, []);
  assert.deepStrictEqual(checkIds(parsed, V2_SPEC.items), []);
  const result = evaluateV2(raw);
  assert.strictEqual(result.passed, true);
  assert.deepStrictEqual(result.failures, []);
});

test('v2 report missing an issue invariant fails naming it', () => {
  const raw = v2Report({ invariants: [invariant('INV-2', 'N/A')] });
  const result = evaluateV2(raw);
  assert.strictEqual(result.passed, false);
  assert.ok(
    hasFailureWith(result, 'issue invariant id missing from report: "INV-1"'),
  );
});

test('v2 invariant with FAIL status fails naming it', () => {
  const raw = v2Report({
    invariants: [invariant('INV-1', 'FAIL'), invariant('INV-2', 'N/A')],
  });
  const result = evaluateV2(raw);
  assert.strictEqual(result.passed, false);
  assert.ok(result.failures.includes('invariant failed: INV-1'));
});

test('v2 invariant PASS without valid references fails', () => {
  const root = makeCheckout({ 'apps/api/x.ts': 'export const x = 1;\n' });
  const badQuote = JSON.parse(
    v2Report({
      invariants: [
        invariant('INV-1', 'PASS', { refs: [ref({ quote: 'not there' })] }),
        invariant('INV-2', 'N/A'),
      ],
    }),
  );
  const problems = checkRefs(badQuote, root);
  assert.strictEqual(problems.length, 1);
  assert.ok(problems[0].startsWith('INV-1: apps/api/x.ts:1'));
  const withBadQuote = evaluateChecked(JSON.stringify(badQuote), {
    spec: V2_SPEC,
    refsProblems: problems,
  });
  assert.strictEqual(withBadQuote.passed, false);

  const noRefs = v2Report({
    invariants: [
      invariant('INV-1', 'PASS', { refs: [] }),
      invariant('INV-2', 'N/A'),
    ],
  });
  const noRefsProblems = checkRefs(JSON.parse(noRefs), root);
  assert.deepStrictEqual(noRefsProblems, ['INV-1: PASS without references']);
  const result = evaluateChecked(noRefs, {
    spec: V2_SPEC,
    refsProblems: noRefsProblems,
  });
  assert.strictEqual(result.passed, false);
  assert.ok(
    result.failures.includes('invariant passed without references: INV-1'),
  );
  fs.rmSync(root, { recursive: true });
});

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

test('legacy report with empty ids uses count coverage, not id matching', () => {
  const legacy = { format: 'legacy', problems: [], items: [] };
  const short = JSON.parse(
    report({ criteria: [criterion('PASS', 'a'), criterion('PASS', 'b')] }),
  );
  const problems = checkIssueCoverage(short, {
    spec: legacy,
    issueMarkdown: ISSUE_MD,
  });
  assert.deepStrictEqual(problems, [
    'report covers 2 of 5 issue items ' +
      '(Acceptance Criteria, Definition of Done, Test Requirement)',
  ]);
  const texts = ['a', 'b', 'c', 'd', 'e'];
  const full = JSON.parse(
    report({ criteria: texts.map((text) => criterion('PASS', text)) }),
  );
  assert.deepStrictEqual(
    checkIssueCoverage(full, { spec: legacy, issueMarkdown: ISSUE_MD }),
    [],
  );
});

test('v2 spec uses id matching instead of count coverage', () => {
  const ids = ['AC-1', 'TR-1', 'X-1', 'X-2', 'X-3', 'X-4'];
  const parsed = JSON.parse(v2Report({ ids }));
  assert.deepStrictEqual(checkCoverage(parsed, ISSUE_MD), []);
  const problems = checkIssueCoverage(parsed, {
    spec: V2_SPEC,
    issueMarkdown: ISSUE_MD,
  });
  assert.ok(
    problems.includes('issue criterion id missing from report: "DOD-1"'),
  );
  assert.ok(!problems.some((problem) => problem.startsWith('report covers')));
  const result = evaluateChecked(JSON.stringify(parsed), {
    spec: V2_SPEC,
    refsProblems: problems,
  });
  assert.strictEqual(result.passed, false);
});

test('invariant status outside PASS FAIL N/A violates the schema', () => {
  const raw = v2Report({
    invariants: [
      invariant('INV-1', 'UNVERIFIABLE'),
      invariant('INV-2', 'N/A'),
    ],
  });
  const result = evaluateChecked(raw);
  assert.strictEqual(result.passed, false);
  assert.deepStrictEqual(result.failures, ['report violates schema']);
});

test('report without id or invariants violates the schema', () => {
  const withoutInvariants = JSON.parse(report());
  withoutInvariants.invariants = undefined;
  const noInvariants = evaluateChecked(JSON.stringify(withoutInvariants));
  assert.strictEqual(noInvariants.passed, false);
  assert.deepStrictEqual(noInvariants.failures, ['report violates schema']);

  const withoutId = { ...criterion('PASS'), id: undefined };
  const noId = evaluateChecked(report({ criteria: [withoutId] }));
  assert.strictEqual(noId.passed, false);
  assert.deepStrictEqual(noId.failures, ['report violates schema']);
});

const runCheckRefsCli = (root, specFile) => {
  const file = path.join(root, 'verdict.json');
  const problems = path.join(root, 'refs-problems.json');
  const run = spawnSync(
    process.execPath,
    [SCRIPT, '--check-refs', file, '--root', root, '--out', problems,
      '--spec', specFile],
    { encoding: 'utf8' },
  );
  assert.strictEqual(run.status, 0);
  return JSON.parse(fs.readFileSync(problems, 'utf8'));
};

test('CLI check-refs reports id problems from --spec', () => {
  const bothKinds = [ref({ kind: 'impl' }), ref({ kind: 'test' })];
  const verdict = report({
    criteria: [
      criterion('PASS', 'AC-1', { id: 'AC-1', refs: bothKinds }),
      criterion('PASS', 'TR-1', { id: 'TR-1', refs: bothKinds }),
    ],
    invariants: [invariant('INV-1', 'PASS'), invariant('INV-2', 'N/A')],
  });
  const root = makeCheckout({
    'apps/api/x.ts': 'export const x = 1;\n',
    'verdict.json': verdict,
    'spec-lint.json': JSON.stringify(V2_SPEC),
  });
  const written = runCheckRefsCli(root, path.join(root, 'spec-lint.json'));
  assert.deepStrictEqual(written, [
    'issue criterion id missing from report: "DOD-1"',
  ]);
  fs.rmSync(root, { recursive: true });
});

test('CLI check-refs fails closed when --spec is unreadable', () => {
  const root = makeCheckout({
    'apps/api/x.ts': 'export const x = 1;\n',
    'verdict.json': v2Report(),
    'broken.json': '{oops',
  });
  for (const name of ['absent.json', 'broken.json']) {
    const written = runCheckRefsCli(root, path.join(root, name));
    assert.ok(written.some((item) => item.startsWith('spec was not checked')));
  }
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

test('a reference with a missing or invalid kind is rejected', () => {
  const missingKind = criterion('PASS', 'AC', {
    refs: [{ path: 'apps/api/x.ts', line: 1, quote: 'export const x' }],
  });
  assert.strictEqual(
    evaluateChecked(report({ criteria: [missingKind] })).passed,
    false,
  );
  const invalidKind = criterion('PASS', 'AC', {
    refs: [ref({ kind: 'bogus' })],
  });
  assert.strictEqual(
    evaluateChecked(report({ criteria: [invalidKind] })).passed,
    false,
  );
});

test('absence item passes when the literal is not in the file', () => {
  const root = makeCheckout({ 'apps/api/x.ts': 'export const x = 1;\n' });
  const items = [absenceItem('AC-1', 'TODO', 'apps/api/x.ts')];
  assert.deepStrictEqual(computeAbsenceItems(items, root), [
    {
      id: 'AC-1',
      text: '',
      status: 'PASS',
      summary: 'AC-1: literal "TODO" not found in apps/api/x.ts',
      refs: [],
      computed: true,
    },
  ]);
  fs.rmSync(root, { recursive: true });
});

test('absence item fails when the literal is in the file, naming id, path and literal', () => {
  const root = makeCheckout({ 'apps/api/x.ts': 'export const TODO = 1;\n' });
  const items = [absenceItem('AC-1', 'TODO', 'apps/api/x.ts')];
  const [entry] = computeAbsenceItems(items, root);
  assert.strictEqual(entry.status, 'FAIL');
  assert.ok(entry.summary.includes('AC-1'));
  assert.ok(entry.summary.includes('apps/api/x.ts'));
  assert.ok(entry.summary.includes('TODO'));
  fs.rmSync(root, { recursive: true });
});

test('absence item fails on a path outside the checkout, under .git, a symlink, or an oversized file', (t) => {
  const root = makeCheckout({ '.git/config': 'x', 'a.ts': 'x' });

  const outside = absenceItem('AC-1', 'x', '../outside.ts');
  assert.strictEqual(computeAbsenceItems([outside], root)[0].status, 'FAIL');

  const dotGit = absenceItem('AC-2', 'x', '.git/config');
  assert.strictEqual(computeAbsenceItems([dotGit], root)[0].status, 'FAIL');

  let symlinkCreated = true;
  try {
    fs.symlinkSync(path.join(root, 'a.ts'), path.join(root, 'link.ts'));
  } catch {
    symlinkCreated = false;
    t.skip('symlinks are not available here');
  }
  if (symlinkCreated) {
    const link = absenceItem('AC-3', 'x', 'link.ts');
    assert.strictEqual(computeAbsenceItems([link], root)[0].status, 'FAIL');
  }

  fs.writeFileSync(path.join(root, 'big.ts'), 'a'.repeat(2 * 1024 * 1024 + 1));
  const oversized = absenceItem('AC-4', 'x', 'big.ts');
  assert.strictEqual(computeAbsenceItems([oversized], root)[0].status, 'FAIL');

  fs.rmSync(root, { recursive: true });
});

test('absence item treats a regex-like literal as a plain substring', () => {
  const root = makeCheckout({ 'apps/api/x.ts': 'axb\n' });
  const items = [absenceItem('AC-1', 'a.b*', 'apps/api/x.ts')];
  assert.strictEqual(computeAbsenceItems(items, root)[0].status, 'PASS');
  fs.rmSync(root, { recursive: true });
});

test('ci item passes on a matching successful check-run', () => {
  const items = [ciItem('DOD-1', 'Test (scripts)')];
  const raw = ciJson({
    checks: [
      codeqlSuccess,
      { name: 'Test (scripts)', status: 'completed', conclusion: 'success' },
    ],
  });
  const [entry] = computeCiItems(items, raw);
  assert.strictEqual(entry.status, 'PASS');
});

test('ci item fails when the check-run is missing, in progress, or failed', () => {
  const items = [ciItem('DOD-1', 'Test (scripts)')];
  const missing = ciJson({ checks: [codeqlSuccess] });
  assert.strictEqual(computeCiItems(items, missing)[0].status, 'FAIL');

  const inProgress = ciJson({
    checks: [
      codeqlSuccess,
      { name: 'Test (scripts)', status: 'in_progress', conclusion: null },
    ],
  });
  assert.strictEqual(computeCiItems(items, inProgress)[0].status, 'FAIL');

  const failed = ciJson({
    checks: [
      codeqlSuccess,
      { name: 'Test (scripts)', status: 'completed', conclusion: 'failure' },
    ],
  });
  assert.strictEqual(computeCiItems(items, failed)[0].status, 'FAIL');
});

const CI_ABSENCE_SPEC_ITEMS = [
  specItem('AC-1', 'behavior', 'first behavior'),
  ciItem('DOD-1', 'Test (scripts)', 'checks are green'),
  absenceItem('DOD-2', 'TODO', 'apps/api/x.ts', 'no TODO left'),
];

test('a model report without ci/absence entries does not fail on missing id', () => {
  const raw = report({
    criteria: [criterion('PASS', 'model text AC-1', { id: 'AC-1' })],
  });
  const problems = checkIds(JSON.parse(raw), CI_ABSENCE_SPEC_ITEMS);
  assert.deepStrictEqual(problems, []);
});

test('an extra model entry for a ci/absence id is ignored', () => {
  const raw = report({
    criteria: [
      criterion('PASS', 'model text AC-1', { id: 'AC-1' }),
      criterion('FAIL', 'model text DOD-1', { id: 'DOD-1' }),
    ],
  });
  const idProblems = checkIds(JSON.parse(raw), CI_ABSENCE_SPEC_ITEMS);
  assert.deepStrictEqual(idProblems, []);

  const root = makeCheckout({ 'apps/api/x.ts': 'export const x = 1;\n' });
  const refsProblems = checkRefs(JSON.parse(raw), root, CI_ABSENCE_SPEC_ITEMS);
  assert.deepStrictEqual(refsProblems, []);
  fs.rmSync(root, { recursive: true });

  const spec = { format: 'v2', problems: [], items: CI_ABSENCE_SPEC_ITEMS };
  const computedItems = [
    {
      id: 'DOD-1',
      text: '',
      status: 'PASS',
      summary: 'computed',
      refs: [],
      computed: true,
    },
  ];
  const result = evaluateChecked(raw, {
    spec,
    computedItems,
    refsProblems: idProblems,
  });
  assert.strictEqual(result.passed, true);
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

test('legacy issue ci/absence items are not computed deterministically', () => {
  const root = makeCheckout({ 'apps/api/x.ts': 'TODO\n' });
  assert.deepStrictEqual(computeAbsenceItems(null, root), []);
  assert.deepStrictEqual(computeCiItems(null, ciJson()), []);
  fs.rmSync(root, { recursive: true });
});

test('CLI end to end: --absence-out then --absence feed a computed PASS into the verdict', () => {
  const spec = {
    format: 'v2',
    problems: [],
    items: [
      specItem('AC-1', 'behavior', 'first behavior'),
      absenceItem('DOD-1', 'TODO', 'apps/api/x.ts', 'no TODO left'),
    ],
  };
  const root = makeCheckout({ 'apps/api/x.ts': 'export const x = 1;\n' });
  const verdictFile = path.join(root, 'verdict.json');
  fs.writeFileSync(
    verdictFile,
    report({
      criteria: [
        criterion('PASS', 'model text', {
          id: 'AC-1',
          refs: [ref({ kind: 'impl' }), ref({ kind: 'test' })],
        }),
      ],
    }),
  );
  const specFile = path.join(root, 'spec-lint.json');
  fs.writeFileSync(specFile, JSON.stringify(spec));
  const refsProblems = path.join(root, 'refs-problems.json');
  const absenceFile = path.join(root, 'absence.json');
  const checkRefs = spawnSync(
    process.execPath,
    [
      SCRIPT, '--check-refs', verdictFile, '--root', root, '--out',
      refsProblems, '--spec', specFile, '--absence-out', absenceFile,
    ],
    { encoding: 'utf8' },
  );
  assert.strictEqual(checkRefs.status, 0);
  const absenceEntries = JSON.parse(fs.readFileSync(absenceFile, 'utf8'));
  assert.strictEqual(absenceEntries[0].id, 'DOD-1');
  assert.strictEqual(absenceEntries[0].status, 'PASS');

  const ciFile = path.join(root, 'ci.json');
  fs.writeFileSync(ciFile, ciJson());
  const scopeFile = path.join(root, 'scope.json');
  fs.writeFileSync(scopeFile, JSON.stringify({ out_of_scope: [] }));
  const commentFile = path.join(root, 'comment.md');
  const verdict = spawnSync(
    process.execPath,
    [
      SCRIPT, verdictFile, '--out', commentFile, '--refs-problems',
      refsProblems, '--ci', ciFile, '--spec', specFile, '--absence',
      absenceFile, '--scope', scopeFile,
    ],
    { encoding: 'utf8' },
  );
  assert.strictEqual(verdict.stdout.trim(), 'PASS');
  const comment = fs.readFileSync(commentFile, 'utf8');
  assert.ok(comment.includes('| DOD-1 no TODO left | PASS (computed) |'));
  fs.rmSync(root, { recursive: true });
});

const SHA_APPROVED = 'a'.repeat(64);
const SHA_CURRENT = 'b'.repeat(64);
const APPROVAL_V2_SPEC = { format: 'v2', problems: [] };
const APPROVAL_LEGACY_SPEC = { format: 'legacy', problems: [] };

const approvalOf = (approved, current = SHA_CURRENT) => ({
  approved_hash: approved,
  current_hash: current,
});

test('v2 spec without approval fails', () => {
  const approval = approvalOf(null);
  const result = evaluateChecked(report(), { spec: APPROVAL_V2_SPEC, approval });
  assert.strictEqual(result.passed, false);
  assert.ok(result.failures.includes('spec not approved'));
});

test('changed v2 spec after approval fails', () => {
  const approval = approvalOf(SHA_APPROVED);
  const result = evaluateChecked(report(), { spec: APPROVAL_V2_SPEC, approval });
  assert.strictEqual(result.passed, false);
  assert.ok(result.failures.includes('spec changed after approval'));
});

test('changed legacy spec after approval fails', () => {
  const approval = approvalOf(SHA_APPROVED);
  const result = evaluateChecked(report(), { spec: APPROVAL_LEGACY_SPEC, approval });
  assert.strictEqual(result.passed, false);
  assert.ok(result.failures.includes('spec changed after approval'));
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

test('approval failures are kept when the report is missing', () => {
  const approval = approvalOf(SHA_APPROVED);
  const result = evaluateChecked(null, { spec: APPROVAL_V2_SPEC, approval });
  assert.ok(result.failures.includes('spec changed after approval'));
  assert.ok(result.failures.includes('no report'));
});

const runApprovalVerdict = (writeApproval) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-'));
  const verdictFile = path.join(dir, 'verdict.json');
  const problems = path.join(dir, 'refs-problems.json');
  const ci = path.join(dir, 'ci.json');
  const specFile = path.join(dir, 'spec-lint.json');
  const approval = path.join(dir, 'spec-approval.json');
  const out = path.join(dir, 'comment.md');
  fs.writeFileSync(verdictFile, report());
  fs.writeFileSync(problems, '[]');
  fs.writeFileSync(ci, ciJson());
  fs.writeFileSync(specFile, JSON.stringify(APPROVAL_LEGACY_SPEC));
  writeApproval(approval);
  const run = spawnSync(
    process.execPath,
    [
      SCRIPT, verdictFile, '--out', out, '--refs-problems', problems,
      '--ci', ci, '--spec', specFile, '--approval', approval,
    ],
    { encoding: 'utf8' },
  );
  const comment = fs.readFileSync(out, 'utf8');
  fs.rmSync(dir, { recursive: true });
  return { verdict: run.stdout.trim(), comment };
};

test('missing approval file fails closed', () => {
  const { verdict, comment } = runApprovalVerdict(() => {});
  assert.strictEqual(verdict, 'FAIL');
  assert.ok(comment.includes('spec approval was not checked'));
});

test('invalid approval file fails closed', () => {
  const variants = [
    '{not json',
    JSON.stringify({ approved_hash: SHA_CURRENT }),
    JSON.stringify({ current_hash: SHA_CURRENT }),
    JSON.stringify({ approved_hash: 'abc', current_hash: SHA_CURRENT }),
    JSON.stringify([]),
  ];
  for (const content of variants) {
    const { verdict, comment } = runApprovalVerdict((file) =>
      fs.writeFileSync(file, content),
    );
    assert.strictEqual(verdict, 'FAIL', content);
    assert.ok(comment.includes('spec approval was not checked'), content);
  }
});

test('CLI passes with a matching approval file', () => {
  const { verdict } = runApprovalVerdict((file) =>
    fs.writeFileSync(file, JSON.stringify(approvalOf(SHA_CURRENT))),
  );
  assert.strictEqual(verdict, 'PASS');
});

test('parseArgs reads --approval', () => {
  const options = parseArgs(['v.json', '--approval', 'spec-approval.json']);
  assert.strictEqual(options.approval, 'spec-approval.json');
});

test('parseArgs reads --required-checks', () => {
  const options = parseArgs([
    'v.json',
    '--required-checks',
    'required-checks.json',
  ]);
  assert.strictEqual(options.requiredChecks, 'required-checks.json');
});
