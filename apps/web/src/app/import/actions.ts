"use server";

import {
  ApiValidationError,
  confirmImportFolder,
  previewImportFolder,
  type ImportConfirmInput,
  type ImportConfirmResult,
  type ImportPreviewInput,
  type ImportPreviewResult,
} from "@/lib/api";

export type ImportPreviewActionResult =
  | { ok: true; data: ImportPreviewResult }
  | { ok: false; errors: string[] };

export async function previewImportFolderAction(
  input: ImportPreviewInput,
): Promise<ImportPreviewActionResult> {
  try {
    const data = await previewImportFolder(input);
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

export type ImportConfirmActionResult =
  | { ok: true; data: ImportConfirmResult }
  | { ok: false; errors: string[] };

export async function confirmImportFolderAction(
  input: ImportConfirmInput,
): Promise<ImportConfirmActionResult> {
  try {
    const data = await confirmImportFolder(input);
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
