import { BadRequestException, Injectable } from '@nestjs/common';
import { KnowledgeSource } from '@prisma/client';

interface StepSourceGroups {
  required: string[];
  optional: string[];
}

const STEP_SOURCE_GROUPS: Record<string, StepSourceGroups> = {
  prompt_1: {
    required: [
      'profile_summary',
      'tech_stack',
      'project_inventory',
      'career_cases',
      'cv_rules',
    ],
    optional: ['certifications'],
  },
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
};

@Injectable()
export class KnowledgeSourceSelectionService {
  selectForStep(step: string, allSources: KnowledgeSource[]): KnowledgeSource[] {
    const groups = STEP_SOURCE_GROUPS[step];
    if (!groups) {
      throw new BadRequestException(
        `Unknown prompt step "${step}". Supported steps: ${Object.keys(STEP_SOURCE_GROUPS).join(', ')}`,
      );
    }

    const allowed = new Set([...groups.required, ...groups.optional]);

    return allSources.filter(
      (ks) => ks.isActive && allowed.has(ks.sourceType),
    );
  }
}
