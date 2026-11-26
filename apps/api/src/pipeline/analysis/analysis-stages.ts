// The stages of the experimental analysis (ADR-046 items 3, 15; ISSUE-713): which stage keys a
// strategy runs, the shape of each stage's answer, and the snapshot a candidate-aware stage is
// pinned to. Pure: no Nest, Prisma, `fs` or provider.

import { createHash } from 'crypto';
import {
  DECISIONS,
  Decision,
} from '../structured-analysis/analysis-decision.schema';
import {
  EvidenceCatalog,
  MANUAL_NOTE_REFERENCE,
} from '../structured-analysis/evidence-catalog';
import { FIT_ASSESSMENT_CONTRACT_MAJOR } from '../structured-analysis/fit-assessment.schema';
import {
  ContractValidation,
  VACANCY_REQUIREMENTS_CONTRACT_MAJOR,
  isOneOf,
  isRecord,
} from '../structured-analysis/vacancy-requirements.schema';

export const ANALYSIS_STAGE_KEYS = [
  'analysis_x1',
  'analysis_x2',
  'analysis_b',
] as const;

export type AnalysisStageKey = (typeof ANALYSIS_STAGE_KEYS)[number];
export type ExperimentalStrategy = 'b' | 'c';

export interface AnalysisStage {
  key: AnalysisStageKey;
  // X1 reads the vacancy only; X2 and B also read candidate evidence (INV-6).
  isCandidateAware: boolean;
  // The stage answer carries `01a` (X1, B) and/or `01b` (X2, B).
  producesRequirements: boolean;
  producesAssessment: boolean;
  contractMajors: readonly number[];
}

const X1: AnalysisStage = {
  key: 'analysis_x1',
  isCandidateAware: false,
  producesRequirements: true,
  producesAssessment: false,
  contractMajors: [VACANCY_REQUIREMENTS_CONTRACT_MAJOR],
};

const X2: AnalysisStage = {
  key: 'analysis_x2',
  isCandidateAware: true,
  producesRequirements: false,
  producesAssessment: true,
  contractMajors: [FIT_ASSESSMENT_CONTRACT_MAJOR],
};

const B: AnalysisStage = {
  key: 'analysis_b',
  isCandidateAware: true,
  producesRequirements: true,
  producesAssessment: true,
  contractMajors: [
    VACANCY_REQUIREMENTS_CONTRACT_MAJOR,
    FIT_ASSESSMENT_CONTRACT_MAJOR,
  ],
};

// B and C differ only by X1 (INV-4): C splits the extraction into its own call.
const STAGES_BY_STRATEGY: Readonly<
  Record<ExperimentalStrategy, readonly AnalysisStage[]>
> = {
  b: [B],
  c: [X1, X2],
};

export const stagesOf = (
  strategy: ExperimentalStrategy,
): readonly AnalysisStage[] => STAGES_BY_STRATEGY[strategy];

// ---------- stage answers ----------

export interface AssessmentAnswer {
  // `01a` as answered by B; null for X2, which reads the `01a` of X1.
  requirements: unknown;
  assessment: unknown;
  advisoryDecision: Decision;
}

export const parseStageJson = (text: string): ContractValidation<unknown> => {
  try {
    return { success: true, data: JSON.parse(text) as unknown };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { success: false, errors: [`the answer is not JSON: ${reason}`] };
  }
};

// X1 answers with the `01a` object itself; its content is checked by the T1 validator.
export const parseRequirementsAnswer = (
  raw: unknown,
): ContractValidation<unknown> =>
  isRecord(raw)
    ? { success: true, data: raw }
    : { success: false, errors: ['the X1 answer must be a JSON object'] };

// X2 answers `{ fit_assessment, advisory_decision }`, B also `vacancy_requirements`.
export const parseAssessmentAnswer = (
  stage: AnalysisStage,
  raw: unknown,
): ContractValidation<AssessmentAnswer> => {
  if (!isRecord(raw)) {
    return {
      success: false,
      errors: [`the ${stage.key} answer must be a JSON object`],
    };
  }
  const errors: string[] = [];
  if (stage.producesRequirements && !isRecord(raw.vacancy_requirements)) {
    errors.push('vacancy_requirements must be an object');
  }
  if (!isRecord(raw.fit_assessment)) {
    errors.push('fit_assessment must be an object');
  }
  if (!isOneOf(DECISIONS, raw.advisory_decision)) {
    errors.push('advisory_decision must be apply, maybe or skip');
  }
  if (errors.length > 0) return { success: false, errors };
  return {
    success: true,
    data: {
      requirements: stage.producesRequirements
        ? raw.vacancy_requirements
        : null,
      assessment: raw.fit_assessment,
      advisoryDecision: raw.advisory_decision as Decision,
    },
  };
};

