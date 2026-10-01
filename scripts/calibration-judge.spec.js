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
    'verifier-model',
    '--verifier-model',
    'verifier-model',
    '--allowlist',
    allowlistFile,
  ]);
  assert.notStrictEqual(rejected.status, 0);
  assert.match(rejected.stderr, /equals verifier model/);
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
