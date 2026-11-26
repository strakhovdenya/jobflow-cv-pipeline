import { KnowledgeSource } from '@prisma/client';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { promptTemplates } from '../prisma/seed';
import {
  FAKE_PROMPT1_JSON,
  FAKE_PROMPT2_JSON,
} from '../src/ai/providers/fake.provider';
import { HashService } from '../src/artifacts/hash.service';
import { ACTIVE_KNOWLEDGE_SOURCES } from '../src/knowledge-sources/active-knowledge-sources';
import { KnowledgeSourceContentService } from '../src/knowledge-sources/knowledge-source-content.service';
import type { ManualNoteContextEntry } from '../src/pipeline/prompt-input-builder.service';
import type { TargetedCvContentOutput } from '../src/pipeline/schemas/targeted-cv-content.schema';

// The shared fixture of the legacy invariance specs (ADR-046 item 1 and its amendment of
// 2026-11-26, ISSUE-713): a generic legacy workspace, the real active templates of
// `prisma/seed.ts` and the real active knowledge sources of `ACTIVE_KNOWLEDGE_SOURCES`. Each spec
// builds its step's complete model input from these and compares it with the fingerprint that
// was recorded on the unchanged post-#709 code. No value here names a real employer, vacancy,
// project or credential.

export const KNOWLEDGE_SOURCES_ROOT = path.join(
  __dirname,
  '../knowledge-sources',
);

export const LEGACY_WORKSPACE = {
  id: 'ws-legacy-reference',
  companyNameOriginal: 'Example Freight Systems',
  companySlug: 'Example_Freight_Systems',
  roleTitleOriginal: 'Backend Engineer (Node.js)',
  roleSlug: 'Backend_Engineer_Nodejs',
  workspaceSlug: '2026_11_26_Example_Freight_Systems_Backend_Engineer_Nodejs',
  workspacePath: '2026_11_26_Example_Freight_Systems_Backend_Engineer_Nodejs',
  storageRoot: '/storage',
} as const;

export const LEGACY_MANUAL_NOTES: ManualNoteContextEntry[] = [
  { id: 'note-reference-1', text: 'The recruiter confirmed remote work.' },
  { id: 'note-reference-2', text: 'Mention the integration testing focus.' },
];

export const LEGACY_VACANCY_TEXT = [
  'Backend Engineer (Node.js)',
  '',
  'Example Freight Systems builds a shipment tracking platform.',
  'Must have: 3+ years of Node.js and TypeScript, REST API design,',
  'PostgreSQL. Nice to have: message queues, Docker.',
  'Fully remote within the EU, English as the working language.',
].join('\n');

const CREDENTIAL = 'Sample Cloud Badge';
const CREDENTIAL_ALIAS = 'Sample Badge Alias';

// A Prompt 2 draft with the same credential listed under its title and its alias, so the cover
// letter's effective content goes through the #709 deduplication.
const buildDraft = (): TargetedCvContentOutput => {
  const draft = JSON.parse(
    JSON.stringify(FAKE_PROMPT2_JSON),
  ) as TargetedCvContentOutput;
  draft.cv_content.certifications = [
    { title: CREDENTIAL, include: true, reason: 'relevant' },
    { title: CREDENTIAL_ALIAS, include: true, reason: 'relevant' },
  ];
  draft.overclaiming_check = {
    critical_issues: [],
    warnings: [],
    needs_evidence: [],
    registry_violations: [],
    registry_snapshot: {
      schema: 'registry-snapshot/v2',
      projects: [],
      credentials: [
        {
          title: CREDENTIAL,
          aliases: [CREDENTIAL_ALIAS],
          type: 'skill_badge',
          status: 'earned',
          cvEligible: true,
          issuer: 'Sample Cloud Academy',
          issued: '2025-11',
        },
      ],
      acceptedForced: { projects: [], credentials: [] },
    },
  };
  return draft;
};

const PRE_PDF_CHECK = {
  schema_version: '1.0',
  workspace_id: LEGACY_WORKSPACE.id,
  readiness: 'ready_with_minor_edits',
  corrections: [
    {
      field_path: 'summary[0]',
      original_text: FAKE_PROMPT2_JSON.cv_content.summary[0],
      suggested_text: 'Backend TypeScript developer with commercial APIs.',
      severity: 'suggestion',
      reason: 'Sharper wording.',
    },
  ],
  quality_score: 85,
  export_blocked: false,
  overall_notes: 'Minor edits only.',
};

