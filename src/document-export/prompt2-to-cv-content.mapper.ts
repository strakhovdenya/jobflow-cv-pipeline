// Maps TargetedCvContentOutput (02_targeted_cv_content.json shape, TASK-032) to CvContent
// (renderer input contract, TASK-035B). TargetedCvContentOutput has no candidate/education/
// languages/links/volunteering fields — those come from the static candidate
// profile config. Everything Prompt 2 already decided (wording, bullet content,
// bullet count, project inclusion) is copied through unchanged; this function
// never adds, removes or rewrites CV content.
import {
  TargetedCvBullet,
  TargetedCvCurrentWorkBlock,
  TargetedCvExperienceItem,
  TargetedCvContentOutput,
  TargetedCvSelectedProject,
} from '../pipeline/schemas/targeted-cv-content.schema';
import {
  CvBullet,
  CvCertification,
  CvContent,
  CvCurrentWorkBlock,
  CvExperienceItem,
  CvRenderingHints,
  CvSelectedProject,
} from '../pipeline/schemas/cv-content.schema';
import { CandidateProfileConfig } from './candidate-profile.config';

function mapBullet(bullet: TargetedCvBullet): CvBullet {
  return {
    text: bullet.text,
    priority: bullet.priority as CvBullet['priority'],
    evidence_source: bullet.evidence_source,
    risk_level: bullet.risk_level,
  };
}

function mapCurrentWorkBlock(
  block: TargetedCvCurrentWorkBlock,
): CvCurrentWorkBlock {
  return {
    include: block.include,
    safe_label: block.safe_label,
    role_line: block.role_line,
    dates: block.dates,
    location: block.location,
    stable_intro: block.stable_intro,
    bullets: block.bullets.map(mapBullet),
    tech_stack: block.tech_stack,
  };
}

function mapExperienceItem(item: TargetedCvExperienceItem): CvExperienceItem {
  return {
    company: item.company,
    role: item.role,
    dates: item.dates,
    experience_type:
      item.experience_type as CvExperienceItem['experience_type'],
    can_split_across_pages: item.can_split_across_pages,
    bullets: item.bullets.map(mapBullet),
    tech_stack: item.tech_stack,
  };
}

function mapSelectedProject(
  item: TargetedCvSelectedProject,
): CvSelectedProject {
  return {
    title: item.title,
    project_type: item.project_type,
    include: item.include,
    safe_label: item.safe_label,
    relevance_reason: item.relevance_reason,
    display_priority:
      item.display_priority as CvSelectedProject['display_priority'],
    bullets: item.bullets.map(mapBullet),
    tech_stack: item.tech_stack,
  };
}

export function mapPrompt2OutputToCvContent(
  output: TargetedCvContentOutput,
  profile: CandidateProfileConfig,
): CvContent {
  const cv = output.cv_content;

  const renderingHints: CvRenderingHints = {
    density: cv.rendering_hints.density as CvRenderingHints['density'],
    target_pages: cv.rendering_hints.target_pages,
    max_pages: cv.rendering_hints.max_pages,
    strong_match_allows_page_3: cv.rendering_hints.strong_match_allows_page_3,
    optional_sections_to_hide_first:
      cv.rendering_hints.optional_sections_to_hide_first,
  };

  return {
    candidate: profile.candidate,
    headline: cv.headline,
    summary: cv.summary,
    top_skills: cv.top_skills,
    current_work_block: mapCurrentWorkBlock(cv.current_work_block),
    experience: cv.experience.map(mapExperienceItem),
    selected_projects: cv.selected_projects.map(mapSelectedProject),
    education: profile.education,
    certifications: cv.certifications as CvCertification[],
    languages: profile.languages,
    links: profile.links,
    volunteering: profile.volunteering,
    rendering_hints: renderingHints,
  };
}
