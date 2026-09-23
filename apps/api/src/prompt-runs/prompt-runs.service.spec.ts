import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { PromptRunsService, STALE_PROMPT_RUN_MS } from './prompt-runs.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptRunStatus } from '@prisma/client';

const makePrismaMock = () => ({
  promptRun: {
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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
    const dto = {
      workspaceId: 'ws-1',
      promptStep: 'prompt_1',
      templateId: 'tpl-1',
      templateVersion: 1,
    };

    it('throws ConflictException when the step is already in flight (unique index violation)', async () => {
      prisma.promptRun.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('rethrows unrelated database errors unchanged', async () => {
      const failure = new Error('connection lost');
      prisma.promptRun.create.mockRejectedValue(failure);

      await expect(service.create(dto)).rejects.toBe(failure);
    });

    it('fails stale in-flight runs of the same step before creating a new one', async () => {
      prisma.promptRun.create.mockResolvedValue({ id: 'run-2' });
      const before = Date.now();

      await service.create(dto);

      const call = prisma.promptRun.updateMany.mock.calls[0][0];
      expect(call.where).toMatchObject({
        workspaceId: 'ws-1',
        promptStep: 'prompt_1',
        status: { in: [PromptRunStatus.pending, PromptRunStatus.running] },
      });
      const cutoffMs = call.where.updatedAt.lt.getTime();
      expect(cutoffMs).toBeLessThanOrEqual(before - STALE_PROMPT_RUN_MS + 1000);
      expect(call.data).toEqual({ status: PromptRunStatus.failed });
      expect(
        prisma.promptRun.updateMany.mock.invocationCallOrder[0],
      ).toBeLessThan(prisma.promptRun.create.mock.invocationCallOrder[0]);
    });

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

    it('persists feedbackNotes when provided', async () => {
      prisma.promptRun.create.mockResolvedValue({
        id: 'run-1',
        status: PromptRunStatus.pending,
      } as never);

      await service.create({
        workspaceId: 'ws-1',
        promptStep: 'prompt_1',
        templateId: 'tpl-1',
        templateVersion: 1,
        feedbackNotes: 'Emphasize AWS experience.',
      });

      expect(prisma.promptRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            feedbackNotes: 'Emphasize AWS experience.',
          }),
        }),
      );
    });

    it('persists feedbackNotes as undefined (stored as null) when omitted', async () => {
      prisma.promptRun.create.mockResolvedValue({
        id: 'run-1',
        status: PromptRunStatus.pending,
      } as never);

      await service.create({
        workspaceId: 'ws-1',
        promptStep: 'prompt_1',
        templateId: 'tpl-1',
        templateVersion: 1,
      });

      expect(prisma.promptRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            feedbackNotes: undefined,
          }),
        }),
      );
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

  describe('failSafely', () => {
    it('marks a pending/running run failed', async () => {
      prisma.promptRun.updateMany.mockResolvedValue({ count: 1 });

      await service.failSafely('run-1');

      expect(prisma.promptRun.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'run-1',
          status: { in: [PromptRunStatus.pending, PromptRunStatus.running] },
        },
        data: { status: PromptRunStatus.failed },
      });
    });

    it('does not target an already completed run (guarded by the status filter)', async () => {
      await service.failSafely('run-1');

      const { where } = prisma.promptRun.updateMany.mock.calls[0][0];
      expect(where.status.in).not.toContain(PromptRunStatus.completed);
    });

    it('never throws, so it cannot mask the error being handled', async () => {
      prisma.promptRun.updateMany.mockRejectedValue(new Error('db down'));

      await expect(service.failSafely('run-1')).resolves.toBeUndefined();
    });
  });
});
