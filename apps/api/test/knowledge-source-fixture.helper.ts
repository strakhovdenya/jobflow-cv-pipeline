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
  const content = '# E2E test fixture knowledge source\n';
  const filePath = path.join(knowledgeSourcesRoot, 'test-fixture.md');
  fs.writeFileSync(filePath, content, 'utf-8');
  const contentHash = createHash('sha256')
    .update(content, 'utf-8')
    .digest('hex');
  const now = new Date();
  return {
    id: 'e2e-fixture-knowledge-source',
    filePath,
    sourceType: 'master_cv',
    isActive: true,
    contentHash,
    versionLabel: 'e2e-fixture',
    importedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}
