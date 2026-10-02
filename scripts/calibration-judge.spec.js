'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { main } = require('./calibration-judge');

const SCRIPT = path.join(__dirname, 'calibration-judge.js');

const tmpFile = (name, data) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'calibration-judge-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
  return file;
};

const run = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

test('schema subcommand resolves taxonomy references via main()', () => {
  const taxonomyFile = tmpFile('taxonomy.json', {
    primary_cause: ['A', 'B'],
    responsibility: ['a'],
    issue_defect_subtype: ['X'],
    verifier_defect_subtype: ['Y'],
    recommended_change_target: ['none'],
    counterfactual_outcome: ['UNKNOWN'],
    verdict: ['PASS', 'FAIL', 'UNDECIDABLE'],
    requirement_status: ['SATISFIED'],
    confidence: ['LOW'],
    check_source: ['model', 'deterministic'],
  });
  const templateFile = tmpFile('template.json', {
    field: { $taxonomy: 'primary_cause' },
  });
  const outFile = path.join(path.dirname(templateFile), 'out.json');

  const exitCode = main([
    'schema',
    templateFile,
    '--taxonomy',
    taxonomyFile,
    '--out',
    outFile,
  ]);

  assert.strictEqual(exitCode, 0);
  const schema = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  assert.deepStrictEqual(schema.field, { type: 'string', enum: ['A', 'B'] });
});

test('schema subcommand fails with a non-zero exit on an unknown taxonomy key', () => {
  const taxonomyFile = tmpFile('taxonomy.json', {
    primary_cause: ['A'],
    responsibility: ['a'],
    issue_defect_subtype: ['X'],
    verifier_defect_subtype: ['Y'],
    recommended_change_target: ['none'],
    counterfactual_outcome: ['UNKNOWN'],
    verdict: ['PASS'],
    requirement_status: ['SATISFIED'],
    confidence: ['LOW'],
    check_source: ['model'],
  });
  const templateFile = tmpFile('template.json', {
    field: { $taxonomy: 'not_a_real_key' },
  });

  const result = run([
    'schema',
    templateFile,
    '--taxonomy',
    taxonomyFile,
    '--out',
    path.join(path.dirname(templateFile), 'out.json'),
  ]);

  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /unknown taxonomy key/);
});

test('check-model exits non-zero for a rejected model', () => {
  const allowlistFile = tmpFile('allowed-models.json', ['allowed-model']);

  const allowed = run([
    'check-model',
    'allowed-model',
    '--verifier-model',
    'verifier-model',
    '--allowlist',
    allowlistFile,
  ]);
  assert.strictEqual(allowed.status, 0);
  assert.match(allowed.stdout, /ALLOWED/);

  const rejected = run([
    'check-model',
    'other-model',
    '--verifier-model',
    'verifier-model',
    '--allowlist',
    allowlistFile,
  ]);
  assert.notStrictEqual(rejected.status, 0);
  assert.match(rejected.stderr, /not in allowlist/);
});

// ADR-044 Amendment (2026-10-01, ISSUE-565): the judge model is no longer
// required to differ from the verifier model.
test('check-model allows a judge model equal to the verifier model', () => {
  const allowlistFile = tmpFile('allowed-models.json', ['verifier-model']);

  const result = run([
    'check-model',
    'verifier-model',
    '--verifier-model',
    'verifier-model',
    '--allowlist',
    allowlistFile,
  ]);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /ALLOWED/);
});

test('check-model fails closed when the allowlist file cannot be read', () => {
  const result = run([
    'check-model',
    'some-model',
    '--verifier-model',
    'verifier-model',
    '--allowlist',
    path.join(os.tmpdir(), 'does-not-exist-calibration-allowlist.json'),
  ]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /allowlist was not checked/);
});

test('validate subcommand exits non-zero for an analysis outside taxonomy', () => {
  const taxonomyFile = tmpFile('taxonomy.json', {
    primary_cause: ['IMPLEMENTATION_DEFECT'],
    responsibility: ['implementation'],
    issue_defect_subtype: ['X'],
    verifier_defect_subtype: ['Y'],
    recommended_change_target: ['none'],
    counterfactual_outcome: ['RESOLVES', 'DOES_NOT_RESOLVE', 'UNKNOWN'],
    verdict: ['PASS', 'FAIL', 'UNDECIDABLE'],
    requirement_status: ['SATISFIED'],
    confidence: ['HIGH'],
    check_source: ['model', 'deterministic'],
  });
  const analysisFile = tmpFile('analysis.json', {
    observed_verdict: 'FAIL',
    independent_expected_verdict: 'FAIL',
    primary_cause: 'NOT_A_REAL_CAUSE',
    responsibility: 'implementation',
    confidence: 'HIGH',
    issue_defects: [],
    implementation_defects: [],
    verifier_defects: [],
    correct_verifier_findings: [],
    counterfactual: {
      fix_issue_only: 'UNKNOWN',
      fix_implementation_only: 'UNKNOWN',
      fix_verifier_only: 'UNKNOWN',
    },
    systemic_lessons: [],
    golden_case_recommendation: null,
  });

  const result = run([
    'validate',
    analysisFile,
    '--stage',
    'analysis',
    '--taxonomy',
    taxonomyFile,
  ]);

  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /primary_cause is outside taxonomy/);
});

