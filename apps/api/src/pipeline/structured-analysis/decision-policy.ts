// The deterministic, versioned decision policy of ADR-046 item 4. It implements the rows of the
// ADR-046 Appendix (project-management/DECISIONS.md) in the Appendix order
// V → H → B → C → S1 → S2 → F, referring to each rule by its row id. The Appendix is the policy
// specification; it is not restated here.
//
// The model's advisory decision is not an input of the decision, the score or the deciding rule:
// `decide` never receives it. Row F alone compares it with the policy result afterwards and may
// only set `borderline` and add a trace entry (ADR-046 item 5 (c)).

import {
  ANALYSIS_DECISION_CONTRACT_VERSION,
  AnalysisDecision,
  DECISIONS,
  Decision,
  OpenQuestion,
  PolicyCounts,
  PolicyRowId,
  PolicyTraceEntry,
  ShadowSubScores,
} from './analysis-decision.schema';
import { EvidenceCatalog } from './evidence-catalog';
import {
  CoverageRow,
  ELIGIBILITY_CONDITIONS,
  EvidenceBasis,
  EvidenceReference,
  FitAssessment,
  RISK_CATEGORIES,
  RiskCategory,
  RiskLevel,
  RoleFamily,
  SCORE_CATEGORIES,
  SCORE_CATEGORY_MAX,
  ScoreCategory,
  ScoreDeduction,
  Risk,
  validateFitAssessment,
} from './fit-assessment.schema';
import {
  LanguageLevel,
  LanguageRequirement,
  VacancyRequirements,
  factApplies,
  hasVacancyFact,
  isOneOf,
  validateVacancyRequirements,
} from './vacancy-requirements.schema';

// The ADR-046 state this function implements (INV-3). A rule change is an ADR amendment plus a
// new value here.
export const DECISION_POLICY_VERSION = 'adr-046@2026-11-26';

// Provisional margin of ADR-046 item 5 (a) around the band thresholds.
export const BORDERLINE_MARGIN_POINTS = 3;
export const BAND_THRESHOLDS = [55, 65, 75] as const;

export class DecisionPolicyInputError extends Error {
  readonly row = 'V' as const;

  constructor(readonly issues: readonly string[]) {
    super(`Decision policy input rejected under row V: ${issues.join('; ')}`);
    this.name = 'DecisionPolicyInputError';
  }
}

export interface DecisionPolicyInput {
  vacancyText: string;
  // parsed `01a`
  requirements: unknown;
  // parsed `01b`
  assessment: unknown;
  catalog: EvidenceCatalog;
}

interface PolicyContext {
  requirements: VacancyRequirements;
  assessment: FitAssessment;
  catalog: EvidenceCatalog;
}

interface Derived {
  score: number;
  categoryScores: Record<ScoreCategory, number>;
  languageCap: number | null;
  counts: PolicyCounts;
  levels: ReadonlyMap<RiskCategory, RiskLevel>;
  ignoredRisks: string[];
  isSeniorRole: boolean;
  shadow: ShadowSubScores;
}

interface CoreResult {
  decision: Decision;
  decidingRule: PolicyRowId;
  trace: PolicyTraceEntry[];
  borderlineReasons: string[];
  manualReviewRequired: boolean;
  openQuestions: OpenQuestion[];
  derived: Derived;
}

interface RuleOutcome {
  applied: boolean;
  inputs: Record<string, unknown>;
}

interface CapOutcome extends RuleOutcome {
  cap: Decision | null;
  borderline: string | null;
}

const DECISION_RANK: Readonly<Record<Decision, number>> = {
  skip: 0,
  maybe: 1,
  apply: 2,
};

const ONE_LEVEL_DOWN: Readonly<Record<Decision, Decision>> = {
  apply: 'maybe',
  maybe: 'skip',
  skip: 'skip',
};

const RISK_LEVEL_RANK: Readonly<Record<RiskLevel, number>> = {
  low: 0,
  medium: 1,
  high: 2,
};

