import {
  Credential,
  PortfolioProject,
} from '../../evidence/career-registry.parser';
import { buildEvidenceCatalog } from './evidence-catalog';
import {
  FIT_ASSESSMENT_ARTIFACT,
  FitAssessment,
  validateFitAssessment,
} from './fit-assessment.schema';
import { VacancyRequirements } from './vacancy-requirements.schema';

const SNAPSHOT = 'snapshot-a';

const project = (id: string, cvEligible: boolean): PortfolioProject => ({
  id,
  title: id,
  aliases: [],
  status: cvEligible ? 'active' : 'archived',
  cvEligible,
  portfolioPriority: 'primary',
  placement: 'selected_projects',
  evidenceClass: 'personal_verified',
  repositoryUrl: null,
  lastVerifiedAt: '2026-01-01',
  verifiedCommit: null,
  deployment: null,
  roleFamilies: ['backend_node'],
  techStack: [],
  allowedWording: ['Sample wording'],
  prohibitedClaims: [],
});

const credential = (id: string, cvEligible: boolean): Credential => ({
  id,
  title: id,
  aliases: [],
  issuer: 'Example Issuer',
  type: 'lab',
  status: 'completed',
  cvEligible,
  evidenceClass: 'training_verified',
  issued: null,
  credentialId: null,
  verificationUrl: null,
  skills: [],
  roleFamilies: [],
  aiCategory: null,
});

const catalog = buildEvidenceCatalog({
  snapshotId: SNAPSHOT,
  careerCasesText: '# Case 1 — Example commercial work\n## 1. Context\n',
  projects: [project('alpha-service', true), project('old-project', false)],
  credentials: [credential('lab-one', false)],
});

const requirements: VacancyRequirements = {
  contract_version: '1.0',
  seniority: { level: 'unspecified', quote: null },
  requirements: [
    { id: 'R1', kind: 'must_have', text: 'Node.js', quote: 'Node.js' },
    { id: 'R2', kind: 'must_have', text: 'SQL', quote: 'SQL' },
    { id: 'R3', kind: 'nice_to_have', text: 'Cloud', quote: 'Cloud' },
  ],
  facts: [],
  languages: [],
  hidden_role_logic: [],
};

const judgement = (cited: string[] = []) => ({
  value: false,
  reason: '',
  cited_ids: cited,
});

const valid = (): FitAssessment => ({
  contract_version: '1.0',
  snapshot_id: SNAPSHOT,
  coverage: [
    {
      requirement_id: 'R1',
      is_core: true,
      basis: 'commercial',
      evidence: [
        {
          ref: 'case:1#section-1',
          snapshot_id: SNAPSHOT,
          strength: 'strong',
          provenance: 'commercial',
          offered_for_display: true,
        },
      ],
      notes: '',
    },
    {
      requirement_id: 'R2',
      is_core: true,
      basis: 'personal',
      evidence: [
        {
          ref: 'project:alpha-service#wording-1',
          snapshot_id: SNAPSHOT,
          strength: 'partial',
          provenance: 'personal',
          offered_for_display: true,
        },
        {
          ref: 'manual_note:note-1',
          snapshot_id: null,
          strength: 'strong',
          provenance: 'manual_note',
          offered_for_display: true,
        },
      ],
      notes: '',
    },
    {
      requirement_id: 'R3',
      is_core: false,
      basis: 'training',
      evidence: [
        {
          ref: 'credential:lab-one',
          snapshot_id: SNAPSHOT,
          strength: 'partial',
          provenance: 'training',
          offered_for_display: false,
        },
      ],
      notes: '',
    },
  ],
  eligibility: {
    work_authorisation: { value: 'compatible', note: '' },
    remote_location: { value: 'undetermined', note: 'Not stated' },
    mandatory_language: { value: 'compatible', note: '' },
    other: [{ id: 'E1', label: 'Travel', value: 'compatible', note: '' }],
  },
  risks: [
    {
      cause_id: 'K1',
      category: 'core_stack',
      level: 'medium',
      language: null,
      requirement_ids: ['R2'],
      reason: 'SQL only partial',
    },
  ],
  score_deductions: [{ cause_id: 'K1', category: 'tech_stack', points: 3 }],
  category_scores: {
    tech_stack: 20,
    production_backend: 12,
    domain_product: 5,
    seniority: 14,
    language_location: 15,
    evidence_quality: 11,
  },
  judgements: {
    requires_overstretch: judgement(),
    ownership_unsupported: judgement(),
    core_stack_close: {
      value: true,
      reason: 'Main stack overlaps',
      cited_ids: ['R1', 'case:1#section-1'],
    },
    main_risk_manageable: judgement(['K1']),
    reached_by_core_gaps: judgement(),
    product_evidence_strong: judgement(),
    all_fits_very_strong: judgement(),
    strategic_exception: judgement(),
    role_family: { value: 'backend', reason: '', cited_ids: [] },
    defining_requirement: {
      requirement_id: 'R1',
      reason: 'Primary ask',
      cited_ids: ['R1'],
    },
  },
  quality_score: 85,
  summary: 'Summary',
  top_reasons: ['Reason'],
  recommended_next_action: 'Pause for manual review before deciding',
  evidence_risks: [{ claim: 'Claim', status: 'needs evidence' }],
  manual_note_forced_claims: [{ location: 'must_have[1]', text: 'Forced' }],
});

