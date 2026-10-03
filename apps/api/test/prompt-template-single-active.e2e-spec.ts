process.env.AI_PROVIDER = 'fake';
process.env.API_KEY = 'test-api-key';

import { Prisma, PrismaClient } from '@prisma/client';
import { promptTemplates, seedPromptTemplates } from '../prisma/seed';

const STEP_PREFIX = 'e2e-single-active-';

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

describe('PromptTemplate single active version (e2e, real Postgres)', () => {
  const prisma = new PrismaClient();

  const clean = () =>
    prisma.promptTemplate.deleteMany({
      where: { step: { startsWith: STEP_PREFIX } },
    });

  const template = (step: string, version: number, isActive: boolean) => ({
    promptKey: `${step}_key`,
    step: `${STEP_PREFIX}${step}`,
    version,
    content: 'fixture',
    isActive,
  });

  beforeAll(clean);
  afterEach(clean);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects a second active version of the same step and allows other steps', async () => {
    await prisma.promptTemplate.create({ data: template('a', 1, true) });

    const second = await prisma.promptTemplate
      .create({ data: template('a', 2, true) })
      .catch((error: unknown) => error);
    expect(isUniqueViolation(second)).toBe(true);

    await prisma.promptTemplate.create({ data: template('b', 1, true) });
    const active = await prisma.promptTemplate.findMany({
      where: { step: { startsWith: STEP_PREFIX }, isActive: true },
    });
    expect(active.map((row) => row.step).sort()).toEqual([
      `${STEP_PREFIX}a`,
      `${STEP_PREFIX}b`,
    ]);
  });

  it('rejects a repeated (step, version) pair', async () => {
    await prisma.promptTemplate.create({ data: template('a', 1, false) });

    const repeated = await prisma.promptTemplate
      .create({ data: template('a', 1, false) })
      .catch((error: unknown) => error);

    expect(isUniqueViolation(repeated)).toBe(true);
  });

  it('writes the seed promptTemplates list in list order with one active version per step', async () => {
    const pairs = new Set(
      promptTemplates.map((item) => `${item.step}:${item.version}`),
    );
    expect(pairs.size).toBe(promptTemplates.length);

    for (const item of promptTemplates) {
      await prisma.promptTemplate.upsert({
        where: { id: `${STEP_PREFIX}${item.id}` },
        update: { isActive: item.isActive },
        create: {
          id: `${STEP_PREFIX}${item.id}`,
          promptKey: item.promptKey,
          step: `${STEP_PREFIX}${item.step}`,
          version: item.version,
          content: 'fixture',
          isActive: item.isActive,
        },
      });
    }

    const active = await prisma.promptTemplate.groupBy({
      by: ['step'],
      where: { step: { startsWith: STEP_PREFIX }, isActive: true },
      _count: { _all: true },
    });
    const steps = new Set(promptTemplates.map((item) => item.step));
    expect(active).toHaveLength(steps.size);
    for (const group of active) expect(group._count._all).toBe(1);
  });

  it('seeds over a database that already holds a higher active version of a step', async () => {
    const prefixed = promptTemplates.map((item) => ({
      ...item,
      id: `${STEP_PREFIX}${item.id}`,
      step: `${STEP_PREFIX}${item.step}`,
    }));
    const seededActive = prefixed.find((item) => item.isActive);
    if (!seededActive) throw new Error('seed list has no active template');
    await prisma.promptTemplate.create({
      data: {
        id: `${STEP_PREFIX}newer`,
        promptKey: seededActive.promptKey,
        step: seededActive.step,
        version: 999,
        content: 'fixture',
        isActive: true,
      },
    });

    await seedPromptTemplates(prisma, prefixed);

    const active = await prisma.promptTemplate.findMany({
      where: { step: seededActive.step, isActive: true },
    });
    expect(active.map((row) => row.id)).toEqual([seededActive.id]);
  });
});