const EXCLUDED_ROLE_FAMILIES: readonly RoleFamily[] = [
  'pure_frontend',
  'php_only',
  'devops_only',
  'qa',
  'support',
  'low_code',
  'wordpress',
  'ai_ml',
  'data_science',
];
const FLUENT_LEVELS: readonly LanguageLevel[] = ['b2', 'c1', 'c2', 'fluent'];
const NON_COMMERCIAL_BASES: readonly EvidenceBasis[] = [
  'personal',
  'training',
  'none',
];
// C1 counts a transferable commercial basis as a gap too.
const CORE_GAP_BASES: readonly EvidenceBasis[] = [
  ...NON_COMMERCIAL_BASES,
  'commercial_transferable',
];
// The language sub-score caps of `prompt1_v13.txt` lines 136-139.
const LANGUAGE_CAP_EXTERNAL_BLOCKER = 4;
const LANGUAGE_CAP_INTERNAL_FLUENT = 8;
const LANGUAGE_CAP_PREFERRED = 12;

const lowerOf = (left: Decision, right: Decision): Decision =>
  DECISION_RANK[left] <= DECISION_RANK[right] ? left : right;

const isAtLeast = (level: RiskLevel | undefined, minimum: RiskLevel) =>
  level !== undefined && RISK_LEVEL_RANK[level] >= RISK_LEVEL_RANK[minimum];

// ---------- V ----------

const findCauseConflicts = (
  risks: readonly Risk[],
  deductions: readonly ScoreDeduction[],
): string[] => {
  const issues: string[] = [];
  const riskCategories = new Map<string, RiskCategory[]>();
  for (const risk of risks) {
    const categories = riskCategories.get(risk.cause_id) ?? [];
    if (categories.includes(risk.category)) {
      issues.push(`cause ${risk.cause_id}: one risk record per cause`);
    } else {
      categories.push(risk.category);
    }
    riskCategories.set(risk.cause_id, categories);
  }
  for (const [cause, categories] of riskCategories) {
    if (categories.length > 1) {
      issues.push(
        `cause ${cause} is counted in two categories (${categories.join(', ')})`,
      );
    }
  }

  const downgrades = new Map<string, ScoreCategory[]>();
  for (const deduction of deductions) {
    const categories = downgrades.get(deduction.cause_id) ?? [];
    if (categories.includes(deduction.category)) {
      issues.push(
        `cause ${deduction.cause_id}: a second downgrade for the same combination (${deduction.category})`,
      );
    } else {
      categories.push(deduction.category);
    }
    downgrades.set(deduction.cause_id, categories);
  }
  for (const [cause, categories] of downgrades) {
    if (categories.length > 1) {
      issues.push(
        `cause ${cause} is counted in two categories (${categories.join(', ')})`,
      );
    }
  }
  return issues;
};

const validatePolicyInput = (input: DecisionPolicyInput): PolicyContext => {
  const requirements = validateVacancyRequirements(
    input.requirements,
    input.vacancyText,
  );
  if (!requirements.success) {
    throw new DecisionPolicyInputError(
      requirements.errors.map((error) => `01a: ${error}`),
    );
  }
  const assessment = validateFitAssessment(input.assessment, {
    requirements: requirements.data,
    catalog: input.catalog,
  });
  if (!assessment.success) {
    throw new DecisionPolicyInputError(
      assessment.errors.map((error) => `01b: ${error}`),
    );
  }
  const conflicts = findCauseConflicts(
    assessment.data.risks,
    assessment.data.score_deductions,
  );
  if (conflicts.length > 0) {
    throw new DecisionPolicyInputError(
      conflicts.map((issue) => `01b: ${issue}`),
    );
  }
  return {
    requirements: requirements.data,
    assessment: assessment.data,
    catalog: input.catalog,
  };
};

// ---------- derived inputs ----------

const isGerman = (language: LanguageRequirement) =>
  language.language === 'german';

const isExternalGermanBlocker = (
  language: LanguageRequirement,
  isEnglishMain: boolean,
): boolean =>
  isGerman(language) &&
  language.need === 'mandatory' &&
  FLUENT_LEVELS.includes(language.level) &&
  language.usage === 'external' &&
  !isEnglishMain;

