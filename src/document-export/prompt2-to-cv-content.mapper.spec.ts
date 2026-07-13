import { mapPrompt2OutputToCvContent } from './prompt2-to-cv-content.mapper';
import { CANDIDATE_PROFILE_CONFIG } from './candidate-profile.config';
import { TargetedCvContentOutput } from '../pipeline/schemas/targeted-cv-content.schema';

function makePrompt2Output(): TargetedCvContentOutput {
  return {
    schema_version: '1.0',
    step: 'prompt_2',
    workspace_id: 'ws-1',
    decision_context: {
      prompt_1_decision: 'apply',
      user_approval: true,
      override: false,
    },
    target_strategy: {
      positioning: 'Backend specialist',
      main_angle: 'Node.js/TypeScript depth',
      risk_mitigation: ['German language risk noted'],
    },
    cv_content: {
      headline: 'Backend Developer | Node.js | TypeScript',
      summary: ['Experienced backend developer.'],
      top_skills: ['Node.js', 'TypeScript'],
      current_work_block: {
        include: true,
        safe_label: 'Current Independent Work',
        role_line: 'Freelance Software Development',
        dates: 'May 2025 - Present',
        location: 'Cologne, Germany | Remote',
        stable_intro: 'Continued development after relocating.',
        bullets: [
          {
            text: 'Supported small Node.js improvements.',
            priority: 'high',
            evidence_source: 'Master_CV_RU_v0_6_current_work_sync.md',
            risk_level: 'medium',
          },
        ],
        tech_stack: ['Node.js', 'TypeScript'],
      },
      experience: [
        {
          company: 'EPAM Systems',
          role: 'Backend-focused Fullstack Developer',
          dates: 'Nov 2021 - May 2025',
          experience_type: 'commercial',
          can_split_across_pages: true,
          bullets: [
            {
              text: 'Built Node.js/TypeScript backend services.',
              priority: 'high',
            },
          ],
          tech_stack: ['Node.js', 'TypeScript', 'Azure'],
        },
      ],
      selected_projects: [
        {
          title: 'AI Job Assistant',
          project_type: 'personal_project',
          include: true,
          safe_label: 'Personal Project',
          relevance_reason: 'AI/FastAPI relevance',
          display_priority: 'medium',
          bullets: [
            {
              text: 'Built FastAPI/PostgreSQL personal project.',
              priority: 'high',
            },
          ],
          tech_stack: ['Python', 'FastAPI'],
        },
      ],
      certifications: [],
      rendering_hints: {
        density: 'normal',
        target_pages: 2,
        max_pages: 3,
        strong_match_allows_page_3: false,
        optional_sections_to_hide_first: ['low_priority_certifications'],
      },
    },
    evidence_table: [],
    overclaiming_check: {
      critical_issues: [],
      warnings: [],
      needs_evidence: [],
    },
    pdf_readiness_notes: {
      estimated_page_count: 2,
      layout_risks: [],
      recommended_next_step: 'proceed',
    },
  };
}

describe('mapPrompt2OutputToCvContent', () => {
  it('copies current_work_block verbatim from TargetedCvContentOutput', () => {
    const output = makePrompt2Output();
    const result = mapPrompt2OutputToCvContent(
      output,
      CANDIDATE_PROFILE_CONFIG,
    );

    expect(result.current_work_block).toEqual({
      include: true,
      safe_label: 'Current Independent Work',
      role_line: 'Freelance Software Development',
      dates: 'May 2025 - Present',
      location: 'Cologne, Germany | Remote',
      stable_intro: 'Continued development after relocating.',
      bullets: [
        {
          text: 'Supported small Node.js improvements.',
          priority: 'high',
          evidence_source: 'Master_CV_RU_v0_6_current_work_sync.md',
          risk_level: 'medium',
        },
      ],
      tech_stack: ['Node.js', 'TypeScript'],
    });
  });

  it('copies experience and selected_projects wording unchanged', () => {
    const output = makePrompt2Output();
    const result = mapPrompt2OutputToCvContent(
      output,
      CANDIDATE_PROFILE_CONFIG,
    );

    expect(result.experience[0].company).toBe('EPAM Systems');
    expect(result.experience[0].bullets[0].text).toBe(
      'Built Node.js/TypeScript backend services.',
    );
    expect(result.selected_projects[0].title).toBe('AI Job Assistant');
    expect(result.selected_projects[0].bullets[0].text).toBe(
      'Built FastAPI/PostgreSQL personal project.',
    );
  });

  it('sources candidate/education/languages/links/volunteering from the static config, not TargetedCvContentOutput', () => {
    const output = makePrompt2Output();
    const result = mapPrompt2OutputToCvContent(
      output,
      CANDIDATE_PROFILE_CONFIG,
    );

    expect(result.candidate).toEqual(CANDIDATE_PROFILE_CONFIG.candidate);
    expect(result.education).toEqual(CANDIDATE_PROFILE_CONFIG.education);
    expect(result.languages).toEqual(CANDIDATE_PROFILE_CONFIG.languages);
    expect(result.links).toEqual(CANDIDATE_PROFILE_CONFIG.links);
    expect(result.volunteering).toEqual(CANDIDATE_PROFILE_CONFIG.volunteering);
  });

  it('copies headline, summary, top_skills and rendering_hints unchanged', () => {
    const output = makePrompt2Output();
    const result = mapPrompt2OutputToCvContent(
      output,
      CANDIDATE_PROFILE_CONFIG,
    );

    expect(result.headline).toBe(output.cv_content.headline);
    expect(result.summary).toEqual(output.cv_content.summary);
    expect(result.top_skills).toEqual(output.cv_content.top_skills);
    expect(result.rendering_hints).toEqual(output.cv_content.rendering_hints);
  });
});
