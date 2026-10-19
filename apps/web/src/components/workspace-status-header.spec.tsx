import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkspaceStatusHeader } from "./workspace-status-header";
import type { WorkspaceStatusHeaderData } from "@/lib/types";

describe("WorkspaceStatusHeader", () => {
  it("renders the placeholder state before analysis has run (mockup 03)", () => {
    const data: WorkspaceStatusHeaderData = {
      company: "Hired",
      role: "Fullstack Developer · React / Node.js · Remote",
      slug: "2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote",
      statusLabel: "Source saved",
      recommendation: "—",
      decision: "—",
      score: "—",
      nextAction: "Start analysis",
    };
    render(<WorkspaceStatusHeader {...data} />);

    expect(screen.getByText("Hired · application")).toBeInTheDocument();
    expect(
      screen.getByText("Fullstack Developer · React / Node.js · Remote"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote"),
    ).toBeInTheDocument();
    expect(screen.getByText("● Source saved")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.getByText("next: Start analysis")).toBeInTheDocument();
  });

  it("renders a partially-resolved state with recommendation/score set but decision unresolved (mockup 04)", () => {
    const data: WorkspaceStatusHeaderData = {
      company: "Hired",
      role: "Fullstack Developer · React / Node.js · Remote",
      slug: "2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote",
      statusLabel: "Paused after analysis",
      recommendation: "apply",
      decision: "—",
      score: 75,
      nextAction: "Review the analysis result and decide apply/maybe/skip/pause",
    };
    render(<WorkspaceStatusHeader {...data} />);

    expect(screen.getByText("● Paused after analysis")).toBeInTheDocument();
    expect(screen.getByText("apply")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(1);
    expect(
      screen.getByText("next: Review the analysis result and decide apply/maybe/skip/pause"),
    ).toBeInTheDocument();
  });

  it("renders a copy link button when a source url is present", () => {
    const data: WorkspaceStatusHeaderData = {
      company: "Hired",
      role: "Fullstack Developer",
      slug: "2026_07_21_Hired_Fullstack_Developer",
      statusLabel: "Source saved",
      recommendation: "—",
      decision: "—",
      score: "—",
      nextAction: "Start analysis",
      sourceUrl: "https://example.com/job",
    };
    render(<WorkspaceStatusHeader {...data} />);

    expect(screen.getByRole("button", { name: "Copy vacancy link" })).toBeInTheDocument();
  });

  it("omits the copy link button without a source url", () => {
    const data: WorkspaceStatusHeaderData = {
      company: "Hired",
      role: "Fullstack Developer",
      slug: "2026_07_21_Hired_Fullstack_Developer",
      statusLabel: "Source saved",
      recommendation: "—",
      decision: "—",
      score: "—",
      nextAction: "Start analysis",
      sourceUrl: null,
    };
    render(<WorkspaceStatusHeader {...data} />);

    expect(screen.queryByRole("button", { name: "Copy vacancy link" })).not.toBeInTheDocument();
    expect(screen.getByText("Fullstack Developer")).toBeInTheDocument();
    expect(screen.getByText("2026_07_21_Hired_Fullstack_Developer")).toBeInTheDocument();
  });

  // ADR-028 follow-up: the "review" pill (raw reviewState enum: pending_review/approved/
  // overridden) was removed — it was fully redundant once recommendation vs. decision are shown
  // side by side (comparing the two already tells you whether a decision matches or overrides
  // the AI's recommendation), and "overridden" read as confusingly similar to the unrelated
  // "Override skip" action.
  it("renders a fully-resolved state without a separate review pill (mockup 05)", () => {
    const data: WorkspaceStatusHeaderData = {
      company: "Hired",
      role: "Fullstack Developer · React / Node.js · Remote",
      slug: "2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote",
      statusLabel: "CV generation running",
      recommendation: "apply",
      decision: "apply",
      score: 75,
      nextAction: "Waiting for CV draft generation to complete",
    };
    render(<WorkspaceStatusHeader {...data} />);

    expect(screen.getByText("● CV generation running")).toBeInTheDocument();
    expect(screen.getAllByText("apply")).toHaveLength(2);
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.queryByText("approved")).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(
      screen.getByText("next: Waiting for CV draft generation to complete"),
    ).toBeInTheDocument();
  });
});