const germanCapOf = (
  language: LanguageRequirement,
  isEnglishMain: boolean,
): number | null => {
  if (language.need === 'nice_to_have') return null;
  if (language.need === 'preferred') return LANGUAGE_CAP_PREFERRED;
  if (!FLUENT_LEVELS.includes(language.level)) return null;
  if (language.usage !== 'external') return LANGUAGE_CAP_INTERNAL_FLUENT;
  return isEnglishMain ? LANGUAGE_CAP_PREFERRED : LANGUAGE_CAP_EXTERNAL_BLOCKER;
};

const languageCapOf = (requirements: VacancyRequirements): number | null => {
  const isEnglishMain = hasVacancyFact(
    requirements,
    'english_main_working_language',
  );
  const caps = requirements.languages
    .filter(isGerman)
    .map((language) => germanCapOf(language, isEnglishMain))
    .filter((cap): cap is number => cap !== null);
  return caps.length > 0 ? Math.min(...caps) : null;
};

// The risk level of `prompt1_v13.txt` lines 137-139: internal fluent German is high, German
// that is preferred (or only a plus beside English as the main language) is medium, a
// nice-to-have adds nothing. The external blocker itself is H1.
const germanLevelOf = (
  language: LanguageRequirement,
  isEnglishMain: boolean,
): RiskLevel | null => {
  if (language.need === 'nice_to_have') return null;
  if (language.need === 'preferred') return 'medium';
  if (!FLUENT_LEVELS.includes(language.level)) return null;
  if (language.usage === 'external' && isEnglishMain) return 'medium';
  return 'high';
};

const germanRiskLevelOf = (
  requirements: VacancyRequirements,
): RiskLevel | null => {
  const isEnglishMain = hasVacancyFact(
    requirements,
    'english_main_working_language',
  );
  return requirements.languages
    .filter(isGerman)
    .map((language) => germanLevelOf(language, isEnglishMain))
    .reduce<RiskLevel | null>(
      (best, level) =>
        level !== null &&
        (best === null || RISK_LEVEL_RANK[level] > RISK_LEVEL_RANK[best])
          ? level
          : best,
      null,
    );
};

const isCounted = (reference: EvidenceReference) =>
  reference.provenance !== 'manual_note';

const isRequirementMet = (
  row: CoverageRow,
  requirements: VacancyRequirements,
): boolean =>
  row.evidence.some(
    (reference) =>
      isCounted(reference) &&
      (reference.strength === 'strong' ||
        (reference.strength === 'partial' &&
          factApplies(
            requirements,
            'equivalent_experience_accepted',
            row.requirement_id,
          ))),
  );

