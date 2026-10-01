'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  loadInputsConfig,
  readEntry,
  pickLatestSelfReport,
  classifyRun,
  buildManifest,
  collect,
} = require('./collect');

const SELF_REPORT_MARKER =
  'Agent-reported DONE — self-reported by the autonomous agent, ' +
  'not independently re-verified by the controller.';

const makeConfig = (overrides = {}) => ({
  independentInputs: [
    { key: 'issue', path: 'issue.md', fallbackPath: 'issue-current.md', format: 'text' },
    { key: 'specLint', path: 'spec-lint.json', format: 'json' },
    { key: 'diff', path: 'diff.patch', format: 'text' },
    { key: 'ci', path: 'ci.json', format: 'json' },
    { key: 'scope', path: 'scope.json', format: 'json' },
    { key: 'provenance', path: 'provenance.json', format: 'json' },
  ],
  fullOnlyInputs: [
    { key: 'verdict', path: 'verdict.json', format: 'json' },
    { key: 'verdict2', path: 'verdict2.json', format: 'json' },
    { key: 'refsProblems', path: 'refs-problems.json', format: 'json' },
    { key: 'verifierComment', path: 'verifier-comment.md', format: 'text' },
    { key: 'selfReport', selfReport: true, format: 'text' },
  ],
  trustedConfigs: ['.github/verifier/prompt.md'],
  trustedConfigsRoot: 'trusted',
  roundMeta: {
    runFile: 'run.json',
    jobsFile: 'jobs.json',
    prFile: 'pr.json',
    verifyJobName: 'Verify',
    reportJobName: 'Report',
  },
  selfReportMarker: SELF_REPORT_MARKER,
  selfReportCommentsFile: 'pr-comments.json',
  ...overrides,
});

const makeRawDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'calibration-collect-raw-'));
const makeOutDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'calibration-collect-out-'));

const writeRaw = (rawDir, relPath, data) => {
  const fullPath = path.join(rawDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, typeof data === 'string' ? data : JSON.stringify(data));
};

const writeConfigFile = (config) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'calibration-collect-config-'));
  const file = path.join(dir, 'inputs.json');
  fs.writeFileSync(file, JSON.stringify(config));
  return file;
};

const COMPLETE_ROUND = {
  'run.json': { repository: 'owner/repo', run_id: 123, run_attempt: 1, conclusion: 'success' },
  'jobs.json': {
    jobs: [
      { name: 'Verify', status: 'completed', conclusion: 'success' },
      { name: 'Report', status: 'completed', conclusion: 'success' },
    ],
  },
  'pr.json': { base_sha: 'a'.repeat(40), head_sha: 'b'.repeat(40) },
};

const writeCompleteRound = (rawDir, overrides = {}) => {
  const data = { ...COMPLETE_ROUND, ...overrides };
  for (const [relPath, content] of Object.entries(data)) writeRaw(rawDir, relPath, content);
};