test('collect subcommand writes independent/full packages via main()', () => {
  const rawDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calibration-judge-collect-raw-'));
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calibration-judge-collect-out-'));
  const writeRaw = (relPath, data) => {
    const fullPath = path.join(rawDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, typeof data === 'string' ? data : JSON.stringify(data));
  };
  writeRaw('run.json', { repository: 'owner/repo', run_id: 1, run_attempt: 1, conclusion: 'success' });
  writeRaw('jobs.json', {
    jobs: [
      { name: 'Verify', status: 'completed', conclusion: 'success' },
      { name: 'Report', status: 'completed', conclusion: 'success' },
    ],
  });
  writeRaw('pr.json', { base_sha: 'a'.repeat(40), head_sha: 'b'.repeat(40) });
  const inputsConfig = {
    independentInputs: [{ key: 'ci', path: 'ci.json', format: 'json' }],
    fullOnlyInputs: [{ key: 'verdict', path: 'verdict.json', format: 'json' }],
    trustedConfigs: [],
    trustedConfigsRoot: 'trusted',
    roundMeta: {
      runFile: 'run.json',
      jobsFile: 'jobs.json',
      prFile: 'pr.json',
      verifyJobName: 'Verify',
      reportJobName: 'Report',
    },
    selfReportMarker: 'Agent-reported DONE',
    selfReportCommentsFile: 'pr-comments.json',
  };
  const inputsFile = tmpFile('inputs.json', inputsConfig);

  const exitCode = main(['collect', rawDir, '--inputs', inputsFile, '--out', outDir]);

  assert.strictEqual(exitCode, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'));
  assert.strictEqual(manifest.round_key.repository, 'owner/repo');
  assert.ok(fs.existsSync(path.join(outDir, 'independent')));
  assert.ok(fs.existsSync(path.join(outDir, 'full')));
});

test('collect subcommand exits non-zero when the round key is missing', () => {
  const rawDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calibration-judge-collect-raw-'));
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calibration-judge-collect-out-'));
  const inputsFile = tmpFile('inputs.json', {
    independentInputs: [],
    fullOnlyInputs: [],
    trustedConfigs: [],
    trustedConfigsRoot: 'trusted',
    roundMeta: {
      runFile: 'run.json',
      jobsFile: 'jobs.json',
      prFile: 'pr.json',
      verifyJobName: 'Verify',
      reportJobName: 'Report',
    },
    selfReportMarker: 'Agent-reported DONE',
    selfReportCommentsFile: 'pr-comments.json',
  });

  const result = run(['collect', rawDir, '--inputs', inputsFile, '--out', outDir]);

  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /round key/);
});

test('prints usage and exits 2 for an unknown subcommand', () => {
  const result = run(['not-a-real-subcommand']);
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /usage:/);
});

const REPO_ROOT = path.join(__dirname, '..');
const CALIBRATION_DIR = path.join(REPO_ROOT, '.github', 'calibration');
const TAXONOMY_FILE = path.join(CALIBRATION_DIR, 'taxonomy.json');

const roundManifest = () => ({
  round_key: {
    repository: 'owner/repo',
    verifier_run_id: 7,
    verifier_run_attempt: 1,
  },
  head_sha: 'c'.repeat(40),
  inputs: { issue: { status: 'present', historical: true } },
});

const stageOne = () => ({
  independent_expected_verdict: 'PASS',
  requirements: [
    {
      id: 'AC-1',
      literal_requirement: 'x',
      evidence_expected: 'y',
      single_interpretation: true,
      verify_proves_requirement: true,
      status: 'SATISFIED',
      rationale: 'z',
    },
  ],
});

const stageTwo = () => ({
  observed_verdict: 'PASS',
  independent_expected_verdict: 'FAIL',
  primary_cause: 'INSUFFICIENT_EVIDENCE',
  responsibility: 'unknown',
  confidence: 'LOW',
  issue_defects: [],
  implementation_defects: [],
  verifier_defects: [],
  correct_verifier_findings: [],
  counterfactual: {
    fix_issue_only: 'UNKNOWN',
    fix_implementation_only: 'UNKNOWN',
    fix_verifier_only: 'UNKNOWN',
  },
  systemic_lessons: [],
  golden_case_recommendation: null,
});

