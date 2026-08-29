// ADR-034: names exactly which output field/bullet/paragraph carries manual-note-sourced
// content — always present (empty array when nothing was forced). Shared across all 4
// AI-output schemas (vacancy-analysis, targeted-cv-content, skip-reason, cover-letter) that
// carry a `manual_note_forced_claims` field, so the field's shape and validation stay in sync.
export interface ManualNoteForcedClaim {
  location: string;
  text: string;
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export interface ManualNoteForcedClaimsValidationResult {
  success: boolean;
  error?: string;
}

// Validates `p['manual_note_forced_claims']` on an already-parsed JSON object, normalizing it
// to [] in place when absent. Absent is treated as "nothing was forced" (the same meaning as an
// explicit empty array) — the model is instructed to always include it, but a real run may omit
// a trailing field it never had reason to populate, and that must not fail the whole output.
export function validateManualNoteForcedClaims(
  p: Record<string, unknown>,
): ManualNoteForcedClaimsValidationResult {
  if (p['manual_note_forced_claims'] === undefined) {
    p['manual_note_forced_claims'] = [];
  }

  if (!Array.isArray(p['manual_note_forced_claims'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: manual_note_forced_claims (must be array)',
    };
  }

  for (const [i, entry] of (
    p['manual_note_forced_claims'] as unknown[]
  ).entries()) {
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

  return { success: true };
}
