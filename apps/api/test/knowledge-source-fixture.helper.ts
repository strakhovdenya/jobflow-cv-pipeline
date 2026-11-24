import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeSource } from '@prisma/client';

// Builds a single in-memory KnowledgeSource fixture backed by a real file
// written inside `knowledgeSourcesRoot`, for use with
// `Test.createTestingModule(...).overrideProvider(KnowledgeSourcesService)`.
// Overriding the lookup service (rather than the DB row set) means e2e specs
// never read or mutate real KnowledgeSource rows in the shared dev DB — the
// fixture never touches the `knowledge_source` table at all — while
// `KnowledgeSourceContentService.loadContent()` itself stays real and still
// runs `assertInsideKnowledgeSourcesRoot()` for real against this object.
export function createKnowledgeSourceFixture(
  knowledgeSourcesRoot: string,
): KnowledgeSource {
  return writeFixtureSource(knowledgeSourcesRoot, {
    id: 'e2e-fixture-knowledge-source',
    fileName: 'test-fixture.md',
    sourceType: 'master_cv',
    content: '# E2E test fixture knowledge source\n',
  });
}

// Synthetic career registries (anti-literal: no real portfolio project or credential). The
// eligible project is the one the fake provider's Prompt 2 answer selects, so the evidence
// guard records no registry violation and the export gate lets the draft through.
export const FIXTURE_ELIGIBLE_PROJECT = 'Sample Portfolio Service';
export const FIXTURE_ARCHIVED_PROJECT = 'Retired Demo Tool';

const PORTFOLIO_REGISTRY = {
  schema: 'portfolio-registry/v1',
  projects: [
    {
      id: 'sample-current-work',
      title: 'Sample Current Work',
      status: 'active',
      cvEligible: true,
      portfolioPriority: 'primary',
      placement: 'current_work_block',
      evidenceClass: 'personal_verified',
      repositoryUrl: null,
      lastVerifiedAt: '2026-01-15',
    },
    {
      id: 'sample-portfolio-service',
      title: FIXTURE_ELIGIBLE_PROJECT,
      status: 'active',
      cvEligible: true,
      portfolioPriority: 'primary',
      placement: 'selected_projects',
      evidenceClass: 'personal_verified',
      repositoryUrl: null,
      lastVerifiedAt: '2026-01-15',
      roleFamilies: ['backend_node'],
    },
    {
      id: 'retired-demo-tool',
      title: FIXTURE_ARCHIVED_PROJECT,
      status: 'archived',
      cvEligible: false,
      portfolioPriority: 'none',
      placement: 'none',
      evidenceClass: 'personal_verified',
      repositoryUrl: null,
      lastVerifiedAt: '2026-01-15',
    },
  ],
};

const CREDENTIAL_REGISTRY = {
  schema: 'credential-registry/v1',
  credentials: [
    {
      id: 'sample-skill-badge',
      title: 'Sample Skill Badge',
      issuer: 'Sample Issuer',
      type: 'skill_badge',
      status: 'earned',
      cvEligible: true,
      evidenceClass: 'training_verified',
      issued: '2026-01',
    },
    {
      id: 'sample-lab',
      title: 'Sample Lab',
      issuer: 'Sample Issuer',
      type: 'lab',
      status: 'completed',
      cvEligible: false,
      evidenceClass: 'training_verified',
      issued: '2026-01',
    },
  ],
};

const registryDocument = (
  heading: string,
  blockType: string,
  registry: unknown,
): string =>
  [
    `# ${heading}`,
    '',
    '```json ' + blockType,
    JSON.stringify(registry, null, 2),
    '```',
    '',
  ].join('\n');

// project_inventory and certifications fixtures carrying the registry blocks Prompt 2 parses.
export function createRegistryKnowledgeSourceFixtures(
  knowledgeSourcesRoot: string,
): KnowledgeSource[] {
  return [
    writeFixtureSource(knowledgeSourcesRoot, {
      id: 'e2e-fixture-project-inventory',
      fileName: 'test-fixture-project-inventory.md',
      sourceType: 'project_inventory',
      content: registryDocument(
        'E2E fixture project inventory',
        'portfolio-registry',
        PORTFOLIO_REGISTRY,
      ),
    }),
    writeFixtureSource(knowledgeSourcesRoot, {
      id: 'e2e-fixture-certifications',
      fileName: 'test-fixture-certifications.md',
      sourceType: 'certifications',
      content: registryDocument(
        'E2E fixture certifications',
        'credential-registry',
        CREDENTIAL_REGISTRY,
      ),
    }),
  ];
}

interface FixtureSourceSpec {
  id: string;
  fileName: string;
  sourceType: string;
  content: string;
}

function writeFixtureSource(
  knowledgeSourcesRoot: string,
  spec: FixtureSourceSpec,
): KnowledgeSource {
  const filePath = path.join(knowledgeSourcesRoot, spec.fileName);
  fs.writeFileSync(filePath, spec.content, 'utf-8');
  const contentHash = createHash('sha256')
    .update(spec.content, 'utf-8')
    .digest('hex');
  const now = new Date();
  return {
    id: spec.id,
    filePath,
    sourceType: spec.sourceType,
    isActive: true,
    contentHash,
    versionLabel: 'e2e-fixture',
    importedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}
