"use client";

import { useState } from "react";
import { AsyncAnalysisTrigger } from "./async-analysis-trigger";
import { PipelineActions } from "./pipeline-actions";

interface AnalysisTriggersProps {
  workspaceId: string;
  status: string;
  currentDecision: string | null;
}

export function AnalysisTriggers({ workspaceId, status, currentDecision }: AnalysisTriggersProps) {
  const [analysisLocked, setAnalysisLocked] = useState(false);

  return (
    <>
      <PipelineActions
        workspaceId={workspaceId}
        status={status}
        currentDecision={currentDecision}
        analysisLocked={analysisLocked}
        onAnalysisBusyChange={setAnalysisLocked}
      />
      <AsyncAnalysisTrigger
        workspaceId={workspaceId}
        status={status}
        locked={analysisLocked}
        onBusyChange={setAnalysisLocked}
      />
    </>
  );
}
