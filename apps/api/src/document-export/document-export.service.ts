import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceStatus } from '@prisma/client';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ArtifactStorageService } from '../artifacts/artifact-storage.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import {
  RegistrySnapshot,
  findRegistryViolations,
  formatRegistryViolation,
  parseRegistrySnapshot,
  registryInputFromCvContent,
} from '../evidence/registry-compliance';
import { PrismaService } from '../prisma/prisma.service';
import { StepFailureService } from '../workspaces/step-failure.service';
import { WorkspaceStatusService } from '../workspaces/workspace-status.service';
import { AtsHtmlRendererService } from './ats-html-renderer.service';
import { CandidateProfileGuardService } from './candidate-profile-guard.service';
import { CANDIDATE_PROFILE_CONFIG } from './candidate-profile.config';
import { applyCredentialMetadata } from './credential-metadata';
import { buildCvDownloadFileName } from './cv-download-filename';
import {
  EffectiveCvContent,
  EffectiveCvContentError,
  buildEffectiveCvContent,
} from './effective-cv-content';
import { HtmlRendererService } from './html-renderer.service';
import { PdfExportService } from './pdf-export.service';

const CV_EXPORT_HTML_FILE = '04_cv_export.html';
const CV_EXPORT_PDF_FILE = '04_cv_export.pdf';
const CV_EXPORT_ATS_HTML_FILE = '04_cv_export_ats.html';
const CV_EXPORT_ATS_PDF_FILE = '04_cv_export_ats.pdf';
const REGENERATE_ACTION =
  'Regenerate the CV draft, then re-run or skip the pre-PDF check; if the registry itself is wrong, register a new knowledge source version.';

// Deliberately not an HttpException: an ATS render failure is a real export failure, so the
// workspace must still be rolled back to paused_before_export. The original error stays reachable through `cause`.
class AtsExportError extends Error {
  constructor(
    message: string,
    readonly cause: unknown,
  ) {
    super(message);
    this.name = 'AtsExportError';
  }
}

export class ExportCvResult {
  @ApiProperty()
  workspaceId: string;

  @ApiProperty({ enum: WorkspaceStatus })
  status: WorkspaceStatus;

  @ApiProperty()
  htmlPath: string;

  @ApiProperty()
  pdfPath: string;

  @ApiProperty({
    description:
      'Absolute path to the ATS-optimized CV PDF (04_cv_export_ats.pdf)',
  })
  atsPdfPath: string;
}

@Injectable()
export class DocumentExportService {
  private readonly logger = new Logger(DocumentExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly htmlRenderer: HtmlRendererService,
    private readonly pdfExport: PdfExportService,
    private readonly artifactsService: ArtifactsService,
    private readonly candidateProfileGuard: CandidateProfileGuardService,
    private readonly atsHtmlRenderer: AtsHtmlRendererService,
    private readonly workspaceStatus: WorkspaceStatusService,
    private readonly stepFailure: StepFailureService,
    private readonly artifactStorage: ArtifactStorageService,
  ) {}

