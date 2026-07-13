// Schema for 05_final_check.json — output of Prompt 5 (P1/optional final check).
// Reviews the final exported CV output before the user sends it. No consumer
// currently reads this artifact automatically — it is a manual review point.

export type FinalCheckDecision = 'ready_to_send' | 'needs_edit' | 'do_not_send';

export interface FinalCheckChecklist {
  pdf_opens: boolean;
  content_matches_vacancy: boolean;
  no_unsupported_claims: boolean;
  contact_info_present: boolean;
  ready_to_apply: boolean;
}

export interface FinalCheckOutput {
  schema_version: string;
  workspace_id: string;
  final_decision: FinalCheckDecision;
  quality_score: number;
  page_count: number;
  missing_sections: string[];
  formatting_issues: string[];
  overclaiming_issues: string[];
  broken_links: string[];
  warnings: string[];
  final_checklist: FinalCheckChecklist;
}

export interface FinalCheckValidationResult {
  success: boolean;
  data?: FinalCheckOutput;
  error?: string;
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && (v as unknown[]).every(isString);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const FINAL_DECISION_VALUES: FinalCheckDecision[] = [
  'ready_to_send',
  'needs_edit',
  'do_not_send',
];

const CHECKLIST_FIELDS: (keyof FinalCheckChecklist)[] = [
  'pdf_opens',
  'content_matches_vacancy',
  'no_unsupported_claims',
  'contact_info_present',
  'ready_to_apply',
];

const STRING_ARRAY_FIELDS: string[] = [
  'missing_sections',
  'formatting_issues',
  'overclaiming_issues',
  'broken_links',
  'warnings',
];

export function validateFinalCheckJson(
  raw: string,
): FinalCheckValidationResult {
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

  if (
    !isString(p['final_decision']) ||
    !FINAL_DECISION_VALUES.includes(p['final_decision'] as FinalCheckDecision)
  ) {
    return {
      success: false,
      error:
        'Missing or invalid field: final_decision (must be one of ready_to_send, needs_edit, do_not_send)',
    };
  }

  if (!isNumber(p['quality_score'])) {
    return {
      success: false,
      error: 'Missing or invalid field: quality_score (must be a number)',
    };
  }

  if (!isNumber(p['page_count'])) {
    return {
      success: false,
      error: 'Missing or invalid field: page_count (must be a number)',
    };
  }

  for (const field of STRING_ARRAY_FIELDS) {
    if (!isStringArray(p[field])) {
      return {
        success: false,
        error: `Missing or invalid field: ${field} (must be string array)`,
      };
    }
  }

  if (!isObject(p['final_checklist'])) {
    return {
      success: false,
      error: 'Missing or invalid field: final_checklist (must be an object)',
    };
  }

  const checklist = p['final_checklist'];
  for (const field of CHECKLIST_FIELDS) {
    if (!isBoolean(checklist[field])) {
      return {
        success: false,
        error: `Missing or invalid field: final_checklist.${field} (must be boolean)`,
      };
    }
  }

  return { success: true, data: parsed as unknown as FinalCheckOutput };
}
