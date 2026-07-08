# Current Task

## Status

No active task. TASK-006B (Add P0 unit tests for core MVP logic)
completed 2026-07-08 — see `TASK_BOARD.md` and `TEST_LOG.md` for closure evidence.

The P0 quality-gate requirement (TASK-006A + TASK-006B) is now satisfied — the
project is a reliable first usable MVP per `docs/07_task_backlog.md` §18.

All Acceptance Criteria met:

- [x] Unit tests cover `company_slug` normalization (pre-existing, `slug.service.spec.ts`).
- [x] Unit tests cover `role_slug` normalization with Unicode Cyrillic letters (pre-existing, `slug.service.spec.ts`).
- [x] Unit tests cover empty company / role / vacancy validation (pre-existing, `create-workspace.dto.spec.ts`).
- [x] Unit tests cover canonical artifact names, including `00_vacancy_source.txt`, `01_skip_reason.md/json`, `02_targeted_cv_content.md/json` and `04_cv_export.pdf` (pre-existing, `artifact-storage.service.spec.ts`, `skip-reason.service.spec.ts`, `prompt2.service.spec.ts`, `document-export.service.spec.ts`).
- [x] Unit tests cover skip decision behavior: create skip artifacts and stop the CV pipeline (pre-existing, `skip-reason.service.spec.ts`).
- [x] Unit tests cover blocking Prompt 2 until the user approves `apply` or `maybe` (pre-existing, `prompt2-input-builder.service.spec.ts`).
- [x] Unit tests cover manual override from `skip` to continue, with override logging required (pre-existing, `review-gates.service.spec.ts`).
- [x] Unit tests cover basic anti-overclaiming guard rules for risky claims, including AWS/DynamoDB/MySQL without evidence (pre-existing for most patterns; DynamoDB/MySQL patterns and tests added in this task, `evidence-guard.service.ts` + `evidence-guard.service.spec.ts`).

Per Operating Rules (CLAUDE.md), the next task is not selected automatically.
Recommended next task (per `TASK_BOARD.md` Current Focus): TASK-039 (Implement
workspace status transition service, Phase 7).
