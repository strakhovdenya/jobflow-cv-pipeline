import type { ArtifactCardData } from "@/lib/types";
import { AccordionSection } from "./accordion-section";
import { ArtifactCard } from "./artifact-card";

interface ArtifactListProps {
  artifacts: ArtifactCardData[];
}

export function ArtifactList({ artifacts }: ArtifactListProps) {
  return (
    <AccordionSection
      title="Artifacts"
      countBadge={artifacts.length}
      defaultOpen={false}
      headerExtra={
        artifacts.length > 0 ? (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            click a row to preview
          </span>
        ) : undefined
      }
    >
      {artifacts.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No artifacts yet.</p>
      ) : (
        <div>
          {artifacts.map((artifact) => (
            <ArtifactCard key={`${artifact.type}-${artifact.version}`} {...artifact} />
          ))}
        </div>
      )}
    </AccordionSection>
  );
}
