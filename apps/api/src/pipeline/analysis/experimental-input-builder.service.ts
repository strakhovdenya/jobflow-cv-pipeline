import { Injectable } from '@nestjs/common';
import {
  ContextLayout,
  ContextSourceSet,
  KnowledgeSource,
} from '@prisma/client';
import { parseCareerRegistries } from '../../evidence/career-registry.parser';
import {
  KnowledgeSourceContentEntry,
  KnowledgeSourceContentService,
} from '../../knowledge-sources/knowledge-source-content.service';
import { buildKnowledgeSourceLabel } from '../../knowledge-sources/knowledge-source-label';
import { KnowledgeSourceSelectionService } from '../../knowledge-sources/knowledge-source-selection.service';
import {
  EvidenceCatalog,
  EvidenceCatalogEntry,
  buildEvidenceCatalog,
} from '../structured-analysis/evidence-catalog';
import { AnalysisStage } from './analysis-stages';

// Builds the provider requests of the experimental analysis stages (ADR-046 amendment
// 2026-11-26, ISSUE-713 INV-9): the request layout and source set of the context profile, the
// vacancy-only X1 request with its cv_rules excerpt, and the evidence catalog of the snapshot.
// The `AiProvider` interface is unchanged: a request is still one `prompt` and one
// `inputContext`.

export class AiWeightExcerptError extends Error {
  constructor() {
    super(
      'The active cv_rules source has no "AI-assisted engineering: weight and kind" section',
    );
    this.name = 'AiWeightExcerptError';
  }
}

export class EvidenceCatalogSourceError extends Error {
  constructor(sourceType: string) {
    super(`The evidence catalog needs the "${sourceType}" source`);
    this.name = 'EvidenceCatalogSourceError';
  }
}

// The candidate sources the `assessment` source set leaves out (#707 §7).
const ASSESSMENT_EXCLUDED_SOURCE_TYPES: readonly string[] = [
  'profile_summary',
  'cv_rules',
];

