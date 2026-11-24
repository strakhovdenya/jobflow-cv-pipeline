/**
 * Checks the real active knowledge sources in apps/api/knowledge-sources/ (ISSUE-690): the files
 * of ACTIVE_KNOWLEDGE_SOURCES exist, every source type is listed once and every step gets its
 * required types, both career registries parse with the parser Prompt 2 uses, and archived
 * portfolio projects are named in prompt-bound sources only inside the registry block, and those
 * sources refer to no inactive version of a source file. Paths come
 * from the list, steps and source types from STEP_SOURCE_GROUPS, project names from the parsed
 * registry — no second copy of any of them lives here.
 */

import { KnowledgeSource } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  CareerRegistries,
  parseCareerRegistries,
  stripRegistryBlocks,
} from '../evidence/career-registry.parser';
import { containsRegistryName } from '../evidence/registry-compliance';
import { ACTIVE_KNOWLEDGE_SOURCES } from './active-knowledge-sources';
import {
  KnowledgeSourceEntry,
  findDuplicateSourceTypes,
} from './knowledge-source-registration';
import {
  KnowledgeSourceSelectionService,
  STEP_SOURCE_GROUPS,
} from './knowledge-source-selection.service';

const KNOWLEDGE_SOURCES_ROOT = path.join(__dirname, '../../knowledge-sources');

const absolutePathOf = (entry: KnowledgeSourceEntry): string =>
  path.join(KNOWLEDGE_SOURCES_ROOT, entry.relativePath);

const isTextSource = (entry: KnowledgeSourceEntry): boolean =>
  path.extname(entry.relativePath).toLowerCase() === '.md';

const readSource = (entry: KnowledgeSourceEntry): string =>
  fs.readFileSync(absolutePathOf(entry), 'utf-8');

interface MissingRequiredSourceType {
  step: string;
  sourceType: string;
}

// Every required source type of every step that the list does not contain.
const findMissingRequiredSourceTypes = (
  entries: readonly Pick<KnowledgeSourceEntry, 'sourceType'>[],
): MissingRequiredSourceType[] => {
  const listed = new Set(entries.map((entry) => entry.sourceType));
  const missing: MissingRequiredSourceType[] = [];
  for (const [step, groups] of Object.entries(STEP_SOURCE_GROUPS)) {
    for (const sourceType of groups.required) {
      if (!listed.has(sourceType)) missing.push({ step, sourceType });
    }
  }
  return missing;
};

// The archived names that a source text names outside its registry blocks.
const findArchivedNamesOutsideRegistry = (
  sourceText: string,
  archivedNames: readonly string[],
): string[] => {
  const prose = stripRegistryBlocks(sourceText);
  return archivedNames.filter((name) => containsRegistryName(prose, name));
};

// A reference to a version of a knowledge-source file: the file name up to and including its
// version (`_v0_8`, `_v2_5` or `_2026-11`), with or without the rest of the name and extension.
const VERSIONED_SOURCE_REFERENCE =
  /\b[A-Z][A-Za-z]*(?:_[A-Za-z]+)*_(?:v\d+_\d+|\d{4}-\d{2})/g;

// A file name continues a reference when it starts with it and the version number does not go on
// with another digit (`X_v1_2` is not `X_v1_20`).
const continuesReference = (fileName: string, reference: string): boolean =>
  fileName.startsWith(reference) &&
  !/\d/.test(fileName.charAt(reference.length));

// The version references in a text that no file name of the given list continues.
const findInactiveSourceReferences = (
  text: string,
  activeFileNames: readonly string[],
): string[] => {
  const references = new Set(
    Array.from(text.matchAll(VERSIONED_SOURCE_REFERENCE), (match) => match[0]),
  );
  return [...references].filter(
    (reference) =>
      !activeFileNames.some((name) => continuesReference(name, reference)),
  );
};

const activeFileNames = ACTIVE_KNOWLEDGE_SOURCES.map((entry) =>
  path.basename(entry.relativePath),
);

const toKnowledgeSource = (
  entry: KnowledgeSourceEntry,
  index: number,
): KnowledgeSource => {
  const importedAt = new Date(0);
  return {
    id: `active-${index}`,
    filePath: entry.relativePath,
    sourceType: entry.sourceType,
    isActive: true,
    contentHash: '',
    versionLabel: entry.versionLabel,
    importedAt,
    createdAt: importedAt,
    updatedAt: importedAt,
  };
};

// The text entries of the list that selectForStep hands to at least one pipeline step.
const promptBoundTextSources = (): KnowledgeSourceEntry[] => {
  const selection = new KnowledgeSourceSelectionService();
  const sources = ACTIVE_KNOWLEDGE_SOURCES.map(toKnowledgeSource);
  const selectedPaths = new Set<string>();
  for (const step of Object.keys(STEP_SOURCE_GROUPS)) {
    for (const source of selection.selectForStep(step, sources)) {
      selectedPaths.add(source.filePath);
    }
  }
  return ACTIVE_KNOWLEDGE_SOURCES.filter(
    (entry) => selectedPaths.has(entry.relativePath) && isTextSource(entry),
  );
};

// Parsed once per run; a parse error is thrown again by every test that needs the registries.
let activeRegistries: CareerRegistries | null = null;

const parseActiveRegistries = (): CareerRegistries => {
  if (activeRegistries === null) {
    activeRegistries = parseCareerRegistries(
      ACTIVE_KNOWLEDGE_SOURCES.map((entry) => ({
        sourceType: entry.sourceType,
        content: isTextSource(entry) ? readSource(entry) : null,
      })),
    );
  }
  return activeRegistries;
};

