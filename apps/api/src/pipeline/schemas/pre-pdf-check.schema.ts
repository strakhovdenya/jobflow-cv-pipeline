// Schema for 03_pre_pdf_check.json — output of Prompt 3 (P1/optional pre-PDF check).
// When this artifact exists, the renderer must apply corrections before generating HTML/PDF.
// The original 02_targeted_cv_content.json is never modified — corrections are overlaid in memory.

import { Logger } from '@nestjs/common';

const logger = new Logger('PrePdfCheckSchema');

// The only fields a correction may target — the "Correctable fields are exactly these" list of
// prompt3_v7.txt, enforced in code because field_path is AI output (ISSUE-492). Anything else
// (candidate.*, links, education, languages, volunteering, rendering_hints, whole arrays, bullet
// objects, control fields, __proto__/constructor/prototype) does not match. Plain groups and
// [0-9] rather than (?:...) and \d: the same source is sent to OpenAI as a strict JSON schema
// `pattern`, which supports only a subset of regex syntax.
const INDEX = '\\[[0-9]+\\]';
const TEXT_ITEM = `bullets${INDEX}\\.text|tech_stack${INDEX}`;
export const CORRECTABLE_FIELD_PATH_PATTERN =
  `^(headline|summary${INDEX}|top_skills${INDEX}|certifications${INDEX}` +
  `|current_work_block\\.(safe_label|role_line|dates|location|stable_intro|${TEXT_ITEM})` +
  `|experience${INDEX}\\.(company|role|dates|${TEXT_ITEM})` +
  `|selected_projects${INDEX}\\.(title|safe_label|${TEXT_ITEM}))$`;

const CORRECTABLE_FIELD_PATH_RE = new RegExp(CORRECTABLE_FIELD_PATH_PATTERN);

export function isCorrectableFieldPath(fieldPath: string): boolean {
  return CORRECTABLE_FIELD_PATH_RE.test(fieldPath);
}

// field_path is model output: JSON-quote it (escapes newlines and control characters) before it
// goes into a log line or 03_pre_pdf_check.md. Kept whole, so every skipped path is reported as is.
export function describeFieldPath(fieldPath: string): string {
  return JSON.stringify(fieldPath);
}

export interface PrePdfCheckCorrection {
  // Path of the field being corrected; must satisfy isCorrectableFieldPath(), e.g. "headline",
  // "summary[0]", "current_work_block.stable_intro", "experience[0].bullets[1].text".
  field_path: string;
  original_text?: string;
  suggested_text: string;
  severity: 'critical' | 'warning' | 'suggestion';
  reason: string;
}

export type PrePdfCheckReadiness =
  'ready' | 'ready_with_minor_edits' | 'not_ready';

export interface PrePdfCheckOutput {
  schema_version: string;
  workspace_id: string;
  readiness: PrePdfCheckReadiness;
  corrections: PrePdfCheckCorrection[];
  quality_score: number;
  export_blocked: boolean;
  overall_notes: string;
}

export interface PrePdfCheckValidationResult {
  success: boolean;
  data?: PrePdfCheckOutput;
  error?: string;
  // field_path of every correction dropped because it is outside the correctable grammar.
  rejectedFieldPaths?: string[];
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number';
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validatePrePdfCheckJson(
  raw: string,
): PrePdfCheckValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false, error: 'Output is not valid JSON' };
  }

  if (!isObject(parsed)) {
    return { success: false, error: 'Root value must be an object' };
  }

  const p = parsed;

  if (!isString(p['schema_version'])) {
    return {
      success: false,
      error: 'Missing or invalid field: schema_version',
    };
  }

  if (!isString(p['workspace_id'])) {
    return { success: false, error: 'Missing or invalid field: workspace_id' };
  }

  const READINESS_VALUES = ['ready', 'ready_with_minor_edits', 'not_ready'];
  if (!isString(p['readiness']) || !READINESS_VALUES.includes(p['readiness'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: readiness (must be one of ready, ready_with_minor_edits, not_ready)',
    };
  }

  if (!isArray(p['corrections'])) {
    return {
      success: false,
      error: 'Missing or invalid field: corrections (must be array)',
    };
  }

  const corrections = p['corrections'] as unknown[];
  const keptCorrections: Record<string, unknown>[] = [];
  const rejectedFieldPaths: string[] = [];
  for (let i = 0; i < corrections.length; i++) {
    const c = corrections[i];
    if (!isObject(c)) {
      return { success: false, error: `corrections[${i}] must be an object` };
    }
    if (!isString(c['field_path'])) {
      return {
        success: false,
        error: `corrections[${i}].field_path must be a string`,
      };
    }
    if (!isString(c['suggested_text'])) {
      return {
        success: false,
        error: `corrections[${i}].suggested_text must be a string`,
      };
    }
    if (!isString(c['severity'])) {
      return {
        success: false,
        error: `corrections[${i}].severity must be a string`,
      };
    }
    if (!isString(c['reason'])) {
      return {
        success: false,
        error: `corrections[${i}].reason must be a string`,
      };
    }
    // The model was instructed never to emit a no-op correction (prompt3_v6.txt: "if the field
    // does not actually need to change, leave it out entirely"). When it does anyway, treat it as
    // if the model found nothing to fix for that field, rather than failing the whole response.
    if (
      isString(c['original_text']) &&
      c['original_text'] === c['suggested_text']
    ) {
      continue;
    }
    // A path outside the grammar drops this one correction, not the whole response: the export
    // reads 03_pre_pdf_check.json through this validator too, and a file written before the
    // grammar existed must still export (ISSUE-492).
    if (!isCorrectableFieldPath(c['field_path'])) {
      rejectedFieldPaths.push(c['field_path']);
      logger.warn(
        `Prompt 3 correction dropped: field_path ${describeFieldPath(c['field_path'])} is not a correctable CV field`,
      );
      continue;
    }
    keptCorrections.push(c);
  }

  if (!isNumber(p['quality_score'])) {
    return {
      success: false,
      error: 'Missing or invalid field: quality_score (must be a number)',
    };
  }

  if (!isBoolean(p['export_blocked'])) {
    return {
      success: false,
      error: 'Missing or invalid field: export_blocked',
    };
  }

  if (!isString(p['overall_notes'])) {
    return { success: false, error: 'Missing or invalid field: overall_notes' };
  }

  return {
    success: true,
    data: {
      ...(parsed as unknown as PrePdfCheckOutput),
      corrections: keptCorrections as unknown as PrePdfCheckCorrection[],
    },
    rejectedFieldPaths,
  };
}
