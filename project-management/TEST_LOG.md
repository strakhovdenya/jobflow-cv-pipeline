# Test Log

## Purpose

Record test commands, manual verification steps and results. This file is especially important for checks that are not fully automated yet: PostgreSQL persistence, filesystem artifact creation, PDF export and AI provider mocks.

## Entry Template

```md
## YYYY-MM-DD — TASK-XXX — Short title

### Scope

What was tested.

### Commands

```bash
# commands here
```

### Result

PASS / FAIL / PARTIAL

### Evidence

- output summary;
- generated file paths;
- database rows checked;
- notes/screenshots if needed.

### Follow-up

- none;
- or link to BLOCKERS.md / next task.
```

## 2026-07-21 — TASK-072 — Flow variant 1: "Hired — Fullstack Developer" (apply, happy path + pre-PDF check)

### Scope

First real historical flow variant supplied by the project owner (pasted full ChatGPT project
chat transcript, `Hired_full_chat_transcript_RU - pdf.txt`): a vacancy analysis ending in a
**MAYBE** decision, followed by targeted CV generation (Prompt 2), a pre-PDF check (Prompt 3,
`ready_with_minor_edits`), and PDF export. Driven end-to-end through the real `apps/web` UI
(`http://localhost:3001`) against a real running `apps/api` backend (`AI_PROVIDER=fake`).

Since `AI_PROVIDER=fake` always returns a canned `decision: "apply"` for Prompt 1
(`apps/api/src/ai/providers/fake.provider.ts` `FAKE_PROMPT1_JSON`), the review-gate step was
driven via **Approve (apply)** instead of the chat's original **Approve (maybe)** — the UI's
`AnalysisReviewGate` correctly disables "Approve (maybe)" whenever `currentDecision !== "maybe"`,
matching `review-gates.service.ts`'s own guard (`approve_maybe` requires `currentDecision ===
"maybe"`). This is a fake-provider/environment constraint, not a product gap: the "maybe" branch
of the review gate was not exercised by this pass and remains untested until a flow variant is
driven with a real AI provider recommending "maybe" (or the fake provider gains a second canned
"maybe" fixture — noted as a possible follow-up, not filed as its own task since it's a test-only
concern).

### Steps driven (screen → action → observed result)

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Fill Company "Hired", Role "Fullstack Developer React Node js Remote", vacancy text, submit | Success panel, `status: source_saved` | Match |
| 2 | `/workspaces/:id` | Click "Start analysis" | `status: paused_after_analysis`, decision/score shown, review-gate buttons appear | Match (`decision: apply`, `score: 75`) |
| 3 | `/workspaces/:id` | Click "Approve (maybe)" | — | **Disabled** (see Scope note — expected given `currentDecision === "apply"`) |
| 3′ | `/workspaces/:id` | Click "Approve (apply)" instead | `status: cv_generation_running`, `reviewState: approved` | Match |
| 4 | `/workspaces/:id` | Click "Generate CV draft" | `status: cv_draft_ready`, `targeted_cv_content_md/json` artifacts registered, CV draft review + pre-PDF check sections appear | Match |
| 5 | `/workspaces/:id` | Click "Run pre-PDF check" | `pre_pdf_check_md/json` artifacts registered, "Export allowed — readiness: ready_with_minor_edits" banner, one `summary[0]` suggestion, overall notes | Match |
| 6 | `/workspaces/:id` | Click "Approve" in CV draft review | `status: export_running`, "Export PDF" button appears | Match |
| 7 | `/workspaces/:id` | Click "Export PDF" | `status: cv_pdf_generated`, `cv_export_html/pdf` artifacts registered, Final check / Cover letter / Application tracking sections all appear | Match |

### Result

PASS — no UI/backend gap found. Zero follow-up backlog tasks filed for this variant.

### Evidence

- Screenshots supplied by the project owner at each step (not stored in-repo — ephemeral chat
  attachments), cross-checked against the workspace detail page state at each step.
- Test workspace: company "Hired", role "Fullstack Developer React Node js Remote", slug
  `2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote` — **left in place** (not cleaned up
  yet) in case the same workspace is reused for a later step (e.g. final check / cover letter /
  application tracking) in a follow-up session; clean up before merging any TASK-072 closure
  commit if still unused.

### Follow-up

- None filed as a backlog task. Noted for future reference: the fake AI provider cannot produce a
  `maybe` or `skip` Prompt 1 recommendation, so any flow variant requiring "Approve (maybe)" or a
  first-pass AI-driven skip must either substitute "Approve (apply)" (as done here) or be driven
  with a real AI provider.
- This entry is intended to remain a valid reference after TASK-073's UI redesign — re-check the
  same screen → action → expected mapping against the redesigned UI rather than re-deriving flow
  logic from the original chat transcript again.

## 2026-07-21 — TASK-072 — Flow variant 2: "6037 — Senior Back-End Engineer" (skip, override-driven)

### Scope

Second real historical flow variant supplied by the project owner (pasted full ChatGPT project
chat transcript, `6037_full_chat_export_RU - skip.txt`): a vacancy analysis ending in a **SKIP**
decision (location blocker + AWS/NestJS/Prisma commercial gaps), with `01_skip_reason.md/json`
generated and no targeted CV produced. Driven end-to-end through the real `apps/web` UI against a
real running `apps/api` backend (`AI_PROVIDER=fake`).

As with Flow 1, `AI_PROVIDER=fake` always returns a canned `decision: "apply"` for Prompt 1, so
the chat's original AI-recommended `SKIP` could not be reproduced as the *initial* AI decision.
Unlike the "maybe" case in Flow 1, though, `change_to_skip` is available regardless of the current
decision (per `review-gates.service.ts`, it's only blocked when `currentDecision` is already
`skip`) — so the human-override "Skip" button on the analysis-review screen was used instead,
exercising the exact same `change_to_skip` → `confirm-skip` path ADR-016 documents. This is a
closer real-world match than Flow 1's apply/maybe substitution: a human choosing to skip a vacancy
the AI recommended for `apply` is itself a legitimate real usage pattern, not just a test
workaround.

### Steps driven (screen → action → observed result)

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Fill Company "6037", Role "Senior Back-End Engineer", vacancy text, submit | Success panel, `status: source_saved` | Match |
| 2 | `/workspaces/:id` | Click "Start analysis" | `status: paused_after_analysis`, decision/score shown | Match (`decision: apply`, `score: 75`) |
| 3 | `/workspaces/:id` | Click "Skip" in Analysis review | Per ADR-016: `status` stays `paused_after_analysis`, `currentDecision: skip`, `reviewState: overridden`, a "Confirm skip" button appears | Match |
| 4 | `/workspaces/:id` | Click "Confirm skip" | `status: skipped`, `skip_reason_md/json` artifacts registered with `SKIP_...reason_RU.md/.json` naming (ADR-006), an "Override skip" form appears as the resume path | Match |

### Result

PASS — no UI/backend gap found. Zero follow-up backlog tasks filed for this variant. This also
newly confirms (against a real backend, not just unit tests) that the `confirm-skip` gap noted in
ADR-022 ("confirm-skip 500s on any standard-seeded environment" because `skip_reason` had no
seeded active `PromptTemplate`) is fixed — `prisma/seed.ts` now seeds `seed-skip-reason-v1`, and
`confirm-skip` succeeded without error.

### Evidence

- Screenshots supplied by the project owner at each step, cross-checked against the workspace
  detail page state.
- Test workspace: company "6037", role "Senior Back-End Engineer", slug
  `2026_07_21_6037_Senior_Back_End_Engineer` — **left in place** alongside Flow 1's workspace, not
  cleaned up yet.

### Follow-up

- None filed as a backlog task.
- Confirms Flow 1's noted environment constraint is specific to the *initial* AI recommendation
  only — the human-driven `change_to_skip` override path does not share that limitation and was
  exercised for real here.

## 2026-07-21 — TASK-072 — Flow variant 3: "Monpay — Fullstack Engineer" (maybe → CV → pre-PDF check → export → cover letter)

### Scope

Third real historical flow variant supplied by the project owner (pasted full ChatGPT project
chat transcript, `Monpay_full_chat_export - ковер леттер.txt`): vacancy analysis ending in
**MAYBE**, targeted CV generation, a pre-PDF check ("revise first" verdict with 5 mandatory
edits), PDF export, and — new territory for this task's pass — English **cover letter**
generation (Prompt 2.1). Driven end-to-end through the real `apps/web` UI against a real running
`apps/api` backend (`AI_PROVIDER=fake`).

Same fake-provider substitution as Flow 1: "Approve (apply)" used instead of "Approve (maybe)"
(the AI always recommends `apply`; see Flow 1's entry for the full explanation — not repeated as
a new finding).

### Steps driven (screen → action → observed result)

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Fill Company "Monpay", Role "Fullstack Engineer", vacancy text, submit | `status: source_saved` | Match |
| 2 | `/workspaces/:id` | "Start analysis" then "Approve (apply)" | `paused_after_analysis` → `cv_generation_running`, `reviewState: approved` | Match |
| 3 | `/workspaces/:id` | "Generate CV draft" then "Run pre-PDF check" | `cv_draft_ready` + `targeted_cv_content_md/json`; readiness banner + `summary[0]` suggestion | Match (`ready_with_minor_edits`) |
| 4 | `/workspaces/:id` | "Approve" (CV draft review) then "Export PDF" | `export_running` → `cv_pdf_generated`, `cv_export_html/pdf` artifacts, "Generate cover letter" button appears | Match |
| 5 | `/workspaces/:id` | "Generate cover letter" | `cover_letter_md/json` artifacts registered, status advances to `cover_letter_generated`, cover letter viewable via the Artifacts section | Match |

### Result

**PASS with one finding filed as a new backlog task.** Core mechanics of all five steps worked
exactly as expected. While reviewing the resulting screen at step 5, noticed:

1. The **"Final check" section, present at `cv_pdf_generated` (step 4), disappeared entirely**
   once status advanced to `cover_letter_generated` (step 5). Investigated the backend
   (`prompt5-input-builder.service.ts`): this isn't just a UI gate — `FINAL_CHECK_ALLOWED_STATUSES
   = ['cv_pdf_generated']` only, so the backend itself now rejects any final-check run on this
   workspace, permanently, since `cover_letter_generated` is a one-way transition. This is
   asymmetric with `cover-letter-input-builder.service.ts`'s own guard, which explicitly *does*
   allow generating the cover letter after final check (`['cv_pdf_generated',
   'final_check_ready']`). **Filed as TASK-074** (`docs/07_task_backlog.md` /
   `project-management/TASK_BOARD.md`) — not fixed inline, per this task's own acceptance
   criteria. This specific chat's real flow happened to use the order that avoids the bug
   (cover letter without ever running final check), so it wasn't hit by the original historical
   session, but the ordering hazard is real for any workspace that wants both steps.
2. The workspace detail page's "Next action" hint showed **"No action defined for this status"**
   at `cover_letter_generated` — not incorrect (application-tracking actions are still available
   below it and don't require a "next action" hint), but noted as a minor UX rough edge relevant
   to TASK-073's redesign scope (not filed separately — it's exactly the kind of
   scattered/no-forward-visibility issue TASK-073 already exists to fix, per its own Context
   section).

### Evidence

- Screenshots supplied by the project owner at each step, cross-checked against the workspace
  detail page state and, for the TASK-074 finding, against the actual backend source
  (`FINAL_CHECK_ALLOWED_STATUSES` / `COVER_LETTER_ALLOWED_STATUSES` constants).
- Test workspace: company "Monpay", role "Fullstack Engineer", slug
  `2026_07_21_Monpay_Fullstack_Engineer` — **left in place**, not cleaned up yet.

### Follow-up

- **TASK-074** filed: fix `FINAL_CHECK_ALLOWED_STATUSES` to also allow `cover_letter_generated`,
  mirroring the cover-letter guard's own symmetric allowance.
- The "No action defined for this status" UX rough edge is left for TASK-073 (full redesign),
  not filed as its own task — same root cause TASK-073 already targets.

## 2026-07-21 — TASK-072 — Flow variant 4: "SME Careers — Full Stack Engineer" (maybe → CV → pre-PDF check → export → final check)

### Scope

Fourth real historical flow variant supplied by the project owner (pasted full ChatGPT project
chat transcript, `SME_Careers_full_chat_export - chek pdf.txt`): vacancy analysis ending in
**MAYBE**, targeted CV generation, a pre-PDF check ("proceed to PDF yes after minor edits"), PDF
export, and — new territory for this task's pass — **final check** (Prompt 5), which the real
chat's Prompt 5 verdict was "Send after minor edits". Driven end-to-end through the real
`apps/web` UI against a real running `apps/api` backend (`AI_PROVIDER=fake`). Same fake-provider
substitution as Flows 1 and 3 ("Approve (apply)" instead of "Approve (maybe)" — see Flow 1's entry
for the explanation, not repeated here).

### Steps driven (screen → action → observed result)

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Fill Company "SME Careers", Role "Full Stack Engineer Node js and React", vacancy text, submit | `status: source_saved` | Match |
| 2 | `/workspaces/:id` | "Start analysis" then "Approve (apply)" | `paused_after_analysis` → `cv_generation_running`, `reviewState: approved` | Match |
| 3 | `/workspaces/:id` | "Generate CV draft" then "Run pre-PDF check" | `cv_draft_ready` + `targeted_cv_content_md/json`; readiness banner + `summary[0]` suggestion | Match (`ready_with_minor_edits`) |
| 4 | `/workspaces/:id` | "Approve" (CV draft review) then "Export PDF" | `export_running` → `cv_pdf_generated`, `cv_export_html/pdf` artifacts, "Run final check" button appears | Match |
| 5 | `/workspaces/:id` | "Run final check" | `final_check_md/json` artifacts registered, status advances to `final_check_ready`, banner shows `final_decision`/`quality_score`/page count, 5-item checklist all ✓, empty issue arrays, one warning, "Run final check" button disappears while the result stays visible, "Generate cover letter" still available below | Match (`ready_to_send`, score 92, 2 pages) |

### Result

PASS — no new gap found. Confirms the "final check before cover letter" ordering (the inverse of
Flow 3's TASK-074 finding) works correctly: running final check at `cv_pdf_generated` and then
still seeing "Generate cover letter" available afterward at `final_check_ready` is the *documented
correct* order per `cover-letter-input-builder.service.ts`'s own `COVER_LETTER_ALLOWED_STATUSES =
['cv_pdf_generated', 'final_check_ready']`.

The same "Next action: No action defined for this status" rough edge noted in Flow 3 reappeared
here at `final_check_ready` — not filed separately, same TASK-073 scope as before.

### Evidence

- Screenshots supplied by the project owner at each step, cross-checked against the workspace
  detail page state.
- Test workspace: company "SME Careers", role "Full Stack Engineer Node js and React", slug
  `2026_07_21_SME_Careers_Full_Stack_Engineer_Node_js_and_React` — **left in place**, not cleaned
  up yet.

### Follow-up

- None filed as a backlog task.
- This was the fourth and (per the project owner, at the time of this entry) last flow variant
  supplied so far for TASK-072. Total so far: 4 flows driven, 2 fully clean, 2 with findings (one
  filed as TASK-074, one UX note deferred to TASK-073's existing scope). Test workspaces from all
  four flows still exist in the DB (see `CURRENT_TASK.md` cleanup list) — clean up before this
  task's own closure.

## 2026-07-20 — TASK-071 — Add existing-folder import UI

### Scope

`apps/web`: new `/import` screen implementing the scan → preview → confirm flow against the
pre-existing `ImportController` (`GET /import/scan`, `POST /import/preview`, `POST /import/confirm`
— no backend changes). New `lib/api.ts` types (`ImportScanResult`/`ImportPreviewInput`/
`ImportPreviewResult`/`ImportConfirmInput`/`ImportConfirmResult`) + `scanImportFolders()`/
`previewImportFolder()`/`confirmImportFolder()` functions, following the exact existing
server-side-`X-API-Key` fetch pattern. New `app/import/page.tsx` (Server Component, calls
`scanImportFolders()`), `app/import/actions.ts` (`previewImportFolderAction`/
`confirmImportFolderAction`, mirroring `createWorkspaceAction`'s `{ok,data}`/`{ok:false,errors}`
shape) and `app/import/import-preview.tsx` (client component: folder list → select → optional
company/role override inputs → "Preview" → structured result with a visually distinct
duplicate-detected banner (`isDuplicate`/`duplicateReason`/`duplicateWorkspaceId`) → a
vacancy-source-candidate `<select>` shown only when ambiguous (0 or 2+ candidates), gating the
confirm button until one is chosen → "Confirm import" → `router.push` to `/workspaces/:id` on
success). `copyVacancySourceToCanonical` defaults to unchecked (legacy files registered in place,
matching the backend's own default). Added an "Import from folder" nav link next to "New
workspace" on `/workspaces`. New `import-preview.spec.tsx` (6 tests): scan list renders, preview
of a selected folder, duplicate-detected banner rendering, full confirm → navigate success path,
confirm disabled when the vacancy-source candidate list is ambiguous, and preview validation-error
surfacing.

### Commands

```bash
cd apps/web
npx tsc --noEmit        # clean
npm run lint             # clean
npm run test -- --run    # 96/96 pass (6 new in import-preview.spec.tsx)
npm run build             # clean, /import route registered
```

### Result

PASS

### Evidence

- 96/96 `apps/web` Vitest tests pass (6 new); `tsc`/`lint`/`build` all clean; `next build` lists
  `/import` as a registered dynamic route.
- Real backend run (fake AI provider, `apps/api` port 3000 + `apps/web` port 3001, both already
  running from an earlier session): temporarily set `IMPORT_ROOT` in `apps/api/.env` to a scratch
  fixture folder (`<temp>/jobflow_import_root/Acme_Corp/2026.01.15/Acme_Corp_Backend_Developer.txt`)
  and restarted the backend dev server to pick it up (`ConfigService.getOrThrow('IMPORT_ROOT')` is
  read once at boot, not hot-reloaded).
  - `GET /import/scan` returned the fixture folder with `companyNameOriginal: "Acme_Corp"`,
    `roleTitleOriginal: "Backend Developer"`, `legacyDate: "2026-01-15"` (`high` confidence),
    one `vacancySourceCandidates` entry, `suggestedStatus: "source_saved"`, `warnings: []`.
  - Fetched `/import` through the frontend directly — the scanned folder's company/role rendered.
  - Fetched `/workspaces` through the frontend — "Import from folder" nav link present.
  - `POST /import/preview` (same request shape the Server Action uses) returned the same data plus
    `isDuplicate: false`.
  - `POST /import/confirm` created a real `Company`/`JobVacancy`/`ApplicationWorkspace`/
    `GeneratedArtifact` — `status: "source_saved"`, `workspaceSlug:
    "2026_01_15_Acme_Corp_Backend_Developer"`.
  - Fetched the resulting `/workspaces/:id` through the frontend — company/role/status rendered
    correctly (confirms the "navigates to its detail screen" acceptance criterion end-to-end).
  - Re-ran `POST /import/preview` on the same folder — confirmed `isDuplicate: true`,
    `duplicateReason: "source_path"`, `duplicateWorkspaceId` matching the just-created workspace
    (exercises the task's explicit "duplicate-detected case" test requirement against the real
    backend, complementing the component-level unit test).
  - Cleanup: deleted the test `ApplicationWorkspace`/`GeneratedArtifact`/`JobVacancy`/`Company`
    rows via a one-off Prisma script, removed the scratch fixture folder, reverted `apps/api/.env`
    (no `IMPORT_ROOT` — matches original state, `.env` is gitignored so never committed), and
    restarted the backend dev server a second time to restore it.
- No live browser click-through (no browser automation tool available) — covered instead by the
  component's tests plus the rendered-HTML checks above.

### Follow-up

- none.

## 2026-07-20 — TASK-070 — Add rejection text submission to workspace detail UI

### Scope

`apps/web`: extended TASK-069's `application-tracking-panel.tsx` with a new "Save rejection
feedback" section — a textarea + submit button gated on `status === "rejected"` only
(`REJECTION_TEXT_VALID_STATUSES = ["rejected"]`), matching `RejectionsService.saveRejectionText`'s
own guard exactly (a narrower gate than TASK-069's `ARCHIVED_VALID_STATUSES`, which also includes
`rejected` but for a different action). Empty/whitespace-only text is rejected client-side before
any network call (`SaveRejectionTextDto`'s `@IsNotEmpty`), showing an inline "Rejection text is
required." error. New `lib/api.ts` `saveRejectionText()` + `actions.ts` `saveRejectionTextAction`,
following the exact `markRejected`/`markRejectedAction` pattern — note the endpoint returns a
`GeneratedArtifact` (`id`/`artifactType`/`canonicalFileName`), not a `{id, status}` pair like the
other tracking actions, so the new result type intentionally has no `status` field. On success the
textarea clears and `router.refresh()` picks up the new `rejection_feedback.md` artifact, already
visible via TASK-064's existing generic artifact viewer (no dedicated preview needed). No backend
changes — the endpoint pre-existed since TASK-051. New tests in
`application-tracking-panel.spec.tsx`: form only rendered at `status = "rejected"`, empty-text
client-side validation blocks the call, successful submission calls the action with trimmed text
and refreshes.

### Commands

```bash
cd apps/web
npx tsc --noEmit        # clean
npm run lint             # clean
npm run test -- --run    # 90/90 pass (3 new in application-tracking-panel.spec.tsx)
npm run build             # clean
```

### Result

PASS

### Evidence

- 90/90 `apps/web` Vitest tests pass (3 new); `tsc`/`lint`/`build` all clean.
- Real backend run (fake AI provider, `apps/api` port 3000 + `apps/web` port 3001, both already
  running from an earlier session): created a fresh workspace and drove it
  `source_saved` → `cv_pdf_generated` → `ready_to_apply` → `applied` → `rejected` via the existing
  pipeline/tracking endpoints.
- Fetched the rendered `apps/web` page (`curl http://localhost:3001/workspaces/<id>`) at
  `status = rejected` and confirmed the new "Save rejection feedback" textarea/button render.
- Called `POST :id/rejection-text` (same endpoint/shape the new Server Action uses) with a sample
  rejection email body; response returned the expected `GeneratedArtifact`
  (`artifactType: "rejection_feedback"`, `canonicalFileName: "rejection_feedback.md"`).
- Re-fetched the rendered page and confirmed `rejection_feedback`/`rejection_feedback.md` now
  appears in the existing artifact list/viewer (TASK-064), with no code changes needed there.
- No live browser click-through (no browser automation tool available) — covered instead by the
  component's tests plus the rendered-HTML checks above, matching the precedent set in
  TASK-066/067/068/069.
- Test workspace and its DB rows/storage folder deleted afterward (no `DELETE` endpoint exists for
  workspaces; removed via a one-off Prisma script + `rm -rf` on the storage folder, then the script
  itself deleted).

### Follow-up

- none.

## 2026-07-20 — TASK-069 — Add application tracking actions to workspace detail UI

### Scope

