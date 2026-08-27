export interface TargetedCvBullet {
  text: string;
  priority: string;
  evidence_source?: string | null;
  risk_level?: string | null;
  // Set true only when this bullet's content comes from the workspace's manual note, forced into
  // cv_content without evidence per ADR-034 — never inferred, only ever set from a manual note.
  user_forced?: boolean;
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
  // Not a closed enum — arbitrary AI-written status. "user-forced, unverified" is the one
  // reserved literal (ADR-034), used instead of "confirmed" for a claim sourced from the
  // workspace's manual note and forced in without evidence.
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

// ADR-034: names exactly which output field/bullet/paragraph carries manual-note-sourced
// content — always present (empty array when nothing was forced).
export interface ManualNoteForcedClaim {
  location: string;
  text: string;
}

// Diagnostic-only, like evidence_table — maps each vacancy requirement to the
// evidence/bullet chosen to demonstrate it. Never rendered into the CV output.
export interface TargetedCvRequirementCoverageEntry {
  requirement: string;
  priority: string;
  evidence_selected: string;
  shown_in: string;
  strength: string;
  reason_if_not_shown: string | null;
}

// Field order mirrors prompt2_v6.txt's output contract: requirement_coverage is
// listed before cv_content because it must be decided before bullets are written.
export interface TargetedCvContentOutput {
  schema_version: string;
  step: string;
  workspace_id: string;
  decision_context: TargetedCvDecisionContext;
  target_strategy: TargetedCvTargetStrategy;
  requirement_coverage: TargetedCvRequirementCoverageEntry[];
  cv_content: TargetedCvContentBlock;
  quality_score: number;
  evidence_table: TargetedCvEvidenceEntry[];
  overclaiming_check: TargetedCvOverclaimingCheck;
  pdf_readiness_notes: TargetedCvPdfReadinessNotes;
  manual_note_forced_claims: ManualNoteForcedClaim[];
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

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
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

  if (!isArray(p['requirement_coverage'])) {
    return {
      success: false,
      error: 'Missing or invalid field: requirement_coverage (must be array)',
    };
  }

  for (const [i, entry] of p['requirement_coverage'].entries()) {
    if (!isObject(entry)) {
      return {
        success: false,
        error: `Missing or invalid field: requirement_coverage[${i}] (must be object)`,
      };
    }
    if (!isString(entry['requirement'])) {
      return {
        success: false,
        error: `Missing or invalid field: requirement_coverage[${i}].requirement`,
      };
    }
    if (!isString(entry['priority'])) {
      return {
        success: false,
        error: `Missing or invalid field: requirement_coverage[${i}].priority`,
      };
    }
    if (!isString(entry['evidence_selected'])) {
      return {
        success: false,
        error: `Missing or invalid field: requirement_coverage[${i}].evidence_selected`,
      };
    }
    if (!isString(entry['shown_in'])) {
      return {
        success: false,
        error: `Missing or invalid field: requirement_coverage[${i}].shown_in`,
      };
    }
    if (!isString(entry['strength'])) {
      return {
        success: false,
        error: `Missing or invalid field: requirement_coverage[${i}].strength`,
      };
    }
    if (
      entry['reason_if_not_shown'] !== null &&
      !isString(entry['reason_if_not_shown'])
    ) {
      return {
        success: false,
        error: `Missing or invalid field: requirement_coverage[${i}].reason_if_not_shown (must be string or null)`,
      };
    }
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

  if (!isNumber(p['quality_score'])) {
    return {
      success: false,
      error: 'Missing or invalid field: quality_score (must be a number)',
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

  // Absent is treated as "nothing was forced" (the same meaning as an explicit empty array) —
  // the model is instructed to always include it (ADR-034), but a real run may omit a trailing
  // field it never had reason to populate, and that must not fail the whole analysis.
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

  return { success: true, data: parsed as unknown as TargetedCvContentOutput };
}