test('builds independent and full packages', () => {
  const rawDir = makeRawDir();
  const outDir = makeOutDir();
  writeCompleteRound(rawDir);
  writeRaw(rawDir, 'issue.md', '# Issue');
  writeRaw(rawDir, 'spec-lint.json', { format: 'v2' });
  writeRaw(rawDir, 'diff.patch', '--- a\n+++ b\n');
  writeRaw(rawDir, 'ci.json', { checks: [] });
  writeRaw(rawDir, 'scope.json', { out_of_scope: [] });
  writeRaw(rawDir, 'provenance.json', {
    head_sha: 'b'.repeat(40),
    issue_body_sha256: 'c'.repeat(64),
    verifier_commit: 'd'.repeat(40),
    model: 'verifier-model-x',
    codex_version: '0.156.1',
  });
  writeRaw(rawDir, 'verdict.json', { criteria: [] });
  writeRaw(rawDir, 'verdict2.json', { criteria: [] });
  writeRaw(rawDir, 'refs-problems.json', []);
  writeRaw(rawDir, 'verifier-comment.md', '## Acceptance verifier: PASS');
  writeRaw(rawDir, 'trusted/.github/verifier/prompt.md', 'prompt text');

  const manifest = collect(rawDir, outDir, makeConfig());

  const independentFiles = fs.readdirSync(path.join(outDir, 'independent')).sort();
  assert.deepStrictEqual(independentFiles, [
    'ci.json',
    'diff.patch',
    'issue.md',
    'provenance.json',
    'scope.json',
    'specLint.json',
    'trusted',
  ]);
  const fullFiles = fs.readdirSync(path.join(outDir, 'full')).sort();
  assert.deepStrictEqual(fullFiles, [
    'ci.json',
    'diff.patch',
    'issue.md',
    'provenance.json',
    'refsProblems.json',
    'scope.json',
    'specLint.json',
    'trusted',
    'verdict.json',
    'verdict2.json',
    'verifierComment.md',
  ]);
  assert.ok(fs.existsSync(path.join(outDir, 'independent', 'trusted/.github/verifier/prompt.md')));
  assert.strictEqual(manifest.round_key.repository, 'owner/repo');
});

test('keeps verifier conclusions and self-report out of independent package', () => {
  const rawDir = makeRawDir();
  const outDir = makeOutDir();
  writeCompleteRound(rawDir);
  writeRaw(rawDir, 'verdict.json', { criteria: [] });
  writeRaw(rawDir, 'verdict2.json', { criteria: [] });
  writeRaw(rawDir, 'refs-problems.json', []);
  writeRaw(rawDir, 'verifier-comment.md', '## Acceptance verifier: FAIL');
  writeRaw(rawDir, 'pr-comments.json', [
    { id: 1, created_at: '2026-09-29T10:00:00Z', user: { login: 'agent' }, body: SELF_REPORT_MARKER },
  ]);

  collect(rawDir, outDir, makeConfig());

  const independentFiles = fs.readdirSync(path.join(outDir, 'independent'));
  for (const forbidden of ['verdict.json', 'verdict2.json', 'refsProblems.json', 'verifierComment.md', 'selfReport.md']) {
    assert.ok(!independentFiles.includes(forbidden), `${forbidden} must not be in independent/`);
  }
  const fullFiles = fs.readdirSync(path.join(outDir, 'full'));
  for (const expected of ['verdict.json', 'verdict2.json', 'refsProblems.json', 'verifierComment.md', 'selfReport.md']) {
    assert.ok(fullFiles.includes(expected), `${expected} must be in full/`);
  }
});

test('excludes unlisted files from independent package', () => {
  const rawDir = makeRawDir();
  const outDir = makeOutDir();
  writeCompleteRound(rawDir);
  writeRaw(rawDir, 'random-extra.txt', 'not part of any configured input');

  collect(rawDir, outDir, makeConfig());

  const independentFiles = fs.readdirSync(path.join(outDir, 'independent'));
  assert.ok(!independentFiles.includes('random-extra.txt'));
  const fullFiles = fs.readdirSync(path.join(outDir, 'full'));
  assert.ok(!fullFiles.includes('random-extra.txt'));
});

test('marks absent and unreadable inputs in manifest', () => {
  const rawDir = makeRawDir();
  const outDir = makeOutDir();
  writeCompleteRound(rawDir);
  writeRaw(rawDir, 'ci.json', '{ not valid json');

  const manifest = collect(rawDir, outDir, makeConfig());

  assert.strictEqual(manifest.inputs.scope.status, 'absent');
  assert.strictEqual(manifest.inputs.ci.status, 'unreadable');
});

// The real config: the previous-round inputs must be full-only there, not in
// a fixture copy that could drift from it.
const REAL_CONFIG = loadInputsConfig(
  path.join(__dirname, '..', '..', '.github', 'calibration', 'inputs.json'),
);

