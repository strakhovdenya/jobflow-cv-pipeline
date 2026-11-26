import {
  LEGACY_ARTIFACTS,
  LEGACY_MANUAL_NOTES,
  LEGACY_WORKSPACE,
  activeKnowledgeSourceRows,
  activeTemplate,
  createKnowledgeSourceContentService,
  createWorkspaceStorage,
  fingerprintModelInput,
} from '../../../test/legacy-input-reference.helper';
import { BadRequestException } from '@nestjs/common';
import { KnowledgeSource } from '@prisma/client';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { CareerRegistryError } from '../../evidence/career-registry.parser';
import { KnowledgeSourceContentService } from '../../knowledge-sources/knowledge-source-content.service';
import { KnowledgeSourceSelectionService } from '../../knowledge-sources/knowledge-source-selection.service';
import { KnowledgeSourcesService } from '../../knowledge-sources/knowledge-sources.service';
import {
  Prompt2InputBuilderService,
  Prompt2WorkspaceContext,
} from './prompt2-input-builder.service';

function makeWorkspace(status: string): Prompt2WorkspaceContext {
  return {
    id: 'ws-1',
    status,
    companyNameOriginal: 'Acme Corp',
    companySlug: 'acme_corp',
    roleTitleOriginal: 'Backend Engineer',
    roleSlug: 'backend_engineer',
    workspacePath: '2024-01-01_acme_corp_backend_engineer',
    storageRoot: '/storage',
  };
}

