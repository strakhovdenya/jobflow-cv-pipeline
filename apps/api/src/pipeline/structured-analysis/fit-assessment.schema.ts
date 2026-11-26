// Contract `01b` of the experimental structured analysis (ADR-046 items 4, 5, 7): the evidence map
// (one coverage row per `01a` requirement), eligibility conditions, risks by cause, named
// judgements and the six category sub-scores. Pure: validated against `01a` and the catalog of
// the snapshot the assessment was made on.

import { validateManualNoteForcedClaims } from '../schemas/manual-note-forced-claim.schema';
import type { ManualNoteForcedClaim } from '../schemas/manual-note-forced-claim.schema';
import {
  EVIDENCE_PROVENANCES,
  EvidenceCatalog,
  EvidenceProvenance,
  MANUAL_NOTE_REFERENCE,
  resolveEvidenceReference,
} from './evidence-catalog';
import {
  ContractValidation,
  VacancyRequirements,
  checkContractVersion,
  checkIdentifiedItems,
  isItemId,
  isNonEmptyString,
  isOneOf,
  isRecord,
  isString,
  isStringArray,
} from './vacancy-requirements.schema';

export const FIT_ASSESSMENT_ARTIFACT = '01b_fit_assessment.json';
export const FIT_ASSESSMENT_CONTRACT_MAJOR = 1;

export const COMPATIBILITY_VALUES = [
  'compatible',
  'incompatible',
  'undetermined',
] as const;
export const EVIDENCE_BASES = [
  'commercial',
  'commercial_transferable',
  'personal',
  'training',
  'none',
] as const;
export const EVIDENCE_STRENGTHS = ['strong', 'partial', 'weak'] as const;
export const RISK_CATEGORIES = [
  'core_stack',
  'language',
  'seniority',
  'location_remote',
  'devops_platform',
  'evidence_quality',
  'agency',
] as const;
export const RISK_LEVELS = ['low', 'medium', 'high'] as const;
export const RISK_LANGUAGES = ['english', 'german', 'other'] as const;
export const SCORE_CATEGORIES = [
  'tech_stack',
  'production_backend',
  'domain_product',
  'seniority',
  'language_location',
  'evidence_quality',
] as const;
export const ROLE_FAMILIES = [
  'backend',
  'fullstack',
  'integration',
  'other_eligible',
  'pure_frontend',
  'php_only',
  'devops_only',
  'qa',
  'support',
  'low_code',
  'wordpress',
  'ai_ml',
  'data_science',
] as const;
export const ELIGIBILITY_CONDITIONS = [
  'work_authorisation',
  'remote_location',
  'mandatory_language',
] as const;
export const BOOLEAN_JUDGEMENTS = [
  'requires_overstretch',
  'ownership_unsupported',
  'core_stack_close',
  'main_risk_manageable',
  'reached_by_core_gaps',
  'product_evidence_strong',
  'all_fits_very_strong',
  'strategic_exception',
] as const;

export type Compatibility = (typeof COMPATIBILITY_VALUES)[number];
export type EvidenceBasis = (typeof EVIDENCE_BASES)[number];
export type EvidenceStrength = (typeof EVIDENCE_STRENGTHS)[number];
export type RiskCategory = (typeof RISK_CATEGORIES)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type RiskLanguage = (typeof RISK_LANGUAGES)[number];
export type ScoreCategory = (typeof SCORE_CATEGORIES)[number];
export type RoleFamily = (typeof ROLE_FAMILIES)[number];
export type EligibilityConditionName = (typeof ELIGIBILITY_CONDITIONS)[number];
export type BooleanJudgementName = (typeof BOOLEAN_JUDGEMENTS)[number];

// The ranges of the six sub-scores (`prompt1_v13.txt` lines 103-108).
export const SCORE_CATEGORY_MAX: Readonly<Record<ScoreCategory, number>> = {
  tech_stack: 28,
  production_backend: 15,
  domain_product: 7,
  seniority: 17,
  language_location: 18,
  evidence_quality: 15,
};

export interface EvidenceReference {
  ref: string;
  snapshot_id: string | null;
  strength: EvidenceStrength;
  provenance: EvidenceProvenance;
  offered_for_display: boolean;
}

