import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import {
  KnowledgeSourceEntry,
  registerKnowledgeSources,
} from '../src/knowledge-sources/knowledge-source-registration';

const KNOWLEDGE_SOURCES_ROOT = path.resolve(
  process.env.KNOWLEDGE_SOURCES_ROOT ??
    path.join(__dirname, '..', 'knowledge-sources'),
);

const SOURCES: KnowledgeSourceEntry[] = [
  {
    relativePath: 'candidate-profile/Master_CV_RU_v0_7_ai_factory_sync.md',
    sourceType: 'master_cv',
    versionLabel: 'v0_7_ai_factory_sync',
  },
  {
    relativePath:
      'candidate-profile/Master_Profile_Summary_RU_v0_7_ai_factory_sync.md',
    sourceType: 'profile_summary',
    versionLabel: 'v0_7_ai_factory_sync',
  },
  {
    relativePath:
      'candidate-profile/LinkedIn_MD_Source_Decision_RU_v0_3_current_work_sync.md',
    sourceType: 'linkedin_source_decision',
    versionLabel: 'v0_3_current_work_sync',
  },
  {
    relativePath: 'evidence/Project_Inventory_RU_v0_7_ai_factory_sync.md',
    sourceType: 'project_inventory',
    versionLabel: 'v0_7_ai_factory_sync',
  },
  {
    relativePath: 'evidence/Career_Case_Deep_Dives_RU_v0_7_ai_factory_sync.md',
    sourceType: 'career_cases',
    versionLabel: 'v0_7_ai_factory_sync',
  },
  {
    relativePath: 'evidence/Tech_Stack_Matrix_RU_v2_4_ai_factory_sync.md',
    sourceType: 'tech_stack',
    versionLabel: 'v2_4_ai_factory_sync',
  },
  {
    relativePath: 'cv-rules/CV_Format_Rules_EN_v0_4_ai_factory_sync.md',
    sourceType: 'cv_rules',
    versionLabel: 'v0_4_ai_factory_sync',
  },
  {
    relativePath:
      'certifications/LinkedIn_Certifications_Inventory_RU_EN_2026-06.md',
    sourceType: 'certifications',
    versionLabel: '2026-06',
  },
  {
    relativePath: 'layout/CV_Layout_Reference_EN_2026-06.pdf',
    sourceType: 'layout',
    versionLabel: '2026-06',
  },
];

const main = async (prisma: PrismaClient): Promise<void> => {
  console.log(`Registering knowledge sources from ${KNOWLEDGE_SOURCES_ROOT}`);
  const result = await registerKnowledgeSources(
    prisma,
    KNOWLEDGE_SOURCES_ROOT,
    SOURCES,
  );
  for (const relativePath of result.created) {
    console.log(`Created: ${relativePath}`);
  }
  for (const relativePath of result.updated) {
    console.log(`Updated: ${relativePath}`);
  }
  console.log(`Registered ${SOURCES.length} knowledge source records.`);
  console.log(`Deactivated ${result.deactivatedCount} other active records.`);
};

const prisma = new PrismaClient();

main(prisma)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
