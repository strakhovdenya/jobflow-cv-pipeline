import { notFound } from "next/navigation";
import { getWorkspace, NotFoundApiError } from "@/lib/api";
import { WorkspaceStatusHeader } from "@/components/workspace-status-header";
import { PipelineStages } from "@/components/pipeline-stages";
import { ArtifactList } from "@/components/artifact-list";
import {
  buildArtifactCards,
  buildStages,
  buildStatusHeaderData,
  findLatestCvPdfDownloadUrl,
} from "@/lib/pipeline-view-model";
import { ApplicationTrackingPanel } from "./application-tracking-panel";
import { CoverLetterPanel } from "./cover-letter-panel";
import { FinalCheckPanel } from "./final-check-panel";
import { MainActionPanel } from "./main-action-panel";
import { PrePdfCheckPanel } from "./pre-pdf-check-panel";

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let workspace;
  try {
    workspace = await getWorkspace(id);
  } catch (error) {
    if (error instanceof NotFoundApiError) {
      notFound();
    }
    throw error;
  }

  const { stages, progress } = buildStages(workspace.status, workspace.currentDecision);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
      <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-[280px_1fr]">
        <div className="border-b border-zinc-200 p-6 dark:border-zinc-800 md:border-b-0 md:border-r">
          <PipelineStages stages={stages} progress={progress} />
        </div>

        <div className="flex flex-col gap-6 p-6">
          <WorkspaceStatusHeader {...buildStatusHeaderData(workspace)} />

          <MainActionPanel
            workspaceId={workspace.id}
            status={workspace.status}
            currentDecision={workspace.currentDecision}
            score={workspace.score}
            skipReasonSummary={workspace.skipReasonSummary}
            cvPdfDownloadUrl={findLatestCvPdfDownloadUrl(workspace.artifacts)}
          />

          <ArtifactList artifacts={buildArtifactCards(workspace.artifacts)} />
        </div>
      </div>

      <PrePdfCheckPanel
        workspaceId={workspace.id}
        status={workspace.status}
        artifacts={workspace.artifacts}
      />

      <FinalCheckPanel
        workspaceId={workspace.id}
        status={workspace.status}
        artifacts={workspace.artifacts}
      />

      <CoverLetterPanel
        workspaceId={workspace.id}
        status={workspace.status}
        artifacts={workspace.artifacts}
      />

      <ApplicationTrackingPanel
        workspaceId={workspace.id}
        status={workspace.status}
        artifacts={workspace.artifacts}
      />
    </div>
  );
}