test('assemble and render subcommands produce a comment from stage files', () => {
  const manifestFile = tmpFile('manifest.json', roundManifest());
  const stage1File = tmpFile('stage1.json', stageOne());
  const stage2File = tmpFile('stage2.json', stageTwo());
  const assembledFile = path.join(path.dirname(manifestFile), 'assembled.json');
  const commentFile = path.join(path.dirname(manifestFile), 'comment.md');

  const assembleResult = run([
    'assemble',
    '--manifest',
    manifestFile,
    '--stage1',
    stage1File,
    '--stage2',
    stage2File,
    '--taxonomy',
    TAXONOMY_FILE,
    '--out',
    assembledFile,
  ]);
  assert.strictEqual(assembleResult.status, 0, assembleResult.stderr);
  const assembled = JSON.parse(fs.readFileSync(assembledFile, 'utf8'));
  assert.strictEqual(assembled.error, null);
  assert.deepStrictEqual(assembled.independent, stageOne());
  assert.strictEqual(assembled.analysis.independent_expected_verdict, 'PASS');

  const renderResult = run(['render', assembledFile, '--out', commentFile]);
  assert.strictEqual(renderResult.status, 0, renderResult.stderr);
  const comment = fs.readFileSync(commentFile, 'utf8');
  assert.ok(comment.startsWith('<!-- calibration-judge -->\n'));
  assert.match(comment, /primary_cause: `INSUFFICIENT_EVIDENCE`/);
});

test('assemble subcommand turns a missing or broken stage file into an analysis error', () => {
  const manifestFile = tmpFile('manifest.json', roundManifest());
  const stage1File = tmpFile('stage1.json', stageOne());
  const brokenFile = tmpFile('stage2.json', '{ not json');
  const missingFile = path.join(path.dirname(manifestFile), 'nope.json');

  const broken = run([
    'assemble',
    '--manifest',
    manifestFile,
    '--stage1',
    stage1File,
    '--stage2',
    brokenFile,
    '--taxonomy',
    TAXONOMY_FILE,
  ]);
  assert.strictEqual(broken.status, 0, broken.stderr);
  assert.strictEqual(JSON.parse(broken.stdout).error.stage, 'analysis');

  const missing = run([
    'assemble',
    '--manifest',
    manifestFile,
    '--stage1',
    missingFile,
    '--stage2',
    brokenFile,
    '--taxonomy',
    TAXONOMY_FILE,
  ]);
  assert.strictEqual(JSON.parse(missing.stdout).error.stage, 'independent');

  const rejectedModel = run([
    'assemble',
    '--manifest',
    manifestFile,
    '--stage1',
    stage1File,
    '--stage2',
    brokenFile,
    '--taxonomy',
    TAXONOMY_FILE,
    '--model-error',
    'judge model equals verifier model',
  ]);
  const rejected = JSON.parse(rejectedModel.stdout);
  assert.strictEqual(rejected.error.stage, 'model');
  assert.deepStrictEqual(rejected.error.problems, ['judge model equals verifier model']);
});

test('assemble subcommand requires all stage arguments', () => {
  const result = run(['assemble', '--taxonomy', TAXONOMY_FILE]);
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /usage:/);
});

const { selectPreviousRound } = require('./calibration-judge');
const { encodeRounds } = require('./calibration-judge/publish');
const { COMMENT_MARKER } = require('./calibration-judge/render');

const JUDGE = 'judge-bot[bot]';
const CURRENT_KEY = {
  repository: 'owner/repo',
  verifier_run_id: '7',
  verifier_run_attempt: '2',
};

const roundRecord = (runId, runAttempt, analysis) => ({
  round_key: {
    repository: 'owner/repo',
    verifier_run_id: String(runId),
    verifier_run_attempt: String(runAttempt),
  },
  revision: 1,
  sha256: 'f'.repeat(64),
  analysis: { head_sha: `${runId}`.padStart(40, '0'), analysis },
  history: [],
});

const judgeComment = (records) => ({
  id: 1,
  user: { login: JUDGE },
  body: `${COMMENT_MARKER}\n${encodeRounds(records)}`,
});

test('previous-round picks the latest earlier round of the repository', () => {
  const comments = [
    judgeComment([
      roundRecord(5, 1, { marker: 'run 5' }),
      roundRecord(7, 1, { marker: 'run 7 attempt 1' }),
      roundRecord(7, 2, { marker: 'current round' }),
      roundRecord(9, 1, { marker: 'later round' }),
    ]),
  ];
  const result = selectPreviousRound({
    comments,
    author: JUDGE,
    roundKey: CURRENT_KEY,
  });
  assert.strictEqual(result.status, 'present');
  assert.deepStrictEqual(result.analysis, { marker: 'run 7 attempt 1' });
  assert.strictEqual(result.round_key.verifier_run_id, '7');
  assert.strictEqual(result.head_sha, '7'.padStart(40, '0'));
});