export interface CoverageRow {
  requirement_id: string;
  is_core: boolean;
  basis: EvidenceBasis;
  evidence: EvidenceReference[];
  notes: string;
}

export interface EligibilityCondition {
  value: Compatibility;
  note: string;
}

export interface OtherEligibilityCondition extends EligibilityCondition {
  id: string;
  label: string;
}

export interface Eligibility {
  work_authorisation: EligibilityCondition;
  remote_location: EligibilityCondition;
  mandatory_language: EligibilityCondition;
  other: OtherEligibilityCondition[];
}

export interface Risk {
  cause_id: string;
  category: RiskCategory;
  level: RiskLevel;
  // which language the risk is about; null outside the language category
  language: RiskLanguage | null;
  requirement_ids: string[];
  reason: string;
}

// One sub-score downgrade caused by one risk cause.
export interface ScoreDeduction {
  cause_id: string;
  category: ScoreCategory;
  points: number;
}

export interface Judgement {
  value: boolean;
  reason: string;
  cited_ids: string[];
}

export interface RoleFamilyJudgement {
  value: RoleFamily;
  reason: string;
  cited_ids: string[];
}

export interface DefiningRequirementJudgement {
  requirement_id: string | null;
  reason: string;
  cited_ids: string[];
}

export type Judgements = Record<BooleanJudgementName, Judgement> & {
  role_family: RoleFamilyJudgement;
  defining_requirement: DefiningRequirementJudgement;
};

export interface EvidenceRiskNote {
  claim: string;
  status: string;
}

export interface FitAssessment {
  contract_version: string;
  snapshot_id: string;
  coverage: CoverageRow[];
  eligibility: Eligibility;
  risks: Risk[];
  score_deductions: ScoreDeduction[];
  category_scores: Record<ScoreCategory, number>;
  judgements: Judgements;
  quality_score: number;
  summary: string;
  top_reasons: string[];
  recommended_next_action: string;
  evidence_risks: EvidenceRiskNote[];
  manual_note_forced_claims: ManualNoteForcedClaim[];
}

export interface FitAssessmentContext {
  requirements: VacancyRequirements;
  catalog: EvidenceCatalog;
}

// The provenance a basis needs from at least one non-manual-note reference of its row.
const BASIS_PROVENANCE: Readonly<
  Record<EvidenceBasis, EvidenceProvenance | null>
> = {
  commercial: 'commercial',
  commercial_transferable: 'commercial',
  personal: 'personal',
  training: 'training',
  none: null,
};

interface Ids {
  requirements: ReadonlySet<string>;
  causes: Set<string>;
  evidence: Set<string>;
  citable: Set<string>;
}

const checkReference = (
  raw: unknown,
  owner: string,
  catalog: EvidenceCatalog,
  errors: string[],
): EvidenceReference | null => {
  if (!isRecord(raw) || !isString(raw.ref)) {
    errors.push(`${owner}: evidence reference must be an object with a ref`);
    return null;
  }
  const where = `${owner} reference ${raw.ref}`;
  const before = errors.length;
  if (!isOneOf(EVIDENCE_STRENGTHS, raw.strength)) {
    errors.push(`${where}: unknown strength ${String(raw.strength)}`);
  }
  if (!isOneOf(EVIDENCE_PROVENANCES, raw.provenance)) {
    errors.push(`${where}: unknown provenance ${String(raw.provenance)}`);
  }
  if (typeof raw.offered_for_display !== 'boolean') {
    errors.push(`${where}: offered_for_display must be a boolean`);
  }
  if (errors.length > before) return null;

  const isManualNote = raw.provenance === 'manual_note';
  if (isManualNote !== MANUAL_NOTE_REFERENCE.test(raw.ref)) {
    errors.push(
      `${where}: only manual-note items use the manual_note kind, and they must`,
    );
    return null;
  }
  if (isManualNote) return raw as unknown as EvidenceReference;

  const snapshotId = isString(raw.snapshot_id) ? raw.snapshot_id : null;
  const resolution = resolveEvidenceReference(catalog, raw.ref, snapshotId);
  if (!resolution.resolved) {
    errors.push(`${owner}: ${resolution.reason}`);
    return null;
  }
  const { entry } = resolution;
  if (!entry.assessable) {
    errors.push(`${where}: the entry supports no requirement`);
  }
  if (entry.provenance !== null && entry.provenance !== raw.provenance) {
    errors.push(
      `${where}: provenance ${String(raw.provenance)} contradicts the catalog (${entry.provenance})`,
    );
  }
  if (raw.offered_for_display === true && !entry.displayable) {
    errors.push(`${where}: a non-displayable entry is offered for display`);
  }
  return raw as unknown as EvidenceReference;
};