const PREVIOUS_ROUND_FILES = {
  'previous-round.json': {
    status: 'present',
    round_key: { repository: 'owner/repo', verifier_run_id: 100, verifier_run_attempt: 1 },
    head_sha: 'c'.repeat(40),
    analysis: { implementation_defects: [] },
  },
  'previous-manifest.json': { head_sha: 'c'.repeat(40) },
  'head-diff.patch': '--- a/x.js\n+++ b/x.js\n',
  'issue-diff.patch': '--- previous/issue.md\n+++ current/issue.md\n',
  'policy-diff.patch': '--- previous/prompt.md\n+++ current/prompt.md\n',
  'round-compare.json': { taskChange: { type: 'both' } },
  'round-transitions.json': { transitions: [] },
};

const PREVIOUS_ROUND_KEYS = [
  'previousAnalysis',
  'previousManifest',
  'headDiff',
  'issueDiff',
  'policyDiff',
  'roundCompare',
  'roundTransitions',
];

test('passes previous round only to full package', () => {
  const rawDir = makeRawDir();
  const outDir = makeOutDir();
  writeCompleteRound(rawDir);
  for (const [relPath, content] of Object.entries(PREVIOUS_ROUND_FILES)) {
    writeRaw(rawDir, relPath, content);
  }

  const manifest = collect(rawDir, outDir, REAL_CONFIG);

  const independentKeys = REAL_CONFIG.independentInputs.map(({ key }) => key);
  const independentFiles = fs.readdirSync(path.join(outDir, 'independent'));
  const fullFiles = fs.readdirSync(path.join(outDir, 'full'));
  for (const key of PREVIOUS_ROUND_KEYS) {
    assert.strictEqual(manifest.inputs[key].status, 'present', key);
    assert.ok(!independentKeys.includes(key), `${key} must not be independent`);
    assert.ok(
      !independentFiles.some((file) => file.startsWith(`${key}.`)),
      `${key} must not be in independent/`,
    );
    assert.ok(
      fullFiles.some((file) => file.startsWith(`${key}.`)),
      `${key} must be in full/`,
    );
  }
  const previous = JSON.parse(
    fs.readFileSync(path.join(outDir, 'full', 'previousAnalysis.json'), 'utf8'),
  );
  assert.deepStrictEqual(previous, PREVIOUS_ROUND_FILES['previous-round.json']);
});

test('marks missing previous round', () => {
  const absentRaw = makeRawDir();
  const absentOut = makeOutDir();
  writeCompleteRound(absentRaw);
  const absent = collect(absentRaw, absentOut, REAL_CONFIG);
  for (const key of PREVIOUS_ROUND_KEYS) {
    assert.strictEqual(absent.inputs[key].status, 'absent', key);
  }

  const cases = [
    { content: { status: 'absent', analysis: null }, status: 'absent' },
    { content: { status: 'unreadable', analysis: null }, status: 'unreadable' },
    { content: { status: 'forged', analysis: {} }, status: 'unreadable' },
    { content: { analysis: {} }, status: 'unreadable' },
    { content: '{ not valid json', status: 'unreadable' },
  ];
  for (const item of cases) {
    const rawDir = makeRawDir();
    const outDir = makeOutDir();
    writeCompleteRound(rawDir);
    writeRaw(rawDir, 'previous-round.json', item.content);
    const manifest = collect(rawDir, outDir, REAL_CONFIG);
    assert.strictEqual(
      manifest.inputs.previousAnalysis.status,
      item.status,
      JSON.stringify(item.content),
    );
    const fullFiles = fs.readdirSync(path.join(outDir, 'full'));
    assert.ok(!fullFiles.includes('previousAnalysis.json'));
  }
});

test('rejects a status field on a text input', () => {
  const config = makeConfig({
    fullOnlyInputs: [
      { key: 'notes', path: 'notes.md', format: 'text', statusField: 'status' },
    ],
  });
  assert.throws(
    () => loadInputsConfig(writeConfigFile(config)),
    /fullOnlyInputs is invalid/,
  );
});

