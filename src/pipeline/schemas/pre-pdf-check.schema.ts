// Schema for 03_pre_pdf_check.json — output of Prompt 3 (P1/optional pre-PDF check).
// When this artifact exists, the renderer must apply corrections before generating HTML/PDF.
// The original 02_targeted_cv_content.json is never modified — corrections are overlaid in memory.

export interface PrePdfCheckCorrection {
  // JSON path to the field being corrected.
  // Supported formats: "headline", "summary[0]", "current_work_block.stable_intro",
  // "experience[0].bullets[1].text", "current_work_block.bullets[0].text"
  field_path: string;
  original_text?: string;
  suggested_text: string;
  severity: 'critical' | 'warning' | 'suggestion';
  reason: string;
}

export interface PrePdfCheckOutput {
  schema_version: string;
  workspace_id: string;
  corrections: PrePdfCheckCorrection[];
  export_blocked: boolean;
  overall_notes: string;
}

export interface PrePdfCheckValidationResult {
  success: boolean;
  data?: PrePdfCheckOutput;
  error?: string;
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validatePrePdfCheckJson(raw: string): PrePdfCheckValidationResult {
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
    return { success: false, error: 'Missing or invalid field: schema_version' };
  }

  if (!isString(p['workspace_id'])) {
    return { success: false, error: 'Missing or invalid field: workspace_id' };
  }

  if (!isArray(p['corrections'])) {
    return {
      success: false,
      error: 'Missing or invalid field: corrections (must be array)',
    };
  }

  const corrections = p['corrections'] as unknown[];
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
  }

  if (!isBoolean(p['export_blocked'])) {
    return { success: false, error: 'Missing or invalid field: export_blocked' };
  }

  if (!isString(p['overall_notes'])) {
    return { success: false, error: 'Missing or invalid field: overall_notes' };
  }

  return { success: true, data: parsed as unknown as PrePdfCheckOutput };
}
