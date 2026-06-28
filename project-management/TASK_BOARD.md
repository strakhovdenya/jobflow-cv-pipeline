# JobFlow CV Pipeline — Task Board

## Purpose

This file is the lightweight Jira replacement for the project.

`docs/07_task_backlog.md` is the source of truth for task content. This file tracks execution state only: status, current focus, dependencies, notes and commits.

## Status Legend

- `TODO` — not started.
- `IN_PROGRESS` — currently being implemented.
- `REVIEW` — implementation done, needs manual review.
- `DONE` — accepted and tested.
- `BLOCKED` — cannot continue until blocker is resolved.
- `SKIPPED` — intentionally not implemented in the current scope.

## Operating Rules

- Work on one task at a time.
- The active task must be copied to `project-management/CURRENT_TASK.md` before Claude Code starts implementation.
- Claude Code must not select a new task automatically.
- Do not mark a task as `DONE` until acceptance criteria and test requirements from `docs/07_task_backlog.md` are satisfied.
- Update `project-management/TEST_LOG.md` for commands, manual checks and persistence verification.
- Update `project-management/CHANGELOG.md` after meaningful completed work.
- Use `BLOCKED` instead of expanding scope when a task cannot be completed safely.

## Current Focus

Current task: `TASK-001`
Current phase: `Phase 0 — Project Foundation`
Current goal: create the repository foundation for a backend-first NestJS/PostgreSQL project.

## Board

