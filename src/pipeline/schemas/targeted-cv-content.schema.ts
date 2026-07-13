export interface TargetedCvBullet {
  text: string;
  priority: string;
  evidence_source?: string | null;
  risk_level?: string | null;
}

export interface TargetedCvExperienceItem {
  company: string;
  role: string;
  dates: string;
  experience_type: string;
  can_split_across_pages: boolean;
  bullets: TargetedCvBullet[];
  tech_stack: string[];
}

export interface TargetedCvSelectedProject {
  title: string;
  project_type: string;
  include: boolean;
  safe_label: string;
  relevance_reason: string;
  display_priority: string;
  bullets: TargetedCvBullet[];
  tech_stack: string[];
}

export interface TargetedCvRenderingHints {
  density: string;
  target_pages: number;
  max_pages: number;
  strong_match_allows_page_3: boolean;
  optional_sections_to_hide_first: string[];
}

// Mirrors CvCurrentWorkBlock from cv-content.schema.ts.
// priority in bullets uses string (not union) consistent with TargetedCvBullet.
// purpose field from prompt docs is intentionally omitted — not part of renderer contract.
export interface TargetedCvCurrentWorkBlock {
  include: boolean;
  safe_label: string;
  role_line: string;
  dates: string;
  location?: string;
  stable_intro: string;
  bullets: TargetedCvBullet[];
  tech_stack: string[];
}

export interface TargetedCvContentBlock {
  headline: string;
  summary: string[];
  top_skills: string[];
  current_work_block: TargetedCvCurrentWorkBlock;
  experience: TargetedCvExperienceItem[];
  selected_projects: TargetedCvSelectedProject[];
  certifications: unknown[];
  rendering_hints: TargetedCvRenderingHints;
}

export interface TargetedCvDecisionContext {
  prompt_1_decision: string;
  user_approval: boolean;
  override: boolean;
}

export interface TargetedCvTargetStrategy {
  positioning: string;
  main_angle: string;
  risk_mitigation: string[];
}

export interface TargetedCvEvidenceEntry {
  claim: string;
  support: string | null;
  source: string | null;
  status: string;
}

export interface TargetedCvOverclaimingCheck {
  critical_issues: string[];
  warnings: string[];
  needs_evidence: string[];
}

export interface TargetedCvPdfReadinessNotes {
  estimated_page_count: number;
  layout_risks: string[];
  recommended_next_step: string;
}

export interface TargetedCvContentOutput {
  schema_version: string;
  step: string;
  workspace_id: string;
  decision_context: TargetedCvDecisionContext;
  target_strategy: TargetedCvTargetStrategy;
  cv_content: TargetedCvContentBlock;
  evidence_table: TargetedCvEvidenceEntry[];
  overclaiming_check: TargetedCvOverclaimingCheck;
  pdf_readiness_notes: TargetedCvPdfReadinessNotes;
}

