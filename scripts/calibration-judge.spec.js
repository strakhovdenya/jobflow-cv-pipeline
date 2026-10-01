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