function makeKnowledgeSources(): KnowledgeSource[] {
  return [
    {
      id: 'ks-1',
      filePath: '/cv/Master_CV_RU.md',
      sourceType: 'master_cv',
      contentHash: 'hash-ks-1',
      isActive: true,
      versionLabel: 'v1',
      importedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

describe('Prompt2InputBuilderService', () => {
  let service: Prompt2InputBuilderService;
  let artifactStorage: jest.Mocked<ArtifactStorageService>;
  let knowledgeSourcesMock: jest.Mocked<KnowledgeSourcesService>;
  let selectionMock: jest.Mocked<KnowledgeSourceSelectionService>;
  let knowledgeSourceContentMock: jest.Mocked<KnowledgeSourceContentService>;

  beforeEach(() => {
    artifactStorage = {
      readFileIfExists: jest.fn(),
    } as unknown as jest.Mocked<ArtifactStorageService>;

    knowledgeSourcesMock = {
      findActive: jest.fn().mockResolvedValue(makeKnowledgeSources()),
    } as never;

    selectionMock = {
      selectForStep: jest.fn().mockReturnValue(makeKnowledgeSources()),
    } as never;

    knowledgeSourceContentMock = {
      loadContent: jest.fn().mockResolvedValue([
        {
          id: 'ks-1',
          sourceType: 'master_cv',
          filePath: '/cv/Master_CV_RU.md',
          versionLabel: 'v1',
          contentAvailable: true,
          content: 'Master CV real content',
        },
      ]),
    } as never;

    service = new Prompt2InputBuilderService(
      artifactStorage,
      knowledgeSourcesMock,
      selectionMock,
      knowledgeSourceContentMock,
    );
  });

  describe('buildPrompt2Input', () => {
    it('calls selectForStep with prompt_2 and all active sources', async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"recommendation":"apply"}');
        return Promise.resolve(null);
      });

      const allActiveSources = makeKnowledgeSources();
      knowledgeSourcesMock.findActive.mockResolvedValue(allActiveSources);

      await service.buildPrompt2Input(
        makeWorkspace('cv_generation_running'),
        'template',
        1,
      );

      expect(selectionMock.selectForStep).toHaveBeenCalledWith(
        'prompt_2',
        allActiveSources,
      );
    });

    it('returns full input for approved workspace (status=cv_generation_running)', async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"recommendation":"apply"}');
        return Promise.resolve(null);
      });

      const result = await service.buildPrompt2Input(
        makeWorkspace('cv_generation_running'),
        'Prompt 2 template content',
        3,
      );

      expect(result.promptText).toBe('Prompt 2 template content');
      expect(result.templateVersion).toBe(3);
      expect(result.inputContext).toContain('vacancy text');
      expect(result.inputContext).toContain('{"recommendation":"apply"}');
      expect(result.inputContext).toContain('Acme Corp');
      expect(result.inputContext).toContain('Master_CV_RU.md');
    });

    it('throws BadRequestException for non-approved workspace status', async () => {
      for (const status of [
        'source_saved',
        'paused_after_analysis',
        'skipped',
        'cv_pdf_generated',
      ]) {
        await expect(
          service.buildPrompt2Input(makeWorkspace(status), 'template', 1),
        ).rejects.toThrow(BadRequestException);
      }
      expect(artifactStorage.readFileIfExists).not.toHaveBeenCalled();
    });

    it.each(['pre_pdf_check_ready', 'paused_before_export'])(
      'allows regenerating from %s and treats it as a regenerate (feeds previous draft + notes)',
      async (status) => {
        artifactStorage.readFileIfExists.mockImplementation((p: string) => {
          if (p.endsWith('00_vacancy_source.txt'))
            return Promise.resolve('vacancy text');
          if (p.endsWith('01_vacancy_analysis.json'))
            return Promise.resolve('{"recommendation":"apply"}');
          if (p.endsWith('02_targeted_cv_content.json'))
            return Promise.resolve('{"cv_content":"previous draft"}');
          return Promise.resolve(null);
        });

        const result = await service.buildPrompt2Input(
          makeWorkspace(status),
          'template',
          1,
          'Fix overclaiming in experience[0].bullets[0].text.',
        );

        expect(result.isRegenerate).toBe(true);
        expect(result.inputContext).toContain('PREVIOUS CV DRAFT');
        expect(result.inputContext).toContain(
          '{"cv_content":"previous draft"}',
        );
        expect(result.inputContext).toContain('USER FEEDBACK FOR REGENERATION');
        expect(result.inputContext).toContain(
          'Fix overclaiming in experience[0].bullets[0].text.',
        );
      },
    );

    it.each(['cv_draft_ready', 'paused_after_cv_draft'])(
      'allows regenerating from %s and feeds the previous draft + user notes into the prompt',
      async (status) => {
        artifactStorage.readFileIfExists.mockImplementation((p: string) => {
          if (p.endsWith('00_vacancy_source.txt'))
            return Promise.resolve('vacancy text');
          if (p.endsWith('01_vacancy_analysis.json'))
            return Promise.resolve('{"recommendation":"apply"}');
          if (p.endsWith('02_targeted_cv_content.json'))
            return Promise.resolve('{"cv_content":"previous draft"}');
          return Promise.resolve(null);
        });

        const result = await service.buildPrompt2Input(
          makeWorkspace(status),
          'template',
          1,
          'Emphasize the AWS experience more.',
        );

        expect(result.inputContext).toContain('PREVIOUS CV DRAFT');
        expect(result.inputContext).toContain('"cv_content":"previous draft"');
        expect(result.inputContext).toContain('USER FEEDBACK FOR REGENERATION');
        expect(result.inputContext).toContain(
          'Emphasize the AWS experience more.',
        );
      },
    );

    it('regenerates without notes and without a previous draft artifact (defensive fallback)', async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"recommendation":"apply"}');
        return Promise.resolve(null);
      });

      const result = await service.buildPrompt2Input(
        makeWorkspace('cv_draft_ready'),
        'template',
        1,
      );

      expect(result.inputContext).not.toContain('PREVIOUS CV DRAFT');
      expect(result.inputContext).not.toContain(
        'USER FEEDBACK FOR REGENERATION',
      );
    });

    it('does not include the regenerate blocks on a first-time generation, even if notes were passed', async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"recommendation":"apply"}');
        return Promise.resolve(null);
      });

      const result = await service.buildPrompt2Input(
        makeWorkspace('cv_generation_running'),
        'template',
        1,
        'should be ignored on first generation',
      );

      expect(result.inputContext).not.toContain('PREVIOUS CV DRAFT');
      expect(result.inputContext).not.toContain(
        'should be ignored on first generation',
      );
    });

    it('sourceSnapshot contains vacancySourceHash and knowledge source hashes', async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('analysis content');
        return Promise.resolve(null);
      });

      const result = await service.buildPrompt2Input(
        makeWorkspace('cv_generation_running'),
        'template',
        1,
      );

      const snapshot = JSON.parse(result.sourceSnapshot);
      expect(snapshot.vacancySourceHash).toBeDefined();
      expect(typeof snapshot.vacancySourceHash).toBe('string');
      expect(snapshot.vacancySourceHash).toHaveLength(64); // sha256 hex
      expect(snapshot.knowledgeSources).toHaveLength(1);
      expect(snapshot.knowledgeSources[0].contentHash).toBe('hash-ks-1');
      expect(snapshot.knowledgeSources[0].id).toBe('ks-1');
      expect(snapshot.knowledgeSources[0].versionLabel).toBe('v1');
    });

    it('falls back to 01_vacancy_analysis.md when .json is not found', async () => {
      selectionMock.selectForStep.mockReturnValue([]);
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve(null);
        if (p.endsWith('01_vacancy_analysis.md'))
          return Promise.resolve('# Analysis markdown');
        return Promise.resolve(null);
      });

      const result = await service.buildPrompt2Input(
        makeWorkspace('cv_generation_running'),
        'template',
        1,
      );

      expect(result.inputContext).toContain('# Analysis markdown');
    });

    it('throws BadRequestException when both analysis artifacts are missing', async () => {
      selectionMock.selectForStep.mockReturnValue([]);
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        return Promise.resolve(null);
      });

      await expect(
        service.buildPrompt2Input(
          makeWorkspace('cv_generation_running'),
          'template',
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('propagates a non-ENOENT read error instead of reporting a missing required artifact', async () => {
      const denied = Object.assign(new Error('EACCES'), { code: 'EACCES' });
      artifactStorage.readFileIfExists.mockRejectedValue(denied);

      await expect(
        service.buildPrompt2Input(
          makeWorkspace('cv_generation_running'),
          'template',
          1,
        ),
      ).rejects.toBe(denied);
    });

    it('propagates a non-ENOENT read error on an artifact that is otherwise optional or has a fallback', async () => {
      const denied = Object.assign(new Error('EIO'), { code: 'EIO' });
      artifactStorage.readFileIfExists.mockImplementation((p: string) =>
        p.endsWith('01_vacancy_analysis.json')
          ? Promise.reject(denied)
          : Promise.resolve('{}'),
      );

      await expect(
        service.buildPrompt2Input(
          makeWorkspace('cv_generation_running'),
          'template',
          1,
        ),
      ).rejects.toBe(denied);
    });

    it('throws BadRequestException when 00_vacancy_source.txt is missing', async () => {
      artifactStorage.readFileIfExists.mockResolvedValue(null);

      await expect(
        service.buildPrompt2Input(
          makeWorkspace('cv_generation_running'),
          'template',
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('labels source by basename', async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"recommendation":"apply"}');
        return Promise.resolve(null);
      });
      knowledgeSourceContentMock.loadContent.mockResolvedValue([
        {
          id: 'ks-1',
          sourceType: 'master_cv',
          filePath: '/home/os-user/cv/nested/Master_CV_RU.md',
          versionLabel: 'v1',
          contentAvailable: true,
          content: 'Master CV text',
        },
      ]);

      const result = await service.buildPrompt2Input(
        makeWorkspace('cv_generation_running'),
        'template',
        1,
      );

      expect(result.inputContext).toContain(
        '[Source: master_cv | Master_CV_RU.md]',
      );
      expect(result.inputContext).not.toContain(
        '/home/os-user/cv/nested/Master_CV_RU.md',
      );
    });

    it('renders a labeled stub for a contentAvailable: false knowledge source entry', async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"recommendation":"apply"}');
        return Promise.resolve(null);
      });
      knowledgeSourceContentMock.loadContent.mockResolvedValue([
        {
          id: 'ks-1',
          sourceType: 'master_cv',
          filePath: '/cv/Master_CV_RU.md',
          versionLabel: 'v1',
          contentAvailable: false,
          unavailableReason: 'Binary/unsupported source type',
        },
      ]);

      const result = await service.buildPrompt2Input(
        makeWorkspace('cv_generation_running'),
        'template',
        1,
      );

      expect(result.inputContext).toContain(
        '[Content unavailable: Binary/unsupported source type]',
      );
      expect(result.inputContext).not.toContain('content not loaded in MVP');
    });

    it('propagates a hash-mismatch rejection from loadContent out of buildPrompt2Input', async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"recommendation":"apply"}');
        return Promise.resolve(null);
      });
      const hashMismatchError = new BadRequestException(
        'Knowledge source content hash mismatch',
      );
      knowledgeSourceContentMock.loadContent.mockRejectedValue(
        hashMismatchError,
      );

      await expect(
        service.buildPrompt2Input(
          makeWorkspace('cv_generation_running'),
          'template',
          1,
        ),
      ).rejects.toThrow(hashMismatchError);
    });

    it('includes a MANUAL NOTE block with the full note text when manualNotes is set', async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"recommendation":"apply"}');
        return Promise.resolve(null);
      });

      const result = await service.buildPrompt2Input(
        {
          ...makeWorkspace('cv_generation_running'),
          manualNotes: [
            { id: 'note-1', text: 'Recruiter said team uses Kotlin too.' },
          ],
        },
        'template',
        1,
      );

      expect(result.inputContext).toContain('=== MANUAL NOTE ===');
      expect(result.inputContext).toContain(
        'Recruiter said team uses Kotlin too.',
      );
    });

    it("omits the MANUAL NOTE block and matches today's output when manualNotes is absent", async () => {
      artifactStorage.readFileIfExists.mockImplementation((p: string) => {
        if (p.endsWith('00_vacancy_source.txt'))
          return Promise.resolve('vacancy text');
        if (p.endsWith('01_vacancy_analysis.json'))
          return Promise.resolve('{"recommendation":"apply"}');
        return Promise.resolve(null);
      });

      const withoutNote = await service.buildPrompt2Input(
        makeWorkspace('cv_generation_running'),
        'template',
        1,
      );
      const withEmptyNotes = await service.buildPrompt2Input(
        { ...makeWorkspace('cv_generation_running'), manualNotes: [] },
        'template',
        1,
      );

      expect(withoutNote.inputContext).not.toContain('MANUAL NOTE');
      expect(withEmptyNotes.inputContext).toBe(withoutNote.inputContext);
    });

    describe('career registries', () => {
      const registryBlock = (blockType: string, value: unknown): string =>
        ['```json ' + blockType, JSON.stringify(value), '```'].join('\n');

      const inventoryText = registryBlock('portfolio-registry', {
        schema: 'portfolio-registry/v1',
        projects: [
          {
            id: 'sample-tool',
            title: 'Sample Tool',
            status: 'active',
            cvEligible: true,
            portfolioPriority: 'primary',
            placement: 'selected_projects',
            evidenceClass: 'personal_verified',
            repositoryUrl: null,
            lastVerifiedAt: '2026-01-15',
          },
        ],
      });
      const certificationsText = registryBlock('credential-registry', {
        schema: 'credential-registry/v1',
        credentials: [],
      });

      const loadedEntry = (sourceType: string, content: string) => ({
        id: `ks-${sourceType}`,
        sourceType,
        filePath: `/cv/${sourceType}.md`,
        versionLabel: 'v1',
        contentAvailable: true as const,
        content,
      });

      beforeEach(() => {
        artifactStorage.readFileIfExists.mockImplementation((p: string) => {
          if (p.endsWith('00_vacancy_source.txt'))
            return Promise.resolve('vacancy text');
          if (p.endsWith('01_vacancy_analysis.json'))
            return Promise.resolve('{"recommendation":"apply"}');
          return Promise.resolve(null);
        });
      });

      it('parses the registries from the already-loaded source content', async () => {
        knowledgeSourceContentMock.loadContent.mockResolvedValue([
          loadedEntry('project_inventory', `# Inventory\n\n${inventoryText}`),
          loadedEntry('certifications', certificationsText),
        ]);

        const result = await service.buildPrompt2Input(
          makeWorkspace('cv_generation_running'),
          'template',
          1,
        );

        expect(knowledgeSourceContentMock.loadContent).toHaveBeenCalledTimes(1);
        expect(result.careerRegistries).not.toBeInstanceOf(Error);
        expect(result.careerRegistries).toMatchObject({
          portfolio: {
            projects: [{ id: 'sample-tool', title: 'Sample Tool' }],
          },
          credentials: { credentials: [] },
        });
        expect(result.inputContext).toContain(inventoryText);
      });

      it('returns a CareerRegistryError instead of throwing when a registry is invalid', async () => {
        knowledgeSourceContentMock.loadContent.mockResolvedValue([
          loadedEntry('project_inventory', '# Inventory without a registry'),
          loadedEntry('certifications', certificationsText),
        ]);

        const result = await service.buildPrompt2Input(
          makeWorkspace('cv_generation_running'),
          'template',
          1,
        );

        expect(result.careerRegistries).toBeInstanceOf(CareerRegistryError);
        expect((result.careerRegistries as CareerRegistryError).message).toBe(
          'Invalid portfolio-registry: no registry block found',
        );
      });

      it('returns a CareerRegistryError when the registry source text is unavailable', async () => {
        knowledgeSourceContentMock.loadContent.mockResolvedValue([
          {
            id: 'ks-inventory',
            sourceType: 'project_inventory',
            filePath: '/cv/project_inventory.pdf',
            versionLabel: 'v1',
            contentAvailable: false,
            unavailableReason: 'binary',
          },
          loadedEntry('certifications', certificationsText),
        ]);

        const result = await service.buildPrompt2Input(
          makeWorkspace('cv_generation_running'),
          'template',
          1,
        );

        expect(result.careerRegistries).toBeInstanceOf(CareerRegistryError);
      });
    });
  });
});