const deriveInputs = (context: PolicyContext): Derived => {
  const { requirements, assessment, catalog } = context;
  const kindOf = new Map(
    requirements.requirements.map((item) => [item.id, item.kind]),
  );

  const languageCap = languageCapOf(requirements);
  const categoryScores = { ...assessment.category_scores };
  if (languageCap !== null) {
    categoryScores.language_location = Math.min(
      categoryScores.language_location,
      languageCap,
    );
  }
  const score = SCORE_CATEGORIES.reduce(
    (sum, category) => sum + categoryScores[category],
    0,
  );

  const strong = new Set<string>();
  const credible = new Set<string>();
  let mustHaveTotal = 0;
  let mustHaveMet = 0;
  for (const row of assessment.coverage) {
    const isMustHave = kindOf.get(row.requirement_id) === 'must_have';
    if (isMustHave) {
      mustHaveTotal += 1;
      if (isRequirementMet(row, requirements)) mustHaveMet += 1;
    }
    for (const reference of row.evidence.filter(isCounted)) {
      const entry = catalog.entries.get(reference.ref);
      // A career case has no item keys (ADR-046 item 7): it counts once, as a case.
      const point = entry?.kind === 'case' ? entry.container : reference.ref;
      const isStrongPoint =
        isMustHave && reference.strength === 'strong' && entry?.displayable;
      if (isStrongPoint) strong.add(point);
      const isCredible =
        reference.strength !== 'weak' &&
        (reference.provenance === 'commercial' ||
          reference.provenance === 'personal');
      if (isCredible) credible.add(point);
    }
  }

  const levels = new Map<RiskCategory, RiskLevel>();
  const raise = (category: RiskCategory, level: RiskLevel) => {
    const current = levels.get(category);
    if (!current || RISK_LEVEL_RANK[level] > RISK_LEVEL_RANK[current]) {
      levels.set(category, level);
    }
  };
  // An undetermined location adds no category to stacking (ADR-046 item 5).
  const isLocationUndetermined =
    assessment.eligibility.remote_location.value === 'undetermined';
  const ignoredRisks: string[] = [];
  for (const risk of assessment.risks) {
    if (isLocationUndetermined && risk.category === 'location_remote') {
      ignoredRisks.push(risk.cause_id);
      continue;
    }
    raise(risk.category, risk.level);
  }
  // A German requirement below H1 is one language risk at its level (Appendix H1).
  const germanLevel = germanRiskLevelOf(requirements);
  if (germanLevel) raise('language', germanLevel);
  // An agency listing counts as one category in S1 (Appendix C3).
  if (hasVacancyFact(requirements, 'agency_listing')) raise('agency', 'medium');
  const stackingCategories = RISK_CATEGORIES.filter((category) =>
    isAtLeast(levels.get(category), 'medium'),
  );

  const counts: PolicyCounts = {
    strong_points: strong.size,
    credible_points: credible.size,
    must_have_total: mustHaveTotal,
    must_have_met: mustHaveMet,
    stacking_categories: stackingCategories,
  };

  return {
    score,
    categoryScores,
    languageCap,
    counts,
    levels,
    ignoredRisks,
    isSeniorRole:
      requirements.seniority.level === 'senior' ||
      requirements.seniority.level === 'lead',
    shadow: shadowSubScoresOf(context),
  };
};

// Observational only (ADR-046 item 4): computed from the map, never read by any rule.
const shadowSubScoresOf = (context: PolicyContext): ShadowSubScores => {
  const { requirements, assessment } = context;
  const core = assessment.coverage.filter((row) => row.is_core);
  const coreMet = core.filter((row) => isRequirementMet(row, requirements));
  const references = assessment.coverage.flatMap((row) =>
    row.evidence.filter(isCounted),
  );
  const strongReferences = references.filter(
    (reference) => reference.strength === 'strong',
  );
  const share = (part: number, total: number, max: number) =>
    total === 0 ? null : Math.round((max * part) / total);
  return {
    tech_stack: share(
      coreMet.length,
      core.length,
      SCORE_CATEGORY_MAX.tech_stack,
    ),
    evidence_quality: share(
      strongReferences.length,
      references.length,
      SCORE_CATEGORY_MAX.evidence_quality,
    ),
  };
};

// ---------- H ----------

type RuleEvaluator<T extends RuleOutcome> = (
  context: PolicyContext,
  derived: Derived,
) => T;

const definingRequirementOf = (context: PolicyContext) => {
  const id = context.assessment.judgements.defining_requirement.requirement_id;
  const row = context.assessment.coverage.find(
    (item) => item.requirement_id === id,
  );
  return { id, basis: row ? row.basis : null };
};