const checkCoverage = (
  raw: unknown,
  context: FitAssessmentContext,
  ids: Ids,
  errors: string[],
): void => {
  if (!Array.isArray(raw)) {
    errors.push('coverage must be an array');
    return;
  }
  const covered = new Set<string>();
  for (const [index, row] of raw.entries()) {
    if (!isRecord(row) || !isString(row.requirement_id)) {
      errors.push(`coverage[${index}]: object with a requirement_id expected`);
      continue;
    }
    const owner = `coverage of ${row.requirement_id}`;
    if (!ids.requirements.has(row.requirement_id)) {
      errors.push(`${owner}: unknown requirement id`);
    }
    if (covered.has(row.requirement_id)) errors.push(`${owner}: duplicate row`);
    covered.add(row.requirement_id);
    if (typeof row.is_core !== 'boolean') {
      errors.push(`${owner}: is_core must be a boolean`);
    }
    if (!isString(row.notes)) errors.push(`${owner}: notes must be a string`);
    if (!isOneOf(EVIDENCE_BASES, row.basis)) {
      errors.push(`${owner}: unknown basis ${String(row.basis)}`);
    }
    if (!Array.isArray(row.evidence)) {
      errors.push(`${owner}: evidence must be an array`);
      continue;
    }
    const references: EvidenceReference[] = [];
    for (const item of row.evidence) {
      const reference = checkReference(item, owner, context.catalog, errors);
      if (reference) references.push(reference);
      // A judgement may not rest on a manual-note item (ADR-034, INV-5).
      if (reference && reference.provenance !== 'manual_note') {
        ids.evidence.add(reference.ref);
        ids.citable.add(reference.ref);
      }
    }
    if (!isOneOf(EVIDENCE_BASES, row.basis)) continue;
    const needed = BASIS_PROVENANCE[row.basis];
    if (needed && !references.some((ref) => ref.provenance === needed)) {
      errors.push(
        `${owner}: basis ${row.basis} has no ${needed} reference (manual-note items never count)`,
      );
    }
  }
  for (const id of ids.requirements) {
    if (!covered.has(id)) errors.push(`requirement ${id} has no coverage row`);
  }
};

const checkCondition = (raw: unknown, owner: string, errors: string[]) => {
  if (!isRecord(raw) || !isOneOf(COMPATIBILITY_VALUES, raw.value)) {
    errors.push(
      `${owner}: value must be compatible, incompatible or undetermined`,
    );
    return;
  }
  if (!isString(raw.note)) errors.push(`${owner}: note must be a string`);
};

const checkEligibility = (raw: unknown, ids: Ids, errors: string[]): void => {
  if (!isRecord(raw)) {
    errors.push('eligibility must be an object');
    return;
  }
  for (const name of ELIGIBILITY_CONDITIONS) {
    checkCondition(raw[name], `eligibility.${name}`, errors);
  }
  checkIdentifiedItems(
    raw.other,
    'eligibility.other',
    'eligibility condition',
    new Set<string>(),
    errors,
    (item, owner) => {
      checkCondition(item, owner, errors);
      if (!isNonEmptyString(item.label)) {
        errors.push(`${owner}: label must be a non-empty string`);
      }
      ids.citable.add(String(item.id));
    },
  );
};

