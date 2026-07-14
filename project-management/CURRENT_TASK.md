# Current Task

## TASK-048 — Create CoverLetterDraft model/service

User-selected 2026-07-14 (Phase 10 start — Cover Letter & Recruiter Message).

## Status

DONE (closed 2026-07-14).

## Context

Cover letter generation is Phase 2 (ADR-010), and Phase 9 (Basic Existing Folder Import) is complete
(TASK-045/046/047 DONE, TASK-PH-019 gap closed). This task creates the `CoverLetterDraft` Prisma model
and a service to create draft records. The actual generation logic (calling an AI prompt, writing
`cover_letter.md/pdf` artifacts) is out of scope — that is TASK-049.

**Doc/schema conflict resolved with user before implementation:** `docs/03_domain_model.md` §16.2
specifies `CoverLetterDraft.cvDraftId` referencing a `CvDraft` model. `CvDraft` was never implemented
in this codebase — there is no `CvDraft` model in `prisma/schema.prisma`; TASK-035 mapped
`Prompt2Output` directly to `CvContent` for rendering with no DB draft record. The real
`GeneratedArtifact` model also lacks the `cvDraftId`/`coverLetterDraftId` columns the docs describe —
it only has `workspaceId` + `promptRunId`. User confirmed: drop `cvDraftId`, link `CoverLetterDraft`
only to `workspaceId` + `promptRunId` (matching the real `GeneratedArtifact` pattern), and gate
"CV exists" via `workspace.status` instead of a FK.

## Docs to Read

- `docs/03_domain_model.md` section 16 (`Entity: CoverLetterDraft`, lines ~1412–1479) — target shape,
  with the `cvDraftId` field explicitly NOT carried over (see Context above).
- `prisma/schema.prisma` — `ApplicationWorkspace` model (for the new back-relation) and
  `GeneratedArtifact` model (the `promptRunId` loose-scalar-FK precedent to mirror).
- `src/review-gates/review-gates.service.ts` `overrideSkip()` (~line 140) — confirms manual override
  already transitions `workspace.status` away from `skipped`, so the new guard only needs to check
  `status !== skipped`, no separate override-flag check.

## Key Invariants

- No `CvDraft` model exists; do not add one in this task (out of scope per user decision above).
- No controller/HTTP endpoint in this task — service only. `AppModule` must NOT import the new module
  yet (no controller = nothing to route), per ADR-017 rule 1.
- `letterType` is a plain `String` (matches `GeneratedArtifact.artifactType`/`origin` categorical-tag
  convention), while `status` is a proper Prisma enum (matches `WorkspaceStatus`/`VacancyDecision`
  style, since it drives gate-style logic).
- `promptRunId` on `CoverLetterDraft` is a plain optional scalar with no enforced Prisma relation,
  mirroring `GeneratedArtifact.promptRunId`.

## State Machine

| Action | Precondition | `status` after | Notes |
|---|---|---|---|
| `create()` called, workspace found, `workspace.status !== skipped` | workspace exists | `CoverLetterDraft.status = draft_ready` | New row created |
| `create()` called, workspace found, `workspace.status === skipped` | workspace exists | — | Throws `BadRequestException`, no row created |
| `create()` called, workspace not found | — | — | Throws `NotFoundException` |

## Acceptance Criteria

- [x] `CoverLetterDraft` Prisma model added (fields: `id`, `workspaceId`, `promptRunId?`, `version`
      default 1, `status` enum default `draft_ready`, `letterType`, `summaryPreview?`, `approvedAt?`,
      `createdAt`, `updatedAt`); links to `ApplicationWorkspace` via `workspaceId`.
- [x] Migration applied (`npx prisma migrate dev --name add_cover_letter_draft`) and
      `npx prisma generate` run.
- [x] `CoverLetterDraftsService.create()` stores `status` and accepts optional markdown/PDF artifact
      linkage inputs — implemented as `letterType`/`promptRunId` on the draft row; actual artifact
      rows are created later by TASK-049 using the same `workspaceId`+`promptRunId` pattern as
      `04_cv_export.*` (no `coverLetterDraftId` FK, consistent with `GeneratedArtifact`'s existing
      loose-linking convention).
- [x] `create()` cannot succeed for a workspace with `status === skipped` (throws
      `BadRequestException`); succeeds once a manual override has moved the workspace out of
      `skipped` (e.g. `cv_generation_running`), matching the existing `overrideSkip()` flow.
- [x] Service test: create cover letter draft for a workspace after CV exists
      (`status === cv_pdf_generated`).
- [x] `npm run test` all suites green; `npx tsc --noEmit` clean.
- [x] `TASK_BOARD.md` row updated to `DONE`, PR/commit filled, `Current Focus` updated (recommend
      TASK-049 next).
- [x] `project-management/TEST_LOG.md` dated entry added.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-048 ..."`
3. `git push -u origin task/TASK-048-cover-letter-draft-model-service`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