test('previous-round marks a missing or broken previous round', () => {
  const select = (comments) =>
    selectPreviousRound({ comments, author: JUDGE, roundKey: CURRENT_KEY }).status;

  assert.strictEqual(select([]), 'absent');
  assert.strictEqual(select([judgeComment([roundRecord(7, 2, {})])]), 'absent');
  const foreign = { ...judgeComment([roundRecord(5, 1, {})]), user: { login: 'someone' } };
  assert.strictEqual(select([foreign]), 'absent');
  assert.strictEqual(select(null), 'unreadable');
  const broken = { id: 1, user: { login: JUDGE }, body: `${COMMENT_MARKER}\nno block` };
  assert.strictEqual(select([broken]), 'unreadable');
  assert.strictEqual(select([judgeComment([roundRecord(5, 1, null)])]), 'unreadable');
});

test('previous-round subcommand writes the result and survives unreadable comments', () => {
  const commentsFile = tmpFile('comments.json', [
    judgeComment([roundRecord(5, 1, { marker: 'run 5' })]),
  ]);
  const outFile = path.join(path.dirname(commentsFile), 'previous.json');
  const args = (file) => [
    'previous-round',
    '--comments',
    file,
    '--author',
    JUDGE,
    '--repository',
    'owner/repo',
    '--run-id',
    '7',
    '--run-attempt',
    '2',
    '--out',
    outFile,
  ];

  const ok = run(args(commentsFile));
  assert.strictEqual(ok.status, 0, ok.stderr);
  const previous = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  assert.strictEqual(previous.status, 'present');
  assert.deepStrictEqual(previous.analysis, { marker: 'run 5' });

  const broken = run(args(tmpFile('comments.json', '{ not json')));
  assert.strictEqual(broken.status, 0, broken.stderr);
  const unreadable = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  assert.strictEqual(unreadable.status, 'unreadable');
  assert.strictEqual(unreadable.analysis, null);

  assert.strictEqual(run(['previous-round', '--comments', commentsFile]).status, 2);
});

const findingOf = (fate, firstDetection) => ({
  finding_id: 'F-1',
  criterion_id: 'AC-1',
  fate,
  check_source: 'model',
  description: 'empty name is accepted',
  evidence: [
    { type: 'code', sha: 'a'.repeat(40), path: 'x.js', note: 'no check', ref: null },
  ],
  ...(firstDetection === undefined ? {} : { first_detection: firstDetection }),
});

test('assemble subcommand applies previous round, comparison and transitions', () => {
  const firstDetection = {
    round_key: { repository: 'owner/repo', verifier_run_id: '5', verifier_run_attempt: '1' },
    fate: 'LATE_FINDING',
  };
  const previousFile = tmpFile('previous-round.json', {
    status: 'present',
    round_key: firstDetection.round_key,
    head_sha: null,
    analysis: {
      ...stageTwo(),
      implementation_defects: [findingOf('LATE_FINDING', firstDetection)],
    },
  });
  const dir = path.dirname(previousFile);
  const compareFile = path.join(dir, 'compare.json');
  fs.writeFileSync(compareFile, JSON.stringify({ taskChange: { type: 'code' } }));
  const transitionsFile = path.join(dir, 'transitions.json');
  fs.writeFileSync(transitionsFile, JSON.stringify({ transitions: [] }));
  const stage2File = tmpFile('stage2.json', {
    ...stageTwo(),
    implementation_defects: [findingOf('RESOLVED')],
  });
  const assembledFile = path.join(dir, 'assembled.json');
  const args = (previous) => [
    'assemble',
    '--manifest',
    tmpFile('manifest.json', roundManifest()),
    '--stage1',
    tmpFile('stage1.json', stageOne()),
    '--stage2',
    stage2File,
    '--taxonomy',
    TAXONOMY_FILE,
    '--previous',
    previous,
    '--compare',
    compareFile,
    '--transitions',
    transitionsFile,
    '--out',
    assembledFile,
  ];

  const result = run(args(previousFile));
  assert.strictEqual(result.status, 0, result.stderr);
  const assembled = JSON.parse(fs.readFileSync(assembledFile, 'utf8'));
  assert.strictEqual(assembled.error, null);
  const [finding] = assembled.analysis.implementation_defects;
  assert.deepStrictEqual(finding.first_detection, firstDetection);
  assert.deepStrictEqual(assembled.round_comparison, { taskChange: { type: 'code' } });
  assert.deepStrictEqual(assembled.transitions, { transitions: [] });

  const missing = run(args(path.join(dir, 'missing.json')));
  assert.strictEqual(missing.status, 0, missing.stderr);
  const rejected = JSON.parse(fs.readFileSync(assembledFile, 'utf8'));
  assert.strictEqual(rejected.error.stage, 'analysis');
  assert.match(rejected.error.problems[0], /requires finding_id F-1/);
});

