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
import * as path from 'path';
import { FAKE_PROMPT2_JSON } from '../../ai/providers/fake.provider';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { CANDIDATE_PROFILE_CONFIG } from '../../document-export/candidate-profile.config';
import { applyCredentialMetadata } from '../../document-export/credential-metadata';
import { mapPrompt2OutputToCvContent } from '../../document-export/prompt2-to-cv-content.mapper';
import { parseRegistrySnapshot } from '../../evidence/registry-compliance';
import { KnowledgeSourceContentService } from '../../knowledge-sources/knowledge-source-content.service';
import { KnowledgeSourceSelectionService } from '../../knowledge-sources/knowledge-source-selection.service';
import { KnowledgeSourcesService } from '../../knowledge-sources/knowledge-sources.service';
import {
  CoverLetterInputBuilderService,
  CoverLetterWorkspaceContext,
} from './cover-letter-input-builder.service';
import type { TargetedCvContentOutput } from '../schemas/targeted-cv-content.schema';

const VISIBLE_PROJECT = 'Sample Portfolio Service';
const HIDDEN_PROJECT = 'Sample Hidden Project';
const CREDENTIAL = 'Sample Agent Badge';
const CREDENTIAL_ISSUER = 'Sample Cloud Academy';
const SECOND_CREDENTIAL = 'Sample Testing Course';
const EXPORTED_CV_HEADER = '=== EXPORTED CV';
const DRAFT_NOTES_HEADER = '=== CV DRAFT NOTES';

// Synthetic registry-snapshot/v2 as the Prompt 2 guard stores it in the draft.
function makeRegistrySnapshot() {
  return {
    schema: 'registry-snapshot/v2',
    projects: [
      {
        title: VISIBLE_PROJECT,
        aliases: [],
        status: 'active',
        cvEligible: true,
        placement: 'selected_projects',
      },
    ],
    credentials: [
      {
        title: CREDENTIAL,
        aliases: [],
        type: 'skill_badge',
        status: 'earned',
        cvEligible: true,
        issuer: CREDENTIAL_ISSUER,
        issued: '2025-11',
      },
      {
        title: SECOND_CREDENTIAL,
        aliases: [],
        type: 'course_completion',
        status: 'completed',
        cvEligible: true,
        issuer: CREDENTIAL_ISSUER,
        issued: '2024-03',
      },
    ],
    acceptedForced: { projects: [], credentials: [] },
  };
}

// A valid Prompt 2 draft: one shown and one excluded project, one included credential.
function makeDraft(
  edit: (draft: TargetedCvContentOutput) => void = () => undefined,
): TargetedCvContentOutput {
  const draft = JSON.parse(
    JSON.stringify(FAKE_PROMPT2_JSON),
  ) as TargetedCvContentOutput;
  const [shown] = draft.cv_content.selected_projects;
  draft.cv_content.selected_projects = [
    { ...shown, title: VISIBLE_PROJECT },
    {
      ...shown,
      title: HIDDEN_PROJECT,
      include: false,
      relevance_reason: 'Not relevant for this vacancy.',
      bullets: [{ text: `Built ${HIDDEN_PROJECT}.`, priority: 'low' }],
    },
  ];
  draft.cv_content.certifications = [
    { title: CREDENTIAL, include: true, reason: 'relevant' },
  ];
  draft.overclaiming_check = {
    critical_issues: [],
    warnings: ['Synthetic overclaiming warning.'],
    needs_evidence: [],
    registry_violations: [],
    registry_snapshot: makeRegistrySnapshot(),
  };
  edit(draft);
  return draft;
}

function makePrePdfCheck(
  fieldPath: string,
  originalText: string,
  suggestedText: string,
): string {
  return JSON.stringify({
    schema_version: '1.0',
    workspace_id: 'ws-1',
    readiness: 'ready_with_minor_edits',
    corrections: [
      {
        field_path: fieldPath,
        original_text: originalText,
        suggested_text: suggestedText,
        severity: 'warning',
        reason: 'Overclaim.',
      },
    ],
    quality_score: 80,
    export_blocked: false,
    overall_notes: 'Minor edits.',
  });
}

