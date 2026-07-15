# Current Task

## TASK-051 — Implement rejection text artifact and analysis placeholder

User-selected 2026-07-15 (Phase 11 — Application Tracking & Rejection Analysis).

## Status

DONE (closed 2026-07-16).

## Context

TASK-050 added `ApplicationWorkspace.rejectionSummary` (short DB field, set via `markRejected`).
This task adds a way to save the **full** rejection text (e.g. a recruiter's rejection email or
detailed feedback) as a physical artifact, per `docs/07_task_backlog.md` TASK-051 — richer content
belongs on the filesystem per ADR-002, not squeezed into a DB column.

**Scope decisions confirmed with user before implementation** (backlog AC only says "user can save
rejection text as artifact" + "optional later AI analysis can be linked to PromptRun/AiRun" + "no
automatic source rule updates without approval" — no exact precondition or artifact naming given):

- Precondition: workspace `status` must already be `rejected` (set via TASK-050's `markRejected`).
  Mirrors every other mutation service in this codebase (local valid-status guard, throws
  `BadRequestException` otherwise).
- Artifact naming: unnumbered canonical name `rejection_feedback.md` (mirrors `cover_letter.md` —
  doesn't fit the numbered 00_/01_/02_ pipeline since it happens after the pipeline ends).
  `artifactType: 'rejection_feedback'`, `origin: 'pasted'` (matches the existing user-provided-text
  convention used for `00_vacancy_source.txt`).
- "Optional later AI analysis can be linked to PromptRun/AiRun": satisfied structurally —
  `GeneratedArtifact.promptRunId` is already nullable (no schema change needed). No AI service is
  built in this task; this is the "placeholder" — a real `rejection_analysis` AI step (already named
  in `docs/03_domain_model.md` §5.4/§9) is future work, not part of TASK-051.
- "No automatic source rule updates without approval": a documentation constraint, not a code path
  to implement — this task must not add any code that auto-updates `EvidenceItem`/knowledge sources
  from rejection text.

**New module follows the `application-tracking/` pattern**: local hardcoded valid-status array +
direct `prisma.applicationWorkspace` read (for the status guard) + `ArtifactStorageService.writeFile`
+ `ArtifactsService.register` (same primitives `WorkspacesService.createWorkspace` uses for
`00_vacancy_source.txt`).

## Docs to Read

- `docs/07_task_backlog.md` lines 1940-1960 (TASK-051 entry, verbatim AC).
- `src/workspaces/workspaces.service.ts` lines 52-119 — `createWorkspace()`: the exact
  write-file-then-register-artifact pattern to mirror (`ArtifactStorageService.writeFile` +
  `ArtifactsService.register`, `origin: 'pasted'`).
- `src/application-tracking/application-tracking.service.ts` — local valid-status-array +
  `findWorkspaceOrThrow`/`assertStatus` pattern to mirror for the status guard.
- `src/artifacts/artifact-storage.service.ts` — `writeFile(workspaceFolderPath, fileName, content)`
  signature (returns `{ filePath, hash }`).
- `src/artifacts/artifacts.service.ts` — `RegisterArtifactDto` shape, `register()` method.
- `src/workspaces/workspaces.controller.ts` — endpoint-per-action wiring pattern; new endpoint goes
  here alongside the other `application-tracking` endpoints.
- `src/workspaces/workspaces.module.ts` — module import list to extend with the new `RejectionsModule`.

## Key Invariants

- No AI call, no `PromptRun`/`AiRun` created — this is a deterministic save, same class of operation
  as `document-export` (ADR-012), not a prompt pipeline step.
- `GeneratedArtifact.promptRunId` stays `undefined`/`null` for this artifact — the field already
  supports a future link, so no schema change is needed to satisfy that AC.
- Must use `ArtifactStorageService`'s existing path-safety guard (`writeFile` already calls
  `assertInsideStorageRoot` internally) — do not bypass it with raw `fs` calls.

## State Machine

| Action | Precondition (`status` in) | `status` after | Notes |
|---|---|---|---|
| `saveRejectionText(workspaceId, dto)` | `[rejected]` | unchanged | writes `rejection_feedback.md`, registers `GeneratedArtifact` (`artifactType: 'rejection_feedback'`, `origin: 'pasted'`) |
| workspace not found | — | — | throws `NotFoundException` |
| `status` not `rejected` | — | unchanged | throws `BadRequestException` |

## Acceptance Criteria

- [x] New `src/rejections/` module: `RejectionsService.saveRejectionText(workspaceId, dto)` — guards
      `status === rejected`, writes `rejection_feedback.md` via `ArtifactStorageService.writeFile`,
      registers via `ArtifactsService.register` (`artifactType: 'rejection_feedback'`,
      `origin: 'pasted'`, `mimeType: 'text/markdown'`).
- [x] `dto/save-rejection-text.dto.ts` (`text: string`, required, class-validator
      `@IsString()`/`@IsNotEmpty()`, `@ApiProperty()` per ADR-019).
- [x] `WorkspacesModule` imports `RejectionsModule`; `WorkspacesController` gains
      `POST :id/rejection-text` endpoint, `@ApiOperation`-documented.
- [x] Service tests: success path (correct file + artifact registration) + wrong-status
      `BadRequestException` + `NotFoundException` for a missing workspace.
- [x] Controller spec updated with the new endpoint delegation test.
- [x] `npm run test` all suites green; `npx tsc --noEmit` clean; `npm run test:e2e` green.
- [x] Manual smoke test: full HTTP flow (export CV → mark-ready-to-apply → mark-applied →
      mark-rejected → save rejection text), confirm file written to disk + `GeneratedArtifact` row.
- [x] `TASK_BOARD.md` row updated to `DONE`, PR/commit filled, `Current Focus` updated (recommend
      next task).
- [x] `project-management/TEST_LOG.md` dated entry added.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-051 ..."`
3. `git push -u origin task/TASK-051-rejection-text-artifact`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