test('records round key provenance and config hashes', () => {
  const rawDir = makeRawDir();
  const outDir = makeOutDir();
  writeCompleteRound(rawDir);
  writeRaw(rawDir, 'provenance.json', {
    head_sha: 'b'.repeat(40),
    issue_body_sha256: 'c'.repeat(64),
    verifier_commit: 'd'.repeat(40),
    model: 'verifier-model-x',
    codex_version: '0.156.1',
  });
  writeRaw(rawDir, 'trusted/.github/verifier/prompt.md', 'prompt text');

  const manifest = collect(rawDir, outDir, makeConfig());

  assert.deepStrictEqual(manifest.round_key, {
    repository: 'owner/repo',
    verifier_run_id: 123,
    verifier_run_attempt: 1,
  });
  assert.strictEqual(manifest.base_sha, 'a'.repeat(40));
  assert.strictEqual(manifest.head_sha, 'b'.repeat(40));
  assert.strictEqual(manifest.issue_body_sha256, 'c'.repeat(64));
  assert.strictEqual(manifest.verifier_commit, 'd'.repeat(40));
  assert.strictEqual(manifest.model, 'verifier-model-x');
  assert.strictEqual(manifest.codex_version, '0.156.1');

  const crypto = require('node:crypto');
  const expectedHash = crypto.createHash('sha256').update('prompt text').digest('hex');
  assert.deepStrictEqual(manifest.trusted_config_hashes['.github/verifier/prompt.md'], {
    present: true,
    sha256: expectedHash,
  });
});

test('treats both model runs as one round', () => {
  const rawDir = makeRawDir();
  const outDir = makeOutDir();
  writeCompleteRound(rawDir);
  writeRaw(rawDir, 'verdict.json', { criteria: [] });
  writeRaw(rawDir, 'verdict2.json', { criteria: [] });

  const manifest = collect(rawDir, outDir, makeConfig());

  assert.strictEqual(manifest.inputs.verdict.status, 'present');
  assert.strictEqual(manifest.inputs.verdict2.status, 'present');
  const fullFiles = fs.readdirSync(path.join(outDir, 'full'));
  assert.ok(fullFiles.includes('verdict.json'));
  assert.ok(fullFiles.includes('verdict2.json'));
  assert.ok(!Object.prototype.hasOwnProperty.call(manifest, 'round_key_2'));
});

test('marks current api data as not historical', () => {
  const rawDir = makeRawDir();
  const outDir = makeOutDir();
  writeCompleteRound(rawDir);
  writeRaw(rawDir, 'issue-current.md', '# Issue (live from API)');

  const manifest = collect(rawDir, outDir, makeConfig());

  assert.strictEqual(manifest.inputs.issue.status, 'present');
  assert.strictEqual(manifest.inputs.issue.historical, false);
  const written = fs.readFileSync(path.join(outDir, 'independent', 'issue.md'), 'utf8');
  assert.strictEqual(written, '# Issue (live from API)');
});

test('fails without round key', () => {
  const rawDir = makeRawDir();
  const outDir = makeOutDir();
  writeRaw(rawDir, 'run.json', { repository: 'owner/repo', conclusion: 'success' });
  writeRaw(rawDir, 'jobs.json', { jobs: [] });
  writeRaw(rawDir, 'pr.json', { base_sha: 'a'.repeat(40), head_sha: 'b'.repeat(40) });

  assert.throws(() => collect(rawDir, outDir, makeConfig()), /round key/);
  assert.ok(!fs.existsSync(path.join(outDir, 'manifest.json')));
  assert.ok(!fs.existsSync(path.join(outDir, 'independent')));
  assert.ok(!fs.existsSync(path.join(outDir, 'full')));
});