const enoent = (): NodeJS.ErrnoException =>
  Object.assign(new Error('ENOENT'), { code: 'ENOENT' });

interface ExportedCvForTest {
  headline: string;
  summary: string[];
  selected_projects: { title: string }[];
  certifications: {
    name: string;
    issuer?: string;
    kind?: string;
    date?: string;
  }[];
}

// The JSON block printed under the EXPORTED CV heading.
function exportedCvOf(inputContext: string): ExportedCvForTest {
  const start = inputContext.indexOf(EXPORTED_CV_HEADER);
  expect(start).toBeGreaterThanOrEqual(0);
  const body = inputContext.slice(inputContext.indexOf('\n', start) + 1);
  return JSON.parse(
    body.slice(0, body.indexOf('\n\n===')),
  ) as ExportedCvForTest;
}

function makeWorkspace(status: string): CoverLetterWorkspaceContext {
  return {
    id: 'ws-1',
    status,
    companyNameOriginal: 'Acme Corp',
    roleTitleOriginal: 'Backend Engineer',
    workspacePath: '2024-01-01_acme_corp_backend_engineer',
    storageRoot: '/storage',
  };
}

function makeKnowledgeSources(): KnowledgeSource[] {
  return [
    {
      id: 'ks-1',
      filePath: '/knowledge-sources/Master_Profile_Summary.md',
      sourceType: 'profile_summary',
      contentHash: 'hash-ks-1',
      isActive: true,
      versionLabel: 'v1',
      importedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

describe('CoverLetterInputBuilderService', () => {
  let service: CoverLetterInputBuilderService;
  let artifactStorage: jest.Mocked<ArtifactStorageService>;
  let knowledgeSourcesMock: jest.Mocked<KnowledgeSourcesService>;
  let selectionMock: jest.Mocked<KnowledgeSourceSelectionService>;
  let knowledgeSourceContentMock: jest.Mocked<KnowledgeSourceContentService>;

  beforeEach(() => {
    artifactStorage = {
      readFileIfExists: jest.fn(),
      readFile: jest.fn(),
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
          sourceType: 'profile_summary',
          filePath: '/knowledge-sources/Master_Profile_Summary.md',
          versionLabel: 'v1',
          contentAvailable: true,
          content: 'Profile summary real content',
        },
      ]),
    } as never;

    service = new CoverLetterInputBuilderService(
      artifactStorage,
      knowledgeSourcesMock,
      selectionMock,
      knowledgeSourceContentMock,
    );
  });

  // Serves workspace artifacts by file name through both read methods; a null override removes
  // a default file.
  function serveFiles(overrides: Record<string, string | null> = {}): void {
    const files: Record<string, string | null> = {
      '00_vacancy_source.txt': 'vacancy text',
      '02_targeted_cv_content.json': JSON.stringify(makeDraft()),
      ...overrides,
    };
    const read = (absolutePath: string): string | null =>
      files[path.basename(absolutePath)] ?? null;
    artifactStorage.readFileIfExists.mockImplementation((absolutePath) =>
      Promise.resolve(read(absolutePath)),
    );
    artifactStorage.readFile.mockImplementation((absolutePath) => {
      const text = read(absolutePath);
      return text === null ? Promise.reject(enoent()) : Promise.resolve(text);
    });
  }

  describe('buildCoverLetterInput', () => {
    it('throws BadRequestException for statuses other than cv_pdf_generated/final_check_ready', async () => {
      for (const status of [
        'source_saved',
        'paused_after_analysis',
        'cv_generation_running',
        'cv_draft_ready',
        'export_running',
      ]) {
        await expect(
          service.buildCoverLetterInput(makeWorkspace(status), 'template'),
        ).rejects.toThrow(BadRequestException);
      }
      expect(artifactStorage.readFileIfExists).not.toHaveBeenCalled();
    });

    it('allows status=cv_pdf_generated', async () => {
      serveFiles();

      await expect(
        service.buildCoverLetterInput(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).resolves.toBeDefined();
    });

    it('allows status=final_check_ready', async () => {
      serveFiles();

      await expect(
        service.buildCoverLetterInput(
          makeWorkspace('final_check_ready'),
          'template',
        ),
      ).resolves.toBeDefined();
    });

    it('calls selectForStep with cover_letter and all active sources', async () => {
      serveFiles();

      const allActiveSources = makeKnowledgeSources();
      knowledgeSourcesMock.findActive.mockResolvedValue(allActiveSources);

      await service.buildCoverLetterInput(
        makeWorkspace('cv_pdf_generated'),
        'template',
      );

      expect(selectionMock.selectForStep).toHaveBeenCalledWith(
        'cover_letter',
        allActiveSources,
      );
    });

    it('returns full input context for status=cv_pdf_generated', async () => {
      serveFiles({ '01_vacancy_analysis.json': '{"decision":"apply"}' });

      const result = await service.buildCoverLetterInput(
        makeWorkspace('cv_pdf_generated'),
        'Cover letter template content',
      );

      expect(result.promptText).toBe('Cover letter template content');
      expect(result.inputContext).toContain('vacancy text');
      expect(result.inputContext).toContain('{"decision":"apply"}');
      // The exported CV replaces the raw draft (ISSUE-696).
      expect(exportedCvOf(result.inputContext).headline).toBe(
        FAKE_PROMPT2_JSON.cv_content.headline,
      );
      expect(result.inputContext).toContain('Acme Corp');
      expect(result.inputContext).toContain('Master_Profile_Summary.md');
    });

    describe('with the real source selection', () => {
      const SOURCE_TYPES = [
        'profile_summary',
        'cv_rules',
        'career_cases',
        'tech_stack',
        'project_inventory',
      ];

      function makeSourceOfType(
        sourceType: string,
        isActive = true,
      ): KnowledgeSource {
        return {
          ...makeKnowledgeSources()[0],
          id: `ks-${sourceType}`,
          sourceType,
          filePath: `/knowledge-sources/${sourceType}.md`,
          isActive,
        };
      }

      function useRealSelection(sources: KnowledgeSource[]): void {
        const realSelection = new KnowledgeSourceSelectionService();
        selectionMock.selectForStep.mockImplementation((step, all) =>
          realSelection.selectForStep(step, all),
        );
        knowledgeSourcesMock.findActive.mockResolvedValue(sources);
        knowledgeSourceContentMock.loadContent.mockImplementation((selected) =>
          Promise.resolve(
            selected.map((source) => ({
              id: source.id,
              sourceType: source.sourceType,
              filePath: source.filePath,
              versionLabel: source.versionLabel,
              contentAvailable: true as const,
              content: `content of ${source.sourceType}`,
            })),
          ),
        );
        serveFiles();
      }

      it('includes career_cases, tech_stack and project_inventory blocks in the input context', async () => {
        useRealSelection(SOURCE_TYPES.map((type) => makeSourceOfType(type)));

        const result = await service.buildCoverLetterInput(
          makeWorkspace('cv_pdf_generated'),
          'template',
        );

        for (const sourceType of [
          'career_cases',
          'tech_stack',
          'project_inventory',
        ]) {
          expect(result.inputContext).toContain(
            `[Source: ${sourceType} | ${sourceType}.md]`,
          );
          expect(result.inputContext).toContain(`content of ${sourceType}`);
        }
      });

      it('omits an inactive career_cases source from the input context', async () => {
        useRealSelection([
          ...SOURCE_TYPES.filter((type) => type !== 'career_cases').map(
            (type) => makeSourceOfType(type),
          ),
          makeSourceOfType('career_cases', false),
        ]);

        const result = await service.buildCoverLetterInput(
          makeWorkspace('cv_pdf_generated'),
          'template',
        );

        expect(result.inputContext).not.toContain('[Source: career_cases');
        expect(result.inputContext).toContain('[Source: tech_stack');
      });
    });

    it('propagates a non-ENOENT read error instead of reporting a missing required artifact', async () => {
      const denied = Object.assign(new Error('EACCES'), { code: 'EACCES' });
      artifactStorage.readFileIfExists.mockRejectedValue(denied);

      await expect(
        service.buildCoverLetterInput(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).rejects.toBe(denied);
    });

    it('propagates a non-ENOENT read error on an artifact that is otherwise optional or has a fallback', async () => {
      const denied = Object.assign(new Error('EIO'), { code: 'EIO' });
      serveFiles();
      const readIfExists =
        artifactStorage.readFileIfExists.getMockImplementation();
      artifactStorage.readFileIfExists.mockImplementation((p: string) =>
        p.endsWith('01_vacancy_analysis.json')
          ? Promise.reject(denied)
          : (readIfExists as (p: string) => Promise<string | null>)(p),
      );

      await expect(
        service.buildCoverLetterInput(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).rejects.toBe(denied);
    });

    it('throws BadRequestException when 00_vacancy_source.txt is missing', async () => {
      artifactStorage.readFileIfExists.mockResolvedValue(null);

      await expect(
        service.buildCoverLetterInput(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when 02_targeted_cv_content.json is missing', async () => {
      serveFiles({ '02_targeted_cv_content.json': null });

      await expect(
        service.buildCoverLetterInput(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('falls back to placeholder when vacancy analysis is missing', async () => {
      serveFiles();

      const result = await service.buildCoverLetterInput(
        makeWorkspace('cv_pdf_generated'),
        'template',
      );

      expect(result.inputContext).toContain(
        '[No vacancy analysis artifact available]',
      );
    });

    it('sourceSnapshot references vacancy source, CV content and knowledge sources', async () => {
      serveFiles();

      const result = await service.buildCoverLetterInput(
        makeWorkspace('cv_pdf_generated'),
        'template',
      );

      const snapshot = JSON.parse(result.sourceSnapshot);
      expect(snapshot.vacancySourcePath).toContain('00_vacancy_source.txt');
      expect(snapshot.cvContentPath).toContain('02_targeted_cv_content.json');
      expect(snapshot.knowledgeSources).toHaveLength(1);
      expect(snapshot.knowledgeSources[0].contentHash).toBe('hash-ks-1');
    });

    it('labels source by basename', async () => {
      serveFiles();
      knowledgeSourceContentMock.loadContent.mockResolvedValue([
        {
          id: 'ks-1',
          sourceType: 'profile_summary',
          filePath: '/home/os-user/knowledge/nested/Master_Profile_Summary.md',
          versionLabel: 'v1',
          contentAvailable: true,
          content: 'Profile text',
        },
      ]);

      const result = await service.buildCoverLetterInput(
        makeWorkspace('cv_pdf_generated'),
        'template',
      );

      expect(result.inputContext).toContain(
        '[Source: profile_summary | Master_Profile_Summary.md]',
      );
      expect(result.inputContext).not.toContain(
        '/home/os-user/knowledge/nested/Master_Profile_Summary.md',
      );
    });

    it('renders a labeled stub for a contentAvailable: false knowledge source entry', async () => {
      serveFiles();
      knowledgeSourceContentMock.loadContent.mockResolvedValue([
        {
          id: 'ks-1',
          sourceType: 'profile_summary',
          filePath: '/knowledge-sources/Master_Profile_Summary.md',
          versionLabel: 'v1',
          contentAvailable: false,
          unavailableReason: 'Binary/unsupported source type',
        },
      ]);

      const result = await service.buildCoverLetterInput(
        makeWorkspace('cv_pdf_generated'),
        'template',
      );

      expect(result.inputContext).toContain(
        '[Content unavailable: Binary/unsupported source type]',
      );
      expect(result.inputContext).not.toContain('content not loaded in MVP');
    });

    it('propagates a hash-mismatch rejection from loadContent out of buildCoverLetterInput', async () => {
      serveFiles();
      const hashMismatchError = new BadRequestException(
        'Knowledge source content hash mismatch',
      );
      knowledgeSourceContentMock.loadContent.mockRejectedValue(
        hashMismatchError,
      );

      await expect(
        service.buildCoverLetterInput(
          makeWorkspace('cv_pdf_generated'),
          'template',
        ),
      ).rejects.toThrow(hashMismatchError);
    });

    it('includes a MANUAL NOTE block with the full note text when manualNotes is set', async () => {
      serveFiles();

      const result = await service.buildCoverLetterInput(
        {
          ...makeWorkspace('cv_pdf_generated'),
          manualNotes: [
            { id: 'note-1', text: 'Recruiter said team uses Kotlin too.' },
          ],
        },
        'template',
      );

      expect(result.inputContext).toContain('=== MANUAL NOTE ===');
      expect(result.inputContext).toContain(
        'Recruiter said team uses Kotlin too.',
      );
    });

    it("omits the MANUAL NOTE block and matches today's output when manualNotes is absent", async () => {
      serveFiles();

      const withoutNote = await service.buildCoverLetterInput(
        makeWorkspace('cv_pdf_generated'),
        'template',
      );
      const withEmptyNotes = await service.buildCoverLetterInput(
        { ...makeWorkspace('cv_pdf_generated'), manualNotes: [] },
        'template',
      );

      expect(withoutNote.inputContext).not.toContain('MANUAL NOTE');
      expect(withEmptyNotes.inputContext).toBe(withoutNote.inputContext);
    });

    describe('exported CV', () => {
      const build = () =>
        service.buildCoverLetterInput(
          makeWorkspace('cv_pdf_generated'),
          'template',
        );

      it('builds the cover letter context from the exported CV with pre-PDF check corrections', async () => {
        const corrected = 'Backend developer focused on reliable APIs.';
        serveFiles({
          '03_pre_pdf_check.json': makePrePdfCheck(
            'summary[0]',
            FAKE_PROMPT2_JSON.cv_content.summary[0],
            corrected,
          ),
        });

        const result = await build();

        const exported = exportedCvOf(result.inputContext);
        expect(exported.summary[0]).toBe(corrected);
        expect(result.inputContext).not.toContain(
          FAKE_PROMPT2_JSON.cv_content.summary[0],
        );
        expect(exported.headline).toBe(FAKE_PROMPT2_JSON.cv_content.headline);
        const readNames = artifactStorage.readFile.mock.calls.map((args) =>
          path.basename(args[0]),
        );
        expect(readNames).toEqual([
          '02_targeted_cv_content.json',
          '03_pre_pdf_check.json',
        ]);
        const snapshot = JSON.parse(result.sourceSnapshot);
        expect(snapshot.prePdfCheckPath).toContain('03_pre_pdf_check.json');
      });

      it('adds credential metadata from a registry-snapshot/v2 to the exported CV', async () => {
        serveFiles();

        const result = await build();

        expect(exportedCvOf(result.inputContext).certifications).toEqual([
          {
            name: CREDENTIAL,
            issuer: CREDENTIAL_ISSUER,
            kind: 'skill badge',
            date: '2025',
          },
        ]);
      });

      it('lists each credential once in the exported CV', async () => {
        serveFiles({
          '02_targeted_cv_content.json': JSON.stringify(
            makeDraft((draft) => {
              draft.cv_content.certifications = [
                { title: CREDENTIAL, include: true, reason: 'first' },
                { title: SECOND_CREDENTIAL, include: true, reason: 'first' },
                {
                  title: CREDENTIAL.toLowerCase(),
                  include: true,
                  reason: 'second',
                },
                { title: SECOND_CREDENTIAL, include: true, reason: 'second' },
              ];
            }),
          ),
        });

        const result = await build();

        expect(exportedCvOf(result.inputContext).certifications).toEqual([
          {
            name: CREDENTIAL,
            issuer: CREDENTIAL_ISSUER,
            kind: 'skill badge',
            date: '2025',
          },
          { name: SECOND_CREDENTIAL, issuer: CREDENTIAL_ISSUER, date: '2024' },
        ]);
      });

      it('leaves a draft without repeated credentials unchanged', async () => {
        const draft = makeDraft((edited) => {
          edited.cv_content.certifications = [
            { title: SECOND_CREDENTIAL, include: true, reason: 'relevant' },
            { title: 'Sample Unrelated Course', include: false, reason: 'no' },
            { title: CREDENTIAL, include: true, reason: 'relevant' },
          ];
        });
        serveFiles({ '02_targeted_cv_content.json': JSON.stringify(draft) });

        const result = await build();

        // The mapped draft with only credential metadata applied, as the export prints it.
        const expected = applyCredentialMetadata(
          mapPrompt2OutputToCvContent(draft, CANDIDATE_PROFILE_CONFIG),
          parseRegistrySnapshot(draft.overclaiming_check.registry_snapshot),
        );
        const exported = exportedCvOf(result.inputContext);
        expect(exported.headline).toBe(expected.headline);
        expect(exported.summary).toEqual(expected.summary);
        expect(exported.certifications).toEqual(
          expected.certifications.map((certification) => ({
            name: certification.name,
            issuer: certification.issuer,
            kind: certification.kind,
            date: certification.date,
          })),
        );
        expect(exported.certifications.map((item) => item.name)).toEqual([
          SECOND_CREDENTIAL,
          CREDENTIAL,
        ]);
        // Every printed section, not only the certifications, equals the mapped draft.
        const bullets = (items: { text: string }[]) =>
          items.map((bullet) => bullet.text);
        const block = expected.current_work_block;
        const projection = {
          headline: expected.headline,
          summary: expected.summary,
          top_skills: expected.top_skills,
          current_work_block: block.include
            ? {
                safe_label: block.safe_label,
                role_line: block.role_line,
                dates: block.dates,
                location: block.location,
                stable_intro: block.stable_intro,
                bullets: bullets(block.bullets),
                tech_stack: block.tech_stack,
              }
            : null,
          experience: expected.experience.map((item) => ({
            company: item.company,
            role: item.role,
            dates: item.dates,
            context: item.context,
            experience_type: item.experience_type,
            bullets: bullets(item.bullets),
            tech_stack: item.tech_stack,
          })),
          selected_projects: expected.selected_projects
            .filter((project) => project.include)
            .map((project) => ({
              title: project.title,
              safe_label: project.safe_label,
              bullets: bullets(project.bullets),
              tech_stack: project.tech_stack,
            })),
          education: expected.education,
          certifications: expected.certifications.map((certification) => ({
            name: certification.name,
            issuer: certification.issuer,
            kind: certification.kind,
            date: certification.date,
          })),
          languages: expected.languages,
          volunteering: expected.volunteering,
        };
        expect(exported).toEqual(JSON.parse(JSON.stringify(projection)));
      });

      it('leaves projects with include false out of the exported CV', async () => {
        serveFiles();

        const result = await build();

        expect(
          exportedCvOf(result.inputContext).selected_projects.map(
            (project) => project.title,
          ),
        ).toEqual([VISIBLE_PROJECT]);
        // Scoped to the exported CV: the draft notes are context and may name any project.
        expect(JSON.stringify(exportedCvOf(result.inputContext))).not.toContain(
          HIDDEN_PROJECT,
        );
      });

      it('keeps the registry snapshot and overclaiming check out of the cover letter context', async () => {
        serveFiles();

        const result = await build();

        expect(result.inputContext).not.toContain('registry_snapshot');
        expect(result.inputContext).not.toContain('registry-snapshot/v2');
        expect(result.inputContext).not.toContain('overclaiming_check');
        expect(result.inputContext).not.toContain(
          'Synthetic overclaiming warning.',
        );
        expect(result.inputContext).toContain(DRAFT_NOTES_HEADER);
        expect(result.inputContext).toContain('"requirement_coverage"');
        expect(result.inputContext).toContain('"evidence_table"');
        expect(result.inputContext).toContain(
          FAKE_PROMPT2_JSON.requirement_coverage[1].requirement,
        );
      });

      it('builds the exported CV without credential metadata when the draft has no registry snapshot', async () => {
        serveFiles({
          '02_targeted_cv_content.json': JSON.stringify(
            makeDraft((draft) => {
              delete draft.overclaiming_check.registry_snapshot;
              delete draft.overclaiming_check.registry_violations;
            }),
          ),
        });

        const result = await build();

        expect(exportedCvOf(result.inputContext).certifications).toEqual([
          { name: CREDENTIAL },
        ]);
      });

      it('throws BadRequestException when the CV draft is invalid', async () => {
        serveFiles({
          '02_targeted_cv_content.json': '{"headline":"Backend Engineer"}',
        });

        await expect(build()).rejects.toThrow(BadRequestException);
        expect(knowledgeSourceContentMock.loadContent).not.toHaveBeenCalled();
      });

      it('throws BadRequestException when the pre-PDF check is invalid', async () => {
        serveFiles({ '03_pre_pdf_check.json': '{ not json' });

        await expect(build()).rejects.toThrow(BadRequestException);
        expect(knowledgeSourceContentMock.loadContent).not.toHaveBeenCalled();
      });
    });
  });
});

// ADR-046 item 1 and its amendment of 2026-11-26: the template and the complete input context of
// a legacy workspace, recorded on the unchanged post-#709 code with the real active template and
// sources. A change of either fingerprint is a change of the legacy cover-letter input.
const LEGACY_COVER_LETTER_INPUT = {
  templateVersion: 6,
  template: {
    sha256: 'a000318d656e90da94eff7d6b2628189db551a60eacf363ff718e5bab5e2d022',
    length: 16665,
  },
  inputContext: {
    sha256: '19123ee8bc56fe129b7b9ad31db6156e7fef4a9ac39ad1117b1c54ab1dbb2e0d',
    length: 404345,
  },
};

// An experimental workspace holds 01a–01c next to the legacy-shaped 01 and 02 (ADR-046 item 15).
const EXPERIMENTAL_ARTIFACTS = {
  ...LEGACY_ARTIFACTS,
  '01a_vacancy_requirements.json': '{"marker":"experimental-01a-content"}',
  '01b_fit_assessment.json': '{"marker":"experimental-01b-content"}',
  '01c_analysis_decision.json': '{"marker":"experimental-01c-content"}',
};
const EXPERIMENTAL_MARKERS = [
  'experimental-01a',
  'experimental-01b',
  'experimental-01c',
];

describe('CoverLetterInputBuilderService — legacy invariance', () => {
  it('ignores experimental analysis artifacts', async () => {
    const template = activeTemplate('cover_letter');
    const knowledgeSources = {
      findActive: jest.fn().mockResolvedValue(activeKnowledgeSourceRows()),
    } as unknown as KnowledgeSourcesService;
    const buildWith = (files: Readonly<Record<string, string>>) =>
      new CoverLetterInputBuilderService(
        createWorkspaceStorage(files) as unknown as ArtifactStorageService,
        knowledgeSources,
        new KnowledgeSourceSelectionService(),
        createKnowledgeSourceContentService(),
      ).buildCoverLetterInput(
        {
          ...LEGACY_WORKSPACE,
          status: 'cv_pdf_generated',
          manualNotes: LEGACY_MANUAL_NOTES,
        },
        template.content,
      );

    const experimental = await buildWith(EXPERIMENTAL_ARTIFACTS);
    const legacy = await buildWith(LEGACY_ARTIFACTS);

    for (const text of EXPERIMENTAL_MARKERS) {
      expect(experimental.inputContext).not.toContain(text);
    }
    expect(experimental.inputContext).toBe(legacy.inputContext);
  });

  it('keeps the legacy cover-letter input byte-identical', async () => {
    const template = activeTemplate('cover_letter');
    const knowledgeSources = {
      findActive: jest.fn().mockResolvedValue(activeKnowledgeSourceRows()),
    } as unknown as KnowledgeSourcesService;
    const builder = new CoverLetterInputBuilderService(
      createWorkspaceStorage(
        LEGACY_ARTIFACTS,
      ) as unknown as ArtifactStorageService,
      knowledgeSources,
      new KnowledgeSourceSelectionService(),
      createKnowledgeSourceContentService(),
    );

    const result = await builder.buildCoverLetterInput(
      {
        ...LEGACY_WORKSPACE,
        status: 'cv_pdf_generated',
        manualNotes: LEGACY_MANUAL_NOTES,
      },
      template.content,
    );

    // The fixture draft lists one credential under its title and its alias: the effective
    // content the letter reads holds it once (the #709 deduplication).
    const exported = exportedCvOf(result.inputContext);
    expect(exported.certifications).toHaveLength(1);
    expect(result.promptText).toBe(template.content);
    expect(
      fingerprintModelInput(
        template.version,
        result.promptText,
        result.inputContext,
      ),
    ).toEqual(LEGACY_COVER_LETTER_INPUT);
  });
});