const HARD_CONSTRAINTS: ReadonlyArray<{
  row: PolicyRowId;
  evaluate: RuleEvaluator<RuleOutcome>;
}> = [
  {
    row: 'H1',
    evaluate: ({ requirements }) => {
      const isEnglishMain = hasVacancyFact(
        requirements,
        'english_main_working_language',
      );
      const blockers = requirements.languages
        .filter((language) => isExternalGermanBlocker(language, isEnglishMain))
        .map((language) => language.id);
      return {
        applied: blockers.length > 0,
        inputs: { german_requirements: blockers, english_main: isEnglishMain },
      };
    },
  },
  {
    row: 'H2',
    evaluate: ({ assessment }) => {
      const { eligibility } = assessment;
      const incompatible = [
        ...ELIGIBILITY_CONDITIONS.filter(
          (name) => eligibility[name].value === 'incompatible',
        ),
        ...eligibility.other
          .filter((condition) => condition.value === 'incompatible')
          .map((condition) => condition.id),
      ];
      return {
        applied: incompatible.length > 0,
        inputs: { incompatible },
      };
    },
  },
  {
    row: 'H3',
    evaluate: ({ assessment }) => {
      const family = assessment.judgements.role_family.value;
      return {
        applied: EXCLUDED_ROLE_FAMILIES.includes(family),
        inputs: { role_family: family },
      };
    },
  },
  {
    row: 'H4',
    evaluate: (context) => {
      const defining = definingRequirementOf(context);
      const isCommercialRequired =
        defining.id !== null &&
        factApplies(
          context.requirements,
          'commercial_experience_required',
          defining.id,
        );
      const hasNoCommercialBasis =
        defining.basis !== null &&
        NON_COMMERCIAL_BASES.includes(defining.basis);
      return {
        applied: isCommercialRequired && hasNoCommercialBasis,
        inputs: {
          defining_requirement: defining.id,
          basis: defining.basis,
          commercial_required: isCommercialRequired,
        },
      };
    },
  },
  {
    row: 'H5',
    evaluate: ({ assessment }) => ({
      applied: assessment.judgements.requires_overstretch.value,
      inputs: {
        requires_overstretch: assessment.judgements.requires_overstretch,
      },
    }),
  },
  {
    row: 'H6',
    evaluate: ({ assessment }) => ({
      applied: assessment.judgements.ownership_unsupported.value,
      inputs: {
        ownership_unsupported: assessment.judgements.ownership_unsupported,
      },
    }),
  },
  {
    row: 'H7',
    evaluate: (_context, derived) => ({
      applied: derived.counts.credible_points < 2,
      inputs: { credible_points: derived.counts.credible_points },
    }),
  },
];

const JUDGEMENT_HARD_CONSTRAINTS: readonly PolicyRowId[] = ['H5', 'H6'];

// ---------- B ----------

const evaluateBand = (
  context: PolicyContext,
  derived: Derived,
): {
  row: PolicyRowId;
  decision: Decision;
  inputs: Record<string, unknown>;
  borderline: string | null;
} => {
  const { score, levels, counts } = derived;
  const { judgements } = context.assessment;
  if (score >= 75) {
    const isThin = counts.strong_points < 3;
    return {
      row: 'B1',
      decision: 'apply',
      inputs: { score, strong_points: counts.strong_points },
      borderline: isThin ? 'B1: fewer than 3 strong points' : null,
    };
  }
  if (score >= 65) {
    const isApply =
      judgements.core_stack_close.value &&
      !isAtLeast(levels.get('core_stack'), 'medium') &&
      !isAtLeast(levels.get('language'), 'medium') &&
      !isAtLeast(levels.get('seniority'), 'medium') &&
      counts.strong_points >= 3;
    return {
      row: 'B2',
      decision: isApply ? 'apply' : 'maybe',
      inputs: {
        score,
        core_stack_close: judgements.core_stack_close.value,
        core_stack: levels.get('core_stack') ?? null,
        language: levels.get('language') ?? null,
        seniority: levels.get('seniority') ?? null,
        strong_points: counts.strong_points,
      },
      borderline: null,
    };
  }
  if (score >= 55) {
    const isMaybe =
      judgements.core_stack_close.value &&
      judgements.main_risk_manageable.value &&
      !judgements.reached_by_core_gaps.value;
    return {
      row: 'B3',
      decision: isMaybe ? 'maybe' : 'skip',
      inputs: {
        score,
        core_stack_close: judgements.core_stack_close.value,
        main_risk_manageable: judgements.main_risk_manageable.value,
        reached_by_core_gaps: judgements.reached_by_core_gaps.value,
      },
      borderline: null,
    };
  }
  return { row: 'B4', decision: 'skip', inputs: { score }, borderline: null };
};

