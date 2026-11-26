import {
  Credential,
  CredentialStatus,
  CredentialType,
  PortfolioProject,
} from '../../evidence/career-registry.parser';
import {
  AnalysisDecision,
  Decision,
  POLICY_ROW_IDS,
  PolicyRowId,
  PolicyTraceEntry,
} from './analysis-decision.schema';
import {
  DECISION_POLICY_VERSION,
  DecisionPolicyInputError,
  runDecisionPolicy,
} from './decision-policy';
import { EvidenceProvenance, buildEvidenceCatalog } from './evidence-catalog';
import {
  EvidenceBasis,
  EvidenceReference,
  EvidenceStrength,
  FitAssessment,
  Judgement,
  RiskCategory,
  RiskLevel,
  RiskLanguage,
  SCORE_CATEGORIES,
  SCORE_CATEGORY_MAX,
  ScoreCategory,
} from './fit-assessment.schema';
import {
  VacancyFactType,
  VacancyRequirements,
} from './vacancy-requirements.schema';

const SNAPSHOT = 'snapshot-1';

const FACT_QUOTES: Record<VacancyFactType, string> = {
  english_main_working_language: 'English is our main working language',
  commercial_experience_required: 'Commercial experience is required',
  optional_or_transferable: 'Listed technologies are optional and transferable',
  early_stage_role: 'We are an early-stage startup',
  lowers_evidence_bar: 'You do not need years, just built something real',
  senior_product_ownership_ask:
    'You will own the product as a senior product owner',
  agency_listing: 'posted by a recruiting agency on behalf of a client',
  equivalent_experience_accepted: 'Equivalent experience is accepted',
};
const GERMAN_QUOTE = 'Fluent German for client workshops is required';

const VACANCY = [
  'Backend Engineer, Senior level.',
  'Required: production experience with Node.js and TypeScript.',
  'Required: PostgreSQL schema design.',
  'Required: message queue integration.',
  'Nice to have: GraphQL. Bonus: conference talks.',
  `${GERMAN_QUOTE}.`,
  ...Object.values(FACT_QUOTES).map((quote) => `${quote}.`),
].join('\n');

