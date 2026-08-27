import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeSource } from '@prisma/client';
import * as path from 'path';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { KnowledgeSourceContentService } from '../knowledge-sources/knowledge-source-content.service';
import {
  PromptInputBuilderService,
  WorkspaceInputContext,
} from './prompt-input-builder.service';

const makeStorageMock = () => ({
  readFile: jest.fn(),
  storageRoot: '/storage',
});

const makeContentServiceMock = () => ({
  loadContent: jest.fn().mockResolvedValue([]),
});

const makeWorkspace = (): WorkspaceInputContext => ({
  companyNameOriginal: 'Acme Corp',
  companySlug: 'Acme_Corp',
  roleTitleOriginal: 'Backend Developer',
  roleSlug: 'Backend_Developer',
  workspaceSlug: '2026_01_01_Acme_Corp_Backend_Developer',
  workspacePath: '2026_01_01_Acme_Corp_Backend_Developer',
  storageRoot: '/storage',
});

const makeKnowledgeSource = (
  overrides: Partial<KnowledgeSource> = {},
): KnowledgeSource => ({
  id: 'ks-1',
  filePath: '/knowledge/tech_stack.md',
  sourceType: 'tech_stack_matrix',
  isActive: true,
  contentHash: 'abc123',
  versionLabel: 'v2.0',
  importedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('PromptInputBuilderService', () => {
  let service: PromptInputBuilderService;
  let storageMock: ReturnType<typeof makeStorageMock>;
  let contentServiceMock: ReturnType<typeof makeContentServiceMock>;

  beforeEach(async () => {
    storageMock = makeStorageMock();
    storageMock.readFile.mockResolvedValue(
      'We are looking for a Backend Developer...',
    );
    contentServiceMock = makeContentServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptInputBuilderService,
        { provide: ArtifactStorageService, useValue: storageMock },
        {
          provide: KnowledgeSourceContentService,
          useValue: contentServiceMock,
        },
      ],
    }).compile();

    service = module.get<PromptInputBuilderService>(PromptInputBuilderService);
  });

  it('reads 00_vacancy_source.txt from the workspace path', async () => {
    await service.buildPrompt1Input(
      makeWorkspace(),
      'Analyze this vacancy.',
      [],
    );

    const expectedPath = path.join(
      '/storage',
      '2026_01_01_Acme_Corp_Backend_Developer',
      '00_vacancy_source.txt',
    );
    expect(storageMock.readFile).toHaveBeenCalledWith(expectedPath);
  });

  it('includes company and role metadata in inputContext', async () => {
    const result = await service.buildPrompt1Input(
      makeWorkspace(),
      'template',
      [],
    );

    expect(result.inputContext).toContain('Acme Corp');
    expect(result.inputContext).toContain('Acme_Corp');
    expect(result.inputContext).toContain('Backend Developer');
    expect(result.inputContext).toContain('Backend_Developer');
  });

  it('includes vacancy text in inputContext', async () => {
    const result = await service.buildPrompt1Input(
      makeWorkspace(),
      'template',
      [],
    );

    expect(result.inputContext).toContain(
      'We are looking for a Backend Developer...',
    );
  });

  it('passes template content as promptText unchanged', async () => {
    const templateContent = 'Analyze the vacancy as a career strategist.';
    const result = await service.buildPrompt1Input(
      makeWorkspace(),
      templateContent,
      [],
    );

    expect(result.promptText).toBe(templateContent);
  });

  it('includes knowledge source metadata and real content in inputContext', async () => {
    const ks = makeKnowledgeSource();
    contentServiceMock.loadContent.mockResolvedValue([
      {
        id: 'ks-1',
        sourceType: 'tech_stack_matrix',
        filePath: '/knowledge/tech_stack.md',
        versionLabel: 'v2.0',
        contentAvailable: true,
        content: 'Node.js, TypeScript, NestJS, PostgreSQL',
      },
    ]);

    const result = await service.buildPrompt1Input(
      makeWorkspace(),
      'template',
      [ks],
    );

    expect(contentServiceMock.loadContent).toHaveBeenCalledWith([ks]);
    expect(result.inputContext).toContain('tech_stack_matrix');
    expect(result.inputContext).toContain('/knowledge/tech_stack.md');
    expect(result.inputContext).toContain(
      'Node.js, TypeScript, NestJS, PostgreSQL',
    );
    expect(result.inputContext).not.toContain('content not loaded in MVP');
  });

  it('renders a labeled stub referencing unavailableReason for contentAvailable: false entries', async () => {
    const ks = makeKnowledgeSource({
      id: 'ks-2',
      sourceType: 'layout',
      filePath: '/knowledge/CV_Layout_Reference.pdf',
    });
    contentServiceMock.loadContent.mockResolvedValue([
      {
        id: 'ks-2',
        sourceType: 'layout',
        filePath: '/knowledge/CV_Layout_Reference.pdf',
        versionLabel: null,
        contentAvailable: false,
        unavailableReason:
          'Binary/unsupported source type (".pdf") — content not parsed in MVP',
      },
    ]);

    const result = await service.buildPrompt1Input(
      makeWorkspace(),
      'template',
      [ks],
    );

    expect(result.inputContext).toContain('Content unavailable');
    expect(result.inputContext).toContain(
      'Binary/unsupported source type (".pdf") — content not parsed in MVP',
    );
    expect(result.inputContext).not.toContain('content not loaded in MVP');
  });

  it('propagates a hash-mismatch error thrown by loadContent uncaught', async () => {
    const ks = makeKnowledgeSource();
    const hashMismatchError = new Error(
      'Knowledge source content hash mismatch',
    );
    contentServiceMock.loadContent.mockRejectedValue(hashMismatchError);

    await expect(
      service.buildPrompt1Input(makeWorkspace(), 'template', [ks]),
    ).rejects.toThrow(hashMismatchError);
  });

  it('stores knowledge source id, path, type and hash in sourceSnapshot', async () => {
    const ks = makeKnowledgeSource();
    const result = await service.buildPrompt1Input(
      makeWorkspace(),
      'template',
      [ks],
    );

    const snapshot = JSON.parse(result.sourceSnapshot) as Array<{
      id: string;
      filePath: string;
      sourceType: string;
      contentHash: string;
    }>;
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].id).toBe('ks-1');
    expect(snapshot[0].contentHash).toBe('abc123');
    expect(snapshot[0].sourceType).toBe('tech_stack_matrix');
  });

  it('returns empty snapshot array when no knowledge sources provided', async () => {
    const result = await service.buildPrompt1Input(
      makeWorkspace(),
      'template',
      [],
    );

    const snapshot = JSON.parse(result.sourceSnapshot) as unknown[];
    expect(snapshot).toEqual([]);
  });

  it('includes placeholder text when no knowledge sources are available', async () => {
    const result = await service.buildPrompt1Input(
      makeWorkspace(),
      'template',
      [],
    );

    expect(result.inputContext).toContain(
      'No active knowledge sources available',
    );
  });

  it('handles multiple knowledge sources in sourceSnapshot', async () => {
    const ks1 = makeKnowledgeSource({
      id: 'ks-1',
      sourceType: 'tech_stack_matrix',
    });
    const ks2 = makeKnowledgeSource({
      id: 'ks-2',
      sourceType: 'profile_summary',
      contentHash: 'def456',
    });
    const result = await service.buildPrompt1Input(
      makeWorkspace(),
      'template',
      [ks1, ks2],
    );

    const snapshot = JSON.parse(result.sourceSnapshot) as Array<{ id: string }>;
    expect(snapshot).toHaveLength(2);
    expect(snapshot.map((s) => s.id)).toEqual(['ks-1', 'ks-2']);
  });

  it('includes a MANUAL NOTE block with the full note text when manualNotes is set', async () => {
    const result = await service.buildPrompt1Input(
      {
        ...makeWorkspace(),
        manualNotes: [
          { id: 'note-1', text: 'Recruiter said team uses Kotlin too.' },
        ],
      },
      'template',
      [],
    );

    expect(result.inputContext).toContain('=== MANUAL NOTE ===');
    expect(result.inputContext).toContain(
      'Recruiter said team uses Kotlin too.',
    );
  });

  it("omits the MANUAL NOTE block and matches today's output when manualNotes is absent", async () => {
    const withoutNote = await service.buildPrompt1Input(
      makeWorkspace(),
      'template',
      [],
    );
    const withEmptyNotes = await service.buildPrompt1Input(
      { ...makeWorkspace(), manualNotes: [] },
      'template',
      [],
    );

    expect(withoutNote.inputContext).not.toContain('MANUAL NOTE');
    expect(withEmptyNotes.inputContext).toBe(withoutNote.inputContext);
  });
});