test('assemble subcommand keeps round context on an early error', () => {
  const compareFile = tmpFile('compare.json', { taskChange: { type: 'issue' } });
  const dir = path.dirname(compareFile);
  const transitionsFile = path.join(dir, 'transitions.json');
  fs.writeFileSync(transitionsFile, JSON.stringify({ transitions: [] }));
  const assembledFile = path.join(dir, 'assembled.json');

  const result = run([
    'assemble',
    '--manifest',
    tmpFile('manifest.json', roundManifest()),
    '--stage1',
    path.join(dir, 'missing-stage1.json'),
    '--stage2',
    path.join(dir, 'missing-stage2.json'),
    '--taxonomy',
    TAXONOMY_FILE,
    '--model-error',
    'model rejected',
    '--compare',
    compareFile,
    '--transitions',
    transitionsFile,
    '--out',
    assembledFile,
  ]);
  assert.strictEqual(result.status, 0, result.stderr);
  const assembled = JSON.parse(fs.readFileSync(assembledFile, 'utf8'));
  assert.strictEqual(assembled.error.stage, 'model');
  assert.strictEqual(assembled.analysis, null);
  assert.deepStrictEqual(assembled.round_comparison, { taskChange: { type: 'issue' } });
  assert.deepStrictEqual(assembled.transitions, { transitions: [] });
});

test('stage one prompt names no full-package-only input', () => {
  const prompt = fs.readFileSync(path.join(CALIBRATION_DIR, 'prompt-stage1.md'), 'utf8');
  const inputs = JSON.parse(fs.readFileSync(path.join(CALIBRATION_DIR, 'inputs.json'), 'utf8'));
  const names = inputs.fullOnlyInputs.flatMap((entry) => {
    const extension = entry.path === undefined ? '.md' : path.extname(entry.path);
    const packaged = `${entry.key}${extension}`;
    return entry.path === undefined ? [packaged] : [entry.path, packaged];
  });

  assert.ok(names.length > 0);
  for (const name of names) {
    assert.ok(!prompt.includes(name), `stage one prompt mentions ${name}`);
  }
});

const INPUTS_FILE = path.join(CALIBRATION_DIR, 'inputs.json');
const ROUND_META = JSON.parse(fs.readFileSync(INPUTS_FILE, 'utf8')).roundMeta;

const attemptOf = (runId, runAttempt, startedAt, overrides = {}) => ({
  run_id: runId,
  run_attempt: runAttempt,
  run_started_at: startedAt,
  conclusion: 'success',
  jobs: [
    { name: ROUND_META.verifyJobName, status: 'completed', conclusion: 'success' },
    { name: ROUND_META.reportJobName, status: 'completed', conclusion: 'success' },
  ],
  ...overrides,
});

const staleJobs = [
  { name: ROUND_META.verifyJobName, status: 'completed', conclusion: 'success' },
  { name: ROUND_META.reportJobName, status: 'completed', conclusion: 'skipped' },
];

const resolve = (attempts, extra = []) =>
  run([
    'resolve-round',
    '--attempts',
    tmpFile('attempts.json', attempts),
    '--inputs',
    INPUTS_FILE,
    '--pr',
    '42',
    ...extra,
  ]);

test('resolve-round picks latest round attempt', () => {
  const attempts = [
    attemptOf(10, 1, '2026-09-01T10:00:00Z'),
    attemptOf(11, 1, '2026-09-02T10:00:00Z'),
    attemptOf(11, 2, '2026-09-03T10:00:00Z'),
    attemptOf(12, 1, '2026-09-04T10:00:00Z', { jobs: staleJobs }),
    attemptOf(13, 1, '2026-09-05T10:00:00Z', { conclusion: 'cancelled' }),
  ];

  const latest = resolve(attempts);
  assert.strictEqual(latest.status, 0, latest.stderr);
  assert.deepStrictEqual(JSON.parse(latest.stdout), { run_id: 11, run_attempt: 2 });

  const ofRun = resolve(attempts, ['--run-id', '10']);
  assert.strictEqual(ofRun.status, 0, ofRun.stderr);
  assert.deepStrictEqual(JSON.parse(ofRun.stdout), { run_id: 10, run_attempt: 1 });

  const exact = resolve(attempts, ['--run-id', '11', '--run-attempt', '1']);
  assert.strictEqual(exact.status, 0, exact.stderr);
  assert.deepStrictEqual(JSON.parse(exact.stdout), { run_id: 11, run_attempt: 1 });
});

