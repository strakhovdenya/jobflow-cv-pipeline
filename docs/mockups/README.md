# TASK-073 epic mockups

Claude Artifact mockups the project owner pastes during the TASK-073 redesign epic (ADR-025). Each
mockup's visual markup is Claude-Artifact-compressed and not machine-readable from pasted chat
text, but its `<script type="text/x-dc">` block is plain text and carries the exact data contract
(`renderVals()`/`labels()`/`stages()` etc.) — that block is what gets extracted into
`docs/07_task_backlog.md` task definitions and, from this point forward, saved verbatim into this
folder as the file listed below.

## Convention

- Filename: `NN-slug.html`, `NN` = the mockup's own sequence number as given by the project owner
  (not the task number), `slug` = kebab-case of its title. Each mockup also has a matching
  `NN-slug-screenshot.png` — a real rendered screenshot of the mockup opened in a browser.
- File content: the full pasted mockup source (including the compressed visual markup and the
  readable `<script type="text/x-dc">` block), saved as-is — not summarized or reformatted. This is
  what a task's implementation should diff its component output against, self-checkable without
  relying on chat history.
- **Screenshot vs. `.html` priority:** the `.html` file's visual markup is Claude-Artifact-compressed
  and only renders correctly once executed by a real browser (it is a self-mounting JS bundle, not
  plain readable markup — see the `__bundler/*` script tags) — reading it as text does not reveal the
  actual visual layout/hierarchy (this caused a real planning miss in TASK-076: the initial component
  plan wrongly assumed `company` was the large heading, `decision`/`score`/`reviewState` were
  full-width stacked fields, discovered only once the rendered result was visually compared against
  a screenshot — see `project-management/completed-tasks/TASK-076-workspace-status-header.md`
  "Progress Notes"). So: **open the `-screenshot.png` first** for anything about visual layout,
  hierarchy, spacing, or component structure. Fall back to the `.html` file only for the exact
  `renderVals()`/`labels()`/`stages()` data-contract values (field names, example values) — those
  are plain text in the `<script type="text/x-dc">` block and are not reliably legible in a
  screenshot.
- Every backlog task that implements against a mockup must carry a `**Mockup reference:**` line
  naming the file(s) here (added retroactively for TASK-075–081 on 2026-07-23; see
  `docs/07_task_backlog.md`).

## Index

