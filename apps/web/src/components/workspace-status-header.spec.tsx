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
      reviewState: "—",
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
    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(screen.getByText("next: Start analysis")).toBeInTheDocument();
  });

  it("renders a partially-resolved state with recommendation/score set but decision/reviewState unresolved (mockup 04)", () => {
    const data: WorkspaceStatusHeaderData = {
      company: "Hired",
      role: "Fullstack Developer · React / Node.js · Remote",
      slug: "2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote",
      statusLabel: "Paused after analysis",
      recommendation: "apply",
      decision: "—",
      score: 75,
      reviewState: "—",
      nextAction: "Review the analysis result and decide apply/maybe/skip/pause",
    };
    render(<WorkspaceStatusHeader {...data} />);

    expect(screen.getByText("● Paused after analysis")).toBeInTheDocument();
    expect(screen.getByText("apply")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(
      screen.getByText("next: Review the analysis result and decide apply/maybe/skip/pause"),
    ).toBeInTheDocument();
  });

  it("renders a fully-resolved state with an approved review state (mockup 05)", () => {
    const data: WorkspaceStatusHeaderData = {
      company: "Hired",
      role: "Fullstack Developer · React / Node.js · Remote",
      slug: "2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote",
      statusLabel: "CV generation running",
      recommendation: "apply",
      decision: "apply",
      score: 75,
      reviewState: "approved",
      nextAction: "Waiting for CV draft generation to complete",
    };
    render(<WorkspaceStatusHeader {...data} />);

    expect(screen.getByText("● CV generation running")).toBeInTheDocument();
    expect(screen.getAllByText("apply")).toHaveLength(2);
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("approved")).toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(
      screen.getByText("next: Waiting for CV draft generation to complete"),
    ).toBeInTheDocument();
  });
});