  async exportCv(workspaceId: string): Promise<ExportCvResult> {
    const workspace = await this.prisma.applicationWorkspace.findUnique({
      where: { id: workspaceId },
      include: { company: true, jobVacancy: true },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace "${workspaceId}" not found`);
    }

    const EXPORT_ALLOWED_STATUSES: WorkspaceStatus[] = [
      WorkspaceStatus.export_running,
      WorkspaceStatus.paused_before_export,
    ];

    if (!EXPORT_ALLOWED_STATUSES.includes(workspace.status)) {
      throw new BadRequestException(
        `Workspace is in status "${workspace.status}" — export requires status "export_running" or "paused_before_export"`,
      );
    }

    const profileGuardResult = this.candidateProfileGuard.check(
      CANDIDATE_PROFILE_CONFIG,
    );
    if (!profileGuardResult.passed) {
      throw new BadRequestException(
        `Export blocked: candidate-profile.config.ts contains placeholder data — ${profileGuardResult.issues.join('; ')}`,
      );
    }

    const workspaceAbsPath = path.resolve(
      workspace.storageRoot,
      workspace.workspacePath,
    );
    const effective = await this.passRegistryGate(
      workspaceId,
      workspace.status,
      workspaceAbsPath,
    );

    // Claim the export atomically so a second concurrent request is rejected with 409 instead
    // of rendering the PDFs twice. export_running is already the in-flight status (legacy entry
    // point per ADR-026), so a workspace that is already there needs no claim.
    if (workspace.status === WorkspaceStatus.paused_before_export) {
      await this.workspaceStatus.transition(
        workspaceId,
        WorkspaceStatus.paused_before_export,
        WorkspaceStatus.export_running,
      );
    }

    const htmlPath = path.join(workspaceAbsPath, CV_EXPORT_HTML_FILE);
    const pdfPath = path.join(workspaceAbsPath, CV_EXPORT_PDF_FILE);

    try {
      await this.stepFailure.clear(workspaceId, 'export');
      await this.htmlRenderer.renderToHtml(workspaceId, effective);
      await this.pdfExport.htmlFileToPdf(htmlPath, pdfPath);

      const pdfBuffer = await fs.readFile(pdfPath);
      const contentHash = createHash('sha256').update(pdfBuffer).digest('hex');

      await this.artifactsService.register({
        workspaceId,
        artifactType: 'cv_export_pdf',
        canonicalFileName: CV_EXPORT_PDF_FILE,
        filePath: pdfPath,
        storageRoot: workspace.storageRoot,
        contentHash,
        origin: 'generated_by_export_service',
        mimeType: 'application/pdf',
        fileSizeBytes: pdfBuffer.byteLength,
        downloadFileName: buildCvDownloadFileName(
          workspace.company.companySlug,
          workspace.jobVacancy.roleSlug,
          { variant: 'design', extension: 'pdf' },
        ),
      });

      const atsHtmlPath = path.join(workspaceAbsPath, CV_EXPORT_ATS_HTML_FILE);
      const atsPdfPath = path.join(workspaceAbsPath, CV_EXPORT_ATS_PDF_FILE);
      try {
        await this.atsHtmlRenderer.renderToAtsHtml(workspaceId, effective);
        await this.pdfExport.htmlFileToPdf(atsHtmlPath, atsPdfPath);
        const atsPdfBuffer = await fs.readFile(atsPdfPath);
        const atsContentHash = createHash('sha256')
          .update(atsPdfBuffer)
          .digest('hex');
        await this.artifactsService.register({
          workspaceId,
          artifactType: 'cv_export_ats_pdf',
          canonicalFileName: CV_EXPORT_ATS_PDF_FILE,
          filePath: atsPdfPath,
          storageRoot: workspace.storageRoot,
          contentHash: atsContentHash,
          origin: 'generated_by_export_service',
          mimeType: 'application/pdf',
          fileSizeBytes: atsPdfBuffer.byteLength,
          downloadFileName: buildCvDownloadFileName(
            workspace.company.companySlug,
            workspace.jobVacancy.roleSlug,
            { variant: 'ats', extension: 'pdf' },
          ),
        });
      } catch (atsError) {
        const originalMessage =
          atsError instanceof Error ? atsError.message : String(atsError);
        throw new AtsExportError(
          `Design CV export succeeded (04_cv_export.pdf registered), but ATS CV export failed: ${originalMessage}`,
          atsError,
        );
      }

      const updated = await this.workspaceStatus.transition(
        workspaceId,
        WorkspaceStatus.export_running,
        WorkspaceStatus.cv_pdf_generated,
      );

      return {
        workspaceId: updated.id,
        status: updated.status,
        htmlPath,
        pdfPath,
        atsPdfPath,
      };
    } catch (error) {
      await this.rollbackExport(workspaceId, error);
      throw error;
    }
  }

  // Runs before the claim and returns the content both renderers get: the effective content
  // checked by the registry gate, then given credential metadata from the same parsed snapshot.
  // A paused_before_export workspace keeps its status. A workspace entering through the legacy
  // export_running status (ADR-026) has no claim to skip, so it is returned to
  // paused_before_export through the existing rollback; otherwise the advised regenerate, which
  // is not allowed from export_running, could never be reached.
  private async passRegistryGate(
    workspaceId: string,
    status: WorkspaceStatus,
    workspaceAbsPath: string,
  ): Promise<EffectiveCvContent> {
    try {
      const effective = await this.readEffectiveContent(workspaceAbsPath);
      const snapshot = this.assertRegistryCompliance(effective);
      return {
        draft: effective.draft,
        content: applyCredentialMetadata(effective.content, snapshot),
      };
    } catch (error) {
      if (status === WorkspaceStatus.export_running) {
        await this.rollbackExport(workspaceId, error);
      }
      throw error;
    }
  }

  // An unreadable draft or pre-PDF check is reported before the claim, like the other gates.
  private async readEffectiveContent(
    workspaceAbsPath: string,
  ): Promise<EffectiveCvContent> {
    try {
      return await buildEffectiveCvContent(
        this.artifactStorage,
        workspaceAbsPath,
      );
    } catch (error) {
      if (error instanceof EffectiveCvContentError) {
        throw new BadRequestException(
          `Export blocked: ${error.message}. ${REGENERATE_ACTION}`,
        );
      }
      throw error;
    }
  }

  // Export gate (ADR-032 pattern, PRD career-evidence-refresh): the corrected content both
  // renderers receive (afterwards given only certification issuer, type label and year) is
  // checked against the registry snapshot the Prompt 2 guard stored in the draft. Knowledge
  // sources are never loaded here, so export stays a function of the workspace.
  private assertRegistryCompliance(
    effective: EffectiveCvContent,
  ): RegistrySnapshot {
    const snapshot = parseRegistrySnapshot(
      effective.draft.overclaiming_check.registry_snapshot,
    );
    if (snapshot === null) {
      throw new BadRequestException(
        'Export blocked: the CV draft has no valid registry snapshot (overclaiming_check.registry_snapshot) — it was generated before the career registry check or the file was altered. Regenerate the CV draft, then re-run or skip the pre-PDF check.',
      );
    }
    const violations = findRegistryViolations(
      registryInputFromCvContent(effective.content),
      snapshot,
    );
    if (violations.length > 0) {
      const listed = violations.map(formatRegistryViolation).join('; ');
      throw new BadRequestException(
        `Export blocked: registry violations in the CV content to be exported (draft with pre-PDF check corrections) — ${listed}. ${REGENERATE_ACTION}`,
      );
    }
    return snapshot;
  }

  // Cleanup must never mask the export error that is being handled.
  private async rollbackExport(
    workspaceId: string,
    error: unknown,
  ): Promise<void> {
    try {
      await this.workspaceStatus.transition(
        workspaceId,
        WorkspaceStatus.export_running,
        WorkspaceStatus.paused_before_export,
      );
      await this.stepFailure.record(workspaceId, 'export', error);
    } catch (cleanupError) {
      this.logger.warn(
        `Could not roll back export of workspace "${workspaceId}": ${
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError)
        }`,
      );
    }
  }
}
