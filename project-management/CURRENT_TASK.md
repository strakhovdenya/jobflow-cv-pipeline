# Current Task

## Status

No active task. TASK-042 (Implement Prompt 3 pre-PDF check) is complete —
see `TASK_BOARD.md` for closure details and the recommended next task
(TASK-043).

## Docs to Read

- `docs/07_task_backlog.md` lines 1701–1731 (TASK-042 acceptance/test/done definition)
- `src/pipeline/schemas/pre-pdf-check.schema.ts` — existing `PrePdfCheckOutput`/`PrePdfCheckCorrection` types + `validatePrePdfCheckJson()` (already consumed by Step 4 renderer)
- `src/document-export/html-renderer.service.ts` lines 85–110 — how `03_pre_pdf_check.json` is already read and applied by Step 4 (read side is done; this task adds the write/generation side)
- `src/pipeline/prompt2/prompt2.service.ts` — full method body, pattern to mirror (PromptRun/AiRun lifecycle, artifact writes, error paths)
- `src/pipeline/prompt2/prompt2-input-builder.service.ts` — full file, pattern to mirror for `Prompt3InputBuilderService`
- `src/review-gates/review-gates.service.ts` lines 15–25, 205–245 — confirms `cv_draft_ready` / `paused_after_cv_draft` are the pre-export statuses; `export_running` is set only by CV draft approval
- `src/workspaces/workspace-status.service.ts` — full file; `pre_pdf_check_ready` exists in the enum but has zero wired transitions — do not wire it in for this task (see Scope Decision)
- `src/ai/providers/fake.provider.ts` lines 195–260 — `FAKE_PROMPT1_JSON`/`FAKE_PROMPT2_JSON` pattern and the `options.step` branch to extend
- `prisma/seed.ts` lines 82–101 — `promptTemplates` seed array pattern to extend with a `prompt_3` placeholder entry
- `src/pipeline/pipeline.module.ts` — full file, module wiring pattern
- `src/workspaces/workspaces.controller.ts` lines 56–66 — endpoint pattern to mirror for `POST /workspaces/:id/run-pre-pdf-check`
- `src/artifacts/artifacts.service.ts` — `register()` signature (workspaceId, promptRunId, artifactType, canonicalFileName, filePath, storageRoot, contentHash, origin, mimeType)
- `src/prompt-runs/prompt-runs.service.ts` — `create()`/`markRunning()`/`complete()`/`fail()` signatures

## Scope Decision

- **Gate:** Prompt 3 runs only when `workspace.status` is `cv_draft_ready` or
  `paused_after_cv_draft` (the same two pre-export statuses the CV draft
  review gate itself accepts — see `review-gates.service.ts`). Any other
  status throws `BadRequestException`.
- **No workspace status change.** Running Prompt 3 does not update
  `workspace.status`. `WorkspaceStatus.pre_pdf_check_ready` exists in the
  Prisma enum but has zero wired transitions in `workspace-status.service.ts`
  today; wiring it in is out of scope for this task (confirmed with user) and
  matches the AC: "default MVP flow should not depend on it."
- **Schema change:** `PrePdfCheckOutput` (in
  `src/pipeline/schemas/pre-pdf-check.schema.ts`) gains a required
  `readiness: 'ready' | 'ready_with_minor_edits' | 'not_ready'` field, plus
  validation in `validatePrePdfCheckJson()`. This is required by the AC
  ("Produces readiness value...") and was missing from the schema written in
  TASK-035B/036 era. Existing fixtures in `cv-content.schema.spec.ts` and
  `html-renderer.service.spec.ts` (`makePrePdfCheckJson()`) must be updated to
  include `readiness` so they keep passing validation (confirmed with user).
- **Template seeding:** add a minimal placeholder `prompt_3` PromptTemplate
  (new `prisma/prompts/prompt3.txt` + new entry in `prisma/seed.ts`
  `promptTemplates` array), matching the pre-TASK-037B pattern for
  prompt_1/prompt_2. Real prompt-engineering content is out of scope here —
  same reasoning as why TASK-037B was its own dedicated task (confirmed with
  user).