test('resolve-round fails without rounds', () => {
  const none = resolve([]);
  assert.notStrictEqual(none.status, 0);
  assert.match(none.stderr, /PR #42/);
  assert.match(none.stderr, /no verifier runs found/);

  const notRounds = resolve([
    attemptOf(12, 1, '2026-09-04T10:00:00Z', { jobs: staleJobs }),
    attemptOf(13, 1, '2026-09-05T10:00:00Z', { conclusion: 'cancelled' }),
  ]);
  assert.notStrictEqual(notRounds.status, 0);
  assert.match(notRounds.stderr, /PR #42/);
  assert.match(notRounds.stderr, /none of 2 verifier run attempts is a round/);
  assert.doesNotMatch(notRounds.stderr, /no verifier runs found/);

  const explicitStale = resolve(
    [attemptOf(12, 1, '2026-09-04T10:00:00Z', { jobs: staleJobs })],
    ['--run-id', '12'],
  );
  assert.notStrictEqual(explicitStale.status, 0);
  assert.match(explicitStale.stderr, /PR #42: none of 1 verifier run attempts for run 12/);
});

test('resolve-round requires attempts, inputs and pr', () => {
  const result = run(['resolve-round', '--pr', '1']);
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /usage:/);
});

test('resolve-round still reports no round found for valid non-round attempts', () => {
  const result = resolve([attemptOf(12, 1, '2026-09-04T10:00:00Z', { jobs: staleJobs })]);
  assert.strictEqual(result.status, 4, result.stderr);
  assert.match(result.stderr, /none of 1 verifier run attempts is a round/);
});

test('resolve-round reports an internal crash separately from no round found', () => {
  // A malformed (null) attempt record makes resolveRound itself throw while
  // filtering candidates, rather than reaching a legitimate "no round" result.
  const crashed = resolve([null]);
  assert.strictEqual(crashed.status, 3, crashed.stderr);
  assert.match(crashed.stderr, /internal error/);
  assert.doesNotMatch(crashed.stderr, /no verifier runs found/);
  assert.doesNotMatch(crashed.stderr, /is a round/);

  const brokenInputs = run([
    'resolve-round',
    '--attempts',
    tmpFile('attempts.json', []),
    '--inputs',
    tmpFile('inputs.json', '{ not valid json'),
    '--pr',
    '42',
  ]);
  assert.strictEqual(brokenInputs.status, 3, brokenInputs.stderr);
  assert.match(brokenInputs.stderr, /internal error/);
});

test('publish subcommand writes the comment and the existing comment id', () => {
  const assembledOf = (problem) => ({
    round_key: { repository: 'o/r', verifier_run_id: 5, verifier_run_attempt: 1 },
    head_sha: null,
    inputs: {},
    error: { stage: 'model', problems: [problem] },
    independent: null,
    analysis: null,
  });
  const dir = path.dirname(tmpFile('assembled.json', assembledOf('model rejected')));
  const args = (assembledFile, commentsFile) => [
    'publish',
    assembledFile,
    '--comments',
    commentsFile,
    '--author',
    'judge-bot[bot]',
    '--repository',
    'o/r',
    '--run-id',
    '5',
    '--run-attempt',
    '1',
    '--inputs',
    INPUTS_FILE,
    '--out',
    path.join(dir, 'comment.md'),
    '--id-out',
    path.join(dir, 'id.txt'),
  ];

  const firstFile = tmpFile('assembled-1.json', assembledOf('model rejected'));
  const first = run(args(firstFile, tmpFile('comments.json', [])));
  assert.strictEqual(first.status, 0, first.stderr);
  const body = fs.readFileSync(path.join(dir, 'comment.md'), 'utf8');
  assert.match(body, /Ревизия разбора этого круга: 1/);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'id.txt'), 'utf8'), '');

  // A different analysis for the same round is a real new revision (AC-4
  // only makes an *identical* redelivery a no-op); this also confirms the
  // existing comment id is reused rather than a new comment being created.
  const comments = [{ id: 77, user: { login: 'judge-bot[bot]' }, body }];
  const secondFile = tmpFile('assembled-2.json', assembledOf('model rejected again'));
  const second = run(args(secondFile, tmpFile('comments.json', comments)));
  assert.strictEqual(second.status, 0, second.stderr);
  assert.match(fs.readFileSync(path.join(dir, 'comment.md'), 'utf8'), /Ревизия разбора этого круга: 2/);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'id.txt'), 'utf8'), '77');

  const broken = run(args(firstFile, tmpFile('comments.json', '{not json')));
  assert.strictEqual(broken.status, 1);
});

test('publish-round rejects a --max-attempts value unsafe for a counter', () => {
  const assembled = {
    round_key: { repository: 'o/r', verifier_run_id: 1, verifier_run_attempt: 1 },
    head_sha: null,
    inputs: {},
    error: { stage: 'model', problems: ['x'] },
    independent: null,
    analysis: null,
  };
  const assembledFile = tmpFile('assembled.json', assembled);
  const argsWith = (maxAttempts) => [
    'publish-round',
    assembledFile,
    '--repository',
    'o/r',
    '--pr',
    '1',
    '--author',
    'bot',
    '--run-id',
    '1',
    '--run-attempt',
    '1',
    '--inputs',
    INPUTS_FILE,
    '--max-attempts',
    maxAttempts,
  ];

  // A digit string past Number's safe integer range (or one that overflows
  // to Infinity) must be rejected before it ever reaches the retry loop,
  // where it would never make the loop's own counter exhaust it.
  for (const bad of ['99999999999999999999', '1'.padEnd(400, '0'), '0', '-1', 'x']) {
    const result = run(argsWith(bad));
    assert.strictEqual(result.status, 2, `${bad}: ${result.stderr}`);
    assert.match(result.stderr, /--max-attempts must be a positive integer/);
  }

  const tooLarge = run(argsWith('21'));
  assert.strictEqual(tooLarge.status, 2, tooLarge.stderr);
});

