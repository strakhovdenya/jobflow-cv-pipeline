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
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    const messages = body?.message
      ? Array.isArray(body.message)
        ? body.message
        : [body.message]
      : [`Workspace creation failed with status ${response.status}`];
    throw new ApiValidationError(messages);
  }

  return response.json();
}
