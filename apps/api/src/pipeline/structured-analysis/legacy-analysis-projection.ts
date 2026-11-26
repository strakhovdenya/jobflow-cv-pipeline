// Projects the validated `01a`, `01b` and `01c` to a legacy-shaped `01_vacancy_analysis.json`, so
// Prompt 2, Prompt 3, the cover letter and the skip reason read it unchanged (ADR-046 item 15).
// `validateVacancyAnalysisJson` accepts extra fields, so the projection also asserts that it wrote
// no key outside the legacy schema (INV-8).

import {
  VacancyAnalysis,
  VacancyAnalysisMustHaveItem,
  VacancyAnalysisRiskField,
  VacancyAnalysisWorkspaceInfo,
  validateVacancyAnalysisJson,
} from '../schemas/vacancy-analysis.schema';
import { AnalysisDecision } from './analysis-decision.schema';
import {
  CoverageRow,
  EvidenceStrength,
  FitAssessment,
  Risk,
  RiskCategory,
  RiskLevel,
} from './fit-assessment.schema';
import {
  RequirementKind,
  VacancyRequirement,
  VacancyRequirements,
} from './vacancy-requirements.schema';

export const LEGACY_ANALYSIS_SCHEMA_VERSION = '1.0';
export const LEGACY_ANALYSIS_STEP = 'prompt_1_vacancy_analysis';
// ADR-034's reserved literal for manual-note content.
export const USER_FORCED_STATUS = 'user-forced, unverified';

// The key tree of the legacy vacancy-analysis schema: `true` is a leaf, an object a nested
// record, a one-element array a list of records of that shape.
type KeyShape = true | { [key: string]: KeyShape } | [KeyShape];

const REQUIREMENT_ROW: KeyShape = {
  requirement: true,
  match_level: true,
  evidence_status: true,
  risk: true,
  notes: true,
};
const RISK_FIELD: KeyShape = { risk_level: true, notes: true };

export const LEGACY_VACANCY_ANALYSIS_SHAPE: KeyShape = {
  schema_version: true,
  step: true,
  workspace: {
    company_name_original: true,
    company_slug: true,
    role_title_original: true,
    role_slug: true,
  },
  decision: true,
  score: true,
  quality_score: true,
  summary: true,
  must_have: [REQUIREMENT_ROW],
  nice_to_have: [REQUIREMENT_ROW],
  wishlist: [{ requirement: true, note: true }],
  hidden_role_logic: [true],
  tech_stack_match: {
    strong: [true],
    transferable: [true],
    weak_or_missing: [true],
  },
  language_risk: RISK_FIELD,
  location_risk: RISK_FIELD,
  evidence_risks: [{ claim: true, status: true }],
  top_reasons: [true],
  recommended_next_action: true,
  manual_review_required: true,
  manual_note_forced_claims: [{ location: true, text: true }],
};

