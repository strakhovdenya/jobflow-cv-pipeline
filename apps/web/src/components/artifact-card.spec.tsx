import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtifactCard } from "./artifact-card";
import type { ArtifactCardData } from "@/lib/types";

describe("ArtifactCard", () => {
  it("renders labelled with stage, type, ext, version and date (mockup 03)", () => {
    const data: ArtifactCardData = {
      type: "vacancy_source",
      kind: "source",
      ext: "txt",
      version: 1,
      date: "21 Jul, 09:02",
      stage: "Source",
      expanded: true,
      preview:
        "Fullstack Developer (React/Node.js) — Remote / Work from Anywhere, US.\nCompensation $230,000–$280,000/year.",
    };
    render(<ArtifactCard {...data} />);

    expect(screen.getByText("vacancy_source")).toBeInTheDocument();
    expect(screen.getByText("Source · txt · v1 · 21 Jul, 09:02")).toBeInTheDocument();
    expect(screen.getByText("SRC")).toBeInTheDocument();
  });

  it("starts expanded and shows the preview text when expanded is true (mockup 03)", () => {
    const data: ArtifactCardData = {
      type: "vacancy_source",
      kind: "source",
      ext: "txt",
      version: 1,
      date: "21 Jul, 09:02",
      stage: "Source",
      expanded: true,
      preview: "Fullstack Developer (React/Node.js) — Remote.",
    };
    render(<ArtifactCard {...data} />);

    expect(screen.getByText("Fullstack Developer (React/Node.js) — Remote.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide" })).toBeInTheDocument();
  });

  it("starts collapsed and toggles the preview on click (mockup 04, vacancy_analysis_json)", () => {
    const data: ArtifactCardData = {
      type: "vacancy_analysis_json",
      kind: "analysis",
      ext: "json",
      version: 1,
      date: "21 Jul, 09:05",
      stage: "Analysis",
      expanded: false,
      preview: '{\n  "decision": "apply",\n  "score": 75\n}',
    };
    render(<ArtifactCard {...data} />);

    expect(screen.queryByText(/"decision": "apply"/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(screen.getByText(/"decision": "apply"/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(screen.queryByText(/"decision": "apply"/)).not.toBeInTheDocument();
  });

  it("toggles expansion when the row itself is clicked", () => {
    const data: ArtifactCardData = {
      type: "vacancy_analysis_md",
      kind: "analysis",
      ext: "md",
      version: 1,
      date: "21 Jul, 09:05",
      stage: "Analysis",
      expanded: false,
      preview: "Decision: apply",
    };
    render(<ArtifactCard {...data} />);

    fireEvent.click(screen.getByText("vacancy_analysis_md"));
    expect(screen.getByText("Decision: apply")).toBeInTheDocument();
  });

  it("shows a placeholder when expanded with an empty preview", () => {
    const data: ArtifactCardData = {
      type: "vacancy_source",
      kind: "source",
      ext: "txt",
      version: 1,
      date: "21 Jul, 09:02",
      stage: "Source",
      expanded: false,
      preview: "",
    };
    render(<ArtifactCard {...data} />);

    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(screen.getByText("No preview available.")).toBeInTheDocument();
  });

  it("renders a non-empty preview for a pdf artifact regardless of ext (mockup 09)", () => {
    const data: ArtifactCardData = {
      type: "cv_export_pdf",
      kind: "pdf",
      ext: "pdf",
      version: 1,
      date: "21 Jul, 09:24",
      stage: "Export",
      expanded: true,
      preview: "[ cv_export.pdf — 2 pages ]\nTargeted CV — Fullstack Developer\nHired · 2026-07-21",
    };
    render(<ArtifactCard {...data} />);

    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText(/cv_export\.pdf — 2 pages/)).toBeInTheDocument();
  });

  it("renders a Download link when downloadUrl is present", () => {
    const data: ArtifactCardData = {
      type: "vacancy_source",
      kind: "source",
      ext: "txt",
      version: 1,
      date: "21 Jul, 09:02",
      stage: "Source",
      expanded: false,
      preview: "",
      downloadUrl: "/api/artifacts/artifact-1/download",
    };
    render(<ArtifactCard {...data} />);

    const link = screen.getByRole("link", { name: "Download" });
    expect(link).toHaveAttribute("href", "/api/artifacts/artifact-1/download");
    expect(link).toHaveAttribute("download", "vacancy_source.txt");
  });

  it("omits the Download link when downloadUrl is absent (mockup fixtures)", () => {
    const data: ArtifactCardData = {
      type: "vacancy_source",
      kind: "source",
      ext: "txt",
      version: 1,
      date: "21 Jul, 09:02",
      stage: "Source",
      expanded: false,
      preview: "",
    };
    render(<ArtifactCard {...data} />);

    expect(screen.queryByRole("link", { name: "Download" })).not.toBeInTheDocument();
  });

  it("falls back to an uppercased 3-letter badge for an unknown kind", () => {
    const data = {
      type: "custom_artifact",
      kind: "custom",
      ext: "txt",
      version: 1,
      date: "21 Jul, 09:02",
      stage: "Custom",
      expanded: false,
      preview: "",
    } as unknown as ArtifactCardData;
    render(<ArtifactCard {...data} />);

    expect(screen.getByText("CUS")).toBeInTheDocument();
  });
});
