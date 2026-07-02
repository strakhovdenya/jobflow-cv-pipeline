# JobFlow CV Pipeline — Epic / Phase Progress

## Purpose

This file tracks progress at the epic/phase level without replacing `docs/05_epics.md` or `docs/06_roadmap.md`.

- `docs/05_epics.md` explains why each epic exists.
- `docs/06_roadmap.md` explains phase order and physical results.
- `docs/07_task_backlog.md` contains the implementation tasks.
- This file tracks completion state.

## Progress Rules

- Update this file only after task status changes in `TASK_BOARD.md`.
- A phase is `DONE` only when all required tasks in that phase are `DONE` and verification is recorded in `TEST_LOG.md`.
- P1/P2 phases must not be treated as MVP blockers unless explicitly moved into P0.

## Phase Progress

| ID | Phase | Status | Total tasks | Done tasks | Progress | Notes |
|---|---|---|---:|---:|---:|---|
| PHASE-01 | Phase 0 — Project Foundation | IN_PROGRESS | 8 | 7 | 88% | TASK-006B pending (P0 unit tests, depends on later tasks) |
| PHASE-02 | Phase 1 — Manual Workspace Creation | DONE | 7 | 7 | 100% | POST/GET /workspaces, folder + vacancy artifact, DTO validation |
| PHASE-03 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | DONE | 6 | 6 | 100% | TASK-014–019 all DONE including TASK-018 KnowledgeSourceSelectionService |
| PHASE-04 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | DONE | 8 | 8 | 100% | TASK-020–027 all DONE |
| PHASE-05 | Phase 4 — Skip Handling & Manual Override | DONE | 3 | 3 | 100% | TASK-028–030 all DONE |
| PHASE-06 | Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard | IN_PROGRESS | 4 | 2 | 50% | TASK-031–032 DONE; TASK-033–034 pending |
| PHASE-07 | Phase 6 — PDF Export by Default: First Usable MVP | IN_PROGRESS | 11 | 1 | 9% | TASK-035A planning docs done: visual-concept.md and block-rules.md; implementation tasks still pending |
| PHASE-08 | Phase 7 — Workspace Status, Review Gates & Artifact Access | TODO | 3 | 0 | 0% | — |
| PHASE-09 | Phase 8 — P1 Safety & Quality Layer | TODO | 3 | 0 | 0% | — |
| PHASE-10 | Phase 9 — Basic Existing Folder Import | TODO | 3 | 0 | 0% | — |
| PHASE-11 | Phase 10 — Cover Letter & Recruiter Message | TODO | 2 | 0 | 0% | — |
| PHASE-12 | Phase 11 — Application Tracking & Rejection Analysis | TODO | 2 | 0 | 0% | — |
| PHASE-13 | Phase 12 — Redis/BullMQ Async Processing | TODO | 3 | 0 | 0% | — |
| PHASE-14 | Phase 13 — Frontend Dashboard | TODO | 3 | 0 | 0% | — |
| PHASE-15 | Phase 14 — Tests, CI/CD & Portfolio Polish | TODO | 4 | 0 | 0% | — |

## Current MVP Boundary

First usable MVP ends at TASK-038A. TASK-038 is the mechanical fake-provider smoke test; TASK-038A is the practical real-provider smoke test. Required before TASK-038A:

- Knowledge source selection before Prompt 2: TASK-018
- Prompt 2 pipeline: TASK-032–034
- CV visual concept + flexible block rules: TASK-035A DONE (`docs/cv-template-design/visual-concept.md`, `docs/cv-template-design/block-rules.md`)
- CV schemas + HTML renderer + PDF export: TASK-035B, TASK-035–037
- Real AI provider: TASK-037A
- Real prompt content: TASK-037B
- Knowledge source files registered: TASK-037C
- .env + onboarding docs: TASK-037D
- Mechanical fake-provider smoke test: TASK-038
- Practical real-provider smoke test and MVP acceptance note: TASK-038A

Prompt 3, Prompt 5, import existing folders, cover letter, Redis/BullMQ and Next.js dashboard are not MVP blockers.
