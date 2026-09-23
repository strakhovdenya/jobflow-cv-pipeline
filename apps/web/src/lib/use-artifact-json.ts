"use client";

import { useEffect, useState } from "react";
import { downloadUrl } from "@/lib/artifact-download";

// Keyed by artifactId — a result for a prior artifact id never shows for a new one.
type FetchState<T> =
  | { status: "idle" }
  | { status: "loaded"; artifactId: string; data: T }
  | { status: "error"; artifactId: string; message: string };

interface UseArtifactJsonOptions {
  enabled?: boolean;
  errorLabel?: string;
}

interface UseArtifactJsonResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

export function useArtifactJson<T>(
  artifactId: string | null,
  { enabled = true, errorLabel = "result" }: UseArtifactJsonOptions = {},
): UseArtifactJsonResult<T> {
  const [fetchState, setFetchState] = useState<FetchState<T>>({
    status: "idle",
  });
  const isActive = enabled && artifactId !== null;

  useEffect(() => {
    if (!enabled || artifactId === null) {
      return;
    }

    const controller = new AbortController();

    fetch(downloadUrl(artifactId), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load ${errorLabel} (status ${response.status})`,
          );
        }
        return response.json() as Promise<T>;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setFetchState({ status: "loaded", artifactId, data });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) {
          return;
        }
        setFetchState({
          status: "error",
          artifactId,
          message:
            error instanceof Error
              ? error.message
              : `Failed to load ${errorLabel}`,
        });
      });

    return () => controller.abort();
  }, [enabled, artifactId, errorLabel]);

  const isCurrent =
    isActive &&
    fetchState.status !== "idle" &&
    fetchState.artifactId === artifactId;
  const data =
    isCurrent && fetchState.status === "loaded" ? fetchState.data : null;
  const error =
    isCurrent && fetchState.status === "error" ? fetchState.message : null;

  return { data, error, isLoading: isActive && !isCurrent };
}
