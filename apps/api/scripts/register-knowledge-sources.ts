import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import { ACTIVE_KNOWLEDGE_SOURCES } from '../src/knowledge-sources/active-knowledge-sources';
import { registerKnowledgeSources } from '../src/knowledge-sources/knowledge-source-registration';

const KNOWLEDGE_SOURCES_ROOT = path.resolve(
  process.env.KNOWLEDGE_SOURCES_ROOT ??
    path.join(__dirname, '..', 'knowledge-sources'),
);

const main = async (prisma: PrismaClient): Promise<void> => {
  console.log(`Registering knowledge sources from ${KNOWLEDGE_SOURCES_ROOT}`);
  const result = await registerKnowledgeSources(
    prisma,
    KNOWLEDGE_SOURCES_ROOT,
    ACTIVE_KNOWLEDGE_SOURCES,
  );
  for (const relativePath of result.created) {
    console.log(`Created: ${relativePath}`);
  }
  for (const relativePath of result.updated) {
    console.log(`Updated: ${relativePath}`);
  }
  console.log(
    `Registered ${ACTIVE_KNOWLEDGE_SOURCES.length} knowledge source records.`,
  );
  console.log(`Deactivated ${result.deactivatedCount} other active records.`);
};

const prisma = new PrismaClient();

main(prisma)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
