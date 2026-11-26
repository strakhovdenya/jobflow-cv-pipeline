import {
  ANALYSIS_DECISION_ARTIFACT,
  ANALYSIS_DECISION_CONTRACT_VERSION,
  AnalysisDecision,
  validateAnalysisDecision,
} from './analysis-decision.schema';
import { buildEvidenceCatalog } from './evidence-catalog';
import { validateFitAssessment } from './fit-assessment.schema';
import { validateVacancyRequirements } from './vacancy-requirements.schema';

const valid = (): AnalysisDecision => ({
  contract_version: ANALYSIS_DECISION_CONTRACT_VERSION,
  policy_version: 'adr-046@2026-11-26',
  snapshot_id: 'snapshot-a',
  decision: 'maybe',
  score: 68,
  category_scores: {
    tech_stack: 20,
    production_backend: 12,
    domain_product: 5,
    seniority: 12,
    language_location: 10,
    evidence_quality: 9,
  },
  deciding_rule: 'B2',
  trace: [
    { row: 'V', applied: true, inputs: {}, effect: 'input valid' },
    { row: 'B2', applied: true, inputs: { score: 68 }, effect: 'base maybe' },
    {
      row: 'F',
      applied: true,
      inputs: { deciding_rule: 'B2' },
      effect: 'decision maybe by B2',
    },
  ],
  manual_review_required: true,
  borderline: true,
  borderline_reasons: ['F: score 68 is within 3 points of 65'],
  open_questions: [{ condition: 'eligibility.remote_location', note: '' }],
  advisory_decision: 'apply',
  advisory_differs: true,
  counts: {
    strong_points: 3,
    credible_points: 4,
    must_have_total: 3,
    must_have_met: 2,
    stacking_categories: ['core_stack'],
  },
  shadow_sub_scores: { tech_stack: 19, evidence_quality: null },
});

const errorsOf = (raw: unknown): string[] => {
  const result = validateAnalysisDecision(raw);
  return result.success ? [] : result.errors;
};

describe('01c analysis decision contract', () => {
  it('fixes the canonical artifact name and version', () => {
    expect(ANALYSIS_DECISION_ARTIFACT).toBe('01c_analysis_decision.json');
    expect(ANALYSIS_DECISION_CONTRACT_VERSION).toBe('1.0');
  });

  it('accepts a valid decision', () => {
    expect(validateAnalysisDecision(valid())).toEqual({
      success: true,
      data: valid(),
    });
  });

  it('rejects an unknown contract major version', () => {
    const unknown = 'unknown contract major version 2 (expected 1)';
    expect(errorsOf({ ...valid(), contract_version: '2.0' })).toEqual([
      unknown,
    ]);

    const vacancy = 'Node.js';
    const requirements = validateVacancyRequirements(
      {
        contract_version: '2.0',
        seniority: { level: 'unspecified', quote: null },
        requirements: [],
        facts: [],
        languages: [],
        hidden_role_logic: [],
      },
      vacancy,
    );
    expect(requirements).toEqual({ success: false, errors: [unknown] });

    const catalog = buildEvidenceCatalog({
      snapshotId: 'snapshot-a',
      careerCasesText: '',
      projects: [],
      credentials: [],
    });
    const assessment = validateFitAssessment(
      { contract_version: '2.0', snapshot_id: 'snapshot-a' },
      {
        requirements: {
          contract_version: '1.0',
          seniority: { level: 'unspecified', quote: null },
          requirements: [],
          facts: [],
          languages: [],
          hidden_role_logic: [],
        },
        catalog,
      },
    );
    expect(assessment).toEqual({ success: false, errors: [unknown] });

    // A known major with another minor is the same contract.
    expect(errorsOf({ ...valid(), contract_version: '1.3' })).toEqual([]);
  });

  it('rejects unknown decisions, rows and malformed fields', () => {
    const raw = valid() as unknown as Record<string, any>;
    raw.decision = 'later';
    raw.deciding_rule = 'Z1';
    raw.borderline = 'yes';
    raw.score = 101;
    raw.trace.push({ row: 'H9', applied: true, inputs: {}, effect: '' });
    raw.counts.stacking_categories = ['budget'];
    raw.shadow_sub_scores = { tech_stack: '19', evidence_quality: null };
    raw.open_questions = [{ condition: 'x' }];
    expect(errorsOf(raw)).toEqual([
      'decision must be apply, maybe or skip',
      'deciding_rule must be an Appendix row id',
      'borderline must be a boolean',
      'open_questions must be an array of { condition, note }',
      'score must be an integer 0-100',
      'shadow_sub_scores must hold numbers or null',
      'trace[3]: invalid trace entry',
      'counts.stacking_categories must list risk categories',
    ]);
  });

  it('rejects a missing trace, counts or scores', () => {
    const raw = valid() as unknown as Record<string, any>;
    raw.trace = [];
    raw.counts = null;
    raw.category_scores = { tech_stack: 1 };
    raw.policy_version = 3;
    expect(errorsOf(raw)).toEqual([
      'policy_version must be a string',
      'category_scores must hold the six sub-scores',
      'trace must be a non-empty array',
      'counts must be an object',
    ]);
    expect(errorsOf('01c')).toEqual(['01c must be a JSON object']);
  });
});
