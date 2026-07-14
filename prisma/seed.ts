import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function readPromptFile(fileName: string): string {
  return fs.readFileSync(path.join(__dirname, 'prompts', fileName), 'utf-8');
}

const evidenceItems = [
  {
    claimArea: 'Node.js',
    category: 'allowed',
    description:
      'Commercial Node.js backend experience at EPAM — well-evidenced by career case deep dives.',
    notes: 'Strong commercial evidence across multiple EPAM projects.',
  },
  {
    claimArea: 'TypeScript',
    category: 'allowed',
    description:
      'Commercial TypeScript development at EPAM — strong evidence across backend and serverless projects.',
    notes: null,
  },
  {
    claimArea: 'Azure Functions',
    category: 'allowed',
    description:
      'Commercial Azure serverless workflows at EPAM: Durable Functions, long-running processes, e-commerce integrations.',
    notes:
      'CommerceTools, Amplience, ProductsUp integrations documented in career cases.',
  },
  {
    claimArea: 'PostgreSQL',
    category: 'allowed',
    description:
      'Commercial PostgreSQL usage at Factor-IT and EPAM — strong foundation documented in career cases.',
    notes: null,
  },
  {
    claimArea: 'NestJS',
    category: 'risky',
    description:
      'NestJS used in personal projects (JobFlow CV Pipeline) and study, not in commercial EPAM production stack.',
    notes:
      'Do not present as commercial core skill without adding evidence from future commercial work.',
  },
  {
    claimArea: 'Docker',
    category: 'risky',
    description:
      'Docker used for local development and deployments. Do not claim production platform ownership without evidence.',
    notes:
      'Safe to mention as tooling; unsafe to claim as DevOps/production ownership.',
  },
  {
    claimArea: 'AI/RAG',
    category: 'risky',
    description:
      'AI/RAG/FastAPI/MCP experience is personal project and coursework work, not commercial production. Do not claim AI Engineer or LLM platform engineer title.',
    notes:
      'JobFlow CV Pipeline and MCP experiments are portfolio projects. Commercial AI production experience needs evidence.',
  },
  {
    claimArea: 'Kubernetes',
    category: 'unsupported',
    description:
      'Kubernetes exposure is basic training only. Needs commercial evidence before claiming production experience.',
    notes: 'Mark as needs evidence in any CV claim.',
  },
  {
    claimArea: 'AWS',
    category: 'unsupported',
    description:
      'No commercial AWS production evidence. DynamoDB, AWS Lambda and other AWS production claims need evidence.',
    notes:
      'Safe to mention AWS awareness; unsafe to claim production ownership.',
  },
];

const promptTemplates = [
  {
    id: 'seed-prompt-1-vacancy-analysis-v1',
    promptKey: 'prompt_1_vacancy_analysis',
    step: 'prompt_1',
    version: 1,
    description:
      'Vacancy analysis: must-have/nice-to-have/wishlist, hidden role logic, risks and apply/maybe/skip decision.',
    content: readPromptFile('prompt1.txt'),
  },
  {
    id: 'seed-prompt-2-targeted-cv-content-v1',
    promptKey: 'prompt_2_targeted_cv_content',
    step: 'prompt_2',
    version: 1,
    description:
      'Targeted CV content generation: evidence-based CV draft adapted to the vacancy without inventing experience.',
    content: readPromptFile('prompt2.txt'),
  },
  {
    id: 'seed-prompt-3-pre-pdf-check-v1',
    promptKey: 'prompt_3_pre_pdf_check',
    step: 'prompt_3',
    version: 1,
    description:
      'Optional pre-PDF safety check: flags risky/overclaiming wording in the approved CV draft and suggests corrections. Placeholder content pending full prompt-engineering review.',
    content: readPromptFile('prompt3.txt'),
  },
  {
    id: 'seed-prompt-5-final-check-v1',
    promptKey: 'prompt_5_final_check',
    step: 'prompt_5',
    version: 1,
    description:
      'Optional final check on the fully exported CV output before sending: flags missing sections, formatting issues, surviving overclaiming risks and broken links. Placeholder content pending full prompt-engineering review.',
    content: readPromptFile('prompt5.txt'),
  },
  {
    id: 'seed-skip-reason-v1',
    promptKey: 'skip_reason',
    step: 'skip_reason',
    version: 1,
    description:
      'Structured skip reason generation for vacancies decided as skip. Placeholder content pending full prompt-engineering review.',
    content: readPromptFile('skip_reason.txt'),
  },
];

async function main() {
  console.log('Seeding EvidenceItem records...');

  for (const item of evidenceItems) {
    await prisma.evidenceItem.upsert({
      where: {
        id: `seed-${item.claimArea.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      },
      update: {
        category: item.category,
        description: item.description,
        notes: item.notes,
      },
      create: {
        id: `seed-${item.claimArea.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        claimArea: item.claimArea,
        category: item.category,
        description: item.description,
        notes: item.notes,
      },
    });
  }

  console.log(`Seeded ${evidenceItems.length} EvidenceItem records.`);

  console.log('Seeding PromptTemplate records...');

  for (const template of promptTemplates) {
    await prisma.promptTemplate.upsert({
      where: { id: template.id },
      update: {
        content: template.content,
        description: template.description,
        isActive: true,
      },
      create: {
        id: template.id,
        promptKey: template.promptKey,
        step: template.step,
        version: template.version,
        content: template.content,
        description: template.description,
        isActive: true,
      },
    });
  }

  console.log(
    `Seeded ${promptTemplates.length} active PromptTemplate records.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
