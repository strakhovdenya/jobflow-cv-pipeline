// Contract `01c` of the experimental structured analysis (ADR-046 items 4, 5): the result of the
// deterministic decision policy — decision, score, the deciding rule, the rule trace in Appendix
// order, the flags, the counts it used, the observational shadow sub-scores, and the model's
// advisory decision kept for display only.

import {
  RISK_CATEGORIES,
  RiskCategory,
  SCORE_CATEGORIES,
  ScoreCategory,
} from './fit-assessment.schema';
import {
  ContractValidation,
  checkContractVersion,
  isOneOf,
  isRecord,
  isString,
  isStringArray,
} from './vacancy-requirements.schema';

export const ANALYSIS_DECISION_ARTIFACT = '01c_analysis_decision.json';
export const ANALYSIS_DECISION_CONTRACT_MAJOR = 1;
export const ANALYSIS_DECISION_CONTRACT_VERSION = `${ANALYSIS_DECISION_CONTRACT_MAJOR}.0`;

export const DECISIONS = ['apply', 'maybe', 'skip'] as const;

// Row ids of the ADR-046 Appendix, in the Appendix order.
export const POLICY_ROW_IDS = [
  'V',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'H7',
  'B1',
  'B2',
  'B3',
  'B4',
  'C1',
  'C2',
  'C3',
  'C4',
  'C5',
  'S1',
  'S2',
  'F',
] as const;

export type Decision = (typeof DECISIONS)[number];
export type PolicyRowId = (typeof POLICY_ROW_IDS)[number];

export interface PolicyTraceEntry {
  row: PolicyRowId;
  applied: boolean;
  inputs: Record<string, unknown>;
  effect: string;
}

export interface OpenQuestion {
  condition: string;
  note: string;
}

export interface PolicyCounts {
  strong_points: number;
  credible_points: number;
  must_have_total: number;
  must_have_met: number;
  stacking_categories: RiskCategory[];
}

// Observational only (ADR-046 item 4): never read by the decision.
export interface ShadowSubScores {
  tech_stack: number | null;
  evidence_quality: number | null;
}

export interface AnalysisDecision {
  contract_version: string;
  policy_version: string;
  snapshot_id: string;
  decision: Decision;
  score: number;
  category_scores: Record<ScoreCategory, number>;
  deciding_rule: PolicyRowId;
  trace: PolicyTraceEntry[];
  manual_review_required: boolean;
  borderline: boolean;
  borderline_reasons: string[];
  open_questions: OpenQuestion[];
  advisory_decision: Decision;
  advisory_differs: boolean;
  counts: PolicyCounts;
  shadow_sub_scores: ShadowSubScores;
}

const isCount = (value: unknown): boolean =>
  Number.isInteger(value) && Number(value) >= 0;

const isNullableNumber = (value: unknown): boolean =>
  value === null || typeof value === 'number';

const checkTrace = (raw: unknown, errors: string[]): void => {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push('trace must be a non-empty array');
    return;
  }
  for (const [index, entry] of raw.entries()) {
    const isEntry =
      isRecord(entry) &&
      isOneOf(POLICY_ROW_IDS, entry.row) &&
      typeof entry.applied === 'boolean' &&
      isRecord(entry.inputs) &&
      isString(entry.effect);
    if (!isEntry) errors.push(`trace[${index}]: invalid trace entry`);
  }
};

const checkCounts = (raw: unknown, errors: string[]): void => {
  if (!isRecord(raw)) {
    errors.push('counts must be an object');
    return;
  }
  for (const field of [
    'strong_points',
    'credible_points',
    'must_have_total',
    'must_have_met',
  ]) {
    if (!isCount(raw[field])) {
      errors.push(`counts.${field} must be a non-negative integer`);
    }
  }
  const categories = raw.stacking_categories;
  const isCategories =
    Array.isArray(categories) &&
    categories.every((category) => isOneOf(RISK_CATEGORIES, category));
  if (!isCategories) {
    errors.push('counts.stacking_categories must list risk categories');
  }
};

const checkScores = (raw: Record<string, unknown>, errors: string[]): void => {
  const isScore =
    Number.isInteger(raw.score) &&
    Number(raw.score) >= 0 &&
    Number(raw.score) <= 100;
  if (!isScore) errors.push('score must be an integer 0-100');
  const scores = raw.category_scores;
  const isScores =
    isRecord(scores) &&
    SCORE_CATEGORIES.every((category) => isCount(scores[category]));
  if (!isScores) errors.push('category_scores must hold the six sub-scores');
  const shadow = raw.shadow_sub_scores;
  const isShadow =
    isRecord(shadow) &&
    isNullableNumber(shadow.tech_stack) &&
    isNullableNumber(shadow.evidence_quality);
  if (!isShadow) errors.push('shadow_sub_scores must hold numbers or null');
};

export const validateAnalysisDecision = (
  raw: unknown,
): ContractValidation<AnalysisDecision> => {
  if (!isRecord(raw)) {
    return { success: false, errors: ['01c must be a JSON object'] };
  }
  const versionError = checkContractVersion(
    raw.contract_version,
    ANALYSIS_DECISION_CONTRACT_MAJOR,
  );
  if (versionError) return { success: false, errors: [versionError] };

  const errors: string[] = [];
  for (const field of ['policy_version', 'snapshot_id']) {
    if (!isString(raw[field])) errors.push(`${field} must be a string`);
  }
  for (const field of ['decision', 'advisory_decision']) {
    if (!isOneOf(DECISIONS, raw[field])) {
      errors.push(`${field} must be apply, maybe or skip`);
    }
  }
  if (!isOneOf(POLICY_ROW_IDS, raw.deciding_rule)) {
    errors.push('deciding_rule must be an Appendix row id');
  }
  for (const field of [
    'manual_review_required',
    'borderline',
    'advisory_differs',
  ]) {
    if (typeof raw[field] !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }
  }
  if (!isStringArray(raw.borderline_reasons)) {
    errors.push('borderline_reasons must be a string array');
  }
  const questions = raw.open_questions;
  const isQuestions =
    Array.isArray(questions) &&
    questions.every(
      (question) =>
        isRecord(question) &&
        isString(question.condition) &&
        isString(question.note),
    );
  if (!isQuestions) {
    errors.push('open_questions must be an array of { condition, note }');
  }
  checkScores(raw, errors);
  checkTrace(raw.trace, errors);
  checkCounts(raw.counts, errors);
  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: raw as unknown as AnalysisDecision };
};
