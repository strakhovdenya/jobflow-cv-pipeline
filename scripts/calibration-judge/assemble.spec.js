'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { loadTaxonomy } = require('./taxonomy');
const { assemble, buildAnalysisError } = require('./assemble');

const TAXONOMY = loadTaxonomy(
  path.join(__dirname, '..', '..', '.github', 'calibration', 'taxonomy.json'),
);

const manifest = () => ({
  round_key: {
    repository: 'owner/repo',
    verifier_run_id: 101,
    verifier_run_attempt: 2,
  },
  head_sha: 'a'.repeat(40),
  inputs: {
    issue: { status: 'present', historical: true },
    verdict: { status: 'absent', historical: null },
  },
});

const stage1 = () => ({
  independent_expected_verdict: 'FAIL',
  requirements: [
    {
      id: 'AC-1',
      literal_requirement: 'the CLI rejects an empty name',
      evidence_expected: 'a negative test',
      single_interpretation: true,
      verify_proves_requirement: true,
      status: 'NOT_SATISFIED',
      rationale: 'no test exercises the empty name',
    },
  ],
});

const stage2 = () => ({
  observed_verdict: 'FAIL',
  independent_expected_verdict: 'FAIL',
  primary_cause: 'IMPLEMENTATION_DEFECT',
  responsibility: 'implementation',
  confidence: 'HIGH',
  issue_defects: [],
  implementation_defects: [
    {
      finding_id: 'F-1',
      criterion_id: 'AC-1',
      check_source: 'model',
      description: 'empty name is accepted',
      evidence: [
        { type: 'code', sha: 'a'.repeat(40), path: 'x.js', note: 'no check' },
      ],
    },
  ],
  verifier_defects: [],
  correct_verifier_findings: [],
  counterfactual: {
    fix_issue_only: 'DOES_NOT_RESOLVE',
    fix_implementation_only: 'RESOLVES',
    fix_verifier_only: 'DOES_NOT_RESOLVE',
  },
  systemic_lessons: [],
  golden_case_recommendation: null,
});

test('keeps stage one result unchanged', () => {
  const input = stage1();
  const result = assemble({
    manifest: manifest(),
    stage1: input,
    stage2: stage2(),
    taxonomy: TAXONOMY,
  });

  assert.strictEqual(result.error, null);
  assert.deepStrictEqual(result.independent, stage1());
  assert.notStrictEqual(result.independent, input);
  assert.deepStrictEqual(result.analysis, stage2());
  assert.deepStrictEqual(result.round_key, manifest().round_key);
  assert.strictEqual(result.head_sha, manifest().head_sha);
  assert.deepStrictEqual(result.inputs, manifest().inputs);
});

test('ignores stage two override of independent verdict', () => {
  const override = { ...stage2(), independent_expected_verdict: 'PASS' };
  const result = assemble({
    manifest: manifest(),
    stage1: stage1(),
    stage2: override,
    taxonomy: TAXONOMY,
  });

  assert.strictEqual(result.error, null);
  assert.strictEqual(result.analysis.independent_expected_verdict, 'FAIL');
  assert.deepStrictEqual(result.independent, stage1());
  assert.strictEqual(override.independent_expected_verdict, 'PASS');
});

test('stage two cannot replace stage one requirement statuses', () => {
  const sneaky = { ...stage2(), independent: { requirements: [] } };
  const result = assemble({
    manifest: manifest(),
    stage1: stage1(),
    stage2: sneaky,
    taxonomy: TAXONOMY,
  });

  assert.deepStrictEqual(result.independent, stage1());
});

test('reports missing or invalid stage output as analysis error', () => {
  const cases = [
    { stage1: null, stage2: stage2(), stage: 'independent' },
    {
      stage1: { ...stage1(), independent_expected_verdict: 'MAYBE' },
      stage2: stage2(),
      stage: 'independent',
    },
    { stage1: stage1(), stage2: null, stage: 'analysis' },
    {
      stage1: stage1(),
      stage2: { ...stage2(), primary_cause: 'NOT_A_CAUSE' },
      stage: 'analysis',
    },
  ];
  for (const item of cases) {
    const result = assemble({
      manifest: manifest(),
      stage1: item.stage1,
      stage2: item.stage2,
      taxonomy: TAXONOMY,
    });
    assert.strictEqual(result.error.stage, item.stage);
    assert.ok(result.error.problems.length > 0);
    assert.strictEqual(result.independent, null);
    assert.strictEqual(result.analysis, null);
    assert.deepStrictEqual(result.round_key, manifest().round_key);
  }
});

test('reports a manifest without round key as analysis error', () => {
  const result = assemble({
    manifest: { inputs: {} },
    stage1: stage1(),
    stage2: stage2(),
    taxonomy: TAXONOMY,
  });

  assert.strictEqual(result.error.stage, 'manifest');
  assert.strictEqual(result.round_key, null);
  assert.strictEqual(result.analysis, null);
});

test('builds an analysis error for a rejected model', () => {
  const result = buildAnalysisError(manifest(), 'model', [
    'judge model equals verifier model',
  ]);

  assert.deepStrictEqual(result.error, {
    stage: 'model',
    problems: ['judge model equals verifier model'],
  });
  assert.deepStrictEqual(result.round_key, manifest().round_key);
  assert.strictEqual(result.independent, null);
});
