/**
 * Checks the real active knowledge sources in apps/api/knowledge-sources/ (ISSUE-690): the files
 * of ACTIVE_KNOWLEDGE_SOURCES exist, every source type is listed once and every step gets its
 * required types, both career registries parse with the parser Prompt 2 uses, and archived
 * portfolio projects are named in prompt-bound sources only inside the registry block, and those
 * sources refer to no inactive version of a source file. Paths come
 * from the list, steps and source types from STEP_SOURCE_GROUPS, project names from the parsed
 * registry — no second copy of any of them lives here.
 *
 * The credential-registry checks (ISSUE-704) compare the active registry with the verified data of
 * the three Google Cloud skill badges, compare it field by field with the previous inventory, and
 * run the real snapshot through the export metadata and both CV renderers.
 */

import { KnowledgeSource } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { isDeepStrictEqual } from 'util';
import { renderAtsCvTemplate } from '../document-export/ats-cv-template-renderer';
import { applyCredentialMetadata } from '../document-export/credential-metadata';
import { renderCvTemplate } from '../document-export/cv-template-renderer';
import {
  CareerRegistries,
  Credential,
  parseCareerRegistries,
  parseCredentialRegistry,
  stripRegistryBlocks,
} from '../evidence/career-registry.parser';
import {
  RegistrySnapshot,
  buildRegistrySnapshot,
  containsRegistryName,
  findRegistryViolations,
  findSnapshotCredential,
  registryInputFromCvContent,
} from '../evidence/registry-compliance';
import type {
  CvCertification,
  CvContent,
} from '../pipeline/schemas/cv-content.schema';
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

// The inventory before ISSUE-704 and the one that refreshed its credentials, read by path rather
// than from the active list, so a later inventory version does not change what is compared.
const PREVIOUS_INVENTORY =
  'certifications/LinkedIn_Certifications_Inventory_RU_EN_2026-11.md';
const REFRESHED_INVENTORY =
  'certifications/LinkedIn_Certifications_Inventory_RU_EN_2026-11_credential_refresh.md';

const readCredentialsAt = (relativePath: string): Credential[] =>
  parseCredentialRegistry(
    fs.readFileSync(path.join(KNOWLEDGE_SOURCES_ROOT, relativePath), 'utf-8'),
  ).credentials;

const ADK_BADGE_ID = 'gc-adk-engineer-ai-agents';
const MULTI_AGENT_BADGE_ID = 'gc-deploy-multi-agent-architectures';
const TERRAFORM_BADGE_ID = 'gc-terraform-build-infrastructure';
const SKILL_BADGE_LABEL = 'skill badge';

// The verified Credly data of the three Google Cloud skill badges (ISSUE-704, INV-1/INV-2).
const VERIFIED_GOOGLE_CLOUD_BADGES = [
  {
    id: ADK_BADGE_ID,
    title: 'Engineer AI Agents with Agent Development Kit (ADK)',
    aliases: [],
    verificationUrl:
      'https://www.credly.com/badges/5e0a99e4-40f7-40b9-a531-2352f18eb35c',
    roleFamilies: ['ai_integration'],
  },
  {
    id: MULTI_AGENT_BADGE_ID,
    title: 'Deploy Multi-Agent Architectures',
    aliases: [],
    verificationUrl:
      'https://www.credly.com/badges/789df055-d94a-4162-ae40-576888a85b25',
    skills: [
      'Google Agent Development Kit (ADK)',
      'multi-agent systems',
      'Agent-to-Agent (A2A) protocol',
      'Model Context Protocol (MCP)',
      'agent tool integration',
      'agent authentication',
      'Agent Engine deployment',
    ],
    roleFamilies: ['ai_integration'],
  },
  {
    id: TERRAFORM_BADGE_ID,
    title: 'Build Infrastructure with Terraform on Google Cloud Skill Badge',
    aliases: ['Build Infrastructure with Terraform on Google Cloud'],
    verificationUrl:
      'https://www.credly.com/badges/d6666c31-2078-4546-b30a-976a48a6fded',
    skills: [
      'Terraform',
      'Infrastructure as Code',
      'Google Cloud resource provisioning',
      'Terraform state management',
      'Terraform modules',
    ],
    roleFamilies: ['azure_production', 'backend_node'],
  },
];

