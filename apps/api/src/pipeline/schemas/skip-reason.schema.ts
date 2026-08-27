// ADR-034: names exactly which output field/paragraph carries manual-note-sourced content —
// always present (empty array when nothing was forced).
export interface ManualNoteForcedClaim {
  location: string;
  text: string;
}

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
  manual_note_forced_claims: ManualNoteForcedClaim[];
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

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

export function validateSkipReasonJson(
  raw: string,
): SkipReasonValidationResult {
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
    return {
      success: false,
      error: 'Missing or invalid field: score (must be integer)',
    };
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
      return {
        success: false,
        error: `Missing or invalid field: ${field} (must be string array)`,
      };
    }
  }

  // Absent is treated as "nothing was forced" (the same meaning as an explicit empty array) —
  // the model is instructed to always include it (ADR-034), but a real run may omit a trailing
  // field it never had reason to populate, and that must not fail the whole output.
  if (p['manual_note_forced_claims'] === undefined) {
    p['manual_note_forced_claims'] = [];
  }

  if (!isArray(p['manual_note_forced_claims'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: manual_note_forced_claims (must be array)',
    };
  }

  for (const [i, entry] of p['manual_note_forced_claims'].entries()) {
    if (!isObject(entry)) {
      return {
        success: false,
        error: `Missing or invalid field: manual_note_forced_claims[${i}] (must be object)`,
      };
    }
    if (!isString(entry['location'])) {
      return {
        success: false,
        error: `Missing or invalid field: manual_note_forced_claims[${i}].location`,
      };
    }
    if (!isString(entry['text'])) {
      return {
        success: false,
        error: `Missing or invalid field: manual_note_forced_claims[${i}].text`,
      };
    }
  }

  return { success: true, data: parsed as unknown as SkipReasonAnalysis };
}
