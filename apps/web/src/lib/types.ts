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

export interface ActionsPanelData {
  title: string;
  buttons: MainActionButton[];
}

export type ArtifactKind = "source" | "analysis" | "cv" | "check" | "html" | "pdf";

export interface ArtifactCardData {
  type: string;
  kind: ArtifactKind;
  ext: string;
  version: number;
  date: string;
  stage: string;
  expanded: boolean;
  preview: string;
  downloadUrl?: string;
}

export type FindingSeverity = "critical" | "warning" | "suggestion";

export type ChecksReadiness = "ready" | "ready_with_minor_edits" | "not_ready";

export interface ChecksFinding {
  id: string;
  severity: FindingSeverity;
  message: string;
  original?: string;
  suggested?: string;
}

export interface ChecksNotRun {
  state: "not_run";
}

export interface ChecksResult {
  state: "result";
  compact: boolean;
  readiness: ChecksReadiness;
  suggestions: number;
  blockers: number;
  findings?: ChecksFinding[];
  notes: string;
}

export type ChecksData = ChecksNotRun | ChecksResult;

export interface FinalCheckEmptySection {
  title: string;
  value: string;
}

export interface FinalCheckPanelData {
  banner: string;
  checks: string[];
  emptySections: FinalCheckEmptySection[];
  warnings: string[];
}

export interface UpcomingStepStatus {
  status: string;
}

export interface UpcomingTrackingData {
  fields: string[];
}

export interface UpcomingStepsData {
  finalCheck: UpcomingStepStatus;
  coverLetter: UpcomingStepStatus;
  tracking: UpcomingTrackingData;
}

export interface CoverLetterPanelTextData {
  text: string;
}

export interface CoverLetterPanelButtonData {
  button: string;
}

export type CoverLetterPanelData = CoverLetterPanelTextData | CoverLetterPanelButtonData;
