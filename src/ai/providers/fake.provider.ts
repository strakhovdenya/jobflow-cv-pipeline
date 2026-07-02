import { Injectable } from '@nestjs/common';
import {
  AiProvider,
  AiProviderOptions,
  AiProviderResult,
} from '../ai-provider.interface';

const FAKE_PROVIDER_NAME = 'fake';
const FAKE_MODEL_NAME = 'fake-model-v1';

const FAKE_RESPONSE_TEXT = `# Vacancy Analysis

## Decision
apply

## Score
75

## Summary
Good match for Node.js/TypeScript backend role.`;

export const FAKE_SKIP_REASON_JSON = {
  schema_version: '1.0',
  step: 'skip_reason',
  decision: 'skip',
  score: 35,
  company: 'Fake Company',
  role: 'Backend Developer',
  location_remote: 'remote, Germany preferred',
  core_stack: ['Node.js', 'TypeScript', 'Kafka', 'Kubernetes'],
  main_skip_reason:
    'Production Kafka and Kubernetes are must-haves with no supporting evidence.',
  key_mismatches: [
    'Kafka: needs evidence.',
    'Kubernetes: basic exposure only.',
  ],
  evidence_from_profile: [
    'Strong commercial Node.js/TypeScript backend experience.',
    'Azure serverless production experience.',
  ],
  risks_if_applying_anyway: [
    'CV would need to overemphasise personal project exposure as production experience.',
  ],
  useful_keywords_to_track_later: [
    'Kafka',
    'Kubernetes',
    'event-driven architecture',
  ],
  future_reconsideration_condition:
    'Consider if Kafka/Kubernetes become nice-to-have instead of must-have.',
};

export const FAKE_PROMPT2_JSON = {
  schema_version: '1.0',
  step: 'prompt_2_targeted_cv_content',
  workspace_id: 'ws-test-1',
  decision_context: {
    prompt_1_decision: 'apply',
    user_approval: true,
    override: false,
  },
  target_strategy: {
    positioning: 'Backend TypeScript Developer',
    main_angle:
      'Commercial Node.js/TypeScript backend with Azure serverless experience.',
    risk_mitigation: [
      'Do not overclaim NestJS, Docker or AWS as commercial core skills.',
    ],
  },
  cv_content: {
    headline: 'Backend Developer | Node.js | TypeScript | REST APIs',
    summary: [
      'Backend-focused TypeScript developer with commercial Node.js and Azure Functions experience.',
      'Strong production debugging and PostgreSQL foundation.',
    ],
    top_skills: ['Node.js', 'TypeScript', 'Azure Functions', 'PostgreSQL'],
    experience: [
      {
        company: 'EPAM Systems',
        role: 'Backend-focused Fullstack Developer',
        dates: 'Nov 2021 - Apr 2025',
        experience_type: 'commercial',
        can_split_across_pages: true,
        bullets: [
          {
            text: 'Built Node.js/TypeScript backend services and Azure serverless workflows for e-commerce integrations.',
            priority: 'high',
            evidence_source: 'Career_Case_Deep_Dives.md',
            risk_level: 'low',
          },
          {
            text: 'Debugged production issues across CommerceTools and Amplience integration pipelines.',
            priority: 'medium',
            evidence_source: 'Career_Case_Deep_Dives.md',
            risk_level: 'low',
          },
        ],
        tech_stack: ['Node.js', 'TypeScript', 'Azure Functions', 'REST APIs'],
      },
    ],
    selected_projects: [
      {
        title: 'AI Job Assistant',
        project_type: 'current_personal_project',
        include: true,
        safe_label: 'Current Personal Project',
        relevance_reason:
          'Relevant when the vacancy values AI-assisted workflow automation or backend document generation.',
        display_priority: 'high',
        bullets: [
          {
            text: 'Built a backend-first NestJS/TypeScript pipeline for vacancy analysis and CV artifact generation.',
            priority: 'high',
            evidence_source: 'Project_Inventory.md',
          },
        ],
        tech_stack: ['TypeScript', 'NestJS', 'PostgreSQL', 'Prisma'],
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
  evidence_table: [
    {
      claim: 'Commercial Node.js/TypeScript backend experience',
      support: 'EPAM backend services and serverless workflows',
      source: 'Tech_Stack_Matrix.md',
      status: 'supported',
    },
    {
      claim: 'AWS production experience',
      support: null,
      source: null,
      status: 'needs evidence',
    },
  ],
  overclaiming_check: {
    critical_issues: [],
    warnings: ['Avoid presenting Docker as production platform ownership.'],
    needs_evidence: ['AWS', 'Kubernetes'],
  },
  pdf_readiness_notes: {
    estimated_page_count: 2,
    layout_risks: [],
    recommended_next_step:
      'Review CV draft, then export PDF or run optional pre-PDF check.',
  },
};

export const FAKE_PROMPT1_JSON = {
  schema_version: '1.0',
  step: 'prompt_1_vacancy_analysis',
  workspace: {
    company_name_original: 'Fake Company',
    company_slug: 'Fake_Company',
    role_title_original: 'Backend Developer',
    role_slug: 'Backend_Developer',
  },
  decision: 'apply',
  score: 75,
  summary: 'Good match for Node.js/TypeScript backend role.',
  must_have: [
    {
      requirement: 'Node.js/TypeScript backend',
      match_level: 'strong',
      evidence_status: 'supported',
      risk: 'low',
      notes: null,
    },
  ],
  nice_to_have: [],
  wishlist: [],
  hidden_role_logic: [],
  tech_stack_match: {
    strong: ['Node.js', 'TypeScript'],
    transferable: ['Azure Functions'],
    weak_or_missing: [],
  },
  language_risk: { risk_level: 'low', notes: 'English B2.' },
  location_risk: { risk_level: 'low', notes: 'Remote confirmed.' },
  evidence_risks: [],
  top_reasons: ['Strong Node.js/TypeScript match.'],
  recommended_next_action: 'Generate targeted CV content.',
  manual_review_required: true,
};

@Injectable()
export class FakeAiProvider implements AiProvider {
  readonly providerName = FAKE_PROVIDER_NAME;
  readonly modelName = FAKE_MODEL_NAME;

  async complete(
    _prompt: string,
    _inputContext: string,
    options?: AiProviderOptions,
  ): Promise<AiProviderResult> {
    if (!options?.jsonMode) {
      return {
        text: FAKE_RESPONSE_TEXT,
        rawResponse: { fake: true },
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      };
    }

    const json =
      options.step === 'prompt_2'
        ? FAKE_PROMPT2_JSON
        : options.step === 'skip_reason'
          ? FAKE_SKIP_REASON_JSON
          : FAKE_PROMPT1_JSON;

    return {
      text: JSON.stringify(json, null, 2),
      parsedJson: json,
      rawResponse: { fake: true },
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    };
  }
}