export class LegacyProjectionError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Legacy projection failed: ${issues.join('; ')}`);
    this.name = 'LegacyProjectionError';
  }
}

export interface LegacyProjectionInput {
  workspace: VacancyAnalysisWorkspaceInfo;
  requirements: VacancyRequirements;
  assessment: FitAssessment;
  decision: AnalysisDecision;
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Every key path of `value` that the legacy shape does not allow, at any depth.
export const findKeysOutsideLegacySchema = (
  value: unknown,
  shape: KeyShape = LEGACY_VACANCY_ANALYSIS_SHAPE,
  path = '',
): string[] => {
  if (shape === true) {
    return isPlainRecord(value) || Array.isArray(value)
      ? [`${path || '<root>'} (structured value where a leaf is expected)`]
      : [];
  }
  if (Array.isArray(shape)) {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item, index) =>
      findKeysOutsideLegacySchema(item, shape[0], `${path}[${index}]`),
    );
  }
  if (!isPlainRecord(value)) return [];
  return Object.keys(value).flatMap((key) => {
    const keyPath = path ? `${path}.${key}` : key;
    const child = Object.prototype.hasOwnProperty.call(shape, key)
      ? shape[key]
      : undefined;
    return child === undefined
      ? [keyPath]
      : findKeysOutsideLegacySchema(value[key], child, keyPath);
  });
};

const STRENGTH_RANK: Readonly<Record<EvidenceStrength, number>> = {
  weak: 1,
  partial: 2,
  strong: 3,
};
const RISK_RANK: Readonly<Record<RiskLevel, number>> = {
  low: 0,
  medium: 1,
  high: 2,
};

const countedReferences = (row: CoverageRow) =>
  row.evidence.filter((reference) => reference.provenance !== 'manual_note');

const matchLevelOf = (row: CoverageRow): string => {
  const strengths = countedReferences(row).map((ref) => ref.strength);
  if (strengths.length === 0) return 'none';
  return strengths.reduce((best, strength) =>
    STRENGTH_RANK[strength] > STRENGTH_RANK[best] ? strength : best,
  );
};

const evidenceStatusOf = (row: CoverageRow): string => {
  const hasCounted = countedReferences(row).length > 0;
  if (!hasCounted && row.evidence.length > 0) return USER_FORCED_STATUS;
  if (row.basis === 'commercial' || row.basis === 'commercial_transferable') {
    return 'supported';
  }
  if (row.basis === 'personal' || row.basis === 'training') {
    return 'personal_only';
  }
  return hasCounted ? 'needs_evidence' : 'not_supported';
};

const highestLevel = (risks: readonly Risk[]): RiskLevel | null =>
  risks.reduce<RiskLevel | null>(
    (best, risk) =>
      best === null || RISK_RANK[risk.level] > RISK_RANK[best]
        ? risk.level
        : best,
    null,
  );

const requirementRow = (
  requirement: VacancyRequirement,
  row: CoverageRow,
  risks: readonly Risk[],
): VacancyAnalysisMustHaveItem => {
  const cited = risks.filter((risk) =>
    risk.requirement_ids.includes(requirement.id),
  );
  return {
    requirement: requirement.text,
    match_level: matchLevelOf(row),
    evidence_status: evidenceStatusOf(row),
    risk: highestLevel(cited) ?? 'low',
    notes: row.notes,
  };
};

const riskField = (
  risks: readonly Risk[],
  category: RiskCategory,
  fallbackNote: string,
): VacancyAnalysisRiskField => {
  const matching = risks.filter((risk) => risk.category === category);
  return {
    risk_level: highestLevel(matching) ?? 'low',
    notes:
      matching.length > 0
        ? matching.map((risk) => risk.reason).join(' ')
        : fallbackNote,
  };
};

export const projectToLegacyVacancyAnalysis = (
  input: LegacyProjectionInput,
): VacancyAnalysis => {
  const { workspace, requirements, assessment, decision } = input;
  const rowOf = new Map(
    assessment.coverage.map((row) => [row.requirement_id, row]),
  );
  const ofKind = (kind: RequirementKind) =>
    requirements.requirements.filter((item) => item.kind === kind);
  const rowsOf = (kind: RequirementKind) =>
    ofKind(kind).flatMap((requirement) => {
      const row = rowOf.get(requirement.id);
      return row ? [requirementRow(requirement, row, assessment.risks)] : [];
    });

  const strong: string[] = [];
  const transferable: string[] = [];
  const weakOrMissing: string[] = [];
  for (const requirement of [
    ...ofKind('must_have'),
    ...ofKind('nice_to_have'),
  ]) {
    const row = rowOf.get(requirement.id);
    if (!row) continue;
    const isStrong = matchLevelOf(row) === 'strong';
    if (row.basis === 'commercial' && isStrong) strong.push(requirement.text);
    else if (
      row.basis === 'commercial' ||
      row.basis === 'commercial_transferable'
    ) {
      transferable.push(requirement.text);
    } else weakOrMissing.push(requirement.text);
  }

  const languageRisk = riskField(
    assessment.risks,
    'language',
    'No language requirement risk recorded.',
  );
  if (decision.deciding_rule === 'H1') languageRisk.risk_level = 'blocker';
  const locationRisk = riskField(
    assessment.risks,
    'location_remote',
    'No location or remote risk recorded.',
  );
  if (assessment.eligibility.remote_location.value === 'undetermined') {
    locationRisk.risk_level = 'unknown';
    locationRisk.notes =
      `Undetermined — manual review. ${assessment.eligibility.remote_location.note}`.trim();
  }

  const projected: VacancyAnalysis = {
    schema_version: LEGACY_ANALYSIS_SCHEMA_VERSION,
    step: LEGACY_ANALYSIS_STEP,
    workspace: {
      company_name_original: workspace.company_name_original,
      company_slug: workspace.company_slug,
      role_title_original: workspace.role_title_original,
      role_slug: workspace.role_slug,
    },
    decision: decision.decision,
    score: decision.score,
    quality_score: assessment.quality_score,
    summary: assessment.summary,
    must_have: rowsOf('must_have'),
    nice_to_have: rowsOf('nice_to_have'),
    wishlist: ofKind('wishlist').map((requirement) => ({
      requirement: requirement.text,
      note: rowOf.get(requirement.id)?.notes ?? '',
    })),
    hidden_role_logic: [...requirements.hidden_role_logic],
    tech_stack_match: {
      strong,
      transferable,
      weak_or_missing: weakOrMissing,
    },
    language_risk: languageRisk,
    location_risk: locationRisk,
    evidence_risks: assessment.evidence_risks.map((note) => ({
      claim: note.claim,
      status: note.status,
    })),
    top_reasons: [...assessment.top_reasons],
    recommended_next_action: assessment.recommended_next_action,
    manual_review_required: decision.manual_review_required,
    manual_note_forced_claims: assessment.manual_note_forced_claims.map(
      (claim) => ({ location: claim.location, text: claim.text }),
    ),
  };

  const outside = findKeysOutsideLegacySchema(projected);
  if (outside.length > 0) {
    throw new LegacyProjectionError(
      outside.map((path) => `key outside the legacy schema: ${path}`),
    );
  }
  const validation = validateVacancyAnalysisJson(JSON.stringify(projected));
  if (!validation.success) {
    throw new LegacyProjectionError([validation.error ?? 'invalid legacy 01']);
  }
  return projected;
};
