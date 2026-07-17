"use server";

import {
  ApiValidationError,
  createWorkspace,
  type CreateWorkspaceInput,
  type WorkspaceCreationResult,
} from "@/lib/api";

export type CreateWorkspaceActionResult =
  | { ok: true; data: WorkspaceCreationResult }
  | { ok: false; errors: string[] };

export async function createWorkspaceAction(
  input: CreateWorkspaceInput,
): Promise<CreateWorkspaceActionResult> {
  try {
    const data = await createWorkspace(input);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ApiValidationError) {
      return { ok: false, errors: error.messages };
    }
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}