const checkRisks = (raw: unknown, ids: Ids, errors: string[]): void => {
  if (!Array.isArray(raw)) {
    errors.push('risks must be an array');
    return;
  }
  for (const [index, risk] of raw.entries()) {
    if (!isRecord(risk) || !isItemId(risk.cause_id)) {
      errors.push(`risks[${index}]: object with a valid cause_id expected`);
      continue;
    }
    const owner = `risk ${risk.cause_id}`;
    ids.causes.add(risk.cause_id);
    ids.citable.add(risk.cause_id);
    if (!isOneOf(RISK_CATEGORIES, risk.category)) {
      errors.push(`${owner}: unknown category ${String(risk.category)}`);
    }
    if (!isOneOf(RISK_LEVELS, risk.level)) {
      errors.push(`${owner}: unknown level ${String(risk.level)}`);
    }
    const isLanguage = risk.category === 'language';
    const isLanguageValid = isLanguage
      ? isOneOf(RISK_LANGUAGES, risk.language)
      : risk.language === null;
    if (!isLanguageValid) {
      errors.push(
        `${owner}: language must name the language of a language risk, else null`,
      );
    }
    if (!isNonEmptyString(risk.reason)) {
      errors.push(`${owner}: reason must be a non-empty string`);
    }
    if (!isStringArray(risk.requirement_ids)) {
      errors.push(`${owner}: requirement_ids must be a string array`);
      continue;
    }
    for (const id of risk.requirement_ids) {
      if (!ids.requirements.has(id)) {
        errors.push(`${owner}: unknown requirement id ${id}`);
      }
    }
  }
};

const checkDeductions = (raw: unknown, ids: Ids, errors: string[]): void => {
  if (!Array.isArray(raw)) {
    errors.push('score_deductions must be an array');
    return;
  }
  for (const [index, deduction] of raw.entries()) {
    const owner = `score_deductions[${index}]`;
    if (!isRecord(deduction)) {
      errors.push(`${owner}: object expected`);
      continue;
    }
    if (!isString(deduction.cause_id) || !ids.causes.has(deduction.cause_id)) {
      errors.push(`${owner}: cause_id must name a risk cause`);
    }
    if (!isOneOf(SCORE_CATEGORIES, deduction.category)) {
      errors.push(`${owner}: unknown category ${String(deduction.category)}`);
    }
    const isPoints =
      Number.isInteger(deduction.points) && Number(deduction.points) > 0;
    if (!isPoints) errors.push(`${owner}: points must be a positive integer`);
  }
};

const checkCategoryScores = (raw: unknown, errors: string[]): void => {
  if (!isRecord(raw)) {
    errors.push('category_scores must be an object');
    return;
  }
  for (const category of SCORE_CATEGORIES) {
    const value = raw[category];
    const max = SCORE_CATEGORY_MAX[category];
    const isInRange =
      Number.isInteger(value) && Number(value) >= 0 && Number(value) <= max;
    if (!isInRange) {
      errors.push(`category_scores.${category} must be an integer 0-${max}`);
    }
  }
};

const checkCitations = (
  raw: Record<string, unknown>,
  owner: string,
  ids: Ids,
  errors: string[],
): void => {
  if (!isString(raw.reason)) errors.push(`${owner}: reason must be a string`);
  if (!isStringArray(raw.cited_ids)) {
    errors.push(`${owner}: cited_ids must be a string array`);
    return;
  }
  for (const id of raw.cited_ids) {
    if (!ids.citable.has(id)) errors.push(`${owner}: unknown cited id ${id}`);
  }
};

