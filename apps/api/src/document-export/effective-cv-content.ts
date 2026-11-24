// Builds the CV content an export actually renders: the Prompt 2 draft
// (02_targeted_cv_content.json) mapped to the renderer contract, with the Prompt 3 corrections
// from 03_pre_pdf_check.json applied. The export gate checks exactly this object and both
// renderers render it, so no correction can reach a PDF unchecked (INV-14).
import * as path from 'path';
import { isEnoentError } from '../artifacts/fs-errors';
import { CvContent } from '../pipeline/schemas/cv-content.schema';
import {
  PrePdfCheckCorrection,
  validatePrePdfCheckJson,
} from '../pipeline/schemas/pre-pdf-check.schema';
import {
  TargetedCvContentOutput,
  validateTargetedCvContentJson,
} from '../pipeline/schemas/targeted-cv-content.schema';
import { CANDIDATE_PROFILE_CONFIG } from './candidate-profile.config';
import { applyCorrectionsToCvContent } from './cv-template-renderer';
import { mapPrompt2OutputToCvContent } from './prompt2-to-cv-content.mapper';

export const CV_CONTENT_JSON_FILE = '02_targeted_cv_content.json';
export const PRE_PDF_CHECK_JSON_FILE = '03_pre_pdf_check.json';

export interface ArtifactTextReader {
  readFile(absolutePath: string): Promise<string>;
}

export interface EffectiveCvContent {
  // The validated Prompt 2 draft as stored, before corrections.
  draft: TargetedCvContentOutput;
  // The renderer input: the mapped draft with every applicable Prompt 3 correction applied.
  content: CvContent;
}

// A workspace artifact the effective content is built from is missing (the draft) or invalid.
export class EffectiveCvContentError extends Error {
  constructor(
    readonly fileName: string,
    readonly reason: string,
  ) {
    super(`Invalid ${fileName}: ${reason}`);
    this.name = 'EffectiveCvContentError';
  }
}

async function readDraft(
  reader: ArtifactTextReader,
  workspaceAbsPath: string,
): Promise<TargetedCvContentOutput> {
  let raw: string;
  try {
    raw = await reader.readFile(
      path.join(workspaceAbsPath, CV_CONTENT_JSON_FILE),
    );
  } catch (error) {
    if (isEnoentError(error)) {
      throw new EffectiveCvContentError(
        CV_CONTENT_JSON_FILE,
        'the CV draft file does not exist',
      );
    }
    throw error;
  }
  const validation = validateTargetedCvContentJson(raw);
  if (!validation.success || !validation.data) {
    throw new EffectiveCvContentError(
      CV_CONTENT_JSON_FILE,
      validation.error ?? 'unknown validation error',
    );
  }
  return validation.data;
}

// No pre-PDF check (never run, skipped, or invalidated by a regenerate) means no corrections.
async function readCorrections(
  reader: ArtifactTextReader,
  workspaceAbsPath: string,
): Promise<PrePdfCheckCorrection[]> {
  let raw: string;
  try {
    raw = await reader.readFile(
      path.join(workspaceAbsPath, PRE_PDF_CHECK_JSON_FILE),
    );
  } catch (error) {
    if (isEnoentError(error)) return [];
    throw error;
  }
  const validation = validatePrePdfCheckJson(raw);
  if (!validation.success || !validation.data) {
    throw new EffectiveCvContentError(
      PRE_PDF_CHECK_JSON_FILE,
      validation.error ?? 'unknown validation error',
    );
  }
  return validation.data.corrections;
}

export async function buildEffectiveCvContent(
  reader: ArtifactTextReader,
  workspaceAbsPath: string,
): Promise<EffectiveCvContent> {
  const draft = await readDraft(reader, workspaceAbsPath);
  const corrections = await readCorrections(reader, workspaceAbsPath);
  const mapped = mapPrompt2OutputToCvContent(draft, CANDIDATE_PROFILE_CONFIG);
  const content =
    corrections.length > 0
      ? applyCorrectionsToCvContent(mapped, corrections)
      : mapped;
  return { draft, content };
}