// ADR-046 item 1 and its amendment of 2026-11-26: the template and the complete input context of
// a legacy workspace, recorded on the unchanged post-#709 code with the real active template and
// sources. A change of either fingerprint is a change of the legacy Prompt 2 input.
const LEGACY_PROMPT2_INPUT = {
  templateVersion: 15,
  template: {
    sha256: 'bbee818142d5c1d111e77b55808475aa5ba6f574b0454f8c8645fad8255efdec',
    length: 129735,
  },
  inputContext: {
    sha256: '4c4ddaec5f90392b5c803b791225ffc870dd0e12aa675cb20093626c3d745379',
    length: 503810,
  },
};

describe('Prompt2InputBuilderService — legacy invariance', () => {
  it('keeps the legacy Prompt 2 input byte-identical', async () => {
    const template = activeTemplate('prompt_2');
    const knowledgeSources = {
      findActive: jest.fn().mockResolvedValue(activeKnowledgeSourceRows()),
    } as unknown as KnowledgeSourcesService;
    const builder = new Prompt2InputBuilderService(
      createWorkspaceStorage(
        LEGACY_ARTIFACTS,
      ) as unknown as ArtifactStorageService,
      knowledgeSources,
      new KnowledgeSourceSelectionService(),
      createKnowledgeSourceContentService(),
    );

    const result = await builder.buildPrompt2Input(
      {
        ...LEGACY_WORKSPACE,
        status: 'cv_generation_running',
        manualNotes: LEGACY_MANUAL_NOTES,
      },
      template.content,
      template.version,
    );

    expect(result.promptText).toBe(template.content);
    expect(
      fingerprintModelInput(
        result.templateVersion,
        result.promptText,
        result.inputContext,
      ),
    ).toEqual(LEGACY_PROMPT2_INPUT);
  });
});
