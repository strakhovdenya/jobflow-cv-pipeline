// The identity of one experimental analysis stage (ADR-046 item 13 as amended 2026-11-26,
// ISSUE-713 INV-6): a hash over exactly the inputs that materially affect the stage. A stage
// result is reusable only under the same identity. Pure.

import { sha256, snapshotEntries } from './analysis-stages';

export const RESPONSE_FORMAT_JSON_OBJECT = 'json_object';

export interface StageModel {
  provider: string;
  model: string;
}

export interface StageRequestSettings {
  maxOutputTokens: number;
  responseFormat: string;
}

export interface ContextProfile {
  layout: string;
  sourceSet: string;
}

interface CommonIdentityInput {
  templateContent: string;
  contractMajors: readonly number[];
  model: StageModel;
  settings: StageRequestSettings;
  vacancyText: string;
  // hash of the exact provider request, which also covers source labels, unavailable-source
  // notes and the block layout of the input builder
  requestHash: string;
}

// X1 reads the vacancy and its excerpt of cv_rules only: no candidate source, no note, no profile.
export interface ExtractionIdentityInput extends CommonIdentityInput {
  stage: 'analysis_x1';
  aiWeightExcerpt: string;
}

export interface SnapshotIdentityEntry {
  id: string;
  sourceType: string;
  contentHash: string;
}

export interface NoteIdentityEntry {
  id: string;
  text: string;
}

export interface AssessmentIdentityInput extends CommonIdentityInput {
  stage: 'analysis_x2' | 'analysis_b';
  // the exact `01a` text X2 reads; null for B, which extracts it itself
  requirementsText: string | null;
  snapshot: readonly SnapshotIdentityEntry[];
  catalogHash: string;
  manualNotes: readonly NoteIdentityEntry[];
  candidateConstantsBlock: string;
  contextProfile: ContextProfile;
}

export type StageIdentityInput =
  ExtractionIdentityInput | AssessmentIdentityInput;

const commonComponents = (input: StageIdentityInput) => ({
  stage: input.stage,
  template: sha256(input.templateContent),
  contractMajors: [...input.contractMajors],
  provider: input.model.provider,
  model: input.model.model,
  maxOutputTokens: input.settings.maxOutputTokens,
  responseFormat: input.settings.responseFormat,
  vacancy: sha256(input.vacancyText),
  request: input.requestHash,
});

const materialComponents = (input: StageIdentityInput) => {
  if (input.stage === 'analysis_x1') {
    return { aiWeightExcerpt: sha256(input.aiWeightExcerpt) };
  }
  return {
    requirements:
      input.requirementsText === null ? null : sha256(input.requirementsText),
    snapshot: sha256(JSON.stringify(snapshotEntries(input.snapshot))),
    catalog: input.catalogHash,
    manualNotes: sha256(
      JSON.stringify(input.manualNotes.map((note) => [note.id, note.text])),
    ),
    candidateConstants: sha256(input.candidateConstantsBlock),
    contextProfile: `${input.contextProfile.layout}/${input.contextProfile.sourceSet}`,
  };
};

// The named components, every free text replaced by its hash; recorded next to the hash so a
// mismatch can be explained.
export const stageIdentityComponents = (input: StageIdentityInput) => ({
  ...commonComponents(input),
  ...materialComponents(input),
});

export const computeStageIdentity = (input: StageIdentityInput): string =>
  sha256(JSON.stringify(stageIdentityComponents(input)));