describe('active knowledge sources', () => {
  it('every active source file exists', () => {
    expect(ACTIVE_KNOWLEDGE_SOURCES.length).toBeGreaterThan(0);
    const notFiles = ACTIVE_KNOWLEDGE_SOURCES.filter((entry) => {
      const absolutePath = absolutePathOf(entry);
      return (
        !fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()
      );
    }).map((entry) => entry.relativePath);
    expect(notFiles).toEqual([]);
  });

  it('active source list has one entry per source type', () => {
    expect(findDuplicateSourceTypes(ACTIVE_KNOWLEDGE_SOURCES)).toEqual([]);
  });

  it('active source list covers every required source type of every pipeline step', () => {
    expect(Object.keys(STEP_SOURCE_GROUPS).length).toBeGreaterThan(0);
    expect(findMissingRequiredSourceTypes(ACTIVE_KNOWLEDGE_SOURCES)).toEqual(
      [],
    );
  });

  it('reports a required source type missing from a source list', () => {
    const requiredByStep = Object.entries(STEP_SOURCE_GROUPS).flatMap(
      ([step, groups]) =>
        groups.required.map((sourceType) => ({ step, sourceType })),
    );
    const removed = requiredByStep[0].sourceType;
    const stepsRequiringRemoved = requiredByStep.filter(
      (item) => item.sourceType === removed,
    );
    const syntheticList = [
      ...new Set(requiredByStep.map((item) => item.sourceType)),
    ]
      .filter((sourceType) => sourceType !== removed)
      .map((sourceType) => ({ sourceType }));

    expect(findMissingRequiredSourceTypes(syntheticList)).toEqual(
      stepsRequiringRemoved,
    );
  });

  it('active project and credential registries parse', () => {
    const registries = parseActiveRegistries();

    expect(registries.portfolio.projects.length).toBeGreaterThan(0);
    expect(registries.credentials.credentials.length).toBeGreaterThan(0);
  });

  it('active portfolio registry keeps one eligible current-work project and only eligible primary projects', () => {
    const { projects } = parseActiveRegistries().portfolio;

    const currentWork = projects.filter(
      (project) => project.placement === 'current_work_block',
    );
    expect(currentWork).toHaveLength(1);
    expect(currentWork[0].cvEligible).toBe(true);

    const primary = projects.filter(
      (project) => project.portfolioPriority === 'primary',
    );
    expect(primary.length).toBeGreaterThan(0);
    const ineligiblePrimary = primary
      .filter((project) => project.status !== 'active' || !project.cvEligible)
      .map((project) => project.id);
    expect(ineligiblePrimary).toEqual([]);
  });

  it('archived project names appear in prompt-bound active sources only inside the registry block', () => {
    const archivedNames = parseActiveRegistries()
      .portfolio.projects.filter((project) => project.status === 'archived')
      .flatMap((project) => [project.title, ...project.aliases]);
    const files = promptBoundTextSources();
    expect(archivedNames.length).toBeGreaterThan(0);
    expect(files.length).toBeGreaterThan(0);

    const leaks = files
      .map((entry) => ({
        file: entry.relativePath,
        named: findArchivedNamesOutsideRegistry(
          readSource(entry),
          archivedNames,
        ),
      }))
      .filter((leak) => leak.named.length > 0);
    expect(leaks).toEqual([]);
  });

  it('prompt-bound active sources name no inactive knowledge-source file', () => {
    const files = promptBoundTextSources();
    expect(files.length).toBeGreaterThan(0);

    const stale = files
      .map((entry) => ({
        file: entry.relativePath,
        references: findInactiveSourceReferences(
          readSource(entry),
          activeFileNames,
        ),
      }))
      .filter((item) => item.references.length > 0);
    expect(stale).toEqual([]);
  });

  it('reports an inactive knowledge-source file name and ignores an active one', () => {
    const activeNames = ['Sample_Notes_RU_v1_2_refresh.md'];
    const text = [
      'Current source: Sample_Notes_RU_v1_2_refresh.md.',
      'Older copy: Sample_Notes_RU_v1_1_draft.md.',
      'See also Sample_Notes_RU_v0_9 for history.',
    ].join('\n');

    expect(findInactiveSourceReferences(text, activeNames)).toEqual([
      'Sample_Notes_RU_v1_1',
      'Sample_Notes_RU_v0_9',
    ]);
  });

  it('does not take a shorter version number for the active one', () => {
    const activeNames = ['Sample_Notes_RU_v1_20_refresh.md'];

    expect(
      findInactiveSourceReferences(
        'Older: Sample_Notes_RU_v1_2.md',
        activeNames,
      ),
    ).toEqual(['Sample_Notes_RU_v1_2']);
  });

  describe('archived name scan', () => {
    const FENCE = '```';
    const ARCHIVED = 'Retired Sample Tool';
    const registryBlock = [
      `${FENCE}json portfolio-registry`,
      `{ "title": "${ARCHIVED}" }`,
      FENCE,
    ].join('\n');

    it('reports an archived name written outside the registry block', () => {
      const text = `Intro\n${registryBlock}\nSee ${ARCHIVED} for details.\n`;

      expect(
        findArchivedNamesOutsideRegistry(text, [ARCHIVED, 'Other Tool']),
      ).toEqual([ARCHIVED]);
    });

    it('ignores an archived name written only inside the registry block', () => {
      const text = `Intro\n${registryBlock}\nOutro\n`;

      expect(findArchivedNamesOutsideRegistry(text, [ARCHIVED])).toEqual([]);
    });
  });
});
