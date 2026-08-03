import type { ArtifactCardData } from "@/lib/types";
import { ArtifactCard } from "./artifact-card";

interface ArtifactListProps {
  artifacts: ArtifactCardData[];
}

export function ArtifactList({ artifacts }: ArtifactListProps) {
  return (
    <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-black dark:text-zinc-50">Artifacts</h2>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1.5 text-xs font-semibold text-white dark:bg-white dark:text-black">
            {artifacts.length}
          </span>
        </div>
        {artifacts.length > 0 && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            click a row to preview
          </span>
        )}
      </div>

      {artifacts.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No artifacts yet.</p>
      ) : (
        <div className="mt-3">
          {artifacts.map((artifact) => (
            <ArtifactCard key={`${artifact.type}-${artifact.version}`} {...artifact} />
          ))}
        </div>
      )}
    </div>
  );
}