// ---------- the pinned snapshot ----------

export interface SnapshotSource {
  id: string;
  filePath: string;
  sourceType: string;
  contentHash: string;
  versionLabel: string | null;
}

export interface StageSnapshot {
  snapshotId: string;
  catalogHash: string;
  knowledgeSources: SnapshotSource[];
}

const SNAPSHOT_ID_PREFIX = 'snap-';
const SNAPSHOT_ID_HEX_LENGTH = 16;

export const sha256 = (text: string): string =>
  createHash('sha256').update(text, 'utf-8').digest('hex');

// Code-point order: unlike localeCompare it does not depend on the host's ICU locale, so the
// snapshot id and the catalog hash are the same on every machine.
const compareText = (left: string, right: string): number => {
  if (left < right) return -1;
  return left > right ? 1 : 0;
};

// Ordered by source type, then id, so the id does not depend on the order the rows were read in.
export const snapshotEntries = (
  sources: readonly Pick<SnapshotSource, 'id' | 'sourceType' | 'contentHash'>[],
): [string, string, string][] =>
  sources
    .map((source): [string, string, string] => [
      source.sourceType,
      source.id,
      source.contentHash,
    ])
    .sort((left, right) => compareText(left.join('\n'), right.join('\n')));

// The id the catalog keys are valid with (ADR-046 item 7): a short digest of the source ids and
// content hashes the stage read.
export const snapshotIdOf = (
  sources: readonly Pick<SnapshotSource, 'id' | 'sourceType' | 'contentHash'>[],
): string =>
  SNAPSHOT_ID_PREFIX +
  sha256(JSON.stringify(snapshotEntries(sources))).slice(
    0,
    SNAPSHOT_ID_HEX_LENGTH,
  );

export const catalogHashOf = (catalog: EvidenceCatalog): string =>
  sha256(
    JSON.stringify({
      snapshotId: catalog.snapshotId,
      entries: [...catalog.entries.values()]
        .map((entry) => [
          entry.key,
          entry.container,
          entry.kind,
          entry.provenance,
          entry.assessable,
          entry.displayable,
        ])
        .sort((left, right) => compareText(String(left[0]), String(right[0]))),
    }),
  );

const hasNoSnapshot = (value: Record<string, unknown>): boolean =>
  value.snapshot_id === undefined || value.snapshot_id === null;

const isManualNoteReference = (reference: Record<string, unknown>): boolean =>
  reference.provenance === 'manual_note' ||
  (typeof reference.ref === 'string' &&
    MANUAL_NOTE_REFERENCE.test(reference.ref));

const withSnapshot = (reference: unknown, snapshotId: string): unknown => {
  if (!isRecord(reference) || isManualNoteReference(reference)) {
    return reference;
  }
  return hasNoSnapshot(reference)
    ? { ...reference, snapshot_id: snapshotId }
    : reference;
};

// The runner knows the snapshot the stage read, so it records it on `01b` and on every
// catalog reference that carries none (INV-14). A different id the model wrote is kept and then
// fails validation. Returns a copy; the answer itself is not changed.
export const recordSnapshotId = (
  assessment: unknown,
  snapshotId: string,
): unknown => {
  if (!isRecord(assessment)) return assessment;
  const coverage = Array.isArray(assessment.coverage)
    ? assessment.coverage.map((row: unknown) =>
        isRecord(row) && Array.isArray(row.evidence)
          ? {
              ...row,
              evidence: row.evidence.map((reference: unknown) =>
                withSnapshot(reference, snapshotId),
              ),
            }
          : row,
      )
    : assessment.coverage;
  return {
    ...assessment,
    snapshot_id: hasNoSnapshot(assessment)
      ? snapshotId
      : assessment.snapshot_id,
    coverage,
  };
};
