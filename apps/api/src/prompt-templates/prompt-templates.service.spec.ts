import { Test, TestingModule } from '@nestjs/testing';
import { PromptTemplatesService } from './prompt-templates.service';
import { PrismaService } from '../prisma/prisma.service';

const makePrismaMock = () => ({
  promptTemplate: {
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
});

describe('PromptTemplatesService', () => {
  let service: PromptTemplatesService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptTemplatesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PromptTemplatesService>(PromptTemplatesService);
  });

  describe('create', () => {
    it('assigns version 1 when no prior templates exist for the step', async () => {
      prisma.promptTemplate.findFirst.mockResolvedValue(null);
      prisma.promptTemplate.create.mockResolvedValue({
        id: 'tpl-1',
        promptKey: 'prompt_1_vacancy_analysis',
        step: 'prompt_1',
        version: 1,
        content: 'Analyze the vacancy...',
        isActive: false,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create({
        promptKey: 'prompt_1_vacancy_analysis',
        step: 'prompt_1',
        content: 'Analyze the vacancy...',
      });

      expect(prisma.promptTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 1, isActive: false }),
        }),
      );
      expect(result.version).toBe(1);
    });

    it('increments version when a prior template exists for the step', async () => {
      prisma.promptTemplate.findFirst.mockResolvedValue({ version: 2 });
      prisma.promptTemplate.create.mockResolvedValue({
        id: 'tpl-3',
        promptKey: 'prompt_1_vacancy_analysis',
        step: 'prompt_1',
        version: 3,
        content: 'Updated prompt...',
        isActive: false,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create({
        promptKey: 'prompt_1_vacancy_analysis',
        step: 'prompt_1',
        content: 'Updated prompt...',
      });

      expect(prisma.promptTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 3 }),
        }),
      );
      expect(result.version).toBe(3);
    });

    it('does not overwrite existing versions — new record is always created', async () => {
      prisma.promptTemplate.findFirst.mockResolvedValue({ version: 1 });
      prisma.promptTemplate.create.mockResolvedValue({
        id: 'tpl-2',
        version: 2,
        isActive: false,
      });

      await service.create({ promptKey: 'k', step: 'prompt_1', content: 'v2' });

      expect(prisma.promptTemplate.create).toHaveBeenCalledTimes(1);
      expect(prisma.promptTemplate.update).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('deactivates all other templates for the step before activating the target', async () => {
      prisma.promptTemplate.findUniqueOrThrow.mockResolvedValue({
        id: 'tpl-2',
        step: 'prompt_1',
      });
      prisma.promptTemplate.updateMany.mockResolvedValue({ count: 1 });
      prisma.promptTemplate.update.mockResolvedValue({
        id: 'tpl-2',
        isActive: true,
      });

      await service.activate('tpl-2');

      expect(prisma.promptTemplate.updateMany).toHaveBeenCalledWith({
        where: { step: 'prompt_1', isActive: true },
        data: { isActive: false },
      });
      expect(prisma.promptTemplate.update).toHaveBeenCalledWith({
        where: { id: 'tpl-2' },
        data: { isActive: true },
      });
    });
  });

  describe('findActive', () => {
    it('returns the active template for the step', async () => {
      const active = { id: 'tpl-1', step: 'prompt_1', isActive: true };
      prisma.promptTemplate.findFirst.mockResolvedValue(active);

      const result = await service.findActive('prompt_1');

      expect(prisma.promptTemplate.findFirst).toHaveBeenCalledWith({
        where: { step: 'prompt_1', isActive: true },
      });
      expect(result).toBe(active);
    });

    it('returns null when no active template exists for the step', async () => {
      prisma.promptTemplate.findFirst.mockResolvedValue(null);

      const result = await service.findActive('prompt_1');

      expect(result).toBeNull();
    });
  });

  describe('findByStep', () => {
    it('returns all templates for the step ordered by version desc', async () => {
      const templates = [{ version: 2 }, { version: 1 }];
      prisma.promptTemplate.findMany.mockResolvedValue(templates);

      const result = await service.findByStep('prompt_1');

      expect(prisma.promptTemplate.findMany).toHaveBeenCalledWith({
        where: { step: 'prompt_1' },
        orderBy: { version: 'desc' },
      });
      expect(result).toBe(templates);
    });
  });
});
