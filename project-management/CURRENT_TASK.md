# Current Task

## TASK-050 — Add application status tracking fields/endpoints

User-selected 2026-07-15 (Phase 11 — Application Tracking & Rejection Analysis).

## Status

DONE (closed 2026-07-15).

## Context

Phase 10 (Cover Letter & Recruiter Message) is complete (TASK-048, TASK-049, TASK-PH-020/021/022).
This task starts Phase 11: letting the user track a job application's lifecycle beyond CV/cover
letter generation — marking a workspace ready to apply, applied, rejected or archived.

**Scope decisions confirmed with user before implementation** (docs/07_task_backlog.md's AC only
says "workspace can be marked applied/rejected/archived/ready_to_apply" + "applied date, channel
and notes are stored" + "submitted artifact IDs can be stored" — no exact precondition statuses or
field shapes given):

- `markApplied` accepts any of `[cv_pdf_generated, final_check_ready, cover_letter_generated,
  ready_to_apply]` as the precondition — not just via `ready_to_apply`, since cover letter
  generation (Phase 2) and the optional final check are both skippable and `docs/08_ai_pipeline.md`
  independently shows "Mark Ready to Apply" after `cv_pdf_generated`/`final_check_ready` AND "Mark
  Applied" directly after `cover_letter_generated`.
- "Submitted artifact IDs" stored as two named loose-scalar fields,
  `submittedCvArtifactId`/`submittedCoverLetterArtifactId` (mirrors the existing
  `GeneratedArtifact.promptRunId`/`CoverLetterDraft.promptRunId` loose-FK convention — no enforced
  Prisma relation), passed in by the caller on `markApplied`.
- `markArchived` accepts a wide set of predecessor statuses:
  `[ready_to_apply, cv_pdf_generated, final_check_ready, cover_letter_generated, applied, rejected]`
  — any workspace that has reached CV export can be archived, not just terminal applied/rejected
  ones.

**New module follows the `review-gates/` pattern, not `WorkspaceStatusService`:** local hardcoded
valid-status arrays per method + direct `prisma.applicationWorkspace.update`, matching
`ReviewGatesService` (the majority precedent — only `CoverLetterService`/TASK-049 uses
`WorkspaceStatusService.assertValidTransition`).

## Docs to Read

- `docs/03_domain_model.md` §8.2 "Optional later fields" — `appliedAt`, `appliedVia`, `rejectedAt`,
  `rejectionSummary`, `notes` (the 5 fields this task adds verbatim from the doc).
- `docs/08_ai_pipeline.md` lines ~1397-1407 (PDF export review options, "Mark Ready to Apply"),
  ~1520-1529 (final check review options, "Mark Ready to Apply"/"Archive"), ~1671-1680 (cover
  letter review options, "Mark Applied").
- `src/review-gates/review-gates.service.ts` — the pattern to mirror (local valid-status arrays,
  `NotFoundException`/`BadRequestException`, direct prisma update, no `WorkspaceStatusService`).
- `src/review-gates/review-gates.module.ts` and `dto/cv-draft-review.dto.ts` — module/DTO shape to
  mirror.
- `src/workspaces/workspaces.controller.ts` — endpoint-per-action wiring pattern (`Prompt1Service`
  through `SkipReasonService` are all injected directly into this single controller; no per-feature
  controller).

## Key Invariants

- No `WorkspaceStatusService` involvement — this module uses its own local valid-status checks,
  consistent with `ReviewGatesService`/`SkipReasonService`/`Prompt3Service`/`Prompt5Service` (only
  `CoverLetterService` uses the shared service).
- `markArchived` also sets the existing `isArchived: true` boolean field (already on
  `ApplicationWorkspace`), in addition to `status: archived`.
- All new Prisma fields are optional (`?`) — no backfill needed for existing rows.

## State Machine

| Action | Precondition (`status` in) | `status` after | Notes |
|---|---|---|---|
| `markReadyToApply()` | `[cv_pdf_generated, final_check_ready, cover_letter_generated]` | `ready_to_apply` | — |
| `markApplied(dto)` | `[cv_pdf_generated, final_check_ready, cover_letter_generated, ready_to_apply]` | `applied` | sets `appliedAt=now()`, `appliedVia?`, `notes?`, `submittedCvArtifactId?`, `submittedCoverLetterArtifactId?` |
| `markRejected(dto)` | `[applied]` | `rejected` | sets `rejectedAt=now()`, `rejectionSummary?`, `notes?` |
| `markArchived()` | `[ready_to_apply, cv_pdf_generated, final_check_ready, cover_letter_generated, applied, rejected]` | `archived` | also sets `isArchived=true` |
| any action, workspace not found | — | — | throws `NotFoundException` |
| any action, `status` not in the listed precondition set | — | unchanged | throws `BadRequestException` |

## Acceptance Criteria

- [x] `ApplicationWorkspace` gains 7 optional fields: `appliedAt`, `appliedVia`, `rejectedAt`,
      `rejectionSummary`, `notes`, `submittedCvArtifactId`, `submittedCoverLetterArtifactId`.
      Migration applied (`npx prisma migrate dev --name add_application_tracking_fields`) and
      `npx prisma generate` run.
- [x] New `src/application-tracking/` module: `ApplicationTrackingService` with `markReadyToApply`,
      `markApplied`, `markRejected`, `markArchived`, per the State Machine table above.
- [x] `dto/mark-applied.dto.ts` (`appliedVia?`, `notes?`, `submittedCvArtifactId?`,
      `submittedCoverLetterArtifactId?`) and `dto/mark-rejected.dto.ts` (`rejectionSummary?`,
      `notes?`), class-validator + `@ApiPropertyOptional` (ADR-019).
- [x] `WorkspacesModule` imports `ApplicationTrackingModule`; `WorkspacesController` gains 4 new
      endpoints: `POST :id/mark-ready-to-apply`, `POST :id/mark-applied`, `POST :id/mark-rejected`,
      `POST :id/archive`, each `@ApiOperation`-documented.
- [x] Service tests: each method's success path + wrong-status `BadRequestException` +
      `NotFoundException` for a missing workspace.
- [x] Controller spec updated with the 4 new endpoint delegation tests.
- [x] `npm run test` all suites green; `npx tsc --noEmit` clean; `npm run test:e2e` green.
- [x] Manual smoke test: full HTTP flow driven end-to-end (export CV → mark-ready-to-apply →
      mark-applied → mark-rejected → archive), confirmed field values and the retry-guard 400.
- [x] `TASK_BOARD.md` row updated to `DONE`, PR/commit filled, `Current Focus` updated (recommend
      TASK-051 next).
- [x] `project-management/TEST_LOG.md` dated entry added.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-050 ..."`
3. `git push -u origin task/TASK-050-application-status-tracking`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
