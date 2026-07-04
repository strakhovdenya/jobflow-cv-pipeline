# Current Task

## Task ID

`TASK-034` — DONE

## Title

Add CV draft review endpoint

## Source

`docs/07_task_backlog.md`

## Context

User must review generated CV draft before export. This is the review gate shown when workspace status is `cv_draft_ready`, analogous to the existing decision gate implemented in TASK-028 for `analysis_ready`.

## Docs to Read

- `docs/07_task_backlog.md` — TASK-034
- `docs/03_domain_model.md` section 8.6 — State transition rules (`cv_draft_ready` -> `paused_after_cv_draft` -> `export_running`)
- `docs/03_domain_model.md` section 17.2 — `DecisionOverride` entity (use case: "User marks CV draft as not worth applying")
- `docs/03_domain_model.md` section 20.1 — Apply flow (CvDraft creation, status transitions)
- `docs/04_architecture.md` — CV draft review gate references (around line 742, 785, 1248)

If these sections are insufficient or conflict with the existing implementation, stop and ask.

## Existing Services / Files to Inspect

- `src/review-gates/**` (`ReviewGatesService` from TASK-028 — check whether the same service can be extended for this gate, or whether a separate gate is required by the state machine)
- `src/workspaces/**` (workspace status transition logic)
- Prisma schema: `WorkspaceStatus` enum, `DecisionOverride` model (if implemented), `CvDraft` model (from TASK-032, check if it exists as its own entity or is represented via `GeneratedArtifact`)
- `src/pipeline/prompt2/**` (to confirm how `cv_draft_ready` status is set after TASK-032/033)
- Skip flow / `SkipReasonService` (TASK-029) and override logging (TASK-030) — "mark as not worth applying" must reuse the existing skip/override mechanism, not a new one

## Files Likely Affected

```text
src/cv-drafts/**
src/review-gates/**
src/workspaces/**
```

## Acceptance Criteria

- User can approve CV draft for export (`paused_after_cv_draft` -> `export_running`).
- User can mark CV draft as not worth applying, which triggers the skip/update skip reason flow (reusing TASK-029/030 mechanisms, not reimplementing them).
- User can pause after CV draft (workspace remains in/returns to `paused_after_cv_draft`).

## Test Requirement

- Service test for approve, pause and mark-not-worth-applying transitions.
- `npm run test` must pass locally.
- Record result in `project-management/TEST_LOG.md`.

## Scope

Allowed:

- add CV draft review endpoint(s) and any small service needed to enforce the gate;
- reuse/extend `ReviewGatesService` (TASK-028) if the state machine fits naturally;
- reuse `SkipReasonService` (TASK-029) and `DecisionOverride` audit logging (TASK-030) for the "not worth applying" path;
- add/update tests for the above and update workspace status transitions per section 8.6.

Not allowed:

- implementing renderer/PDF export (TASK-035/035A/035B/036);
- implementing Prompt 3 pre-PDF check (TASK-042, P1/optional);
- changing Prompt 2 generation logic or the anti-overclaiming guard (TASK-032/033, already DONE);
- changing KnowledgeSource selection logic (TASK-018);
- adding new `WorkspaceStatus` enum values beyond what section 8.6 already defines;
- bypassing review gates;
- expanding scope to other TODO tasks (TASK-035 and later) even if adjacent.

## Done Definition

- CV draft review gate is enforced before PDF export.

## Claude Code Instructions

Before editing code:

1. Read `CLAUDE.md`.
2. Read this file fully.
3. Read all Docs to Read listed above.
4. Inspect existing `ReviewGatesService` (TASK-028) to confirm whether it can be extended for the `cv_draft_ready` gate or whether a separate service is warranted, and confirm how `SkipReasonService`/`DecisionOverride` are invoked today.
5. Confirm current `WorkspaceStatus` transitions for `cv_draft_ready` / `paused_after_cv_draft` / `export_running` match section 8.6 exactly.
6. Propose exact method signatures, endpoint routes, and file list for the CV draft review gate.
7. Wait for user approval before making code changes.

After implementation is complete, Claude Code:

1. Show each Acceptance Criterion as ✅/❌.
2. Show changed files.
3. Show test results.
4. Update `project-management/TEST_LOG.md`.
5. Suggest whether TASK-034 can be marked DONE.
6. Stop and wait for user approval.

## Git Instructions

Claude Code runs at the very start, before code changes:

```bash
git checkout -b task/TASK-034-cv-draft-review-endpoint
```

Only after user explicitly writes "approved" — Claude Code runs:

```bash
git add .
git commit -m "feat: TASK-034 add CV draft review endpoint"
git push -u origin task/TASK-034-cv-draft-review-endpoint
gh pr create --title "feat: TASK-034 CV draft review endpoint" --body "Closes TASK-034" --base main
```

Then stop completely. User handles merge, checkout main and pull.
