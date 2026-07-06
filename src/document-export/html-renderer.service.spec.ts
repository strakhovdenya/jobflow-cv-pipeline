import { NotFoundException } from '@nestjs/common';
import { HtmlRendererService } from './html-renderer.service';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { CANDIDATE_PROFILE_CONFIG } from './candidate-profile.config';

const WORKSPACE_ID = 'ws-html-1';

function makeWorkspaceRecord() {
  return {
    id: WORKSPACE_ID,
    storageRoot: '/storage',
    workspacePath: '2026_01_01_FakeCompany_Backend',
  };
}

function makePrompt2Json(): string {
  return JSON.stringify({
    schema_version: '1.0',
    step: 'prompt_2',
    workspace_id: WORKSPACE_ID,
    decision_context: {
      prompt_1_decision: 'apply',
      user_approval: true,
      override: false,
    },
    target_strategy: {
      positioning: 'Backend specialist',
      main_angle: 'Node.js/TypeScript depth',
      risk_mitigation: [],
    },
    cv_content: {
      headline: 'Backend Developer | Node.js | TypeScript',
      summary: ['Experienced backend developer.'],
      top_skills: ['Node.js', 'TypeScript'],
      current_work_block: {
        include: true,
        safe_label: 'Current Independent Work',
        role_line: 'Freelance Software Development',
        dates: 'May 2025 - Present',
        stable_intro: 'Continued development after relocating.',
        bullets: [],
        tech_stack: [],
      },
      experience: [
        {
          company: 'EPAM Systems',
          role: 'Backend-focused Fullstack Developer',
          dates: 'Nov 2021 - May 2025',
          experience_type: 'commercial',
          can_split_across_pages: true,
          bullets: [{ text: 'Original bullet text.', priority: 'high' }],
          tech_stack: ['Node.js'],
        },
      ],
      selected_projects: [],
      certifications: [],
      rendering_hints: {
        density: 'normal',
        target_pages: 2,
        max_pages: 3,
        strong_match_allows_page_3: false,
        optional_sections_to_hide_first: [],
      },
    },
    evidence_table: [],
    overclaiming_check: {
      critical_issues: [],
      warnings: [],
      needs_evidence: [],
    },
    pdf_readiness_notes: {
      estimated_page_count: 2,
      layout_risks: [],
      recommended_next_step: 'proceed',
    },
  });
}

function makePrePdfCheckJson(): string {
  return JSON.stringify({
    schema_version: '1.0',
    workspace_id: WORKSPACE_ID,
    corrections: [
      {
        field_path: 'experience[0].bullets[0].text',
        suggested_text: 'Corrected bullet text.',
        severity: 'critical',
        reason: 'Overclaiming risk.',
      },
    ],
    export_blocked: false,
    overall_notes: 'Looks fine after correction.',
  });
}

function enoent(): NodeJS.ErrnoException {
  const error = new Error('ENOENT') as NodeJS.ErrnoException;
  error.code = 'ENOENT';
  return error;
}

describe('HtmlRendererService', () => {
  let service: HtmlRendererService;
  let prismaMock: { applicationWorkspace: { findUnique: jest.Mock } };
  let artifactStorageMock: jest.Mocked<ArtifactStorageService>;
  let artifactsMock: jest.Mocked<ArtifactsService>;

  beforeEach(() => {
    prismaMock = {
      applicationWorkspace: {
        findUnique: jest.fn(),
      },
    };

    artifactStorageMock = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
    } as unknown as jest.Mocked<ArtifactStorageService>;

    artifactsMock = {
      register: jest.fn(),
    } as unknown as jest.Mocked<ArtifactsService>;

    service = new HtmlRendererService(
      prismaMock as unknown as PrismaService,
      artifactStorageMock,
      artifactsMock,
    );
  });

  it('throws NotFoundException when workspace does not exist', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(null);

    await expect(service.renderToHtml(WORKSPACE_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('renders HTML with candidate, headline and experience sections when no corrections exist', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord() as never,
    );
    artifactStorageMock.readFile
      .mockResolvedValueOnce(makePrompt2Json())
      .mockRejectedValueOnce(enoent());
    artifactStorageMock.writeFile.mockResolvedValue({
      filePath: '/storage/ws/04_cv_export.html',
      hash: 'hash123',
    });

    const html = await service.renderToHtml(WORKSPACE_ID);

    expect(html).toContain(CANDIDATE_PROFILE_CONFIG.candidate.name);
    expect(html).toContain('Backend Developer | Node.js | TypeScript');
    expect(html).toContain('EPAM Systems');
    expect(html).toContain('Original bullet text.');
    expect(html).not.toContain('Corrected bullet text.');
  });

  it('applies Prompt 3 corrections when 03_pre_pdf_check.json is present', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord() as never,
    );
    artifactStorageMock.readFile
      .mockResolvedValueOnce(makePrompt2Json())
      .mockResolvedValueOnce(makePrePdfCheckJson());
    artifactStorageMock.writeFile.mockResolvedValue({
      filePath: '/storage/ws/04_cv_export.html',
      hash: 'hash123',
    });

    const html = await service.renderToHtml(WORKSPACE_ID);

    expect(html).toContain('Corrected bullet text.');
    expect(html).not.toContain('Original bullet text.');
  });

  it('registers GeneratedArtifact with the canonical HTML file name and export-service origin', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord() as never,
    );
    artifactStorageMock.readFile
      .mockResolvedValueOnce(makePrompt2Json())
      .mockRejectedValueOnce(enoent());
    artifactStorageMock.writeFile.mockResolvedValue({
      filePath: '/storage/ws/04_cv_export.html',
      hash: 'hash123',
    });

    await service.renderToHtml(WORKSPACE_ID);

    expect(artifactsMock.register).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        canonicalFileName: '04_cv_export.html',
        origin: 'generated_by_export_service',
        mimeType: 'text/html',
        filePath: '/storage/ws/04_cv_export.html',
        contentHash: 'hash123',
      }),
    );
  });

  it('never depends on or calls an AI provider (deterministic export, no AI collaborator injected)', async () => {
    // HtmlRendererService's constructor only accepts PrismaService, ArtifactStorageService
    // and ArtifactsService — there is no AI_PROVIDER dependency to call in the first place.
    expect(HtmlRendererService.length).toBe(3);

    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord() as never,
    );
    artifactStorageMock.readFile
      .mockResolvedValueOnce(makePrompt2Json())
      .mockRejectedValueOnce(enoent());
    artifactStorageMock.writeFile.mockResolvedValue({
      filePath: '/storage/ws/04_cv_export.html',
      hash: 'hash123',
    });

    await service.renderToHtml(WORKSPACE_ID);
  });

  it('rethrows non-ENOENT errors when reading 03_pre_pdf_check.json', async () => {
    prismaMock.applicationWorkspace.findUnique.mockResolvedValue(
      makeWorkspaceRecord() as never,
    );
    const permissionError = new Error('EACCES');
    artifactStorageMock.readFile
      .mockResolvedValueOnce(makePrompt2Json())
      .mockRejectedValueOnce(permissionError);

    await expect(service.renderToHtml(WORKSPACE_ID)).rejects.toBe(
      permissionError,
    );
  });
});
