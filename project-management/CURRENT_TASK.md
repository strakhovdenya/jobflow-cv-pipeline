# Current Task

## Task ID

`TASK-032A` — DONE

> Source: blocker discovered during TASK-035 implementation. Blocks TASK-035 until resolved.

## Title

Add missing `current_work_block` field to Prompt2CvContent schema and fake provider fixture

## Context

TASK-035's Mapping Contract assumes `current_work_block` is a top-level field of `Prompt2Output.cv_content`, per the documented example in `docs/08_ai_pipeline.md` §10.4 and `docs/03_domain_model.md` §23.

During TASK-035 implementation, Claude Code found a real discrepancy:

- `Prompt2CvContent` (`src/pipeline/schemas/prompt2.schema.ts`) does NOT declare `current_work_block`.
- `FAKE_PROMPT2_JSON` (`src/ai/providers/fake.provider.ts`) does NOT include `current_work_block` in its fixture.
- `CvContent` (`src/pipeline/schemas/cv-content.schema.ts`) declares `current_work_block: CvCurrentWorkBlock` as **required**.

This means the field was documented and designed for, but never actually added to the TASK-032 implementation — a gap left over from TASK-032, not a new decision. This task closes that gap, and only that gap.

## Docs to Read

- `docs/08_ai_pipeline.md` — section 10.4, `current_work_block` shape in the example JSON (lines ~779-814)
- `docs/03_domain_model.md` — section 23.1, `CvCurrentWorkBlock` type reference
- `src/pipeline/schemas/prompt2.schema.ts` — full file
- `src/pipeline/schemas/cv-content.schema.ts` — full file, specifically `CvCurrentWorkBlock` type definition (reuse this type/shape, don't invent a new one)
- `src/ai/providers/fake.provider.ts` — full file

## Files Likely Affected

```text
src/pipeline/schemas/prompt2.schema.ts
src/ai/providers/fake.provider.ts
project-management/DECISIONS.md   ← add ADR documenting this fix
project-management/CHANGELOG.md
project-management/TASK_BOARD.md
```

## Key Invariants

- The shape of the added `current_work_block` field must match `CvCurrentWorkBlock` from `cv-content.schema.ts` (or a documented subset of it, if Prompt 2's output is intentionally narrower — decide and document, don't guess silently).
- Do not touch `experience[]`, `selected_projects[]`, or any other existing field in `Prompt2CvContent`.
- Do not touch `HtmlRendererService` or anything under `src/document-export/` — that belongs to TASK-035, not this task.
- Do not change `Prompt2Service` business logic beyond what's needed to pass the new field through (if it currently strips unknown fields or validates strictly, adjust only what's required for `current_work_block` to survive).
- This is a schema/fixture fix, not a re-opening of TASK-032's content-selection logic.

## Acceptance Criteria

- [ ] `Prompt2CvContent` interface includes `current_work_block: <CvCurrentWorkBlock or documented equivalent>`.
- [ ] `FAKE_PROMPT2_JSON.cv_content` includes a realistic `current_work_block` object matching the shape in `docs/08_ai_pipeline.md` §10.4.
- [ ] Existing Prompt2Service validation (if any) accepts the new field without rejecting valid payloads.
- [ ] `npm run test` passes with the same or greater test count as before (no regressions).
- [ ] `npx tsc --noEmit` passes cleanly.
- [ ] `DECISIONS.md` contains a short ADR entry noting: field was documented in TASK-032's spec intent but missing from implementation; added here without changing TASK-032's other acceptance criteria retroactively.
- [ ] `CHANGELOG.md` updated with a one-line entry.
- [ ] `TASK_BOARD.md` updated: TASK-032A added and marked DONE; note that it unblocks TASK-035.

## Test Requirement

- Run `npm run test` before making changes — record baseline count.
- Add/update unit test(s) confirming `Prompt2CvContent` type accepts `current_work_block` and that `FAKE_PROMPT2_JSON` parses/validates successfully with it present.
- Run `npm run test` again — count must be baseline + new tests, zero failures.
- Run `npx tsc --noEmit` — must pass cleanly.
- Record results in `project-management/TEST_LOG.md`.

## Scope

**Allowed:**

- Add `current_work_block` field to `Prompt2CvContent`.
- Add matching fixture data to `FAKE_PROMPT2_JSON`.
- Minimal validation adjustments strictly required for the new field to pass through Prompt2Service without being stripped/rejected.
- Add ADR to `DECISIONS.md`, update `CHANGELOG.md` and `TASK_BOARD.md`.

**Not allowed:**

- Touching `HtmlRendererService` or any file under `src/document-export/` (that's TASK-035).
- Re-deciding or changing how `experience[]` or `selected_projects[]` work.
- Adding new AI prompt logic to actually generate `current_work_block` content dynamically (the real prompt template content is out of scope — this task only fixes the schema/fixture gap; real prompt template work is TASK-037B).
- Any workspace status transition changes.
- Any Prisma schema change.

## Done Definition

`Prompt2CvContent` and `FAKE_PROMPT2_JSON` both include `current_work_block` matching the documented shape. TASK-035's Mapping Contract assumption ("direct copy from `Prompt2Output.cv_content.current_work_block`") becomes true in the actual codebase. TASK-035 can resume.

## Claude Code Instructions

Before editing code:

1. Read `CLAUDE.md` and this file fully.
2. Read `docs/08_ai_pipeline.md` §10.4 and `docs/03_domain_model.md` §23.1 to confirm the exact expected shape of `current_work_block`.
3. Read `src/pipeline/schemas/cv-content.schema.ts` to reuse `CvCurrentWorkBlock` type/shape rather than inventing a new one.
4. Run `npm run test` — record baseline count.
5. Make changes strictly within Scope above.

After implementation is complete, Claude Code:

1. Show each Acceptance Criterion as ✅/❌.
2. Show changed files.
3. Show test results (before vs after count).
4. Update `project-management/TEST_LOG.md`.
5. Suggest whether TASK-032A can be marked DONE.
6. Stop and wait for user approval before committing.

## Git Instructions

Claude Code runs at the very start, before code changes:

```bash
git checkout -b task/TASK-032A-current-work-block-fix
```

Only after user explicitly writes "approved" — Claude Code runs:

```bash
git add .
git commit -m "fix: TASK-032A add missing current_work_block field to Prompt2CvContent and fake fixture"
git push -u origin task/TASK-032A-current-work-block-fix
gh pr create --title "fix: TASK-032A current_work_block schema gap" --body "Unblocks TASK-035. Closes TASK-032A" --base main
```

Then stop completely. User handles merge, checkout main and pull.