test('fetchComments flattens a multi-page --slurp response', () => {
  const { fetchComments } = require('./calibration-judge');
  // `gh api --paginate --slurp` wraps every page's own array into one outer
  // array (gh api --help); two pages of one comment each is the minimal
  // case that a plain JSON.parse (no flattening) would mis-shape.
  const pages = [
    [{ id: 1, user: { login: 'a' }, body: 'first page' }],
    [{ id: 2, user: { login: 'b' }, body: 'second page' }],
  ];
  const exec = (file, callArgs) => {
    assert.strictEqual(file, 'gh');
    assert.ok(callArgs.includes('--paginate'));
    assert.ok(callArgs.includes('--slurp'));
    return JSON.stringify(pages);
  };

  const comments = fetchComments(exec, 'o/r', 9);
  assert.deepStrictEqual(comments, [
    { id: 1, user: { login: 'a' }, body: 'first page' },
    { id: 2, user: { login: 'b' }, body: 'second page' },
  ]);
});

const pullOf = (overrides = {}) => ({
  number: 42,
  head_ref: 'task/ISSUE-7-change',
  head_repo: 'o/r',
  commit_shas: ['a'.repeat(40), 'b'.repeat(40)],
  ...overrides,
});

const checkPr = (pull, round) =>
  run([
    'check-pr',
    '--pull',
    tmpFile('pull.json', pull),
    '--round',
    tmpFile('round.json', round),
    '--repository',
    'o/r',
    '--branch-prefix',
    'task/ISSUE-',
  ]);

test('check-pr rejects non task branches and forks', () => {
  const round = { pr_number: 42, head_sha: 'b'.repeat(40) };

  const accepted = checkPr(pullOf(), round);
  assert.strictEqual(accepted.status, 0, accepted.stderr);
  assert.strictEqual(accepted.stdout.trim(), 'OK');

  const otherBranch = checkPr(pullOf({ head_ref: 'feature/x' }), round);
  assert.strictEqual(otherBranch.status, 1);
  assert.match(otherBranch.stderr, /PR #42 is not on a task\/ISSUE- branch/);

  const fork = checkPr(pullOf({ head_repo: 'fork/r' }), round);
  assert.strictEqual(fork.status, 1);
  assert.match(fork.stderr, /PR #42 is not from o\/r/);

  const noRepo = checkPr(pullOf({ head_repo: null }), round);
  assert.strictEqual(noRepo.status, 1);
});

test('check-pr rejects a round of another PR', () => {
  const otherPr = checkPr(pullOf(), { pr_number: 41, head_sha: 'b'.repeat(40) });
  assert.strictEqual(otherPr.status, 1);
  assert.match(otherPr.stderr, /round belongs to PR #41, not PR #42/);

  const ownCommit = checkPr(pullOf(), { pr_number: null, head_sha: 'a'.repeat(40) });
  assert.strictEqual(ownCommit.status, 0, ownCommit.stderr);

  const foreignCommit = checkPr(pullOf(), { pr_number: null, head_sha: 'c'.repeat(40) });
  assert.strictEqual(foreignCommit.status, 1);
  assert.match(foreignCommit.stderr, /is not a commit of PR #42/);

  const noHead = checkPr(pullOf(), { pr_number: 42, head_sha: null });
  assert.strictEqual(noHead.status, 1);
  assert.match(noHead.stderr, /round has no head commit/);
});

test('check-pr requires all arguments', () => {
  const result = run(['check-pr', '--pull', 'x']);
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /usage:/);
});

const makeRoundDir = ({ manifest, independent = {}, full = {} } = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'calibration-round-'));
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  const writeFiles = (subdir, files) => {
    const full_ = path.join(dir, subdir);
    fs.mkdirSync(full_, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(
        path.join(full_, name),
        typeof content === 'string' ? content : JSON.stringify(content),
      );
    }
  };
  writeFiles('independent', independent);
  writeFiles('full', full);
  return dir;
};

const COMPARE_FINGERPRINT_CONFIG = {
  fingerprint: {
    significantInputs: [
      { key: 'baseSha', manifestField: 'base_sha' },
      { key: 'ciSnapshot', inputKey: 'ci', stripIgnoredFields: true },
    ],
    ciSnapshotIgnoredFields: ['id'],
  },
};

const compareManifest = (overrides = {}) => ({
  round_key: { repository: 'o/r', verifier_run_id: 1, verifier_run_attempt: 1 },
  base_sha: 'base1',
  head_sha: 'head1',
  issue_body_sha256: 'a'.repeat(64),
  inputs: { ci: { status: 'present', historical: true } },
  ...overrides,
});

test('compare subcommand reports COMPARABLE for matching rounds via main()', () => {
  const inputsFile = tmpFile('inputs.json', COMPARE_FINGERPRINT_CONFIG);
  const ci = { checks: [{ name: 'Lint', conclusion: 'success', id: 1 }] };
  const previousDir = makeRoundDir({
    manifest: compareManifest(),
    independent: { 'ci.json': ci },
  });
  const currentDir = makeRoundDir({
    manifest: compareManifest({ head_sha: 'head2' }),
    independent: { 'ci.json': ci },
  });
  const outFile = path.join(currentDir, 'compare.json');

  const exitCode = main([
    'compare',
    '--previous',
    previousDir,
    '--current',
    currentDir,
    '--inputs',
    inputsFile,
    '--out',
    outFile,
  ]);

  assert.strictEqual(exitCode, 0);
  const result = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  assert.strictEqual(result.taskChange.type, 'code');
  assert.strictEqual(result.comparability.result, 'COMPARABLE');
});

test('compare subcommand treats --previous none as a first round', () => {
  const inputsFile = tmpFile('inputs.json', COMPARE_FINGERPRINT_CONFIG);
  const currentDir = makeRoundDir({
    manifest: compareManifest(),
    independent: { 'ci.json': { checks: [] } },
  });
  const outFile = path.join(currentDir, 'compare.json');

  const exitCode = main([
    'compare',
    '--previous',
    'none',
    '--current',
    currentDir,
    '--inputs',
    inputsFile,
    '--out',
    outFile,
  ]);

  assert.strictEqual(exitCode, 0);
  const result = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  assert.deepStrictEqual(result.taskChange, { type: null, reason: 'first round' });
  assert.strictEqual(result.comparability.result, null);
});

test('compare subcommand fails closed on an unreadable inputs config', () => {
  const previousDir = makeRoundDir({ manifest: compareManifest() });
  const currentDir = makeRoundDir({ manifest: compareManifest({ head_sha: 'head2' }) });

  const result = run([
    'compare',
    '--previous',
    previousDir,
    '--current',
    currentDir,
    '--inputs',
    path.join(currentDir, 'missing-inputs.json'),
  ]);

  assert.strictEqual(result.status, 1);
});

test('compare subcommand requires --current and --inputs', () => {
  const result = run(['compare', '--previous', 'none']);
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /usage:/);
});

