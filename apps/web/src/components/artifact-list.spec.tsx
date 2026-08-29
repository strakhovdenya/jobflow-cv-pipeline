import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtifactList } from "./artifact-list";
import type { ArtifactCardData } from "@/lib/types";

describe("ArtifactList", () => {
  it("renders the empty state when there are no artifacts", () => {
    render(<ArtifactList artifacts={[]} />);

    expect(screen.getByText("No artifacts yet.")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("is collapsed by default (accordion)", () => {
    render(<ArtifactList artifacts={[]} />);

    expect(screen.getByText("Artifacts").closest("details")).not.toHaveAttribute(
      "open",
    );
  });

  it("renders a single artifact, already expanded (mockup 03)", () => {
    const artifacts: ArtifactCardData[] = [
      {
        type: "vacancy_source",
        kind: "source",
        ext: "txt",
        version: 1,
        date: "21 Jul, 09:02",
        stage: "Source",
        expanded: true,
        preview: "Fullstack Developer (React/Node.js) — Remote.",
      },
    ];
    render(<ArtifactList artifacts={artifacts} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("vacancy_source")).toBeInTheDocument();
    expect(screen.getByText("Fullstack Developer (React/Node.js) — Remote.")).toBeInTheDocument();
  });

  it("renders three artifacts with mixed expanded state (mockup 04)", () => {
    const artifacts: ArtifactCardData[] = [
      {
        type: "vacancy_source",
        kind: "source",
        ext: "txt",
        version: 1,
        date: "21 Jul, 09:02",
        stage: "Source",
        expanded: false,
        preview: "",
      },
      {
        type: "vacancy_analysis_md",
        kind: "analysis",
        ext: "md",
        version: 1,
        date: "21 Jul, 09:05",
        stage: "Analysis",
        expanded: true,
        preview: "Decision: apply\nScore: 75\nReasoning: strong stack match and remote preference.",
      },
      {
        type: "vacancy_analysis_json",
        kind: "analysis",
        ext: "json",
        version: 1,
        date: "21 Jul, 09:05",
        stage: "Analysis",
        expanded: false,
        preview: '{\n  "decision": "apply",\n  "score": 75\n}',
      },
    ];
    render(<ArtifactList artifacts={artifacts} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("vacancy_source")).toBeInTheDocument();
    expect(screen.getByText("vacancy_analysis_md")).toBeInTheDocument();
    expect(screen.getByText("vacancy_analysis_json")).toBeInTheDocument();

    expect(screen.getByText(/Decision: apply/)).toBeInTheDocument();
    expect(screen.queryByText(/"decision": "apply"/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("vacancy_analysis_json"));
    expect(screen.getByText(/"decision": "apply"/)).toBeInTheDocument();
  });

  it("preserves per-card download links across a list", () => {
    const artifacts: ArtifactCardData[] = [
      {
        type: "vacancy_source",
        kind: "source",
        ext: "txt",
        version: 1,
        date: "21 Jul, 09:02",
        stage: "Source",
        expanded: false,
        preview: "",
        downloadUrl: "/api/artifacts/artifact-1/download",
      },
      {
        type: "vacancy_analysis_md",
        kind: "analysis",
        ext: "md",
        version: 1,
        date: "21 Jul, 09:05",
        stage: "Analysis",
        expanded: false,
        preview: "",
        downloadUrl: "/api/artifacts/artifact-2/download",
      },
    ];
    render(<ArtifactList artifacts={artifacts} />);

    const links = screen.getAllByRole("link", { name: "Download" });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/api/artifacts/artifact-1/download");
    expect(links[1]).toHaveAttribute("href", "/api/artifacts/artifact-2/download");
  });
});
