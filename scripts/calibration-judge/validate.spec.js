'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  validateAnalysis,
  validateIndependentResult,
  checkModel,
} = require('./validate');

const TAXONOMY = {
  primary_cause: ['ISSUE_DEFECT', 'IMPLEMENTATION_DEFECT', 'INSUFFICIENT_EVIDENCE'],
  responsibility: ['issue_authoring', 'implementation', 'unknown'],
  issue_defect_subtype: ['AMBIGUOUS_REQUIREMENT'],
  verifier_defect_subtype: ['MISREAD_CODE'],
  recommended_change_target: ['prompt', 'none'],
  counterfactual_outcome: ['RESOLVES', 'DOES_NOT_RESOLVE', 'UNKNOWN'],
  verdict: ['PASS', 'FAIL', 'UNDECIDABLE'],
  requirement_status: [
    'SATISFIED',
    'NOT_SATISFIED',
    'AMBIGUOUS_SPEC',
    'INSUFFICIENT_EVIDENCE',
  ],
  confidence: ['LOW', 'MEDIUM', 'HIGH'],
  check_source: ['model', 'deterministic'],
};

const SHA = 'a'.repeat(40);

const codeEvidence = (overrides = {}) => ({
  type: 'code',
  sha: SHA,
  path: 'scripts/acceptance-verdict/verdict.js',
  note: 'the function returns FAIL unconditionally here',
  ...overrides,
});

const finding = (overrides = {}) => ({
  finding_id: 'f-1',
  criterion_id: 'AC-1',
  evidence: [codeEvidence()],
  ...overrides,
});

const minimalAnalysis = (overrides = {}) => ({
  observed_verdict: 'FAIL',
  independent_expected_verdict: 'FAIL',
  primary_cause: 'IMPLEMENTATION_DEFECT',
  responsibility: 'implementation',
  confidence: 'HIGH',
  issue_defects: [],
  implementation_defects: [],
  verifier_defects: [],
  correct_verifier_findings: [],
  counterfactual: {
    fix_issue_only: 'DOES_NOT_RESOLVE',
    fix_implementation_only: 'RESOLVES',
    fix_verifier_only: 'DOES_NOT_RESOLVE',
  },
  systemic_lessons: [],
  golden_case_recommendation: null,
  ...overrides,
});

test('accepts a complete analysis', () => {
  const analysis = minimalAnalysis({
    implementation_defects: [finding({ check_source: 'model' })],
    verifier_defects: [
      finding({
        finding_id: 'f-2',
        criterion_id: null,
        subtype: 'MISREAD_CODE',
        recommended_change_target: 'prompt',
      }),
    ],
    issue_defects: [
      finding({ finding_id: 'f-3', subtype: 'AMBIGUOUS_REQUIREMENT' }),
    ],
    correct_verifier_findings: [finding({ finding_id: 'f-4' })],
  });
  const result = validateAnalysis(analysis, TAXONOMY);
  assert.deepStrictEqual(result, { valid: true, problems: [] });
});

test('rejects primary_cause outside taxonomy', () => {
  const analysis = minimalAnalysis({ primary_cause: 'NOT_A_REAL_CAUSE' });
  const result = validateAnalysis(analysis, TAXONOMY);
  assert.strictEqual(result.valid, false);
  assert.ok(result.problems.some((problem) => problem.startsWith('primary_cause')));
});

test('rejects responsibility outside taxonomy', () => {
  const analysis = minimalAnalysis({ responsibility: 'not_a_real_component' });
  const result = validateAnalysis(analysis, TAXONOMY);
  assert.strictEqual(result.valid, false);
  assert.ok(result.problems.some((problem) => problem.startsWith('responsibility')));
});

test('rejects issue defect subtype outside taxonomy', () => {
  const analysis = minimalAnalysis({
    issue_defects: [finding({ subtype: 'NOT_A_REAL_SUBTYPE' })],
  });
  const result = validateAnalysis(analysis, TAXONOMY);
  assert.strictEqual(result.valid, false);
  assert.ok(result.problems.some((problem) => problem.includes('subtype')));
});

test('rejects verifier defect subtype outside taxonomy', () => {
  const analysis = minimalAnalysis({
    verifier_defects: [
      finding({ subtype: 'NOT_A_REAL_SUBTYPE', recommended_change_target: 'none' }),
    ],
  });
  const result = validateAnalysis(analysis, TAXONOMY);
  assert.strictEqual(result.valid, false);
  assert.ok(result.problems.some((problem) => problem.includes('subtype')));
});

test('rejects finding without criterion_id', () => {
  const bad = finding();
  delete bad.criterion_id;
  const analysis = minimalAnalysis({ implementation_defects: [bad] });
  const result = validateAnalysis(analysis, TAXONOMY);
  assert.strictEqual(result.valid, false);
  assert.ok(result.problems.some((problem) => problem.includes('criterion_id is required')));
});

test('accepts finding with null criterion_id', () => {
  const analysis = minimalAnalysis({
    implementation_defects: [finding({ criterion_id: null })],
  });
  const result = validateAnalysis(analysis, TAXONOMY);
  assert.deepStrictEqual(result, { valid: true, problems: [] });
});

