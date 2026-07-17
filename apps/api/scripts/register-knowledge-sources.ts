import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const KNOWLEDGE_SOURCES_ROOT = path.resolve(
  process.env.KNOWLEDGE_SOURCES_ROOT ??
    path.join(__dirname, '..', 'knowledge-sources'),
);

function hashFile(absolutePath: string): string {
  const content = fs.readFileSync(absolutePath, 'utf-8');
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

interface SourceEntry {
  relativePath: string;
  sourceType: string;
  versionLabel: string;
}

const SOURCES: SourceEntry[] = [
  {
    relativePath: 'candidate-profile/Master_CV_RU_v0_6_current_work_sync.md',
    sourceType: 'master_cv',
    versionLabel: 'v0_6_current_work_sync',
  },
  {
    relativePath:
      'candidate-profile/Master_Profile_Summary_RU_v0_6_current_work_sync.md',
    sourceType: 'profile_summary',
    versionLabel: 'v0_6_current_work_sync',
  },
  {
    relativePath:
      'candidate-profile/LinkedIn_MD_Source_Decision_RU_v0_3_current_work_sync.md',
    sourceType: 'linkedin_source_decision',
    versionLabel: 'v0_3_current_work_sync',
  },
  {
    relativePath: 'evidence/Project_Inventory_RU_v0_6_current_work_sync.md',
    sourceType: 'project_inventory',
    versionLabel: 'v0_6_current_work_sync',
  },
  {
    relativePath:
      'evidence/Career_Case_Deep_Dives_RU_v0_6_current_work_sync.md',
    sourceType: 'career_cases',
    versionLabel: 'v0_6_current_work_sync',
  },
  {
    relativePath: 'evidence/Tech_Stack_Matrix_RU_v2_3_current_work_sync.md',
    sourceType: 'tech_stack',
    versionLabel: 'v2_3_current_work_sync',
  },
  {
    relativePath: 'cv-rules/CV_Format_Rules_EN_v0_3_current_work_sync.md',
    sourceType: 'cv_rules',
    versionLabel: 'v0_3_current_work_sync',
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

async function main() {
  console.log(`Registering knowledge sources from ${KNOWLEDGE_SOURCES_ROOT}`);

  for (const entry of SOURCES) {
    const absolutePath = path.join(KNOWLEDGE_SOURCES_ROOT, entry.relativePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Knowledge source file not found: ${absolutePath}`);
    }

    const contentHash = hashFile(absolutePath);
    const existing = await prisma.knowledgeSource.findFirst({
      where: { filePath: absolutePath },
    });

    if (existing) {
      await prisma.knowledgeSource.update({
        where: { id: existing.id },
        data: {
          sourceType: entry.sourceType,
          versionLabel: entry.versionLabel,
          contentHash,
          isActive: true,
        },
      });
      console.log(`Updated: ${entry.relativePath}`);
    } else {
      await prisma.knowledgeSource.create({
        data: {
          filePath: absolutePath,
          sourceType: entry.sourceType,
          versionLabel: entry.versionLabel,
          contentHash,
          isActive: true,
        },
      });
      console.log(`Created: ${entry.relativePath}`);
    }
  }

  console.log(`Registered ${SOURCES.length} knowledge source records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