const project = (
  id: string,
  title: string,
  cvEligible: boolean,
): PortfolioProject => ({
  id,
  title,
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

const credential = (
  id: string,
  type: CredentialType,
  status: CredentialStatus,
  cvEligible: boolean,
): Credential => ({
  id,
  title: id,
  aliases: [],
  issuer: 'Example Issuer',
  type,
  status,
  cvEligible,
  evidenceClass: 'training_verified',
  issued: null,
  credentialId: null,
  verificationUrl: null,
  skills: [],
  roleFamilies: [],
  aiCategory: null,
});

const CAREER_CASES = [
  '# Case 1 — Example commercial integration',
  '## 1. Context',
  'Text.',
  '## 2. Implementation',
  'Text.',
  '## 3. Result',
  'Text.',
  '# Case 2 — Example data migration',
  '## 1. Context',
  '# Case 3 — Example notification flow',
  '## 1. Context',
  '# Case 4 — Example reporting job',
  '## 1. Context',
  '# Case P1 — Alpha Service',
  '## Verified facts',
  '| Fact | Where |',
  '|---|---|',
  '| First fact | file-a |',
  '| Second fact | file-b |',
].join('\n');

const catalog = buildEvidenceCatalog({
  snapshotId: SNAPSHOT,
  careerCasesText: CAREER_CASES,
  projects: [project('alpha-service', 'Alpha Service', true)],
  credentials: [credential('sample-badge', 'skill_badge', 'earned', true)],
});

const COMMERCIAL_1 = 'case:1#section-1';
const COMMERCIAL_1_OTHER_SECTION = 'case:1#section-2';
const COMMERCIAL_2 = 'case:2#section-1';
const COMMERCIAL_3 = 'case:4';
const COMMERCIAL_CASE = 'case:3';
const PERSONAL_1 = 'project:alpha-service#fact-1';
const PERSONAL_2 = 'project:alpha-service#fact-2';
const TRAINING = 'credential:sample-badge';

const ref = (
  key: string,
  provenance: EvidenceProvenance,
  strength: EvidenceStrength = 'strong',
): EvidenceReference => ({
  ref: key,
  snapshot_id: provenance === 'manual_note' ? null : SNAPSHOT,
  strength,
  provenance,
  offered_for_display: false,
});

const no = (): Judgement => ({ value: false, reason: '', cited_ids: [] });
const yes = (cited: string[] = ['R1']): Judgement => ({
  value: true,
  reason: 'Stated reason',
  cited_ids: cited,
});

// Fills the six sub-scores in order up to their maxima so that they sum to `total`.
const scoresFor = (total: number): Record<ScoreCategory, number> => {
  let left = total;
  const scores = {} as Record<ScoreCategory, number>;
  for (const category of SCORE_CATEGORIES) {
    const value = Math.min(SCORE_CATEGORY_MAX[category], left);
    scores[category] = value;
    left -= value;
  }
  return scores;
};

interface Fixture {
  requirements: VacancyRequirements;
  assessment: FitAssessment;
}

const fixture = (score = 85): Fixture => ({
  requirements: {
    contract_version: '1.0',
    seniority: { level: 'unspecified', quote: null },
    requirements: [
      {
        id: 'R1',
        kind: 'must_have',
        text: 'Node.js and TypeScript',
        quote: 'production experience with Node.js and TypeScript',
      },
      {
        id: 'R2',
        kind: 'must_have',
        text: 'PostgreSQL schema design',
        quote: 'PostgreSQL schema design',
      },
      {
        id: 'R3',
        kind: 'must_have',
        text: 'Message queue integration',
        quote: 'message queue integration',
      },
      { id: 'R4', kind: 'nice_to_have', text: 'GraphQL', quote: 'GraphQL' },
      {
        id: 'R5',
        kind: 'wishlist',
        text: 'Conference talks',
        quote: 'conference talks',
      },
    ],
    facts: [],
    languages: [],
    hidden_role_logic: ['Integration reliability'],
  },
  assessment: {
    contract_version: '1.0',
    snapshot_id: SNAPSHOT,
    coverage: [
      {
        requirement_id: 'R1',
        is_core: true,
        basis: 'commercial',
        evidence: [ref(COMMERCIAL_1, 'commercial')],
        notes: 'Main backend stack',
      },
      {
        requirement_id: 'R2',
        is_core: true,
        basis: 'commercial',
        evidence: [ref(COMMERCIAL_2, 'commercial')],
        notes: '',
      },
      {
        requirement_id: 'R3',
        is_core: true,
        basis: 'commercial',
        evidence: [ref(COMMERCIAL_CASE, 'commercial')],
        notes: '',
      },
      {
        requirement_id: 'R4',
        is_core: false,
        basis: 'personal',
        evidence: [ref(PERSONAL_2, 'personal', 'partial')],
        notes: '',
      },
      {
        requirement_id: 'R5',
        is_core: false,
        basis: 'none',
        evidence: [],
        notes: 'Not covered',
      },
    ],
    eligibility: {
      work_authorisation: { value: 'compatible', note: '' },
      remote_location: { value: 'compatible', note: '' },
      mandatory_language: { value: 'compatible', note: '' },
      other: [],
    },
    risks: [],
    score_deductions: [],
    category_scores: scoresFor(score),
    judgements: {
      requires_overstretch: no(),
      ownership_unsupported: no(),
      core_stack_close: yes(),
      main_risk_manageable: yes(),
      reached_by_core_gaps: no(),
      product_evidence_strong: no(),
      all_fits_very_strong: no(),
      strategic_exception: no(),
      role_family: { value: 'backend', reason: 'Backend role', cited_ids: [] },
      defining_requirement: { requirement_id: null, reason: '', cited_ids: [] },
    },
    quality_score: 90,
    summary: 'Summary',
    top_reasons: ['Reason'],
    recommended_next_action: 'Generate targeted CV content',
    evidence_risks: [],
    manual_note_forced_claims: [],
  },
});

const run = (fx: Fixture, advisory: Decision = 'apply'): AnalysisDecision =>
  runDecisionPolicy(
    {
      vacancyText: VACANCY,
      requirements: fx.requirements,
      assessment: fx.assessment,
      catalog,
    },
    advisory,
  );

// Runs once to learn the policy decision, then again with an advisory decision equal to it.
const runAgreeing = (fx: Fixture): AnalysisDecision =>
  run(fx, run(fx).decision);

const rejection = (fx: Fixture): DecisionPolicyInputError => {
  try {
    run(fx);
  } catch (error) {
    if (error instanceof DecisionPolicyInputError) return error;
    throw error;
  }
  throw new Error('the policy accepted the input');
};

const addFact = (fx: Fixture, type: VacancyFactType, ids: string[] = []) =>
  fx.requirements.facts.push({
    id: `F${fx.requirements.facts.length + 1}`,
    type,
    quote: FACT_QUOTES[type],
    requirement_ids: ids,
  });

const addRisk = (
  fx: Fixture,
  causeId: string,
  category: RiskCategory,
  level: RiskLevel,
  requirementIds: string[] = [],
  language: RiskLanguage | null = null,
) =>
  fx.assessment.risks.push({
    cause_id: causeId,
    category,
    level,
    language,
    requirement_ids: requirementIds,
    reason: `Risk ${causeId}`,
  });

const setCoverage = (
  fx: Fixture,
  requirementId: string,
  basis: EvidenceBasis,
  evidence: EvidenceReference[],
) => {
  const row = fx.assessment.coverage.find(
    (item) => item.requirement_id === requirementId,
  );
  if (!row) throw new Error(`no coverage row ${requirementId}`);
  row.basis = basis;
  row.evidence = evidence;
};

const makeSenior = (fx: Fixture) => {
  fx.requirements.seniority = { level: 'senior', quote: 'Senior level' };
};

const addExternalGerman = (fx: Fixture) =>
  fx.requirements.languages.push({
    id: 'L1',
    language: 'german',
    level: 'fluent',
    need: 'mandatory',
    usage: 'external',
    quote: GERMAN_QUOTE,
  });

const defineRequirement = (fx: Fixture, id: string) => {
  fx.assessment.judgements.defining_requirement = {
    requirement_id: id,
    reason: 'Primary ask of the role',
    cited_ids: [id],
  };
};

const fEntryOf = (result: AnalysisDecision): PolicyTraceEntry => {
  const entry = result.trace.find((item) => item.row === 'F');
  if (!entry) throw new Error('no F entry');
  return entry;
};

const appliedRows = (result: AnalysisDecision): PolicyRowId[] =>
  result.trace.filter((entry) => entry.applied).map((entry) => entry.row);

interface PolicyCase {
  name: string;
  setup: (fx: Fixture) => void;
  score?: number;
  // the Appendix row this case covers; by default the deciding rule
  row?: PolicyRowId;
  // null: the input is rejected under row V, no decision is made
  decision: Decision | null;
  rule: PolicyRowId;
  borderline?: boolean;
  manualReview?: boolean;
  // the model's advisory decision; by default it agrees with the policy
  advisory?: Decision;
}

const POLICY_CASES: PolicyCase[] = [
  {
    name: 'V trigger: a quote that is not in the vacancy',
    setup: (fx) => {
      fx.requirements.requirements[0].quote = 'a phrase the vacancy lacks';
    },
    decision: null,
    rule: 'V',
  },
  {
    name: 'V trigger: a reference outside the snapshot catalog',
    setup: (fx) => {
      fx.assessment.coverage[0].evidence[0].ref = 'case:9';
    },
    decision: null,
    rule: 'V',
  },
  {
    name: 'V trigger: a sub-score out of its range',
    setup: (fx) => {
      fx.assessment.category_scores.domain_product = 9;
    },
    decision: null,
    rule: 'V',
  },
  {
    name: 'V precedes H: an invalid input with an H1 trigger is still rejected',
    setup: (fx) => {
      addExternalGerman(fx);
      addRisk(fx, 'K1', 'core_stack', 'medium');
      addRisk(fx, 'K1', 'seniority', 'medium');
    },
    decision: null,
    rule: 'V',
  },
  {
    name: 'F: manual review for an undetermined mandatory language',
    row: 'F',
    setup: (fx) => {
      fx.assessment.eligibility.mandatory_language.value = 'undetermined';
    },
    decision: 'apply',
    rule: 'B1',
    manualReview: true,
    borderline: false,
  },
  {
    name: 'F: borderline near a threshold never rewrites the decision',
    row: 'F',
    score: 73,
    setup: () => {},
    decision: 'apply',
    rule: 'B2',
    borderline: true,
  },
  {
    name: 'F: a differing advisory decision is borderline only',
    row: 'F',
    advisory: 'skip',
    setup: () => {},
    decision: 'apply',
    rule: 'B1',
    borderline: true,
  },
  {
    name: 'H1 trigger: fluent German for external communication',
    setup: addExternalGerman,
    decision: 'skip',
    rule: 'H1',
  },
  {
    name: 'H1 exception: English is the main working language',
    setup: (fx) => {
      addExternalGerman(fx);
      addFact(fx, 'english_main_working_language');
    },
    decision: 'apply',
    rule: 'B1',
  },
  {
    name: 'H1 before H2',
    setup: (fx) => {
      addExternalGerman(fx);
      fx.assessment.eligibility.work_authorisation.value = 'incompatible';
    },
    decision: 'skip',
    rule: 'H1',
  },
  {
    name: 'H2 trigger: an incompatible eligibility condition',
    setup: (fx) => {
      fx.assessment.eligibility.remote_location.value = 'incompatible';
    },
    decision: 'skip',
    rule: 'H2',
  },
  {
    name: 'H2 trigger: an incompatible other condition',
    setup: (fx) => {
      fx.assessment.eligibility.other.push({
        id: 'E1',
        label: 'On-call rotation',
        value: 'incompatible',
        note: '',
      });
    },
    decision: 'skip',
    rule: 'H2',
  },
  {
    name: 'H2 exception: undetermined never triggers H2',
    setup: (fx) => {
      fx.assessment.eligibility.work_authorisation.value = 'undetermined';
    },
    decision: 'apply',
    rule: 'B1',
  },
  {
    name: 'H2 before H3',
    setup: (fx) => {
      fx.assessment.eligibility.work_authorisation.value = 'incompatible';
      fx.assessment.judgements.role_family.value = 'qa';
    },
    decision: 'skip',
    rule: 'H2',
  },
  {
    name: 'H3 trigger: an excluded role family',
    setup: (fx) => {
      fx.assessment.judgements.role_family.value = 'data_science';
    },
    decision: 'skip',
    rule: 'H3',
  },
  {
    name: 'H4 trigger: commercial experience required, no commercial basis',
    setup: (fx) => {
      defineRequirement(fx, 'R1');
      addFact(fx, 'commercial_experience_required', ['R1']);
      setCoverage(fx, 'R1', 'personal', [ref(PERSONAL_1, 'personal')]);
    },
    decision: 'skip',
    rule: 'H4',
  },
  {
    name: 'H4 exception: a transferable commercial basis goes to C4',
    setup: (fx) => {
      defineRequirement(fx, 'R1');
      addFact(fx, 'commercial_experience_required', ['R1']);
      setCoverage(fx, 'R1', 'commercial_transferable', [
        ref(COMMERCIAL_1, 'commercial'),
      ]);
    },
    decision: 'apply',
    rule: 'B1',
    borderline: true,
  },
  {
    name: 'H5 trigger: the CV would need exaggeration',
    setup: (fx) => {
      fx.assessment.judgements.requires_overstretch = yes();
    },
    decision: 'skip',
    rule: 'H5',
    borderline: true,
  },
  {
    name: 'H6 trigger: unsupported ownership',
    setup: (fx) => {
      fx.assessment.judgements.ownership_unsupported = yes();
    },
    decision: 'skip',
    rule: 'H6',
    borderline: true,
  },
  {
    name: 'H7 trigger: fewer than 2 credible points',
    setup: (fx) => {
      setCoverage(fx, 'R2', 'commercial', [
        ref(COMMERCIAL_2, 'commercial', 'weak'),
      ]);
      setCoverage(fx, 'R3', 'commercial', [
        ref(COMMERCIAL_CASE, 'commercial', 'weak'),
      ]);
      setCoverage(fx, 'R4', 'none', []);
    },
    decision: 'skip',
    rule: 'H7',
  },
  {
    name: 'H7 excludes manual-note points',
    setup: (fx) => {
      setCoverage(fx, 'R2', 'commercial', [
        ref(COMMERCIAL_2, 'commercial', 'weak'),
        ref('manual_note:note-1', 'manual_note'),
      ]);
      setCoverage(fx, 'R3', 'commercial', [
        ref(COMMERCIAL_CASE, 'commercial', 'weak'),
        ref('manual_note:note-2', 'manual_note'),
      ]);
      setCoverage(fx, 'R4', 'none', [ref('manual_note:note-3', 'manual_note')]);
    },
    decision: 'skip',
    rule: 'H7',
  },
  {
    name: 'H7 excludes training-only points',
    setup: (fx) => {
      setCoverage(fx, 'R2', 'training', [ref(TRAINING, 'training')]);
      setCoverage(fx, 'R3', 'commercial', [
        ref(COMMERCIAL_CASE, 'commercial', 'weak'),
      ]);
      setCoverage(fx, 'R4', 'none', []);
    },
    decision: 'skip',
    rule: 'H7',
  },
  {
    name: 'H precedes B: H5 decides over a strong score',
    score: 98,
    setup: (fx) => {
      fx.assessment.judgements.requires_overstretch = yes();
    },
    decision: 'skip',
    rule: 'H5',
    borderline: true,
  },
  {
    name: 'B1 trigger: score 75 or more',
    decision: 'apply',
    rule: 'B1',
    setup: () => {},
  },
  {
    name: 'B1 exception: fewer than 3 strong points is borderline only',
    setup: (fx) => {
      setCoverage(fx, 'R3', 'commercial', [
        ref(COMMERCIAL_CASE, 'commercial', 'partial'),
      ]);
    },
    decision: 'apply',
    rule: 'B1',
    borderline: true,
  },
  {
    name: 'B2 trigger: apply',
    score: 70,
    decision: 'apply',
    rule: 'B2',
    setup: () => {},
  },
  {
    name: 'B2 trigger: maybe when the core stack is not close',
    score: 70,
    setup: (fx) => {
      fx.assessment.judgements.core_stack_close = no();
    },
    decision: 'maybe',
    rule: 'B2',
  },
  {
    name: 'B2: maybe with a seniority category of medium',
    score: 70,
    setup: (fx) => addRisk(fx, 'Q1', 'seniority', 'medium'),
    decision: 'maybe',
    rule: 'B2',
  },
  {
    name: 'B2: maybe with fewer than 3 strong points',
    score: 70,
    setup: (fx) => {
      setCoverage(fx, 'R3', 'commercial', [
        ref(COMMERCIAL_CASE, 'commercial', 'partial'),
      ]);
    },
    decision: 'maybe',
    rule: 'B2',
  },
  {
    name: 'B2 exception: undetermined eligibility does not block apply',
    score: 70,
    setup: (fx) => {
      fx.assessment.eligibility.work_authorisation.value = 'undetermined';
    },
    decision: 'apply',
    rule: 'B2',
    manualReview: true,
  },
  {
    name: 'B3 trigger: maybe',
    score: 60,
    decision: 'maybe',
    rule: 'B3',
    setup: () => {},
  },
  {
    name: 'B3: skip when reached through core gaps',
    score: 60,
    setup: (fx) => {
      fx.assessment.judgements.reached_by_core_gaps = yes();
    },
    decision: 'skip',
    rule: 'B3',
  },
  {
    name: 'B3: skip when the main risk is not manageable',
    score: 60,
    setup: (fx) => {
      fx.assessment.judgements.main_risk_manageable = no();
    },
    decision: 'skip',
    rule: 'B3',
  },
  {
    name: 'B4 trigger: below 55',
    score: 45,
    decision: 'skip',
    rule: 'B4',
    setup: () => {},
  },
  {
    name: 'B4 exception: no exception is named, so a differing advisory is borderline',
    score: 45,
    advisory: 'maybe',
    setup: () => {},
    decision: 'skip',
    rule: 'B4',
    borderline: true,
  },
  {
    name: 'C1 trigger: two core gaps cap at maybe',
    setup: (fx) => {
      setCoverage(fx, 'R2', 'personal', [ref(PERSONAL_1, 'personal')]);
      setCoverage(fx, 'R3', 'training', [ref(TRAINING, 'training')]);
    },
    decision: 'maybe',
    rule: 'C1',
  },
  {
    name: 'C1: a transferable commercial basis still counts as a gap',
    setup: (fx) => {
      setCoverage(fx, 'R2', 'commercial_transferable', [
        ref(COMMERCIAL_2, 'commercial'),
      ]);
      setCoverage(fx, 'R3', 'commercial_transferable', [
        ref(COMMERCIAL_CASE, 'commercial'),
      ]);
    },
    decision: 'maybe',
    rule: 'C1',
  },
  {
    name: 'C1 trigger: senior role skips',
    setup: (fx) => {
      makeSenior(fx);
      setCoverage(fx, 'R2', 'personal', [ref(PERSONAL_1, 'personal')]);
      setCoverage(fx, 'R3', 'training', [ref(TRAINING, 'training')]);
    },
    decision: 'skip',
    rule: 'C1',
  },
  {
    name: 'C1 exception: optional or transferable technologies lift the senior skip',
    setup: (fx) => {
      makeSenior(fx);
      setCoverage(fx, 'R2', 'personal', [ref(PERSONAL_1, 'personal')]);
      setCoverage(fx, 'R3', 'training', [ref(TRAINING, 'training')]);
      addFact(fx, 'optional_or_transferable', ['R2', 'R3']);
    },
    decision: 'maybe',
    rule: 'C1',
  },
  {
    name: 'C2 trigger: early-stage role without product evidence',
    setup: (fx) => {
      addFact(fx, 'early_stage_role');
      fx.assessment.judgements.all_fits_very_strong = yes();
    },
    decision: 'maybe',
    rule: 'C2',
  },
  {
    name: 'C2 exception: strong product evidence and all fits very strong',
    setup: (fx) => {
      addFact(fx, 'early_stage_role');
      fx.assessment.judgements.product_evidence_strong = yes();
      fx.assessment.judgements.all_fits_very_strong = yes();
    },
    decision: 'apply',
    rule: 'B1',
  },
  {
    name: 'C2 exception: a lowered evidence bar removes the product-evidence part',
    setup: (fx) => {
      addFact(fx, 'early_stage_role');
      addFact(fx, 'lowers_evidence_bar');
      fx.assessment.judgements.all_fits_very_strong = yes();
    },
    decision: 'apply',
    rule: 'B1',
  },
  {
    name: 'C2: a lowered bar does not apply to a senior product-owner ask',
    setup: (fx) => {
      addFact(fx, 'early_stage_role');
      addFact(fx, 'lowers_evidence_bar');
      addFact(fx, 'senior_product_ownership_ask');
      fx.assessment.judgements.all_fits_very_strong = yes();
    },
    decision: 'maybe',
    rule: 'C2',
  },
  {
    name: 'C2: an undetermined location prevents "all fits very strong"',
    setup: (fx) => {
      addFact(fx, 'early_stage_role');
      fx.assessment.judgements.product_evidence_strong = yes();
      fx.assessment.judgements.all_fits_very_strong = yes();
      fx.assessment.eligibility.remote_location.value = 'undetermined';
    },
    decision: 'maybe',
    rule: 'C2',
  },
  {
    name: 'C3 trigger: agency listing with another medium category',
    setup: (fx) => {
      addFact(fx, 'agency_listing');
      addRisk(fx, 'K1', 'core_stack', 'medium', ['R2']);
    },
    decision: 'maybe',
    rule: 'C3',
  },
  {
    name: 'C3: an agency listing alone does not cap',
    setup: (fx) => addFact(fx, 'agency_listing'),
    decision: 'apply',
    rule: 'B1',
  },
  {
    name: 'C4 trigger: personal basis for the defining requirement',
    setup: (fx) => {
      defineRequirement(fx, 'R1');
      setCoverage(fx, 'R1', 'personal', [ref(PERSONAL_1, 'personal')]);
    },
    decision: 'maybe',
    rule: 'C4',
  },
  {
    name: 'C4 trigger: with another category of high, skip',
    setup: (fx) => {
      defineRequirement(fx, 'R1');
      setCoverage(fx, 'R1', 'personal', [ref(PERSONAL_1, 'personal')]);
      addRisk(fx, 'Q1', 'seniority', 'high');
    },
    decision: 'skip',
    rule: 'C4',
  },
  {
    name: 'C4: a medium risk elsewhere does not push to skip',
    setup: (fx) => {
      defineRequirement(fx, 'R1');
      setCoverage(fx, 'R1', 'personal', [ref(PERSONAL_1, 'personal')]);
      addRisk(fx, 'D1', 'devops_platform', 'medium');
    },
    decision: 'maybe',
    rule: 'C4',
  },
  {
    name: 'C4: a high risk in another category counts even when it cites the defining requirement',
    setup: (fx) => {
      defineRequirement(fx, 'R1');
      setCoverage(fx, 'R1', 'personal', [ref(PERSONAL_1, 'personal')]);
      addRisk(fx, 'K1', 'core_stack', 'medium', ['R1']);
      addRisk(fx, 'Q1', 'seniority', 'high', ['R1']);
    },
    decision: 'skip',
    rule: 'C4',
  },
  {
    name: 'C4: the defining gap’s own high category is not "another" category',
    setup: (fx) => {
      defineRequirement(fx, 'R1');
      setCoverage(fx, 'R1', 'personal', [ref(PERSONAL_1, 'personal')]);
      addRisk(fx, 'K1', 'core_stack', 'high', ['R1']);
    },
    decision: 'maybe',
    rule: 'C4',
  },
  {
    name: 'C4 exception: equivalent experience accepted',
    setup: (fx) => {
      defineRequirement(fx, 'R1');
      setCoverage(fx, 'R1', 'personal', [ref(PERSONAL_1, 'personal')]);
      addFact(fx, 'equivalent_experience_accepted', ['R1']);
    },
    decision: 'apply',
    rule: 'B1',
  },
  {
    name: 'C4 exception: the vacancy lowers its evidence bar',
    setup: (fx) => {
      defineRequirement(fx, 'R1');
      setCoverage(fx, 'R1', 'personal', [ref(PERSONAL_1, 'personal')]);
      addFact(fx, 'lowers_evidence_bar');
    },
    decision: 'apply',
    rule: 'B1',
  },
  {
    name: 'C4 exception: a transferable commercial basis — no cap, borderline',
    setup: (fx) => {
      defineRequirement(fx, 'R1');
      setCoverage(fx, 'R1', 'commercial_transferable', [
        ref(COMMERCIAL_1, 'commercial'),
      ]);
    },
    decision: 'apply',
    rule: 'B1',
    borderline: true,
  },
  {
    name: 'C5 trigger: English risk high with core-stack gaps',
    setup: (fx) => {
      addRisk(fx, 'E1', 'language', 'high', [], 'english');
      addRisk(fx, 'K1', 'core_stack', 'medium', ['R2']);
    },
    decision: 'maybe',
    rule: 'C5',
    borderline: true,
  },
  {
    name: 'C5 interaction: no separate downgrade, English counts once in S1',
    setup: (fx) => {
      addRisk(fx, 'E1', 'language', 'high', [], 'english');
      addRisk(fx, 'E2', 'language', 'medium', [], 'english');
      addRisk(fx, 'K1', 'core_stack', 'medium', ['R2']);
      addRisk(fx, 'Q1', 'seniority', 'medium');
    },
    decision: 'skip',
    rule: 'S1',
    borderline: true,
  },
  {
    name: 'C5 interaction: with two categories the cap alone decides',
    setup: (fx) => {
      addRisk(fx, 'E1', 'language', 'high', [], 'english');
      addRisk(fx, 'E2', 'language', 'medium', [], 'english');
      addRisk(fx, 'K1', 'core_stack', 'medium', ['R2']);
    },
    decision: 'maybe',
    rule: 'C5',
    borderline: true,
  },
  {
    name: 'C5: a German language risk is not the English rule',
    setup: (fx) => {
      addRisk(fx, 'G1', 'language', 'high', [], 'german');
      addRisk(fx, 'K1', 'core_stack', 'medium', ['R2']);
    },
    decision: 'apply',
    rule: 'B1',
  },
  {
    name: 'C precedence: the lowest cap decides, C1 skip over C4 maybe',
    setup: (fx) => {
      makeSenior(fx);
      defineRequirement(fx, 'R1');
      setCoverage(fx, 'R1', 'personal', [ref(PERSONAL_1, 'personal')]);
      setCoverage(fx, 'R2', 'training', [ref(TRAINING, 'training')]);
    },
    decision: 'skip',
    rule: 'C1',
  },
  {
    name: 'S1 trigger: three medium categories go one level down',
    setup: (fx) => {
      addRisk(fx, 'K1', 'core_stack', 'medium');
      addRisk(fx, 'Q1', 'seniority', 'medium');
      addRisk(fx, 'D1', 'devops_platform', 'medium');
    },
    decision: 'maybe',
    rule: 'S1',
  },
  {
    name: 'S1 after a cap: C3 maybe, then S1 skip (agency counts)',
    setup: (fx) => {
      addFact(fx, 'agency_listing');
      addRisk(fx, 'K1', 'core_stack', 'medium');
      addRisk(fx, 'Q1', 'seniority', 'medium');
    },
    decision: 'skip',
    rule: 'S1',
  },
  {
    name: 'S1: low risks do not stack',
    setup: (fx) => {
      addRisk(fx, 'K1', 'core_stack', 'low');
      addRisk(fx, 'Q1', 'seniority', 'low');
      addRisk(fx, 'D1', 'devops_platform', 'low');
    },
    decision: 'apply',
    rule: 'B1',
  },
  {
    name: 'S2 trigger: senior role with four categories',
    setup: (fx) => {
      makeSenior(fx);
      addRisk(fx, 'K1', 'core_stack', 'medium');
      addRisk(fx, 'Q1', 'seniority', 'medium');
      addRisk(fx, 'D1', 'devops_platform', 'medium');
      addRisk(fx, 'V1', 'evidence_quality', 'medium');
    },
    decision: 'skip',
    rule: 'S2',
  },
  {
    name: 'S2 exception: a strategic exception gives the S1 result',
    setup: (fx) => {
      makeSenior(fx);
      addRisk(fx, 'K1', 'core_stack', 'medium');
      addRisk(fx, 'Q1', 'seniority', 'medium');
      addRisk(fx, 'D1', 'devops_platform', 'medium');
      addRisk(fx, 'V1', 'evidence_quality', 'medium');
      fx.assessment.judgements.strategic_exception = yes(['R1', COMMERCIAL_1]);
    },
    decision: 'maybe',
    rule: 'S2',
    borderline: true,
  },
  {
    name: 'S2: four categories in a mid-level role stay with S1',
    setup: (fx) => {
      addRisk(fx, 'K1', 'core_stack', 'medium');
      addRisk(fx, 'Q1', 'seniority', 'medium');
      addRisk(fx, 'D1', 'devops_platform', 'medium');
      addRisk(fx, 'V1', 'evidence_quality', 'medium');
    },
    decision: 'maybe',
    rule: 'S1',
  },
];

describe('decision policy (ADR-046 Appendix)', () => {
  it('returns an identical decision and trace for identical input', () => {
    const first = run(fixture(68), 'maybe');
    const second = run(fixture(68), 'maybe');
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.policy_version).toBe(DECISION_POLICY_VERSION);
  });

  it('covers trigger, exception and precedence of every Appendix row', () => {
    for (const policyCase of POLICY_CASES) {
      const fx = fixture(policyCase.score ?? 85);
      policyCase.setup(fx);
      if (policyCase.decision === null) {
        const error = rejection(fx);
        expect({
          case: policyCase.name,
          decision: null,
          rule: error.row,
        }).toEqual({ case: policyCase.name, decision: null, rule: 'V' });
        continue;
      }
      const result = policyCase.advisory
        ? run(fx, policyCase.advisory)
        : runAgreeing(fx);
      expect({
        case: policyCase.name,
        decision: result.decision,
        rule: result.deciding_rule,
        tracedRule: fEntryOf(result).inputs.deciding_rule,
        isRuleApplied: appliedRows(result).includes(policyCase.rule),
        isRowApplied: appliedRows(result).includes(
          policyCase.row ?? policyCase.rule,
        ),
      }).toEqual({
        case: policyCase.name,
        decision: policyCase.decision,
        rule: policyCase.rule,
        tracedRule: policyCase.rule,
        isRuleApplied: true,
        isRowApplied: true,
      });
      if (policyCase.borderline !== undefined) {
        expect({
          case: policyCase.name,
          borderline: result.borderline,
        }).toEqual({
          case: policyCase.name,
          borderline: policyCase.borderline,
        });
      }
      if (policyCase.manualReview !== undefined) {
        expect({
          case: policyCase.name,
          manual: result.manual_review_required,
        }).toEqual({ case: policyCase.name, manual: policyCase.manualReview });
      }
    }

    // Every Appendix row id, V and F included, has at least one table case.
    const rowsCovered = new Set(
      POLICY_CASES.map((item) => item.row ?? item.rule),
    );
    for (const row of POLICY_ROW_IDS) {
      expect({ row, isCovered: rowsCovered.has(row) }).toEqual({
        row,
        isCovered: true,
      });
    }

    // F: the flags and the deciding rule are recorded after the decision.
    const flagged = fixture();
    flagged.assessment.eligibility.mandatory_language.value = 'undetermined';
    const result = runAgreeing(flagged);
    expect(result.decision).toBe('apply');
    expect(fEntryOf(result)).toEqual(
      expect.objectContaining({
        row: 'F',
        applied: true,
        inputs: expect.objectContaining({
          deciding_rule: 'B1',
          manual_review_required: true,
          open_questions: ['eligibility.mandatory_language'],
        }),
      }),
    );
    // Order: every traced row appears in the Appendix order.
    const order = result.trace.map((entry) => entry.row);
    expect(order[0]).toBe('V');
    expect(order.slice(1, 8)).toEqual([
      'H1',
      'H2',
      'H3',
      'H4',
      'H5',
      'H6',
      'H7',
    ]);
    expect(order.slice(8)).toEqual([
      'B1',
      'C1',
      'C2',
      'C3',
      'C4',
      'C5',
      'S1',
      'S2',
      'F',
      'F',
    ]);
  });

  it('counts a career case once however many of its sections are cited', () => {
    const fx = fixture(70);
    setCoverage(fx, 'R2', 'commercial', [
      ref(COMMERCIAL_1_OTHER_SECTION, 'commercial'),
    ]);
    setCoverage(fx, 'R3', 'commercial', [ref('case:1', 'commercial')]);
    const result = runAgreeing(fx);
    expect(result.counts.strong_points).toBe(1);
    expect(result.counts.credible_points).toBe(2);
    expect(result.decision).toBe('maybe');
    expect(result.deciding_rule).toBe('B2');
    // distinct items of one project count separately
    const items = fixture(70);
    setCoverage(items, 'R2', 'personal', [ref(PERSONAL_1, 'personal')]);
    setCoverage(items, 'R3', 'personal', [ref(PERSONAL_2, 'personal')]);
    expect(runAgreeing(items).counts.strong_points).toBe(3);
  });

  it('counts a German requirement as one language risk at its level', () => {
    const german = (
      need: 'mandatory' | 'preferred' | 'nice_to_have',
      usage: 'internal' | 'external' = 'internal',
    ) => {
      const fx = fixture(70);
      fx.requirements.languages.push({
        id: 'L1',
        language: 'german',
        level: 'c1',
        need,
        usage,
        quote: GERMAN_QUOTE,
      });
      return fx;
    };
    const preferred = runAgreeing(german('preferred'));
    expect(preferred.decision).toBe('maybe');
    expect(preferred.deciding_rule).toBe('B2');
    expect(preferred.counts.stacking_categories).toEqual(['language']);

    expect(runAgreeing(german('nice_to_have')).decision).toBe('apply');

    // with English as the main language, external fluent German is a plus: medium
    const plus = german('mandatory', 'external');
    addFact(plus, 'english_main_working_language');
    expect(runAgreeing(plus).counts.stacking_categories).toEqual(['language']);

    // the level matters: with a personal-only defining requirement, a high German
    // risk is "another category of high" for C4 (skip), a medium one is not (maybe)
    const withDefiningGap = (fx: Fixture) => {
      defineRequirement(fx, 'R1');
      setCoverage(fx, 'R1', 'personal', [ref(PERSONAL_1, 'personal')]);
      return runAgreeing(fx);
    };
    const plusGap = german('mandatory', 'external');
    addFact(plusGap, 'english_main_working_language');
    expect(withDefiningGap(plusGap).decision).toBe('maybe');
    expect(withDefiningGap(german('preferred')).decision).toBe('maybe');
    const internalGap = withDefiningGap(german('mandatory'));
    expect(internalGap.decision).toBe('skip');
    expect(internalGap.deciding_rule).toBe('C4');

    // recorded and derived German risks are one category, never two
    const internal = german('mandatory');
    addRisk(internal, 'G1', 'language', 'medium', [], 'german');
    addRisk(internal, 'Q1', 'seniority', 'medium');
    addRisk(internal, 'D1', 'devops_platform', 'medium');
    const stacked = runAgreeing(internal);
    expect(stacked.counts.stacking_categories).toEqual([
      'language',
      'seniority',
      'devops_platform',
    ]);
    expect(stacked.deciding_rule).toBe('S1');
  });

  it('ignores a location risk while the location condition is undetermined', () => {
    const withLocation = (value: 'compatible' | 'undetermined') => {
      const fx = fixture(85);
      fx.assessment.eligibility.remote_location.value = value;
      addRisk(fx, 'L1', 'location_remote', 'medium');
      addRisk(fx, 'K1', 'core_stack', 'medium');
      addRisk(fx, 'Q1', 'seniority', 'medium');
      return runAgreeing(fx);
    };
    const known = withLocation('compatible');
    expect(known.decision).toBe('maybe');
    expect(known.deciding_rule).toBe('S1');
    const unknown = withLocation('undetermined');
    expect(unknown.decision).toBe('apply');
    expect(unknown.counts.stacking_categories).toEqual([
      'core_stack',
      'seniority',
    ]);
    expect(unknown.trace[0].inputs.risks_of_undetermined_location).toEqual([
      'L1',
    ]);
  });

  it('applies the band rows at their exact boundaries', () => {
    const bands: Array<[number, PolicyRowId, Decision]> = [
      [100, 'B1', 'apply'],
      [75, 'B1', 'apply'],
      [74, 'B2', 'apply'],
      [65, 'B2', 'apply'],
      [64, 'B3', 'maybe'],
      [55, 'B3', 'maybe'],
      [54, 'B4', 'skip'],
      [0, 'B4', 'skip'],
    ];
    for (const [score, rule, decision] of bands) {
      const fx = fixture(score);
      fx.assessment.category_scores = scoresFor(score);
      const result = runAgreeing(fx);
      expect({
        score,
        rule: result.deciding_rule,
        decision: result.decision,
      }).toEqual({ score, rule, decision });
    }
  });

  it('clamps the language sub-score by the German cap before the sum', () => {
    const preferred = fixture(85);
    addExternalGerman(preferred);
    addFact(preferred, 'english_main_working_language');
    const lifted = runAgreeing(preferred);
    expect(lifted.category_scores.language_location).toBe(12);
    expect(lifted.score).toBe(79);

    const internal = fixture(85);
    internal.requirements.languages.push({
      id: 'L1',
      language: 'german',
      level: 'c1',
      need: 'mandatory',
      usage: 'internal',
      quote: GERMAN_QUOTE,
    });
    expect(runAgreeing(internal).category_scores.language_location).toBe(8);

    const plus = fixture(85);
    plus.requirements.languages.push({
      id: 'L1',
      language: 'german',
      level: 'b1',
      need: 'nice_to_have',
      usage: 'unclear',
      quote: GERMAN_QUOTE,
    });
    const unclamped = runAgreeing(plus);
    expect(unclamped.category_scores.language_location).toBe(18);
    expect(unclamped.score).toBe(85);
  });

  it('rejects a cause counted in two categories', () => {
    const twoRisks = fixture();
    addRisk(twoRisks, 'K1', 'core_stack', 'medium');
    addRisk(twoRisks, 'K1', 'evidence_quality', 'medium');
    const error = rejection(twoRisks);
    expect(error.row).toBe('V');
    expect(error.issues.join(' ')).toContain(
      'cause K1 is counted in two categories',
    );

    const twoScoreCategories = fixture();
    addRisk(twoScoreCategories, 'K1', 'core_stack', 'medium');
    twoScoreCategories.assessment.score_deductions.push(
      { cause_id: 'K1', category: 'tech_stack', points: 4 },
      { cause_id: 'K1', category: 'evidence_quality', points: 2 },
    );
    expect(rejection(twoScoreCategories).issues.join(' ')).toContain(
      'cause K1 is counted in two categories',
    );
  });

  it('accepts one cause that lowers one sub-score, counts once and triggers a cap', () => {
    const fx = fixture();
    addFact(fx, 'agency_listing');
    addRisk(fx, 'K1', 'core_stack', 'medium', ['R2']);
    fx.assessment.score_deductions.push({
      cause_id: 'K1',
      category: 'tech_stack',
      points: 4,
    });
    const result = runAgreeing(fx);
    expect(result.decision).toBe('maybe');
    expect(result.deciding_rule).toBe('C3');
    expect(result.counts.stacking_categories).toEqual(['core_stack', 'agency']);
  });

  it('rejects a second downgrade for the same combination', () => {
    const fx = fixture();
    addRisk(fx, 'K1', 'core_stack', 'medium');
    fx.assessment.score_deductions.push(
      { cause_id: 'K1', category: 'tech_stack', points: 4 },
      { cause_id: 'K1', category: 'tech_stack', points: 2 },
    );
    const error = rejection(fx);
    expect(error.row).toBe('V');
    expect(error.issues.join(' ')).toContain(
      'a second downgrade for the same combination',
    );
  });

  it('adds no risk for an undetermined condition and sets manual review', () => {
    for (const condition of [
      'work_authorisation',
      'remote_location',
      'mandatory_language',
    ] as const) {
      const compatible = runAgreeing(fixture(70));
      const undeterminedFx = fixture(70);
      undeterminedFx.assessment.eligibility[condition].value = 'undetermined';
      const undetermined = runAgreeing(undeterminedFx);
      expect({
        condition,
        decision: undetermined.decision,
        score: undetermined.score,
        categories: undetermined.counts.stacking_categories,
        manual: undetermined.manual_review_required,
        questions: undetermined.open_questions.map((q) => q.condition),
      }).toEqual({
        condition,
        decision: compatible.decision,
        score: compatible.score,
        categories: compatible.counts.stacking_categories,
        manual: true,
        questions: [`eligibility.${condition}`],
      });
      expect(compatible.manual_review_required).toBe(false);
    }

    // The one exception: an undetermined location in an early-stage role keeps the C2 cap.
    const earlyStage = (location: 'compatible' | 'undetermined') => {
      const fx = fixture(85);
      addFact(fx, 'early_stage_role');
      fx.assessment.judgements.product_evidence_strong = yes();
      fx.assessment.judgements.all_fits_very_strong = yes();
      fx.assessment.eligibility.remote_location.value = location;
      return runAgreeing(fx);
    };
    const known = earlyStage('compatible');
    const unknown = earlyStage('undetermined');
    expect(known.decision).toBe('apply');
    expect(unknown.decision).toBe('maybe');
    expect(unknown.deciding_rule).toBe('C2');
    expect(unknown.counts.stacking_categories).toEqual(
      known.counts.stacking_categories,
    );
    expect(unknown.manual_review_required).toBe(true);
  });

  it('lists other undetermined facts without manual review', () => {
    const fx = fixture(85);
    fx.assessment.eligibility.other.push({
      id: 'E1',
      label: 'Travel share',
      value: 'undetermined',
      note: '',
    });
    const result = runAgreeing(fx);
    expect(result.open_questions).toEqual([
      { condition: 'eligibility.other.E1', note: 'Travel share' },
    ]);
    expect(result.manual_review_required).toBe(false);
    expect(result.decision).toBe('apply');
    expect(result.counts.stacking_categories).toEqual([]);
  });

  it('flags borderline within 3 points of a band threshold', () => {
    for (const score of [52, 55, 58, 62, 65, 68, 72, 75, 78]) {
      const result = runAgreeing(fixture(score));
      expect({
        score: result.score,
        borderline: result.borderline,
        tracedRule: fEntryOf(result).inputs.deciding_rule,
        hasMarginReason: result.borderline_reasons.some((reason) =>
          reason.includes('within 3 points'),
        ),
      }).toEqual({
        score,
        borderline: true,
        tracedRule: result.deciding_rule,
        hasMarginReason: true,
      });
    }
  });

  it('does not flag borderline away from thresholds', () => {
    for (const score of [30, 51, 59, 60, 61, 69, 70, 71, 79, 85, 100]) {
      const result = runAgreeing(fixture(score));
      expect({
        score,
        borderline: result.borderline,
        reasons: result.borderline_reasons,
        advisoryDiffers: result.advisory_differs,
      }).toEqual({
        score,
        borderline: false,
        reasons: [],
        advisoryDiffers: false,
      });
    }
  });

  it('excludes manual-note forced items from every count', () => {
    const weakened = () => {
      const fx = fixture(85);
      setCoverage(fx, 'R2', 'commercial', [
        ref(COMMERCIAL_2, 'commercial', 'weak'),
      ]);
      return fx;
    };
    const baseline = runAgreeing(weakened());

    const forced = weakened();
    forced.assessment.coverage[1].evidence.push(
      ref('manual_note:note-1', 'manual_note'),
      ref('manual_note:note-2', 'manual_note', 'partial'),
    );
    forced.assessment.manual_note_forced_claims.push({
      location: 'must_have[1]',
      text: 'Forced claim',
    });
    const withForced = runAgreeing(forced);
    expect(withForced.counts).toEqual(baseline.counts);
    expect(withForced.shadow_sub_scores).toEqual(baseline.shadow_sub_scores);
    expect(withForced.decision).toBe(baseline.decision);

    const commercial = weakened();
    commercial.assessment.coverage[1].evidence.push(
      ref(COMMERCIAL_3, 'commercial'),
      ref(PERSONAL_1, 'personal', 'partial'),
    );
    const withCommercial = runAgreeing(commercial);
    expect(withCommercial.counts.strong_points).toBe(
      baseline.counts.strong_points + 1,
    );
    expect(withCommercial.counts.credible_points).toBe(
      baseline.counts.credible_points + 2,
    );
    expect(withCommercial.counts.must_have_met).toBe(
      baseline.counts.must_have_met + 1,
    );

    // A forced item can never back a requirement's basis.
    const forcedBasis = fixture(85);
    setCoverage(forcedBasis, 'R2', 'commercial', [
      ref('manual_note:note-1', 'manual_note'),
    ]);
    expect(rejection(forcedBasis).issues.join(' ')).toContain(
      'manual-note items never count',
    );
  });

  it('flags borderline when the advisory decision differs', () => {
    const result = run(fixture(70), 'skip');
    expect(result.decision).toBe('apply');
    expect(result.deciding_rule).toBe('B2');
    expect(result.borderline).toBe(true);
    expect(result.advisory_differs).toBe(true);
    expect(result.borderline_reasons).toEqual([
      'F: advisory decision skip differs from the policy result apply',
    ]);
    const advisoryEntry = result.trace[result.trace.length - 1];
    expect(advisoryEntry).toEqual({
      row: 'F',
      applied: true,
      inputs: { advisory_decision: 'skip', policy_decision: 'apply' },
      effect: 'advisory skip differs from policy apply: borderline',
    });
  });

  it('never uses the advisory decision as input', () => {
    for (const score of [45, 60, 70, 85]) {
      const outcomes = (['apply', 'maybe', 'skip'] as const).map((advisory) =>
        run(fixture(score), advisory),
      );
      const [first, ...rest] = outcomes;
      for (const other of rest) {
        expect({
          decision: other.decision,
          score: other.score,
          rule: other.deciding_rule,
          coreTrace: other.trace.slice(0, -1),
          counts: other.counts,
        }).toEqual({
          decision: first.decision,
          score: first.score,
          rule: first.deciding_rule,
          coreTrace: first.trace.slice(0, -1),
          counts: first.counts,
        });
      }
    }
  });

  it('applies H2 before the band rules', () => {
    const fx = fixture(97);
    fx.assessment.eligibility.work_authorisation.value = 'incompatible';
    const result = runAgreeing(fx);
    expect(result.decision).toBe('skip');
    expect(result.deciding_rule).toBe('H2');
    const rows = result.trace.map((entry) => entry.row);
    expect(rows).toEqual(['V', 'H1', 'H2', 'F', 'F']);
    expect(rows.some((row) => row.startsWith('B'))).toBe(false);
  });

  it('bounds a strategic exception by caps and hard constraints', () => {
    const stacked = (setup: (fx: Fixture) => void, strategic: boolean) => {
      const fx = fixture(85);
      makeSenior(fx);
      addRisk(fx, 'K1', 'core_stack', 'medium');
      addRisk(fx, 'Q1', 'seniority', 'medium');
      addRisk(fx, 'D1', 'devops_platform', 'medium');
      addRisk(fx, 'V1', 'evidence_quality', 'medium');
      if (strategic) {
        fx.assessment.judgements.strategic_exception = yes([
          'R1',
          COMMERCIAL_1,
        ]);
      }
      setup(fx);
      return runAgreeing(fx);
    };

    // At most one level above the S2 skip, and borderline.
    const without = stacked(() => {}, false);
    const lifted = stacked(() => {}, true);
    expect(without.decision).toBe('skip');
    expect(lifted.decision).toBe('maybe');
    expect(lifted.deciding_rule).toBe('S2');
    expect(lifted.borderline_reasons).toContain(
      'S2: a strategic exception decided the outcome',
    );

    // Never above the maybe it would reach from an apply base.
    expect(lifted.decision).not.toBe('apply');

    // Never above an active cap: C1 holds a senior role with core gaps at skip.
    const capped = stacked((fx) => {
      setCoverage(fx, 'R2', 'personal', [ref(PERSONAL_1, 'personal')]);
      setCoverage(fx, 'R3', 'training', [ref(TRAINING, 'training')]);
    }, true);
    expect(capped.decision).toBe('skip');
    expect(capped.deciding_rule).toBe('C1');

    // Never over a hard constraint.
    const hard = stacked((fx) => {
      fx.assessment.judgements.ownership_unsupported = yes();
    }, true);
    expect(hard.decision).toBe('skip');
    expect(hard.deciding_rule).toBe('H6');

    // A strategic exception needs a reason citing a requirement and evidence.
    const uncited = fixture(85);
    uncited.assessment.judgements.strategic_exception = yes(['R1']);
    expect(rejection(uncited).issues.join(' ')).toContain(
      'must cite a requirement id and an evidence reference',
    );
  });

  it('rejects an advisory decision outside apply, maybe and skip', () => {
    expect(() => run(fixture(), 'later' as Decision)).toThrow(
      DecisionPolicyInputError,
    );
  });

  it('reports the shadow sub-scores without changing the decision', () => {
    const result = runAgreeing(fixture(85));
    expect(result.shadow_sub_scores).toEqual({
      tech_stack: 28,
      evidence_quality: 11,
    });
    const gaps = fixture(85);
    setCoverage(gaps, 'R3', 'commercial', [
      ref(COMMERCIAL_CASE, 'commercial', 'weak'),
    ]);
    const weaker = runAgreeing(gaps);
    expect(weaker.shadow_sub_scores.tech_stack).toBe(19);
    expect(weaker.decision).toBe(result.decision);
    expect(weaker.score).toBe(result.score);
  });
});
