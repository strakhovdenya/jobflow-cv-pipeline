export const AI_STEPS = [
  'prompt_1',
  'prompt_2',
  'prompt_3',
  'prompt_5',
  'skip_reason',
  'cover_letter',
] as const;

export type AiStepName = (typeof AI_STEPS)[number];

export interface AiStepJobData {
  step: AiStepName;
  workspaceId: string;
  notes?: string;
}

export interface AiStepJobSummary {
  jobId: string;
  step: AiStepName;
  state: string;
}