// ---------- C ----------

const CAPS: ReadonlyArray<{
  row: PolicyRowId;
  evaluate: RuleEvaluator<CapOutcome>;
}> = [
  {
    row: 'C1',
    evaluate: (context, derived) => {
      const gaps = context.assessment.coverage
        .filter((row) => row.is_core && CORE_GAP_BASES.includes(row.basis))
        .map((row) => row.requirement_id);
      const applied = gaps.length >= 2;
      const isOptional = gaps.every((id) =>
        factApplies(context.requirements, 'optional_or_transferable', id),
      );
      const isSeniorSkip = derived.isSeniorRole && !isOptional;
      return {
        applied,
        cap: applied ? (isSeniorSkip ? 'skip' : 'maybe') : null,
        borderline: null,
        inputs: {
          core_gaps: gaps,
          senior_role: derived.isSeniorRole,
          optional_or_transferable: isOptional,
        },
      };
    },
  },
  {
    row: 'C2',
    evaluate: ({ requirements, assessment }) => {
      const applied = hasVacancyFact(requirements, 'early_stage_role');
      const { judgements, eligibility } = assessment;
      const isLocationUndetermined =
        eligibility.remote_location.value === 'undetermined';
      const allFitsVeryStrong =
        judgements.all_fits_very_strong.value && !isLocationUndetermined;
      const isBarLowered =
        hasVacancyFact(requirements, 'lowers_evidence_bar') &&
        !hasVacancyFact(requirements, 'senior_product_ownership_ask');
      const isProductEvidenceMet =
        isBarLowered || judgements.product_evidence_strong.value;
      const isExempt = isProductEvidenceMet && allFitsVeryStrong;
      return {
        applied,
        cap: applied && !isExempt ? 'maybe' : null,
        borderline: null,
        inputs: {
          product_evidence_strong: judgements.product_evidence_strong.value,
          all_fits_very_strong: judgements.all_fits_very_strong.value,
          location_undetermined: isLocationUndetermined,
          lowers_evidence_bar: isBarLowered,
        },
      };
    },
  },
  {
    row: 'C3',
    evaluate: ({ requirements }, derived) => {
      const isAgency = hasVacancyFact(requirements, 'agency_listing');
      const others = derived.counts.stacking_categories.filter(
        (category) => category !== 'agency',
      );
      const applied = isAgency && others.length > 0;
      return {
        applied,
        cap: applied ? 'maybe' : null,
        borderline: null,
        inputs: { agency_listing: isAgency, other_categories: others },
      };
    },
  },
  {
    row: 'C4',
    evaluate: (context, derived) => {
      const defining = definingRequirementOf(context);
      const inputs: Record<string, unknown> = {
        defining_requirement: defining.id,
        basis: defining.basis,
      };
      if (defining.id === null || defining.basis === null) {
        return { applied: false, cap: null, borderline: null, inputs };
      }
      if (defining.basis === 'commercial_transferable') {
        return {
          applied: true,
          cap: null,
          borderline:
            'C4: transferable commercial basis for the defining requirement',
          inputs,
        };
      }
      if (!NON_COMMERCIAL_BASES.includes(defining.basis)) {
        return { applied: false, cap: null, borderline: null, inputs };
      }
      const isLifted =
        factApplies(
          context.requirements,
          'equivalent_experience_accepted',
          defining.id,
        ) ||
        factApplies(context.requirements, 'lowers_evidence_bar', defining.id);
      // The defining-requirement gap is a core-stack gap (`prompt1_v13.txt` line 195), so
      // "another category" is any category but core stack, whichever requirements it cites.
      const otherHigh = RISK_CATEGORIES.filter(
        (category) =>
          category !== 'core_stack' &&
          isAtLeast(derived.levels.get(category), 'high'),
      );
      inputs.exception = isLifted;
      inputs.other_high_categories = otherHigh;
      if (isLifted)
        return { applied: true, cap: null, borderline: null, inputs };
      return {
        applied: true,
        cap: otherHigh.length > 0 ? 'skip' : 'maybe',
        borderline: null,
        inputs,
      };
    },
  },
  {
    row: 'C5',
    evaluate: ({ assessment }, derived) => {
      const isEnglishHigh = assessment.risks.some(
        (risk) =>
          risk.category === 'language' &&
          risk.language === 'english' &&
          isAtLeast(risk.level, 'high'),
      );
      const isCoreGap = isAtLeast(derived.levels.get('core_stack'), 'medium');
      const applied = isEnglishHigh && isCoreGap;
      return {
        applied,
        cap: applied ? 'maybe' : null,
        borderline: applied ? 'C5: English risk with core-stack gaps' : null,
        inputs: { english_high: isEnglishHigh, core_stack_gap: isCoreGap },
      };
    },
  },
];

