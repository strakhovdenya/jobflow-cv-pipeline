export type StageKey =
  | "source"
  | "analysis"
  | "decision"
  | "cvgen"
  | "cvreview"
  | "prepdf"
  | "export"
  | "pdfgen"
  | "final"
  | "cover"
  | "tracking";

export type StageState = "done" | "current" | "upcoming";

export type StageOptionState = "next" | "pruned" | "open" | "chosen";

export interface StageOption {
  label: string;
  state: StageOptionState;
  reason?: string;
}

export interface Stage {
  n: number;
  key: StageKey;
  label: string;
  state: StageState;
  options?: StageOption[];
}

export interface Progress {
  step: number;
  total: number;
}
