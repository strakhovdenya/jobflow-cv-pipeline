# Current Task

## Status

No active task. TASK-043 (Implement Prompt 5 final check) is complete —
see `TASK_BOARD.md` for closure details and the recommended next task.

## Docs to Read

- `docs/07_task_backlog.md` lines 1732–1756 (TASK-043 acceptance/test/done definition — authoritative over docs/08_ai_pipeline.md where they conflict)
- `docs/08_ai_pipeline.md` §14 (lines 1419–1539) — Prompt 5 design: inputs, recommended JSON/Markdown schema, safety checks, manual review point (`status -> final_check_ready`), failure handling
- `src/pipeline/prompt3/prompt3.service.ts` + `prompt3-input-builder.service.ts` — full files, closest existing pattern (optional post-artifact AI check that writes md+json and registers artifacts), just merged in TASK-042
- `src/document-export/document-export.service.ts` — full file; confirms `cv_pdf_generated` is currently a terminal status with zero downstream dependents, and shows the `04_cv_export.html`/`.pdf` file names
- `src/workspaces/workspace-status.service.ts` — full file; `final_check_ready` and `ready_to_apply` exist in the enum but have zero wired transitions today
- `src/workspaces/workspace-status.service.spec.ts` — full file, pattern to extend with the new valid/invalid transition pairs
- `src/ai/providers/fake.provider.ts` lines 195–290 — `FAKE_PROMPT1_JSON`/`FAKE_PROMPT2_JSON`/`FAKE_PROMPT3_JSON` pattern and the `options.step` branch to extend
- `prisma/seed.ts` lines 82–110 — `promptTemplates` seed array pattern (now includes the `prompt_3` placeholder entry from TASK-042)
- `src/pipeline/pipeline.module.ts` — module wiring pattern
- `src/workspaces/workspaces.controller.ts` lines 56–70 (post-TASK-042) — endpoint pattern to mirror for `POST /workspaces/:id/run-final-check`
- `src/artifacts/artifacts.service.ts` — `register()` signature
- `src/prompt-runs/prompt-runs.service.ts` — `create()`/`markRunning()`/`complete()`/`fail()` signatures

## Scope Decision

- **Gate:** Prompt 5 runs only when `workspace.status === cv_pdf_generated` (the
  one and only status meaning "a CV PDF artifact exists" — there is no
  "paused" variant after export, unlike the CV-draft stage). Any other status
  throws `BadRequestException`.
