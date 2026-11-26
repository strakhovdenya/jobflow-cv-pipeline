import { BadRequestException, Injectable } from '@nestjs/common';
import { KnowledgeSource } from '@prisma/client';

interface StepSourceGroups {
  required: string[];
  optional: string[];
}

const PROMPT_1_SOURCE_GROUPS: StepSourceGroups = {
  required: [
    'master_cv',
    'profile_summary',
    'tech_stack',
    'project_inventory',
    'career_cases',
    'cv_rules',
  ],
  optional: ['certifications'],
};

export const STEP_SOURCE_GROUPS: Record<string, StepSourceGroups> = {
  prompt_1: PROMPT_1_SOURCE_GROUPS,
  prompt_2: {
    required: [
      'master_cv',
      'profile_summary',
      'tech_stack',
      'project_inventory',
      'career_cases',
      'cv_rules',
    ],
    optional: ['certifications', 'layout'],
  },
  cover_letter: {
    required: [
      'profile_summary',
      'cv_rules',
      'career_cases',
      'tech_stack',
      'project_inventory',
    ],
    optional: [],
  },
  prompt_3: {
    required: ['tech_stack', 'career_cases'],
    optional: [],
  },
  // ADR-046 (ISSUE-713): X1 reads no candidate source, only its excerpt of cv_rules; X2 and the B
  // stage read the Prompt 1 sources (the experimental context profile may narrow them).
  analysis_x1: {
    required: ['cv_rules'],
    optional: [],
  },
  analysis_x2: PROMPT_1_SOURCE_GROUPS,
  analysis_b: PROMPT_1_SOURCE_GROUPS,
};

@Injectable()
export class KnowledgeSourceSelectionService {
  selectForStep(
    step: string,
    allSources: KnowledgeSource[],
  ): KnowledgeSource[] {
    const groups = STEP_SOURCE_GROUPS[step];
    if (!groups) {
      throw new BadRequestException(
        `Unknown prompt step "${step}". Supported steps: ${Object.keys(STEP_SOURCE_GROUPS).join(', ')}`,
      );
    }

    const allowed = new Set([...groups.required, ...groups.optional]);

    return allSources.filter((ks) => ks.isActive && allowed.has(ks.sourceType));
  }
}
