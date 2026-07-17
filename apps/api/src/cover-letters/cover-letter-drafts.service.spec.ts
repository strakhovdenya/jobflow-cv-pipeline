import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CoverLetterDraftsService } from './cover-letter-drafts.service';

const WORKSPACE_ID = 'ws-cover-letter-1';

const makeWorkspace = (status: WorkspaceStatus) => ({
  id: WORKSPACE_ID,
  status,
});

describe('CoverLetterDraftsService', () => {
  let service: CoverLetterDraftsService;
  let prismaMock: {
    applicationWorkspace: { findUnique: jest.Mock };
    coverLetterDraft: { create: jest.Mock };
  };

  beforeEach(async () => {
    prismaMock = {
      applicationWorkspace: { findUnique: jest.fn() },
      coverLetterDraft: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoverLetterDraftsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CoverLetterDraftsService>(CoverLetterDraftsService);
  });

  describe('create', () => {
    it('creates a cover letter draft for a workspace after the CV exists', async () => {
      const workspace = makeWorkspace(WorkspaceStatus.cv_pdf_generated);
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(workspace);
      const created = {
        id: 'cld-1',
        workspaceId: WORKSPACE_ID,
        promptRunId: null,
        letterType: 'cover_letter',
        status: 'draft_ready',
      };
      prismaMock.coverLetterDraft.create.mockResolvedValue(created);

      const result = await service.create(WORKSPACE_ID, {
        letterType: 'cover_letter',
      });

      expect(prismaMock.coverLetterDraft.create).toHaveBeenCalledWith({
        data: {
          workspaceId: WORKSPACE_ID,
          promptRunId: null,
          letterType: 'cover_letter',
        },
      });
      expect(result).toEqual(created);
    });

    it('throws NotFoundException when the workspace does not exist', async () => {
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(null);

      await expect(
        service.create(WORKSPACE_ID, { letterType: 'cover_letter' }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.coverLetterDraft.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the workspace is skipped', async () => {
      const workspace = makeWorkspace(WorkspaceStatus.skipped);
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(workspace);

      await expect(
        service.create(WORKSPACE_ID, { letterType: 'cover_letter' }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.coverLetterDraft.create).not.toHaveBeenCalled();
    });

    it('succeeds once a manual override has moved the workspace out of skipped', async () => {
      const workspace = makeWorkspace(WorkspaceStatus.cv_generation_running);
      prismaMock.applicationWorkspace.findUnique.mockResolvedValue(workspace);
      const created = {
        id: 'cld-2',
        workspaceId: WORKSPACE_ID,
        promptRunId: null,
        letterType: 'recruiter_message',
        status: 'draft_ready',
      };
      prismaMock.coverLetterDraft.create.mockResolvedValue(created);

      const result = await service.create(WORKSPACE_ID, {
        letterType: 'recruiter_message',
      });

      expect(result).toEqual(created);
    });
  });
});