- **Status transition on success:** unlike Prompt 3 (TASK-042, which the
  backlog explicitly required to leave `workspace.status` untouched), Prompt
  5's backlog AC is silent on status, and `docs/08_ai_pipeline.md` §14.6
  explicitly documents `status -> final_check_ready` as part of the design.
  `cv_pdf_generated` is currently a terminal status with nothing downstream
  depending on it staying put (confirmed by reading
  `document-export.service.ts` — export itself is guarded by
  `export_running`, not `cv_pdf_generated`). Decision (confirmed with user):
  on success, transition `workspace.status` to `final_check_ready`. On
  failure (AI provider error or JSON validation failure), leave
  `workspace.status` at `cv_pdf_generated` (do not set `failed` — the PDF
  artifact remains valid and downloadable; matches
  `docs/08_ai_pipeline.md` §14.7 "Prompt 5 fails -> keep PDF artifact, allow
  manual download with warning").
- **`WorkspaceStatusService` updated to match:** add
  `cv_pdf_generated -> final_check_ready` (plus `cv_pdf_generated ->
  cv_pdf_generated` for the no-op/failure case, mirroring the
  `paused_after_cv_draft -> paused_after_cv_draft` self-transition pattern
  already in the map) to `TRANSITIONS` in `workspace-status.service.ts`, per
  TASK-039's stated intent that this map "encodes the real transition graph
  as observed across services." `final_check_ready -> []` stays terminal for
  now — wiring `ready_to_apply` is out of scope (no task currently produces
  it; would be invented scope).
- **`Prompt5Service` sets status directly via `prisma.applicationWorkspace.update`**,
  the same way `Prompt1Service`/`Prompt2Service`/`DocumentExportService` do —
  it does not call `WorkspaceStatusService.assertValidTransition()` (TASK-039
  established that the service is descriptive, not yet an enforced gate;
  wiring it in as an enforced gate remains a separate future task).
- **PDF content source:** Prompt 5 reads `04_cv_export.html` as plain text
  context (not `04_cv_export.pdf` binary). Real PDF text extraction is a
  separate technical concern (would need a PDF-parsing library) and is out of
  scope for this task (confirmed with user) — matches
  `docs/08_ai_pipeline.md` §14.7's own fallback: "PDF text extraction
  unavailable -> use HTML/Markdown content and mark visual check as manual."
- **New schema file:** `src/pipeline/schemas/final-check.schema.ts` (new —
  unlike Prompt 3, no existing schema covers this shape). Fields per
  `docs/08_ai_pipeline.md` §14.3: `schema_version`, `workspace_id`,
  `final_decision: 'ready_to_send' | 'needs_edit' | 'do_not_send'` (backlog
  AC's three values), `quality_score`, `page_count`, `missing_sections`,
  `formatting_issues`, `overclaiming_issues`, `broken_links`, `warnings`,
  `final_checklist: { pdf_opens, content_matches_vacancy,
  no_unsupported_claims, contact_info_present, ready_to_apply }` (all
  boolean). No consumer reads this file today (unlike `03_pre_pdf_check.json`,
  which Step 4 already reads) — this task only writes it; no renderer/export
  changes.
- **New files:**
  - `src/pipeline/prompt5/prompt5-input-builder.service.ts` — mirrors
    `Prompt3InputBuilderService`; reads `04_cv_export.html` (required),
    `02_targeted_cv_content.json` (required), `01_vacancy_analysis.json`
    (optional context), `03_pre_pdf_check.json` (optional context).
  - `src/pipeline/prompt5/prompt5.service.ts` — mirrors `Prompt3Service`;
    PromptRun/AiRun lifecycle, calls AI provider with `step: 'prompt_5'`,
    validates with `validateFinalCheckJson`, writes `05_final_check.md` +
    `.json`, registers both via `ArtifactsService.register()` with
    `origin: 'prompt_5'`; transitions status to `final_check_ready` on
    success only.
  - `POST /workspaces/:id/run-final-check` added to `workspaces.controller.ts`,
    delegating to `Prompt5Service.runFinalCheck()`.
  - `FAKE_PROMPT5_JSON` added to `fake.provider.ts`, selected when
    `options.step === 'prompt_5'`.
  - Placeholder `prisma/prompts/prompt5.txt` + `prompt_5` entry in
    `prisma/seed.ts` `promptTemplates` array, same placeholder-content
    approach the user approved for `prompt_3` in TASK-042 (real
    prompt-engineering content is a follow-up task, same as TASK-037B for
    Prompt 1/2).
- **Artifact types:** `final_check_md` / `final_check_json` (new
  `artifactType` strings, consistent with `pre_pdf_check_md/json` naming).
- **`AiRun` created:** Prompt 5 is an AI prompt, not a deterministic step —
  same as Prompt 1/2/3, `PromptRun` + `AiRun` records are created (ADR-012
  only exempts Step 4/export).

## Key Invariants

- `PromptRun` links to `PromptTemplate` version and `AiRun`; `GeneratedArtifact`
  links to `PromptRun` (per CLAUDE.md Key Invariants).
- Filesystem root safety: writes go through `ArtifactStorageService`, must
  never write outside `STORAGE_ROOT`.
- Do not run Prompt 5 for skipped vacancies (docs §14.5) — already
  structurally impossible: a skipped workspace never reaches
  `cv_pdf_generated`, so the status gate alone enforces this without extra
  code.

## Acceptance Criteria

- [x] Runs only when CV artifact exists (`status === cv_pdf_generated`;
      otherwise `BadRequestException`) — verified by unit test and manually
      (400 confirmed when called on a `final_check_ready` workspace).
- [x] Saves `05_final_check.md` and `05_final_check.json`, registered as
      `GeneratedArtifact` rows.
- [x] Output includes `final_decision`: `ready_to_send`, `needs_edit` or
      `do_not_send`.
- [x] On success, `workspace.status` transitions to `final_check_ready`
      (confirmed scope decision, see above); `WorkspaceStatusService`
      `TRANSITIONS` map updated to match (`cv_pdf_generated ->
      final_check_ready`, plus the `cv_pdf_generated -> cv_pdf_generated`
      self-transition for the failure case).
- [x] On failure, `workspace.status` stays at `cv_pdf_generated` (PDF
      artifact remains valid/downloadable) — verified by unit test.
- [x] Service test for Prompt 5 with fake final check output
      (`prompt5.service.spec.ts` — 15 tests, `prompt5-input-builder.service.spec.ts` — 6 tests).
- [x] `npm run test` passes for the full suite (no regressions) — 47/47
      suites, 475/475 tests; `npm run test:e2e` also passes.

## Additional Changes (user-requested during review, outside original scope)

- Split `validatePrePdfCheckJson` tests out of `cv-content.schema.spec.ts`
  into their own `pre-pdf-check.schema.spec.ts`, added missing
  `skip-reason.schema.spec.ts` coverage, documented as ADR-020 — done in
  TASK-042, referenced here since this task's `final-check.schema.spec.ts`
  follows the same 1:1 convention from the start.
- Renamed `prompt1.schema.ts` → `vacancy-analysis.schema.ts` and
  `prompt2.schema.ts` → `targeted-cv-content.schema.ts` (with all exported
  types/functions renamed to match), unifying schema-file naming on the
  canonical-artifact convention that `skip-reason.schema.ts`,
  `pre-pdf-check.schema.ts` and this task's `final-check.schema.ts` already
  followed. Documented as ADR-021. Pure rename — verified via
  `npx tsc --noEmit` (clean) and the full test/e2e suite (all green).
  Committed separately from the Prompt 5 feature commit.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-043 ..."`
3. `git push -u origin <branch-name>`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