test('records verifier job conclusions', () => {
  const rawDir = makeRawDir();
  const outDir = makeOutDir();
  writeCompleteRound(rawDir, {
    'jobs.json': {
      jobs: [
        { name: 'Verify', status: 'completed', conclusion: 'success' },
        { name: 'Verify second', status: 'completed', conclusion: 'failure' },
        { name: 'Report', status: 'completed', conclusion: 'success' },
      ],
    },
  });

  const manifest = collect(rawDir, outDir, makeConfig());

  assert.strictEqual(manifest.jobs.status, 'present');
  assert.deepStrictEqual(manifest.jobs.conclusions, {
    Verify: 'success',
    'Verify second': 'failure',
    Report: 'success',
  });
});

test('classifies success and failure runs as rounds', () => {
  const jobs = [
    { name: 'Verify', status: 'completed', conclusion: 'success' },
    { name: 'Report', status: 'completed', conclusion: 'success' },
  ];
  const roundMeta = { verifyJobName: 'Verify', reportJobName: 'Report' };

  assert.strictEqual(classifyRun({ conclusion: 'success' }, jobs, roundMeta).isRound, true);
  assert.strictEqual(classifyRun({ conclusion: 'failure' }, jobs, roundMeta).isRound, true);
});

test('does not count cancelled in-progress or stale runs', () => {
  const roundMeta = { verifyJobName: 'Verify', reportJobName: 'Report' };
  const successJobs = [
    { name: 'Verify', status: 'completed', conclusion: 'success' },
    { name: 'Report', status: 'completed', conclusion: 'success' },
  ];

  const cancelled = classifyRun({ conclusion: 'cancelled' }, successJobs, roundMeta);
  assert.strictEqual(cancelled.isRound, false);

  const inProgress = classifyRun({ conclusion: null }, successJobs, roundMeta);
  assert.strictEqual(inProgress.isRound, false);

  const staleJobs = [
    { name: 'Verify', status: 'completed', conclusion: 'success' },
    { name: 'Report', status: 'skipped', conclusion: null },
  ];
  const stale = classifyRun({ conclusion: 'success' }, staleJobs, roundMeta);
  assert.strictEqual(stale.isRound, false);
  assert.match(stale.reason, /stale/);
});

test('counts a run as a round when Report is absent from the jobs response rather than explicitly skipped', () => {
  const roundMeta = { verifyJobName: 'Verify', reportJobName: 'Report' };
  const jobsWithoutReport = [{ name: 'Verify', status: 'completed', conclusion: 'success' }];

  const result = classifyRun({ conclusion: 'success' }, jobsWithoutReport, roundMeta);

  assert.strictEqual(result.isRound, true);
});

test('picks latest executor self-report', () => {
  const comments = [
    { id: 1, created_at: '2026-09-29T10:00:00Z', body: `older ${SELF_REPORT_MARKER}` },
    { id: 2, created_at: '2026-09-29T12:00:00Z', body: `latest ${SELF_REPORT_MARKER}` },
    { id: 3, created_at: '2026-09-29T09:00:00Z', body: 'unrelated comment' },
  ];

  const picked = pickLatestSelfReport(comments, SELF_REPORT_MARKER);
  assert.strictEqual(picked.id, 2);

  const tied = [
    { id: 5, created_at: '2026-09-29T10:00:00Z', body: SELF_REPORT_MARKER },
    { id: 7, created_at: '2026-09-29T10:00:00Z', body: SELF_REPORT_MARKER },
  ];
  assert.strictEqual(pickLatestSelfReport(tied, SELF_REPORT_MARKER).id, 7);

  assert.strictEqual(pickLatestSelfReport([], SELF_REPORT_MARKER), null);
  assert.strictEqual(pickLatestSelfReport(null, SELF_REPORT_MARKER), null);
});

test('marks missing provenance without failing', () => {
  const rawDir = makeRawDir();
  const outDir = makeOutDir();
  writeCompleteRound(rawDir);

  const manifest = collect(rawDir, outDir, makeConfig());

  assert.strictEqual(manifest.inputs.provenance.status, 'absent');
  assert.strictEqual(manifest.issue_body_sha256, null);
  assert.strictEqual(manifest.verifier_commit, null);
  assert.strictEqual(manifest.model, null);
  assert.strictEqual(manifest.codex_version, null);
});