const errorsOf = (raw: unknown): string[] => {
  const result = validateFitAssessment(raw, { requirements, catalog });
  return result.success ? [] : result.errors;
};

describe('01b fit assessment contract', () => {
  it('fixes the canonical artifact name', () => {
    expect(FIT_ASSESSMENT_ARTIFACT).toBe('01b_fit_assessment.json');
  });

  it('accepts a valid assessment', () => {
    expect(validateFitAssessment(valid(), { requirements, catalog })).toEqual({
      success: true,
      data: valid(),
    });
  });

  it('defaults absent forced claims to an empty list', () => {
    const raw = valid() as unknown as Record<string, unknown>;
    delete raw.manual_note_forced_claims;
    const result = validateFitAssessment(raw, { requirements, catalog });
    expect(result.success && result.data.manual_note_forced_claims).toEqual([]);
  });

  it('rejects a reference that does not resolve in the snapshot catalog', () => {
    const unknownKey = valid();
    unknownKey.coverage[0].evidence[0].ref = 'case:1#section-7';
    expect(errorsOf(unknownKey)).toEqual([
      'coverage of R1: reference case:1#section-7 does not resolve in snapshot snapshot-a',
      'coverage of R1: basis commercial has no commercial reference (manual-note items never count)',
      // a judgement may cite only references that resolved
      'judgement core_stack_close: unknown cited id case:1#section-1',
    ]);

    const otherSnapshot = valid();
    otherSnapshot.coverage[0].evidence[0].snapshot_id = 'snapshot-b';
    expect(errorsOf(otherSnapshot)).toContain(
      'coverage of R1: reference case:1#section-1 is recorded for snapshot snapshot-b, not snapshot-a',
    );

    const noSnapshot = valid();
    noSnapshot.coverage[0].evidence[0].snapshot_id = null;
    expect(errorsOf(noSnapshot)).toContain(
      'coverage of R1: reference case:1#section-1 has no snapshot id',
    );

    const assessmentSnapshot = valid();
    assessmentSnapshot.snapshot_id = 'snapshot-b';
    expect(errorsOf(assessmentSnapshot)).toEqual([
      'snapshot_id snapshot-b is not the catalog snapshot snapshot-a',
    ]);
  });

  it('rejects a requirement without coverage', () => {
    const raw = valid();
    raw.coverage = raw.coverage.filter((row) => row.requirement_id !== 'R3');
    expect(errorsOf(raw)).toEqual(['requirement R3 has no coverage row']);

    const duplicate = valid();
    duplicate.coverage.push({ ...duplicate.coverage[0] });
    expect(errorsOf(duplicate)).toEqual(['coverage of R1: duplicate row']);

    const unknown = valid();
    unknown.coverage[0].requirement_id = 'R9';
    expect(errorsOf(unknown)).toEqual(
      expect.arrayContaining([
        'coverage of R9: unknown requirement id',
        'requirement R1 has no coverage row',
      ]),
    );
  });

  it('rejects an unknown contract major version', () => {
    expect(errorsOf({ ...valid(), contract_version: '2.0' })).toEqual([
      'unknown contract major version 2 (expected 1)',
    ]);
    expect(errorsOf({ ...valid(), contract_version: '1.4' })).toEqual([]);
  });

  it('rejects non-eligible entries offered for display or cited as support', () => {
    const offered = valid();
    offered.coverage[2].evidence[0].offered_for_display = true;
    expect(errorsOf(offered)).toEqual([
      'coverage of R3 reference credential:lab-one: a non-displayable entry is offered for display',
    ]);

    const unsupported = valid();
    unsupported.coverage[1].evidence[0].ref = 'project:old-project#wording-1';
    unsupported.coverage[1].evidence[0].offered_for_display = false;
    expect(errorsOf(unsupported)).toEqual([
      'coverage of R2 reference project:old-project#wording-1: the entry supports no requirement',
    ]);
  });

  it('rejects provenance that contradicts the catalog or the manual-note kind', () => {
    const training = valid();
    training.coverage[2].evidence[0].provenance = 'commercial';
    training.coverage[2].basis = 'commercial';
    expect(errorsOf(training)).toEqual([
      'coverage of R3 reference credential:lab-one: provenance commercial contradicts the catalog (training)',
    ]);

    const forcedAsCatalog = valid();
    forcedAsCatalog.coverage[1].evidence[1].ref = 'project:alpha-service';
    expect(errorsOf(forcedAsCatalog)).toEqual([
      'coverage of R2 reference project:alpha-service: only manual-note items use the manual_note kind, and they must',
    ]);

    const commercialAsNote = valid();
    commercialAsNote.coverage[0].evidence[0].ref = 'manual_note:note-2';
    expect(errorsOf(commercialAsNote)).toContain(
      'coverage of R1 reference manual_note:note-2: only manual-note items use the manual_note kind, and they must',
    );
  });

  it('rejects unknown enum values, sub-scores out of range and dangling ids', () => {
    const raw = valid() as unknown as Record<string, any>;
    raw.coverage[0].basis = 'freelance';
    raw.eligibility.work_authorisation.value = 'maybe';
    raw.risks[0].category = 'budget';
    raw.risks[0].language = 'english';
    raw.score_deductions.push({
      cause_id: 'X9',
      category: 'tech_stack',
      points: 0,
    });
    raw.category_scores.domain_product = 8;
    raw.category_scores.seniority = 2.5;
    raw.judgements.role_family.value = 'designer';
    raw.judgements.main_risk_manageable.cited_ids = ['Z1'];
    expect(errorsOf(raw)).toEqual([
      'coverage of R1: unknown basis freelance',
      'eligibility.work_authorisation: value must be compatible, incompatible or undetermined',
      'risk K1: unknown category budget',
      'risk K1: language must name the language of a language risk, else null',
      'score_deductions[1]: cause_id must name a risk cause',
      'score_deductions[1]: points must be a positive integer',
      'category_scores.domain_product must be an integer 0-7',
      'category_scores.seniority must be an integer 0-17',
      'judgement main_risk_manageable: unknown cited id Z1',
      'judgement role_family: unknown role family',
    ]);
  });

  it('rejects judgements that lack reasons or name a non-must-have defining requirement', () => {
    const raw = valid();
    raw.judgements.requires_overstretch = {
      value: true,
      reason: ' ',
      cited_ids: [],
    };
    raw.judgements.defining_requirement.requirement_id = 'R3';
    expect(errorsOf(raw)).toEqual([
      'judgement requires_overstretch: a true judgement needs a reason',
      'judgement defining_requirement: requirement_id must name a must-have requirement or be null',
    ]);
  });

  it('rejects a judgement that rests on a manual-note item', () => {
    const raw = valid();
    raw.judgements.strategic_exception = {
      value: true,
      reason: 'A strategic reason',
      cited_ids: ['R2', 'manual_note:note-1'],
    };
    expect(errorsOf(raw)).toEqual([
      'judgement strategic_exception: unknown cited id manual_note:note-1',
      'judgement strategic_exception: the reason must cite a requirement id and an evidence reference',
    ]);

    const cited = valid();
    cited.judgements.strategic_exception = {
      value: true,
      reason: 'A strategic reason',
      cited_ids: ['R2', 'project:alpha-service#wording-1'],
    };
    expect(errorsOf(cited)).toEqual([]);
  });

  it('rejects sections of the wrong shape', () => {
    const lists = valid() as unknown as Record<string, any>;
    lists.coverage = {};
    lists.eligibility = [];
    lists.risks = null;
    lists.score_deductions = 'none';
    lists.category_scores = [];
    lists.judgements = 'none';
    expect(errorsOf(lists)).toEqual([
      'coverage must be an array',
      'eligibility must be an object',
      'risks must be an array',
      'score_deductions must be an array',
      'category_scores must be an object',
      'judgements must be an object',
    ]);

    const items = valid() as unknown as Record<string, any>;
    items.coverage[0].is_core = 'yes';
    items.coverage[0].notes = null;
    items.coverage[1].evidence = 'none';
    items.coverage[2].evidence = [
      'credential:lab-one',
      { ref: 'credential:lab-one', strength: 'huge', provenance: 'gift' },
    ];
    items.coverage.push(7);
    items.eligibility.remote_location = { value: 'undetermined' };
    items.eligibility.other = [{ id: 'E1', value: 'compatible', note: '' }];
    items.risks.push({ category: 'agency' });
    items.risks[0].requirement_ids = ['R9'];
    items.risks[0].reason = '';
    items.score_deductions.push('K1');
    items.judgements.core_stack_close.cited_ids = 'R1';
    items.judgements.reached_by_core_gaps = true;
    items.judgements.defining_requirement = null;
    items.judgements.strategic_exception = {
      value: true,
      reason: 'A strategic reason',
      cited_ids: ['R1'],
    };
    expect(errorsOf(items)).toEqual([
      'coverage of R1: is_core must be a boolean',
      'coverage of R1: notes must be a string',
      'coverage of R2: evidence must be an array',
      'coverage of R3: evidence reference must be an object with a ref',
      'coverage of R3 reference credential:lab-one: unknown strength huge',
      'coverage of R3 reference credential:lab-one: unknown provenance gift',
      'coverage of R3 reference credential:lab-one: offered_for_display must be a boolean',
      'coverage of R3: basis training has no training reference (manual-note items never count)',
      'coverage[3]: object with a requirement_id expected',
      'eligibility.remote_location: note must be a string',
      'eligibility condition E1: label must be a non-empty string',
      'risk K1: reason must be a non-empty string',
      'risk K1: unknown requirement id R9',
      'risks[1]: object with a valid cause_id expected',
      'score_deductions[1]: object expected',
      'judgement core_stack_close: cited_ids must be a string array',
      'judgement reached_by_core_gaps: object with a boolean value expected',
      'judgement strategic_exception: the reason must cite a requirement id and an evidence reference',
      'judgement defining_requirement: object expected',
    ]);
  });

  it('rejects a narrative that does not fit the legacy fields', () => {
    const raw = valid() as unknown as Record<string, any>;
    raw.quality_score = 120;
    raw.top_reasons = 'one reason';
    raw.evidence_risks = [{ claim: 'Claim' }];
    raw.manual_note_forced_claims = [{ location: 'must_have[0]' }];
    expect(errorsOf(raw)).toEqual([
      'quality_score must be a number 0-100',
      'top_reasons must be a string array',
      'evidence_risks must be an array of { claim, status }',
      'Missing or invalid field: manual_note_forced_claims[0].text',
    ]);
    expect(errorsOf(42)).toEqual(['01b must be a JSON object']);
  });
});
