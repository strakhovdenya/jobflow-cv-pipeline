import { Test, TestingModule } from '@nestjs/testing';
import { PromptRunsService } from './prompt-runs.service';
import { PrismaService } from '../prisma/prisma.service';
import { PromptRunStatus } from '@prisma/client';

const makePrismaMock = () => ({
  promptRun: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
});

describe('PromptRunsService', () => {
  let service: PromptRunsService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptRunsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PromptRunsService>(PromptRunsService);
  });

  describe('create', () => {
    it('creates a PromptRun with status pending', async () => {
      const expected = {
        id: 'run-1',
        workspaceId: 'ws-1',
        promptStep: 'prompt_1',
        templateId: 'tpl-1',
        templateVersion: 1,
        status: PromptRunStatus.pending,
        aiRunId: null as string | null,
      };
      prisma.promptRun.create.mockResolvedValue(expected);

      const result = await service.create({
        workspaceId: 'ws-1',
        promptStep: 'prompt_1',
        templateId: 'tpl-1',
        templateVersion: 1,
      });

      expect(prisma.promptRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PromptRunStatus.pending }),
        }),
      );
      expect(result.status).toBe(PromptRunStatus.pending);
    });
  });

  describe('complete', () => {
    it('sets status to completed and links aiRunId', async () => {
      const expected = {
        id: 'run-1',
        status: PromptRunStatus.completed,
        aiRunId: 'ai-run-1',
        outputArtifactIds: '["artifact-1"]',
      };
      prisma.promptRun.update.mockResolvedValue(expected);

      const result = await service.complete('run-1', {
        aiRunId: 'ai-run-1',
        outputArtifactIds: ['artifact-1'],
      });

      expect(prisma.promptRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({
          status: PromptRunStatus.completed,
          aiRunId: 'ai-run-1',
        }),
      });
      expect(result.status).toBe(PromptRunStatus.completed);
      expect(result.aiRunId).toBe('ai-run-1');
    });

    it('serializes outputArtifactIds as JSON string', async () => {
      prisma.promptRun.update.mockResolvedValue({
        status: PromptRunStatus.completed,
      });

      await service.complete('run-1', {
        aiRunId: 'ai-run-1',
        outputArtifactIds: ['artifact-1', 'artifact-2'],
      });

      expect(prisma.promptRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            outputArtifactIds: JSON.stringify(['artifact-1', 'artifact-2']),
          }),
        }),
      );
    });
  });

  describe('fail', () => {
    it('sets status to failed', async () => {
      prisma.promptRun.update.mockResolvedValue({
        id: 'run-1',
        status: PromptRunStatus.failed,
      });

      const result = await service.fail('run-1');

      expect(prisma.promptRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: { status: PromptRunStatus.failed },
      });
      expect(result.status).toBe(PromptRunStatus.failed);
    });
  });

  describe('markRunning', () => {
    it('sets status to running', async () => {
      prisma.promptRun.update.mockResolvedValue({
        id: 'run-1',
        status: PromptRunStatus.running,
      });

      const result = await service.markRunning('run-1');

      expect(prisma.promptRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: { status: PromptRunStatus.running },
      });
      expect(result.status).toBe(PromptRunStatus.running);
    });
  });
});
