// Schema for cover_letter.json — output of the cover letter generation step (Phase 10).
// docs/08_ai_pipeline.md section 15.4.

export interface CoverLetterBody {
  greeting: string;
  body_paragraphs: string[];
  closing: string;
}

export type CoverLetterEvidenceStatus =
  'supported' | 'needs evidence' | 'unsupported';

export interface CoverLetterEvidenceAlignment {
  vacancy_requirement: string;
  profile_evidence: string | null;
  status: CoverLetterEvidenceStatus;
}

export interface CoverLetterOutput {
  schema_version: string;
  step: string;
  document_type: string;
  language: string;
  company: string;
  role: string;
  subject: string | null;
  cover_letter: CoverLetterBody;
  evidence_alignment: CoverLetterEvidenceAlignment[];
  risks: string[];
  output_files: string[];
}

export interface CoverLetterValidationResult {
  success: boolean;
  data?: CoverLetterOutput;
  error?: string;
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isStringOrNull(v: unknown): v is string | null {
  return v === null || isString(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && (v as unknown[]).every(isString);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const EVIDENCE_STATUS_VALUES: CoverLetterEvidenceStatus[] = [
  'supported',
  'needs evidence',
  'unsupported',
];

const REQUIRED_STRING_FIELDS: (keyof CoverLetterOutput)[] = [
  'schema_version',
  'step',
  'document_type',
  'language',
  'company',
  'role',
];

export function validateCoverLetterJson(
  raw: string,
): CoverLetterValidationResult {
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

  for (const field of REQUIRED_STRING_FIELDS) {
    if (!isString(p[field])) {
      return { success: false, error: `Missing or invalid field: ${field}` };
    }
  }

  if (!isStringOrNull(p['subject'])) {
    return {
      success: false,
      error: 'Missing or invalid field: subject (must be string or null)',
    };
  }

  if (!isObject(p['cover_letter'])) {
    return {
      success: false,
      error: 'Missing or invalid field: cover_letter (must be an object)',
    };
  }

  const coverLetter = p['cover_letter'];

  if (!isString(coverLetter['greeting'])) {
    return {
      success: false,
      error: 'Missing or invalid field: cover_letter.greeting',
    };
  }

  if (!isStringArray(coverLetter['body_paragraphs'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: cover_letter.body_paragraphs (must be string array)',
    };
  }

  if (coverLetter['body_paragraphs'].length === 0) {
    return {
      success: false,
      error: 'cover_letter.body_paragraphs must not be empty',
    };
  }

  if (!isString(coverLetter['closing'])) {
    return {
      success: false,
      error: 'Missing or invalid field: cover_letter.closing',
    };
  }

  if (!Array.isArray(p['evidence_alignment'])) {
    return {
      success: false,
      error: 'Missing or invalid field: evidence_alignment (must be array)',
    };
  }

  const evidenceAlignment = p['evidence_alignment'] as unknown[];
  for (let i = 0; i < evidenceAlignment.length; i++) {
    const e = evidenceAlignment[i];
    if (!isObject(e)) {
      return {
        success: false,
        error: `evidence_alignment[${i}] must be an object`,
      };
    }
    if (!isString(e['vacancy_requirement'])) {
      return {
        success: false,
        error: `evidence_alignment[${i}].vacancy_requirement must be a string`,
      };
    }
    if (!isStringOrNull(e['profile_evidence'])) {
      return {
        success: false,
        error: `evidence_alignment[${i}].profile_evidence must be a string or null`,
      };
    }
    if (
      !isString(e['status']) ||
      !EVIDENCE_STATUS_VALUES.includes(e['status'] as CoverLetterEvidenceStatus)
    ) {
      return {
        success: false,
        error: `evidence_alignment[${i}].status must be one of ${EVIDENCE_STATUS_VALUES.join(', ')}`,
      };
    }
  }

  if (!isStringArray(p['risks'])) {
    return {
      success: false,
      error: 'Missing or invalid field: risks (must be string array)',
    };
  }

  if (!isStringArray(p['output_files'])) {
    return {
      success: false,
      error: 'Missing or invalid field: output_files (must be string array)',
    };
  }

  return { success: true, data: parsed as unknown as CoverLetterOutput };
}
