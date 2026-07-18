const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export interface HealthStatus {
  status: string;
}

export async function getHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json();
}

export interface CreateWorkspaceInput {
  companyNameOriginal: string;
  roleTitleOriginal: string;
  vacancyText: string;
  sourceUrl?: string;
}

export interface WorkspaceCreationResult {
  id: string;
  status: string;
  companySlug: string;
  roleSlug: string;
  workspaceSlug: string;
  folderPath: string;
  vacancySourcePath: string;
  vacancyTextHash: string;
  companyId: string;
  jobVacancyId: string;
  createdAt: string;
}

interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

export class ApiValidationError extends Error {
  constructor(public readonly messages: string[]) {
    super(messages.join("; "));
    this.name = "ApiValidationError";
  }
}

async function parseErrorMessages(
  response: Response,
  fallback: string,
): Promise<string[]> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  return body?.message
    ? Array.isArray(body.message)
      ? body.message
      : [body.message]
    : [fallback];
}

/**
 * Server-side only: sends X-API-Key, which must never reach the browser bundle.
 * Call this from a Server Action, not a Client Component.
 */
export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<WorkspaceCreationResult> {
  const response = await fetch(`${API_BASE_URL}/workspaces`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.API_KEY ?? "",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    const messages = await parseErrorMessages(
      response,
      `Workspace creation failed with status ${response.status}`,
    );
    throw new ApiValidationError(messages);
  }

  return response.json();
}

export class NotFoundApiError extends Error {
  constructor() {
    super("Not found");
    this.name = "NotFoundApiError";
  }
}

export interface WorkspaceCompany {
  id: string;
  nameOriginal: string;
  companySlug: string;
}

export interface WorkspaceJobVacancy {
  id: string;
  roleTitleOriginal: string;
  roleSlug: string;
}

export interface WorkspaceArtifactSummary {
  id: string;
  artifactType: string;
  canonicalFileName: string;
  downloadFileName: string;
  isLatest: boolean;
  version: number;
  mimeType: string | null;
  fileSizeBytes: number | null;
  createdAt: string;
}

export interface WorkspaceListItem {
  id: string;
  status: string;
  currentDecision: string | null;
  workspaceSlug: string;
  createdAt: string;
  company: WorkspaceCompany;
  jobVacancy: WorkspaceJobVacancy;
}

export interface WorkspaceDetail extends WorkspaceListItem {
  reviewState: string | null;
  score: number | null;
  skipReasonSummary: string | null;
  updatedAt: string;
  artifacts: WorkspaceArtifactSummary[];
}

/**
 * Server-side only: sends X-API-Key. Call from a Server Component or Server Action.
 */
export async function getWorkspace(id: string): Promise<WorkspaceDetail> {
  const response = await fetch(`${API_BASE_URL}/workspaces/${id}`, {
    headers: { "X-API-Key": process.env.API_KEY ?? "" },
    cache: "no-store",
  });

  if (response.status === 404) {
    throw new NotFoundApiError();
  }

  if (!response.ok) {
    throw new Error(`Fetching workspace failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Server-side only: sends X-API-Key. Call from a Server Component or Server Action.
 */
export async function listWorkspaces(): Promise<WorkspaceListItem[]> {
  const response = await fetch(`${API_BASE_URL}/workspaces`, {
    headers: { "X-API-Key": process.env.API_KEY ?? "" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Listing workspaces failed with status ${response.status}`);
  }

  return response.json();
}

export type ReviewAction =
  | "approve_apply"
  | "approve_maybe"
  | "pause"
  | "change_to_skip";

export interface ReviewDecisionResult {
  workspaceId: string;
  action: ReviewAction;
  currentDecision: string;
  reviewState: string;
  status: string;
  canProceedToPrompt2: boolean;
}

/**
 * Server-side only: sends X-API-Key. Call from a Server Action, not a Client Component.
 */
export async function submitReviewDecision(
  id: string,
  action: ReviewAction,
): Promise<ReviewDecisionResult> {
  const response = await fetch(`${API_BASE_URL}/workspaces/${id}/review-decision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.API_KEY ?? "",
    },
    body: JSON.stringify({ action }),
    cache: "no-store",
  });

  if (!response.ok) {
    const messages = await parseErrorMessages(
      response,
      `Review decision failed with status ${response.status}`,
    );
    throw new ApiValidationError(messages);
  }

  return response.json();
}

export type OverrideTargetDecision = "apply" | "maybe";

export interface OverrideSkipResult {
  workspaceId: string;
  fromDecision: string;
  toDecision: string;
  reviewState: string;
  status: string;
  canProceedToPrompt2: boolean;
}

/**
 * Server-side only: sends X-API-Key. Call from a Server Action, not a Client Component.
 */
export async function overrideSkip(
  id: string,
  targetDecision: OverrideTargetDecision,
  reasonNote?: string,
): Promise<OverrideSkipResult> {
  const response = await fetch(`${API_BASE_URL}/workspaces/${id}/override-skip`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.API_KEY ?? "",
    },
    body: JSON.stringify({ targetDecision, reasonNote }),
    cache: "no-store",
  });

  if (!response.ok) {
    const messages = await parseErrorMessages(
      response,
      `Skip override failed with status ${response.status}`,
    );
    throw new ApiValidationError(messages);
  }

  return response.json();
}

export type CvDraftReviewAction = "approve" | "pause" | "mark_not_worth_applying";

export interface CvDraftReviewResult {
  workspaceId: string;
  action: CvDraftReviewAction;
  status: string;
  currentDecision: string;
  reviewState: string;
  canProceedToExport: boolean;
}

/**
 * Server-side only: sends X-API-Key. Call from a Server Action, not a Client Component.
 */
export async function submitCvDraftReview(
  id: string,
  action: CvDraftReviewAction,
  reasonNote?: string,
): Promise<CvDraftReviewResult> {
  const response = await fetch(`${API_BASE_URL}/workspaces/${id}/review-cv-draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.API_KEY ?? "",
    },
    body: JSON.stringify({ action, reasonNote }),
    cache: "no-store",
  });

  if (!response.ok) {
    const messages = await parseErrorMessages(
      response,
      `CV draft review failed with status ${response.status}`,
    );
    throw new ApiValidationError(messages);
  }

  return response.json();
}

/**
 * Regenerates the CV draft by re-running Prompt 2. Placeholder action — there is no dedicated
 * "regenerate" endpoint, this re-invokes CV content generation.
 * Server-side only: sends X-API-Key. Call from a Server Action, not a Client Component.
 */
export async function regenerateCvContent(id: string): Promise<unknown> {
  const response = await fetch(
    `${API_BASE_URL}/workspaces/${id}/generate-cv-content`,
    {
      method: "POST",
      headers: { "X-API-Key": process.env.API_KEY ?? "" },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const messages = await parseErrorMessages(
      response,
      `Regenerating CV draft failed with status ${response.status}`,
    );
    throw new ApiValidationError(messages);
  }

  return response.json();
}
