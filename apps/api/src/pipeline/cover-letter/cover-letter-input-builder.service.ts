import { BadRequestException, Injectable } from '@nestjs/common';
import * as path from 'path';
import { ArtifactStorageService } from '../../artifacts/artifact-storage.service';
import { applyCredentialMetadata } from '../../document-export/credential-metadata';
import {
  CV_CONTENT_JSON_FILE,
  EffectiveCvContent,
  EffectiveCvContentError,
  PRE_PDF_CHECK_JSON_FILE,
  buildEffectiveCvContent,
} from '../../document-export/effective-cv-content';
import { parseRegistrySnapshot } from '../../evidence/registry-compliance';
import { buildKnowledgeSourceLabel } from '../../knowledge-sources/knowledge-source-label';
import { KnowledgeSourceContentService } from '../../knowledge-sources/knowledge-source-content.service';
import { KnowledgeSourceSelectionService } from '../../knowledge-sources/knowledge-source-selection.service';
import { KnowledgeSourcesService } from '../../knowledge-sources/knowledge-sources.service';
import {
  ManualNoteContextEntry,
  buildManualNoteBlock,
} from '../prompt-input-builder.service';
import type { CvBullet, CvContent } from '../schemas/cv-content.schema';

const COVER_LETTER_ALLOWED_STATUSES = ['cv_pdf_generated', 'final_check_ready'];

type ExportedCv = ReturnType<typeof toExportedCv>;

const bulletTexts = (bullets: CvBullet[]): string[] =>
  bullets.map((bullet) => bullet.text);

// The sections the exported PDF shows, as both renderers render them: excluded projects are
// left out, and the static candidate profile, links and layout hints are not claims.
function toExportedCv(content: CvContent) {
  const block = content.current_work_block;
  return {
    headline: content.headline,
    summary: content.summary,
    top_skills: content.top_skills,
    current_work_block: block.include
      ? {
          safe_label: block.safe_label,
          role_line: block.role_line,
          dates: block.dates,
          location: block.location,
          stable_intro: block.stable_intro,
          bullets: bulletTexts(block.bullets),
          tech_stack: block.tech_stack,
        }
      : null,
    experience: content.experience.map((item) => ({
      company: item.company,
      role: item.role,
      dates: item.dates,
      context: item.context,
      experience_type: item.experience_type,
      bullets: bulletTexts(item.bullets),
      tech_stack: item.tech_stack,
    })),
    selected_projects: content.selected_projects
      .filter((project) => project.include)
      .map((project) => ({
        title: project.title,
        safe_label: project.safe_label,
        bullets: bulletTexts(project.bullets),
        tech_stack: project.tech_stack,
      })),
    education: content.education,
    certifications: content.certifications.map((certification) => ({
      name: certification.name,
      issuer: certification.issuer,
      kind: certification.kind,
      date: certification.date,
    })),
    languages: content.languages,
    volunteering: content.volunteering,
  };
}

// The exported CV is rebuilt from the workspace artifacts the export rendered (02 + 03); they no
// longer change once the workspace has left paused_before_export, and the PDF is never parsed.
function buildExportedCv(effective: EffectiveCvContent): ExportedCv {
  const snapshot = parseRegistrySnapshot(
    effective.draft.overclaiming_check.registry_snapshot,
  );
  return toExportedCv(applyCredentialMetadata(effective.content, snapshot));
}

export interface CoverLetterWorkspaceContext {
  id: string;
  status: string;
  companyNameOriginal: string;
  roleTitleOriginal: string;
  workspacePath: string;
  storageRoot: string;
  manualNotes?: ManualNoteContextEntry[];
}

export interface CoverLetterInputResult {
  promptText: string;
  inputContext: string;
  sourceSnapshot: string;
}

@Injectable()
export class CoverLetterInputBuilderService {
  constructor(
    private readonly artifactStorage: ArtifactStorageService,
    private readonly knowledgeSourcesService: KnowledgeSourcesService,
    private readonly selectionService: KnowledgeSourceSelectionService,
    private readonly knowledgeSourceContent: KnowledgeSourceContentService,
  ) {}