const checkJudgements = (
  raw: unknown,
  context: FitAssessmentContext,
  ids: Ids,
  errors: string[],
): void => {
  if (!isRecord(raw)) {
    errors.push('judgements must be an object');
    return;
  }
  for (const name of BOOLEAN_JUDGEMENTS) {
    const judgement = raw[name];
    const owner = `judgement ${name}`;
    if (!isRecord(judgement) || typeof judgement.value !== 'boolean') {
      errors.push(`${owner}: object with a boolean value expected`);
      continue;
    }
    checkCitations(judgement, owner, ids, errors);
    if (judgement.value && !isNonEmptyString(judgement.reason)) {
      errors.push(`${owner}: a true judgement needs a reason`);
    }
  }
  const strategic = raw.strategic_exception;
  if (isRecord(strategic) && strategic.value === true) {
    const cited = isStringArray(strategic.cited_ids) ? strategic.cited_ids : [];
    const citesRequirement = cited.some((id) => ids.requirements.has(id));
    const citesEvidence = cited.some((id) => ids.evidence.has(id));
    if (!citesRequirement || !citesEvidence) {
      errors.push(
        'judgement strategic_exception: the reason must cite a requirement id and an evidence reference',
      );
    }
  }

  const family = raw.role_family;
  if (!isRecord(family) || !isOneOf(ROLE_FAMILIES, family.value)) {
    errors.push('judgement role_family: unknown role family');
  } else {
    checkCitations(family, 'judgement role_family', ids, errors);
  }

  const defining = raw.defining_requirement;
  if (!isRecord(defining)) {
    errors.push('judgement defining_requirement: object expected');
    return;
  }
  checkCitations(defining, 'judgement defining_requirement', ids, errors);
  if (defining.requirement_id === null) return;
  const requirement = context.requirements.requirements.find(
    (item) => item.id === defining.requirement_id,
  );
  if (!requirement || requirement.kind !== 'must_have') {
    errors.push(
      'judgement defining_requirement: requirement_id must name a must-have requirement or be null',
    );
  }
};

const checkNarrative = (raw: Record<string, unknown>, errors: string[]) => {
  const quality = raw.quality_score;
  const isQuality =
    typeof quality === 'number' && quality >= 0 && quality <= 100;
  if (!isQuality) errors.push('quality_score must be a number 0-100');
  if (!isString(raw.summary)) errors.push('summary must be a string');
  if (!isStringArray(raw.top_reasons)) {
    errors.push('top_reasons must be a string array');
  }
  if (!isString(raw.recommended_next_action)) {
    errors.push('recommended_next_action must be a string');
  }
  const risks = raw.evidence_risks;
  const isRiskNotes =
    Array.isArray(risks) &&
    risks.every(
      (note) => isRecord(note) && isString(note.claim) && isString(note.status),
    );
  if (!isRiskNotes) {
    errors.push('evidence_risks must be an array of { claim, status }');
  }
  const forced = validateManualNoteForcedClaims({
    manual_note_forced_claims: raw.manual_note_forced_claims ?? [],
  });
  if (!forced.success) errors.push(forced.error ?? 'invalid forced claims');
};

const citableIdsOf = (requirements: VacancyRequirements): Set<string> =>
  new Set([
    ...requirements.requirements.map((item) => item.id),
    ...requirements.facts.map((item) => item.id),
    ...requirements.languages.map((item) => item.id),
  ]);

export const validateFitAssessment = (
  raw: unknown,
  context: FitAssessmentContext,
): ContractValidation<FitAssessment> => {
  if (!isRecord(raw)) {
    return { success: false, errors: ['01b must be a JSON object'] };
  }
  const versionError = checkContractVersion(
    raw.contract_version,
    FIT_ASSESSMENT_CONTRACT_MAJOR,
  );
  if (versionError) return { success: false, errors: [versionError] };

  const errors: string[] = [];
  if (raw.snapshot_id !== context.catalog.snapshotId) {
    errors.push(
      `snapshot_id ${String(raw.snapshot_id)} is not the catalog snapshot ${context.catalog.snapshotId}`,
    );
  }
  const ids: Ids = {
    requirements: new Set(context.requirements.requirements.map((r) => r.id)),
    causes: new Set<string>(),
    evidence: new Set<string>(),
    citable: citableIdsOf(context.requirements),
  };
  checkCoverage(raw.coverage, context, ids, errors);
  checkEligibility(raw.eligibility, ids, errors);
  checkRisks(raw.risks, ids, errors);
  checkDeductions(raw.score_deductions, ids, errors);
  checkCategoryScores(raw.category_scores, errors);
  checkJudgements(raw.judgements, context, ids, errors);
  checkNarrative(raw, errors);
  if (errors.length > 0) return { success: false, errors };
  const data = {
    ...raw,
    manual_note_forced_claims: raw.manual_note_forced_claims ?? [],
  };
  return { success: true, data: data as unknown as FitAssessment };
};