export interface TargetedCvContentValidationResult {
  success: boolean;
  data?: TargetedCvContentOutput;
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

function isStringArray(v: unknown): v is string[] {
  return isArray(v) && v.every(isString);
}

export function validateTargetedCvContentJson(
  raw: string,
): TargetedCvContentValidationResult {
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

  if (!isString(p['step'])) {
    return { success: false, error: 'Missing or invalid field: step' };
  }

  if (!isString(p['workspace_id'])) {
    return { success: false, error: 'Missing or invalid field: workspace_id' };
  }

  if (!isObject(p['decision_context'])) {
    return {
      success: false,
      error: 'Missing or invalid field: decision_context',
    };
  }

  const dc = p['decision_context'] as Record<string, unknown>;
  if (!isString(dc['prompt_1_decision'])) {
    return {
      success: false,
      error: 'Missing or invalid field: decision_context.prompt_1_decision',
    };
  }
  if (!isBoolean(dc['user_approval'])) {
    return {
      success: false,
      error: 'Missing or invalid field: decision_context.user_approval',
    };
  }
  if (!isBoolean(dc['override'])) {
    return {
      success: false,
      error: 'Missing or invalid field: decision_context.override',
    };
  }

  if (!isObject(p['target_strategy'])) {
    return {
      success: false,
      error: 'Missing or invalid field: target_strategy',
    };
  }

  const ts = p['target_strategy'] as Record<string, unknown>;
  if (!isString(ts['positioning'])) {
    return {
      success: false,
      error: 'Missing or invalid field: target_strategy.positioning',
    };
  }
  if (!isString(ts['main_angle'])) {
    return {
      success: false,
      error: 'Missing or invalid field: target_strategy.main_angle',
    };
  }
  if (!isStringArray(ts['risk_mitigation'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: target_strategy.risk_mitigation (must be string array)',
    };
  }

  if (!isObject(p['cv_content'])) {
    return { success: false, error: 'Missing or invalid field: cv_content' };
  }

  const cv = p['cv_content'] as Record<string, unknown>;

  if (!isObject(cv['current_work_block'])) {
    return {
      success: false,
      error: 'Missing or invalid field: cv_content.current_work_block',
    };
  }
  const cwb = cv['current_work_block'] as Record<string, unknown>;
  if (!isBoolean(cwb['include'])) {
    return {
      success: false,
      error: 'Missing or invalid field: cv_content.current_work_block.include',
    };
  }
  if (!isString(cwb['safe_label'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: cv_content.current_work_block.safe_label',
    };
  }
  if (!isString(cwb['role_line'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: cv_content.current_work_block.role_line',
    };
  }
  if (!isString(cwb['dates'])) {
    return {
      success: false,
      error: 'Missing or invalid field: cv_content.current_work_block.dates',
    };
  }
  if (!isString(cwb['stable_intro'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: cv_content.current_work_block.stable_intro',
    };
  }
  if (!isArray(cwb['bullets'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: cv_content.current_work_block.bullets (must be array)',
    };
  }
  if (!isArray(cwb['tech_stack'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: cv_content.current_work_block.tech_stack (must be array)',
    };
  }

  if (!isString(cv['headline'])) {
    return {
      success: false,
      error: 'Missing or invalid field: cv_content.headline',
    };
  }
  if (!isStringArray(cv['summary'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: cv_content.summary (must be string array)',
    };
  }
  if (!isStringArray(cv['top_skills'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: cv_content.top_skills (must be string array)',
    };
  }
  if (!isArray(cv['experience'])) {
    return {
      success: false,
      error: 'Missing or invalid field: cv_content.experience (must be array)',
    };
  }
  if (!isArray(cv['selected_projects'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: cv_content.selected_projects (must be array)',
    };
  }
  if (!isArray(cv['certifications'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: cv_content.certifications (must be array)',
    };
  }
  if (!isObject(cv['rendering_hints'])) {
    return {
      success: false,
      error: 'Missing or invalid field: cv_content.rendering_hints',
    };
  }

  if (!isArray(p['evidence_table'])) {
    return {
      success: false,
      error: 'Missing or invalid field: evidence_table (must be array)',
    };
  }

  if (!isObject(p['overclaiming_check'])) {
    return {
      success: false,
      error: 'Missing or invalid field: overclaiming_check',
    };
  }

  const oc = p['overclaiming_check'] as Record<string, unknown>;
  if (!isArray(oc['critical_issues'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: overclaiming_check.critical_issues (must be array)',
    };
  }
  if (!isArray(oc['warnings'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: overclaiming_check.warnings (must be array)',
    };
  }
  if (!isArray(oc['needs_evidence'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: overclaiming_check.needs_evidence (must be array)',
    };
  }

  if (!isObject(p['pdf_readiness_notes'])) {
    return {
      success: false,
      error: 'Missing or invalid field: pdf_readiness_notes',
    };
  }

  return { success: true, data: parsed as unknown as TargetedCvContentOutput };
}