  async buildCoverLetterInput(
    workspace: CoverLetterWorkspaceContext,
    templateContent: string,
  ): Promise<CoverLetterInputResult> {
    if (!COVER_LETTER_ALLOWED_STATUSES.includes(workspace.status)) {
      throw new BadRequestException(
        `Cover letter generation can only run when workspace status is cv_pdf_generated or final_check_ready. Current status: ${workspace.status}`,
      );
    }

    const workspaceAbsPath = path.join(
      workspace.storageRoot,
      workspace.workspacePath,
    );

    const vacancySourcePath = path.join(
      workspaceAbsPath,
      '00_vacancy_source.txt',
    );

    const vacancyText =
      await this.artifactStorage.readFileIfExists(vacancySourcePath);
    if (vacancyText === null) {
      throw new BadRequestException(
        'Vacancy source artifact not found (00_vacancy_source.txt).',
      );
    }

    const cvContentPath = path.join(workspaceAbsPath, CV_CONTENT_JSON_FILE);
    const prePdfCheckPath = path.join(
      workspaceAbsPath,
      PRE_PDF_CHECK_JSON_FILE,
    );
    const effective = await this.readEffectiveContent(workspaceAbsPath);
    const exportedCv = buildExportedCv(effective);
    // Draft notes the letter may use as context only; overclaiming_check (with the registry
    // snapshot) stays out.
    const draftNotes = {
      requirement_coverage: effective.draft.requirement_coverage,
      evidence_table: effective.draft.evidence_table,
    };

    const analysisText = await this.readOptionalArtifact(
      workspaceAbsPath,
      '01_vacancy_analysis.json',
    );

    const activeSources = await this.knowledgeSourcesService.findActive();
    const knowledgeSources = this.selectionService.selectForStep(
      'cover_letter',
      activeSources,
    );

    const knowledgeSourcesBlock =
      knowledgeSources.length > 0
        ? (await this.knowledgeSourceContent.loadContent(knowledgeSources))
            .map((entry) =>
              entry.contentAvailable
                ? `${buildKnowledgeSourceLabel(entry.sourceType, entry.filePath)}\n${entry.content}`
                : `${buildKnowledgeSourceLabel(entry.sourceType, entry.filePath)}\n[Content unavailable: ${entry.unavailableReason}]`,
            )
            .join('\n\n')
        : '[No active knowledge sources available]';

    const manualNoteBlock = buildManualNoteBlock(workspace.manualNotes);

    const inputContext = [
      `=== WORKSPACE METADATA ===`,
      `Company: ${workspace.companyNameOriginal}`,
      `Role: ${workspace.roleTitleOriginal}`,
      ``,
      `=== VACANCY SOURCE (00_vacancy_source.txt) ===`,
      vacancyText,
      ``,
      `=== PROMPT 1 ANALYSIS (context only) ===`,
      analysisText ?? '[No vacancy analysis artifact available]',
      ``,
      `=== EXPORTED CV (02_targeted_cv_content.json with the 03_pre_pdf_check.json corrections, as exported) ===`,
      JSON.stringify(exportedCv, null, 2),
      ``,
      `=== CV DRAFT NOTES (context only: requirement_coverage and evidence_table of 02_targeted_cv_content.json) ===`,
      JSON.stringify(draftNotes, null, 2),
      ``,
      `=== KNOWLEDGE SOURCES ===`,
      knowledgeSourcesBlock,
      ...manualNoteBlock,
    ].join('\n');

    const snapshot = {
      vacancySourcePath,
      cvContentPath,
      prePdfCheckPath,
      knowledgeSources: knowledgeSources.map((ks) => ({
        id: ks.id,
        filePath: ks.filePath,
        sourceType: ks.sourceType,
        contentHash: ks.contentHash,
        versionLabel: ks.versionLabel,
      })),
    };

    return {
      promptText: templateContent,
      inputContext,
      sourceSnapshot: JSON.stringify(snapshot),
    };
  }

  // An invalid draft or pre-PDF check is refused before any AI call.
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
          `Cover letter input unavailable: ${error.message}. Generate and export the CV first.`,
        );
      }
      throw error;
    }
  }

  private async readOptionalArtifact(
    workspaceAbsPath: string,
    fileName: string,
  ): Promise<string | undefined> {
    const filePath = path.join(workspaceAbsPath, fileName);
    return (await this.artifactStorage.readFileIfExists(filePath)) ?? undefined;
  }
}
