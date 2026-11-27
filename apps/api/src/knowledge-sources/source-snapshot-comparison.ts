// The downstream source-mismatch stop of ADR-046 item 13 (Phases 1–2, ISSUE-715): an experimental
// analysis pins the knowledge sources its X2 or B stage read; Prompt 3, the cover letter and the
// workspace detail compare the sources they would use now with that snapshot. The comparison is
// pure; `findPinnedSnapshot` is the one lookup of the snapshot and only reads.

import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ContextSourceSet, PrismaClient } from '@prisma/client';
import {
  CONTEXT_SOURCE_SET_EXCLUSIONS,
  STEP_SOURCE_GROUPS,
} from './knowledge-source-selection.service';

export interface SnapshotSourceEntry {
  id: string;
  sourceType: string;
  contentHash: string;
}

export interface PinnedSources {
  // the stage key of the run that recorded the snapshot (`analysis_x2` or `analysis_b`)
  stageKey: string;
  sources: readonly SnapshotSourceEntry[];
  // the types the stage read under the workspace's context source set; only these are compared
  pinnedTypes: ReadonlySet<string>;
}

export type PinnedSnapshot =
  | { kind: 'none' }
  | ({ kind: 'pinned' } & PinnedSources)
  | { kind: 'unreadable'; reason: string };

export type PinnedSnapshotReader = Pick<
  PrismaClient,
  'generatedArtifact' | 'promptRun'
>;

export interface PinnedSnapshotWorkspace {
  id: string;
  contextSourceSet: ContextSourceSet;
}

// The legacy-shaped `01_vacancy_analysis.json` closes every analysis: Prompt 1 registers it under
// its `prompt_1` run, the experimental runner under the run of its last stage (X2 or B).
const ANALYSIS_ARTIFACT_TYPE = 'vacancy_analysis_json';
const PINNING_STAGE_KEYS: readonly string[] = ['analysis_x2', 'analysis_b'];

const NO_SNAPSHOT: PinnedSnapshot = { kind: 'none' };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const toEntry = (value: unknown): SnapshotSourceEntry | null => {
  if (!isRecord(value)) return null;
  const { id, sourceType, contentHash } = value;
  const isEntry =
    isNonEmptyString(id) &&
    isNonEmptyString(sourceType) &&
    isNonEmptyString(contentHash);
  return isEntry ? { id, sourceType, contentHash } : null;
};

// The `knowledgeSources` list of a recorded source snapshot (the X2 / B stage and the Prompt 3 and
// cover-letter builders write the same entry shape). null when the text is missing, not JSON, or
// any entry lacks an id, source type or content hash: such a snapshot cannot be trusted at all.
export const parseSnapshotSources = (
  text: string | null,
): SnapshotSourceEntry[] | null => {
  if (text === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.knowledgeSources)) {
    return null;
  }
  const entries: SnapshotSourceEntry[] = [];
  for (const item of parsed.knowledgeSources as unknown[]) {
    const entry = toEntry(item);
    if (entry === null) return null;
    entries.push(entry);
  }
  return entries;
};

const stepTypesOf = (step: string): string[] => {
  const groups = STEP_SOURCE_GROUPS[step];
  if (!groups) {
    throw new Error(`No source groups are defined for step "${step}"`);
  }
  return [...groups.required, ...groups.optional];
};

// Every type of the stage's groups the source set did not leave out, plus every type the snapshot
// holds (the B stage of the `assessment` set still reads `cv_rules` for its excerpt).
export const pinnedTypesOf = (
  stageKey: string,
  sourceSet: ContextSourceSet,
  sources: readonly SnapshotSourceEntry[],
): ReadonlySet<string> => {
  const excluded = CONTEXT_SOURCE_SET_EXCLUSIONS[sourceSet];
  const types = new Set(
    stepTypesOf(stageKey).filter((type) => !excluded.includes(type)),
  );
  for (const source of sources) types.add(source.sourceType);
  return types;
};