const CV_RULES = 'cv_rules';
const CAREER_CASES = 'career_cases';
const AI_WEIGHT_HEADING =
  /^(#{1,6})\s+(?:[\d.]+\s+)?AI-assisted engineering: weight and kind\s*$/u;
const HEADING = /^(#{1,6})\s/u;

export interface StageRequest {
  prompt: string;
  inputContext: string;
}

export interface LoadedStageSources {
  // every source the stage reads, the recorded snapshot
  sources: KnowledgeSource[];
  // the sources rendered whole into the request
  entries: KnowledgeSourceContentEntry[];
  // the cv_rules excerpt the request carries on its own: always for X1, and for B when the
  // source set leaves cv_rules out (B must receive what X1 receives, ADR-046 item 6)
  aiWeightExcerpt: string | null;
}

export interface ManualNoteInput {
  id: string;
  text: string;
}

export interface AssessmentRequestInput {
  templateContent: string;
  layout: ContextLayout;
  vacancyText: string;
  // `01a` as X1 wrote it; null for B
  requirementsText: string | null;
  entries: readonly KnowledgeSourceContentEntry[];
  aiWeightExcerpt: string | null;
  catalog: EvidenceCatalog;
  candidateConstantsBlock: string;
  manualNotes: readonly ManualNoteInput[];
}

// The cv_rules section that X1 reads, cut by its heading up to the next heading of the same or a
// higher level (#707 §5).
export const extractAiWeightExcerpt = (cvRulesText: string): string => {
  const lines = cvRulesText.split(/\r?\n/u);
  const start = lines.findIndex((line) => AI_WEIGHT_HEADING.test(line));
  if (start === -1) throw new AiWeightExcerptError();
  const level = (AI_WEIGHT_HEADING.exec(lines[start]) as RegExpExecArray)[1]
    .length;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => {
    const heading = HEADING.exec(line);
    return heading !== null && heading[1].length <= level;
  });
  const section = end === -1 ? rest : rest.slice(0, end);
  return [lines[start], ...section].join('\n').trimEnd();
};

const textOf = (
  entries: readonly KnowledgeSourceContentEntry[],
  sourceType: string,
): string | null => {
  const entry = entries.find((item) => item.sourceType === sourceType);
  return entry && entry.contentAvailable ? entry.content : null;
};

export const cvRulesTextOf = (
  entries: readonly KnowledgeSourceContentEntry[],
): string => {
  const text = textOf(entries, CV_RULES);
  if (text === null) throw new EvidenceCatalogSourceError(CV_RULES);
  return text;
};

// The catalog of the snapshot the stage read: the registries of project_inventory and
// certifications and the cases of career_cases (ADR-046 item 7). Fails closed.
export const buildStageCatalog = (
  entries: readonly KnowledgeSourceContentEntry[],
  snapshotId: string,
): EvidenceCatalog => {
  const careerCasesText = textOf(entries, CAREER_CASES);
  if (careerCasesText === null) {
    throw new EvidenceCatalogSourceError(CAREER_CASES);
  }
  const registries = parseCareerRegistries(
    entries.map((entry) => ({
      sourceType: entry.sourceType,
      content: entry.contentAvailable ? entry.content : null,
    })),
  );
  return buildEvidenceCatalog({
    snapshotId,
    careerCasesText,
    projects: registries.portfolio.projects,
    credentials: registries.credentials.credentials,
  });
};

const yesNo = (value: boolean): string => (value ? 'yes' : 'no');

const renderCatalogEntry = (entry: EvidenceCatalogEntry): string =>
  [
    entry.key,
    `kind: ${entry.kind}`,
    `provenance: ${entry.provenance ?? 'judged by the assessment'}`,
    `assessable: ${yesNo(entry.assessable)}`,
    `displayable: ${yesNo(entry.displayable)}`,
  ].join(' | ');

export const renderEvidenceCatalog = (catalog: EvidenceCatalog): string =>
  [
    `Snapshot id: ${catalog.snapshotId}`,
    ...[...catalog.entries.values()].map(renderCatalogEntry),
  ].join('\n');

const renderKnowledgeSources = (
  entries: readonly KnowledgeSourceContentEntry[],
): string =>
  entries.length > 0
    ? entries
        .map((entry) =>
          entry.contentAvailable
            ? `${buildKnowledgeSourceLabel(entry.sourceType, entry.filePath)}\n${entry.content}`
            : `${buildKnowledgeSourceLabel(entry.sourceType, entry.filePath)}\n[Content unavailable: ${entry.unavailableReason}]`,
        )
        .join('\n\n')
    : '[No active knowledge sources available]';

// Each note keeps its id: a forced item cites it as `manual_note:<id>` (ADR-034).
const renderManualNotes = (notes: readonly ManualNoteInput[]): string[] =>
  notes.length === 0
    ? []
    : [
        ``,
        `=== MANUAL NOTE ===`,
        notes
          .map((note) => `[manual_note:${note.id}]\n${note.text}`)
          .join('\n\n'),
      ];

// X1 always uses the single layout: the template alone as the prompt.
export const buildExtractionRequest = (
  templateContent: string,
  vacancyText: string,
  aiWeightExcerpt: string,
): StageRequest => ({
  prompt: templateContent,
  inputContext: [
    `=== VACANCY TEXT ===`,
    vacancyText,
    ``,
    `=== AI-WEIGHT RULES (cv_rules excerpt) ===`,
    aiWeightExcerpt,
  ].join('\n'),
});

// `single`: the template alone is the prompt, everything else is the input context (the legacy
// split). `boundary`: the stable source pack — sources, catalog, candidate constants — moves into
// the prompt after the template; the vacancy-specific content stays in the input context.
export const buildAssessmentRequest = (
  input: AssessmentRequestInput,
): StageRequest => {
  const vacancyPart = [
    `=== VACANCY TEXT ===`,
    input.vacancyText,
    ...(input.requirementsText === null
      ? []
      : [``, `=== VACANCY REQUIREMENTS (01a) ===`, input.requirementsText]),
  ];
  const stablePack = [
    `=== KNOWLEDGE SOURCES ===`,
    renderKnowledgeSources(input.entries),
    ...(input.aiWeightExcerpt === null
      ? []
      : [
          ``,
          `=== AI-WEIGHT RULES (cv_rules excerpt) ===`,
          input.aiWeightExcerpt,
        ]),
    ``,
    `=== EVIDENCE CATALOG ===`,
    renderEvidenceCatalog(input.catalog),
    ``,
    `=== CANDIDATE CONSTANTS ===`,
    input.candidateConstantsBlock,
  ];
  const notes = renderManualNotes(input.manualNotes);

  if (input.layout === ContextLayout.boundary) {
    return {
      prompt: [input.templateContent, ``, ...stablePack].join('\n'),
      inputContext: [...vacancyPart, ...notes].join('\n'),
    };
  }
  return {
    prompt: input.templateContent,
    inputContext: [...vacancyPart, ``, ...stablePack, ...notes].join('\n'),
  };
};

@Injectable()
export class ExperimentalInputBuilderService {
  constructor(
    private readonly selection: KnowledgeSourceSelectionService,
    private readonly knowledgeSourceContent: KnowledgeSourceContentService,
  ) {}

  // The stage's source groups (STEP_SOURCE_GROUPS), narrowed by the `assessment` source set for a
  // candidate-aware stage, loaded with the hash check of the knowledge-source loader.
  async loadStageSources(
    stage: AnalysisStage,
    sourceSet: ContextSourceSet,
    activeSources: KnowledgeSource[],
  ): Promise<LoadedStageSources> {
    const selected = this.selection.selectForStep(stage.key, activeSources);
    const isNarrowed =
      stage.isCandidateAware && sourceSet === ContextSourceSet.assessment;
    const rendered = isNarrowed
      ? selected.filter(
          (source) =>
            !ASSESSMENT_EXCLUDED_SOURCE_TYPES.includes(source.sourceType),
        )
      : selected;
    const isCvRules = (source: KnowledgeSource) =>
      source.sourceType === CV_RULES;
    const needsExcerpt =
      !stage.isCandidateAware ||
      (stage.producesRequirements && !rendered.some(isCvRules));
    const sources = needsExcerpt
      ? [
          ...rendered,
          ...selected.filter(
            (source) => isCvRules(source) && !rendered.includes(source),
          ),
        ]
      : rendered;
    const loaded =
      sources.length > 0
        ? await this.knowledgeSourceContent.loadContent(sources)
        : [];
    const renderedIds = new Set(rendered.map((source) => source.id));
    return {
      sources,
      entries: stage.isCandidateAware
        ? loaded.filter((entry) => renderedIds.has(entry.id))
        : [],
      aiWeightExcerpt: needsExcerpt
        ? extractAiWeightExcerpt(cvRulesTextOf(loaded))
        : null,
    };
  }
}
