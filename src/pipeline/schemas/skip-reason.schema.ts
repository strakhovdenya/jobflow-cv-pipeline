export interface SkipReasonAnalysis {
  schema_version: string;
  step: string;
  decision: 'skip';
  score: number;
  company: string;
  role: string;
  location_remote: string;
  core_stack: string[];
  main_skip_reason: string;
  key_mismatches: string[];
  evidence_from_profile: string[];
  risks_if_applying_anyway: string[];
  useful_keywords_to_track_later: string[];
  future_reconsideration_condition: string;
}

export interface SkipReasonValidationResult {
  success: boolean;
  data?: SkipReasonAnalysis;
  error?: string;
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && (v as unknown[]).every(isString);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validateSkipReasonJson(raw: string): SkipReasonValidationResult {
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

  const stringFields: string[] = [
    'schema_version',
    'step',
    'company',
    'role',
    'location_remote',
    'main_skip_reason',
    'future_reconsideration_condition',
  ];

  for (const field of stringFields) {
    if (!isString(p[field])) {
      return { success: false, error: `Missing or invalid field: ${field}` };
    }
  }

  if (p['decision'] !== 'skip') {
    return {
      success: false,
      error: `Invalid decision value: "${String(p['decision'])}" — must be "skip"`,
    };
  }

  if (typeof p['score'] !== 'number' || !Number.isInteger(p['score'])) {
    return { success: false, error: 'Missing or invalid field: score (must be integer)' };
  }

  const stringArrayFields: string[] = [
    'core_stack',
    'key_mismatches',
    'evidence_from_profile',
    'risks_if_applying_anyway',
    'useful_keywords_to_track_later',
  ];

  for (const field of stringArrayFields) {
    if (!isStringArray(p[field])) {
      return { success: false, error: `Missing or invalid field: ${field} (must be string array)` };
    }
  }

  return { success: true, data: parsed as unknown as SkipReasonAnalysis };
}
