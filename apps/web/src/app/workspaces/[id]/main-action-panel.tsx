"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MainActionCard } from "@/components/main-action-card";
import type { ActiveAiJob } from "@/lib/api";
import { buildMainActionCard } from "@/lib/pipeline-view-model";
import type { MainActionId } from "@/lib/types";
import { useAiStepRunner } from "@/lib/use-ai-step-runner";
import { ErrorList } from "./error-list";
import { createMainActionHandlers } from "./main-action-handlers";

const MAIN_PANEL_STEPS = ["prompt_1", "prompt_2", "skip_reason"] as const;

interface MainActionPanelProps {
  workspaceId: string;
  status: string;
  currentDecision: string | null;
  originalDecision: string | null;
  reviewState: string | null;
  score: number | null;
  skipReasonSummary: string | null;
  cvPdfDownloadUrl: string | null;
  cvAtsPdfDownloadUrl: string | null;
  activeJob?: ActiveAiJob | null;
}

export function MainActionPanel({
  workspaceId,
  status,
  currentDecision,
  originalDecision,
  reviewState,
  score,
  skipReasonSummary,
  cvPdfDownloadUrl,
  cvAtsPdfDownloadUrl,
  activeJob = null,
}: MainActionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const stepRunner = useAiStepRunner(workspaceId, activeJob, MAIN_PANEL_STEPS);

  function dispatch(id: MainActionId, note?: string) {
    setErrors([]);

    const handler = createMainActionHandlers({
      workspaceId,
      currentDecision,
      note,
      cvPdfDownloadUrl,
      cvAtsPdfDownloadUrl,
      navigate: (url) => {
        window.location.href = url;
      },
    })[id];

    if (handler.kind === "navigate") {
      handler.go();
      return;
    }

    if (handler.kind === "ai_step") {
      void stepRunner.run(handler.enqueue);
      return;
    }

    startTransition(async () => {
      const result = await handler.run();
      if (result.ok) {
        router.refresh();
      } else {
        setErrors(result.errors ?? ["Action failed"]);
      }
    });
  }

  const baseCard = buildMainActionCard({
    status,
    currentDecision,
    originalDecision,
    reviewState,
    score,
    skipReasonSummary,
    cvPdfDownloadUrl,
    cvAtsPdfDownloadUrl,
  });

  const isBusy = isPending || stepRunner.isBusy;
  const card = isBusy
    ? {
        ...baseCard,
        info:
          stepRunner.statusText === null
            ? baseCard.info
            : { kind: "info" as const, text: stepRunner.statusText },
        buttons: baseCard.buttons.map((button) => ({
          ...button,
          kind: "disabled" as const,
          reason: "Working…",
        })),
      }
    : baseCard;

  return (
    <div className="flex flex-col gap-3">
      <MainActionCard {...card} onAction={dispatch} />
      <ErrorList errors={[...errors, ...stepRunner.errors]} />
    </div>
  );
}
