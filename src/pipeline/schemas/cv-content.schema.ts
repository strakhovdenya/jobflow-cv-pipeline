// Renderer input contract for 02_targeted_cv_content.json.
// This schema defines what the HTML template (TASK-035B) and renderer service (TASK-035) expect.
// It is richer than the current Prompt2CvContent — the delta is resolved by the TASK-035
// renderer service when mapping Prompt 2 output to this contract.

export interface CvContact {
  phone?: string;
  email?: string;
  linkedin?: string;
  github?: string;
}

export interface CvCandidate {
  name: string;
  contact: CvContact;
  location: string;
  work_authorization: string;
}

export interface CvBullet {
  text: string;
  priority: 'high' | 'medium' | 'low';
  evidence_source?: string | null;
  risk_level?: string | null;
}

// current_work_block is a required top-level block, separate from the experience array.
// It represents post-EPAM independent work and portfolio projects (May 2025-Present)
// and is always rendered before Professional Experience in new external CV/PDF/HTML outputs.
// Per block-rules.md: it closes the timeline gap without inflating commercial experience.
export interface CvCurrentWorkBlock {
  include: boolean;
  safe_label: string;
  role_line: string;
  dates: string;
  location?: string;
  stable_intro: string;
  bullets: CvBullet[];
  tech_stack: string[];
}

export interface CvExperienceItemRenderingHints {
  keep_header_with_min_bullets?: number;
}

export interface CvExperienceItem {
  company: string;
  role: string;
  dates: string;
  context?: string;
  experience_type: 'commercial' | 'personal' | 'volunteer';
  can_split_across_pages: boolean;
  bullets: CvBullet[];
  tech_stack: string[];
  rendering_hints?: CvExperienceItemRenderingHints;
}

export interface CvSelectedProject {
  title: string;
  project_type: string;
  include: boolean;
  safe_label: string;
  relevance_reason: string;
  display_priority: 'high' | 'medium' | 'low' | 'hide_if_no_space';
  bullets: CvBullet[];
  tech_stack: string[];
}

export interface CvEducationItem {
  institution: string;
  degree: string;
  dates: string;
  notes?: string;
}

export interface CvCertification {
  name: string;
  issuer?: string;
  date?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CvLanguage {
  language: string;
  level: string;
  notes?: string;
}

export interface CvLink {
  label: string;
  url: string;
}

export interface CvVolunteering {
  description: string;
  organization?: string;
  role?: string;
  dates?: string;
  priority?: string;
}

export interface CvRenderingHints {
  density: 'compact' | 'normal' | 'extended';
  target_pages: number;
  max_pages: number;
  strong_match_allows_page_3: boolean;
  optional_sections_to_hide_first: string[];
}

export interface CvContent {
  layout_mode?: string;
  candidate: CvCandidate;
  headline: string;
  summary: string[];
  top_skills: string[];
  current_work_block: CvCurrentWorkBlock;
  experience: CvExperienceItem[];
  selected_projects: CvSelectedProject[];
  education: CvEducationItem[];
  certifications: CvCertification[];
  languages: CvLanguage[];
  links: CvLink[];
  volunteering: CvVolunteering[];
  rendering_hints: CvRenderingHints;
}

export interface CvContentValidationResult {
  success: boolean;
  data?: CvContent;
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

export function validateCvContentJson(raw: string): CvContentValidationResult {
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

  if (!isObject(p['candidate'])) {
    return { success: false, error: 'Missing or invalid field: candidate' };
  }
  const cand = p['candidate'] as Record<string, unknown>;
  if (!isString(cand['name'])) {
    return {
      success: false,
      error: 'Missing or invalid field: candidate.name',
    };
  }
  if (!isObject(cand['contact'])) {
    return {
      success: false,
      error: 'Missing or invalid field: candidate.contact',
    };
  }
  if (!isString(cand['location'])) {
    return {
      success: false,
      error: 'Missing or invalid field: candidate.location',
    };
  }
  if (!isString(cand['work_authorization'])) {
    return {
      success: false,
      error: 'Missing or invalid field: candidate.work_authorization',
    };
  }

  if (!isString(p['headline'])) {
    return { success: false, error: 'Missing or invalid field: headline' };
  }

  if (!isArray(p['summary'])) {
    return {
      success: false,
      error: 'Missing or invalid field: summary (must be array)',
    };
  }

  if (!isArray(p['top_skills'])) {
    return {
      success: false,
      error: 'Missing or invalid field: top_skills (must be array)',
    };
  }

  if (!isObject(p['current_work_block'])) {
    return {
      success: false,
      error: 'Missing or invalid field: current_work_block',
    };
  }
  const cwb = p['current_work_block'] as Record<string, unknown>;
  if (!isBoolean(cwb['include'])) {
    return {
      success: false,
      error: 'Missing or invalid field: current_work_block.include',
    };
  }
  if (!isString(cwb['safe_label'])) {
    return {
      success: false,
      error: 'Missing or invalid field: current_work_block.safe_label',
    };
  }
  if (!isString(cwb['role_line'])) {
    return {
      success: false,
      error: 'Missing or invalid field: current_work_block.role_line',
    };
  }
  if (!isString(cwb['dates'])) {
    return {
      success: false,
      error: 'Missing or invalid field: current_work_block.dates',
    };
  }
  if (!isString(cwb['stable_intro'])) {
    return {
      success: false,
      error: 'Missing or invalid field: current_work_block.stable_intro',
    };
  }
  if (!isArray(cwb['bullets'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: current_work_block.bullets (must be array)',
    };
  }
  if (!isArray(cwb['tech_stack'])) {
    return {
      success: false,
      error:
        'Missing or invalid field: current_work_block.tech_stack (must be array)',
    };
  }

  if (!isArray(p['experience'])) {
    return {
      success: false,
      error: 'Missing or invalid field: experience (must be array)',
    };
  }

  if (!isArray(p['selected_projects'])) {
    return {
      success: false,
      error: 'Missing or invalid field: selected_projects (must be array)',
    };
  }

  if (!isArray(p['education'])) {
    return {
      success: false,
      error: 'Missing or invalid field: education (must be array)',
    };
  }

  if (!isArray(p['certifications'])) {
    return {
      success: false,
      error: 'Missing or invalid field: certifications (must be array)',
    };
  }

  if (!isArray(p['languages'])) {
    return {
      success: false,
      error: 'Missing or invalid field: languages (must be array)',
    };
  }

  if (!isArray(p['links'])) {
    return {
      success: false,
      error: 'Missing or invalid field: links (must be array)',
    };
  }

  if (!isArray(p['volunteering'])) {
    return {
      success: false,
      error: 'Missing or invalid field: volunteering (must be array)',
    };
  }

  if (!isObject(p['rendering_hints'])) {
    return {
      success: false,
      error: 'Missing or invalid field: rendering_hints',
    };
  }

  return { success: true, data: parsed as unknown as CvContent };
}