// The workspace artifacts a legacy workspace holds once it reaches the step under test.
export const LEGACY_ARTIFACTS: Readonly<Record<string, string>> = {
  '00_vacancy_source.txt': LEGACY_VACANCY_TEXT,
  '01_vacancy_analysis.json': JSON.stringify(FAKE_PROMPT1_JSON, null, 2),
  '02_targeted_cv_content.json': JSON.stringify(buildDraft(), null, 2),
  '03_pre_pdf_check.json': JSON.stringify(PRE_PDF_CHECK, null, 2),
  '04_cv_export.html':
    '<html><body><h1>Backend Engineer</h1><p>Exported CV.</p></body></html>',
};

export interface InMemoryStorage {
  storageRoot: string;
  readFile: jest.Mock<Promise<string>, [string]>;
  readFileIfExists: jest.Mock<Promise<string | null>, [string]>;
}

// Reads the given workspace files by their resolved path; any other path does not exist.
export const createWorkspaceStorage = (
  files: Readonly<Record<string, string>>,
): InMemoryStorage => {
  const workspaceDir = path.resolve(
    LEGACY_WORKSPACE.storageRoot,
    LEGACY_WORKSPACE.workspacePath,
  );
  const byPath = new Map(
    Object.entries(files).map(([name, content]) => [
      path.join(workspaceDir, name),
      content,
    ]),
  );
  const lookup = (filePath: string): string | null =>
    byPath.get(path.resolve(filePath)) ?? null;
  return {
    storageRoot: LEGACY_WORKSPACE.storageRoot,
    readFile: jest.fn((filePath: string) => {
      const content = lookup(filePath);
      if (content === null) {
        return Promise.reject(
          Object.assign(new Error(`ENOENT: ${filePath}`), { code: 'ENOENT' }),
        );
      }
      return Promise.resolve(content);
    }),
    readFileIfExists: jest.fn((filePath: string) =>
      Promise.resolve(lookup(filePath)),
    ),
  };
};

const FIXED_DATE = new Date('2026-11-26T00:00:00.000Z');

const sha256 = (content: Buffer | string): string =>
  createHash('sha256').update(content).digest('hex');

// The active knowledge-source rows as the registration script stores them: one per entry of
// ACTIVE_KNOWLEDGE_SOURCES, with the hash of the real file.
export const activeKnowledgeSourceRows = (): KnowledgeSource[] =>
  ACTIVE_KNOWLEDGE_SOURCES.map((entry) => {
    const filePath = path.join(KNOWLEDGE_SOURCES_ROOT, entry.relativePath);
    return {
      id: `ks-active-${entry.sourceType}`,
      filePath,
      sourceType: entry.sourceType,
      contentHash: sha256(fs.readFileSync(filePath, 'utf-8')),
      versionLabel: entry.versionLabel,
      isActive: true,
      importedAt: FIXED_DATE,
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
    };
  });

// The real loader, with its root containment and hash checks, over the real source files.
export const createKnowledgeSourceContentService =
  (): KnowledgeSourceContentService =>
    new KnowledgeSourceContentService(
      {
        getOrThrow: () => KNOWLEDGE_SOURCES_ROOT,
      } as unknown as ConfigService,
      new HashService(),
    );

export interface ActiveTemplate {
  version: number;
  content: string;
}

export const activeTemplate = (step: string): ActiveTemplate => {
  const active = promptTemplates.filter(
    (template) => template.step === step && template.isActive,
  );
  if (active.length !== 1) {
    throw new Error(`Expected one active seed template for ${step}`);
  }
  return { version: active[0].version, content: active[0].content };
};

export interface TextFingerprint {
  sha256: string;
  length: number;
}

export const fingerprint = (text: string): TextFingerprint => ({
  sha256: sha256(text),
  length: text.length,
});

export interface ModelInputFingerprint {
  templateVersion: number;
  template: TextFingerprint;
  inputContext: TextFingerprint;
}

export const fingerprintModelInput = (
  templateVersion: number,
  template: string,
  inputContext: string,
): ModelInputFingerprint => ({
  templateVersion,
  template: fingerprint(template),
  inputContext: fingerprint(inputContext),
});