// ---------- the policy without the advisory decision ----------

const effectOf = (applied: boolean, effect: string) =>
  applied ? effect : 'no effect';

const flagInputs = (context: PolicyContext) => {
  const { eligibility } = context.assessment;
  const openQuestions: OpenQuestion[] = [];
  for (const name of ELIGIBILITY_CONDITIONS) {
    if (eligibility[name].value === 'undetermined') {
      openQuestions.push({
        condition: `eligibility.${name}`,
        note: eligibility[name].note,
      });
    }
  }
  const manualReviewRequired = openQuestions.length > 0;
  for (const condition of eligibility.other) {
    if (condition.value === 'undetermined') {
      openQuestions.push({
        condition: `eligibility.other.${condition.id}`,
        note: condition.label,
      });
    }
  }
  return { openQuestions, manualReviewRequired };
};

const decide = (context: PolicyContext): CoreResult => {
  const derived = deriveInputs(context);
  const trace: PolicyTraceEntry[] = [];
  const borderlineReasons: string[] = [];
  const record = (
    row: PolicyRowId,
    applied: boolean,
    inputs: Record<string, unknown>,
    effect: string,
  ) => trace.push({ row, applied, inputs, effect });

  record(
    'V',
    true,
    {
      requirements: context.requirements.requirements.length,
      risks: context.assessment.risks.length,
      risks_of_undetermined_location: derived.ignoredRisks,
      snapshot_id: context.assessment.snapshot_id,
    },
    'input valid',
  );

  let decision: Decision = 'skip';
  let decidingRule: PolicyRowId = 'V';
  let hardRule: PolicyRowId | null = null;
  for (const constraint of HARD_CONSTRAINTS) {
    const outcome = constraint.evaluate(context, derived);
    record(
      constraint.row,
      outcome.applied,
      outcome.inputs,
      effectOf(outcome.applied, 'skip'),
    );
    if (outcome.applied) {
      hardRule = constraint.row;
      break;
    }
  }

  if (hardRule !== null) {
    decidingRule = hardRule;
    if (JUDGEMENT_HARD_CONSTRAINTS.includes(hardRule)) {
      borderlineReasons.push(
        `${hardRule}: a judgement-based hard constraint decided the outcome`,
      );
    }
  } else {
    const band = evaluateBand(context, derived);
    decision = band.decision;
    decidingRule = band.row;
    record(band.row, true, band.inputs, `base ${band.decision}`);
    if (band.borderline) borderlineReasons.push(band.borderline);

    const base = decision;
    const caps: Array<{ row: PolicyRowId; cap: Decision }> = [];
    for (const rule of CAPS) {
      const outcome = rule.evaluate(context, derived);
      const effect = outcome.cap ? `max ${outcome.cap}` : 'no cap';
      record(
        rule.row,
        outcome.applied,
        outcome.inputs,
        effectOf(outcome.applied, effect),
      );
      if (outcome.borderline) borderlineReasons.push(outcome.borderline);
      if (outcome.cap) caps.push({ row: rule.row, cap: outcome.cap });
    }
    decision = caps.reduce((current, item) => lowerOf(current, item.cap), base);
    const binding = caps.find((item) => item.cap === decision);
    if (decision !== base && binding) decidingRule = binding.row;

    const categories = derived.counts.stacking_categories;
    const isStacked = categories.length >= 3;
    const afterStacking = isStacked ? ONE_LEVEL_DOWN[decision] : decision;
    record(
      'S1',
      isStacked,
      { categories },
      effectOf(isStacked, `${decision} → ${afterStacking}`),
    );
    if (afterStacking !== decision) decidingRule = 'S1';
    decision = afterStacking;

    const isSeniorStacked = derived.isSeniorRole && categories.length >= 4;
    const strategic = context.assessment.judgements.strategic_exception;
    const s2Inputs = {
      senior_role: derived.isSeniorRole,
      categories: categories.length,
      strategic_exception: strategic,
    };
    if (!isSeniorStacked) {
      record('S2', false, s2Inputs, 'no effect');
    } else if (strategic.value) {
      const lifted = lowerOf(decision, 'maybe');
      record('S2', true, s2Inputs, `strategic exception: ${lifted}`);
      if (lifted !== 'skip') {
        decidingRule = 'S2';
        borderlineReasons.push('S2: a strategic exception decided the outcome');
      }
      decision = lifted;
    } else {
      record('S2', true, s2Inputs, 'skip');
      if (decision !== 'skip') decidingRule = 'S2';
      decision = 'skip';
    }
  }

  const { score } = derived;
  const nearThreshold = BAND_THRESHOLDS.filter(
    (threshold) => Math.abs(score - threshold) <= BORDERLINE_MARGIN_POINTS,
  );
  for (const threshold of nearThreshold) {
    borderlineReasons.push(
      `F: score ${score} is within ${BORDERLINE_MARGIN_POINTS} points of ${threshold}`,
    );
  }
  const { openQuestions, manualReviewRequired } = flagInputs(context);
  record(
    'F',
    true,
    {
      deciding_rule: decidingRule,
      score,
      language_cap: derived.languageCap,
      manual_review_required: manualReviewRequired,
      open_questions: openQuestions.map((question) => question.condition),
    },
    `decision ${decision} by ${decidingRule}`,
  );

  return {
    decision,
    decidingRule,
    trace,
    borderlineReasons,
    manualReviewRequired,
    openQuestions,
    derived,
  };
};

