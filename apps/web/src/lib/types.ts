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

export interface WorkspaceStatusHeaderData {
  company: string;
  role: string;
  slug: string;
  statusLabel: string;
  decision: string;
  score: string | number;
  reviewState: string;
  nextAction: string;
}

export type ActionButtonKind = "primary" | "secondary" | "disabled";

export interface MainActionButton {
  label: string;
  kind: ActionButtonKind;
  reason?: string;
}

export interface MainActionMetaItem {
  label: string;
  value: string | number;
}

export interface MainActionInfo {
  kind: "info";
  text: string;
}

export interface MainActionSelect {
  label: string;
  value: string;
}

export interface MainActionCardData {
  title: string;
  subtitle?: string;
  meta?: MainActionMetaItem[];
  info?: MainActionInfo;
  notice?: string;
  select?: MainActionSelect;
  reasonNote?: boolean | string;
  reasonNoteLabel?: string;
  buttons: MainActionButton[];
}