`apps/web` new `application-tracking-panel.tsx` wiring up `mark-ready-to-apply`, `mark-applied`
(`appliedVia`/`notes` text inputs, `submittedCvArtifactId`/`submittedCoverLetterArtifactId` as
`<select>` populated from the workspace's own `artifacts` list rather than raw-ID text entry),
`mark-rejected` (`rejectionSummary`/`notes`) and `archive` — all four `ApplicationTrackingService`
actions (TASK-050), previously only reachable via curl/Swagger. Each sub-section's visibility
mirrors `application-tracking.service.ts`'s own per-action status guard
(`READY_TO_APPLY_VALID_STATUSES`/`APPLIED_VALID_STATUSES`/`REJECTED_VALID_STATUSES`/
`ARCHIVED_VALID_STATUSES`) rather than a single all-or-nothing panel gate, so e.g. "Mark rejected"
only appears at `status = applied`. New `lib/api.ts` `markReadyToApply()`/`markApplied()`/
`markRejected()`/`archiveWorkspace()` + matching `actions.ts` Server Actions, following the exact
existing `generateCoverLetter`/`confirmSkip` pattern; wired into `page.tsx` after
`CoverLetterPanel`. `apps/web`-only, no backend changes (all four endpoints pre-existed since
TASK-050). New `application-tracking-panel.spec.tsx` (8 tests): panel renders nothing for a status
with no eligible action, ready-to-apply button + success path, mark-applied with all optional
fields (including artifact `<select>`) submitted, mark-applied with all optional fields omitted,
mark-rejected only visible at `status = applied`, mark-rejected submission, archive button +
success path, and action-level-error surfacing without a refresh.

A same-session user-requested review (`/code-review`, medium effort) found one worth-fixing bug
and two cleanups, all applied before push: (1) both `submittedCvArtifactId`/
`submittedCoverLetterArtifactId` `<select>` fields listed every workspace artifact unfiltered, so
a user could pick a cover-letter artifact in the CV field or vice versa — `MarkAppliedDto` only
validates these as plain strings with no server-side cross-check against
`GeneratedArtifact.artifactType`, so the wrong id would be silently persisted. Fixed by extracting
a new `ArtifactSelect` sub-component that filters options by an `allowedTypes` prop
(`CV_ARTIFACT_TYPES = ["cv_export_pdf", "legacy_cv_pdf"]`,
`COVER_LETTER_ARTIFACT_TYPES = ["cover_letter_md", "cover_letter_json",
"legacy_cover_letter_pdf"]`), which also eliminated the duplicated `<select>` JSX (finding 2); (2)
the panel's local `ErrorList` duplicated an identical error-`<ul>` block already copy-pasted
across `cover-letter-panel.tsx`/`final-check-panel.tsx`/`pre-pdf-check-panel.tsx`/
`cv-draft-review-gate.tsx` — extracted into a new shared `error-list.tsx` and imported here
(the other 4 pre-existing files were left as-is per CLAUDE.md's "keep commits task-focused" rule —
out of this task's scope, flagged as a follow-up candidate). New test added:
"filters each artifact select to its own artifact type" (a CV and a cover-letter artifact in the
same list, asserting each `<select>` only offers its own type).

### Commands

```bash
cd apps/web
npx tsc --noEmit        # clean
npm run lint             # clean
npm run test -- --run    # 87/87 pass (9 new in application-tracking-panel.spec.tsx)
npm run build             # clean
```

### Result

PASS

### Evidence

- 87/87 `apps/web` Vitest tests pass (9 new); `tsc`/`lint`/`build` all clean.
- Real backend run (fake AI provider, `apps/api` port 3000 + `apps/web` port 3001, both already
  running from an earlier session): drove a fresh workspace `source_saved` → `cv_pdf_generated`
  through the existing pipeline endpoints, then via curl (matching each Server Action's exact
  request shape) called `mark-ready-to-apply` → `mark-applied` (`appliedVia: "LinkedIn"`,
  `notes`, `submittedCvArtifactId` set to the real `cv_export_pdf` artifact id) → `mark-rejected`
  (`rejectionSummary`, `notes`) → `archive`, confirming each response's `status`/field values
  persisted correctly (`appliedAt`/`appliedVia`/`submittedCvArtifactId` on mark-applied,
  `rejectedAt`/`rejectionSummary` on mark-rejected, `isArchived: true` on archive).
- Fetched the rendered `apps/web` page (`curl http://localhost:3001/workspaces/<id>`) after each
  transition and confirmed the correct sub-sections appeared/disappeared: at `cv_pdf_generated`
  showed "Mark ready to apply"/"Mark applied"/"Archive" but not "Mark rejected"; at `applied`
  showed "Mark rejected"/"Archive" but not the ready/applied buttons; at `archived` the entire
  "Application tracking" panel rendered nothing. No live browser click-through (no browser
  automation tool available) — covered instead by the component's tests plus the rendered-HTML
  checks above, matching the precedent set in TASK-066/067/068.
- Test workspace and its DB rows/storage folder deleted afterward (no `DELETE` endpoint exists
  for workspaces; removed via a one-off Prisma script + `rm -rf` on the storage folder, then the
  script itself deleted).

### Follow-up

- none.

## 2026-07-20 — TASK-068 — Add cover letter generation trigger and content view

### Scope

`apps/web` new `cover-letter-panel.tsx` ("Generate cover letter" button, eligible at either
`cv_pdf_generated` or `final_check_ready` per `CoverLetterInputBuilderService`'s
`COVER_LETTER_ALLOWED_STATUSES` guard — unlike TASK-067's final-check panel, which is eligible
at only one status). Content itself is not re-rendered by this panel: per the task's AC, the
generated `cover_letter.md`/`cover_letter.json` artifacts are shown via TASK-064's existing
`ArtifactViewer` (already renders every workspace artifact with View/Download), so the panel just
shows the trigger and, once a `cover_letter_json`/`cover_letter_md` artifact exists, a note
pointing at the Artifacts section — following TASK-067's post-review fix of using
artifact-existence (`isLatest` cover-letter artifact present) rather than a hardcoded status
whitelist for staying visible once the workspace status advances past
`cover_letter_generated`. New `lib/api.ts` `generateCoverLetter()` + `actions.ts`
`generateCoverLetterAction`, following the exact existing pattern; wired into `page.tsx`
alongside the other pipeline-step panels. `apps/web`-only, no backend changes (the endpoint
pre-existed since TASK-049).

A same-session user-requested review found one worth-fixing item, applied as a follow-up commit:
the "available in Artifacts" eligibility check originally treated a `cover_letter_md` **or**
`cover_letter_json` artifact as sufficient, but `cover-letter.service.ts` registers
`cover_letter_md` unconditionally — even a raw-fallback markdown when JSON validation fails —
while `cover_letter_json` is only registered on a fully valid result. Narrowed the check to
`cover_letter_json` only, matching `pre-pdf-check-panel.tsx`/`final-check-panel.tsx`'s existing
convention of keying eligibility off the `_json` artifact type specifically. No test changes
needed (the spec's artifact factory already used `cover_letter_json`); 78/78 tests still pass,
`tsc`/`lint` re-verified clean.

### Commands

```bash
cd apps/web
npm test -- --run    # 78/78 pass (7 new in cover-letter-panel.spec.tsx)
npx tsc --noEmit      # clean
npm run lint          # clean
npm run build         # clean
```

### Result

PASS

### Evidence

- `npm test -- --run`: 9 test files, 78/78 tests pass (was 71/71 before this task; +7 new)
  covering: not rendered outside eligible statuses with no result yet, button visible at both
  `cv_pdf_generated` and `final_check_ready`, button hidden but panel/note still shown once
  status has advanced past the eligible statuses (artifact-existence-driven, not a status
  whitelist), success (refresh) path, validation-failure path (no refresh), and action-level
  error path (no refresh).
- Manual smoke test against a real backend (`AI_PROVIDER=fake`, Postgres/Redis via
  `docker compose`, both already running from a prior session): created a fresh workspace, drove
  it `source_saved` → `paused_after_analysis` (`run-analysis`) → `cv_generation_running`
  (`review-decision` approve_apply) → `cv_draft_ready` (`generate-cv-content`) →
  `export_running` (`review-cv-draft` approve) → `cv_pdf_generated` (`export-cv`), then called
  `POST :id/generate-cover-letter`. Response:
  `{"success":true,"workspaceStatus":"cover_letter_generated","coverLetterDraft":{...},...}`.
  Confirmed `GET /workspaces/:id` registers `cover_letter_md`/`cover_letter_json` artifacts
  (`isLatest: true`). Started the real `apps/web` dev server (port 3001) against this backend
  and `curl`-fetched the rendered workspace detail page: confirmed the "Cover letter" panel's
  server-rendered heading and the "Generated cover letter is available in the Artifacts section
  above" note appear (button correctly absent, since status had already advanced past
  `cv_pdf_generated`/`final_check_ready`), and confirmed both `cover_letter.md`/`.json` artifact
  rows appear in the Artifacts table. Fetched the `cover_letter.json` artifact through the
  frontend's own `/api/artifacts/:id/download` proxy and confirmed it returns the exact
  `CoverLetterOutput` JSON (`cover_letter.greeting`/`body_paragraphs`/`closing`,
  `evidence_alignment`, etc.) the backend generated. No live browser click-through (no browser
  automation tool available) — covered instead by the component's tests, matching the precedent
  set in TASK-066/067.
- Both dev servers (`apps/api` port 3000, `apps/web` port 3001) stopped afterward. Test
  workspace and its DB rows/storage folder deleted (no `DELETE` endpoint exists for workspaces;
  removed via a one-off Prisma script + `rm -rf` on the storage folder, then the script itself
  deleted).

### Follow-up

- none.

## 2026-07-20 — TASK-067 — Add Prompt 5 final check trigger and results view

### Scope

`apps/web` new `final-check-panel.tsx` ("Run final check" button, eligible only at
`status = cv_pdf_generated`; result rendering keeps working after status advances to
`final_check_ready`, which Prompt5Service transitions to on success — unlike Prompt 3, which
does not change status). New `lib/api.ts` `runFinalCheck()` + `actions.ts`
`runFinalCheckAction`, wired into `page.tsx`.

A same-session code review (`/code-review`, medium effort) found no correctness bugs but 4
worthwhile cleanups, all applied before commit: (1) eligibility for showing an already-fetched
result was changed from a hardcoded status whitelist (`["cv_pdf_generated",
"final_check_ready"]`) to being artifact-existence-driven (`jsonArtifactId != null`) — the
whitelist form would have silently hidden the result again the moment a later pipeline step
(e.g. TASK-068's cover letter) advances status past `final_check_ready`, since nobody would
remember to extend the array a second time; (2) `ISSUE_FIELDS`'s key type was narrowed from
`keyof FinalCheckOutput` (which wrongly allowed non-array fields like `quality_score`) to an
explicit `StringArrayField` union, removing an unchecked `result[key] as string[]` cast; (3)
`isLoadingResult`'s double-negation was simplified to the equivalent `jsonArtifactId != null &&
result === null && resultError === null`; (4) the render guard's dead `!isLoadingResult`
conjunct (always true whenever `result` is truthy) was dropped. A 5th finding — the ~55-line
fetch/`FetchState` block being a near-duplicate of `pre-pdf-check-panel.tsx`'s equivalent — was
deliberately not applied in this task, since extracting a shared hook would mean refactoring
already-merged TASK-066 code, out of this task's scope; flagged as a follow-up candidate instead.

### Commands

```bash
cd apps/web
npx vitest run          # 71/71 pass (8 new in final-check-panel.spec.tsx)
npm run lint             # clean
npx tsc --noEmit         # clean
npm run build             # clean
```

### Result

PASS

### Evidence

- `npx vitest run`: 8 test files, 71/71 tests pass (was 63/63 before this task; +8 new,
  including a regression test added post-review proving the panel still shows a fetched result
  at an arbitrary later status as long as the artifact exists).
- Manual smoke test against a real backend (`AI_PROVIDER=fake`, Postgres/Redis via
  `docker compose`): created a fresh workspace, drove it `source_saved` → `paused_after_analysis`
  (`run-analysis`) → `cv_generation_running` (`review-decision` approve_apply) →
  `cv_draft_ready` (`generate-cv-content`) → `export_running` (`review-cv-draft` approve) →
  `cv_pdf_generated` (`export-cv`), then called `POST :id/run-final-check`. Response:
  `{"success":true,"workspaceStatus":"final_check_ready","finalDecision":"ready_to_send",...}`.
  Confirmed `GET /workspaces/:id` registers `final_check_md`/`final_check_json` artifacts
  (`isLatest: true`) and that `GET /artifacts/:id/download` for the json artifact returns the
  exact `FinalCheckOutput` shape the panel parses (`final_decision`, `quality_score`,
  `final_checklist`, all 5 issue arrays). Confirmed via `curl` fetch of the rendered
  `apps/web` page (`npm run dev`, port 3001) that the "Final check" panel's server-rendered
  heading/button appear in the initial HTML for the eligible status. No live browser
  click-through (no browser automation tool available) — covered instead by the component's
  tests, matching the precedent set in TASK-066.
- Test workspace and its DB rows/storage folder deleted afterward (no `DELETE` endpoint exists
  for workspaces; removed directly via a one-off Prisma script + `rm -rf` on the storage
  folder).

### Follow-up

- none.

## 2026-07-20 — TASK-066 — Add Prompt 3 pre-PDF check trigger and results view

### Scope

New `PrePdfCheckPanel` client component (`apps/web/src/app/workspaces/[id]/pre-pdf-check-panel.tsx`):
a "Run pre-PDF check" trigger button (rendered only for `cv_draft_ready`/`paused_after_cv_draft`)
plus a structured results view (readiness, per-correction field_path/severity/reason/suggested_text,
export_blocked banner, overall_notes) fetched from the registered `pre_pdf_check_json` artifact via
the existing same-origin download proxy. New `lib/api.ts` `runPrePdfCheck()`/`RunPrePdfCheckResult`
and `actions.ts` `runPrePdfCheckAction`, following the exact existing pattern. `apps/web`-only, no
backend changes (endpoint pre-existed from TASK-046/Prompt3Service).

### Commands

```bash
cd apps/web
npm run test         # 63/63 tests pass (5 new in pre-pdf-check-panel.spec.tsx)
npx tsc --noEmit     # clean
npm run lint         # clean
npm run build        # clean
```

Manual end-to-end check against a real backend (fake AI provider, Postgres/Redis via
`docker compose`): created a workspace, drove it `source_saved` -> `paused_after_analysis`
(approve_apply) -> `cv_generation_running` -> `cv_draft_ready` via curl, then
`POST :id/run-pre-pdf-check` — response `{"success":true,...,"readiness":"ready_with_minor_edits"}`.
`GET /workspaces/:id` showed the new `pre_pdf_check_json`/`pre_pdf_check_md` artifacts registered
with correct `mimeType`. Fetched the JSON artifact through the frontend's own
`/api/artifacts/:id/download` proxy (the same route the panel's `useEffect` calls) and confirmed
the shape matches `PrePdfCheckOutput` exactly (`corrections[0].field_path`/`suggested_text`/
`severity`/`reason`, `export_blocked: false`, `overall_notes`). No live browser click-through
available (no browser automation tool) — component tests cover the passing and export-blocked
render paths directly, including the visual distinction between them.

### Result

PASS

### Evidence

- 63/63 `apps/web` Vitest tests pass (5 new); `tsc`/`lint`/`build` all clean.
- Real backend run: `run-pre-pdf-check` returned `readiness: "ready_with_minor_edits"`,
  registered `03_pre_pdf_check.md`/`03_pre_pdf_check.json` artifacts with correct `mimeType`.
- Download proxy returned the exact `PrePdfCheckOutput` JSON shape the panel parses.
- Test workspace and artifacts cleaned up from Postgres/filesystem after verification.

### Follow-up

- A self-review (`/code-review` medium effort) after the initial implementation found 5 real
  issues in `pre-pdf-check-panel.tsx`, all fixed in the same branch before PR: (1) a stale
  `resultError` that was never cleared, so an error banner could persist forever alongside a later
  successful result — fixed by replacing the separate `result`/`resultError`/`loadedArtifactId`
  state with a single `FetchState` keyed by `artifactId`, so a fetch outcome only renders while it
  still matches the current latest artifact id; (2) the artifact-fetch effect ran even when the
  component was about to render `null` for an ineligible status — fixed by gating the fetch itself
  on `isEligible` inside the effect; (3) the effect depended on the `jsonArtifact` object reference
  (recreated on every unrelated `router.refresh()`) instead of its `id`, causing redundant re-fetches
  — fixed by depending on the primitive `jsonArtifactId`; (4) `downloadUrl()` was duplicated
  verbatim from `artifact-viewer.tsx` — extracted to a shared `lib/artifact-download.ts`; (5)
  `runCheck()` used `useState`/`.then()` instead of the `useTransition` pattern every sibling
  component in the directory uses — switched to match. Re-verified: 63/63 `apps/web` tests pass
  (unchanged pass count, same behavior from the outside), `tsc`/`lint`/`build` all clean.
- none further.

## 2026-07-18 — TASK-063 — Add pipeline step-trigger actions to workspace detail UI

### Scope

New `apps/web/src/app/workspaces/[id]/pipeline-actions.tsx` client component wiring up the four
previously curl/Swagger-only endpoints — `run-analysis`, the first `generate-cv-content`,
`export-cv`, `confirm-skip` — as buttons on the workspace detail page, following the exact
`useTransition`/Server Action/error-list pattern already established by `cv-draft-review-gate.tsx`.
New `apps/web/src/lib/api.ts` functions `runAnalysis`/`exportCv`/`confirmSkip` (all
`encodeURIComponent(id)`-safe, matching the CodeQL fix already applied to the sibling functions in
TASK-057) and new `actions.ts` Server Actions `runAnalysisAction`/`generateCvContentAction`
(reuses the existing `regenerateCvContent` — same endpoint as the post-draft regenerate button)/
`exportCvAction`/`confirmSkipAction`. No `apps/api` changes — all four endpoints already existed.
New `pipeline-actions.spec.tsx` (Vitest + RTL, TASK-062's test runner) covers each button's
visibility condition, success path, and error rendering.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test -- --run   # 38/38 passed (3 test files)
npm run build

# apps/api (real backend, fake AI provider, already running on :3000 from a prior session)
docker compose ps        # postgres already up
npx next dev -p 3001     # apps/web, port 3000 taken by the running backend

# manual flow driven via curl + browser HTML fetch, same methodology as TASK-057
curl -X POST http://localhost:3000/workspaces ...                       # create workspace 1
curl http://localhost:3001/workspaces/:id1 | grep 'Start analysis'      # button shows at source_saved
curl -X POST http://localhost:3000/workspaces/:id1/run-analysis         # -> paused_after_analysis
curl -X POST http://localhost:3000/workspaces/:id1/review-decision -d '{"action":"approve_apply"}'
curl http://localhost:3001/workspaces/:id1 | grep 'Generate CV draft'   # button shows at cv_generation_running
curl -X POST http://localhost:3000/workspaces/:id1/generate-cv-content  # -> cv_draft_ready
curl -X POST http://localhost:3000/workspaces/:id1/review-cv-draft -d '{"action":"approve"}'
curl http://localhost:3001/workspaces/:id1 | grep 'Export PDF'          # button shows at export_running
curl -X POST http://localhost:3000/workspaces/:id1/export-cv            # -> cv_pdf_generated
curl http://localhost:3001/workspaces/:id1 | grep 'Pipeline actions'    # no match — panel hidden

curl -X POST http://localhost:3000/workspaces ...                       # create workspace 2
curl -X POST http://localhost:3000/workspaces/:id2/run-analysis
curl -X POST http://localhost:3000/workspaces/:id2/review-decision -d '{"action":"change_to_skip"}'
curl http://localhost:3001/workspaces/:id2 | grep 'Confirm skip'        # button shows, decision=skip
curl -X POST http://localhost:3000/workspaces/:id2/confirm-skip         # -> skipped
curl http://localhost:3001/workspaces/:id2 | grep 'Override skip'       # confirm-skip button gone, override remains
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test -- --run` 38/38
  passed, `npm run build` clean (routes `/`, `/workspaces`, `/workspaces/[id]`, `/workspaces/new`
  all compiled).
- Workspace 1 (`SmokeTest Co` / `QA Engineer`) driven end-to-end from `source_saved` to
  `cv_pdf_generated` using only the endpoints the new buttons call — exact response shapes matched
  what `apps/web`'s typed functions expect at every step (`RunAnalysisResult.workspaceStatus`,
  `ReviewDecisionResult.status`, `CvDraftReviewResult.status`, `ExportCvResult.status`). At each
  status the correct single button rendered ("Start analysis" → "Generate CV draft" →
  "Export PDF") and the panel rendered nothing once terminal (`cv_pdf_generated`).
- Workspace 2 (`SkipTest Co` / `Random Role`) confirmed the skip path: after `change_to_skip`,
  "Confirm skip" rendered (status stayed `paused_after_analysis` per ADR-016, `currentDecision =
  skip`); a control case (`currentDecision = apply` at the same status) confirmed the button does
  *not* render without `currentDecision = skip` (test-suite case, not curl); `confirm-skip` moved
  status to `skipped` and `01_skip_reason.md/json` were written; the existing "Override skip" UI
  (TASK-057) remained visible and distinct.
- Visual quality bar: rendered page confirmed the new "Pipeline actions" section reuses the same
  `rounded-lg border ... dark:bg-zinc-950` section styling and button classes as the existing
  review-gate sections — no unstyled markup.
- No `apps/api` source changes — `npx tsc --noEmit` and `npm run lint` re-run as a sanity check
  only (both clean, no diffs).

### Follow-up

- Test workspaces created during this smoke test ("SmokeTest Co" / "SkipTest Co") were left in the
  local dev database, consistent with TASK-057's precedent (no delete endpoint exists; local dev
  DB only, not shared/production).

## 2026-07-19 — TASK-063A — Fix swapped/missing downloadFileName on skip-reason artifacts

### Scope

Backend-only fix in `apps/api/src/pipeline/skip/skip-reason.service.ts`: the `01_skip_reason.md`
artifact registration never passed `downloadFileName` (defaulted to `null`), and
`buildDownloadFileName()` — which always built an `.md`-suffixed name — was wired to the
`01_skip_reason.json` artifact instead. Fixed by adding an `extension: 'md' | 'json'` parameter to
`buildDownloadFileName()` (default `'md'`) and passing the correct extension at each of the two
`register()` call sites.

### Commands

```bash
# apps/api
npm run test -- --testPathPattern=skip-reason.service   # 8/8 passed
npx tsc --noEmit                                         # clean
npm run test                                              # 59/59 suites, 638/638 tests

# manual smoke test — real backend (fake AI provider), postgres already running via docker compose
npm run start:dev
curl -X POST http://localhost:3000/workspaces -H "x-api-key: ..." -d '{...}'          # create workspace
curl -X POST http://localhost:3000/workspaces/:id/run-analysis -H "x-api-key: ..."
curl -X POST http://localhost:3000/workspaces/:id/review-decision -H "x-api-key: ..." \
  -d '{"action":"change_to_skip"}'
curl -X POST http://localhost:3000/workspaces/:id/confirm-skip -H "x-api-key: ..."     # -> skipped
curl http://localhost:3000/workspaces/:id -H "x-api-key: ..."                           # inspect artifacts
```

### Result

PASS

### Evidence

- `skip-reason.service.spec.ts`: 8/8 tests pass, including new assertions that `artifactsService
  .register()` receives distinct, correctly-suffixed `downloadFileName` values for
  `skip_reason_md` and `skip_reason_json`, and a new `buildDownloadFileName(..., 'json')` case.
- `npx tsc --noEmit` clean; full `npm run test` 59/59 suites, 638/638 tests (was 637 before the new
  test case).
- Manual end-to-end run against a real backend (fake AI provider): created workspace
  `TestCo063A`/`Backend Engineer`, ran analysis, `change_to_skip`, `confirm-skip` → `status:
  "skipped"`. `GET /workspaces/:id` artifact list confirmed:
  - `skip_reason_md` → `downloadFileName: "SKIP_TestCo063A_Backend_Engineer_reason_RU.md"`
    (previously `null`).
  - `skip_reason_json` → `downloadFileName: "SKIP_TestCo063A_Backend_Engineer_reason_RU.json"`
    (previously `SKIP_TestCo063A_Backend_Engineer_reason_RU.md`, wrong extension).
- No `apps/web` changes needed — the artifact table already renders whatever `downloadFileName`
  the backend returns.

### Follow-up

- Test workspace `TestCo063A`/`Backend Engineer` left in the local dev database, consistent with
  prior tasks' precedent (no delete endpoint; local dev DB only).
- TASK-065 (async/queued analysis trigger) is the next task in this phase and depends on this one.

## 2026-07-18 — TASK-057 — Implement workspace review screens

### Scope

New `apps/web` workspace detail screen (`apps/web/src/app/workspaces/[id]/page.tsx`) showing
status/decision/reviewState/score/artifacts/next-action, with `AnalysisReviewGate` (approve
apply/maybe/pause/skip, plus an override-skip form when `status === 'skipped'`) and
`CvDraftReviewGate` (approve/pause/mark not worth applying/regenerate placeholder) conditionally
rendered based on workspace status. New `apps/web/src/lib/api.ts` functions
(`getWorkspace`/`listWorkspaces`/`submitReviewDecision`/`overrideSkip`/`submitCvDraftReview`/
`regenerateCvContent`) calling pre-existing, unchanged `apps/api` endpoints. New minimal
`apps/web/src/app/workspaces/page.tsx` list page (not in the original AC, added because there was
no UI path to reach `/workspaces/[id]` otherwise) plus small link wiring on the home page and the
TASK-056 creation-form success state. No `apps/api` changes. No test runner exists yet in
`apps/web` (TASK-062, not this task), so verification was a real manual smoke test against a real
backend (fake AI provider) and real frontend, plus `lint`/`tsc`/`build`.

A real bug was found and fixed during the smoke test: `WorkspaceCompany.companyNameOriginal` did
not match the actual Prisma field name (`Company.nameOriginal`) — company names silently rendered
as `$undefined` (React's SSR placeholder for an undefined value) on both the list and detail
pages. Caught only because the list page was checked as raw HTML, not just via `tsc`/`build` (the
type was self-consistent, so the type checker had nothing to flag — the mismatch was against the
real backend's actual field name).

### Commands

```bash
# apps/web
npm run lint
npx tsc --noEmit
npm run build

# apps/api (real backend, not mocked)
docker compose up -d postgres
npm run start:dev            # AI_PROVIDER=fake
npx next dev -p 3001         # apps/web, run on 3001 to avoid the backend's port 3000

# manual flow driven via curl + browser HTML fetch, mirroring what a user clicking through
# the UI would trigger (Server Actions call the same apps/api endpoints)
curl -X POST http://localhost:3000/workspaces ...                      # create workspace
curl -X POST http://localhost:3000/workspaces/:id/run-analysis         # -> paused_after_analysis
curl http://localhost:3001/workspaces                                  # list page
curl http://localhost:3001/workspaces/:id                              # detail page
curl -X POST http://localhost:3000/workspaces/:id/review-decision -d '{"action":"approve_apply"}'
curl -X POST http://localhost:3000/workspaces/:id/generate-cv-content  # -> cv_draft_ready
curl -X POST http://localhost:3000/workspaces/:id/review-cv-draft -d '{"action":"pause"}'
curl -X POST http://localhost:3000/workspaces/:id/review-decision -d '{"action":"change_to_skip"}'
curl -X POST http://localhost:3000/workspaces/:id/confirm-skip         # -> skipped
curl -X POST http://localhost:3000/workspaces/:id/override-skip -d '{"targetDecision":"maybe"}'
curl http://localhost:3001/workspaces/nonexistent-id-1234              # 404 check
```

### Result

PASS

### Evidence

- `apps/web`: `npm run lint` clean, `npx tsc --noEmit` clean, `npm run build` clean (routes
  `/`, `/workspaces`, `/workspaces/[id]`, `/workspaces/new` all compiled).
- List page (`/workspaces`): real backend data rendered correctly after the `nameOriginal` fix —
  company name, role, status, decision all correct, link to detail page correct.
- Detail page (`/workspaces/[id]`): status/decision/reviewState/score/artifacts (including
  `01_vacancy_analysis.md/json`) rendered correctly for a real `paused_after_analysis` workspace.
- Analysis gate: `POST .../review-decision {"action":"approve_apply"}` against the real backend
  returned the exact `ReviewDecisionResult` shape the client code expects
  (`{workspaceId, action, currentDecision: "apply", reviewState: "approved", status:
  "cv_generation_running", canProceedToPrompt2: true}`); re-fetching the detail page confirmed the
  analysis gate correctly disappeared once status left `paused_after_analysis`.
- CV draft gate: drove a workspace to `cv_draft_ready` via `generate-cv-content`; detail page
  correctly rendered "CV draft review" with all four actions; `POST .../review-cv-draft
  {"action":"pause"}` returned the exact `CvDraftReviewResult` shape expected
  (`status: "paused_after_cv_draft"`).
- Skip override: drove a second workspace to `skipped` via `change_to_skip` + `confirm-skip`;
  detail page correctly rendered the override-skip form (not the normal approve/maybe/pause/skip
  buttons); `POST .../override-skip {"targetDecision":"maybe"}` returned the exact
  `OverrideSkipResult` shape expected (`toDecision: "manual_override_maybe"`,
  `status: "cv_generation_running"`).
- 404 handling: `GET /workspaces/nonexistent-id-1234` on the frontend returned `404` (Next's
  `notFound()` triggered correctly on the backend's 404 response).
- Home page and creation-form success state both show working links into the new screens.
- No `apps/api` source changes in this task — its own suite was not re-run.

### Follow-up

- Test workspaces created during this smoke test ("Acme Test Co" / "Skip Test Co") were left in
  the local dev database, consistent with existing untouched test data from prior tasks already
  visible in the same `GET /workspaces` list (no delete endpoint exists; local dev DB only, not
  shared/production).
- Component/unit tests for this UI are out of scope until TASK-062 lands a test runner for
  `apps/web`.
- **Post-PR CodeQL gate (2026-07-18, same day):** PR #110's `Analyze (javascript-typescript)`
  check (TASK-PH-024's gate) failed with 4 critical `js/request-forgery` alerts in
  `apps/web/src/lib/api.ts`, on `submitReviewDecision`/`overrideSkip`/`submitCvDraftReview`/
  `regenerateCvContent`. Real finding, not a false positive: these functions are called from
  `"use server"` Server Actions, which are directly callable RPC endpoints reachable with
  arbitrary arguments regardless of what the UI sends — so the `id` parameter must be treated as
  attacker-controlled, and it was interpolated unescaped into the outgoing fetch URL path
  (CWE-918 path injection risk). Fixed by wrapping every `id` interpolation (including
  `getWorkspace`, not flagged but the same pattern) in `encodeURIComponent()`. Pushed as a second
  commit on the same branch; re-ran CI — `Analyze (javascript-typescript)` and all other required
  checks passed clean, 0 CodeQL alerts remain on the PR.

## 2026-07-16 — TASK-054 — Implement queued Prompt 1 analysis worker

### Scope

`AnalysisWorker` (new `src/queue/workers/analysis.worker.ts`, wired via new `src/queue/queue.module.ts`)
consumes `QueueName.ANALYSIS` jobs and delegates to the existing `Prompt1Service.runAnalysis()`
unchanged. New `POST /workspaces/:id/run-analysis-async` (enqueue) and
`GET /workspaces/:id/analysis-job/:jobId` (status) endpoints on `WorkspacesController`. Unit tests
mock `bullmq`'s `Worker` entirely (no real Redis). Also ran a real end-to-end manual smoke test with
Redis + Postgres actually running, using the fake AI provider (default `AI_PROVIDER`), to verify the
worker really drains the queue and reaches the same human review gate as the sync path.

### Commands

```bash
npx tsc --noEmit
npm run test
npm run lint
docker compose up -d postgres redis
npm run test:e2e
npm run start:dev   # manual smoke test, see Evidence
```

### Result

PASS

### Evidence

- `analysis.worker.spec.ts`: 6/6 tests pass (starts BullMQ `Worker` only when `REDIS_URL` is
  configured, processor delegates to `Prompt1Service.runAnalysis(job.data.workspaceId)`, closes the
  worker on `onModuleDestroy`, no-op when `REDIS_URL` is absent).
- `workspaces.controller.spec.ts`: 3 new tests for `run-analysis-async` (enqueues on
  `QueueName.ANALYSIS` with `{ workspaceId }`, returns `{ jobId }`) and `analysis-job/:jobId`
  (returns status, 404 via `NotFoundException` when the job is missing).
- Full suite: 59/59 suites, 637/637 tests pass (one run showed a transient unrelated failure in
  `import.controller.spec.ts` that passed both in isolation and on immediate re-run of the full
  suite — flaky/resource contention, not caused by this task's changes).
- `npx tsc --noEmit`: clean. `npm run lint`: clean.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass (Postgres + Redis containers running locally).
- Manual smoke test (real `start:dev`, real Redis, fake AI provider): created a workspace, called
  `POST /workspaces/:id/run-analysis-async` → `{"jobId":"1"}`; polled
  `GET /workspaces/:id/analysis-job/1` → `state: "completed"` with the full `RunAnalysisResult`
  (`promptRunId`, `aiRunId`, `decision: apply`, `score: 75`, artifact paths); confirmed via
  `GET /workspaces/:id` that `status` transitioned to `paused_after_analysis` (same review gate as
  the synchronous endpoint) with `01_vacancy_analysis.md/json` registered as artifacts; confirmed
  `GET /workspaces/:id/analysis-job/does-not-exist` → `404`.

### Follow-up

- None. Queue-backed workers for CV generation/export/final-check (the other 3 `QueueName` values)
  are separate future tasks, not required by this task's AC.

## 2026-07-16 — TASK-053 — Implement BullMQ queue abstraction

### Scope

Unit tests for `QueueService` (`enqueue`/`getStatus`/`retry`/`cancel`) with `bullmq`'s `Queue`
class fully mocked, per the task's own test requirement. Also full suite/typecheck/lint/e2e
regression check (no real Redis needed since `bullmq` is entirely mocked in the new spec and
nothing else in the codebase yet calls `QueueService`).

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern=queue.service
npm run test
npm run test:cov
npm run lint
docker compose up -d postgres
npm run test:e2e
```

### Result

PASS

### Evidence

- `queue.service.spec.ts`: 9/9 tests pass (enqueue + per-queue-name Queue-instance reuse, getStatus
  found/not-found, retry/cancel found/not-found → `NotFoundException`).
- Full suite: 59/59 suites, 638/638 tests pass.
- `src/queue` coverage: 100% statements/branches/functions/lines; no global coverage threshold
  regression (ADR-022).
- `npx tsc --noEmit`: clean. `npm run lint`: clean (Prettier reformatted the new spec file only).
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass (after starting `postgres` via
  `docker compose up -d postgres`).

### Follow-up

- None. Wiring `QueueService` into a real worker/module is TASK-054.

## 2026-07-16 — TASK-052 — Add Redis to Docker Compose for later phase

### Scope

Manual check that the new `redis` Docker Compose service starts locally and that the existing
`app`/`postgres` services are unaffected (Redis is not a hard dependency of MVP startup).

### Commands

```bash
docker compose up -d redis
docker ps --filter name=jobflow_redis --format "{{.Names}}: {{.Status}}"
docker exec jobflow_redis redis-cli ping
docker compose up -d
curl -sf http://localhost:3000/health
docker compose down
```

### Result

PASS

### Evidence

- `jobflow_redis` container started standalone (`docker compose up -d redis`) and responded `PONG`.
- Full stack (`docker compose up -d`) started `jobflow_redis`, `jobflow_postgres` (already running,
  2-week-old volume untouched) and recreated `jobflow_app`; all three reached `Up`/`(healthy)`.
- `GET /health` returned `{"status":"ok"}` with Redis present, confirming Redis is additive, not a
  startup dependency (`app` has no `depends_on: redis`).
- `docker compose down` (non-destructive, no `-v`) cleanly removed all three containers.

### Follow-up

- None. BullMQ queue abstraction is TASK-053.

## 2026-07-14 — TASK-045 — Implement existing folder scanner

### Scope

`ImportService.scanRoot()` read-only detection of legacy `Company/YYYY.MM.DD/` folders
(vacancy source, legacy targeted CV markdown, CV PDF, cover letter PDF, SKIP files) and
suggested status per docs/09_artifact_storage.md §15.8. New `GET /import/scan` endpoint.
No DB writes, no workspace creation (out of scope for this task).

### Commands

```bash
npx jest --testPathPattern=import.service
npm run test
npx tsc --noEmit
npm run build
```

### Result

PASS

### Evidence

- `import.service.spec.ts`: 8/8 tests pass — fixture folders (built in OS temp dirs) for
  Action1 (`cv_pdf_generated`), Amach (`cover_letter_generated`), AppsFlyer
  (`source_saved`), Broadvoice (`skipped`, mismatched vacancy/skip role titles produce a
  warning instead of guessing), plus multiple-candidate ambiguity, unparseable date folder
  (`legacyDateConfidence: 'low'`), read-only (folder contents unchanged after scan), and
  no-recognizable-artifacts (`import_needs_review`) cases.
- Full suite: 50/50 suites, 497/497 tests pass.

## 2026-07-14 — TASK-PH-017 — Add coverage measurement, diff/patch coverage gating and CI-enforced e2e suite

### Scope

`collectCoverageFrom` exclusions + measured global `coverageThreshold` in `package.json`;
`codecov.yml` (patch coverage 80%); `.github/workflows/ci.yml` `test` job now runs
`test:cov` + uploads to Codecov, new `test-e2e` job runs `prisma migrate deploy` +
`prisma db seed` + `test:e2e`; new `test/skip-flow.e2e-spec.ts` covering the
`change_to_skip` two-step transition (ADR-016); README coverage badge; ADR-022.

### Commands

```bash
npm run test:cov -- --coverageReporters=text-summary
npx tsc --noEmit
npm run test:e2e
npm run build
```

### Result

PASS

### Evidence

- Baseline coverage measured before setting thresholds: statements 91.59% (1438/1570),
  branches 71.21% (292/410), functions 92.01% (196/213), lines 91.41% (1352/1479).
  Threshold set to statements 90 / branches 68 / functions 90 / lines 90 (regression
  floor with small margin, not a target).
- `npm run test:cov`: 50/50 suites, 498/498 tests pass, coverage threshold met (no
  Jest coverage-threshold failure).
- `npx tsc --noEmit`: clean, zero errors.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass (`mvp-flow.e2e-spec.ts`,
  `rate-limiting.e2e-spec.ts`, new `skip-flow.e2e-spec.ts`).
- `npm run build`: clean.

### Follow-up

- Discovered (not fixed here, tracked in `TASK_BOARD.md` "Known Gaps"): `prisma/seed.ts`
  does not seed an active `skip_reason` PromptTemplate, so `POST /workspaces/:id/confirm-skip`
  throws `500` on any standard-seeded environment (including CI). The `skip-flow.e2e-spec.ts`
  test was scoped to the `change_to_skip` transition only (user-confirmed) rather than the
  full skip-artifact-creation path, pending a separate task to add skip-reason prompt content.
- Codecov upload (`codecov/codecov-action@v4` in CI) has not yet been verified against a real
  GitHub Actions run in this session — local coverage generation and threshold enforcement
  were verified locally; the CI upload step itself should be confirmed green on the PR.
- `npx tsc --noEmit`: clean.
- `npm run build`: clean (`nest build`).

### Follow-up

- TASK-046 (import preview + manual metadata correction) and TASK-047 (import
  confirmation + artifact registration) are the next steps; this task deliberately
  creates no `ApplicationWorkspace`/`GeneratedArtifact` records.

### 2026-07-14 — Post-PR CodeQL fix — path-injection on GET /import/scan

CodeQL (`js/path-injection`, High) flagged `fs.readdir()` calls in `import.service.ts`
fed by the `rootPath` query param on `GET /import/scan`, unguarded unlike
`ArtifactStorageService.assertInsideStorageRoot`. Fixed by removing the caller-supplied
path entirely: added an optional `IMPORT_ROOT` env var (`env.validation.ts`,
`.env.example`); `ImportService.scanRoot()` now takes no argument and resolves its root
via `ConfigService.getOrThrow('IMPORT_ROOT')` at call time; `GET /import/scan` no longer
accepts a query param. No untrusted input reaches the filesystem call.

```bash
npx jest --testPathPattern=import.service
npx jest --testPathPattern=env.validation
npm run test
npx tsc --noEmit
npm run lint
npm run build
```

Result: PASS — 50/50 suites, 498/498 tests pass (1 new `env.validation.spec.ts` case
for `IMPORT_ROOT`); `npx tsc --noEmit`/`npm run build` clean.

## 2026-07-13 — TASK-PH-009 — Reapply rate limiting onto current main

### Scope

Reapplied rate limiting fresh against current `main` (superseding the
orphaned, never-merged `task/TASK-PH-003-rate-limiting` branch). Installed
`@nestjs/throttler`, registered `ThrottlerModule.forRootAsync` in
`app.module.ts` reading `THROTTLE_TTL` (seconds, converted to ms for
throttler v6) and `THROTTLE_LIMIT` via `ConfigService`, and registered
`ThrottlerGuard` globally via `APP_GUARD`. Added `@SkipThrottle()` to
`GET /health` (user-confirmed scope addition, outside the literal backlog
wording) so container healthchecks/uptime monitors are never throttled.
Added `test/rate-limiting.e2e-spec.ts` (new file, distinct concern from
`mvp-flow.e2e-spec.ts`) with a low `THROTTLE_LIMIT=5` override, asserting
`429` once the limit is exceeded and confirming `/health` stays at `200`
past the same limit. `TASK_BOARD.md` TASK-PH-003 row corrected from `DONE`
to `SKIPPED` with a note that it's superseded by this task.

### Commands

```bash
npm install @nestjs/throttler --save                              # clean install
npx tsc --noEmit                                                   # clean
npm run test                                                       # 47 suites, 475 tests
npm run test:e2e                                                   # 2 suites, 3 tests (real Postgres)
```

### Result

PASS

### Evidence

- `test/rate-limiting.e2e-spec.ts`: first test sends `THROTTLE_LIMIT` (5)
  requests to `GET /version`, each asserted not `429`; the 6th request
  asserted `429`. Pino request logs confirm `x-ratelimit-remaining` counting
  down 4→0 then a `429` with `retry-after: 60` on request 6. Second test
  sends `THROTTLE_LIMIT + 3` (8) requests to `GET /health` and asserts every
  one returns `200`, confirming the `@SkipThrottle()` exemption works even
  past the limit.
- `test/mvp-flow.e2e-spec.ts` unaffected — logs show its requests carry
  `x-ratelimit-limit: 100` (production default), confirming the throttler
  config is read from env correctly per-run and doesn't leak between test
  files.
- Full suite: 47/47 suites, 475/475 unit tests pass; e2e: 2/2 suites, 3/3
  tests pass.

### Follow-up

- None. Next recommended task per `TASK_BOARD.md`: TASK-PH-010 (security
  governance files).

## 2026-07-13 — TASK-PH-014 — Fix CodeQL code-scanning findings (path-injection guard, ReDoS/length hardening)

### Scope

Fixed the one real gap among the 4 open CodeQL alerts found during a
routine post-merge check: `ArtifactStorageService.saveVacancySource()`
built a file path from caller-supplied `workspaceFolderPath` and wrote to
it without calling `assertInsideStorageRoot()`, unlike the sibling
`writeFile()` method. Added the same guard. Also added `@MaxLength(200)`
to `CreateWorkspaceDto.companyNameOriginal`/`roleTitleOriginal` to bound
input length feeding the `slug.service.ts` regexes CodeQL flagged as
polynomial-ReDoS candidates (the regexes themselves are simple
single-quantifier patterns, not classic exponential ReDoS — this closes
the "unbounded input" precondition rather than rewriting the regexes).
Did not touch `createWorkspaceFolder`'s `js/path-injection` alert — it's
already guarded by `assertInsideStorageRoot()` on the preceding line;
CodeQL likely doesn't recognize the hand-rolled guard as a sanitizer, and
adding a second redundant guard call has no security value.

### Commands

```bash
npm run test          # 47 suites, 479 tests (4 new)
npx tsc --noEmit
```

### Result

PASS

### Evidence

- New test `artifact-storage.service.spec.ts`: `saveVacancySource` throws
  `/Path traversal/` when given a `workspaceFolderPath` outside
  `STORAGE_ROOT`.
- New tests `create-workspace.dto.spec.ts`: 200-char `companyNameOriginal`
  passes, 201-char fails; 201-char `roleTitleOriginal` fails.
- Full suite: 47/47 suites, 479/479 tests pass (475 baseline + 4 new).
- `npx tsc --noEmit`: clean.

### Follow-up

- Confirmed post-merge (PR #67, merged 2026-07-13T17:14): the CodeQL
  workflow re-ran on `main` (success) but did **not** auto-close any of
  the 4 alerts — `gh api .../code-scanning/alerts` showed all 4 still
  `open` with `created_at` unchanged (16:44, pre-fix), meaning CodeQL's
  static taint analysis does not recognize the custom
  `assertInsideStorageRoot()` guard method as a sanitizer, and does not
  connect a DTO-level `@MaxLength` in a different file to the regex call
  site. This confirms the hypothesis above rather than contradicting it.
  Manually dismissed all 4 via `gh api --method PATCH
  .../code-scanning/alerts/{n}` with `dismissed_reason` and
  `dismissed_comment`: alerts #3 (`createWorkspaceFolder`) and #4
  (`saveVacancySource`) as `"false positive"` (guard exists/verified by
  test); alerts #1/#2 (`slug.service.ts` ReDoS) as `"won't fix"` (simple
  linear-time regex, input now bounded, risk accepted for a
  single-operator tool). All comments reference the specific fix/test as
  the justification, per code-scanning dismissal best practice — no
  silent/unexplained dismissals.

## 2026-07-13 — TASK-PH-013 — Remediate Dependabot-reported dependency vulnerabilities

### Scope

Fixed the 7 high-severity Dependabot alerts surfaced immediately after
TASK-PH-010 enabled scanning (`multer` via `@nestjs/platform-express`,
`lodash` via `@nestjs/swagger`), plus moderate `qs`/`file-type`/`js-yaml`
advisories. Used a `package.json` `"overrides"` entry to force `lodash`,
`multer`, `qs`, `file-type` and `js-yaml` to patched versions on the
*same major line* already used elsewhere in the dependency tree, avoiding
the NestJS v10→v11 major-version bump that `npm audit fix --force` would
otherwise require. Remaining 3 moderate `@nestjs/core` "Injection"
advisories (GHSA-36xv-jgw5-4q75) have no fix without the NestJS v11 major
upgrade — left open, documented here, tracked as a possible future task
if it recurs after PH-013.

### Commands

```bash
npm audit --omit=dev                # baseline: 11 vulns (7 high, 4 moderate)
# added "overrides" to package.json: lodash ^4.18.1, multer ^2.2.0,
# qs ^6.15.3, file-type ^21.3.4, js-yaml ^4.3.0
npm install
npm audit --omit=dev                # after: 3 vulns (0 high, 3 moderate)
npm run test                        # 47 suites, 475 tests
npx tsc --noEmit
npm run build
npm run test:e2e                    # 2 suites, 3 tests (real Postgres)
npm run start:dev                   # manual smoke check
curl http://localhost:3000/api-json
curl -X POST http://localhost:3000/workspaces ... (full pipeline through export-cv)
```

### Result

PASS

### Evidence

- `npm audit --omit=dev` before: 11 vulnerabilities (7 high: `multer`,
  `lodash` and dependents; 4 moderate: `qs`, `file-type`, `js-yaml` and
  dependents).
- `npm audit --omit=dev` after: 3 vulnerabilities, all moderate
  (`@nestjs/core` "Improperly Neutralizes Special Elements in Output"
  advisory, GHSA-36xv-jgw5-4q75 — fix only via NestJS v11 major bump, out
  of scope for this narrower fix). 0 high, 0 low remaining.
- `npm run test`: 47/47 suites, 475/475 tests pass — no regression.
- `npx tsc --noEmit`: clean. `npm run build`: succeeds.
- `npm run test:e2e`: 2/2 suites, 3/3 tests pass, including the full MVP
  pipeline (`mvp-flow.e2e-spec.ts`) through PDF export with real Postgres.
- Manual smoke check: started `npm run start:dev`, confirmed
  `GET /health` returns `200`, `GET /api-json` returns valid OpenAPI JSON
  (title "JobFlow CV Pipeline", 16 paths) confirming Swagger UI still
  works post-`lodash`/`js-yaml` patch. Drove the full workspace pipeline
  via curl (create → run-analysis → review-decision approve_apply →
  generate-cv-content → review-cv-draft approve → export-cv) and
  confirmed a real 110824-byte `04_cv_export.pdf` was generated via
  Puppeteer, confirming `@nestjs/platform-express`/`multer` patch didn't
  break request handling. Test workspace folder removed after
  verification.
- Dev-only vulnerabilities remaining in full `npm audit` (not
  `--omit=dev`): `glob`/`tmp`/`webpack`/`picomatch`/`ajv` under
  `@nestjs/cli`'s dependency tree — build/dev tooling only, does not ship
  to production, out of scope per this task's acceptance criteria
  (production dependencies only).

### Follow-up

- The 3 remaining moderate `@nestjs/core` alerts require the NestJS v11
  major-version upgrade to close — not pursued here per the scope
  decision in `CURRENT_TASK.md` (escalate only if overrides fail; they
  didn't fail, but this specific advisory has no narrower fix). Revisit
  if/when a NestJS v11 upgrade task is undertaken.

## 2026-07-13 — TASK-PH-010 — Add security governance files (SECURITY.md, Dependabot, CodeQL)

### Scope

Added baseline GitHub security governance: `SECURITY.md` (supported
versions = "latest `main` only"; vulnerability reporting via GitHub
Security Advisories, per user's explicit channel choice over a plain
email address), `.github/dependabot.yml` (weekly update checks for `npm`
and `github-actions` ecosystems), `.github/workflows/codeql.yml` (CodeQL
analysis for `javascript-typescript`, triggered on push/PR to `main` and
weekly via cron, using `github/codeql-action@v3`). No `src/**` files
touched.

### Commands

```bash
npm run test         # 47 suites, 475 tests — sanity check, no regression expected
npx tsc --noEmit      # clean
```

### Result

PASS. Manual GitHub-side verification completed after push: PR #51 checks
show `CodeQL / Analyze (javascript-typescript)` and `Code scanning results
/ CodeQL` both green ("No new alerts in code changed by this pull
request"); Dependabot confirmed active — repo's Dependabot alerts tab
shows 20 open alerts scanned from `package-lock.json`.

### Evidence

- `npm run test`: 47/47 suites, 475/475 tests pass — unchanged from
  TASK-PH-009 baseline, confirming no regression from the new GitHub
  config files.
- `npx tsc --noEmit`: no errors.
- New files: `SECURITY.md`, `.github/dependabot.yml`,
  `.github/workflows/codeql.yml`. `git diff --stat` shows no `src/**`
  changes.

### Follow-up

- None for this task. The 20 Dependabot alerts surfaced on the default
  branch (mostly transitive deps — `lodash`, `multer`, `tmp`, `qs`, `glob`
  via `package-lock.json`) are out of scope here (TASK-PH-010 was scanning
  setup only, not remediation) and are candidates for a future dependency
  update task.

## 2026-07-13 — TASK-043 — Implement Prompt 5 final check

### Scope

Added the optional Prompt 5 final check: `Prompt5InputBuilderService` (gates
on `cv_pdf_generated`, reads `04_cv_export.html` + `02_targeted_cv_content.json`
required, `01_vacancy_analysis.json` + `03_pre_pdf_check.json` optional
context), `Prompt5Service` (PromptRun/AiRun lifecycle, writes/registers
`05_final_check.md/.json`), `POST /workspaces/:id/run-final-check`. New
`src/pipeline/schemas/final-check.schema.ts` with `final_decision`
(`ready_to_send`/`needs_edit`/`do_not_send`) and a `final_checklist` object.
Unlike Prompt 3 (TASK-042, which the backlog required to leave
`workspace.status` untouched), this task's backlog AC was silent on status
and `docs/08_ai_pipeline.md` §14.6 documents `status -> final_check_ready` as
part of the design — confirmed with user: on success, `workspace.status`
transitions `cv_pdf_generated -> final_check_ready`; on failure, status stays
at `cv_pdf_generated` so the PDF remains downloadable.
`WorkspaceStatusService.TRANSITIONS` updated to match. Added `FAKE_PROMPT5_JSON`
to the fake provider and a placeholder `prompt_5` seed template
(`prisma/prompts/prompt5.txt`).

Also, at user's request during review (outside this task's original scope):
renamed `prompt1.schema.ts` → `vacancy-analysis.schema.ts` and
`prompt2.schema.ts` → `targeted-cv-content.schema.ts` (with every exported
type/function renamed to match), unifying schema-file naming on the
canonical-artifact convention that `skip-reason.schema.ts`,
`pre-pdf-check.schema.ts` and this task's own `final-check.schema.ts` already
followed. Documented as ADR-021. Committed separately from the Prompt 5
feature commit.

### Commands

```bash
npx tsc --noEmit                                                # clean
npm run lint                                                     # clean
npm run test -- --testPathPattern=final-check.schema              # 1 suite, 23 tests
npm run test -- --testPathPattern=prompt5                         # 2 suites, 21 tests
npm run test -- --testPathPattern=workspace-status.service        # 1 suite, 32 tests
npm run test                                                      # → 47 suites, 475 tests
npm run test:e2e                                                  # 1 suite, 1 test, pass (real Postgres)
npx prisma db seed                                                 # 4 active PromptTemplate rows (was 3)
```

### Result

PASS

### Evidence

- `prompt5-input-builder.service.spec.ts` (6 tests) and `prompt5.service.spec.ts`
  (15 tests): gate on `cv_pdf_generated`, missing-artifact handling,
  PromptRun/AiRun lifecycle, artifact registration with `origin: 'prompt_5'`,
  status transition to `final_check_ready` on success only, status left
  unchanged on AI-provider-failure and JSON-validation-failure paths.
- `final-check.schema.spec.ts` (23 tests): all `final_decision` values
  accepted, missing/invalid field rejection for every top-level and
  `final_checklist` field.
- `workspace-status.service.spec.ts`: added `cv_pdf_generated ->
  cv_pdf_generated` and `cv_pdf_generated -> final_check_ready` to valid
  transitions; `final_check_ready -> final_check_ready` added to invalid
  transitions (still terminal).
- Manual end-to-end smoke test against real Postgres + fake AI provider
  (`npm run start:dev` on an alternate port, full HTTP flow): workspace →
  `run-analysis` → `review-decision` (apply) → `generate-cv-content` →
  `run-pre-pdf-check` (optional, confirms Prompt 3/5 compose without
  conflict) → `review-cv-draft` (approve) → `export-cv`
  (`status: cv_pdf_generated`) → **`run-final-check`** (returned
  `finalDecision: "ready_to_send"`, `workspaceStatus: "final_check_ready"`,
  wrote `05_final_check.md/.json` to disk with correct content) → confirmed
  a second call on the now-`final_check_ready` workspace returns
  `400 Bad Request`. Test workspace folders removed from
  `storage/applications/` after verification.
- Full suite: 47/47 test suites, 475/475 tests passed. e2e mechanical MVP
  flow (fake provider) passed unchanged.

### Follow-up

- Real Prompt 5 prompt-engineering content (`prisma/prompts/prompt5.txt` is
  currently a placeholder) — same follow-up pattern as TASK-037B/TASK-042.

## 2026-07-10 — TASK-041 — Implement artifact latest-version marking

### Scope

Extended `ArtifactsService.register()` to support version replacement.
Before creating a new `GeneratedArtifact` row, it now looks up the current
`isLatest: true` row for the same `workspaceId + artifactType`. If found,
that row is flipped to `isLatest: false` via `updateMany`, and the new row's
`version` is set to `previous.version + 1`; otherwise `version` stays `1`.
No Prisma migration was needed — `isLatest`/`version` already existed on
`GeneratedArtifact`. All existing `register()` callers (prompt1, prompt2,
skip-reason, html-renderer, document-export, workspaces) are unaffected.

### Commands

```bash
npx tsc --noEmit                                              # clean
npm run lint                                                   # clean
npm run test -- --testPathPattern=artifacts.service            # 1 suite, 9 tests
npm run test                                                    # → 40 suites, 382 tests, 0 failures
npm run test:e2e                                                # 1 suite, 1 test, pass (real Postgres)
```

### Result

PASS

### Evidence

- `artifacts.service.spec.ts`: new cases — "assigns version 1 and skips
  updateMany when no prior artifact of this type exists", "marks the
  previous latest artifact of the same type as false and bumps the version",
  "does not affect artifacts of a different type in the same workspace".
- Full suite: 40/40 test suites, 382/382 tests passed.
- e2e mechanical MVP flow (fake provider) passed against real Postgres.

### Follow-up

- none.

## 2026-07-13 — TASK-042 — Implement Prompt 3 pre-PDF check

### Scope

Added the optional Prompt 3 pre-PDF safety check: `Prompt3InputBuilderService`
(gates on `cv_draft_ready`/`paused_after_cv_draft`, reads
`02_targeted_cv_content.json` required + `01_vacancy_analysis.json` optional
context), `Prompt3Service` (PromptRun/AiRun lifecycle, writes/registers
`03_pre_pdf_check.md/.json`), `POST /workspaces/:id/run-pre-pdf-check`.
Extended `PrePdfCheckOutput` schema with a required `readiness` field
(`ready`/`ready_with_minor_edits`/`not_ready`). Added `FAKE_PROMPT3_JSON` to
the fake provider and a placeholder `prompt_3` seed template
(`prisma/prompts/prompt3.txt`). Deliberately does not change
`workspace.status` — the AC requires the default MVP flow not depend on this
optional step; Step 4 (`html-renderer.service.ts`) already read/applied
`03_pre_pdf_check.json` corrections from an earlier task and was not changed.

### Commands

```bash
npx tsc --noEmit                                                # clean
npm run lint                                                     # clean
npm run test -- --testPathPattern=cv-content.schema               # 1 suite, 22 tests
npm run test -- --testPathPattern=prompt3                         # 2 suites, pass
npm run test                                                      # → 42 suites, 407 tests
                                                                    #   (1 pre-existing flaky
                                                                    #   Puppeteer timeout under
                                                                    #   full-suite load — passes
                                                                    #   in isolation, unrelated
                                                                    #   to this change)
npm run test:e2e                                                  # 1 suite, 1 test, pass (real Postgres)
npx prisma db seed                                                 # 3 active PromptTemplate rows (was 2)
```

### Result

PASS

### Evidence

- `prompt3-input-builder.service.spec.ts` (7 tests) and `prompt3.service.spec.ts`
  (16 tests): gate on status, missing-artifact handling, PromptRun/AiRun
  lifecycle, artifact registration with `origin: 'prompt_3'`, no
  `workspace.status` change on success or failure paths.
- `cv-content.schema.spec.ts`: added "rejects missing readiness" / "rejects
  invalid readiness value" cases; existing `validatePrePdfCheckJson` fixtures
  updated with `readiness`.
- Manual end-to-end smoke test against real Postgres + fake AI provider
  (`npm run start:dev` on an alternate port, full HTTP flow): created
  workspace → `run-analysis` → `review-decision` (apply) →
  `generate-cv-content` → **`run-pre-pdf-check`** (returned
  `readiness: "ready_with_minor_edits"`, wrote `03_pre_pdf_check.md/.json`
  to disk) → confirmed `workspace.status` unchanged (`cv_draft_ready`) →
  `review-cv-draft` (approve) → `export-cv` succeeded
  (`status: cv_pdf_generated`) → confirmed the exported
  `04_cv_export.html` contains the Prompt 3 `suggested_text` correction
  (proves Step 4 already reads and applies `03_pre_pdf_check.json`). Also
  confirmed `run-pre-pdf-check` returns `400 Bad Request` when called against
  a workspace past the CV draft stage (`cv_pdf_generated`). Test workspace
  folder removed from `storage/applications/` after verification.
- Full suite: 42/42 test suites (1 known-flaky Puppeteer real-browser test
  passes in isolation), 407/407 unit tests passed. e2e mechanical MVP flow
  (fake provider) passed unchanged — confirms Prompt 3 remains fully optional.

### Follow-up

- Real Prompt 3 prompt-engineering content (`prisma/prompts/prompt3.txt` is
  currently a placeholder) — same follow-up pattern as TASK-037B did for
  Prompt 1/2.

## 2026-07-13 — Test hygiene — split schema spec files 1:1, add skip-reason coverage (ADR-020)

### Scope

Not tied to a task ID — found and fixed during TASK-042 review, at user's
request. `validatePrePdfCheckJson` tests lived inside
`cv-content.schema.spec.ts` instead of a dedicated
`pre-pdf-check.schema.spec.ts`, breaking the one-file-one-spec convention
used elsewhere (`prompt1.schema.ts`/`.spec.ts`, `prompt2.schema.ts`/`.spec.ts`).
Moved the block as-is into a new `pre-pdf-check.schema.spec.ts`.
`validateSkipReasonJson` (`skip-reason.schema.ts`) had no dedicated spec file
at all (only indirect happy-path coverage via
`skip-reason.service.spec.ts`) — added `skip-reason.schema.spec.ts` covering
missing fields, invalid `decision`, non-integer `score`, wrong-typed array
elements and empty arrays. Documented the convention as ADR-020 and a new
CLAUDE.md Testing Rule.

### Commands

```bash
npx tsc --noEmit                                                     # clean
npm run test -- --testPathPattern="cv-content.schema|pre-pdf-check.schema|skip-reason.schema"
                                                                        # 3 suites, 44 tests
npm run test                                                          # → 44 suites, 427 tests, 0 failures
```

### Result

PASS

### Evidence

- `pre-pdf-check.schema.spec.ts`: 8 tests (moved, unchanged assertions).
- `skip-reason.schema.spec.ts`: 20 new tests.
- `cv-content.schema.spec.ts`: now only tests `validateCvContentJson` (14 tests).
- Full suite: 44/44 test suites, 427/427 tests passed (the previously-flaky
  Puppeteer real-browser test also passed this run).

### Follow-up

- none.

## 2026-07-10 — TASK-040 — Add workspace artifact summary API

### Scope

Extended `GET /workspaces/:id` (existing endpoint) to return a combined
detail response: the workspace entity (including `status`, `currentDecision`,
`score`, `company`, `jobVacancy`) plus a new `artifacts` summary array built
from `ArtifactsService.findByWorkspaceId`. Added `WorkspacesService.getWorkspaceDetail(id)`
composing `findById()` + artifact summaries; controller now calls this method
instead of `findById()` directly. Each artifact summary entry exposes both
`canonicalFileName` and `downloadFileName` as distinct fields. The separate
`GET /workspaces/:id/artifacts` endpoint (TASK-016) was left unchanged.

### Commands

```bash
npx tsc --noEmit                                    # clean
npm run lint                                         # clean
npm run test -- --testPathPattern=workspaces         # 4 suites, 51 tests
npm run test                                          # → 40 suites, 379 tests, 0 failures
npm run test:e2e                                      # 1 suite, 1 test, pass (real Postgres)
```

### Result

PASS

### Evidence

- `workspaces.service.spec.ts`: new `getWorkspaceDetail` describe block — asserts a
  workspace with vacancy-source, analysis (md+json) and PDF export artifacts returns
  `status`/`currentDecision`/`score` plus all 4 artifacts with correct
  canonical/download names; also asserts `null` for unknown workspace id without
  calling `findByWorkspaceId`.
- `workspaces.controller.spec.ts`: `GET /workspaces/:id` test rewritten to mock
  `getWorkspaceDetail` and assert the full response shape (status, decision, score,
  4-artifact array with distinct canonical/download names).
- Full suite went from 377 → 379 tests (40 suites unchanged), all passing.
- `npm run test:e2e` (`test/mvp-flow.e2e-spec.ts`, real Postgres via Docker) still
  passes — confirms no regression in the full HTTP flow.
- `npx tsc --noEmit` and `npm run lint` both clean.

### Follow-up

- none — TASK-041 (artifact latest-version marking) is a separate future task.

## 2026-07-08 — TASK-039 — Implement workspace status transition service

### Scope

Added `WorkspaceStatusService` (`src/workspaces/workspace-status.service.ts`) with a
transition map derived from actual runtime behavior across `prompt1.service.ts`,
`prompt2.service.ts`, `skip-reason.service.ts`, `review-gates.service.ts` and
`document-export.service.ts` (not from the `docs/03_domain_model.md` §8.6 table,
which disagrees on one path — see `CURRENT_TASK.md` Scope Decision). Existing
call sites were intentionally left unchanged (no refactor); the new service is
standalone and registered as a provider in `WorkspacesModule` only.

### Commands

```bash
npx tsc --noEmit                                        # clean
npm run lint                                             # clean
npm run test -- --testPathPattern=workspace-status       # 1 suite, 30 tests
npm run test                                              # → 40 suites, 377 tests, 0 failures
```

### Result

PASS

### Evidence

- `workspace-status.service.spec.ts`: 30 tests — 18 valid transitions (every row of the
  `CURRENT_TASK.md` State Machine table) + 11 invalid pairs (including
  `skipped -> export_running`, `source_saved -> cv_draft_ready`,
  `cv_pdf_generated -> *`, `failed -> *`) + 1 error-message assertion, all pass.
- Full suite went from 39 → 40 suites, 347 → 377 tests, all passing (no regressions).
- `npx tsc --noEmit` and `npm run lint` both clean.

### Follow-up

- Wiring `WorkspaceStatusService.assertValidTransition` into the existing
  status-writing call sites as an enforced gate is a separate future task
  (not in TASK-039 scope, per user decision 2026-07-08).

## 2026-07-08 — TASK-006B — Add P0 unit tests for core MVP logic

### Scope

Gap analysis against the 8 TASK-006B acceptance criteria (company/role slug normalization, empty-field validation, canonical artifact naming, skip decision behavior, Prompt 2 approval gate, manual override logging, anti-overclaiming guard) found 7 of 8 already covered by existing spec files (`slug.service.spec.ts`, `create-workspace.dto.spec.ts`, `artifact-storage.service.spec.ts`, `skip-reason.service.spec.ts`, `prompt2-input-builder.service.spec.ts`, `review-gates.service.spec.ts`, `document-export.service.spec.ts`). The one gap: `evidence-guard.service.ts` had no dedicated critical pattern for DynamoDB or MySQL production claims (backlog AC8 explicitly names "AWS/DynamoDB/MySQL without evidence"), only a generic AWS pattern. Added two `CriticalPattern` entries (DynamoDB production, MySQL production) to `CRITICAL_PATTERNS` and matching positive-match tests (patterns 16 and 17) to `evidence-guard.service.spec.ts`, following the existing pattern-test convention in that file.

### Commands

```bash
npx tsc --noEmit                 # clean
npm run lint                     # clean
npm run test                     # → 39 suites, 347 tests, 0 failures
```

### Result

PASS

### Evidence

- `evidence-guard.service.spec.ts`: 2 new tests (`pattern 16: flags DynamoDB production experience`, `pattern 17: flags MySQL production experience`), both pass.
- Full suite went from 345 → 347 tests (39 suites unchanged), all passing.
- No other source files touched — all other AC7 items confirmed already covered by pre-existing tests (see task conversation for per-AC evidence file/test-name mapping).

### Follow-up

- none.

## 2026-07-08 — TASK-038 — Create mechanical MVP smoke test with fake provider

### Scope

Added `POST /workspaces/:id/generate-cv-content` (missing endpoint for `Prompt2Service.generateCvContent`, documented in CLAUDE.md's data flow but never wired to `WorkspacesController` — added in scope per user approval). Added `test/mvp-flow.e2e-spec.ts`: one automated e2e test driving the full MVP mechanics over real HTTP against a real local Postgres, using the fake AI provider — create workspace → run Prompt 1 analysis → approve apply → generate CV content (Prompt 2 + anti-overclaiming guard) → approve CV draft → export PDF — asserting artifacts on disk and in `GeneratedArtifact`/`AiRun` at each step, including that export creates no new `AiRun` (ADR-012).

### Commands

```bash
npx tsc --noEmit                 # clean
npm run lint                     # clean
npm run test                     # → 39 suites, 345 tests, 0 failures
docker compose ps                # jobflow_postgres already Up
npm run test:e2e                 # → 1 suite, 1 test, PASS
```

### Result

PASS

### Evidence

- `test:e2e` output: all 6 HTTP steps returned 201; final test assertions on artifact filenames (`00_vacancy_source.txt`, `01_vacancy_analysis.md/json`, `02_targeted_cv_content.md/json`, `04_cv_export.pdf`) and workspace status `cv_pdf_generated` passed.
- `STORAGE_ROOT` isolated to a `fs.mkdtempSync` temp dir per run (never touches real `storage/applications/`); temp dir removed in `afterAll`.
- Test workspace/company/vacancy/artifacts/promptRuns/aiRuns rows deleted in `afterAll` in FK-safe order (no cascade deletes defined in `schema.prisma`).
- Re-ran `test:e2e` a second time back-to-back — passed identically, confirming cleanup leaves no residue that would break a repeat run.
- Unit suite (345/345) unaffected; `workspaces.controller.spec.ts` updated with a `Prompt2Service` mock and a passing test for the new endpoint.

### Follow-up

- TASK-038A (real OpenAI provider smoke test against a real vacancy) is next per `docs/07_task_backlog.md`; not started automatically per Operating Rules.

## 2026-07-05 — TASK-PH-004 — Add husky + lint-staged pre-commit hooks

### Scope

Install `husky` v9 and `lint-staged` v16 as devDependencies. Wire `prepare: "husky"` in `package.json`. Create `.husky/pre-commit` that runs `npx lint-staged`. Configure `lint-staged` to run `eslint --fix` + `prettier --write` on staged `*.ts` files. Manual verification that a commit with an unfixable lint error is rejected.

### Commands

```bash
# Baseline
npm run test  # → 31 suites, 292 tests, 0 failures

# Install
npm install --save-dev husky lint-staged  # → husky@9.1.7, lint-staged@16.4.0

# Init husky (v9 — sets prepare: "husky" in package.json, creates .husky/)
npx husky init

# Manual lint rejection test
echo "const lintTest = 'unused';" > src/_lint_test_temp.ts
git add src/_lint_test_temp.ts
git commit -m "test: lint hook verification"
# → commit rejected: 'lintTest' is assigned a value but never used (no-unused-vars)

# Clean up test file
git rm --cached src/_lint_test_temp.ts && rm src/_lint_test_temp.ts

# After changes
npm run test  # → 31 suites, 292 tests, 0 failures (unchanged)
```

### Result

PASS. Test count unchanged. Commit correctly rejected on lint error.

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS (no regressions)
- Lint rejection output (abridged):
  ```
  [FAILED] eslint --fix [FAILED]
  ✖ eslint --fix:
  src/_lint_test_temp.ts
    1:7  error  'lintTest' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  ✖ 1 problem (1 error, 0 warnings)
  husky - pre-commit script failed (code 1)
  ```
- `prepare: "husky"` script set by `npx husky init`
- `.husky/pre-commit` contains `npx lint-staged`
- `lint-staged` config in `package.json`: `{ "*.ts": ["eslint --fix", "prettier --write"] }`

### Note on husky v9 vs task spec

`CURRENT_TASK.md` references v8 commands (`prepare: "husky install"`, `npx husky install`). In husky v9 the equivalent is `prepare: "husky"` and `npx husky init`. The end behavior is identical — hooks installed on `npm install`.

### Follow-up

- Next: TASK-PH-005 or TASK-PH-006 (CI/GitHub Actions)

---

## 2026-07-05 — TASK-032A — Add missing current_work_block to Prompt2CvContent

### Scope

Schema/fixture fix: add `current_work_block` to `Prompt2CvContent`, `validatePrompt2Json()`, `FAKE_PROMPT2_JSON`, and affected test fixtures.

### Commands

```bash
# Baseline (before changes)
npm run test  # → 30 suites, 283 tests

# After changes
npm run test  # → 30 suites, 285 tests (+2 new tests for current_work_block)
npx tsc --noEmit  # → clean
```

### Result

PASS. +2 tests (accepts valid current_work_block / rejects missing current_work_block). TypeScript clean.

---

## 2026-07-05 — TASK-035C — NestJS module architecture cleanup

### Scope

Verify test suite remains stable after removing 7 redundant AppModule imports and deleting orphaned `skip-reason.module.ts`.

### Commands

```bash
# Baseline (before changes)
npm run test
# → 30 suites, 283 tests, 0 failures

# After changes
npm run test
# → 30 suites, 283 tests, 0 failures

npx tsc --noEmit
# → no output (clean)

# Confirm SkipReasonModule is gone
grep -r "SkipReasonModule" src/
# → no matches
```

### Result

PASS. Test count unchanged (283/283). TypeScript clean. No references to `SkipReasonModule` remain.

---

## 2026-06-28 — TASK-001 — Initialize NestJS project structure

### Scope

Basic NestJS bootstrap: health endpoint, unit test, TypeScript build.

### Commands

```bash
npm install
npm run test
npm run build
```

### Result

PASS

### Evidence

- `npm run test`: 1 suite, 1 test — `AppController › health › returns { status: "ok" }` — PASS (3.7s)
- `npm run build`: exits cleanly, no TypeScript errors
- Files created: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `.eslintrc.js`, `.prettierrc`, `.gitignore`, `src/main.ts`, `src/app.module.ts`, `src/app.controller.ts`, `src/app.controller.spec.ts`, `test/jest-e2e.json`, `README.md`

### Follow-up

- Next task: TASK-002 or TASK-004 (per backlog dependency order)

---

## 2026-06-28 — TASK-004 — PostgreSQL persistence verification

### Scope

Named Docker volume `postgres_data` survives `docker compose down` + `docker compose up -d postgres`.

### Commands

```bash
docker compose up -d postgres
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv \
  -c "CREATE TABLE persistence_check (id serial PRIMARY KEY, note text); INSERT INTO persistence_check (note) VALUES ('task-004-test');"
docker compose down
docker compose up -d postgres
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv -c "SELECT * FROM persistence_check;"
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv -c "DROP TABLE persistence_check;"
```

### Result

PASS

### Evidence

- Container started on port 5433 (5432 was already allocated on this machine; `POSTGRES_PORT` in `.env` set to 5433)
- `CREATE TABLE` + `INSERT 0 1` — row written before stop
- `docker compose down` removed container and network, volume `postgres_data` retained
- After `docker compose up -d postgres`, row `id=1, note='task-004-test'` still present
- Test table dropped after verification

### Follow-up

- `.env.example` uses port 5432 (default). Local `.env` uses 5433 due to host conflict. No change needed to example — developers adjust `POSTGRES_PORT` if their 5432 is occupied.
- Next task: TASK-005 (persistence checklist script) or TASK-006 (Prisma setup).

---

## 2026-06-28 — TASK-005 — PostgreSQL persistence verification script

### Scope

`scripts/check-postgres-persistence.sh` automated script verified against live Docker container.

### Commands

```bash
bash scripts/check-postgres-persistence.sh
# or
npm run db:check-persistence
```

### Result

PASS

### Evidence

- Script ran via Git Bash
- Row `persist-check-20260628185341` inserted before `docker compose down`
- Container removed, volume `postgres_data` retained
- After `docker compose up -d postgres`, row still present (count: 1)
- Test table dropped cleanly
- Final output: `PASS — data survived docker compose down + up`

### Follow-up

- `npm run db:check-persistence` works via Git Bash; PowerShell cannot run bash scripts directly (WSL path issue on this machine)
- Next task: TASK-006 (Prisma setup)

---

## 2026-06-28 — TASK-006 — Prisma setup and database connection

### Scope

Prisma 5 installed, schema.prisma created, PrismaService created, AppModule updated, connection verified.

### Commands

```bash
npm install prisma@^5 @prisma/client@^5
npx prisma migrate dev --name init
npx tsc --noEmit
npm run test
```

### Result

PASS

### Evidence

- `npm install` — prisma@5.22.0 and @prisma/client@5.22.0 installed
- `npx prisma migrate dev` output: "Datasource "db": PostgreSQL database "jobflow_cv" at "localhost:5433" — Already in sync, no schema change or pending migration was found" — confirms DB connection works
- `npx tsc --noEmit` — no TypeScript errors
- `npm run test` — 1 test PASS (AppController health)
- Note: `prisma generate` produces "no models" warning — expected at this stage; domain models come in TASK-008/009
- Prisma downgraded from v7 (latest) to v5 LTS — v7 removed `url` from datasource in schema.prisma, breaking the standard NestJS pattern

### Follow-up

- Next task: TASK-006A (unit test setup) or TASK-007 (slug normalization)

---

## 2026-06-29 — TASK-006A — Unit test setup and conventions

### Scope

Jest baseline confirmed: AppService unit test + AppController mock injection test.

### Commands

```bash
npm run test
npx tsc --noEmit
```

### Result

PASS

### Evidence

- 2 test suites, 3 tests — all PASS
- `src/app.service.spec.ts` — pure service test, no TestingModule
- `src/app.controller.spec.ts` — controller test with mocked AppService via `{ provide: AppService, useValue: jest.fn() }` — demonstrates the pattern for PrismaService and AiProvider mocking
- `npx tsc --noEmit` — clean, no errors
- Added `"types": ["jest", "node"]` to `tsconfig.json` — fixes VS Code globals (`describe`, `it`, `expect`)
- `test/setup.ts` — conventions document for future tests

### Follow-up

- Next: TASK-007 (slug normalization) then TASK-006B (P0 unit tests)

---

## 2026-06-29 — TASK-007 — Slug normalization unit tests

### Scope

`SlugService.normalizeCompanySlug()` and `normalizeRoleSlug()` — all doc examples + edge cases.

### Commands

```bash
npm run test
```

### Result

PASS

### Evidence

- 3 test suites, 25 tests — all PASS
- Company slug: Action1, CHECK24, Omega CRM, Ukrainian Cyrillic, repeated separators, empty string
- Role slug: all doc examples, numbers removed, Cyrillic+Latin mix, em dash, C#/.NET, edge cases
- Regex uses `\p{Script=Cyrillic}` with `u` flag as required

### Follow-up

- Next: TASK-008 (Company and JobVacancy Prisma models)

---

## 2026-06-29 — TASK-008+009 — Company, JobVacancy, ApplicationWorkspace Prisma models

### Scope

Prisma schema enums (WorkspaceStatus, VacancyDecision, UserReviewState) and three models. Migration applied. NestJS services created and unit tested with mocked PrismaService.

### Commands

```bash
npx prisma migrate dev --name add-core-models
npm run test
```

### Result

PASS

### Evidence

- Migration `20260629150407_add_core_models` applied to `jobflow_cv` at `localhost:5433` — no errors
- Prisma Client regenerated (v5.22.0)
- `npm run test`: 6 suites, 34 tests — all PASS
  - `company.service.spec.ts` — create, findById, not-found (3 tests)
  - `vacancy.service.spec.ts` — create linked to company, findById, not-found (3 tests)
  - `workspaces.service.spec.ts` — create with status source_saved, findById with company+vacancy included, not-found (3 tests)
- All services use mocked PrismaService — no real DB calls in unit tests
- `WorkspacesService.create()` always sets `status: source_saved` regardless of caller input
- `WorkspacesService.findById()` includes `company` and `jobVacancy` relations in result

### Follow-up

- Next: TASK-010 (DTO validation) or TASK-011 (workspace folder + vacancy artifact creation)

---

## 2026-06-29 — TASK-010+011+012+013 — Manual workspace creation API

### Scope

DTO validation, ArtifactStorageService (folder + file creation), WorkspacesController (POST/GET/GET:id), full orchestration in WorkspacesService.

### Commands

```bash
npm install class-validator class-transformer
npm run test
```

### Result

PASS

### Evidence

- `npm run test`: 9 suites, 53 tests — all PASS
- New test files:
  - `create-workspace.dto.spec.ts` — 10 tests: missing/empty required fields, valid sourceUrl, invalid URL
  - `artifact-storage.service.spec.ts` — 4 tests: folder created on disk, path inside storage root, path traversal rejected, file saved with exact content + correct SHA-256 hash, Cyrillic text preserved
  - `workspaces.controller.spec.ts` — 4 tests: POST creates workspace, GET returns list, GET:id returns detail, GET:id unknown returns NotFoundException
  - `workspaces.service.spec.ts` — updated with mocks for all 5 injected dependencies (PrismaService, SlugService, CompanyService, VacancyService, ArtifactStorageService); 3 existing tests all PASS
- `ValidationPipe({ whitelist: true })` enabled globally in main.ts
- `storage/applications/` directory created and tracked in git
- Folder naming: `<YYYY_MM_DD>_<companySlug>_<roleSlug>` (e.g. `2026_06_29_Action1_Backend_Developer_Node_js`)
- Vacancy text saved as UTF-8 with SHA-256 hash; line breaks and special characters preserved exactly
- POST /workspaces returns: id, status, companySlug, roleSlug, workspaceSlug, folderPath, vacancySourcePath, vacancyTextHash, companyId, jobVacancyId, createdAt
- Path safety: path traversal attempts throw an error before any disk write

### Follow-up

- Next: TASK-014 (GeneratedArtifact model and registry service)

---

## 2026-06-30 — TASK-014+015+016 — GeneratedArtifact model, HashService and artifact access endpoints

### Scope

GeneratedArtifact Prisma model + migration, HashService (SHA-256 utility), ArtifactsService (DB register/query), ArtifactsController (GET /workspaces/:id/artifacts, GET /artifacts/:id/download with path safety), vacancy source registered as artifact during POST /workspaces.

### Commands

```bash
npx prisma migrate dev --name add-generated-artifact
npm run test
```

### Result

PASS

### Evidence

- Migration `20260629220531_add_generated_artifact` applied to `jobflow_cv` at `localhost:5433` — no errors
- Prisma Client regenerated (v5.22.0)
- `npm run test`: 12 suites, 70 tests — all PASS
- New test files:
  - `hash.service.spec.ts` — 5 tests: hex format, same content same hash, different content different hash, Cyrillic UTF-8, whitespace sensitivity
  - `artifacts.service.spec.ts` — 5 tests: register creates record, isLatest defaults to true, findByWorkspaceId returns ordered list, empty list, findById returns null
  - `artifacts.controller.spec.ts` — 6 tests: list by workspace, empty list, NotFoundException when artifact not in DB, ForbiddenException for path traversal, NotFoundException when file missing on disk, correct headers on download
- `workspaces.service.spec.ts` — updated: added `ArtifactsService` mock to providers (6 dependencies total)
- Path safety: `path.resolve()` + `startsWith(storageRoot + sep)` check before any file read
- Vacancy source auto-registered as `vacancy_source` artifact with `origin: pasted` on every `POST /workspaces`
- `GeneratedArtifact` fields: workspaceId, promptRunId?, artifactType, canonicalFileName, filePath, storageRoot, contentHash, isLatest, version, origin, status, mimeType?, fileSizeBytes?, downloadFileName?

### Follow-up

- Next: TASK-017 (KnowledgeSource model and import service)

---

## 2026-06-30 — TASK-017+019 — KnowledgeSource model, import service and EvidenceItem seed data

### Scope

KnowledgeSource Prisma model + EvidenceItem Prisma model + migration, KnowledgeSourcesService (importSource/activate/deactivate/findActive), EvidenceService (findByCategory/findAll), prisma/seed.ts with 9 EvidenceItem records.

### Commands

```bash
npx prisma migrate dev --name add-knowledge-source-and-evidence-item
npm run test
npx prisma db seed
```

### Result

PASS

### Evidence

- Migration `20260629222909_add_knowledge_source_and_evidence_item` applied — no errors
- Prisma Client regenerated (v5.22.0)
- `npm run test`: 14 suites, 82 tests — all PASS
- `npx prisma db seed`: Seeded 9 EvidenceItem records — no errors
- New test files:
  - `knowledge-sources.service.spec.ts` — 8 tests: importSource creates record with hash, versionLabel null when not provided, activate sets isActive true, activate throws NotFoundException, deactivate sets isActive false, deactivate throws NotFoundException, findActive returns active only, findActive returns empty array
  - `evidence.service.spec.ts` — 4 tests: findByCategory returns allowed items, findByCategory returns risky items, findByCategory returns empty, findAll returns 9 items across all categories
- Seed data covers: Node.js (allowed), TypeScript (allowed), Azure Functions (allowed), PostgreSQL (allowed), NestJS (risky), Docker (risky), AI/RAG (risky), Kubernetes (unsupported), AWS (unsupported)
- KnowledgeSourcesService uses HashService.hashFile() for content hash on import
- package.json updated with `prisma.seed` config pointing to `ts-node prisma/seed.ts`

### Follow-up

- Next: TASK-020 (PromptTemplate model and CRUD service)

## 2026-06-30 — TASK-020+021+022+023+024 — AI pipeline infrastructure

### Scope

PromptTemplate model and versioning, AiRun model with token usage, AI provider abstraction with FakeProvider, PromptRun model linking workspace/template/AiRun.

### Commands

```bash
npx prisma migrate dev --name add_prompt_template_ai_run_prompt_run
npx prisma db seed
npm run test
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- Migration `20260629224728_add_prompt_template_ai_run_prompt_run` applied; Prisma Client regenerated (v5.22.0)
- `npx prisma db seed`: Seeded 9 EvidenceItem records + 2 active PromptTemplate records (Prompt 1 vacancy analysis, Prompt 2 targeted CV content) — no errors
- `npm run test`: 18 suites, 103 tests — all PASS
- New test files:
  - `prompt-templates.service.spec.ts` — 7 tests: create assigns version 1 with no prior template, increments version on existing template, never overwrites (always creates new record), activate deactivates other templates for the step first, findActive returns active/null, findByStep returns all versions desc
  - `ai-runs.service.spec.ts` — 3 tests: saveSuccess creates record with status completed and token fields, saveFailed creates record with status failed and errorMessage
  - `fake.provider.spec.ts` — 6 tests: provider/model name, non-empty text, usage token counts, parsedJson only in jsonMode, predictable repeated output
  - `prompt-runs.service.spec.ts` — 5 tests: create starts at status pending, complete sets status completed + links aiRunId + serializes outputArtifactIds, fail sets status failed, markRunning sets status running
- `npx tsc --noEmit`: no errors
- `npm run lint`: auto-fixed formatting only, no logic changes
- Only one active PromptTemplate per step enforced in `PromptTemplatesService.activate()` via `updateMany` deactivation before activating target

### Follow-up

- Next: TASK-025 (Prompt 1 input builder) — not started in this task, per scope boundaries

---

## 2026-06-30 — TASK-025+026+027 — Prompt 1 input builder, execution and JSON validation

### Scope

PromptInputBuilderService (vacancy source + template + knowledge sources → prompt text), Prompt1Service (full orchestration: PromptRun lifecycle, AI call, JSON validation, artifact save, workspace status transition), Prompt 1 JSON schema manual validation, POST /workspaces/:id/run-analysis endpoint.

### Commands

```bash
npm run test
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- `npm run test`: 21 suites, 145 tests — all PASS
- `npx tsc --noEmit`: no errors
- New test files:
  - `prompt1.schema.spec.ts` — 13 tests: valid JSON accepted, invalid JSON rejected, array at root, missing/invalid fields (decision, workspace, company_slug, score, must_have, top_reasons, manual_review_required), all three decision values accepted
  - `prompt-input-builder.service.spec.ts` — 9 tests: vacancy file path construction, metadata inclusion, snapshot serialization, multiple knowledge sources
  - `prompt1.service.spec.ts` — 18 tests: success path (7), invalid JSON output (6), AI provider failure (3), missing template (1), workspace not found (1)
  - `workspaces.controller.spec.ts` — updated: added Prompt1Service mock to resolve new dependency (4 tests still PASS)
- FakeAiProvider updated with complete Prompt 1 JSON including `workspace` field
- ArtifactStorageService: added `readFile()` and `resolveWorkspacePath()` methods
- Prompt1 JSON validation uses flat result type (`{ success: boolean; data?: Prompt1Analysis; error?: string }`) to avoid TypeScript discriminated-union narrowing issues
- Workspace status transitions: `analysis_running` → `paused_after_analysis` on success, `failed` on AI error or invalid JSON
- AI provider errors caught and saved as failed AiRun; markdown still saved when JSON is invalid
- POST /workspaces/:id/run-analysis added to WorkspacesController

### Follow-up

- Next: TASK-028 (Prompt 1 decision gate endpoint — apply/maybe/skip)

---

## 2026-06-30 — TASK-028 — Prompt 1 decision gate endpoint

### Scope

ReviewGatesService with 4-action state machine (approve_apply, approve_maybe, pause, change_to_skip). POST /workspaces/:id/review-decision endpoint. canProceedToPrompt2 flag based on `status === cv_generation_running`.

### Commands

```bash
npm run test
npx tsc --noEmit
```

### Result

PASS

### Evidence

- `npm run test`: 22 suites, 155 tests — all PASS
- `npx tsc --noEmit`: no errors
- New test files:
  - `review-gates.service.spec.ts` — 8 tests: approve_apply transitions to cv_generation_running + canProceedToPrompt2 true, approve_apply rejects wrong decision, approve_maybe transitions to cv_generation_running + canProceedToPrompt2 true, pause keeps status paused_after_analysis + canProceedToPrompt2 false, pause preserves currentDecision, change_to_skip sets decision skip + reviewState overridden + canProceedToPrompt2 false, change_to_skip rejects already-skip, NotFoundException on missing workspace, BadRequestException on wrong status
- `workspaces.controller.spec.ts` updated: added ReviewGatesService mock
- State machine: approve_apply/approve_maybe → cv_generation_running (Prompt 2 unlocked); pause → paused_after_analysis (status unchanged); change_to_skip → decision=skip, status stays paused_after_analysis (actual skipped transition is TASK-029)
- `canProceedToPrompt2 = status === cv_generation_running` (not reviewState — per docs/03_domain_model.md §8.6)
- No Prisma migration needed — reviewState and currentDecision fields already in schema from TASK-008/009

### Follow-up

- Next: TASK-029 (skip artifact generation — 01_skip_reason.md/json + status=skipped)

---

## 2026-06-30 — TASK-029 — Skip reason generation

### Scope

SkipReasonService with POST /workspaces/:id/confirm-skip. Skip JSON schema validation. 01_skip_reason.md/json artifact generation. Status transition to `skipped`. Retry path from `analysis_ready`. FakeAiProvider updated with `step` parameter and `FAKE_SKIP_REASON_JSON`.

### Commands

```bash
npm run test
npx tsc --noEmit
```

### Result

PASS

### Evidence

- `npm run test`: 23 suites, 164 tests — all PASS
- `npx tsc --noEmit`: no errors
- New test files:
  - `skip-reason.service.spec.ts` — 6 tests: success from `paused_after_analysis`, success from `analysis_ready` (retry), BadRequest on wrong status, BadRequest on wrong decision, NotFoundException on missing workspace, invalid JSON → status=`analysis_ready` + markdown saved
  - `fake.provider.spec.ts` — 1 new test: step=`skip_reason` returns FAKE_SKIP_REASON_JSON with decision=skip
- State machine: confirm-skip accepts `paused_after_analysis` OR `analysis_ready` (Variant A, per §9.8 retry path)
- Failure: status rolls back to `analysis_ready` per docs/08_ai_pipeline.md §9.8
- `status = skipped` only set after both artifacts physically written to disk (ADR-016)
- `buildDownloadFileName()` follows `SKIP_<company_slug>_<role_slug>_reason_RU.md` pattern
- FakeAiProvider: `step?: string` added to `AiProviderOptions`; returns step-specific JSON

### Follow-up

- Next: TASK-030 (manual override logging)

---

## 2026-07-01 — TASK-030 — Manual override logging

### Scope

`ReviewGatesService.overrideSkip()` — skip→cv_generation_running transition, audit record creation, artifact immutability, audit field correctness. New `DecisionOverride` Prisma model with migration.

### Commands

```bash
npx prisma migrate dev --name add-decision-override
npx prisma migrate dev --name add-decision-override-review-state
npm run test
```

### Result

PASS

### Evidence

- `npm run test`: 23 suites, 168 tests — all PASS
- 4 new `overrideSkip` tests in `review-gates.service.spec.ts`:
  - Override on skipped workspace → `status=cv_generation_running`, `toDecision=manual_override_apply`, `canProceedToPrompt2=true`, audit record created
  - Override on non-skipped workspace → `BadRequestException`, no `$transaction` call, no audit record
  - `GeneratedArtifact` mocks (`findMany`, `delete`, `deleteMany`) never called during override — artifacts untouched
  - Audit record `create` called with correct `fromDecision=skip`, `toDecision=manual_override_maybe`, `reviewState=overridden`, `reasonNote`
- New endpoint: `POST /workspaces/:id/override-skip`
- New migration: `DecisionOverride` model with `workspaceId`, `fromDecision`, `toDecision`, `reviewState`, `reasonNote?`, `createdAt`
- No filesystem writes or deletions — `overrideSkip` is DB-only

### Follow-up

- Next: TASK-031 (Prompt 2 input builder)

---

## 2026-07-01 — TASK-031 — Prompt 2 input builder

### Scope

`Prompt2InputBuilderService.buildPrompt2Input()` — guard (status check), vacancy source + analysis reading, analysis fallback (.json → .md), knowledge source snapshot with hashes.

### Commands

```bash
npm run test -- --testPathPattern=prompt2-input-builder
npm run test
```

### Result

PASS

### Evidence

- `npm run test`: 24 suites, 173 tests — all PASS
- 5 new tests in `prompt2-input-builder.service.spec.ts`:
  - Approved workspace (`cv_generation_running`) → returns `inputContext` with vacancy source, analysis, workspace metadata, knowledge sources
  - Non-approved statuses (`source_saved`, `paused_after_analysis`, `skipped`, `cv_pdf_generated`) → `BadRequestException`, `readFile` never called
  - `sourceSnapshot` contains 64-char hex `vacancySourceHash` and per-source `contentHash`
  - Fallback: `01_vacancy_analysis.json` missing → reads `01_vacancy_analysis.md`
  - Both analysis artifacts missing → `BadRequestException`
- No filesystem writes, no AI calls — builder is read-only

### Follow-up

- Next: TASK-032 (Prompt 2 CV generation execution)

---

## 2026-07-02 — TASK-035A — CV visual concept and block rules

### Scope

Manual planning/documentation verification for the approved clean two-column CV concept and flexible block rules.

### Commands

```bash
# Documentation-only task; no code commands run.
```

### Result

PASS

### Evidence

- Created `docs/cv-template-design/visual-concept.md`.
- Created `docs/cv-template-design/block-rules.md`.
- Block rules cover required / optional / conditional sections, priority model, hide-if-no-space order, page-break behavior and renderer schema fields.
- Prompt 2 owns content selection: variable bullet counts, exact bullet wording and selected personal/current project inclusion.
- Renderer owns layout only: placement, page breaks, column rendering and conditional hiding based on Prompt 2 priorities.

### Follow-up

- Implementation continues with TASK-032 first, because Prompt 2 generation must produce the structured content that later TASK-035B will render.
- TASK-035B can use the two design docs when Phase 6 implementation starts.

---

## 2026-07-02 — TASK-018 — KnowledgeSource selection for prompt steps

### Scope

`KnowledgeSourceSelectionService.selectForStep()` — step-to-sourceType filtering, defense-in-depth isActive guard, BadRequestException for unknown step. `Prompt1Service` updated to use `selectForStep('prompt_1', activeSources)`. `Prompt2InputBuilderService` made self-contained: removed `knowledgeSources` parameter, now injects `KnowledgeSourcesService` + `KnowledgeSourceSelectionService` and calls `findActive()` + `selectForStep('prompt_2', ...)` internally. `SourceSnapshotEntry` and `Prompt2SourceSnapshotEntry` extended with `versionLabel`.

### Commands

```bash
npm run test -- --testPathPattern="knowledge-source-selection|prompt1.service|prompt2-input-builder"
npm run test
```

### Result

PASS

### Evidence

- Targeted run: 3 suites, 34 tests — all PASS
- Full suite: 25 suites, 181 tests — all PASS
- 6 new tests in `knowledge-source-selection.service.spec.ts`: prompt_1 required+optional types, prompt_2 includes master_cv, prompt_1 excludes master_cv, unknown step throws BadRequestException, isActive:false excluded (defense in depth), optional certifications included when present
- `prompt1.service.spec.ts` — 1 new test: `selectForStep` called with `('prompt_1', [])` (explicit step assert)
- `prompt2-input-builder.service.spec.ts` — 1 new test: `selectForStep` called with `('prompt_2', allActiveSources)` (explicit step assert); all existing tests updated to remove 4th `knowledgeSources` argument; `versionLabel` field asserted in snapshot
- `pipeline.module.ts` — no change needed: `KnowledgeSourcesModule` already imported, exports both services

### Follow-up

- Next: TASK-032 (Prompt 2 CV generation execution)

---

## 2026-07-02 — TASK-032 — Prompt 2 targeted CV generation

### Scope

`Prompt2Service.generateCvContent()` — full orchestration: PromptRun lifecycle, AI call, JSON validation, artifact save (md + json), AiRun with token usage, workspace status transition to `cv_draft_ready`. `validatePrompt2Json()` schema contract with variable bullet counts and personal/current project fields.

### Commands

```bash
npm run test -- --testPathPattern="prompt2.schema|prompt2.service"
npm run test
```

### Result

PASS

### Evidence

- Targeted run: 2 suites, 22 tests — all PASS
- Full suite: 27 suites, 203 tests — all PASS
- New test files:
  - `prompt2.schema.spec.ts` — 6 tests: valid JSON with 1 bullet, variable bullet counts (3 bullets), selected_projects with all required fields, personal/current projects separate from commercial experience, missing cv_content → fail, invalid JSON → fail
  - `prompt2.service.spec.ts` — 16 tests: success path (6), invalid JSON output (5), AI provider failure (3), workspace not found (1), missing template (1)
- State machine: `cv_generation_running` → `cv_draft_ready` on success (per docs/03_domain_model.md §8.6); `failed` on AI error or invalid JSON; `paused_after_cv_draft` is TASK-034
- `02_targeted_cv_content.md` saved before JSON validation (matches Prompt 1 pattern)
- `02_targeted_cv_content.json` saved only after successful validation
- `FAKE_PROMPT2_JSON` added to fake.provider with 2 experience bullets + 1 selected_project

### Follow-up

- Next: TASK-033 (anti-overclaiming guard) or TASK-034 (CV draft review endpoint)

---

## 2026-07-04 — TASK-033 — Basic anti-overclaiming guard

### Scope

`EvidenceGuardService.checkOutput()` — deterministic rule-based scanning of `Prompt2Output` for 15 critical claim patterns (merged from backlog + docs/08_ai_pipeline.md §11.4). Integration into `Prompt2Service` between JSON validation and artifact write, so both `.md` and `.json` artifacts contain the guard result. `needs_evidence` populated from AI `evidence_table` entries and tech skills without matching `EvidenceItem.claimArea`.

### Commands

```bash
npm run test -- --testPathPattern="evidence-guard" --forceExit
npm run test -- --forceExit
```

### Result

PASS

### Evidence

- Targeted guard run: 25/25 tests — all PASS (4.057s)
- Full suite: 28 suites, 232 tests — all PASS (22s)
- New test file `evidence-guard.service.spec.ts`: 25 tests covering:
  - 15 individual critical pattern tests (patterns 1–15, plus pattern 4b for OpenAI variant)
  - conservative rule: Kubernetes pattern flagged even when EvidenceItem exists
  - deduplication: same pattern in headline + bullet → one entry in critical_issues
  - needs_evidence source 1: evidence_table entry with status='needs evidence' → claim added
  - needs_evidence source 2: tech skill with no EvidenceItem match → added; with match → not added
  - warnings always []
  - clean input → empty result
  - false-positive check (see note below)
- Updated `prompt2.service.spec.ts`: 4 new guard integration tests:
  - evidenceService.findAll and evidenceGuard.checkOutput called on success path
  - guard receives validated Prompt2Output
  - JSON artifact written with guard-populated overclaiming_check
  - guard NOT called when JSON validation fails

#### False-positive resolution (pattern 7)

Initial pattern `/Kubernetes.{0,30}production|production.{0,30}Kubernetes/i` triggered on test text `"Production environment uses Kubernetes documentation for learning purposes only."` — 18 chars between "Production" and "Kubernetes", within the `{0,30}` limit.

Decision (confirmed by user): tighten to `{0,10}` for pattern 7 only. All legitimate CV claims place the two keywords within 1–10 chars; false-positive text has 18 chars. Pattern updated. All 25 tests pass after fix.

### Follow-up

- `exportBlocked` flag not in scope for TASK-033 — will be derived from `overclaiming_check.critical_issues.length > 0` in TASK-034 (CV draft review) or export gate.
- `warnings: []` always empty from guard — no documented warning-level pattern list exists in docs.

---

## 2026-07-04 — TASK-034 — CV draft review endpoint

### Scope

`ReviewGatesService.submitCvDraftReview()` — 3-action state machine for the CV draft review gate. `POST /workspaces/:id/review-cv-draft` endpoint. New `CvDraftReviewDto` with `CvDraftReviewAction` enum.

### Commands

```bash
npm run test -- --testPathPattern=review-gates.service
npm run test
```

### Result

PASS

### Evidence

- Targeted run: 21/21 tests — all PASS (5.21s)
- Full suite: 28 suites, 240 tests — all PASS (20.6s)
- New DTO: `src/review-gates/dto/cv-draft-review.dto.ts` — `CvDraftReviewAction` (approve / pause / mark_not_worth_applying) + `CvDraftReviewDto` with optional `reasonNote`
- Extended `ReviewGatesService` with `submitCvDraftReview()` and `CvDraftReviewResult` interface
- New endpoint: `POST /workspaces/:id/review-cv-draft`
- 9 new tests in `review-gates.service.spec.ts`:
  - `approve` from `cv_draft_ready` → `export_running`, `canProceedToExport = true`
  - `approve` from `paused_after_cv_draft` → `export_running`, `canProceedToExport = true`
  - `pause` from `cv_draft_ready` → `paused_after_cv_draft`, `canProceedToExport = false`
  - `pause` from `paused_after_cv_draft` → stays `paused_after_cv_draft`
  - `mark_not_worth_applying` → creates `DecisionOverride` with `toDecision = manual_override_skip`, workspace `currentDecision = manual_override_skip`, `reviewState = overridden`, `canProceedToExport = false`
  - `mark_not_worth_applying` → stores `null` reasonNote when not provided
  - `NotFoundException` when workspace not found
  - `BadRequestException` when status is not `cv_draft_ready` or `paused_after_cv_draft`
- State machine matches §8.6 exactly: `cv_draft_ready` / `paused_after_cv_draft` → `export_running` (approve) or `paused_after_cv_draft` (pause / mark_not_worth_applying)
- No new Prisma migrations — all enum values already present
- No changes to `SkipReasonService` — `mark_not_worth_applying` uses `manual_override_skip` (distinct from `skip`), audit path via `DecisionOverride` only

### Follow-up

- Next: TASK-035B (CV template schemas + renderer) or TASK-036 (PDF export)

---

## 2026-07-04 — TASK-035B — CV JSON schemas and flexible HTML template

### Scope

`CvContent` renderer input schema, `PrePdfCheckOutput` correction overlay schema, Handlebars HTML template, and pure `renderCvTemplate()` / `applyCorrectionsToCvContent()` functions. No file I/O, no NestJS services.

### Commands

```bash
npm run test -- --testPathPattern=cv-content.schema
npm run test -- --testPathPattern=cv-template-renderer
npm run test
```

### Result

PASS

### Evidence

- Schema tests: 20/20 PASS (`cv-content.schema.spec.ts` — 14 CvContent + 6 PrePdfCheckOutput)
- Renderer tests: 23/23 PASS (`cv-template-renderer.spec.ts`)
- Full suite: 30 suites, 283 tests — all PASS (21.0s)
- New files:
  - `src/pipeline/schemas/cv-content.schema.ts` — `CvContent` renderer contract with `validateCvContentJson()`
  - `src/pipeline/schemas/pre-pdf-check.schema.ts` — `PrePdfCheckOutput` + `PrePdfCheckCorrection` with `validatePrePdfCheckJson()`
  - `src/document-export/templates/cv.template.html` — Handlebars two-column CSS Grid template (27% left / 73% main)
  - `src/document-export/cv-template-renderer.ts` — pure functions: `renderCvTemplate()` + `applyCorrectionsToCvContent()`
  - `src/pipeline/schemas/cv-content.schema.spec.ts`
  - `src/document-export/cv-template-renderer.spec.ts`
- `docs/03_domain_model.md` §23 — brief documentation of both schemas with TypeScript file references
- Key invariant: `current_work_block` is a required top-level block rendered before Professional Experience; `include: boolean` controls visibility
- Prompt 3 corrections applied in memory via `field_path` (e.g. `"experience[0].bullets[1].text"`) — original `CvContent` never mutated

### Follow-up

- Next: TASK-035 (`HtmlRendererService` — orchestrates file I/O, reads `03_pre_pdf_check.json` if present, calls `renderCvTemplate()`, writes `04_cv_export.html`) or TASK-036 (PDF export)

---

## 2026-07-05 — TASK-PH-001 — Add @nestjs/config with Joi env validation

### Scope

Install `@nestjs/config` and `joi`. Create `src/config/env.validation.ts` Joi schema (8 vars). Wire `ConfigModule.forRoot({ isGlobal: true })` as first import in `AppModule`. Replace all direct `process.env` reads with `ConfigService`. Delete `src/config/storage.config.ts` (only used in `ArtifactStorageService`). Update spec to use mock `ConfigService` instead of `process.env.STORAGE_ROOT`. Add `env.validation.spec.ts` unit tests.

### Commands

```bash
# Baseline
npm run test  # → 30 suites, 285 tests, 0 failures

# Install
npm install @nestjs/config joi

# After changes
npm run test        # → 31 suites, 292 tests, 0 failures (+7 new tests in env.validation.spec.ts)
npx tsc --noEmit    # → no output (clean)
```

### Result

PASS. +1 suite, +7 tests. TypeScript clean.

### Evidence

- `npm run test` before: 30 suites, 285 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS
- `npx tsc --noEmit` — clean, no errors
- `grep -rn "process.env" src/` after changes — only `artifact-storage.service.spec.ts` lines that SET `process.env` via mock removed; zero production `process.env` reads remain
- `src/config/storage.config.ts` deleted (only consumer was `ArtifactStorageService`; decision: delete file, inject `ConfigService` directly)
- `DATABASE_URL` note: validated by Joi schema at boot; not read via `process.env` in NestJS application code (Prisma reads it from the environment directly, outside NestJS DI) — no substitution needed in application code
- New files: `src/config/env.validation.ts`, `src/config/env.validation.spec.ts`
- Updated files: `src/app.module.ts`, `src/main.ts`, `src/artifacts/artifact-storage.service.ts`, `src/artifacts/artifact-storage.service.spec.ts`, `.env.example`
- Deleted files: `src/config/storage.config.ts`

### Follow-up

- Unblocks TASK-PH-002 (helmet + CORS — uses `CORS_ORIGIN` from ConfigService)
- Unblocks TASK-PH-003 (throttler — uses `THROTTLE_TTL` / `THROTTLE_LIMIT` from ConfigService)
- Unblocks TASK-PH-007 (Pino logging — uses `LOG_LEVEL` from ConfigService)

---

## 2026-07-05 — TASK-PH-002 — Add security headers: helmet + CORS

### Scope

Install `helmet`, wire `app.use(helmet())` and `app.enableCors(...)` in `src/main.ts` using `ConfigService`. Manual curl check of response headers.

### Commands

```bash
# Baseline
npm run test  # → 31 suites, 292 tests, 0 failures

# Install
npm install helmet

# After changes
npm run test        # → 31 suites, 292 tests, 0 failures (no regressions)
npx tsc --noEmit    # → clean

# Manual curl check (server started with STORAGE_ROOT set)
curl -I http://localhost:3000/health
```

### Result

PASS. Test count unchanged. TypeScript clean. All required security headers present.

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS
- `npx tsc --noEmit` — clean, no errors
- `curl -I http://localhost:3000/health` output (selected headers):
  ```
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: no-referrer
  Content-Security-Policy: default-src 'self';base-uri 'self';...
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-DNS-Prefetch-Control: off
  X-XSS-Protection: 0
  Access-Control-Allow-Origin: *
  ```
- All acceptance-criteria headers confirmed present
- `Access-Control-Allow-Origin: *` confirms CORS enabled (no CORS_ORIGIN set → fallback to `'*'`)
- `allowSyntheticDefaultImports: true` in tsconfig allows `import helmet from 'helmet'` (no esModuleInterop needed)

### Note on STORAGE_ROOT

`.env` did not yet contain `STORAGE_ROOT` (added to `.env.example` in PH-001 but not yet propagated to local `.env`). Server started for curl test with `STORAGE_ROOT=./storage/applications` set inline. User should add `STORAGE_ROOT` to their `.env` before running the app normally.

### Follow-up

- Unblocks nothing new (PH-003, PH-004 already unblocked by PH-001)
- Next parallel tasks: TASK-PH-003 (throttler) and TASK-PH-004 (husky)

---

## 2026-07-05 — TASK-PH-006 — GitHub Actions CI pipeline

### Scope

Создать `.github/workflows/ci.yml` с четырьмя job: lint, typecheck, test (PostgreSQL service + prisma migrate deploy), build. Node.js 20.x, npm cache по `package-lock.json`.

### Commands

```bash
# Baseline
npm run build   # → success
npm run test    # → 31 suites, 292 tests, 0 failures

# Push PR → CI запустился автоматически
gh pr create --title "chore: TASK-PH-006 GitHub Actions CI pipeline" --base main
# PR: https://github.com/strakhovdenya/jobflow-cv-pipeline/pull/27
```

### Result

PASS — все 4 CI job прошли

### Evidence

GitHub Actions run: https://github.com/strakhovdenya/jobflow-cv-pipeline/actions/runs/28750227123

| Job | Status | Duration |
|---|---|---|
| Lint | ✅ pass | 28s |
| Typecheck | ✅ pass | 30s |
| Test | ✅ pass | 52s |
| Build | ✅ pass | 26s |

### Follow-up

- Next: TASK-PH-007 (structured logging — nestjs-pino)

---

## 2026-07-05 — TASK-PH-005 — Production Dockerfile (multi-stage, non-root user)

### Scope

Create multi-stage production Dockerfile (builder + runner, `node:20-alpine`, `USER node`, `HEALTHCHECK`), `.dockerignore`, and optional `app` service in `docker-compose.yml`. Verify `docker build`, `docker compose up app`, and `curl /health`.

### Commands

```bash
# Baseline
npm run build   # → success
npm run test    # → 31 suites, 292 tests, 0 failures

# Build image
docker build -t jobflow-cv-pipeline .

# Start full stack via compose (postgres already running)
docker compose up app -d

# Smoke test
curl http://localhost:3000/health
# → {"status":"ok"}

# docker run standalone test (requires network + DATABASE_URL override)
docker run --rm -d --name jobflow_test \
  --env-file .env \
  --network jobflow-cv-pipeline_default \
  -e DATABASE_URL=postgresql://jobflow:jobflow_secret@postgres:5432/jobflow_cv \
  -e STORAGE_ROOT=/tmp/storage \
  -p 3000:3000 jobflow-cv-pipeline
curl http://localhost:3000/health
# → {"status":"ok"}
docker stop jobflow_test
```

### Result

PASS

### Evidence

- `docker build -t jobflow-cv-pipeline .` — exits cleanly
- `docker compose up app -d` — container starts, status `Up (healthy)` after ~15s
- `curl http://localhost:3000/health` → `{"status":"ok"}`
- `docker run` standalone with network override → `{"status":"ok"}`
- Prisma engine binary in image: `libquery_engine-linux-musl-openssl-3.0.x.so.node` (correct for Alpine)

### Notes / Discovered issues

**Prisma + Alpine 3.22 (OpenSSL 3.5.x) compatibility:**  
`node:20-alpine` ships OpenSSL 3.5.7 but no `openssl` CLI. Prisma 5.22's platform detection runs `openssl version`; without the CLI it falls back to `linux-musl` (OpenSSL 1.1), which is absent on modern Alpine. Fix: `apk add --no-cache openssl` in both builder and runner stages installs the CLI, enabling Prisma to detect OpenSSL 3.x and generate the `linux-musl-openssl-3.0.x` binary (links against `libssl.so.3` which is present by default).

**Prisma schema must be present before `npm ci`:**  
`@prisma/client` runs `prisma generate` as a postinstall hook. Copying `prisma/` before `npm ci` ensures the generated typed client matches the project schema.

**Husky in production install:**  
`npm ci --omit=dev` in a runner stage still triggers the `prepare: "husky"` lifecycle script, which fails because husky is a devDependency. Workaround: use `npm prune --omit=dev` in the builder stage after build (preserving Prisma generated client), then `COPY --from=builder /app/node_modules` — avoids a fresh install in runner entirely.

**DATABASE_URL in docker-compose.yml:**  
`env_file: .env` sets `DATABASE_URL=...@localhost:5432/...` which is only valid on the host. The `environment:` override corrects the host to the `postgres` service name and hardcodes port `5432` (the container-internal port, not `${POSTGRES_PORT}` which is the host-side mapping).

**Standalone `docker run --env-file .env` note:**  
Without `--network` and a `DATABASE_URL` override, the container cannot reach the postgres service. For full-stack local testing, `docker compose up app` is preferred; `docker run` needs the extra flags documented above.

### Follow-up

- Next: TASK-PH-006 (GitHub Actions CI)

---

## 2026-07-06 — TASK-PH-007A — Docker build validation in CI

### Scope

Add `docker-build` CI job to `.github/workflows/ci.yml`. Job builds production Docker image, applies Prisma migrations, starts container via `docker run --network host`, polls `/health` (max 60s), verifies no pending migrations via `npx prisma migrate status`, then tears down the container.

### Commands

```bash
# Baseline
npm run build   # → success
npm run test    # → 31 suites, 292 tests, 0 failures

# Change
# Added docker-build job to .github/workflows/ci.yml (no code changes)

# After change
npm run test    # → 31 suites, 292 tests, 0 failures (no regressions)

# CI verification — push PR, watch GitHub Actions
gh pr create --title "chore: TASK-PH-007A Docker build validation in CI" --base main
```

### Result

PASS — pending CI run result (to be updated after GitHub Actions completes)

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS (no regressions; only YAML changed)
- Only `.github/workflows/ci.yml` modified — no application code touched
- New job structure: postgres service → npm ci → prisma migrate deploy → docker build → docker run → /health poll → prisma migrate status → teardown
- `--network host` comment added (Linux ubuntu-latest specific)
- Existing 4 jobs (lint, typecheck, test, build) unchanged

### Follow-up

- Update this entry with actual CI run URL and job duration once PR is merged and Actions completes.
- Next: TASK-PH-008 (Swagger/OpenAPI documentation)

---

## 2026-07-06 — TASK-PH-008 — Swagger/OpenAPI documentation

### Scope

Added `@nestjs/swagger` (v7.4.2, compatible with the project's NestJS v10) and `swagger-ui-express`. Configured `SwaggerModule` in `main.ts` with `DocumentBuilder` (title `JobFlow CV Pipeline`, version `0.1.0`, one-line description, `addBearerAuth()`). Swagger is mounted only when `NODE_ENV !== 'production'`. Added `@ApiTags`/`@ApiOperation` to all three controllers (`AppController`, `ArtifactsController`, `WorkspacesController`) and `@ApiProperty()` to all fields of all four DTOs (`CreateWorkspaceDto`, `SubmitDecisionDto`, `OverrideSkipDto`, `CvDraftReviewDto`).

### Commands

```bash
# Baseline
npm run build          # → success
npm run test           # → 31 suites, 292 tests, 0 failures

# Install
npm install @nestjs/swagger@7.4.2 swagger-ui-express

# After change
npm run build           # → success
npx tsc --noEmit        # → no errors
npm run test             # → 31 suites, 292 tests, 0 failures (no regressions)

# Manual verification — dev mode (NODE_ENV unset)
npm run start:dev
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api          # → 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api-json     # → 200
curl -s http://localhost:3000/health                                       # → {"status":"ok"} (tried via Swagger-equivalent GET)

# Manual verification — production mode
NODE_ENV=production PORT=3001 node dist/src/main.js
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api         # → 404 (Swagger not mounted)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api-json    # → 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/health      # → 200 (business logic unaffected)
```

### Result

PASS

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS (no regressions)
- `npx tsc --noEmit` — clean, no errors
- `GET /api` (dev) → 200, Swagger UI HTML served
- `GET /api-json` (dev) → 200, valid OpenAPI 3.0 document; `info.title = "JobFlow CV Pipeline"`, `info.version = "0.1.0"`, `components.securitySchemes.bearer` present
- All 12 endpoints present in the OpenAPI document: `GET /health`, `GET /version`, `POST /workspaces`, `GET /workspaces`, `GET /workspaces/{id}`, `POST /workspaces/{id}/run-analysis`, `POST /workspaces/{id}/review-decision`, `POST /workspaces/{id}/confirm-skip`, `POST /workspaces/{id}/override-skip`, `POST /workspaces/{id}/review-cv-draft`, `GET /workspaces/{id}/artifacts`, `GET /artifacts/{id}/download`
- `GET /health` executed successfully (200, `{"status":"ok"}`), confirming a live request works against the documented API
- `GET /api` and `GET /api-json` → 404 when `NODE_ENV=production`; `GET /health` still 200 in the same run, confirming business logic and existing endpoints are untouched by the Swagger gating

### Follow-up

- Pre-existing, unrelated issue noticed during manual verification: `start:prod` script (`node dist/main`) does not match actual build output path (`dist/src/main.js`). Out of scope for TASK-PH-008 (Key Invariants forbid touching build/CI config); flagging for a future task.
- Next: none selected — awaiting user's next task pick per `CLAUDE.md` "do not choose the next task automatically."

---

## 2026-07-05 — TASK-PH-007 — Structured logging (nestjs-pino)

### Scope

Install `nestjs-pino`, `pino-http`, `pino-pretty`. Wire `LoggerModule.forRootAsync()` in `AppModule` with `ConfigService` for `LOG_LEVEL`. Enable `pino-pretty` transport in `NODE_ENV !== 'production'`. Replace `console.log()` in `main.ts` with `app.get(Logger).log()`.

### Commands

```bash
# Baseline
npm run build   # → success
npm run test    # → 31 suites, 292 tests, 0 failures

# Install
npm install nestjs-pino pino-http pino-pretty

# After changes
npm run test    # → 31 suites, 292 tests, 0 failures (no regressions)
npm run build   # → success

# Manual: production mode (JSON logs)
NODE_ENV=production LOG_LEVEL=info node dist/src/main

# Manual: development mode (pretty logs)
NODE_ENV=development LOG_LEVEL=info node dist/src/main
```

### Result

PASS

### Evidence

- `npm run test` before: 31 suites, 292 tests — all PASS
- `npm run test` after: 31 suites, 292 tests — all PASS (no regressions)
- `npm run build` — clean

**Production mode JSON log sample:**
```json
{"level":30,"time":1783276322101,"pid":21840,"hostname":"DESKTOP-GG76K64","context":"NestFactory","msg":"Starting Nest application..."}
{"level":30,"time":1783276322103,"pid":21840,"hostname":"DESKTOP-GG76K64","context":"InstanceLoader","msg":"PrismaModule dependencies initialized"}
```

**Development mode pretty log sample:**
```
[20:32:15.855] INFO (31780): Starting Nest application... {"context":"NestFactory"}
[20:32:15.855] INFO (31780): PrismaModule dependencies initialized {"context":"InstanceLoader"}
```

- `nestjs-pino`, `pino-http`, `pino-pretty` added to `dependencies` (not devDependencies — pino-pretty needed in dev Docker containers)
- `bufferLogs: true` in `NestFactory.create` — ensures buffered NestJS bootstrap logs go through Pino
- `transport` key present only when `NODE_ENV !== 'production'` (spread pattern, not `undefined` value)
- `console.log()` on `main.ts:15` replaced with `app.get(Logger).log()`

### Follow-up

- Next: TASK-PH-008 (Swagger/OpenAPI documentation)

---

## 2026-07-06 — TASK-035 — Deterministic CV draft to HTML renderer

### Scope

`HtmlRendererService.renderToHtml(workspaceId)`: reads `02_targeted_cv_content.json`, maps `Prompt2Output` → `CvContent` via `mapPrompt2OutputToCvContent()` (new mapper, `src/document-export/prompt2-to-cv-content.mapper.ts`), sources candidate identity/education/languages/links/volunteering from the new static config `src/document-export/candidate-profile.config.ts`, optionally applies `03_pre_pdf_check.json` corrections, calls existing `renderCvTemplate()`, writes `04_cv_export.html`, registers `GeneratedArtifact` with `origin = generated_by_export_service`. No AI provider call, no workspace status transition.

### Commands

```bash
npm run build
npm run test
npx tsc --noEmit
```

### Result

PASS

### Evidence

- Baseline before implementation: `npm run test` → 31 suites / 292 tests passed, `npm run build` clean.
- After implementation: `npm run test` → 33 suites / 302 tests passed (2 new spec files, 10 new tests), `npx tsc --noEmit` clean, `npm run build` clean.
- New tests: `src/document-export/prompt2-to-cv-content.mapper.spec.ts` (current_work_block/experience/selected_projects copied verbatim; candidate/education/languages/links/volunteering sourced from static config, not Prompt2Output) and `src/document-export/html-renderer.service.spec.ts` (renders expected sections; 404 on missing workspace; Prompt 3 corrections applied when `03_pre_pdf_check.json` present and skipped on `ENOENT`; non-ENOENT read errors rethrown; `GeneratedArtifact` registered with canonical name `04_cv_export.html` and `origin = generated_by_export_service`; no AI provider dependency exists on the service at all).
- No real filesystem/DB run performed (unit tests only, per task scope — no controller/module wiring yet, that is TASK-036B).

### Follow-up

- Static config `candidate-profile.config.ts` contains a placeholder education entry (institution/degree/dates) — needs real data filled in before a real export is generated.
- Next: TASK-036A (choose PDF library) → TASK-036B (export controller + status transitions), which will wire `HtmlRendererService` into a NestJS module.

---

## 2026-07-06 — TASK-036A — Choose PDF library and implement PdfExportService

### Scope

`PdfExportService.htmlFileToPdf(htmlFilePath, pdfOutputPath)`: launches Puppeteer, navigates to the `file://` URL of the input HTML file, calls `page.pdf({ format: 'A4' })`, closes the browser in a `finally` block. Standalone `@Injectable()` class, same pattern as `HtmlRendererService` (TASK-035) — no NestJS module created, not registered as a provider anywhere (DI wiring is TASK-036B). No workspace/DB reads, no `GeneratedArtifact` writes, no status transitions.

### Commands

```bash
npm run build
npm run test
npx tsc --noEmit
npm run lint
npx jest src/document-export/pdf-export.service.spec.ts --detectOpenHandles
tasklist | findstr /I chrome   # PowerShell/cmd equivalent used to check for leaked processes
```

### Result

PASS

### Evidence

- Baseline before implementation: `npm run test` → 33 suites / 302 tests passed, `npm run build` clean.
- `npm install puppeteer` → added `puppeteer@^24.43.1`, exit code 0. Warnings were pre-existing unrelated peer-dependency notices (`@nestjs/swagger` vs `class-validator`), not caused by this install.
- Puppeteer launched successfully on this Windows 11 machine with **default options — no `--no-sandbox` or other launch flags required**.
- **CI update (PR #32 review):** `Test` job failed on GitHub Actions (Linux runner) with `Failed to launch the browser process` / `FATAL:...zygote_host_impl_linux.cc: No usable sandbox!` — GitHub Actions' Linux containers disable unprivileged user namespaces, so Chromium's sandbox cannot start there even though it works unsandboxed on this Windows 11 dev machine. Added `{ args: ['--no-sandbox'] }` to `puppeteer.launch()` per the Library Decision fallback documented in `CURRENT_TASK.md`, with a code comment explaining the CI-vs-local discrepancy. Re-ran locally after the fix: still 34/34 suites, 303/303 tests, `tsc --noEmit` clean.
- After implementation: `npm run test` → 34 suites / 303 tests passed (1 new spec file, 1 new test), `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` clean.
- New test `src/document-export/pdf-export.service.spec.ts`: writes a minimal HTML file to a real temp directory (`fs.mkdtemp`), calls `htmlFileToPdf`, asserts `statSync(pdfPath).size > 0` on a real Puppeteer-generated PDF — no mocking of Puppeteer.
- Full suite run showed a Jest warning ("A worker process has failed to exit gracefully... force exited"). Investigated: running `pdf-export.service.spec.ts` in isolation with `--detectOpenHandles` shows **no open handles and no warning**; running the full suite with the new spec stashed out shows **no warning** (confirms the warning only appears when this spec runs inside the larger parallel suite). Checked running Chrome processes via `wmic process where "name='chrome.exe'" get ProcessId,CommandLine` after a full test run — no headless/puppeteer-flagged Chrome process was found, only the developer's regular browser windows. Conclusion: this is a known Jest-worker-teardown timing artifact of Puppeteer's internal transport handle under parallel Jest workers, not a leaked Chrome process — the browser is correctly closed via the `finally` block on every call.

### Follow-up

- None for this task. TASK-036B will wire `PdfExportService` into `document-export.module.ts` alongside `HtmlRendererService`.

---

## 2026-07-06 — TASK-036B — DocumentExportController and full export orchestration

### Scope

`DocumentExportService.exportCv(workspaceId)`: guards on `status === export_running` (400 `BadRequestException` otherwise), calls `HtmlRendererService.renderToHtml()` then `PdfExportService.htmlFileToPdf()` in order, hashes the resulting PDF binary via a local `createHash('sha256')` over the raw `Buffer` (not `HashService.hashFile`, which reads as `utf-8` text and would corrupt a binary hash), registers `04_cv_export.pdf` as a `GeneratedArtifact` (`origin: generated_by_export_service`), and transitions workspace status to `cv_pdf_generated` on success or `failed` on any thrown error (rethrown after the status update). `DocumentExportController`: `POST /workspaces/:id/export-cv` delegates to the service; `GET /workspaces/:id/download-cv` resolves the workspace's company/role slugs and the most recently registered PDF `GeneratedArtifact`, applies the same path-safety check as `ArtifactsController.download`, and streams the file with `Content-Disposition: attachment; filename="Denys_Strakhov_<company_slug>_<role_slug>_CV.pdf"`. `DocumentExportModule` follows ADR-017 (imports `PrismaModule`, `ArtifactStorageModule`, `ArtifactsModule` directly; no `exports`) and is registered in `AppModule`. Both endpoints carry `@ApiOperation` per ADR-019.

### Commands

```bash
git checkout -b task/TASK-036B-document-export-controller
npm run build
npm run test
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- Baseline before implementation: `npm run build` clean; `npm run test` → 34 suites / 303 tests passed.
- After implementation: `npm run build` clean; `npm run test` → **36 suites / 316 tests passed** (2 new spec files, 13 new tests); `npx tsc --noEmit` clean; `npm run lint` clean (no errors/warnings).
- New tests in `src/document-export/document-export.service.spec.ts` (7 tests, manual jest mocks — no real Prisma/Puppeteer): 404 when workspace missing; 400 `BadRequestException` when status is not `export_running` (and neither collaborator is called); `HtmlRendererService.renderToHtml` called before `PdfExportService.htmlFileToPdf` (call-order assertion); status → `cv_pdf_generated` on success; status → `failed` and error rethrown when `PdfExportService` throws; `ArtifactsService.register` called with `canonicalFileName: '04_cv_export.pdf'`, `origin: 'generated_by_export_service'`, `mimeType: 'application/pdf'`; constructor arity check (`DocumentExportService.length === 4`) confirms no `AiProvider`/`AI_PROVIDER` dependency exists to call.
- New tests in `src/document-export/document-export.controller.spec.ts` (6 tests): `POST :id/export-cv` delegates to `DocumentExportService.exportCv`; `GET :id/download-cv` sets the exact expected `Content-Disposition` filename and streams the PDF buffer; picks the most recently registered PDF artifact when more than one exists for the workspace; 404 when workspace does not exist; 404 when no PDF artifact has been registered yet; 404 when the registered PDF's file is missing on disk.
- No `AiRun` created and no AI provider invoked anywhere in the new code — confirmed by inspection (`DocumentExportService`'s constructor has no `AI_PROVIDER`/`AiProvider`/`AiRunsService` parameter) and by the constructor-arity unit test above.
- Manual end-to-end run against a live workspace/DB was not performed in this session (would require a workspace already parked at `export_running` with an approved `02_targeted_cv_content.json` on disk); coverage relies on the unit tests above plus the already-verified real-Puppeteer test in `pdf-export.service.spec.ts` (TASK-036A) and the already-verified `HtmlRendererService` rendering tests (TASK-035).

### Follow-up

- TASK-037 (Markdown/JSON export endpoints) is next in the Phase 6 order; not implemented in this task.

---

## 2026-07-06 — TASK-037A — Implement real OpenAI provider

### Scope

`OpenAiProvider` (`src/ai/providers/openai.provider.ts`) implements the existing `AiProvider` interface unchanged: `providerName = 'openai'`, `modelName` read from `ConfigService.get('OPENAI_MODEL')` (falls back to `'gpt-4o'`), constructs an `openai` SDK client with `apiKey` from `ConfigService.get('OPENAI_API_KEY')`. `complete(prompt, inputContext, options)` calls `chat.completions.create()` with `prompt` as the `system` message and `inputContext` as the `user` message, requests `response_format: { type: 'json_object' }` when `options.jsonMode` is set, and maps the response into `AiProviderResult` (`text` from `choices[0].message.content`, `parsedJson` via `JSON.parse(text)` when `jsonMode`, `rawResponse` as the raw SDK response, `usage` mapped from `CompletionUsage` — `prompt_tokens`→`inputTokens`, `completion_tokens`→`outputTokens`, `total_tokens`→`totalTokens`, `prompt_tokens_details.cached_tokens`→`cachedInputTokens`, `completion_tokens_details.reasoning_tokens`→`reasoningTokens`, full raw usage JSON stringified into `rawJson`). `ai.module.ts` now exports a `createAiProvider(configService: ConfigService): AiProvider` factory function used as the `AI_PROVIDER` provider's `useFactory` (`inject: [ConfigService]`): returns `new OpenAiProvider(configService)` when `configService.get('AI_PROVIDER') === 'openai'`, otherwise `new FakeAiProvider()` (default, unchanged behavior when `AI_PROVIDER` is unset). Added `AI_PROVIDER` (`Joi.string().valid('fake','openai').default('fake')`), `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT`, `AI_MODEL_DEFAULT` (all optional) to `src/config/env.validation.ts`, and documented all five in `.env.example` (`AI_PROVIDER_DEFAULT`/`AI_MODEL_DEFAULT` noted as reserved for future step-level overrides — not read by any code yet, matching the ambiguous but explicit backlog acceptance criterion). `FakeAiProvider`, `Prompt1Service`, `Prompt2Service`, `SkipReasonService` and the `AiProvider`/`AiProviderOptions`/`AiProviderResult`/`AiProviderUsage` contracts were not touched.

### Commands

```bash
git checkout -b task/TASK-037A-openai-provider
npm install openai
npm run build
npm run test
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- Baseline before implementation: `npm run build` clean; `npm run test` → **36 suites / 316 tests passed** (confirmed fresh, not assumed from `TASK_BOARD.md`).
- `openai` SDK added as a production dependency after explicit user confirmation (no OpenAI SDK previously in `package.json`) — installed `openai@6.45.0`.
- After implementation: `npm run build` clean; `npm run test` → **38 suites / 324 tests passed** (2 new spec files, 8 new tests); `npx tsc --noEmit` clean; `npm run lint` clean (auto-fix reformatted line-wrapping only, no errors/warnings).
- New tests in `src/ai/providers/openai.provider.spec.ts` (5 tests, `openai` SDK client mocked via `jest.mock('openai', ...)` — no real network calls): provider/model name reflects `ConfigService` values; falls back to `'gpt-4o'` when `OPENAI_MODEL` is unset; maps a mocked plain-text response into `AiProviderResult` and asserts the exact `messages`/`model` payload sent to `chat.completions.create`; requests `response_format: json_object` and parses `parsedJson` when `jsonMode` is enabled, including cached/reasoning token mapping; returns `usage: undefined` when the mocked response has no `usage` field.
- New tests in `src/ai/ai.module.spec.ts` (3 tests): `createAiProvider()` returns `FakeAiProvider` when `AI_PROVIDER` is unset; returns `FakeAiProvider` when explicitly `'fake'`; returns `OpenAiProvider` when `'openai'`.
- All pre-existing `FakeAiProvider`/pipeline tests (`fake.provider.spec.ts`, `prompt1.service.spec.ts`, `prompt2.service.spec.ts`, `skip-reason.service.spec.ts`, etc.) pass unmodified — no source changes to any pipeline consumer of `AI_PROVIDER`.
- Manual smoke test with a real `OPENAI_API_KEY` against the live OpenAI API was **not performed** in this session (no API key available in this environment); documenting the intended manual check instead: set `AI_PROVIDER=openai` and a real `OPENAI_API_KEY`/`OPENAI_MODEL` in a local `.env` (never commit it), then call `Prompt1Service`'s pipeline (or invoke `OpenAiProvider.complete()` directly in a scratch script) and confirm a non-empty `text`/`parsedJson` response with populated `usage` fields. This manual check is a follow-up for whoever runs the first real pipeline call, not a blocker for closing this task per its Done Definition (abstraction works with fake provider; wiring to a real key is an operational step).

### Follow-up

- TASK-037B (seed real Prompt 1/Prompt 2 template content) and TASK-037D (.env/onboarding docs) are next in the recommended Phase 6 order — not implemented in this task.
- The real-provider manual smoke test above should be performed once a real `OPENAI_API_KEY` is available, ideally as part of TASK-038A (practical MVP real-provider smoke test).

---

## Required MVP Test Areas

- Unit test setup: `npm run test`.
- Slug normalization unit tests.
- Workspace validation unit tests.
- Canonical artifact naming unit tests.
- Skip decision / approval gate unit tests.
- Anti-overclaiming guard unit tests.
- PostgreSQL persistence verification.
- First usable MVP smoke test.

## PostgreSQL Persistence Verification Template

```md
## YYYY-MM-DD — TASK-005 — PostgreSQL persistence verification

### Commands

```bash
docker compose up -d
# create table/record through psql or script
docker compose down
docker compose up -d
# verify table/record still exists
```

### Expected Result

Data survives `docker compose down` and restart because the database uses named volume `postgres_data`.

### Destructive Command Warning

`docker compose down -v` removes the named volume and deletes local database data. Use it only intentionally.
```
## Documentation consistency check — Current-work source sync

Manual documentation check completed:

- Verified old source-name references were replaced with current active source names.
- Verified current-work block is documented separately from commercial experience and selected projects.
- Verified no task sections before or including TASK-032 were intentionally changed.
- No code tests were run; documentation-only sync.

## 2026-07-07 — TASK-037A — Implement real OpenAI provider

### Scope

`OpenAiProvider` (`src/ai/providers/openai.provider.ts`) implementing `AiProvider` via the `openai` SDK. `AiModule` (`src/ai/ai.module.ts`) selects `FakeAiProvider` or `OpenAiProvider` via a `createAiProvider(configService)` factory keyed on `AI_PROVIDER` env var (`fake` default, `openai` when set). `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT`, `AI_MODEL_DEFAULT` added to `src/config/env.validation.ts` and `.env.example`.

### Commands

```bash
npm run test
```

Baseline before this task (last recorded, TASK-036B): 36 suites, 316 tests.
Result after TASK-037A: 38 suites, 324 tests, 0 failures.

### Result

PASS

### Evidence

- `src/ai/providers/openai.provider.spec.ts` mocks the OpenAI SDK client — no real network call in unit tests.
- `src/ai/ai.module.ts` factory tested for both `AI_PROVIDER` unset/`fake` (returns `FakeAiProvider`) and `AI_PROVIDER=openai` (returns `OpenAiProvider`) selection paths.
- `OpenAiProvider.complete()` maps `response.choices[0].message.content` → `text`, parses `text` to `parsedJson` when `options.jsonMode` is set, and maps `response.usage` → `AiProviderUsage` (`inputTokens`, `outputTokens`, `totalTokens`, `cachedInputTokens`, `reasoningTokens`, `rawJson`).
- Existing `FakeAiProvider` and pipeline tests unmodified and passing.
- `.env.example` documents all 5 new vars without a real key committed.

### Follow-up

- Manual smoke test with a real `OPENAI_API_KEY` (Prompt 1 call through `AiProvider` abstraction with `AI_PROVIDER=openai`) not yet performed/recorded — required before TASK-038A (real-provider MVP smoke test).
- Next recommended task: TASK-037B (seed real Prompt 1/Prompt 2 template content).

## 2026-07-07 — TASK-037B — Seed real Prompt 1 and Prompt 2 template content

### Scope

Replaced placeholder `PromptTemplate` seed content with real prompts implementing the content-selection contract from `docs/08_ai_pipeline.md` §8.4/§10.6–10.8. Prompt text stored as `prisma/prompts/prompt1.txt` and `prisma/prompts/prompt2.txt`, read via `fs.readFileSync` in `prisma/seed.ts` (`readPromptFile()` helper). No changes to `PromptTemplate` model, `PromptTemplatesService`, `AiProvider`/`OpenAiProvider`/`FakeAiProvider`, pipeline services, HTML renderer or CV JSON schema. Prompts adapted from a user-supplied ChatGPT-style conversational draft: condensed the full scoring/risk/safety logic (German language gate, current-work block rules, overclaiming guardrails, risk-stacking) into strict JSON-only output instructions matching `prompt1.schema.ts`/`prompt2.schema.ts` field names exactly — the original draft targeted a human chat session (markdown file creation, follow-up questions, quality-score sections) and was not usable verbatim against `AiProvider.complete(..., { jsonMode: true })`.

### Commands

```bash
npm run test
npx prisma db seed
npx prisma db seed   # re-run to verify idempotency
```

Baseline before this task (TASK-037A): 38 suites, 324 tests.
Result after TASK-037B: 39 suites, 339 tests, 0 failures (+1 suite / +15 tests: new `src/pipeline/prompt-template-content.spec.ts` contract test; all pre-existing tests unmodified and passing).

### Result

PASS

### Evidence

- `npx prisma db seed` run twice against the local dev Postgres (`jobflow_postgres` container): both runs report "Seeded 2 active PromptTemplate records", no errors.
- DB verification query after both runs:
  ```
  id                                    | promptKey                    | step     | version | isActive | content_len
  seed-prompt-1-vacancy-analysis-v1     | prompt_1_vacancy_analysis    | prompt_1 |    1    | t        | 9741
  seed-prompt-2-targeted-cv-content-v1  | prompt_2_targeted_cv_content | prompt_2 |    1    | t        | 11075
  ```
  Exactly 2 rows both times — confirms the fixed-ID upsert pattern in `seed.ts` does not create duplicate active versions on re-run.
- `src/pipeline/prompt-template-content.spec.ts` (15 tests) verifies: Prompt 1 requires JSON-only output and the exact `Prompt1Analysis` field names; Prompt 2 covers all 10 points of the §10.8 template contract (bullet count/wording decision, evidence-based bullets, mandatory current-work block, personal/project inclusion, separate labeling from commercial experience, `include`/`project_type`/`relevance_reason` fields on selected projects, rendering hints/priorities, no fixed bullet count, no moving current-work/projects into commercial history, `needs evidence` marking) plus the "renderer must not invent/rewrite/reinterpret" statement.

### Follow-up

- Manual smoke test with a real `OPENAI_API_KEY` and a real vacancy (Prompt 1 + Prompt 2 end-to-end through `AiProvider`) not yet performed — still pending before TASK-038A.
- Known MVP gap (pre-existing, not introduced by this task): `PromptInputBuilderService`/`Prompt2InputBuilderService` list knowledge sources by name only (`[content not loaded in MVP]`), so the seeded prompts instruct the AI to treat unloaded source content as unverifiable and mark related claims `needs evidence` rather than assuming file content is available. Loading actual source content into the input context is out of scope for TASK-037B (see TASK-037C-0/037C).
- Next recommended task: per `TASK_BOARD.md`, TASK-037C-0 (create and commit knowledge source content files).

## 2026-07-07 — TASK-037C-0 — Create and commit knowledge source content files

### Scope

Created the `knowledge-sources/` folder structure (`candidate-profile/`, `evidence/`, `cv-rules/`, `certifications/`, `layout/`, `prompts/`) with `.gitkeep` in each empty subfolder. Copied the user-supplied prompt source files (from `D:\infa\Documents\jobs for analys\New folder`) into `knowledge-sources/prompts/` under the backlog-mandated filenames, verbatim: `prompt_1_vacancy_analysis.md`, `prompt_2_targeted_cv_content.md`, `prompt_2_1_cover_letter.md`, `prompt_3_pre_pdf_check.md`, `prompt_4_pdf_export_rules.md`, `prompt_5_final_check.md`. Two additional files (`prompt_4_1_optional_html.md`, `prompt_6_recruiter_message.md`) were renamed and placed for future use only — not wired into any pipeline logic, `Prompt2InputBuilder`, or registration script. Added `KNOWLEDGE_SOURCES_ROOT=./knowledge-sources` to `.env.example`. Documented the git strategy (commit all files to the private repo, no `.gitignore` changes) in `knowledge-sources/README.md`. No content was created for `candidate-profile/`, `evidence/`, `cv-rules/`, `certifications/`, `layout/` — that remains manual developer work outside this session, per `CURRENT_TASK.md` scope. No Prisma schema, controller, service, or DB registration changes — that is TASK-037C.

### Commands

```bash
find knowledge-sources -type f
diff <source file> knowledge-sources/prompts/<renamed file>   # x8, all identical
```

### Result

PASS

### Evidence

- `find knowledge-sources -type f` confirms all 6 backlog-mandated prompt files plus `README.md` and 5 `.gitkeep` files exist at the expected paths.
- `diff` between each of the 8 source files (in `D:\infa\Documents\jobs for analys\New folder`) and its renamed copy in `knowledge-sources/prompts/` reported no differences — content copied byte-for-byte, no text edits.
- `.env.example` contains `KNOWLEDGE_SOURCES_ROOT=./knowledge-sources`.
- `knowledge-sources/README.md` documents the git strategy and explicitly flags `prompt_4_1_optional_html.md` / `prompt_6_recruiter_message.md` as future-scope, not consumed by TASK-037C.

### Follow-up

- Developer role (per `docs/07_task_backlog.md` TASK-037C-0 section) still open: populate `candidate-profile/`, `evidence/`, `cv-rules/`, `certifications/`, `layout/` with real content files. Not required for TASK-037C-0's Claude Code scope but is required before TASK-037C (registration) can reference them.
- Next recommended task: per `TASK_BOARD.md`, TASK-037C (register and activate knowledge source files) — blocked until developer supplies the content files above.

## 2026-07-07 — TASK-037C — Register and activate knowledge source files

### Scope

User supplied the 9 real content files at `C:\Users\Denys\Downloads\sources`; filenames matched the required target names exactly (no ambiguity, no guessing needed). Copied each file verbatim into its target path under `knowledge-sources/candidate-profile/`, `knowledge-sources/evidence/`, `knowledge-sources/cv-rules/`, `knowledge-sources/certifications/`, `knowledge-sources/layout/`. Verified the 6 backlog-mandated `knowledge-sources/prompts/*.md` files already exist (from TASK-037C-0) — not modified. Added `scripts/register-knowledge-sources.ts`, a standalone idempotent script (`npm run register-knowledge-sources`) that registers the 9 files via direct Prisma calls matching `KnowledgeSourcesService.importSource` semantics (file path, source type, version label, active flag, content hash via `HashService`-equivalent SHA-256-over-UTF-8 hashing), keyed by `filePath` for idempotency (no unique DB constraint added — application-level find-then-upsert instead, to avoid an unnecessary migration). `sourceType` values assigned to match the existing `KnowledgeSourceSelectionService` `STEP_SOURCE_GROUPS` vocabulary (`master_cv`, `profile_summary`, `project_inventory`, `career_cases`, `tech_stack`, `cv_rules`, `certifications`, `layout`); `LinkedIn_MD_Source_Decision...md` registered as `linkedin_source_decision`, intentionally not part of any current step's source group. No changes to `KnowledgeSourceSelectionService`, `Prisma` schema, or knowledge-source file content itself. Documented `KNOWLEDGE_SOURCES_ROOT` and the registration command in `README.md`.

### Commands

```bash
npm run register-knowledge-sources   # 1st run
npm run register-knowledge-sources   # 2nd run — idempotency check
npx tsc --noEmit
npm run test
npm run test -- --testPathPattern=knowledge-source
npm run lint
```

### Result

PASS

### Evidence

- 1st run: `Created:` logged for all 9 files, `Registered 9 knowledge source records.`
- 2nd run: `Updated:` logged for all 9 files (same count, no new rows) — confirms idempotency.
- Ad-hoc Prisma query (`prisma.knowledgeSource.findMany`) confirmed exactly 9 rows in the DB after both runs, each `isActive: true`, with the expected `sourceType`, `versionLabel` and `filePath` values.
- `npx tsc --noEmit` — no errors.
- `npm run test` — 39 suites / 344 tests passed, no regressions (including `knowledge-sources.service.spec.ts` and `knowledge-source-selection.service.spec.ts`).
- `npm run lint` — no errors.

### Follow-up

- None. TASK-037C acceptance criteria are met; `buildPrompt2Input()` can now assemble real CV content once TASK-037D (.env onboarding docs) and TASK-038/038A are picked up.
- Next recommended task: per `TASK_BOARD.md`, TASK-037D (.env onboarding docs) or TASK-038/038A per the dependency chain — not selected automatically.

## 2026-07-08 — TASK-037D — Complete .env setup and developer onboarding documentation

### Scope

Documentation-only task. Verified (by opening the files directly, not assuming) that `.env.example` already contains all 8 required vars (`DATABASE_URL`, `STORAGE_ROOT`, `KNOWLEDGE_SOURCES_ROOT`, `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT`, `AI_MODEL_DEFAULT`) with a one-line comment each, and that `.env`/`.env.local`/`.env.*.local` are already in `.gitignore` — both from earlier TASK-037A/037C work, so no changes were needed to either file. Expanded README.md's existing "Local Start" section (chosen over a new `docs/00_setup.md` — README already owns onboarding content, a second file would fragment it) into the full linear onboarding sequence: install → copy env → Docker → `prisma migrate dev` → `prisma generate` → `prisma db seed` → `register-knowledge-sources` → `start:dev` → create first workspace via `curl`. Added an "AI Provider" note stating OpenAI is the first real MVP provider and Anthropic is a later/fallback addition, not required for MVP. Added `AI_PROVIDER`/`OPENAI_API_KEY`/`OPENAI_MODEL` rows to the "Required env vars" table for consistency with the new AI Provider section. No code, schema, endpoint, or config-validation changes.

### Commands

```bash
npx prisma migrate dev
npx prisma db seed
npm run register-knowledge-sources
curl -s http://localhost:3000/health
curl -X POST http://localhost:3000/workspaces -H "Content-Type: application/json" -d '{"companyNameOriginal":"Acme Corp","roleTitleOriginal":"Backend Developer","vacancyText":"Full vacancy text goes here."}'
find storage/applications/2026_07_08_Acme_Corp_Backend_Developer -type f
```

### Result

PASS

### Evidence

- `npx prisma migrate dev` — "Already in sync, no schema change or pending migration was found." (`npx prisma generate` sub-step hit a Windows file-lock EPERM from an already-running dev-server process holding the Prisma query engine DLL — not a blocker, since the Prisma client was already generated and migrations were already in sync; the running dev-server process was left untouched rather than killed).
- `npx prisma db seed` — "Seeded 9 EvidenceItem records." / "Seeded 2 active PromptTemplate records." (idempotent upsert, no duplicates).
- `npm run register-knowledge-sources` — "Updated" logged for all 9 files, "Registered 9 knowledge source records." (idempotent, no duplicates — consistent with TASK-037C run).
- `GET /health` → `{"status":"ok"}` (dev server was already running locally on port 3000 in watch mode — used as-is instead of an artificial fresh restart).
- `POST /workspaces` with the exact `curl` command now documented in README.md → `201`-equivalent success response with `"status":"source_saved"`, `workspaceSlug: "2026_07_08_Acme_Corp_Backend_Developer"`.
- `storage/applications/2026_07_08_Acme_Corp_Backend_Developer/00_vacancy_source.txt` exists on disk — confirms the documented flow produces a real artifact, not just a DB row.

### Follow-up

- None. TASK-037D acceptance criteria are met; a new developer can follow README.md end to end without asking the author.
- Next recommended task: per `TASK_BOARD.md`, TASK-038 (mechanical MVP smoke test with fake provider) — not selected or started automatically.

## 2026-07-08 — TASK-038A — Run practical MVP real-provider smoke test

### Scope

Manual real-provider run of the full MVP pipeline against a real vacancy (Atmen — Software Engineer,
Munich RegTech startup), using `AI_PROVIDER=openai` / `gpt-4o`, driving every HTTP endpoint by hand:
create workspace → run Prompt 1 analysis → human review decision → generate CV content (Prompt 2 +
anti-overclaiming guard) → approve CV draft → export PDF.

A pre-existing dev server on port 3000 (started before `AI_PROVIDER=openai` was set in `.env`) was
found to still be running the fake provider — its Prompt 1 response was the canned
"Fake Company — Backend Developer" fixture. This was caught by inspecting the generated
`01_vacancy_analysis.md` (company/role name mismatch), the stale process was killed, the dev server
was restarted to pick up current `.env`, and the contaminated workspace (DB rows + folder) was
deleted before re-running the whole flow cleanly.

### Commands

```bash
docker compose ps                                       # jobflow_postgres already Up
curl -s http://localhost:3000/health                    # {"status":"ok"} — stale fake-provider server
# discovered fake output in 01_vacancy_analysis.md -> killed stale process (PID 18316), restarted:
npm run start:dev
# deleted contaminated workspace (DB rows + storage folder) for the first (fake-provider) attempt
curl -s -X POST http://localhost:3000/workspaces -H "Content-Type: application/json" -d @vacancy.json
curl -s -X POST http://localhost:3000/workspaces/<id>/run-analysis
curl -s -X POST http://localhost:3000/workspaces/<id>/review-decision -H "Content-Type: application/json" -d '{"action":"approve_maybe"}'
curl -s -X POST http://localhost:3000/workspaces/<id>/generate-cv-content
curl -s -X POST http://localhost:3000/workspaces/<id>/review-cv-draft -H "Content-Type: application/json" -d '{"action":"approve"}'
curl -s -X POST http://localhost:3000/workspaces/<id>/export-cv
file storage/applications/2026_07_08_Atmen_Software_Engineer/04_cv_export.pdf
docker exec -i jobflow_postgres psql -U jobflow -d jobflow_cv -c "SELECT ... FROM \"GeneratedArtifact\" ..."
docker exec -i jobflow_postgres psql -U jobflow -d jobflow_cv -c "SELECT ... FROM \"AiRun\" ..."
```

### Result

PASS

### Evidence

- Workspace `cmrc8zhba0005kmfnpf3hqo4g`, folder `storage/applications/2026_07_08_Atmen_Software_Engineer/`.
- Prompt 1 (real OpenAI, `gpt-4o`, `AiRun cmrc90397000ckmfnlirhou7u`, 3326 input / 1532 output / 4858 total tokens): decision `MAYBE`, score 64 — correctly flagged NestJS/PostgreSQL/React depth as `needs_evidence` (personal/portfolio, not verified commercial), per anti-overclaiming rules.
- Human review: `approve_maybe` submitted (matches AI's own recommendation, no override) → `status: cv_generation_running`.
- Prompt 2 (real OpenAI, `gpt-4o`, `AiRun cmrc93dg4000lkmfnklsg6mqp`, 5822 input / 2109 output / 7931 total tokens): `02_targeted_cv_content.md/json` generated. Overclaiming check: **critical issues: none**; multiple skills correctly marked `needs evidence`; commercial (EPAM, Factor-IT, CHI Software) vs personal (AI Job Assistant / FastAPI) experience kept separate, consistent with CLAUDE.md anti-overclaiming rules.
- CV draft approved (`approve`) → `status: export_running`.
- Export → `status: cv_pdf_generated`. `04_cv_export.pdf` — `file` reports "PDF document, version 1.4, 1 page(s)", 119350 bytes on disk.
- `GeneratedArtifact` table: 7 rows for this workspace (`00_vacancy_source.txt` origin `pasted`; `01_vacancy_analysis.md/json` and `02_targeted_cv_content.md/json` origin `prompt_1`/`prompt_2` with matching `promptRunId`; `04_cv_export.html/pdf` origin `generated_by_export_service` with **no** `promptRunId`).
- `AiRun` table: exactly 2 rows for this workspace's `PromptRun`s (Prompt 1, Prompt 2), both `provider: openai`, `model: gpt-4o`, `status: completed`. No `AiRun` created for the export step — confirms ADR-012.
- `ApplicationWorkspace.status` = `cv_pdf_generated`.
- `project-management/MVP_ACCEPTANCE.md` created recording provider/model, vacancy, workspace path, artifacts and MVP status.

### Follow-up

- None. TASK-038A acceptance criteria are met — this is the first real-provider, real-PDF proof of the MVP pipeline.
- Test workspace `2026_07_08_Atmen_Software_Engineer` (DB rows + storage folder) is real test data left in place as evidence per this log entry; not a production application record.

## 2026-07-13 — TASK-PH-015 — Remediate devDependency-only Dependabot alerts (@nestjs/cli build-tooling chain)

### Scope

Bumped `@nestjs/cli` (`^10.0.0` -> `^11.0.24`) and `@nestjs/schematics`
(`^10.0.0` -> `^11.1.0`) — devDependencies only — to clear 6 Dependabot
alerts (glob high, tmp high+low, picomatch moderate+high, webpack low x2)
that were all transitive via the `@nestjs/cli` -> `@angular-devkit/*`
build-tooling chain. `@nestjs/core`/`@nestjs/platform-express`/
`@nestjs/swagger`/`@nestjs/testing` were left untouched on the v10 line —
the remaining moderate `@nestjs/core` alert is the same one already
investigated and accepted as risk in TASK-PH-013 (no fix without a
NestJS v10->v11 major upgrade).

### Commands

```bash
npm audit --omit=dev --json      # baseline: 3 vulnerabilities (prod graph unaffected either way)
npm audit --json                 # baseline (all): 16 vulnerabilities (4 high, 9 moderate, 3 low)
# edited package.json: @nestjs/cli ^11.0.24, @nestjs/schematics ^11.1.0
npm install
npm audit                        # after: 4 moderate only (all @nestjs/core chain, pre-existing accepted risk)
npm run test
npx tsc --noEmit
npm run test:e2e
npm run build
npm run start:dev                # manual boot smoke check
```

### Result

PASS

### Evidence

- **Before**: `npm audit` — 16 vulnerabilities (4 high: glob, tmp, picomatch, tmp-arbitrary-write; 9
  moderate; 3 low: webpack x2, inquirer).
- **After**: `npm audit` — 4 moderate only, all on the `@nestjs/core` <= 11.1.17 chain
  (`@nestjs/core` -> `@nestjs/platform-express` -> `@nestjs/testing`, plus `@nestjs/swagger`) —
  same alert already documented and accepted as risk in TASK-PH-013 (no fix without NestJS v11
  major bump). `glob`, `tmp`, `picomatch`, `webpack` (and their `inquirer`/`external-editor`
  transitive chain) no longer appear.
- `npm run test`: 47/47 suites, 479/479 tests passed.
- `npx tsc --noEmit`: clean, no output.
- `npm run test:e2e`: 2/2 suites, 3/3 tests passed (`rate-limiting.e2e-spec.ts`,
  `mvp-flow.e2e-spec.ts`).
- `npm run build`: succeeded (`nest build`, no errors).
- `npm run start:dev`: app booted successfully — "Nest application successfully started" /
  "JobFlow CV Pipeline running on port 3000", all modules/routes mapped as before.

### Follow-up

- None for the 6 resolved alerts. The `@nestjs/core` moderate alert remains open/accepted per
  TASK-PH-013's documented decision — not in scope for TASK-PH-015.
- GitHub Dependabot alerts tab to be re-checked after this branch merges to `main` to confirm the
  6 alerts close automatically.
- **Post-merge confirmation (2026-07-13)**: `gh api repos/:owner/:repo/dependabot/alerts` shows
  only 1 open alert remaining (`@nestjs/core` #17, medium/runtime — the pre-existing accepted
  risk). All 6 devDependency alerts (glob, tmp, picomatch, webpack) are closed. TASK-PH-015 fully
  closed.

## 2026-07-13 — TASK-PH-016 — Upgrade NestJS core packages v10 → v11

### Scope

Bumped `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`,
`@nestjs/testing` (`^10.0.0` -> `^11.1.28`) and `@nestjs/swagger`
(`^7.4.2` -> `^11.4.5`, the actual latest — its own major line now tracks
Nest's major, not a "v8" pairing as originally scoped) to close the last
open Dependabot alert (#17, `@nestjs/core` moderate/medium, SSE injection —
GHSA-36xv-jgw5-4q75), which has no patched 10.x release. `@nestjs/config`
(`^4.0.4`) and `@nestjs/throttler` (`^6.5.0`) were left unchanged — both
already declare `@nestjs/common`/`@nestjs/core` `^11.0.0` in their
published `peerDependencies`, confirmed via `npm view <pkg> peerDependencies`
before deciding not to bump them. Added `"engines": { "node": ">=20" }` to
`package.json` to document the v11 floor (previously unenforced; runtime
Node was already `v20.20.2`).

### Commands

```bash
npm audit                        # baseline: 4 moderate (@nestjs/core <=11.1.17 chain)
npm view @nestjs/config peerDependencies --json
npm view @nestjs/throttler peerDependencies --json
# edited package.json: @nestjs/core/common/platform-express/testing ^11.1.28, @nestjs/swagger ^11.4.5, engines.node >=20
npm install
npm ls @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/testing @nestjs/swagger
npm audit                        # after: 0 vulnerabilities
npm run test
npx tsc --noEmit
npm run test:e2e
npm run build
docker compose up -d postgres
npm run start:dev                # manual boot + Swagger UI smoke check
curl -s http://localhost:3000/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api
curl -s http://localhost:3000/api-json   # confirmed openapi 3.0.0, 16 paths
```

### Result

PASS

### Evidence

- **Before**: `npm audit` — 4 moderate, all `@nestjs/core <=11.1.17` chain
  (`@nestjs/core` -> `@nestjs/platform-express` -> `@nestjs/testing`, plus
  `@nestjs/swagger`) — alert #17, no patched 10.x release exists.
- **After**: `npm audit` — **0 vulnerabilities**. `npm ls` confirms clean
  dependency resolution, no ERESOLVE conflicts, all `@nestjs/*` packages
  deduped to a single `11.1.28`/`11.4.5` set.
- `npm run test`: 47/47 suites, 479/479 tests passed.
- `npx tsc --noEmit`: clean, no output.
- `npm run test:e2e`: 2/2 suites, 3/3 tests passed (`rate-limiting.e2e-spec.ts`,
  `mvp-flow.e2e-spec.ts`) — full MVP flow (create workspace -> analysis ->
  review -> generate CV -> review draft -> export) exercised successfully.
- `npm run build`: succeeded (`nest build`, no errors).
- `npm run start:dev`: app booted successfully. `GET /health` -> `{"status":"ok"}`.
  `GET /api` (Swagger UI) -> HTTP 200. `GET /api-json` -> valid OpenAPI 3.0.0
  document with 16 registered paths — Swagger v7->v11 bootstrap API
  (`DocumentBuilder`, `SwaggerModule.createDocument/setup`) unaffected.
  Server stopped cleanly after verification (port 3000 released).

### Follow-up

- `@nestjs/config`/`@nestjs/throttler` left on their current versions — peer
  dependency ranges already cover `@nestjs/core`/`common` `^11.0.0`, no bump
  required.
- **Post-merge confirmation (2026-07-13)**: PR #70 merged to `main`
  (`f1f8663`). `gh api repos/:owner/:repo/dependabot/alerts` returns 0 open
  alerts — alert #17 confirmed closed. TASK-PH-016 fully closed.

## 2026-07-14 — TASK-PH-011 — Add minimal API-key authentication guard

### Scope

Added `ApiKeyGuard` (global, via `APP_GUARD`) requiring an `X-API-Key`
header matching the new required `API_KEY` env var on every endpoint
except `GET /health`, which is exempted via a new `@SkipAuth()` decorator
(`SetMetadata`/`Reflector` pattern mirroring the existing `@SkipThrottle()`
convention). `main.ts`'s unused `.addBearerAuth()` Swagger placeholder was
replaced with `.addApiKey()` describing the real `X-API-Key` header.
`.env.example` documents the new required variable; local `.env` and the
two e2e specs were updated with a working key so existing flows keep
passing.

### Commands

```bash
npx tsc --noEmit
npm run test
npm run test:e2e
npm run build
docker compose up -d postgres
npm run start:dev
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/version                          # no header
curl -s -o /dev/null -w "%{http_code}\n" -H "X-API-Key: wrong-key" http://localhost:3000/version # wrong key
curl -s -o /dev/null -w "%{http_code}\n" -H "X-API-Key: <real-key>" http://localhost:3000/version # correct key
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health                            # health, no key
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api                                # swagger UI
curl -s http://localhost:3000/api-json | jq .components.securitySchemes
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean, no output.
- `npm run test`: 48/48 suites, 484/484 tests passed (new
  `api-key.guard.spec.ts` — 4/4 cases: `@SkipAuth` bypass, missing header
  rejected, wrong header rejected, correct header allowed; updated
  `env.validation.spec.ts` for the new required `API_KEY` field).
- `npm run test:e2e`: 2/2 suites, 3/3 tests passed — both specs updated to
  send `X-API-Key` on every request except `/health`.
- `npm run build`: succeeded.
- Manual curl checks against `npm run start:dev`:
  - No header on `GET /version` -> **401**
  - Wrong `X-API-Key` on `GET /version` -> **401**
  - Correct `X-API-Key` on `GET /version` -> **200**
  - `GET /health` without any key -> **200**
  - `GET /api` (Swagger UI) -> **200**
  - `GET /api-json` `components.securitySchemes` -> `{"X-API-Key": {"type":
    "apiKey", "in": "header", "name": "X-API-Key"}}` — confirms the
    Swagger doc now describes the real auth scheme instead of the unused
    Bearer placeholder.

### Follow-up

- None. Full JWT/user-model auth remains a possible future task if the
  project ever needs multi-tenant access (per the backlog's explicit
  scope note) — not started speculatively here.

## 2026-07-14 — TASK-PH-012 — Raise TypeScript compiler strictness incrementally

### Scope

Enabled all five previously-disabled `tsconfig.json` strictness flags one
at a time, each in its own commit: `forceConsistentCasingInFileNames` →
`noFallthroughCasesInSwitch` → `strictBindCallApply` → `noImplicitAny` →
`strictNullChecks`. `npx tsc --noEmit` and `npm run test` were run after
each individual flag before moving to the next (5 checkpoints).

`forceConsistentCasingInFileNames`, `noFallthroughCasesInSwitch` and
`strictBindCallApply` surfaced zero errors. `noImplicitAny` surfaced 53
implicit-any errors, all fixed by adding explicit type annotations (real
Prisma model types on test mock factories; the project's own pipeline
schema types — `VacancyAnalysis`, `TargetedCvContentOutput`,
`PrePdfCheckOutput`, `FinalCheckOutput`, `SkipReasonAnalysis`,
`TargetedCvBullet` — on `fake.provider.ts`'s `FAKE_*_JSON` fixtures and
their spec-file consumers), not `any`. `strictNullChecks` surfaced 6
errors: `ArtifactStorageService` read `STORAGE_ROOT` via
`ConfigService.get()` (types `string | undefined`) and passed it straight
to `path.resolve()` — switched to `getOrThrow()`, which matches the real
guarantee (`env.validation.ts` requires `STORAGE_ROOT` with no default,
so the app never boots without it); and `workspaces.controller.spec.ts`
used two `Array.find()` results without a null check — added non-null
assertions with a one-line comment, justified because the preceding
`toHaveLength(4)` assertion already proves both entries exist.

No `any` or unjustified non-null assertions (`!`) were introduced. No
runtime behavior changed anywhere — this was a type-annotation-only pass.

### Commands

```bash
npx tsc --noEmit
npm run test
npm run test:e2e
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean after each of the 5 flags, and clean in the
  final state with all five explicitly `true`.
- `npm run test`: 48/48 suites, 484/484 tests passed after each flag and
  in the final state (unchanged pass count throughout — no test behavior
  regressions).
- `npm run test:e2e`: 2/2 suites, 3/3 tests passed in the final state
  (`rate-limiting.e2e-spec.ts`, `mvp-flow.e2e-spec.ts`).
- Final `tsconfig.json`: `strictNullChecks`, `noImplicitAny`,
  `strictBindCallApply`, `forceConsistentCasingInFileNames`,
  `noFallthroughCasesInSwitch` all explicitly `true` (not merely removed).

### Follow-up

- None. This was a type-safety hardening task only; no new runtime
  behavior or endpoints were added.

## 2026-07-14 — TASK-044 — Add safer wording suggestion service

### Scope

Added standalone `SafeWordingService` (`src/evidence/safe-wording.service.ts`)
producing a suggested safe wording string for a given claim + matching
`EvidenceItem`, distinguishing by real seed `category` values (`allowed` ->
commercial wording preserved, `risky` -> personal-project wording, `unsupported`
-> basic-exposure wording, no matching item -> needs-evidence wording).
Registered as a provider/export in `evidence.module.ts` alongside the existing
`EvidenceGuardService`/`EvidenceService`. No endpoint or pipeline wiring added
(out of scope per backlog AC).

### Commands

```bash
npm run test -- --testPathPattern=safe-wording   # 5/5 new tests
npm run test                                     # 49/49 suites, 489/489 tests
npx tsc --noEmit                                 # clean
npm run lint                                     # clean (Prettier auto-format only)
```

### Result

PASS

### Evidence

- `src/evidence/safe-wording.service.spec.ts`: 5/5 tests pass, covering all
  3 real categories plus the no-match case, and asserting the 3 category
  wordings are distinct strings (AC: "distinguish commercial, personal
  project and basic exposure").
- Full suite: 49/49 suites, 489/489 tests pass (up from 48/48, 484/484).
- `npx tsc --noEmit`: clean.

### Follow-up

- None. Service is standalone per backlog scope; wiring into
  `EvidenceGuardService`/Prompt 3/export pipeline was not requested and was
  explicitly excluded to avoid scope creep (see `CURRENT_TASK.md` Key
  Invariants for this task).

## 2026-07-14 — TASK-PH-018 — Seed skip_reason PromptTemplate to fix confirm-skip

### Scope

Added `prisma/prompts/skip_reason.txt` (placeholder content, same pattern as
`prompt3.txt`/`prompt5.txt`) and registered it in `prisma/seed.ts` as a new
active `PromptTemplate` (`step: 'skip_reason'`, `promptKey: 'skip_reason'`).
Fixes the pre-existing gap where `POST /workspaces/:id/confirm-skip` 500s on
any freshly-seeded database (`No active skip_reason template found`),
discovered during TASK-PH-017 and logged as a follow-up in `TASK_BOARD.md`.
`SkipReasonService`, `skip-reason.schema.ts` and `FakeAiProvider` were not
changed — the code path was already correct; this was a seed-data gap only.
`test/skip-flow.e2e-spec.ts` extended to call `confirm-skip` after
`change_to_skip` and assert the ADR-005 transition to `status = skipped`
with both `01_skip_reason.md`/`.json` artifacts created and registered.

### Commands

```bash
npx prisma db seed        # run twice, confirms idempotency
npx tsc --noEmit
npm run test
npm run test:e2e
```

### Result

PASS

### Evidence

- `npx prisma db seed`: "Seeded 5 active PromptTemplate records" (up from 4),
  run twice with identical output — confirms the upsert is idempotent.
- `npx tsc --noEmit`: clean.
- `npm run test`: 50/50 suites, 498/498 tests pass.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass —
  `test/skip-flow.e2e-spec.ts` now exercises `confirm-skip` end-to-end
  (previously only `change_to_skip` was covered). Actual test execution
  completed in ~15.7s; the Jest process then hung on exit ("did not exit one
  second after the test run has completed... asynchronous operations that
  weren't stopped") and had to be killed manually after ~11 minutes of zero
  CPU activity. This occurs strictly after all tests already pass, is not
  caused by this task's change (`test:e2e`/`jest-e2e.json`/CI config have no
  `--forceExit` and this class of Jest exit-hang is orthogonal to the one
  extra HTTP call added here), and does not affect CI (TASK-PH-017 already
  confirmed the `test-e2e` CI job is green). Logged here for visibility, not
  as a new gap to fix in this task.

### Follow-up

- Resolved same day — see next entry below. Root cause was not Puppeteer;
  it was the `pino-pretty` transport worker thread (see
  `project-management/CHANGELOG.md` "TASK-PH-018 (follow-up fix)").

## 2026-07-14 — TASK-PH-018 (follow-up fix) — Fix local test:e2e exit hang (pino-pretty transport worker)

### Scope

`src/app.module.ts` `LoggerModule.forRootAsync` enabled the `pino-pretty`
transport whenever `NODE_ENV !== 'production'`. Jest sets `NODE_ENV=test`
by default, so e2e runs also loaded pino-pretty. Pino transports run in a
`worker_thread` that NestJS `app.close()` does not close, leaving the
process alive indefinitely after all tests already passed (~14s of real
work followed by 10+ minutes of idle CPU before a manual kill was needed).
Fixed by excluding `test` alongside `production` from the transport
condition. No test files changed — this is an `app.module.ts` one-line
condition fix only.

### Commands

```bash
npx tsc --noEmit
npm run test
npm run test:e2e   # run directly in foreground, not backgrounded, to confirm clean exit
```

### Result

PASS

### Evidence

- `npm run test:e2e`: 3/3 suites, 4/4 tests pass, command returns on its
  own in ~14s total (previously hung 10+ minutes with 0 CPU activity after
  tests completed, requiring a manual process kill).
- `npx tsc --noEmit`: clean.
- `npm run test`: 50/50 suites, 498/498 tests pass (unaffected — unit tests
  don't boot the full Nest app/logger).

### Follow-up

- None. `npm run start:dev` still gets pretty-printed logs (`NODE_ENV`
  unset or `development` there); only `test`/`production` are excluded.

## 2026-07-14 — TASK-046 — Implement import preview and manual metadata correction

### Scope

`ImportService.previewImport(folderPath, overrides?)` — given one folder previously
returned by `scanRoot()`, re-derives the scan result (reusing `scanDateFolder()`), applies
optional `companyNameOverride`/`roleTitleOverride` through `SlugService`, and detects
duplicates by two signals: `ApplicationWorkspace.sourceImportedPath === folderPath` (path
match) and, when exactly one vacancy-source `.txt` candidate exists, its content hash
matching an existing `GeneratedArtifact` (`artifactType: 'vacancy_source'`) `contentHash`
(hash match). New `POST /import/preview` endpoint, Swagger-documented. `ImportModule` now
imports `PrismaModule` and `ArtifactsModule` (for `PrismaService`/`HashService`). No DB
writes anywhere in this task — record creation is TASK-047.

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern=import.service
npm run test
npm run test:e2e
```

### Result

PASS

### Evidence

- `import.service.spec.ts`: 15/15 tests pass (8 existing `scanRoot` tests unchanged + 7 new
  `previewImport` tests — no override, company override, role override, path-based
  duplicate, hash-based duplicate, multi-candidate skips hash check, no duplicate).
- Full suite: 50/50 suites, 505/505 tests pass (up from 498).
- `npx tsc --noEmit`: clean.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass — confirms `ImportModule`'s new
  `PrismaModule`/`ArtifactsModule` imports don't break `AppModule`'s DI graph.

### Follow-up

- None for this task. TASK-047 (import confirmation and artifact registration) is the
  natural next step — it will be the first task to actually call `previewImport()`'s
  result to create `ApplicationWorkspace`/`GeneratedArtifact` records.

## 2026-07-14 — TASK-046 (follow-up fix) — Add missing ImportController test coverage (Codecov patch gate)

### Scope

Codecov flagged PR #79's patch coverage at 88.10% (target 80% overall, but `src/import/
import.controller.ts` itself showed 0% patch coverage, 5 lines missing) — `ImportController`
had no spec file at all, so the new `preview()` method (and the pre-existing `scan()`
method) were both untested at the controller layer; only the service layer had tests. Added
`src/import/import.controller.spec.ts` covering both endpoints with a mocked
`ImportService`, following the existing `artifacts.controller.spec.ts` pattern.

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern=import
npm run test
```

### Result

PASS

### Evidence

- `import.controller.spec.ts`: 2/2 tests pass (`scan` delegates to `scanRoot()`, `preview`
  delegates to `previewImport()` with `folderPath` + overrides split out correctly).
- `import.service.spec.ts` + `import.controller.spec.ts` together: 17/17 tests pass.
- Full suite: 51/51 suites, 507/507 tests pass (up from 505).
- `npx tsc --noEmit`: clean.

### Follow-up

- None.

## 2026-07-14 — TASK-046 (follow-up fix 2) — Fix path-injection CodeQL alert in previewImport

### Scope

CodeQL (`GitHub Advanced Security`) flagged a new high-severity alert on PR #79:
"Uncontrolled data used in path expression" at `import.service.ts` `listFiles()` — the
`POST /import/preview` endpoint passed the caller-supplied `folderPath` request field
straight into `fs.readdir()` via `previewImport()` → `scanDateFolder()` → `listFiles()`,
with no containment check. Unlike `scanRoot()` (which only ever walks directories under the
server-controlled `IMPORT_ROOT`), `previewImport()` let any caller read an arbitrary
directory on the server's filesystem — the same class of path-traversal bug fixed for
`ArtifactStorageService` in TASK-PH-014 and for `GET /import/scan?rootPath=` in TASK-045's
post-PR fix. Fixed by mirroring `ArtifactStorageService.assertInsideStorageRoot()`: added
`ImportService.assertInsideImportRoot()`, resolving `folderPath` against the configured
`IMPORT_ROOT` and throwing `BadRequestException` if the resolved path escapes it (covers
both an absolute path outside `IMPORT_ROOT` and a relative path using `../` segments).

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern=import
npm run test
```

### Result

PASS

### Evidence

- 2 new tests: rejects an absolute `folderPath` outside `IMPORT_ROOT`, and rejects a
  relative `folderPath` that escapes `IMPORT_ROOT` via `../` segments — both assert
  `BadRequestException` with a message naming the violation.
- `import.service.spec.ts` + `import.controller.spec.ts`: 19/19 tests pass (up from 17).
- Full suite: 51/51 suites, 509/509 tests pass (up from 507).
- `npx tsc --noEmit`: clean.
- CodeQL re-ran on the pushed fix and still flagged the same line (`listFiles()`'s
  `fs.readdir(dirPath)`) as alert #6 — this is the same known limitation as TASK-PH-014
  (alert #4): CodeQL's static dataflow analysis does not recognize a custom runtime
  containment guard (`assertInsideImportRoot()`) as a sanitizer barrier, since the variable
  used at the `fs.readdir` call site is unchanged by the guard (it throws rather than
  reassigning). Dismissed alert #6 via `gh api` as `false positive`, mirroring alert #4's
  dismissal. All 9 PR #79 checks green after dismissal.
- Codecov flagged 1 missing patch line (`import.service.ts` line 129 —
  `assertInsideImportRoot()`'s `importRoot.endsWith(path.sep) ? importRoot : ...` true
  branch, unreachable via `path.resolve()` output except at a literal filesystem root).
  Patch coverage was already 98.04% (well above the 80% `codecov.yml` target) and the
  branch mirrors an already-accepted untested branch in `ArtifactStorageService.
  assertInsideStorageRoot()` (TASK-PH-014) — not a gate failure. Added one direct unit test
  invoking the private method with an `IMPORT_ROOT` value that already ends in `path.sep`
  to close it anyway. `import.service.ts` branch coverage 84.9% → 86.79%; suite now 51/51,
  510/510 tests.

### Follow-up

- None.

## 2026-07-14 — TASK-047 — Implement import confirmation and artifact registration

### Scope

`ImportService.confirmImport(folderPath, options)` — the final step of the import flow
(TASK-045 scan → TASK-046 preview → TASK-047 confirm). Calls `previewImport()` internally,
then: blocks duplicates (`ConflictException`, 409), blocks zero/ambiguous vacancy-source
candidates without a valid `selectedVacancySourcePath` (`BadRequestException`, 400), blocks
`suggestedStatus === import_needs_review` (400). Creates `Company`, `JobVacancy` (populating
the previously-unused `originalImportedFileName`/`sourceFormat: 'legacy_import'`),
`ApplicationWorkspace` (`createdFrom: 'import'`, `sourceImportedPath`, initial `status`
mapped 1:1 from `suggestedStatus`, `isSkipped: true`/`currentDecision: skip` for the skip
case per ADR-005/016), and one `GeneratedArtifact` per detected legacy file. By default,
files are registered *in place* under `IMPORT_ROOT` (no copy, `origin: 'imported'`,
`canonicalFileName` = original legacy file name) — the artifact-level `storageRoot` field
(confirmed via `ArtifactsController.download()`'s path-safety check) makes this possible
without touching `ArtifactStorageService`'s `STORAGE_ROOT`-only write methods. The optional
`copyVacancySourceToCanonical` flag physically copies only the vacancy source into
`00_vacancy_source.txt` under the new workspace's `STORAGE_ROOT` folder. New
`POST /import/confirm` endpoint. `ImportModule` gained `CompanyModule`/`VacancyModule`/
`ArtifactStorageModule` imports. Discovered (not fixed) a pre-existing binary-unsafe read in
the generic `GET /artifacts/:id/download` endpoint, newly relevant because this task
registers legacy PDFs through it — logged as `TASK-PH-019` in `TASK_BOARD.md`.

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern=import
npm run test
npm run test:cov -- --testPathPattern=import
npm run test:e2e
```

### Result

PASS

### Evidence

- `import.service.spec.ts` + `import.controller.spec.ts`: 32 tests pass, 13 new for
  `confirmImport` (Action1-style no-copy, Amach-style 4 artifacts, AppsFlyer-style with
  `copyVacancySourceToCanonical`, Broadvoice-style skip asserting `isSkipped`/
  `currentDecision`, duplicate rejection, ambiguous-without-override rejection, ambiguous
  accepted with matching `selectedVacancySourcePath`, ambiguous rejected with
  non-matching `selectedVacancySourcePath`, zero-vacancy-source rejection,
  `import_needs_review` rejection) + 1 new controller delegation test.
- `npm run test:cov -- --testPathPattern=import`: `import.controller.ts` 100/100/100/100;
  `import.service.ts` 97.52% statements / 88.88% branches — remaining uncovered lines
  (496, 519–521, 566) are pre-existing `scanDateFolder`/`suggestStatus` branches from
  TASK-045, outside this task's diff.
- Full suite: 51/51 suites, 522/522 tests pass (up from 510).
- `npx tsc --noEmit`: clean.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass, exits cleanly (~13s) — confirms the new
  `ImportModule` imports (`CompanyModule`/`VacancyModule`/`ArtifactStorageModule`) don't
  break `AppModule`'s DI graph.

### Follow-up

- `TASK-PH-019` scheduled (not yet started) for the binary-unsafe generic artifact download
  endpoint, see `TASK_BOARD.md` "Known Gaps" / board row.

## 2026-07-14 — TASK-047 (follow-up) — Dismiss CodeQL false positive on ArtifactStorageService.writeFile

### Scope

CodeQL flagged `src/artifacts/artifact-storage.service.ts:53` (the `fs.writeFile()` call
inside `writeFile()`) as alert #7 on PR #80 — the same false-positive pattern already
dismissed twice before (alert #4 in TASK-PH-014, alert #6 in TASK-046): the method already
calls `assertInsideStorageRoot()` immediately before `fs.writeFile()` on the same
`filePath` variable, but CodeQL's static dataflow analysis does not recognize a
throw-based runtime guard as a sanitizer. `writeFile()` itself is unchanged by TASK-047 —
CodeQL re-flagged it because `confirmImport()` is a new caller reaching the same
already-guarded method. Dismissed via `gh api` as `false positive`, referencing alerts
#4/#6.

### Commands

```bash
gh api --method PATCH repos/strakhovdenya/jobflow-cv-pipeline/code-scanning/alerts/7 \
  -f state=dismissed -f dismissed_reason="false positive" -f dismissed_comment="..."
gh pr checks 80
```

### Result

PASS — all 9 PR #80 checks green after dismissal (Lint/Typecheck/Build/Test/Test(e2e)/
Docker/Analyze/CodeQL/codecov-patch).

### Follow-up

- None.

## 2026-07-14 — TASK-PH-019 — Fix binary-unsafe generic artifact download endpoint

### Scope

`ArtifactsController.download()` (`GET /artifacts/:id/download`) read the target file with
`fs.readFile(resolvedFile, 'utf-8')` and sent it via `res.send(content)` — decoding a
binary file (PDF) as UTF-8 text corrupts it. Not triggered before TASK-047 because the only
PDF the pipeline itself produces (`04_cv_export.pdf`) has its own dedicated, already
binary-safe download route (`GET /workspaces/:id/download-cv`). TASK-047 registers imported
legacy CV/cover-letter PDFs as plain `GeneratedArtifact` rows with no dedicated route of
their own, making the bug reachable. Fixed with a one-line change:
`fs.readFile(resolvedFile)` (no encoding, returns `Buffer`), mirroring the already-correct
`downloadCv()` pattern. No other logic (path-safety check, headers, error handling)
changed.

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern=artifacts.controller
npm run test
npm run test:e2e
```

### Result

PASS

### Evidence

- `artifacts.controller.spec.ts`: 7/7 tests pass — existing happy-path test updated to
  mock/assert a `Buffer`; new test sends a byte sequence containing `0xFF`/`0xFE` (invalid
  as standalone UTF-8 bytes) and asserts `res.send` received the exact same `Buffer`
  unchanged (`Buffer.equals()`), proving the fix actually prevents corruption rather than
  just changing the mock type.
- Full suite: 51/51 suites, 523/523 tests pass (up from 522).
- `npx tsc --noEmit`: clean.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass, exits cleanly.

### Follow-up

- None. `TASK_BOARD.md` "Known Gaps" entry resolved.

## 2026-07-14 — TASK-048 — Create CoverLetterDraft model/service

### Scope

New `CoverLetterDraft` Prisma model + `CoverLetterDraftStatus` enum (migration
`add_cover_letter_draft`), linked to `ApplicationWorkspace` via `workspaceId` only (no `cvDraftId` —
`CvDraft` was never implemented in this codebase, confirmed by inspecting `prisma/schema.prisma`;
resolved with user before implementation, see `CURRENT_TASK.md` Context). New
`CoverLetterDraftsService.create()` (`src/cover-letters/`) creates a draft row and blocks creation
for a workspace with `status === skipped` (`BadRequestException`), matching the existing
`overrideSkip()` pattern where a manual override already moves the workspace out of `skipped` before
cover letter generation would be attempted. No controller/endpoint in this task (service only,
matches backlog scope); module not yet imported into `AppModule` per ADR-017 (no controller to route
to yet — TASK-049 wires it in).

### Commands

```bash
npx prisma migrate dev --name add_cover_letter_draft
npx prisma generate
npm run test -- --testPathPattern=cover-letter-drafts
npm run test
npx tsc --noEmit
npm run lint
npm run test:e2e
```

### Result

PASS

### Evidence

- `cover-letter-drafts.service.spec.ts`: 4/4 tests pass — creates a draft for a workspace in
  `cv_pdf_generated` status (CV already exists), 404s on missing workspace, 400s when
  `status === skipped`, succeeds once status has moved to `cv_generation_running` (post manual
  override).
- Full suite: 52/52 suites, 527/527 tests pass (up from 51/51, 523/523).
- `npx tsc --noEmit`: clean.
- `npm run lint`: clean.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass — confirms the new migration didn't break the
  existing HTTP flows.

### Follow-up

- TASK-049 (Implement cover letter generation step) will wire `CoverLetterDraftsModule` into a
  controller/endpoint and create the actual `cover_letter.md/pdf` `GeneratedArtifact` rows.

## 2026-07-15 — TASK-049 — Implement cover letter generation step

### Scope

New `CoverLetterInputBuilderService`/`CoverLetterService` (`src/pipeline/cover-letter/`), mirroring
the existing `Prompt5InputBuilderService`/`Prompt5Service` pattern: guards `workspace.status` in
`[cv_pdf_generated, final_check_ready]`, reads `00_vacancy_source.txt`/`01_vacancy_analysis.json`
(optional)/`02_targeted_cv_content.json` (required) plus `profile_summary`/`cv_rules` knowledge
sources (new `cover_letter` step group added to `KnowledgeSourceSelectionService`), runs the full
PromptRun/AiRun lifecycle, writes `cover_letter.md`/`cover_letter.json` via `ArtifactStorageService`,
transitions `workspace.status` to `cover_letter_generated` on success (new transitions added to
`WorkspaceStatusService.TRANSITIONS`: `cv_pdf_generated -> cover_letter_generated` and
`final_check_ready -> cover_letter_generated`), then registers a `CoverLetterDraft` row via TASK-048's
`CoverLetterDraftsService.create()`. New `cover-letter.schema.ts`/`validateCoverLetterJson()` matches
`docs/08_ai_pipeline.md` §15.4. `FakeAiProvider` gained a `cover_letter` step fixture
(`FAKE_COVER_LETTER_JSON`). New `POST /workspaces/:id/generate-cover-letter` endpoint added directly
to `WorkspacesController` (matching how Prompt 1/2/3/5 endpoints live there, not in per-step
controllers). `cover_letter.pdf` export is deferred (user-confirmed scope decision — no canonical
HTML artifact name exists yet for the intermediate render step).

### Commands

```bash
npx tsc --noEmit
npm run test
npm run test:cov
docker compose up -d postgres
npx prisma migrate dev --name add_cover_letter_generation_placeholder
npx prisma db seed
npm run test:e2e
npm run start:dev   # manual smoke test
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean.
- Full suite: 55/55 suites, 580/580 tests pass (up from 52/52, 527/527) — new specs:
  `cover-letter.schema.spec.ts`, `cover-letter-input-builder.service.spec.ts`,
  `cover-letter.service.spec.ts`, plus additions to `knowledge-source-selection.service.spec.ts`,
  `workspace-status.service.spec.ts` and `workspaces.controller.spec.ts`.
- `npm run test:cov`: All files 93.64%/74.84%/94.95%/93.45% (statements/branches/functions/lines) —
  above the ADR-022 floor (90/68/90/90).
- `npx prisma migrate dev`: no schema change needed (this task added no new Prisma fields); `npx
  prisma db seed` confirms 6 active `PromptTemplate` records (up from 5 — new `cover_letter` step).
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass.
- Manual smoke test via `npm run start:dev`: drove the full HTTP flow (create workspace ->
  run-analysis -> review-decision(approve_apply) -> generate-cv-content -> review-cv-draft(approve)
  -> export-cv -> generate-cover-letter) with the fake AI provider. `generate-cover-letter` returned
  `success: true`, `workspaceStatus: "cover_letter_generated"` and a `coverLetterDraft` row; verified
  `cover_letter.md` on disk contains the fake fixture's greeting/body paragraphs/closing rendered
  correctly.

### Follow-up

- `cover_letter.pdf` export deferred — needs a decision on an intermediate HTML artifact name (not
  currently in CLAUDE.md's canonical artifact list) before `PdfExportService.htmlFileToPdf()` can be
  reused for it.

## 2026-07-15 — TASK-PH-020 — Fix cover letter draft creation failure handling and missing subject in markdown

### Scope

Two correctness fixes to `src/pipeline/cover-letter/cover-letter.service.ts`, found during code
review of TASK-049 (PR #83). (1) `coverLetterDraftsService.create()` is now called *before* the
`workspace.status` transition to `cover_letter_generated`, wrapped in try/catch; on failure it
returns a structured `{ success: false, workspaceStatus: <unchanged>, validationError }` result
instead of letting the exception propagate uncaught — `workspace.status` stays at
`cv_pdf_generated`/`final_check_ready`, so the endpoint remains retry-safe, and `PromptRun`/`AiRun`
correctly stay `completed`/`success` since the AI generation itself succeeded. (2) `buildMarkdown()`
now renders a `**Subject:** <value>` line into `cover_letter.md` when `data.subject` is non-null
(previously silently dropped, only surviving in `cover_letter.json`).

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern=cover-letter
npm run test
docker compose up -d postgres
npm run test:e2e
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean.
- `cover-letter.service.spec.ts` + related specs: 58/58 tests pass, including 3 new tests for the
  draft-creation-failure path (`success: false`, `workspaceStatus` unchanged, no exception thrown,
  `promptRuns.complete`/`aiRuns.saveSuccess` still called, `promptRuns.fail`/`aiRuns.saveFailed` NOT
  called) and 2 new tests for the subject rendering (non-null subject appears in `cover_letter.md`;
  null subject produces no `**Subject:**` line, matching prior byte-identical output).
- Full suite: 55/55 suites, 585/585 tests pass (up from 55/55, 580/580).
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass.

### Follow-up

- TASK-PH-021 (unguarded vacancy-source reads) and TASK-PH-022 (`WorkspaceStatusService` dual
  registration) remain scheduled as separate follow-ups from the same code review.

## 2026-07-15 — TASK-PH-021 — Wrap unguarded vacancy-source reads in try/catch across prompt2 and cover-letter input builders

### Scope

`00_vacancy_source.txt` reads in `src/pipeline/prompt2/prompt2-input-builder.service.ts`
(`buildPrompt2Input`) and `src/pipeline/cover-letter/cover-letter-input-builder.service.ts`
(`buildCoverLetterInput`) were unwrapped, unlike every other artifact read in those files, so a
missing/moved vacancy source produced an unhandled 500 instead of a controlled 400. Both reads are
now wrapped in try/catch and rethrow `BadRequestException('Vacancy source artifact not found
(00_vacancy_source.txt).')`. Also tightened an existing cover-letter-input-builder test that only
asserted `.rejects.toThrow()` (no exception type) to assert `BadRequestException` specifically —
that weakened assertion is what let the original gap go unnoticed in TASK-049.

### Commands

```bash
npx tsc --noEmit
npm run test -- --testPathPattern="prompt2-input-builder|cover-letter-input-builder"
npm run test
docker compose up -d postgres
npm run test:e2e
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean.
- Both input-builder specs: 16/16 tests pass, including 1 new test in
  `prompt2-input-builder.service.spec.ts` (missing vacancy source throws `BadRequestException`) and
  the tightened assertion in `cover-letter-input-builder.service.spec.ts`.
- Full suite: 55/55 suites, 586/586 tests pass (up from 55/55, 585/585).
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass.

### Follow-up

- TASK-PH-022 (`WorkspaceStatusService` dual registration) remains scheduled as the last of the
  three code-review follow-ups.

## 2026-07-15 — TASK-PH-022 — Remove redundant WorkspaceStatusService registration from WorkspacesModule

### Scope

`WorkspaceStatusService` was registered as a provider in both `WorkspacesModule` and
`PipelineModule`. Scope revised after checking actual usage (confirmed with user before
implementation): nothing in `WorkspacesModule`/`WorkspacesService`/`WorkspacesController` injects
the service — the `WorkspacesModule` registration was dead weight from TASK-039. Rather than
building a new shared module (the original backlog card's assumption), simply removed
`WorkspaceStatusService` from `src/workspaces/workspaces.module.ts`'s `providers` array and its
now-unused import. `PipelineModule` remains the sole registration (the only real consumer,
`CoverLetterService`).

### Commands

```bash
npx tsc --noEmit
npm run test
docker compose up -d postgres
npm run test:e2e
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean.
- Full suite: 55/55 suites, 586/586 tests pass — unchanged from before the removal, confirming no
  hidden test relied on `WorkspacesModule`'s own DI instance.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass — confirms the whole app (including
  `WorkspacesController`'s `generate-cover-letter` endpoint, reached via `PipelineModule`) still
  boots and resolves correctly with the duplicate registration removed.
- `grep -rn "WorkspaceStatusService" src --include="*.module.ts"` confirms exactly one module
  registration remains (`src/pipeline/pipeline.module.ts`).

### Follow-up

- None. All three TASK-049 code-review follow-ups (TASK-PH-020/021/022) are now DONE.

## 2026-07-15 — TASK-050 — Add application status tracking fields/endpoints

### Scope

Starts Phase 11 (Application Tracking & Rejection Analysis). `ApplicationWorkspace` gained 7
optional fields (`appliedAt`, `appliedVia`, `rejectedAt`, `rejectionSummary`, `notes`,
`submittedCvArtifactId`, `submittedCoverLetterArtifactId` — the first 5 taken verbatim from
`docs/03_domain_model.md` §8.2's "Optional later fields"; the last 2 confirmed with the user as
named loose-scalar fields mirroring the existing `promptRunId`-style convention). New
`src/application-tracking/` module: `ApplicationTrackingService` with `markReadyToApply`/
`markApplied`/`markRejected`/`markArchived`, each guarded by a locally-hardcoded valid-predecessor-
status array (mirrors `ReviewGatesService`'s pattern — confirmed with user, not routed through
`WorkspaceStatusService`, matching the majority precedent in this codebase). 4 new
`WorkspacesController` endpoints, Swagger-documented per ADR-019. Valid-predecessor-status sets and
the submitted-artifact-id field shape were confirmed with the user before implementation since the
backlog card's AC didn't specify them (see `CURRENT_TASK.md` Context).

### Commands

```bash
npx prisma format
docker compose up -d postgres
npx prisma migrate dev --name add_application_tracking_fields
npx tsc --noEmit
npm run test
npx prisma db seed
npm run test:e2e
npm run start:dev   # manual smoke test
```

### Result

PASS

### Evidence

- `npx prisma migrate dev`: migration `20260715090703_add_application_tracking_fields` applied
  cleanly, `npx prisma generate` run.
- `npx tsc --noEmit`: clean.
- Full suite: 56/56 suites, 614/614 tests pass (up from 55/55, 586/586) — new
  `application-tracking.service.spec.ts` (per-method success/`BadRequestException`/
  `NotFoundException` coverage) plus `workspaces.controller.spec.ts` additions for the 4 new
  endpoints; `workspaces.service.spec.ts`'s `mockWorkspace` fixture updated with the 7 new fields.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass.
- Manual smoke test via `npm run start:dev`: drove `export-cv` → `mark-ready-to-apply` (from
  `cv_pdf_generated`) → `mark-applied` (`appliedVia`/`notes`/`submittedCvArtifactId` all persisted
  correctly, `appliedAt` set) → `mark-rejected` (`rejectionSummary` persisted, `rejectedAt` set) →
  confirmed a second `mark-applied` call correctly 400s with the expected valid-status list in the
  error message → `archive` (`status: archived`, `isArchived: true`).

### Follow-up

- TASK-051 (rejection text artifact/analysis placeholder) can build on `rejectionSummary`/
  `markRejected` from this task.

## 2026-07-16 — TASK-051 — Implement rejection text artifact and analysis placeholder

### Scope

Continues Phase 11. New `src/rejections/` module: `RejectionsService.saveRejectionText(workspaceId,
dto)` saves the full rejection text (e.g. a recruiter rejection email) as a `rejection_feedback.md`
artifact — richer content than the short `rejectionSummary` DB field added in TASK-050. Guarded by a
locally-hardcoded valid-status array (`[rejected]`, mirrors `ApplicationTrackingService`'s pattern).
Uses the same write-file-then-register-artifact primitives (`ArtifactStorageService.writeFile` +
`ArtifactsService.register`, `origin: 'pasted'`) that `WorkspacesService.createWorkspace` uses for
`00_vacancy_source.txt`. No AI call, no `PromptRun`/`AiRun` — `GeneratedArtifact.promptRunId` stays
`null`, already nullable, so no schema change was needed to satisfy the "optional later AI analysis
can be linked to PromptRun/AiRun" AC. Precondition status and artifact naming were confirmed with
the user before implementation since the backlog card's AC didn't specify them (see
`CURRENT_TASK.md` Context).

### Commands

```bash
npx tsc --noEmit
npm run test
npm run test:e2e
npm run start:dev   # manual smoke test
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean.
- Full suite: 57/57 suites, 620/620 tests pass (up from 56/56, 614/614) — new
  `rejections.service.spec.ts` (success path + wrong-status `BadRequestException` +
  `NotFoundException`) plus `workspaces.controller.spec.ts` addition for the new endpoint.
- `npm run test:e2e`: 3/3 suites, 4/4 tests pass.
- Manual smoke test via `npm run start:dev`: drove `export-cv` → `mark-ready-to-apply` →
  `mark-applied` → `mark-rejected` → `POST :id/rejection-text` with a multi-line rejection email —
  confirmed `rejection_feedback.md` written verbatim to
  `storage/applications/2026_07_16_SmokeTestCo_Backend_Developer/rejection_feedback.md` and a
  `GeneratedArtifact` row registered (`artifactType: rejection_feedback`, `origin: pasted`,
  `promptRunId: null`). Confirmed the status guard: a second workspace at `source_saved` got a 400
  ("cannot save rejection text (requires one of: rejected)"), and an unknown workspace id got a 404.

### Follow-up

- The real AI-driven `rejection_analysis` step (already named in `docs/03_domain_model.md` §5.4/§9)
  remains future work — this task only laid the artifact groundwork for it.

## 2026-07-17 — TASK-055 — Bootstrap Next.js dashboard

### Scope

New `apps/web/` — Next.js 16 app (App Router, TypeScript, Tailwind CSS, `create-next-app`), fully
independent from the root npm project (its own `package.json`/`node_modules`/lockfile). New
`apps/web/src/lib/api.ts` (`getHealth()`) calls the existing backend `GET /health` endpoint via
`NEXT_PUBLIC_API_BASE_URL` (documented in `apps/web/.env.local.example`, defaults to
`http://localhost:3000`). Home page (`apps/web/src/app/page.tsx`) renders "Backend status: ok/
unreachable". No backend contract changes. Discovered and fixed a collision: the root `tsconfig.json`
(no prior `exclude`) and root `npm run lint` glob (`{src,apps,libs,test}/**/*.ts`) both picked up the
new `apps/web` files, since `apps` was leftover Nest-CLI-convention boilerplate never previously
populated. Fixed by adding `"exclude": ["node_modules", "dist", "apps"]` to `tsconfig.json` (and
`apps` to `tsconfig.build.json`'s exclude, which does not merge with the parent) and dropping `apps`
from the root lint script's glob (`package.json`). A third instance of the same collision surfaced
at commit time via the Husky pre-commit hook: root `lint-staged`'s `"*.ts"` pattern also matched
staged `apps/web/*.ts` files and ran the root ESLint config (whose `parserOptions.project` does not
cover `apps/web`) against them. Fixed by scoping `lint-staged` to `{src,libs,test}/**/*.ts` in
`package.json`, matching the already-fixed root lint script.

### Commands

```bash
cd apps/web && npm run lint
cd apps/web && npx tsc --noEmit
cd apps/web && npm run build
npx tsc --noEmit          # root backend, confirms apps/web no longer picked up
npm run lint               # root backend
npm run test                # root backend
docker compose ps           # confirmed postgres + redis already running
npm run start:dev           # backend, manual smoke test
cd apps/web && npm run dev  # frontend, manual smoke test
```

### Result

PASS

### Evidence

- `apps/web`: `npm run lint` clean, `npx tsc --noEmit` clean, `npm run build` succeeds
  (route `/` compiled as dynamic due to live `fetch`).
- Root backend: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` — 59/59 suites,
  637/637 tests pass (unchanged from TASK-054 baseline, confirming the `apps/web` addition and
  `tsconfig`/lint fixes did not affect backend behavior).
- Manual smoke test: started backend (`npm run start:dev`, port 3000) — `curl http://localhost:3000/health`
  returned `{"status":"ok"}`. Started `apps/web` dev server (`npm run dev`, auto-selected port 3001
  since 3000 was in use) — page rendered "Backend status: ok" (green), confirming the frontend
  successfully calls the real backend health endpoint end-to-end. Both dev servers stopped after
  verification.

### Follow-up

- TASK-056 (workspace creation UI) is the next planned `apps/web` task per
  `docs/07_task_backlog.md`.

## 2026-07-17 — TASK-055 (restructuring follow-up) — Move backend to apps/api

### Scope

Per user request during TASK-055 review (see ADR-023), moved the NestJS backend from the repo
root to `apps/api/`, a peer of `apps/web/`, to fix the structural asymmetry of a frontend nested
inside what was the backend's own root. `git mv` used throughout to preserve file history for
tracked files (`src/`, `prisma/`, `test/`, `knowledge-sources/`, `package.json`,
`package-lock.json`, `tsconfig*.json`, `nest-cli.json`, `Dockerfile`, `.eslintrc.js`,
`.prettierrc`, `.env.example`, `.dockerignore`, `scripts/check-postgres-persistence.*`,
`scripts/register-knowledge-sources.ts`); untracked dirs (`node_modules`, `dist`, `coverage`,
`storage`, `.env`) moved with plain `mv`. Root `package.json` reduced to a minimal
husky+lint-staged-only config; `docker-compose.yml`, `.github/workflows/ci.yml`,
`.claude/settings.json`+hook scripts, `CLAUDE.md`, `README.md` all updated for the new paths.

### Commands

```bash
# after git mv / mv of all backend files+dirs into apps/api/
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
npm run build
npm run test:e2e          # against already-running docker compose postgres+redis
cd ../..
docker compose config      # verify build context + env substitution
npm install                 # root: husky + lint-staged
npx lint-staged             # verify pre-commit pipeline against real staged (moved) files
cd apps/api && npm run start:dev   # manual smoke test
cd apps/web && npm run dev          # manual smoke test
```

### Result

PASS

### Evidence

- `apps/api`: `npx tsc --noEmit` clean; `npm run lint` clean; `npm run test` — 59/59 suites,
  637/637 tests pass (unchanged from pre-move baseline); `npm run test:e2e` — 3/3 suites, 4/4
  tests pass; `npm run build` clean.
- `docker compose config` (from repo root) resolved with no blank-variable warnings, correct
  `build.context: apps/api`, correct `env_file`.
- Root `npx lint-staged` ran against the real staged files from the `git mv` (43 backend `.ts`
  files matched `apps/api/{src,libs,test}/**/*.ts`) — both `eslint --fix` and `prettier --write`
  completed successfully via the app-local binary paths, confirming the new root lint-staged
  config resolves correctly regardless of invocation cwd.
- Manual smoke test: real backend (`cd apps/api && npm run start:dev`, port 3000) —
  `curl http://localhost:3000/health` returned `{"status":"ok"}`. Real frontend
  (`cd apps/web && npm run dev`, port 3001) — page rendered "Backend status: ok", confirming the
  full stack still works end-to-end from the new locations. Both dev servers stopped after
  verification.

### Follow-up

- None — TASK-056 (workspace creation UI) remains the next planned `apps/web` task.

## 2026-07-17 — TASK-055 (Docker follow-up) — Dockerize apps/web, add to docker-compose

### Scope

Per user request (ADR-024), added `apps/web/Dockerfile` (3-stage, Next.js `output: "standalone"`)
and a `web` service to `docker-compose.yml` (`depends_on: app`, `${WEB_PORT:-3001}:3000`). Found
and fixed a real bug during verification: the Next.js standalone server bound to the container's
own network IP instead of `0.0.0.0`, because it honors Docker's auto-set `$HOSTNAME` — fixed with
an explicit `ENV HOSTNAME="0.0.0.0"` in the Dockerfile's runner stage.

### Commands

```bash
docker compose config                    # verify web service resolves correctly
docker compose build web
docker compose up -d web                  # also starts/reuses app, postgres
docker compose ps
docker exec jobflow_web sh -c "curl -v http://localhost:3000/"   # in-container reachability
curl http://localhost:3001                # host reachability
docker compose stop app web               # teardown (postgres/redis left running, pre-existing)
```

### Result

PASS (after one fix — see Scope)

### Evidence

- First build/run attempt: `docker compose ps` showed `jobflow_web` stuck at
  `health: starting` → `unhealthy`. `docker exec jobflow_web sh -c "netstat -tlnp"` showed
  `next-server` listening on `172.20.0.5:3000`, not `0.0.0.0:3000` — explaining why the
  in-container `HEALTHCHECK` (`curl http://localhost:3000/`) failed with connection refused, even
  though the host could still reach it via `http://localhost:3001` (Docker NAT routes the
  published port straight to the container's IP:port, independent of what interface the process
  bound to).
- After adding `ENV HOSTNAME="0.0.0.0"` and rebuilding: `docker compose ps` shows `jobflow_web` as
  `Up ... (healthy)`. `docker exec jobflow_web sh -c "curl -sf http://localhost:3000/"` succeeds.
  `curl http://localhost:3001` (host) still renders "Backend status: ok" — confirms the
  containerized frontend successfully reaches the containerized backend at `http://app:3000` over
  the Docker network, with `NEXT_PUBLIC_API_BASE_URL` correctly baked in at build time via the new
  `docker-compose.yml` `build.args`.
- `docker compose config` resolves the `web` service correctly (`build.args`, port mapping,
  `depends_on: app`) with no warnings.
- Containers stopped after verification (`docker compose stop app web`); `postgres`/`redis` left
  running as they were before this check (pre-existing, unrelated).

### Follow-up

- None.

## 2026-07-17 — TASK-056 — Implement workspace creation UI

### Scope

`apps/web/src/app/workspaces/new/` (page/form/Server Action), `apps/web/src/lib/slug.ts` (client
slug preview), `apps/web/src/lib/api.ts` `createWorkspace()`. Verified `apps/web` build tooling
clean and a real end-to-end workspace creation through the UI against a real backend.

### Commands

```bash
cd apps/web && npm run lint
cd apps/web && npx tsc --noEmit
cd apps/web && npm run build
```

### Result

PASS (after one environment fix — see Evidence)

### Evidence

- `npm run lint` / `npx tsc --noEmit` / `npm run build` all clean; `next build` output shows
  `/workspaces/new` compiled as a dynamic (server-rendered) route.
- First manual attempt used the already-running containerized backend (`jobflow_app`, Docker) and
  failed with "Internal server error" in the form. `docker logs jobflow_app` showed
  `EACCES: permission denied, mkdir '/app/d:'` — a pre-existing environment issue, not a bug in
  this task's code: `apps/api/.env`'s `STORAGE_ROOT` is a Windows host path
  (`d:/projects_js/...`), which is only valid when running the backend natively, not inside the
  Linux container (the container's own `.env` handling for this variable was never exercised by a
  create-workspace call before this task). Fixed for the test by stopping the container
  (`docker compose stop app`, non-destructive) and running the backend locally
  (`cd apps/api && npm run start:dev`) so `STORAGE_ROOT` resolved correctly against the real
  Windows filesystem.
- Second attempt (user, real browser, `http://localhost:3002/workspaces/new` frontend dev server +
  local `http://localhost:3000` backend): submitted company "www", role "dev", a vacancy text
  body, and an optional source URL. Form showed the success panel — "Workspace created — status:
  source_saved", workspace slug `2026_07_17_www_dev`, folder path and vacancy source path
  displayed, matching the client-side slug preview exactly.
- Backend log confirmed `POST /workspaces` → `201`, response time 126ms.
- Filesystem: `storage/applications/2026_07_17_www_dev/00_vacancy_source.txt` created with the
  submitted vacancy text.
- Database: `ApplicationWorkspace` (`status: source_saved`, `createdFrom: manual`), `Company`
  (`nameOriginal: www`, `companySlug: www`), `JobVacancy` (`roleTitleOriginal: dev`,
  `roleSlug: dev`, `sourceUrl` populated) all created correctly and linked.
- Test data cleaned up after verification: DB rows deleted (`GeneratedArtifact` →
  `ApplicationWorkspace` → `JobVacancy` → `Company`), test folder removed from
  `storage/applications/`.
- Environment restored: local `npm run start:dev` backend stopped, leftover `node` process on port
  3000 killed, `docker compose start app` — `jobflow_app` back to `(healthy)`, matching
  pre-test state.

### Follow-up

- None. The `STORAGE_ROOT` Windows-path-in-container mismatch only affects manual testing that
  drives `POST /workspaces` against the Docker container directly on this Windows host; it does
  not affect the app's actual behavior in a real Linux deployment (where `STORAGE_ROOT` would be
  set to a Linux path) and is out of scope for this task.

## 2026-07-18 — TASK-PH-023 — Remediate PostCSS XSS Dependabot alert + re-triage stale CodeQL alerts

### Scope

GitHub Dependabot alert #23 (`PostCSS has XSS via Unescaped </style> in its CSS Stringify
Output`, Moderate, `apps/web/package-lock.json`, vulnerable `< 8.5.10`) — discovered after
TASK-056 merged and this was the first Dependabot scan of `apps/web`'s lock file. Also re-triaged
6 GitHub code-scanning (CodeQL) alerts (#8-13, all High) discovered at the same time, which turned
out to be re-detections of already-dismissed findings (see Evidence).

### Commands

```bash
cd apps/web && npm install   # after adding "overrides": { "postcss": "^8.5.10" }
cd apps/web && npm run lint
cd apps/web && npx tsc --noEmit
cd apps/web && npm run build
```

### Result

PASS

### Evidence

- Root cause: `apps/web`'s only direct devDependency naming postcss is
  `@tailwindcss/postcss` (`^4`), which resolves a top-level `postcss@8.5.19` (already patched).
  The vulnerable copy was `next`'s own nested `node_modules/next/node_modules/postcss@8.4.31`
  (Next.js 16.2.10 bundles its own older postcss internally).
- Added `"overrides": { "postcss": "^8.5.10" }` to `apps/web/package.json`, mirroring the
  `apps/api` `overrides` pattern from TASK-PH-013. After `npm install`: only one `postcss`
  resolves in the entire tree (`node_modules/postcss@8.5.19`); `npm install` reports
  `found 0 vulnerabilities`.
- `apps/web` `npm run lint` / `npx tsc --noEmit` / `npm run build` all clean after the override
  (no behavior change expected — pure transitive dependency bump).
- Separately (same session, not a code change): `gh api .../security/code-scanning/alerts` showed
  6 open High-severity CodeQL alerts (#8-13: 2× `js/polynomial-redos` in `slug.service.ts`, 4×
  `js/path-injection` in `artifact-storage.service.ts`/`import.service.ts`). Cross-checked against
  6 already-dismissed alerts (#1-4, #6-7) at the old `src/...` path — identical file/line/rule for
  each. Confirmed these are the same TASK-PH-014/TASK-046/TASK-047-triaged findings re-detected as
  "new" purely because CodeQL treats file path as part of alert identity, and ADR-023's `git mv`
  from `src/` to `apps/api/src/` did not carry dismissals forward. Re-dismissed all 6 via
  `gh api -X PATCH .../code-scanning/alerts/{n}` with the same reasons (2× `won't fix`, 4×
  `false positive`) and a comment referencing the original alert number + ADR-023. No source code
  changed for these — confirmed by re-reading the same guarded call sites
  (`assertInsideStorageRoot()`/`assertInsideImportRoot()`) already in place. Verified:
  `gh api .../code-scanning/alerts -q '[.[] | select(.state=="open")] | length'` → `0`.
- Confirmed why the original 6 alerts didn't block PR #107: branch protection's required status
  check `Analyze (javascript-typescript)` (the CodeQL Action job) reports success based on the
  workflow step completing, not on the SARIF results containing zero findings — `gh pr checks 107`
  showed it `pass`ed even with alerts present. This is expected GitHub behavior (findings surface
  in the Security tab for manual triage; they don't fail the job by default), not a
  misconfiguration to fix in this task.

### Follow-up

- None.

## 2026-07-18 — TASK-PH-024 — Block merges on high+ severity CodeQL/Dependabot alerts

### Scope

Follow-up to TASK-PH-023 — user asked how to configure CI so open security alerts actually block
merges, since it turned out the plain `Analyze (javascript-typescript)`/CodeQL status check only
reports whether the job ran, not whether it found anything. Adds (1) a native GitHub Ruleset
requiring CodeQL results at `high_or_higher` severity, and (2) a custom `Dependabot Severity Gate`
CI job (no native ruleset equivalent exists for Dependabot alerts), both required for merging to
`main`.

### Commands

```bash
gh api -X POST repos/strakhovdenya/jobflow-cv-pipeline/rulesets --input ruleset.json
gh api -X PATCH repos/strakhovdenya/jobflow-cv-pipeline/branches/main/protection/required_status_checks ...
gh pr checks 109
gh run rerun <run-id> --failed
gh api repos/strakhovdenya/jobflow-cv-pipeline/actions/jobs/<job-id>/logs
```

### Result

PASS (after one real blocker found and fixed — see Evidence)

### Evidence

- Created GitHub Ruleset `require-codeql-high-or-higher` (branch target `main`, rule type
  `code_scanning`, `security_alerts_threshold: high_or_higher`, `alerts_threshold: none` so only
  security-rated findings gate, not generic code-quality ones). `enforcement: active`, verified via
  `gh api .../rulesets/<id>`.
- First implementation of the `Dependabot Severity Gate` CI job used `GITHUB_TOKEN` with
  `permissions: security-events: read`. Real CI run on PR #109 failed in 4s: `gh: Resource not
  accessible by integration (HTTP 403)`. Confirmed via job logs that `GITHUB_TOKEN` cannot read
  the Dependabot Alerts API regardless of the `permissions:` block — this endpoint requires a PAT
  (classic `security_events` scope, or fine-grained "Dependabot alerts: Read-only").
  Immediately removed the job from required status checks (`required_status_checks` PATCH) to
  avoid permanently blocking all future merges on a gate that could never pass.
  User created a fine-grained PAT scoped to this repo only, "Dependabot alerts: Read-only", added
  as repo secret `DEPENDABOT_ALERTS_TOKEN` (token value never shared in chat — added directly by
  the user via `gh secret set`/GitHub UI). Workflow updated to read `GH_TOKEN:
  ${{ secrets.DEPENDABOT_ALERTS_TOKEN }}` instead.
- Re-ran the previously-failed job (`gh run rerun <id> --failed`) after the secret was added:
  `Dependabot Severity Gate` passed in 2s. Verified via raw job logs
  (`gh api .../actions/jobs/<id>/logs`) that it genuinely queried the API and got a real answer
  (`Open high/critical Dependabot alerts: 0`), not a silently-skipped step.
- Re-added `Dependabot Severity Gate` to `required_status_checks` after verifying it works.
- `gh pr checks 109` — all 9 checks pass, including `CodeQL`, `Analyze (javascript-typescript)`,
  and `Dependabot Severity Gate`.

### Follow-up

- None. If a future high/critical Dependabot or CodeQL alert is a genuine false positive/won't-fix
  (as happened in TASK-PH-014/023), it must be dismissed on GitHub with a recorded justification —
  the new gates will otherwise correctly block merges until it is triaged.

## 2026-07-18 — TASK-062 — Add unit/component test runner and coverage to apps/web

### Scope

`apps/web` had no test runner at all — TASK-055/056/057 were verified by manual smoke test only.
Adds Vitest + React Testing Library as `apps/web`'s own independent test stack (separate
devDependencies from `apps/api`'s Jest setup), unit tests for `src/lib/slug.ts` (mirroring the
scope of `apps/api`'s `slug.service.spec.ts` per ADR-013), a component test for the workspace
creation form (`workspace-form.spec.tsx`), a new `web-test` CI job, and a measured coverage floor
(ADR-022 method).

### Commands

```bash
cd apps/web
npx vitest run
npx vitest run --coverage
npm run lint
npx tsc --noEmit
npm run build
```

### Result

PASS — 31/31 tests (2 suites), lint clean, typecheck clean, build clean.

### Evidence

- `src/lib/slug.spec.ts` — 26 tests covering `normalizeCompanySlug`, `normalizeRoleSlug` (same
  cases as `apps/api/src/common/slug/slug.service.spec.ts`) and `previewWorkspaceSlug`.
- `src/app/workspaces/new/workspace-form.spec.tsx` — 5 tests covering slug preview updates,
  required-field validation, successful submission (mocked `createWorkspaceAction`) rendering the
  success state with a working "View workspace" link, and server-returned validation errors
  rendering in the error list.
- Found and fixed a real gap during setup: React Testing Library does not auto-cleanup between
  tests under Vitest (unlike Jest), causing `getByRole` to fail with "multiple elements found"
  once a second test file rendered the same component — fixed by calling `cleanup()` in
  `afterEach` inside `vitest-setup.ts`.
- Measured coverage baseline for all of `apps/web/src` (2026-07-18, first-ever `apps/web` test
  suite): statements 20.88%, branches 16.47%, functions 18.96%, lines 21.56% — most of the app
  (`lib/api.ts`, the two workspace review-gate components, all pages) has no tests yet, which is
  expected since this task's AC only requires `slug.ts` + the creation-form component. Threshold
  in `vitest.config.ts` set a small margin below the measured number (statements 20 / branches 15
  / functions 18 / lines 20) as a regression floor, not a target — same method as `apps/api`'s
  `coverageThreshold` (ADR-022). Will rise as future tasks add coverage for the untested files.
- New `web-test` CI job added to `.github/workflows/ci.yml` (`working-directory: apps/web`,
  `npm ci` + `npm run test:cov`), matching the existing `apps/api` job pattern (ADR-023). No
  Postgres service needed — `apps/web` has no DB dependency.
- `coverage/**` added to `apps/web/eslint.config.mjs` `globalIgnores` — `npm run lint` was
  reporting a stray warning from the generated `coverage/block-navigation.js` before this fix
  (`coverage/` was already gitignored but not eslint-ignored, since `globalIgnores` overrides
  eslint-config-next's defaults rather than extending them).

### Follow-up

- None for this task. `apps/web/src/lib/api.ts` and the two review-gate components remain
  untested — candidates for a future coverage-expansion task, not blocking here since they were
  not part of this task's acceptance criteria.

## 2026-07-18 — TASK-059 — Add integration tests for database persistence assumptions

### Scope

The persistence-verification script and README docs (`ADR-007`/`TASK-005`, 2026-06-28) already
existed and had already been run once with a PASS result — but `ADR-023`'s later move of the
backend into `apps/api/` broke both README references to it: the checklist link pointed at
`scripts/check-postgres-persistence.md` (now `apps/api/scripts/check-postgres-persistence.md`),
and `npm run db:check-persistence` (only defined in `apps/api/package.json`, not the root
`package.json`) would fail if run as literally written from the repo root. This task fixes both
stale references and re-verifies the script still works post-restructuring. No new automated
Jest/e2e spec was added — the scenario requires driving `docker compose down`/`up` from outside
the test process, which Jest/Vitest can't do natively, and the backlog's AC explicitly allows
"documented/manual or automated"; the existing shell-script approach is the right tool here (this
was discussed and agreed with the user before implementation).

### Commands

```bash
cd apps/api
bash scripts/check-postgres-persistence.sh
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv -c "\dt"
```

### Result

PASS

### Evidence

- Re-ran `apps/api/scripts/check-postgres-persistence.sh` for real (not just documentation review)
  after the README fix, invoked exactly as the corrected README instructs (`cd apps/api && npm run
  db:check-persistence` — verified equivalently via the underlying `bash scripts/...` call).
  Confirmed `docker compose` correctly locates the root-level `docker-compose.yml` even when
  invoked from `apps/api/` — Docker Compose v2 searches parent directories for the compose file,
  same as `git` does for `.git`, so no path fix was needed in the script itself, only in the
  README's prose/links.
  - Row inserted, `docker compose down` (no `-v`) removed the container only, `docker compose up
    -d postgres` restarted it, row still present after restart.
  - Final script output: `RESULT: PASS — data survived docker compose down + up`.
  - Confirmed the test table (`_persist_check`) was dropped cleanly at the end — `\dt` shows no
    leftover table.
- Fixed `README.md`: checklist link now points to
  `apps/api/scripts/check-postgres-persistence.md`; `npm run db:check-persistence` instruction now
  prefixed with `cd apps/api` to match where the script actually lives.

### Follow-up

- None. If `apps/api/` moves again or the persistence script changes, re-check these two README
  references at the same time — this is exactly the kind of doc drift ADR-023's move already
  caused once.

## 2026-07-18 — TASK-060 — Add README portfolio documentation

### Scope

Reviewed `README.md` against the four ACs (backend-first architecture explanation, MVP flow,
AI-usage-tracking/artifact-storage/PostgreSQL-metadata explanation, personal-project disclaimer).
The first, second and fourth were already well covered. Added a new "Data & Artifact Model"
section for the third. While verifying the "AI usage tracking" claim against the real code (not
just docs), found the "Project status" table understated three already-implemented features as
"In progress" — fixed all three for portfolio honesty (the task's explicit done-definition).

### Commands

```bash
grep -rln "AiUsageTrackingService\|AiRunsService" apps/api/src --include="*.ts"
find apps/api/src/evidence -type f
grep -n "@Post" apps/api/src/document-export/document-export.controller.ts
```

### Result

PASS (manual review)

### Evidence

- **Token/cost tracking** — confirmed `AiRunsService.saveSuccess()` (`apps/api/src/ai-runs/
  ai-runs.service.ts`) writes `inputTokens`/`outputTokens`/`totalTokens`/`cachedInputTokens`/
  `reasoningTokens`/`costEstimate`/`usageRawJson` to the `AiRun` table, called from all five
  pipeline services (`prompt1`, `prompt2`, `prompt3`, `prompt5`, `cover-letter`). Was listed
  "In progress" in the README table — corrected to "Implemented".
- **Evidence Guard** — confirmed `EvidenceGuardService.checkOutput()` (`apps/api/src/evidence/
  evidence-guard.service.ts`) runs 17 regex-based critical-claim patterns (blocking commercial
  AI/NestJS/Kubernetes/AWS/etc. production claims not backed by evidence) plus a `needs_evidence`
  collector, wired into `prompt2.service.ts`, with a full spec file. Was listed "In progress" —
  corrected to "Implemented / evolving".
- **Deterministic HTML/PDF export** — confirmed a real `POST /workspaces/:id/export-cv` endpoint
  (`apps/api/src/document-export/document-export.controller.ts`) backed by
  `html-renderer.service.ts` + `pdf-export.service.ts`. Was listed "In progress" — corrected to
  "Implemented".
- Added "Data & Artifact Model" README section explaining the PostgreSQL metadata chain
  (`Company → JobVacancy → ApplicationWorkspace → PromptRun → AiRun` + `GeneratedArtifact`
  registry), filesystem canonical artifact naming, and the `AiRun` token/cost fields — linking to
  `docs/04_architecture.md` for full depth rather than duplicating it.
- Manual review of all added/changed README text against CLAUDE.md's Anti-Overclaiming Rules: no
  new text claims commercial production experience, presents Docker/NestJS/AI work as commercial
  core skills, or uses inflated language ("production-ready", "enterprise-grade", etc.) — all
  additions are factual architecture descriptions verified against the real code, not aspirational
  claims.

### Follow-up

- None. TASK-061 (architecture diagram) is a separate, already-planned follow-up task.

## 2026-07-18 — TASK-061 — Add architecture diagram or Mermaid flow

### Scope

The existing README Mermaid diagram ("High-level architecture") was a pipeline/data-flow view
(Vacancy Source → Prompt Pipeline → ... → PDF Export) — it didn't show the actual system
components the AC asks for: no explicit NestJS API node, no Redis, no Next.js. Both are already
real (not "later placeholders"): Redis/BullMQ backs the async Prompt 1 analysis queue
(`apps/api/src/queue/`), and `apps/web` is a real Next.js app (ADR-023/024). Added a new "System
architecture" Mermaid diagram showing Next.js Dashboard → NestJS API → {PostgreSQL, Redis/BullMQ
queue, Filesystem Artifact Storage, AI Provider (OpenAI/Fake)}, with Prompt Pipeline and Document
Export as internal API components. Renamed the old diagram's heading to "Pipeline flow" (kept as
a complementary business-flow view, not removed) — verified no README/docs anchor links pointed at
the old `#high-level-architecture` heading before renaming.

### Commands

```bash
grep -n "class.*Provider" apps/api/src/ai/providers/*.ts
grep -n "^  app:\|^  web:\|^  postgres:\|^  redis:" docker-compose.yml
grep -rn "high-level-architecture" README.md docs/
```

### Result

PASS (manual rendering check)

### Evidence

- Confirmed component names against real code before drawing the diagram: `OpenAiProvider` /
  `FakeAiProvider` (`apps/api/src/ai/providers/`), `docker-compose.yml` services
  (`app`/`web`/`postgres`/`redis`), `apps/api/src/queue/` (BullMQ queue + `analysis.worker.ts`).
- No existing anchor links referenced `#high-level-architecture` (checked via grep across
  `README.md` and `docs/`) — safe to rename without breaking links.
- Rendered both Mermaid diagrams via a Claude Artifact preview
  (https://claude.ai/code/artifact/ef527abe-d0eb-4e04-8372-f991cd4c5c2b) before committing — both
  the new "System architecture" flowchart and the renamed "Pipeline flow" flowchart render
  correctly with no syntax errors.
- Added an explicit caption above the new diagram ("Local Docker Compose services ... no cloud
  deployment exists or is planned") linking to the "Production deployment: Not planned" row in the
  Project status table — satisfies AC2 (diagram must not imply cloud production deployment).
- No changes made to `docs/04_architecture.md` or `docs/assets/**` — those were listed as "likely
  affected" in the backlog, not required; Mermaid in `README.md` fully covers the AC, consistent
  with TASK-060's link-out-rather-than-duplicate approach.

### Follow-up

- None.

## 2026-07-19 — TASK-064 — Add artifact content viewer and generic download links

### Scope

The workspace detail page's artifact table showed type/filename/version/latest as plain text with
no way to read or download the actual file. `apps/api`'s `GET /artifacts/:id/download` and
`GET /workspaces/:id/artifacts` already existed — `apps/web`-only change. Discovered during
investigation: every backend endpoint (including download) sits behind the global `ApiKeyGuard`
(`X-API-Key`), and in Docker the backend is only reachable from the browser via an internal
hostname — so a plain `<a href>` straight at the backend can't work for either downloading or
inline viewing. Added a same-origin Next.js Route Handler proxy
(`apps/web/src/app/api/artifacts/[id]/download/route.ts`) that attaches `X-API-Key` server-side
and streams the backend's response (same `Content-Type`/`Content-Disposition`) back to the
browser; both the download link and the inline viewer's `fetch()` point at this one route. New
`apps/web/src/app/workspaces/[id]/artifact-viewer.tsx` (client component) renders a Download link
plus a View toggle (text/markdown/json only) per artifact row, replacing the inline table in
`page.tsx`.

Found a second, pre-existing bug during manual smoke testing (out of this task's `apps/web`-only
scope, not fixed here): `apps/api/src/workspaces/workspaces.service.ts`'s `vacancy_source`
artifact registration (lines 96–104) omits `mimeType`/`downloadFileName`, so `00_vacancy_
source.txt`'s artifact came back from the API with `mimeType: null`. Since the AC requires this
artifact to render inline, the frontend's `isTextRenderable()` was made resilient with a
`canonicalFileName` extension fallback (`.txt`/`.md`/`.json`) instead of trusting `mimeType`
alone — keeps the fix entirely within `apps/web`. Download was unaffected either way: the
backend's `Content-Disposition` already falls back to `canonicalFileName` when `downloadFileName`
is null. Logged as a new Known Gap in `TASK_BOARD.md` for a future backend fix (resolved same day
by TASK-064A below).

### Commands

```bash
cd apps/web
npx tsc --noEmit
npm run lint
npm run test -- --run
npm run build
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test -- --run` 44/44
  passed (5 new tests in `artifact-viewer.spec.tsx`: empty state, download link href, inline
  view fetch+render, PDF has no View button, fetch-failure error state, plus the
  mimeType-null-fallback case), `npm run build` clean — new route
  `ƒ /api/artifacts/[id]/download` listed alongside existing routes.
- Manual smoke test against a real backend (`apps/api` dev server, `AI_PROVIDER=fake`,
  `apps/web` dev server on port 3001): created a workspace via `POST /workspaces`, ran
  `POST :id/run-analysis` to produce `01_vacancy_analysis.md/json`, then fetched the rendered
  `GET /workspaces/:id` page — confirmed all 3 artifacts (`vacancy_source`,
  `vacancy_analysis_md`, `vacancy_analysis_json`) show a "View" button and a download link
  pointing at `/api/artifacts/{id}/download`.
- Verified the proxy route directly: `curl http://localhost:3001/api/artifacts/{id}/download`
  returned the real vacancy-source text content with `content-type: text/plain; charset=utf-8`
  and `content-disposition: attachment; filename="00_vacancy_source.txt"` (correct fallback
  filename despite the artifact's `downloadFileName` being null in the DB); the JSON artifact
  returned `content-type: application/json` with the correct filename; a nonexistent artifact id
  correctly returned `404` through the proxy.
- Smoke-test workspace left in the local dev database (no delete endpoint exists — consistent
  with TASK-057/059/063's precedent).

### Follow-up

- New Known Gap logged in `TASK_BOARD.md`: `workspaces.service.ts`'s `vacancy_source` artifact
  registration is missing `mimeType`/`downloadFileName` — not fixed here since TASK-064 was
  scoped `apps/web`-only; worked around in the frontend viewer for now. Resolved same day by
  TASK-064A below.

## 2026-07-19 — TASK-064A — Fix missing mimeType on vacancy_source artifact registration

### Scope

Discovered during TASK-064's manual smoke test (above): `apps/api/src/workspaces/workspaces.service.ts`'s
`createWorkspace()` registers the `vacancy_source` artifact (`00_vacancy_source.txt`) without a
`mimeType`, unlike every other artifact-registration call site in the codebase — including
`import.service.ts`'s registration of the exact same artifact type for legacy-imported
workspaces, which does pass `mimeType: LEGACY_ARTIFACT_MIME_TYPES[LegacyArtifactType.vacancy_source]`
(`'text/plain'`). Fixed by adding the same literal `mimeType: 'text/plain'` to the `register()`
call in `workspaces.service.ts` (lines 96–105).

`downloadFileName` was deliberately left untouched (still null): checked every other
`artifactsService.register()` call site across the codebase (Prompt 1/2/3/5 services, cover
letter, rejections) — only the PDF export artifact and the skip-reason artifacts set
`downloadFileName`; every other artifact type, including `vacancy_source` even in
`import.service.ts`, leaves it null and relies on `artifacts.controller.ts`'s existing fallback
to `canonicalFileName`. Setting it here would have been scope creep beyond the actual bug.

### Commands

```bash
cd apps/api
npx jest workspaces.service.spec.ts
npx tsc --noEmit
npm run lint
npm run test
npm run test:e2e
```

### Result

PASS

### Evidence

- New test in `workspaces.service.spec.ts` ("registers the vacancy_source artifact with mimeType
  text/plain") directly asserts `artifactsService.register` is called with
  `expect.objectContaining({ artifactType: 'vacancy_source', mimeType: 'text/plain' })` — this is
  the first direct unit test of `createWorkspace()`'s artifact-registration call at all (previously
  only exercised indirectly via e2e).
- Full suite: 59/59 suites, 639/639 tests (was 638 before this task's one new test).
  `npx tsc --noEmit` clean. `npm run lint` clean (Prettier reformatted the touched spec file only).
  `npm run test:e2e`: 3/3 suites, 4/4 tests pass (pre-existing `ECONNREFUSED :6379` warning is the
  documented TASK-054 "REDIS_URL not configured" no-op path, unrelated to this change).
- Manually verified against a real backend (`apps/api` dev server in watch mode, picked up the
  change automatically): created a fresh workspace via `POST /workspaces`, then `GET
  /workspaces/:id` returned `"mimeType":"text/plain"` for the `vacancy_source` artifact (was
  `"mimeType":null` before the fix, confirmed against an earlier workspace created during TASK-064's
  own smoke test).

### Follow-up

- None.

## 2026-07-20 — TASK-065 — Add async/queued analysis trigger with job-status polling to workspace detail UI

### Scope

New `apps/web/src/app/workspaces/[id]/async-analysis-trigger.tsx` client component — an
alternative to `pipeline-actions.tsx`'s synchronous "Start analysis" button — that calls
`POST :id/run-analysis-async` (enqueue) then polls `GET :id/analysis-job/:jobId` every 2s until
a terminal BullMQ state (`completed`/`failed`), showing intermediate states (`waiting`/`delayed`
→ "Queued", `active` → "Running…") along the way. Self-contained polling state via
`useState`/`useEffect`/`useRef` (interval ref cleared on unmount and on reaching a terminal
state — no page-level state dependency, no indefinite polling). New `lib/api.ts` functions
`runAnalysisAsync`/`getAnalysisJobStatus` and `actions.ts` Server Actions
`runAnalysisAsyncAction`/`getAnalysisJobStatusAction`, following the exact pattern already
established by `runAnalysisAction` et al. If the enqueue call itself fails (e.g. `REDIS_URL` not
configured — `QueueService.getQueue()` throws synchronously via `configService.getOrThrow`), the
component shows the error immediately and never starts polling — verified this is the actual
backend behavior by reading `queue.service.ts`, not assumed.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 49/49 passed (5 test files, 5 new in async-analysis-trigger.spec.tsx)
npm run build

# apps/api (real backend, fake AI provider), real Redis
docker compose up -d redis   # postgres already running from a prior session
cd apps/api && npm run start:dev

# manual flow: real backend + curl, plus fetching the already-running apps/web dev server's
# rendered HTML (same "curl + browser HTML fetch" methodology as TASK-063/TASK-064)
curl -X POST http://localhost:3000/workspaces -d '{...}'                      # create workspace 1
curl -X POST http://localhost:3000/workspaces/:id1/run-analysis-async         # -> {"jobId":"1"}
curl http://localhost:3000/workspaces/:id1/analysis-job/1                     # -> state: completed, returnValue.decision

curl -X POST http://localhost:3000/workspaces ...                             # create workspace 2
curl http://localhost:3001/workspaces/:id2 | grep 'Start analysis (async)'    # button renders server-side
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 49/49 passed (5 new:
  not rendered outside `source_saved`; full `waiting`→`active`→`completed` poll sequence with
  `router.refresh()` and interval stopping; `failed` terminal state stops polling and shows
  `failedReason`; enqueue failure shows an error with zero `getAnalysisJobStatusAction` calls;
  interval is cleared on unmount). `npm run build` clean (`/workspaces/[id]` route compiles).
- Real backend + real Redis (`docker compose up -d redis`, fake AI provider): enqueuing via
  `POST :id/run-analysis-async` against a fresh `source_saved` workspace returned `{"jobId":"1"}`;
  polling `GET :id/analysis-job/1` returned `state: "completed"` with `returnValue.decision:
  "apply"`, `returnValue.workspaceStatus: "paused_after_analysis"` — matches
  `AnalysisJobStatus`/`RunAnalysisResult` typed exactly as declared in `lib/api.ts`.
- Confirmed the new "Start analysis (async)" button server-renders correctly against the real,
  already-running `apps/web` dev server (port 3001) for a fresh `source_saved` workspace fetched
  from the real backend.
- Did not exercise the no-`REDIS_URL` error path live (would have required restarting the backend
  without Redis mid-session); relied on reading `queue.service.ts`'s `getOrThrow('REDIS_URL')` and
  the dedicated unit test covering the enqueue-failure branch instead.
- Full interactive browser click-through (actually clicking the button and watching it transition
  through Queued/Running/Completed in real time) was not performed — no browser automation tool
  was available in this environment. Coverage instead comes from: (1) the component's unit tests
  exercising the exact same polling state machine with mocked actions, and (2) confirming the real
  backend responses those actions wrap match the types the component consumes.

### Follow-up

- Consider a future task exercising the no-`REDIS_URL` path with real browser automation once a
  browser tool is available, plus verifying the intermediate "Queued"/"Running…" labels visually.

## 2026-07-20 — TASK-065A — Fix async-analysis-trigger review findings

### Scope

A code review of TASK-065 (still-open PR #124) found 8 findings; this task fixes 7 of them
(1 explicitly not fixed, see below) before the PR merges. Same branch/PR as TASK-065 (`main`
doesn't contain the code being fixed yet, so a new branch would have nothing to branch from).

**Rewrote `async-analysis-trigger.tsx`'s polling mechanism:**
- Flattened `TriggerState` (a 6-variant discriminated union bundling `jobId`) into separate
  `useState` fields (`phase`, `jobId`, `jobState`, `result`, `errorMessage`) — the polling
  `useEffect`'s dependency array is now the plain `jobId`/`workspaceId` state, no ternary, no
  `eslint-disable` for `exhaustive-deps` (fixes finding 5).
- Replaced `setInterval` + `useRef` + two separate `useEffect`s with one effect using recursive
  `setTimeout` gated by a `cancelled` closure flag — the next poll is only scheduled after the
  current one resolves, so a slow response can no longer resolve out of order and regress a
  terminal state back to "polling" (fixes finding 3); one cleanup path instead of two redundant
  ones (fixes finding 6).
- Added `MAX_POLL_ATTEMPTS = 300` (10 minutes at 2s intervals) — polling now stops with a clear
  "still running after 10 minutes" message instead of continuing forever if a job never reaches
  `completed`/`failed` (fixes finding 4).
- Changed the early-return guard from `status !== "source_saved"` to
  `status !== "source_saved" && phase === "idle"` — once the trigger has actually been used, it
  keeps rendering its own result regardless of how the `status` prop changes afterward. Previously
  `router.refresh()` (called on completion) immediately re-rendered the page with the new status,
  hiding the whole component — including the "Analysis completed" banner it had just shown — for
  effectively 0 visible frames (fixes finding 1, verified with a dedicated `rerender()` test).
- `start()` now fires the first poll immediately after a successful enqueue instead of waiting up
  to 2s for the first tick, so the button reflects the real job state right away instead of a
  hardcoded "Queued" (fixes finding 7).
- Used the React "latest ref" pattern (`routerRef`/`onBusyChangeRef`, updated in a plain
  `useEffect` after each render, per React's "cannot write a ref during render" rule) so the
  polling effect's dependency array doesn't have to include `router`/`onBusyChange` — both are
  effectively-unstable references across renders (confirmed via the test mock, which creates a new
  router object on every `useRouter()` call) that would otherwise restart polling on unrelated
  re-renders.

**New shared lock between the two "start analysis" triggers (fixes finding 2):** new
`apps/web/src/app/workspaces/[id]/analysis-triggers.tsx` — a thin client wrapper holding a single
`analysisLocked` state, rendering both `<PipelineActions>` and `<AsyncAnalysisTrigger>` and passing
the lock + a busy-change callback to each. `pipeline-actions.tsx` gained `analysisLocked`/
`onAnalysisBusyChange` props (excludes `"start_analysis"` from its actions list while locked,
toggles the callback around its own sync call). `async-analysis-trigger.tsx` gained `locked`/
`onBusyChange` props (hides the button while locked and never started; toggles the callback across
its *entire* enqueue-to-terminal lifecycle, not just the enqueue call, so the sync button stays
hidden for as long as an async job could still be running). `page.tsx` now renders
`<AnalysisTriggers>` in place of the two components directly.

**Not fixed — finding 8 (`buttonClass` duplication):** checked all four components in this
directory; each already defines its own local `buttonClass` constant — an existing, repo-wide
convention in this directory, not something TASK-065 introduced. Fixing it here alone would be
inconsistent scope creep beyond this review-fix task.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 58/58 passed (6 test files; 4 new in async-analysis-trigger.spec.tsx,
                       # 2 new in pipeline-actions.spec.tsx, 2 new in new analysis-triggers.spec.tsx)
npm run build

# real backend + real Redis (already running from TASK-065's own verification)
curl -X POST http://localhost:3000/workspaces -d '{...}'                    # fresh workspace
curl -X POST http://localhost:3000/workspaces/:id/run-analysis-async        # -> {"jobId":"2"}
curl http://localhost:3000/workspaces/:id/analysis-job/2                    # -> completed, returnValue.decision
curl http://localhost:3001/workspaces/:id | grep 'Start analysis\|trigger'  # both triggers render together
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 58/58 passed,
  `npm run build` clean.
- New test in `async-analysis-trigger.spec.tsx` ("keeps the completed banner visible after the
  status prop changes") directly reproduces finding 1's bug scenario via `rerender()` with a
  changed `status` prop and asserts the banner text is still present — this is a regression test
  for the exact bug found in review, not just a happy-path check.
- New test ("stops polling and surfaces a timeout message after the max poll attempts") advances
  fake timers by the full 300 * 2000ms = 10 simulated minutes in one call and confirms polling
  stops with the expected message and no further calls — validates finding 4's fix without a slow
  test (runs in milliseconds under fake timers).
- New `analysis-triggers.spec.tsx` proves the lock works in both directions: clicking the sync
  button hides the async button while the sync call is in flight, and vice versa — this is the
  regression test for finding 2 (the double-AI-run race).
- Real backend + real Redis: re-verified the enqueue/poll contract is unaffected by the frontend
  rewrite (`POST run-analysis-async` -> `{"jobId":"2"}`, `GET analysis-job/2` -> `state:
  "completed"` with the expected `returnValue`); confirmed via `curl` that the workspace detail
  page renders both "Start analysis" and "Start analysis (async)" together at `source_saved` (now
  via the shared `<AnalysisTriggers>` wrapper) and that both disappear once the workspace moves
  past `source_saved`.
- Did not perform a live interactive browser click-through of the lock (clicking one button and
  watching the other visually disappear in real time) — no browser automation tool available.
  Covered instead by `analysis-triggers.spec.tsx`'s integration-style tests exercising the same
  prop-wiring in both directions.

### Follow-up

- None.