// ---------- F: the advisory comparison, after the decision is final ----------

export const runDecisionPolicy = (
  input: DecisionPolicyInput,
  advisoryDecision: Decision,
): AnalysisDecision => {
  if (!isOneOf(DECISIONS, advisoryDecision)) {
    throw new DecisionPolicyInputError([
      `advisory decision must be apply, maybe or skip, got ${String(advisoryDecision)}`,
    ]);
  }
  const context = validatePolicyInput(input);
  const result = decide(context);
  const isDifferent = advisoryDecision !== result.decision;
  const trace = [
    ...result.trace,
    {
      row: 'F' as const,
      applied: isDifferent,
      inputs: {
        advisory_decision: advisoryDecision,
        policy_decision: result.decision,
      },
      effect: isDifferent
        ? `advisory ${advisoryDecision} differs from policy ${result.decision}: borderline`
        : 'advisory equals policy',
    },
  ];
  const borderlineReasons = isDifferent
    ? [
        ...result.borderlineReasons,
        `F: advisory decision ${advisoryDecision} differs from the policy result ${result.decision}`,
      ]
    : result.borderlineReasons;

  return {
    contract_version: ANALYSIS_DECISION_CONTRACT_VERSION,
    policy_version: DECISION_POLICY_VERSION,
    snapshot_id: context.assessment.snapshot_id,
    decision: result.decision,
    score: result.derived.score,
    category_scores: result.derived.categoryScores,
    deciding_rule: result.decidingRule,
    trace,
    manual_review_required: result.manualReviewRequired,
    borderline: borderlineReasons.length > 0,
    borderline_reasons: borderlineReasons,
    open_questions: result.openQuestions,
    advisory_decision: advisoryDecision,
    advisory_differs: isDifferent,
    counts: result.derived.counts,
    shadow_sub_scores: result.derived.shadow,
  };
};