// The only fields ISSUE-704 changed in an entry the previous inventory already had (INV-3).
const DOCUMENTED_CREDENTIAL_CHANGES: ReadonlyMap<string, readonly string[]> =
  new Map([[ADK_BADGE_ID, ['verificationUrl', 'roleFamilies']]]);

// Every field of a previous entry that the current registry changed, except the allowed changes,
// as "id.field"; a previous entry missing from the current registry as "id".
const findCredentialChanges = (
  previous: readonly Credential[],
  current: readonly Credential[],
  allowed: ReadonlyMap<string, readonly string[]>,
): string[] => {
  const currentById = new Map(current.map((entry) => [entry.id, entry]));
  const changes: string[] = [];
  for (const entry of previous) {
    const counterpart = currentById.get(entry.id);
    if (counterpart === undefined) {
      changes.push(entry.id);
      continue;
    }
    const allowedFields = allowed.get(entry.id) ?? [];
    for (const field of Object.keys(entry) as (keyof Credential)[]) {
      if (allowedFields.includes(field)) continue;
      if (!isDeepStrictEqual(entry[field], counterpart[field])) {
        changes.push(`${entry.id}.${field}`);
      }
    }
  }
  return changes;
};

const credentialById = (
  credentials: readonly Credential[],
  id: string,
): Credential => {
  const entry = credentials.find((credential) => credential.id === id);
  if (entry === undefined) throw new Error(`No credential "${id}".`);
  return entry;
};

const makeCvContent = (certificationNames: string[]): CvContent => ({
  candidate: {
    name: 'Static Candidate',
    contact: {},
    location: 'Somewhere',
    work_authorization: 'Authorized',
  },
  headline: 'Backend Developer',
  summary: ['Summary sentence.'],
  top_skills: ['Node.js'],
  current_work_block: {
    include: true,
    safe_label: 'Current Work',
    role_line: 'Independent Work',
    dates: '2025 - Present',
    stable_intro: 'Intro.',
    bullets: [],
    tech_stack: [],
  },
  experience: [],
  selected_projects: [],
  education: [],
  certifications: certificationNames.map((name, index): CvCertification => ({
    name,
    priority: 'medium',
    source_index: index,
  })),
  languages: [],
  links: [],
  volunteering: [],
  rendering_hints: {
    density: 'normal',
    target_pages: 2,
    max_pages: 3,
    strong_match_allows_page_3: false,
    optional_sections_to_hide_first: [],
  },
});

const DESIGN_CERTIFICATION = /<div class="cert-item">([\s\S]*?)<\/div>/g;
// The ATS template also renders Links as "cert-line" rows; makeCvContent has no links, so every
// "cert-line" of these CVs is a certification.
const ATS_CERTIFICATION = /<div class="cert-line">([\s\S]*?)<\/div>/g;

// The inner HTML of every certification element of a rendered CV.
const renderedCertifications = (html: string, element: RegExp): string[] =>
  Array.from(html.matchAll(element), (match) => match[1]);

