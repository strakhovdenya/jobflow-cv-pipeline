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

Current task: —
Current phase: `Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard`
Current goal: TASK-033 DONE. Next task to be selected by user.

## Board

| ID | Phase | Title | Status | Priority | Depends on | PR/Commit | Notes |
|---|---|---|---|---|---|---|---|
| TASK-001 | Phase 0 — Project Foundation | Initialize NestJS project structure | DONE | P0 | — | — | Health endpoint test passes, build clean |
| TASK-002 | Phase 0 — Project Foundation | Add project documentation skeleton | DONE | P0 | TASK-001 | — | docs/ present in repo from project start |
| TASK-003 | Phase 0 — Project Foundation | Add CLAUDE.md project rules | DONE | P0 | TASK-002 | — | CLAUDE.md fully written before implementation started |
| TASK-004 | Phase 0 — Project Foundation | Configure Docker Compose with persistent PostgreSQL volume | DONE | P0 | TASK-001 | — | Persistence verified: data survives down+up |
| TASK-005 | Phase 0 — Project Foundation | Add PostgreSQL persistence verification script or checklist | DONE | P0 | TASK-004 | — | Script + checklist verified PASS |
| TASK-006 | Phase 0 — Project Foundation | Add Prisma setup | DONE | P0 | TASK-004 | — | Prisma 5 LTS, DB connection verified |
| TASK-006A | Phase 0 — Project Foundation | Add unit test setup and conventions | DONE | P0 | TASK-002 | — | 3/3 tests pass, mock pattern demonstrated |
| TASK-006B | Phase 0 — Project Foundation | Add P0 unit tests for core MVP logic | TODO | P0 | TASK-006A,TASK-007,TASK-011,TASK-028,TASK-029,TASK-033 | — | — |
| TASK-007 | Phase 1 — Manual Workspace Creation | Implement company and role slug normalization utility | DONE | P0 | see docs/07_task_backlog.md | — | 25/25 tests pass, Unicode Cyrillic via \p{Script=Cyrillic} |
| TASK-008 | Phase 1 — Manual Workspace Creation | Create Company and JobVacancy Prisma models | DONE | P0 | see docs/07_task_backlog.md | PR #5 | 34/34 tests pass, migration applied |
| TASK-009 | Phase 1 — Manual Workspace Creation | Create ApplicationWorkspace Prisma model | DONE | P0 | see docs/07_task_backlog.md | PR #5 | WorkspaceStatus default source_saved enforced |
| TASK-010 | Phase 1 — Manual Workspace Creation | Implement manual workspace creation DTO validation | DONE | P0 | see docs/07_task_backlog.md | PR #6 | class-validator, empty string rejected |
| TASK-011 | Phase 1 — Manual Workspace Creation | Create workspace folder and canonical vacancy artifact | DONE | P0 | see docs/07_task_backlog.md | PR #6 | ArtifactStorageService, path safety, SHA-256 |
| TASK-012 | Phase 1 — Manual Workspace Creation | Add workspace creation endpoint | DONE | P0 | see docs/07_task_backlog.md | PR #6 | POST /workspaces, 53/53 tests pass |
| TASK-013 | Phase 1 — Manual Workspace Creation | Add workspace list and detail endpoints | DONE | P0 | see docs/07_task_backlog.md | PR #6 | GET /workspaces, GET /workspaces/:id with 404 |
| TASK-014 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Create GeneratedArtifact model and registry service | DONE | P0 | see docs/07_task_backlog.md | PR #7 | Migration applied, ArtifactsService + 70/70 tests pass |
| TASK-015 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Implement artifact hashing utility | DONE | P0 | see docs/07_task_backlog.md | PR #7 | HashService SHA-256, Cyrillic, 5 tests |
| TASK-016 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Add artifact access endpoints | DONE | P0 | see docs/07_task_backlog.md | PR #7 | GET /workspaces/:id/artifacts, GET /artifacts/:id/download, path safety |
| TASK-017 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Create KnowledgeSource model and import service | DONE | P0 | see docs/07_task_backlog.md | PR #8 | Migration applied, importSource+activate/deactivate+findActive, 82/82 tests |
| TASK-018 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Add KnowledgeSource selection for prompt steps | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-018-knowledge-source-selection | KnowledgeSourceSelectionService with step→sourceType map, Prompt1Service + Prompt2InputBuilderService use selectForStep, versionLabel in snapshots, 181/181 tests |
| TASK-019 | Phase 2 — Metadata, Artifacts & Source Knowledge Base | Create EvidenceItem model and basic seed data | DONE | P0 | see docs/07_task_backlog.md | PR #8 | 9 seed records (allowed/risky/unsupported), npx prisma db seed works |
| TASK-020 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Create PromptTemplate model and CRUD service | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-020-024-ai-pipeline-infrastructure | Migration applied, version never overwritten, one active per step enforced in service, 7/7 tests |
| TASK-021 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Seed MVP prompt templates | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-020-024-ai-pipeline-infrastructure | prisma/seed.ts seeds active Prompt 1 + Prompt 2 templates |
| TASK-022 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Create AiRun model with token usage fields | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-020-024-ai-pipeline-infrastructure | AiRunsService.saveSuccess/saveFailed, token + cost fields, 3/3 tests |
| TASK-023 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Implement AI provider abstraction interface | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-020-024-ai-pipeline-infrastructure | AiProvider interface + AI_PROVIDER token + FakeAiProvider, 6/6 tests |
| TASK-024 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Implement PromptRun model and service | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-020-024-ai-pipeline-infrastructure | create/markRunning/complete/fail, links AiRun, 5/5 tests, 103/103 total suite |
| TASK-025 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Implement Prompt 1 input builder | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-025-027-prompt1-pipeline | PromptInputBuilderService, vacancy source + template + knowledge sources, 9/9 tests |
| TASK-026 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Implement Prompt 1 vacancy analysis execution | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-025-027-prompt1-pipeline | Prompt1Service, POST /workspaces/:id/run-analysis, full PromptRun/AiRun lifecycle, 18/18 tests, 145/145 total |
| TASK-027 | Phase 3 — Prompt Templates, AI Runs & Prompt 1 | Add Prompt 1 JSON validation | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-025-027-prompt1-pipeline | validatePrompt1Json, flat result type, 13/13 tests |
| TASK-028 | Phase 4 — Skip Handling & Manual Override | Implement Prompt 1 decision gate endpoint | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-028-decision-gate | ReviewGatesService, POST /workspaces/:id/review-decision, 4-action state machine, 155/155 tests |
| TASK-029 | Phase 4 — Skip Handling & Manual Override | Implement skip reason generation | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-029-skip-reason-generation | SkipReasonService, POST /workspaces/:id/confirm-skip, skip schema, 164/164 tests |
| TASK-030 | Phase 4 — Skip Handling & Manual Override | Implement manual override logging | DONE | P0 | see docs/07_task_backlog.md | PR #13 | DecisionOverride audit model, POST /workspaces/:id/override-skip, skip artifacts preserved |
| TASK-031 | Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard | Implement Prompt 2 input builder | DONE | P0 | see docs/07_task_backlog.md | PR #14 | Prompt2InputBuilderService, guard on cv_generation_running, sourceSnapshot with hashes, 173/173 tests |
| TASK-032 | Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard | Implement Prompt 2 targeted CV generation | DONE | P0 | TASK-018 | branch task/TASK-032-prompt2-targeted-cv-generation | Prompt2Service, prompt2.schema.ts, FAKE_PROMPT2_JSON, cv_draft_ready status (§8.6), 203/203 tests pass |
| TASK-033 | Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard | Implement basic anti-overclaiming guard | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-033-anti-overclaiming-guard | EvidenceGuardService, 15 critical patterns, needs_evidence from AI evidence_table + EvidenceItem, guard integrated into Prompt2Service, 232/232 tests pass |
| TASK-034 | Phase 5 — Prompt 2 Targeted CV Draft & Anti-Overclaiming Guard | Add CV draft review endpoint | DONE | P0 | see docs/07_task_backlog.md | branch task/TASK-034-cv-draft-review-endpoint | CvDraftReviewService (submitCvDraftReview), 3-action gate (approve/pause/mark_not_worth_applying), DecisionOverride audit for mark_not_worth_applying, POST /workspaces/:id/review-cv-draft, 240/240 tests pass |
| TASK-035A | Phase 6 — PDF Export by Default: First Usable MVP | Write approved CV visual concept and flexible block rules | DONE | P0 | planning-only | planning docs | Created docs/cv-template-design/visual-concept.md and block-rules.md; clean two-column MVP layout; Prompt 2 owns content, renderer owns layout |
| TASK-035B | Phase 6 — PDF Export by Default: First Usable MVP | Define CV JSON schemas and implement flexible HTML template | TODO | P0 | TASK-034,TASK-035A | — | Use docs/cv-template-design/visual-concept.md and block-rules.md; schema must support variable bullet counts and selected personal/current projects |
| TASK-035 | Phase 6 — PDF Export by Default: First Usable MVP | Implement deterministic CV draft to HTML renderer | TODO | P0 | TASK-035B | — | — |
| TASK-036 | Phase 6 — PDF Export by Default: First Usable MVP | Implement deterministic PDF export by default | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-037 | Phase 6 — PDF Export by Default: First Usable MVP | Add optional Markdown and JSON export endpoints | TODO | P0 | see docs/07_task_backlog.md | — | — |
| TASK-037A | Phase 6 — PDF Export by Default: First Usable MVP | Implement real OpenAI provider | TODO | P0 | TASK-023 | — | — |
| TASK-037B | Phase 6 — PDF Export by Default: First Usable MVP | Seed real Prompt 1 and Prompt 2 template content | TODO | P0 | TASK-021,TASK-032,TASK-035A | — | Real Prompt 2 must implement content-selection contract: variable bullets, selected personal/current projects, evidence sources, rendering hints |
| TASK-037C | Phase 6 — PDF Export by Default: First Usable MVP | Register and activate knowledge source files | TODO | P0 | TASK-017,TASK-018 | — | — |
| TASK-037D | Phase 6 — PDF Export by Default: First Usable MVP | Complete .env setup and developer onboarding docs | TODO | P0 | TASK-037A | — | — |
| TASK-038 | Phase 6 — PDF Export by Default: First Usable MVP | Create mechanical MVP smoke test with fake provider | TODO | P0 | TASK-032,TASK-033,TASK-034,TASK-035B,TASK-035,TASK-036,TASK-037 | — | Automated fake-provider flow; proves mechanics only |
| TASK-038A | Phase 6 — PDF Export by Default: First Usable MVP | Run practical MVP real-provider smoke test | TODO | P0 | TASK-038,TASK-037A,TASK-037B,TASK-037C,TASK-037D | — | Real OpenAI + real vacancy + generated PDF; write MVP_ACCEPTANCE.md |
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