- **New files:**
  - No separate `prompt3.schema.ts` AI-output schema file. Prompt 3's AI
    output *is* `PrePdfCheckOutput` from `pre-pdf-check.schema.ts` (already
    exists and is already consumed by the renderer). No duplicate schema file
    will be created, despite the backlog's "files likely affected" list
    mentioning `prompt3.schema.ts` — that file would just re-declare the same
    shape. Flagging this deviation explicitly per Insufficient Context Rule.
  - `src/pipeline/prompt3/prompt3-input-builder.service.ts` — mirrors
    `Prompt2InputBuilderService`; reads `02_targeted_cv_content.json`
    (required — throws if missing) and `01_vacancy_analysis.json` (optional
    context) from the workspace folder.
  - `src/pipeline/prompt3/prompt3.service.ts` — mirrors `Prompt2Service`;
    orchestrates PromptRun/AiRun lifecycle, calls AI provider with
    `step: 'prompt_3'`, validates with `validatePrePdfCheckJson`, writes
    `03_pre_pdf_check.md` + `.json` via `ArtifactStorageService`, registers
    both via `ArtifactsService.register()` with `origin: 'prompt_3'`.
  - `POST /workspaces/:id/run-pre-pdf-check` added to `workspaces.controller.ts`,
    delegating to `Prompt3Service.runPrePdfCheck()`.
  - `FAKE_PROMPT3_JSON` added to `fake.provider.ts`, selected when
    `options.step === 'prompt_3'`.
- **Artifact types:** `pre_pdf_check_md` / `pre_pdf_check_json` (new
  `artifactType` strings, consistent with existing `vacancy_analysis_md/json`,
  `targeted_cv_content_md/json` naming).
- **No `AiRun` skip:** unlike Step 4 (export), Prompt 3 **is** an AI prompt —
  it must create `PromptRun` + `AiRun` records, same as Prompt 1/2 (ADR-012
  only exempts Step 4).

## Key Invariants

- Step 4 (`html-renderer.service.ts`) already reads `03_pre_pdf_check.json`
  and applies `corrections` when present, and works fine when the file is
  absent (export must not require Prompt 3 artifacts). This task must not
  change that read-side behavior, only add the write side.
- `PromptRun` links to `PromptTemplate` version and `AiRun`; `GeneratedArtifact`
  links to `PromptRun` (per CLAUDE.md Key Invariants).
- Filesystem root safety: writes go through `ArtifactStorageService`, must
  never write outside `STORAGE_ROOT`.

## Acceptance Criteria

- [x] Runs only when CV draft exists (`status` is `cv_draft_ready` or
      `paused_after_cv_draft`; otherwise `BadRequestException`).
- [x] Saves `03_pre_pdf_check.md` and `03_pre_pdf_check.json`, registered as
      `GeneratedArtifact` rows.
- [x] Produces `readiness` value: `ready`, `ready_with_minor_edits` or
      `not_ready` (new schema field).
- [x] Produces `corrections` in the existing `PrePdfCheckCorrection[]` shape
      that Step 4 already reads and applies — no renderer changes needed.
- [x] Does not block export by default (no workspace status change; Step 4
      export gate is untouched — confirmed manually: full HTTP flow through
      `export-cv` succeeds with `03_pre_pdf_check.json` present, and the
      exported HTML contains the Prompt 3 correction, proving Step 4's
      existing read/apply logic works end-to-end).
- [x] Service test using fake AI output (`prompt3.service.spec.ts` — 16 tests,
      `prompt3-input-builder.service.spec.ts` — 7 tests).
- [x] `npm run test` passes for the full suite (no regressions) — 42/42
      suites, 407/407 tests (1 pre-existing flaky Puppeteer real-browser test
      passes in isolation); `npm run test:e2e` also passes.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-042 ..."`
3. `git push -u origin <branch-name>`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