const countSkillBadgeLabels = (text: string): number =>
  text.toLowerCase().split(SKILL_BADGE_LABEL).length - 1;

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

  it('activates the new cv_rules version', () => {
    const cvRules = ACTIVE_KNOWLEDGE_SOURCES.filter(
      (entry) => entry.sourceType === 'cv_rules',
    );
    expect(cvRules).toEqual([
      {
        relativePath: 'cv-rules/CV_Format_Rules_EN_v0_10_credential_output.md',
        sourceType: 'cv_rules',
        versionLabel: 'v0_10_credential_output',
      },
    ]);
    // The previous version stays on disk, outside the active list.
    const previous = 'cv-rules/CV_Format_Rules_EN_v0_9_credential_selection.md';
    expect(fs.existsSync(path.join(KNOWLEDGE_SOURCES_ROOT, previous))).toBe(
      true,
    );
    expect(
      ACTIVE_KNOWLEDGE_SOURCES.some((entry) => entry.relativePath === previous),
    ).toBe(false);
    // Every step that reads cv_rules gets the new version (the complete provider input of each
    // of these steps changes with it, even where its template does not).
    const selection = new KnowledgeSourceSelectionService();
    const sources = ACTIVE_KNOWLEDGE_SOURCES.map(toKnowledgeSource);
    const readers = Object.keys(STEP_SOURCE_GROUPS).filter((step) =>
      selection
        .selectForStep(step, sources)
        .some((source) => source.filePath === cvRules[0].relativePath),
    );
    expect(readers).toEqual([
      'prompt_1',
      'prompt_2',
      'cover_letter',
      'analysis_x1',
      'analysis_x2',
      'analysis_b',
    ]);
  });

  it('keeps the required source types of every step', () => {
    const selection = new KnowledgeSourceSelectionService();
    const sources = ACTIVE_KNOWLEDGE_SOURCES.map(toKnowledgeSource);
    const steps = Object.entries(STEP_SOURCE_GROUPS);
    expect(steps.length).toBeGreaterThan(0);
    for (const [step, groups] of steps) {
      const selectedTypes = selection
        .selectForStep(step, sources)
        .map((source) => source.sourceType);
      const missing = groups.required.filter(
        (sourceType) => !selectedTypes.includes(sourceType),
      );
      const repeated = selectedTypes.filter(
        (sourceType, index) => selectedTypes.indexOf(sourceType) !== index,
      );
      expect({ step, missing, repeated }).toEqual({
        step,
        missing: [],
        repeated: [],
      });
    }
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

describe('active credential registry', () => {
  const activeCredentials = (): Credential[] =>
    parseActiveRegistries().credentials.credentials;

  const activeSnapshot = (): RegistrySnapshot =>
    buildRegistrySnapshot(parseActiveRegistries());

  it('active credential registry holds the three verified Google Cloud skill badges', () => {
    const credentials = activeCredentials();
    for (const badge of VERIFIED_GOOGLE_CLOUD_BADGES) {
      expect(credentialById(credentials, badge.id)).toMatchObject({
        ...badge,
        issuer: 'Google Cloud',
        type: 'skill_badge',
        status: 'earned',
        cvEligible: true,
        evidenceClass: 'training_verified',
        issued: '2026-11',
        credentialId: null,
      });
    }
  });

  it('active credential registry classifies the Terraform badge as non-AI and the agent badges as agent training', () => {
    const credentials = activeCredentials();
    expect(credentialById(credentials, TERRAFORM_BADGE_ID).aiCategory).toBe(
      null,
    );
    for (const id of [ADK_BADGE_ID, MULTI_AGENT_BADGE_ID]) {
      expect(credentialById(credentials, id).aiCategory).toBe('agent_training');
    }
    const withAiAssistedFamily = VERIFIED_GOOGLE_CLOUD_BADGES.map((badge) =>
      credentialById(credentials, badge.id),
    )
      .filter((entry) => entry.roleFamilies.includes('ai_assisted_engineering'))
      .map((entry) => entry.id);
    expect(withAiAssistedFamily).toEqual([]);
  });

  it('active credential registry keeps every previous credential except the documented ADK fields', () => {
    const previous = readCredentialsAt(PREVIOUS_INVENTORY);
    const refreshed = readCredentialsAt(REFRESHED_INVENTORY);
    expect(previous.length).toBeGreaterThan(0);

    expect(
      findCredentialChanges(previous, refreshed, DOCUMENTED_CREDENTIAL_CHANGES),
    ).toEqual([]);
    const previousIds = new Set(previous.map((entry) => entry.id));
    const addedIds = refreshed
      .map((entry) => entry.id)
      .filter((id) => !previousIds.has(id))
      .sort();
    expect(addedIds).toEqual([MULTI_AGENT_BADGE_ID, TERRAFORM_BADGE_ID]);
  });

  it('the credential comparison reports a changed field outside the documented ADK changes', () => {
    const badge: Credential = {
      id: 'sample-badge',
      title: 'Sample Badge',
      aliases: [],
      issuer: 'Sample Issuer',
      type: 'skill_badge',
      status: 'earned',
      cvEligible: true,
      evidenceClass: 'training_verified',
      issued: '2025-01',
      credentialId: null,
      verificationUrl: null,
      skills: ['Sample Skill'],
      roleFamilies: ['backend_node'],
      aiCategory: null,
    };
    const course: Credential = {
      ...badge,
      id: 'sample-course',
      title: 'Sample Course',
      type: 'course_completion',
      status: 'completed',
    };
    const removed: Credential = {
      ...course,
      id: 'sample-removed',
      title: 'Sample Removed Course',
    };
    const allowed = new Map([['sample-badge', ['verificationUrl']]]);
    const current: Credential[] = [
      {
        ...badge,
        verificationUrl: 'https://example.com/badge',
        skills: ['Other Skill'],
      },
      { ...course, verificationUrl: 'https://example.com/course' },
    ];

    expect(
      findCredentialChanges([badge, course, removed], current, allowed),
    ).toEqual([
      'sample-badge.skills',
      'sample-course.verificationUrl',
      'sample-removed',
    ]);
  });

  it('a snapshot of the previous inventory resolves the ADK badge like the active one', () => {
    const active = parseActiveRegistries();
    const previousSnapshot = buildRegistrySnapshot({
      portfolio: active.portfolio,
      credentials: {
        schema: 'credential-registry/v1',
        credentials: readCredentialsAt(PREVIOUS_INVENTORY),
      },
    });
    const currentSnapshot = activeSnapshot();
    const adkTitle = credentialById(
      active.credentials.credentials,
      ADK_BADGE_ID,
    ).title;

    const previousEntry = findSnapshotCredential(previousSnapshot, adkTitle);
    const currentEntry = findSnapshotCredential(currentSnapshot, adkTitle);
    expect(previousEntry).toBeDefined();
    expect(previousEntry).toEqual(currentEntry);

    const content = makeCvContent([adkTitle]);
    const fromPrevious = applyCredentialMetadata(content, previousSnapshot)
      .certifications[0];
    const fromCurrent = applyCredentialMetadata(content, currentSnapshot)
      .certifications[0];
    expect(fromCurrent).toMatchObject({
      issuer: 'Google Cloud',
      kind: SKILL_BADGE_LABEL,
      date: '2026',
    });
    expect([fromPrevious.issuer, fromPrevious.kind, fromPrevious.date]).toEqual(
      [fromCurrent.issuer, fromCurrent.kind, fromCurrent.date],
    );
  });

  it('active Google Cloud skill badges print with issuer, one type label and year in both CV formats', () => {
    const credentials = activeCredentials();
    const snapshot = activeSnapshot();
    const names = VERIFIED_GOOGLE_CLOUD_BADGES.flatMap((badge) => {
      const entry = credentialById(credentials, badge.id);
      return [entry.title, ...entry.aliases];
    });
    expect(names).toHaveLength(4);

    for (const name of names) {
      const content = applyCredentialMetadata(makeCvContent([name]), snapshot);
      const certification = content.certifications[0];
      expect({
        name,
        issuer: certification.issuer,
        date: certification.date,
      }).toEqual({ name, issuer: 'Google Cloud', date: '2026' });
      const namedWithLabel = countSkillBadgeLabels(name) > 0;
      expect({ name, kind: certification.kind }).toEqual({
        name,
        kind: namedWithLabel ? undefined : SKILL_BADGE_LABEL,
      });

      for (const rendered of [
        renderedCertifications(renderCvTemplate(content), DESIGN_CERTIFICATION),
        renderedCertifications(renderAtsCvTemplate(content), ATS_CERTIFICATION),
      ]) {
        expect(rendered).toHaveLength(1);
        const line = rendered[0];
        expect(line).toContain(name);
        expect(line).toContain('Google Cloud');
        expect(line).toContain('2026');
        expect({ name, labels: countSkillBadgeLabels(line) }).toEqual({
          name,
          labels: 1,
        });
      }
    }
  });

  it('an unregistered variant of a Google Cloud badge title is a registry violation', () => {
    const multiAgentTitle = credentialById(
      activeCredentials(),
      MULTI_AGENT_BADGE_ID,
    ).title;
    const content = makeCvContent([`${multiAgentTitle} Skill Badge`]);

    const violations = findRegistryViolations(
      registryInputFromCvContent(content),
      activeSnapshot(),
    );

    expect(violations).toEqual([
      {
        fieldPath: 'certifications[0]',
        message: expect.stringContaining(
          'is not in the credential registry',
        ) as string,
      },
    ]);
  });
});