const resultJson = (status) => ({
  verdict: status,
  spec_format: 'v2',
  items: [{ id: 'AC-1', source: 'model', statuses: [status], refs: [] }],
  reasons: [],
});

test('transitions subcommand marks flip from compare output via main()', () => {
  const previousDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calibration-round-'));
  fs.writeFileSync(path.join(previousDir, 'result.json'), JSON.stringify(resultJson('FAIL')));
  const currentDir = makeRoundDir({
    manifest: compareManifest(),
    full: { 'result.json': resultJson('PASS') },
  });
  const compareFile = tmpFile('compare.json', { taskChange: { type: 'none', reason: null } });
  const outFile = path.join(currentDir, 'transitions.json');

  const exitCode = main([
    'transitions',
    '--previous',
    previousDir,
    '--current',
    currentDir,
    '--compare',
    compareFile,
    '--out',
    outFile,
  ]);

  assert.strictEqual(exitCode, 0);
  const result = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  assert.strictEqual(result.task_change, 'none');
  assert.deepStrictEqual(
    result.transitions.map(({ id, from, to, flip }) => ({ id, from, to, flip })),
    [{ id: 'AC-1', from: 'FAIL', to: 'PASS', flip: true }],
  );
});

test('transitions subcommand falls back to verdict files and treats unknown type as no flip', () => {
  const previousDir = makeRoundDir({
    manifest: compareManifest(),
    full: {
      'verdict.json': {
        criteria: [{ id: 'AC-1', text: 't', status: 'FAIL', summary: 's', refs: [] }],
        invariants: [],
      },
    },
    independent: { 'specLint.json': { format: 'v2', problems: [], items: [{ id: 'DOD-1', type: 'ci' }] } },
  });
  const currentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calibration-round-'));
  fs.writeFileSync(path.join(currentDir, 'result.json'), JSON.stringify(resultJson('PASS')));

  const result = run(['transitions', '--previous', previousDir, '--current', currentDir]);

  assert.strictEqual(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.strictEqual(output.partial, true);
  assert.strictEqual(output.previous.source, 'verdict');
  assert.deepStrictEqual(output.previous.not_tracked, ['DOD-1']);
  assert.strictEqual(output.task_change, null);
  const transition = output.transitions.find(({ id }) => id === 'AC-1');
  assert.strictEqual(transition.changed, true);
  assert.strictEqual(transition.flip, false);
});

test('transitions subcommand requires --current', () => {
  const result = run(['transitions', '--previous', 'none']);
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /usage:/);
});
