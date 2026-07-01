export interface Prompt1WorkspaceInfo {
  company_name_original: string;
  company_slug: string;
  role_title_original: string;
  role_slug: string;
}

export interface Prompt1MustHaveItem {
  requirement: string;
  match_level: string;
  evidence_status: string;
  risk: string;
  notes?: string | null;
}

export interface Prompt1TechStackMatch {
  strong: string[];
  transferable: string[];
  weak_or_missing: string[];
}

export interface Prompt1RiskField {
  risk_level: string;
  notes: string;
}

export interface Prompt1EvidenceRisk {
  claim: string;
  status: string;
}

export interface Prompt1Analysis {
  schema_version: string;
  step: string;
  workspace: Prompt1WorkspaceInfo;
  decision: 'apply' | 'maybe' | 'skip';
  score: number;
  summary: string;
  must_have: Prompt1MustHaveItem[];
  nice_to_have: unknown[];
  wishlist: unknown[];
  hidden_role_logic: string[];
  tech_stack_match: Prompt1TechStackMatch;
  language_risk: Prompt1RiskField;
  location_risk: Prompt1RiskField;
  evidence_risks: Prompt1EvidenceRisk[];
  top_reasons: string[];
  recommended_next_action: string;
  manual_review_required: boolean;
}

export interface Prompt1ValidationResult {
  success: boolean;
  data?: Prompt1Analysis;
  error?: string;
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return isArray(v) && v.every(isString);
}

export function validatePrompt1Json(raw: string): Prompt1ValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false as const, error: 'Output is not valid JSON' };
  }

  if (!isObject(parsed)) {
    return { success: false as const, error: 'Root value must be an object' };
  }

  const p = parsed;

  if (!isString(p['schema_version'])) {
    return {
      success: false as const,
      error: 'Missing or invalid field: schema_version',
    };
  }

  if (!isString(p['step'])) {
    return { success: false as const, error: 'Missing or invalid field: step' };
  }

  if (!isObject(p['workspace'])) {
    return {
      success: false as const,
      error: 'Missing or invalid field: workspace',
    };
  }

  const ws = p['workspace'] as Record<string, unknown>;
  for (const field of [
    'company_name_original',
    'company_slug',
    'role_title_original',
    'role_slug',
  ]) {
    if (!isString(ws[field])) {
      return {
        success: false as const,
        error: `Missing or invalid field: workspace.${field}`,
      };
    }
  }

  const decision = p['decision'];
  if (decision !== 'apply' && decision !== 'maybe' && decision !== 'skip') {
    return {
      success: false,
      error: `Invalid decision value: "${String(decision)}" — must be apply, maybe or skip`,
    };
  }

  if (typeof p['score'] !== 'number' || !Number.isInteger(p['score'])) {
    return {
      success: false as const,
      error: 'Missing or invalid field: score (must be integer)',
    };
  }

  if (!isString(p['summary'])) {
    return {
      success: false as const,
      error: 'Missing or invalid field: summary',
    };
  }

  if (!isArray(p['must_have'])) {
    return {
      success: false as const,
      error: 'Missing or invalid field: must_have (must be array)',
    };
  }

  if (!isArray(p['nice_to_have'])) {
    return {
      success: false as const,
      error: 'Missing or invalid field: nice_to_have (must be array)',
    };
  }

  if (!isArray(p['wishlist'])) {
    return {
      success: false as const,
      error: 'Missing or invalid field: wishlist (must be array)',
    };
  }

  if (!isStringArray(p['hidden_role_logic'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: hidden_role_logic (must be string array)',
    };
  }

  if (!isObject(p['tech_stack_match'])) {
    return {
      success: false as const,
      error: 'Missing or invalid field: tech_stack_match',
    };
  }

  const tsm = p['tech_stack_match'] as Record<string, unknown>;
  for (const field of ['strong', 'transferable', 'weak_or_missing']) {
    if (!isStringArray(tsm[field])) {
      return {
        success: false,
        error: `Missing or invalid field: tech_stack_match.${field} (must be string array)`,
      };
    }
  }

  if (!isObject(p['language_risk'])) {
    return {
      success: false as const,
      error: 'Missing or invalid field: language_risk',
    };
  }

  if (!isObject(p['location_risk'])) {
    return {
      success: false as const,
      error: 'Missing or invalid field: location_risk',
    };
  }

  if (!isArray(p['evidence_risks'])) {
    return {
      success: false as const,
      error: 'Missing or invalid field: evidence_risks (must be array)',
    };
  }

  if (!isStringArray(p['top_reasons'])) {
    return {
      success: false,
      error: 'Missing or invalid field: top_reasons (must be string array)',
    };
  }

  if (!isString(p['recommended_next_action'])) {
    return {
      success: false as const,
      error: 'Missing or invalid field: recommended_next_action',
    };
  }

  if (typeof p['manual_review_required'] !== 'boolean') {
    return {
      success: false as const,
      error: 'Missing or invalid field: manual_review_required',
    };
  }

  return { success: true, data: parsed as unknown as Prompt1Analysis };
}