test('handles missing jobs response', () => {
  const rawDir = makeRawDir();
  const outDir = makeOutDir();
  writeRaw(rawDir, 'run.json', { repository: 'owner/repo', run_id: 1, run_attempt: 1, conclusion: 'success' });
  writeRaw(rawDir, 'pr.json', { base_sha: 'a'.repeat(40), head_sha: 'b'.repeat(40) });

  const manifest = collect(rawDir, outDir, makeConfig());

  assert.strictEqual(manifest.jobs.status, 'absent');
  assert.strictEqual(manifest.jobs.conclusions, null);
  assert.strictEqual(manifest.round_classification.isRound, false);
  assert.match(manifest.round_classification.reason, /no job data/);
});

test('rejects invalid inputs config', () => {
  assert.throws(() => loadInputsConfig(path.join(os.tmpdir(), 'does-not-exist-inputs.json')));

  const duplicateKeyConfig = makeConfig({
    fullOnlyInputs: [
      { key: 'issue', path: 'verdict.json', format: 'json' },
      { key: 'selfReport', selfReport: true, format: 'text' },
    ],
  });
  const file = writeConfigFile(duplicateKeyConfig);
  assert.throws(() => loadInputsConfig(file), /duplicate input key/);

  const duplicatePathConfig = makeConfig({
    fullOnlyInputs: [
      { key: 'ci2', path: 'ci.json', format: 'json' },
      { key: 'selfReport', selfReport: true, format: 'text' },
    ],
  });
  const duplicatePathFile = writeConfigFile(duplicatePathConfig);
  assert.throws(() => loadInputsConfig(duplicatePathFile), /duplicate input path/);
});

test('readEntry falls back to a non-historical path when the primary is absent', () => {
  const rawDir = makeRawDir();
  writeRaw(rawDir, 'issue-current.md', 'current body');
  const entry = { key: 'issue', path: 'issue.md', fallbackPath: 'issue-current.md', format: 'text' };

  const result = readEntry(rawDir, entry);

  assert.strictEqual(result.status, 'present');
  assert.strictEqual(result.historical, false);
  assert.strictEqual(result.content, 'current body');
});

test('readEntry falls back when the primary file exists but fails to parse', () => {
  const rawDir = makeRawDir();
  writeRaw(rawDir, 'spec-lint.json', '{ not valid json');
  writeRaw(rawDir, 'spec-lint-current.json', { format: 'v2' });
  const entry = {
    key: 'specLint',
    path: 'spec-lint.json',
    fallbackPath: 'spec-lint-current.json',
    format: 'json',
  };

  const result = readEntry(rawDir, entry);

  assert.strictEqual(result.status, 'present');
  assert.strictEqual(result.historical, false);
  assert.deepStrictEqual(result.content, { format: 'v2' });
});

test('readEntry reports unreadable when both the primary and fallback fail to parse', () => {
  const rawDir = makeRawDir();
  writeRaw(rawDir, 'spec-lint.json', '{ not valid json');
  writeRaw(rawDir, 'spec-lint-current.json', '{ also not valid');
  const entry = {
    key: 'specLint',
    path: 'spec-lint.json',
    fallbackPath: 'spec-lint-current.json',
    format: 'json',
  };

  const result = readEntry(rawDir, entry);

  assert.strictEqual(result.status, 'unreadable');
  assert.strictEqual(result.historical, true);
});

test('buildManifest throws when run.json is entirely absent', () => {
  const rawDir = makeRawDir();
  writeRaw(rawDir, 'jobs.json', { jobs: [] });
  writeRaw(rawDir, 'pr.json', { base_sha: 'a'.repeat(40), head_sha: 'b'.repeat(40) });

  assert.throws(() => buildManifest(rawDir, makeConfig(), new Map(), new Map()), /round key/);
});
