# Current Task

## Task ID

`TASK-035B` — DONE

> Next task to be selected by user. See `project-management/TASK_BOARD.md`.

## Title

Define CV JSON schemas and implement flexible HTML template

## Source

`docs/07_task_backlog.md`

## Context

Based on the approved visual concept and block rules from TASK-035A, define the exact `02_targeted_cv_content.json` and `03_pre_pdf_check.json` schemas and implement the HTML template. The template must be as flexible as the AI's previous output — sections render only when content exists, Prompt 3 corrections apply as a layer on top without modifying original artifacts.

## Docs to Read

- `docs/07_task_backlog.md` — TASK-035B
- `docs/cv-template-design/visual-concept.md` — approved visual concept (TASK-035A)
- `docs/cv-template-design/block-rules.md` — flexible block rules (TASK-035A)
- `docs/03_domain_model.md` section 8.6 — State transition rules (`cv_draft_ready` -> `pre_pdf_check_ready`, note on Prompt 3 being P1/optional)
- `docs/03_domain_model.md` — artifact naming: `02_targeted_cv_content.md/json`, `03_pre_pdf_check.md/json` (see lines ~59-60, ~938-956, ~1268-1271)
- `docs/04_architecture.md` — CV draft / export pipeline references

If these sections are insufficient or conflict with the existing implementation, stop and ask.

## Existing Services / Files to Inspect

- `src/pipeline/prompt2/**` (Prompt2Service, prompt2.schema.ts — confirm exact shape of `02_targeted_cv_content.json` as currently produced, from TASK-032/033)
- `src/cv-drafts/**` (CvDraftReviewService from TASK-034 — confirm how the CV draft artifact is currently read/referenced)
- `src/review-gates/**` (confirm no overlap — this task does not touch review gates)
- Prisma schema: `GeneratedArtifact` model (confirm how JSON artifacts are stored/versioned; no schema changes expected unless section 8.6 requires it)
- `docs/cv-template-design/visual-concept.md` and `block-rules.md` for exact section list, ordering (current-work before Professional Experience), and optional-section conditions

## Files Likely Affected

```text
src/pipeline/schemas/cv-content.schema.ts
src/pipeline/schemas/pre-pdf-check.schema.ts
src/document-export/templates/cv.template.html
docs/03_domain_model.md
```

## Acceptance Criteria

- `02_targeted_cv_content.json` schema defined and validated: contact info, summary, current-work block, experience sections (commercial vs personal), skills, education, language risks, selected current/personal projects with inclusion flags, all optional sections from TASK-035A block rules.
- `03_pre_pdf_check.json` schema defined: list of correction items referencing specific fields, with suggested replacement text and severity.
- HTML template renders all required sections and conditionally renders optional sections per TASK-035A rules.
- HTML template renders the bullet arrays and selected project blocks exactly as provided by Prompt 2; it does not generate, rewrite or remove bullets except by explicit Prompt 2 rendering hints / priorities.
- Template accepts optional Prompt 3 corrections map and applies field-level overrides before rendering — original JSON artifacts unchanged.
- Template renders correctly with no Prompt 3 corrections present.
- Template renders correctly with Prompt 3 corrections applied.

## Test Requirement

- Unit test: render with only Prompt 2 content — all required sections present, absent optional sections not rendered.
- Unit test: render with Prompt 2 + Prompt 3 corrections — corrected fields reflect Prompt 3 text.
- Unit test: schema validator rejects malformed `02_targeted_cv_content.json`.
- Unit test: renderer uses Prompt 2 bullet arrays as-is and does not generate or rewrite bullet text.
- Unit test: renderer renders current-work block before Professional Experience for new external CV/PDF/HTML outputs.
- Unit test: renderer renders selected current/personal projects only when Prompt 2 marks them for inclusion.
- `npm run test` must pass locally.
- Record result in `project-management/TEST_LOG.md`.

## Scope

Allowed:

- define `cv-content.schema.ts` and `pre-pdf-check.schema.ts` matching TASK-035A design docs;
- implement `cv.template.html` (flexible, conditional sections);
- implement the field-level override mechanism for Prompt 3 corrections (schema + template support only — no Prompt 3 execution logic);
- add/update unit tests for schema validation and template rendering;
- update `docs/03_domain_model.md` if schema definitions need to be documented there.

Not allowed:

- implementing the deterministic CV draft to HTML renderer service/pipeline wiring (TASK-035);
- implementing PDF export (TASK-036);
- implementing Prompt 3 pre-PDF check generation logic (TASK-042, P1/optional) — only the JSON schema for its output is in scope;
- changing Prompt 2 generation logic or the anti-overclaiming guard (TASK-032/033, already DONE);
- changing CV draft review gate logic (TASK-034, already DONE);
- adding new `WorkspaceStatus` enum values;
- revisiting or altering the approved visual concept / block rules from TASK-035A;
- expanding scope to other TODO tasks (TASK-035 and later) even if adjacent.

## Done Definition

Both schemas validated and documented. HTML template renders a flexible, visually consistent CV matching the approved concept from TASK-035A.

## Claude Code Instructions

Before editing code:

1. Read `CLAUDE.md`.
2. Read this file fully.
3. Read all Docs to Read listed above, especially `visual-concept.md` and `block-rules.md`.
4. Inspect current `02_targeted_cv_content.json` shape as produced by Prompt2Service (TASK-032/033) to confirm the schema matches real output, not just the design doc.
5. Confirm optional-section conditions and current-work-before-experience ordering match TASK-035A exactly.
6. Propose exact schema field definitions (cv-content.schema.ts, pre-pdf-check.schema.ts), template structure, and file list.
7. Wait for user approval before making code changes.

After implementation is complete, Claude Code:

1. Show each Acceptance Criterion as ✅/❌.
2. Show changed files.
3. Show test results.
4. Update `project-management/TEST_LOG.md`.
5. Suggest whether TASK-035B can be marked DONE.
6. Stop and wait for user approval.

## Git Instructions

Claude Code runs at the very start, before code changes:

```bash
git checkout -b task/TASK-035B-cv-schemas-html-template
```

Only after user explicitly writes "approved" — Claude Code runs:

```bash
git add .
git commit -m "feat: TASK-035B define CV JSON schemas and flexible HTML template"
git push -u origin task/TASK-035B-cv-schemas-html-template
gh pr create --title "feat: TASK-035B CV JSON schemas and HTML template" --body "Closes TASK-035B" --base main
```

Then stop completely. User handles merge, checkout main and pull.