const identitiesOf = (
  sources: readonly SnapshotSourceEntry[],
  sourceType: string,
): string[] =>
  sources
    .filter((source) => source.sourceType === sourceType)
    .map((source) => `${source.id}\n${source.contentHash}`)
    .sort();

const isSameIdentityList = (left: string[], right: string[]): boolean =>
  left.length === right.length &&
  left.every((identity, index) => identity === right[index]);

// The source types of `step` (its `STEP_SOURCE_GROUPS` entry) whose sources differ from the
// pinned ones by id or content hash, in the order of the groups. A pinned type without a snapshot
// entry differs from any selected source; a type the analysis did not read is not compared.
// `selected` may hold other types too: they are ignored.
export const findSourceMismatches = (
  step: string,
  selected: readonly SnapshotSourceEntry[],
  pinned: Pick<PinnedSources, 'sources' | 'pinnedTypes'>,
): string[] =>
  stepTypesOf(step).filter(
    (type) =>
      pinned.pinnedTypes.has(type) &&
      !isSameIdentityList(
        identitiesOf(selected, type),
        identitiesOf(pinned.sources, type),
      ),
  );

// The snapshot of the run that produced the workspace's latest analysis: that run's output is the
// analysis, whatever its bookkeeping status (a reused stage run can be `failed`, a last stage run
// whose completion failed stays open), so a newer failed attempt or an older completed one never
// stands in for it. No analysis, or one made by Prompt 1, means no snapshot. A missing run or an
// unreadable snapshot is reported, never treated as "no snapshot".
export const findPinnedSnapshot = async (
  reader: PinnedSnapshotReader,
  workspace: PinnedSnapshotWorkspace,
): Promise<PinnedSnapshot> => {
  const analysis = await reader.generatedArtifact.findFirst({
    where: {
      workspaceId: workspace.id,
      artifactType: ANALYSIS_ARTIFACT_TYPE,
      isLatest: true,
    },
    select: { promptRunId: true },
  });
  if (!analysis?.promptRunId) return NO_SNAPSHOT;

  const run = await reader.promptRun.findUnique({
    where: { id: analysis.promptRunId },
    select: { workspaceId: true, promptStep: true, sourceSnapshot: true },
  });
  if (!run || run.workspaceId !== workspace.id) {
    return {
      kind: 'unreadable',
      reason: `the run "${analysis.promptRunId}" of the latest analysis was not found`,
    };
  }
  if (!PINNING_STAGE_KEYS.includes(run.promptStep)) return NO_SNAPSHOT;

  const sources = parseSnapshotSources(run.sourceSnapshot);
  if (sources === null) {
    return {
      kind: 'unreadable',
      reason: `the source snapshot of the ${run.promptStep} run is missing or malformed`,
    };
  }
  return {
    kind: 'pinned',
    stageKey: run.promptStep,
    sources,
    pinnedTypes: pinnedTypesOf(
      run.promptStep,
      workspace.contextSourceSet,
      sources,
    ),
  };
};

// The pre-run refusal of Prompt 3 and the cover letter. `selectedSnapshot` is the source snapshot
// the step's input builder returned: exactly the rows it selected and loaded with hash
// verification, so the rows checked are the rows the request is built from.
export const assertSourcesMatchSnapshot = (
  step: string,
  selectedSnapshot: string,
  pinned: PinnedSnapshot,
): void => {
  if (pinned.kind === 'none') return;
  if (pinned.kind === 'unreadable') {
    throw new BadRequestException(
      `${step} refused: the source snapshot the analysis was pinned to cannot be read (${pinned.reason})`,
    );
  }
  const selected = parseSnapshotSources(selectedSnapshot);
  if (selected === null) {
    throw new InternalServerErrorException(
      `${step}: the source snapshot of the step's own input cannot be read`,
    );
  }
  const mismatched = findSourceMismatches(step, selected, pinned);
  if (mismatched.length > 0) {
    throw new BadRequestException(
      `${step} refused: the active knowledge sources differ from the ones the analysis was pinned to (${mismatched.join(', ')}: id or content hash changed); the step does not mix source versions`,
    );
  }
};