test('rejects malformed criterion_id', () => {
  const analysis = minimalAnalysis({
    implementation_defects: [finding({ criterion_id: 'AC1' })],
  });
  const result = validateAnalysis(analysis, TAXONOMY);
  assert.strictEqual(result.valid, false);
  assert.ok(result.problems.some((problem) => problem.includes('criterion_id is malformed')));
});

test('rejects missing or duplicate finding_id', () => {
  const missing = finding();
  delete missing.finding_id;
  const missingResult = validateAnalysis(
    minimalAnalysis({ implementation_defects: [missing] }),
    TAXONOMY,
  );
  assert.strictEqual(missingResult.valid, false);
  assert.ok(
    missingResult.problems.some((problem) => problem.includes('finding_id is required')),
  );

  const duplicateResult = validateAnalysis(
    minimalAnalysis({
      implementation_defects: [finding({ finding_id: 'dup' })],
      correct_verifier_findings: [finding({ finding_id: 'dup' })],
    }),
    TAXONOMY,
  );
  assert.strictEqual(duplicateResult.valid, false);
  assert.ok(
    duplicateResult.problems.some((problem) => problem.includes('duplicate finding_id: dup')),
  );
});

test('rejects finding without evidence', () => {
  const emptyEvidence = validateAnalysis(
    minimalAnalysis({ implementation_defects: [finding({ evidence: [] })] }),
    TAXONOMY,
  );
  assert.strictEqual(emptyEvidence.valid, false);
  assert.ok(
    emptyEvidence.problems.some((problem) => problem.includes('evidence must be a non-empty array')),
  );

  const badShaResult = validateAnalysis(
    minimalAnalysis({
      implementation_defects: [
        finding({ evidence: [codeEvidence({ sha: 'not-a-sha' })] }),
      ],
    }),
    TAXONOMY,
  );
  assert.strictEqual(badShaResult.valid, false);
  assert.ok(badShaResult.problems.some((problem) => problem.includes('evidence[0] is invalid')));
});

test('accepts insufficient evidence analysis', () => {
  const analysis = minimalAnalysis({
    primary_cause: 'INSUFFICIENT_EVIDENCE',
    responsibility: 'unknown',
    independent_expected_verdict: 'UNDECIDABLE',
    confidence: 'LOW',
    counterfactual: {
      fix_issue_only: 'UNKNOWN',
      fix_implementation_only: 'UNKNOWN',
      fix_verifier_only: 'UNKNOWN',
    },
  });
  const result = validateAnalysis(analysis, TAXONOMY);
  assert.deepStrictEqual(result, { valid: true, problems: [] });
});

test('validates check_source separately from primary_cause', () => {
  const badSource = validateAnalysis(
    minimalAnalysis({
      implementation_defects: [finding({ check_source: 'not_a_real_source' })],
    }),
    TAXONOMY,
  );
  assert.strictEqual(badSource.valid, false);
  assert.ok(badSource.problems.some((problem) => problem.includes('check_source')));

  const nullSource = validateAnalysis(
    minimalAnalysis({
      implementation_defects: [finding({ check_source: null })],
    }),
    TAXONOMY,
  );
  assert.deepStrictEqual(nullSource, { valid: true, problems: [] });
});

test('accepts a correct stage 1 (independent) result', () => {
  const result = validateIndependentResult(
    {
      requirements: [
        {
          id: 'AC-1',
          literal_requirement: 'taxonomy.json contains the listed values',
          evidence_expected: 'the file exists with the required keys',
          single_interpretation: true,
          verify_proves_requirement: true,
          status: 'SATISFIED',
          rationale: 'the file was read and every key matched',
        },
      ],
    },
    TAXONOMY,
  );
  assert.deepStrictEqual(result, { valid: true, problems: [] });
});

test('rejects a stage 1 result with a status outside taxonomy', () => {
  const result = validateIndependentResult(
    {
      requirements: [
        {
          id: 'AC-1',
          literal_requirement: 'x',
          evidence_expected: 'y',
          single_interpretation: true,
          verify_proves_requirement: true,
          status: 'NOT_A_REAL_STATUS',
          rationale: 'z',
        },
      ],
    },
    TAXONOMY,
  );
  assert.strictEqual(result.valid, false);
  assert.ok(result.problems.some((problem) => problem.includes('status')));
});

test('accepts allowed judge model different from verifier', () => {
  const result = checkModel('judge-model', 'verifier-model', ['judge-model']);
  assert.deepStrictEqual(result, { allowed: true, reason: null });
});

test('rejects judge model equal to verifier model', () => {
  const result = checkModel('same-model', 'same-model', ['same-model']);
  assert.strictEqual(result.allowed, false);
  assert.match(result.reason, /equals verifier model/);
});

test('rejects judge model missing from allowlist', () => {
  const result = checkModel('judge-model', 'verifier-model', ['other-model']);
  assert.strictEqual(result.allowed, false);
  assert.match(result.reason, /not in allowlist/);
});

test('fails closed on unreadable allowlist or unknown verifier model', () => {
  const unreadable = checkModel('judge-model', 'verifier-model', null);
  assert.strictEqual(unreadable.allowed, false);
  assert.match(unreadable.reason, /allowlist was not checked/);

  const unknownVerifier = checkModel('judge-model', '', ['judge-model']);
  assert.strictEqual(unknownVerifier.allowed, false);
  assert.match(unknownVerifier.reason, /verifier model is unknown/);
});