| # | Title | Screenshot | File | Status | Referenced by |
|---|---|---|---|---|---|
| 01 | New workspace | `01-new-workspace-screenshot.png` | `01-new-workspace.html` | **saved** (2026-07-23) — data contract verified to match `docs/07_task_backlog.md`. | TASK-079, TASK-080 |
| 02 | Workspace created | `02-workspace-created-screenshot.png` | `02-workspace-created.html` | **saved** (2026-07-25) — data contract extracted; a third top-level `screenType: 'success'` value (sibling to `'form'`/`'pipeline'`), shown once `POST /workspaces` succeeds, before navigating to the workspace detail page. Small fixed shape (`success: { slug, folderPath, sourcePath }`, no buttons in the data contract) — folded into TASK-080 (screen assembly owns what renders right after creation), no new component needed. | TASK-080, TASK-081 |
| 03 | Source saved | `03-source-saved-screenshot.png` | `03-source-saved.html` | **saved** (2026-07-23) — data contract verified to match `docs/07_task_backlog.md`. | TASK-075, TASK-076, TASK-077, TASK-078, TASK-081, TASK-083 |
| 04 | Analysis review | `04-analysis-review-screenshot.png` | `04-analysis-review.html` | **saved** (2026-07-23) — data contract verified to match `docs/07_task_backlog.md`. | TASK-075, TASK-076, TASK-077, TASK-078, TASK-081, TASK-083 |
| 05 | CV generation | `05-cv-generation-screenshot.png` | `05-cv-generation.html` | **saved** (2026-07-23) — data contract extracted; folded into existing TASK-075/077/081/083 (no new component/screen needed — see those tasks' Context). | TASK-075, TASK-077, TASK-081, TASK-083 |
| 06 | CV draft ready | `06-cv-draft-ready-screenshot.png` | `06-cv-draft-ready.html` | **saved** (2026-07-23) — data contract extracted; mostly folded into existing TASK-077/081/083 (new `mainCard.reasonNote` flag), but its new top-level `checks: { state: 'not_run' }` field had no owning component and was filed as new **TASK-084** (placeholder-scoped, pending mockup 07's fuller `checks` contract). | TASK-077, TASK-081, TASK-083, TASK-084 |
| 07 | Pre-PDF check result | `07-pre-pdf-check-result-screenshot.png` | `07-pre-pdf-check-result.html` | **saved** (2026-07-25) — data contract extracted; supplies the `checks: { state: 'result' }` shape TASK-084 was waiting on (readiness/findings/notes/counts). TASK-084 filled in and un-placeholdered for the pre-PDF-check half; final-check half still pending mockup 13. | TASK-084 |
| 08 | Export PDF | `08-export-pdf-screenshot.png` | `08-export-pdf.html` | **saved** (2026-07-25) — data contract extracted; `screenType: 'pipeline'` on `export_running` status, generic pattern already covered by TASK-081/083 (no new task). Its `checks: { state: 'result', compact: true }` example (no `findings[]` at all, unlike mockup 07) is the first real `compact: true` exercise — folded into TASK-084's contract/acceptance criteria. | TASK-084 |
| 09 | PDF generated | `09-pdf-generated-screenshot.png` | `09-pdf-generated.html` | **saved** (2026-07-25) — data contract extracted; `screenType: 'pipeline'` on `cv_pdf_generated` status, generic pattern already covered by TASK-081/083 (no new task for that part). Its new top-level `upcoming: { finalCheck, coverLetter, tracking }` field (status lines for the two remaining optional steps + a static preview of the tracking form's field labels) had no owning component and was filed as new **TASK-085**. Also supplies ArtifactList's first `ext: 'pdf'` example with a non-empty `preview` string — folded into TASK-078 as an additional fixture. | TASK-078, TASK-081, TASK-083, TASK-085 |
| 10 | SKIP - Confirm skip | `10-skip-confirm-skip-screenshot.png` | `10-skip-confirm-skip.html` | **saved** (2026-07-25) — data contract extracted; `screenType: 'pipeline'` on `paused_after_analysis` status, mid-way through the ADR-016 two-step skip override (`reviewState: 'overridden'`). Corrected an earlier TASK-075 assumption: a decision-stage `chosen` option can appear while the stage itself is still `current` (not only once `done`), and can carry its own `reason` (the override reason). Its new top-level `actionsPanel: { title, buttons }` field (distinct from `mainCard`) had no owning component and was filed as new **TASK-087**. | TASK-075, TASK-081, TASK-083, TASK-087 |
| 11 | SKIP - Skipped final | `11-skip-skipped-final-screenshot.png` | `11-skip-skipped-final.html` | **saved** (2026-07-25) — data contract extracted; `screenType: 'pipeline'` on `status: 'skipped'` (`decision: 'skip'`, `reviewState: 'overridden'`), the "override the skip decision" screen. Extends TASK-077's `mainCard` contract with three fields no earlier mockup exercised: `notice` (a plain string banner, distinct from `info: { kind, text }`), `select: { label, value }` (a dropdown control for "Override to"), and `reasonNoteLabel` (a string label accompanying the existing boolean `reasonNote` flag from mockup 06 — first mockup to pair the flag with real label text). No new component — folded into TASK-077. | TASK-077, TASK-081, TASK-083 |
| 12 | COVER LETTER - Generated final | `12-cover-letter-generated-final-screenshot.png` | `12-cover-letter-generated-final.html` | **saved** (2026-07-25) — data contract extracted; `screenType: 'pipeline'` on `status: 'cover_letter_generated'`. Two new top-level fields with no owning component: `coverLetterPanel: { text }` (generated-letter confirmation) and `trackingPanel: { textFields[], selectFields[] }` (the real application-tracking form, distinct from TASK-085's `upcoming.tracking.fields` static preview) — filed as new **TASK-088** and **TASK-089**. Also corroborates TASK-074: this flow's `labels()` **omits the `'final'` stage entirely** (10 stages, not 11) when cover letter is generated without a final check first — not merely an unreachable/disabled stage, the stage list itself shrinks. | TASK-074, TASK-081, TASK-083, TASK-088, TASK-089 |
| 13 | FINAL CHECK PDF - Ready | `13-final-check-pdf-ready-screenshot.png` | `13-final-check-pdf-ready.html` | **saved** (2026-07-25) — data contract extracted; `screenType: 'pipeline'` on `status: 'final_check_ready'`, the mockup TASK-084 was waiting on for the final-check half of `ChecksPanel`. Supplies a new top-level `finalCheckPanel: { banner, checks: string[], emptySections: [{title,value}], warnings: string[] }` field — a **parallel prop to `checks`, not a `checks.state` variant** (this screen has no `checks` field at all), confirming the "parallel prop" option TASK-084 left open rather than the "new state value" one. Also supplies `coverLetterPanel: { button }` (not-yet-generated variant, complementing mockup 12's `{ text }` variant — folded into TASK-088) and the same `trackingPanel` shape as mockup 12 (folded into TASK-089). | TASK-084, TASK-081, TASK-083, TASK-088, TASK-089 |
| 14 | Workspaces list | `14-workspaces-list-screenshot.png` | `14-workspaces-list.html` | **saved** (2026-07-28) — first mockup NOT built on the `PipelineScreen` component (single-workspace detail); a standalone list/table component. Data contract: `data.workspaces: Array<{id, slug, companyName, roleTitle, status, decision, score, updatedAt}>`. Component-internal `STATUS_META` maps only 11 of the real 18 `WorkspaceStatus` values (with a raw-string fallback for the rest) — real implementation should reuse `apps/web/src/lib/pipeline-view-model.ts`'s existing `statusLabel()` (already covers all 18) instead of duplicating a second partial status-label map. `needsReview` is derived as `status.startsWith('paused_')` — a generalizable rule, not a hardcoded list. Decision color rule: apply=green, skip=gray, maybe=amber, null=light gray em-dash. Row highlight (`#f8f8ff` bg + indigo dot) on `needsReview` rows. Includes an explicit empty state. | TASK-082 |

All mockups supplied so far (01–14) are saved and indexed. New mockups supplied from now on are
saved here directly as they arrive, so this table and every new task's `**Mockup reference:**`
line point at a real file from the start.