| ID | Phase | Title | Status | Priority | Depends on | PR/Commit | Notes |
|---|---|---|---|---|---|---|---|
| TASK-001 | Phase 0 — Project Foundation | Initialize NestJS project structure | DONE | P0 | — | — | Health endpoint test passes, build clean |
| TASK-002 | Phase 0 — Project Foundation | Add project documentation skeleton | DONE | P0 | TASK-001 | — | docs/ present in repo from project start |
| TASK-003 | Phase 0 — Project Foundation | Add CLAUDE.md project rules | DONE | P0 | TASK-002 | — | CLAUDE.md fully written before implementation started |
| TASK-004 | Phase 0 — Project Foundation | Configure Docker Compose with persistent PostgreSQL volume | DONE | P0 | TASK-001 | — | Persistence verified: data survives down+up |
| TASK-005 | Phase 0 — Project Foundation | Add PostgreSQL persistence verification script or checklist | DONE | P0 | TASK-004 | — | Script + checklist verified PASS |
| TASK-006 | Phase 0 — Project Foundation | Add Prisma setup | DONE | P0 | TASK-004 | — | Prisma 5 LTS, DB connection verified |
| TASK-006A | Phase 0 — Project Foundation | Add unit test setup and conventions | TODO | P0 | TASK-002 | — | — |
| TASK-006B | Phase 0 — Project Foundation | Add P0 unit tests for core MVP logic | TODO | P0 | TASK-006A,TASK-007,TASK-011,TASK-028,TASK-029,TASK-033 | — | — |
| TASK-007 | Phase 1 — Manual Workspace Creation | Implement company and role slug normalization utility | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-008 | Phase 1 — Manual Workspace Creation | Create Company and JobVacancy Prisma models | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-009 | Phase 1 — Manual Workspace Creation | Create ApplicationWorkspace Prisma model | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-010 | Phase 1 — Manual Workspace Creation | Implement manual workspace creation DTO validation | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-011 | Phase 1 — Manual Workspace Creation | Create workspace folder and canonical vacancy artifact | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-012 | Phase 1 — Manual Workspace Creation | Add workspace creation endpoint | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-013 | Phase 1 — Manual Workspace Creation | Add workspace list and detail endpoints | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-014 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Create GeneratedArtifact model and registry service | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-015 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Implement artifact hashing utility | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-016 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Add artifact access endpoints | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-017 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Create KnowledgeSource model and import service | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-018 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Add KnowledgeSource selection for prompt steps | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-019 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Create EvidenceItem model and basic seed data | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-020 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Create PromptTemplate model and CRUD service | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-021 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Seed MVP prompt templates | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-022 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Create AiRun model with token usage fields | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-023 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Implement AI provider abstraction interface | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-024 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Implement PromptRun model and service | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-025 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Implement Prompt 1 input builder | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-026 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Implement Prompt 1 vacancy analysis execution | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-027 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Add Prompt 1 JSON validation | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-028 | Phase 4 — Skip Handling & Manual Override | Implement Prompt 1 decision gate endpoint | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-029 | Phase 4 — Skip Handling & Manual Override | Implement skip reason generation | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-030 | Phase 4 — Skip Handling & Manual Override | Implement manual override logging | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-031 | Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard | Implement Prompt 2 input builder | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-032 | Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard | Implement Prompt 2 targeted CV generation | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-033 | Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard | Implement basic anti-overclaiming guard | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-034 | Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard | Add CV draft review endpoint | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-035 | Phase 6 — PDF Export by Default: First Usable MVP | Implement deterministic CV draft to HTML renderer | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-036 | Phase 6 — PDF Export by Default: First Usable MVP | Implement deterministic PDF export by default | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-037 | Phase 6 — PDF Export by Default: First Usable MVP | Add optional Markdown and JSON export endpoints | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-038 | Phase 6 — PDF Export by Default: First Usable MVP | Create first usable MVP smoke test | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-039 | Phase 7 — Workspace Status, Review Gates & Artifact Access | Implement workspace status transition service | TODO | P1 | see docs/07_task_backlog.md | — | — |
| TASK-040 | Phase 7 — Workspace Status, Review Gates & Artifact Access | Add workspace artifact summary API | TODO | P1 | see docs/07_task_backlog.md | — | — |
| TASK-041 | Phase 7 — Workspace Status, Review Gates & Artifact Access | Implement artifact latest-version marking | TODO | P1 | see docs/07_task_backlog.md | — | — |
| TASK-042 | Phase 8 — P1 Safety & Quality Layer | Implement Prompt 3 pre-PDF check | TODO | P1 | see docs/07_task_backlog.md | — | — |
| TASK-043 | Phase 8 — P1 Safety & Quality Layer | Implement Prompt 5 final check | TODO | P1 | see docs/07_task_backlog.md | — | — |
| TASK-044 | Phase 8 — P1 Safety & Quality Layer | Add safer wording suggestion service | TODO | P1 | see docs/07_task_backlog.md | — | — |
| TASK-045 | Phase 9 — Basic Existing Folder Import | Implement existing folder scanner | TODO | P1 | see docs/07_task_backlog.md | — | — |
| TASK-046 | Phase 9 — Basic Existing Folder Import | Implement import preview and manual metadata correction | TODO | P1 | see docs/07_task_backlog.md | — | — |
| TASK-047 | Phase 9 — Basic Existing Folder Import | Implement import confirmation and artifact registration | TODO | P1 | see docs/07_task_backlog.md | — | — |
| TASK-048 | Phase 10 — Cover Letter & Recruiter Message | Create CoverLetterDraft model/service | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-049 | Phase 10 — Cover Letter & Recruiter Message | Implement cover letter generation step | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-050 | Phase 11 — Application Tracking & Rejection Analysis | Add application status tracking fields/endpoints | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-051 | Phase 11 — Application Tracking & Rejection Analysis | Implement rejection text artifact and analysis placeholder | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-052 | Phase 12 — Redis/BullMQ Async Processing | Add Redis to Docker Compose for later phase | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-053 | Phase 12 — Redis/BullMQ Async Processing | Implement BullMQ queue abstraction | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-054 | Phase 12 — Redis/BullMQ Async Processing | Implement queued Prompt 1 analysis worker | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-055 | Phase 13 — Frontend Dashboard | Bootstrap Next.js dashboard | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-056 | Phase 13 — Frontend Dashboard | Implement workspace creation UI | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-057 | Phase 13 — Frontend Dashboard | Implement workspace review screens | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-058 | Phase 14 — Tests, CI/CD & Portfolio Polish | Add GitHub Actions CI | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-059 | Phase 14 — Tests, CI/CD & Portfolio Polish | Add integration tests for database persistence assumptions | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-060 | Phase 14 — Tests, CI/CD & Portfolio Polish | Add README portfolio documentation | TODO | P2 | see docs/07_task_backlog.md | — | — |
| TASK-061 | Phase 14 — Tests, CI/CD & Portfolio Polish | Add architecture diagram or Mermaid flow | TODO | P2 | see docs/07_task_backlog.md | — | — |
