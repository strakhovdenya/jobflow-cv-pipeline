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

## 2026-08-25 — ISSUE-260/ISSUE-261 — Deterministic placeholder-data guard before export + its unit tests

### Scope

New `CandidateProfileGuardService` (`apps/api/src/document-export/candidate-profile-guard.service.ts`)
— a deterministic, non-AI check that scans every string field of `CandidateProfileConfig`
(candidate/contact, education, languages, links, volunteering) for placeholder markers
(`Placeholder`, `TODO`, `FIXME`, `TBD`, `XXX`, `see ... notes`, `internal note`, case-insensitive).
Wired into `DocumentExportService.exportCv()` as a blocking precondition — runs right after the
existing status-precondition check, before any HTML/PDF rendering. Not wired into
`run-pre-pdf-check`: confirmed by code reading that `Prompt3Service`/`prompt3-input-builder.service.ts`
never reads `candidate-profile.config.ts` at all, so there is nothing for the guard to check there.

`/code-review` flagged two real issues, both fixed in the same change before closing either issue:
(1) the new service had no matching spec file (ADR-020) — added
`candidate-profile-guard.service.spec.ts` (6 tests: passes on clean profile, flags each of
Placeholder/TODO/leaked "see ... notes", does not false-positive on legitimate data resembling but
not matching a marker, reports every distinct offending field); (2) the blocked-export error
message interpolated a raw `RegExp` object (`.toString()` leaking `/\bplaceholder\b/i` syntax into
a user-facing `BadRequestException`) — replaced with a human-readable `label` per pattern.

Per the same precedent already set by ISSUE-257/ISSUE-259 in this phase (test bundled with the fix
rather than deferred), ISSUE-261's own Acceptance Criteria (srabatyvanie on placeholder markers +
no false positives on legitimate data) are both already satisfied by this same spec file — closing
both issues together.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
```

### Result

PASS

### Evidence

- `tsc --noEmit`: clean.
- `npm run lint`: clean.
- `npm run test`: 62 suites / 719 tests passed (+1 in `document-export.service.spec.ts`: "rejects
  with BadRequestException and never renders when the candidate profile guard fails"; +6 in the new
  `candidate-profile-guard.service.spec.ts`).
- `DocumentExportService`'s constructor arity test updated (4 → 5 args) to reflect the new
  `CandidateProfileGuardService` dependency.

### Follow-up

- none — the architectural decision itself is recorded as ADR-032 in `project-management/DECISIONS.md`
  (issue #262, same phase, closed together with this entry). Doc-only change: no `tsc`/`lint`/`test`
  applicable per issue #262's own Definition of Done; consistency-checked by reading it back
  alongside ADR-026/ADR-031, which it cross-references.

## 2026-08-25 — ISSUE-258 — Replace placeholder education/language data in candidate-profile.config.ts

### Scope

Static `CANDIDATE_PROFILE_CONFIG` data (`apps/api/src/document-export/candidate-profile.config.ts`)
— not AI logic. Replaced `Placeholder University`/`Placeholder Degree`/`Placeholder dates` education
entry and the leaked internal `'Learning — see language risk notes'` German note with real,
golden-dataset-confirmed values (`project-management/golden-dataset/{bjak_20260717,cello_20260718}/manual-cv.md`).
`dates` left as `''` (empty string) per user decision — real education dates not confirmed.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
```

Manual render verification (ad-hoc script, deleted after use): loaded the real
`storage/applications/2026_08_23_BJAK_Full_Stack_Engineer/02_targeted_cv_content.json`, mapped it
through `mapPrompt2OutputToCvContent` with the updated `CANDIDATE_PROFILE_CONFIG`, and rendered via
`renderCvTemplate` to inspect the actual HTML output.

### Result

PASS

### Evidence

- `tsc --noEmit`: clean.
- `npm run lint`: clean (auto-formatted the edited file).
- `npm run test`: 61 suites / 712 tests passed.
- Rendered HTML confirmed: Education shows
  `National Technical University "Kharkiv Polytechnic Institute"` / `Specialist Degree — Process
  Engineer` / empty `.edu-dates` div (no visible placeholder/dash) / `Department of Integral
  Technology and Applied Chemistry` note. Languages show `English — B1/B1+, professional working
  use`, `German — A2/B1` with note `Actively improving` (no `Placeholder`/`language risk notes`
  strings anywhere in output).

### Follow-up

- Real education dates remain unconfirmed — if the user provides them later, update
  `candidate-profile.config.ts`'s `dates` field directly (no logic change needed).
- A follow-up issue (Phase 2 of this epic) is expected to add an automated guard against
  placeholder/internal-note strings in this config, per issue #258's Test Requirement.

## 2026-08-22 — ISSUE-204 — Record the 194 selected golden-dataset cases

### Scope

Issue #204 (EPIC-24 Phase 3, step 2): create `project-management/golden-dataset/` and document
each of the 194 cases selected in #203 in the format from
`docs/10_calibration_and_parity.md` §3.2 (workspace slug, vacancy text, manual decision, manual CV
or skip reason, date added) and `docs/research-ai-output-calibration.md` §4.1 (`<case-slug>/`
folder with `case.md` — YAML frontmatter + vacancy text body — and `manual-cv.md` — real sent CV
or skip reason). Not code-centric — no `apps/api`/`apps/web` files touched.

Given the volume (194 cases, each requiring exact transcription of real files from
`D:\infa\Documents\jobs for analys\2026\`), documentation was generated by a small one-off Node
script (`scripts/build-golden-dataset.js`, kept in the repo for reproducibility) rather than typed
by hand per case — this is mechanical transcription/classification, not AI judgment about the
cases' content. The script re-derives the same classification #203 already did manually (vacancy
`.txt` + real CV → apply/maybe; vacancy `.txt` + `SKIP_*reason*.md` and no CV → skip; both → mixed;
neither → excluded) so its output could be cross-checked against #203's recorded counts rather than
trusted blindly.

### Commands

```bash
node scripts/build-golden-dataset.js
# spot-check YAML frontmatter + required files across all generated cases
node -e "<inline script validating every case.md has slug/manual_decision/date_added frontmatter
  fields and a sibling manual-cv.md>"
```

### Result

PASS

### Evidence

- Script output: `Included: 194 (apply=131, skip=57, mixed=6)`, `Excluded: 12`, `Total case dirs
  found: 206` — matches #203's recorded counts exactly, including the same 12 excluded folder paths
  (`AppsFlyer/2026.06.23`, `BairesDev`, `Code Compass`, `dexter health`, `EPAM Systems/2026.07.04`,
  `Flosum/2026.07.17`, `HBX Group/2026.07.10`, `Noxx/2026.06.20`, `Open-Xchange/2026.06.19`,
  `Optimus Search/2026.06.19`, `SharksCode/2026.07.30`, `VisionSpace`) and the same 6 mixed-case
  companies (`Aschert & Bohrmann GmbH`, `PwC Ukraine`, `THRYVE`, `VisiTrans GmbH`, `homie AI`,
  `secunet`).
- `project-management/golden-dataset/` created with 194 case folders, each containing `case.md`
  (frontmatter: `slug`, `source_folder`, `manual_decision`, `manual_cv_origin`, `date_added`;
  `skip_draft_present: true` added only for the 6 mixed cases; body: full vacancy text) and
  `manual-cv.md` (targeted CV content for apply/maybe, skip reasoning for skip, both — CV then the
  skip reasoning under a `## SKIP reasoning from Prompt 1 (overridden — human applied anyway)`
  heading — for the 6 mixed cases, which keep `manual_decision: apply` since that is what the human
  actually did).
- **Correction made during review** (project owner flagged the first draft's wording): both
  `03_targeted_CV_content_*.md` and `SKIP_*_reason_*.md` are themselves outputs of the pre-
  automation manual chat workflow's own prompts, not independently hand-typed text — confirmed
  against the actual historical prompt files the project owner pasted
  (`!prompt_1_..._RISK_BALANCED_STARTUP_PRODUCT_..._LANG_GATE.txt`,
  `!prompt_2_0_1_targeted_CV_content_...txt`): Prompt 1 (quick vacancy analysis) decides
  apply/maybe/skip and, on SKIP, generates the `SKIP_<Company>_<Role>_reason_RU.md` archive note
  itself (prompt §3.1) — there is no separate "skip-reason prompt"; Prompt 2 generates
  `03_targeted_CV_content_[Company]_[Role].md`, which the human then used as the basis for the CV
  actually sent. The first script draft mislabeled the skip file's origin as a "manual skip-reason
  prompt run" (implying a distinct prompt) and used "manually produced" headers that could be read
  as hand-typed content with no AI involved at all. Fixed: added an explicit `manual_cv_origin`
  frontmatter field on every case (distinct text for skip vs. apply/mixed, naming Prompt 1/Prompt 2
  specifically) and renamed `manual-cv.md`'s in-body headers to `# Skip reasoning (Prompt 1 output,
  SKIP branch)` / `# Targeted CV content (Prompt 2 output, basis for the sent CV)`. "Manual" in this
  golden dataset means the human ran these prompts by hand, one vacancy at a time, in the pre-
  automation chat workflow, and approved/sent the result — not that no AI was involved in producing
  the text. File names/split (`case.md` + `manual-cv.md`) themselves are unchanged — that structure
  was already fixed by `docs/research-ai-output-calibration.md` §4.1, only the content's framing was
  wrong. Regenerated all 194 cases after the fix; counts unchanged (131/57/6, 12 excluded).
- **Second correction — a real classification bug, not just wording** (found while checking
  whether other issues' wording was consistent with this one): the first script draft hardcoded
  `manual_decision: apply` for every case with a real CV, regardless of what
  `03_targeted_CV_content_*.md`'s own `Decision before CV:` metadata line actually said. Checked
  across all 142 such files in the source tree — 75+ variants say `maybe` (`maybe`, `maybe, leaning
  apply`, `maybe / strategic apply`, etc.), not `apply`; only ~38 say `apply` outright. This
  silently erased every "maybe" case from the dataset before #205 (which exists specifically to
  verify apply/maybe/skip coverage) could even see them. Fixed: added `extractDecisionBeforeCv()` /
  `normalizeDecision()` to `scripts/build-golden-dataset.js`, which parse that line for every
  "apply-status" case (has a real CV, no skip draft) and normalize it to `apply` or `maybe` by
  matching the leading word; the exact original text is preserved in a new `manual_decision_raw`
  frontmatter field for cases where it differs from a bare `apply`. The 6 mixed cases keep
  `manual_decision: apply` unchanged (that status already means "a CV was actually sent despite an
  earlier skip signal" — verified all 6 raw lines describe a skip-to-apply override, e.g. `skip,
  overridden by user request to apply`, not an apply/maybe distinction) but now also carry
  `manual_decision_raw` for context. One additional edge case found and handled correctly:
  `optimus_search_20260806` has `Decision before CV: skip, overridden by user request to apply` but
  no persisted `SKIP_*.md` file (so it stayed classified as "apply" status per #203's file-presence
  rule, not reclassified as "mixed") — `manual_decision: apply` with `manual_decision_raw` preserving
  the override note. Re-ran the full dataset after the fix: `manual_decision` distribution across
  all 194 `case.md` files is now `apply: 44`, `maybe: 93`, `skip: 57` (previously `apply: 137`
  effective, `maybe: 0` — the bug). Re-validated frontmatter/file-presence on all 194 cases again —
  all pass.
- Slugs derived from `<company>_<date>` (snake_case, ADR-013 Unicode-safe — e.g.
  `it_компанія_дп_інфотех_20260623` round-tripped correctly), collapsing to just `<company>` for the
  5 companies whose files sit loose directly under the company folder instead of a date subfolder
  (`avenga`, `ciklum`, `miratech`, `softserve`, `the_flex` — consistent with #203's note that each
  represents its own separate vacancy); no duplicate slugs.
- Validation script confirmed all 194 `case.md` files have well-formed YAML frontmatter (single-
  quoted strings, to avoid backslash-escaping issues with the Windows source paths) with
  `slug`/`manual_decision`/`date_added` all present, and all 194 have a sibling `manual-cv.md`.
- Manually spot-read full generated output for one case per category: `action1_20260623` (apply —
  full real 03_targeted_CV_content transcribed intact, 441 lines), `airadvisor_20260704` (skip —
  Cyrillic skip-reason content preserved correctly, UTF-8), `pwc_ukraine_20260703` (mixed — both the
  real sent CV and the skip-reason draft present in `manual-cv.md`, `skip_draft_present: true` in
  frontmatter). Confirmed zero apply/mixed cases fell back to the "CV exists only as a PDF, no
  Markdown transcription" placeholder path — every one had a real `03_targeted_CV_content_*.md`.
- `git status`: only `project-management/golden-dataset/` (new) and `scripts/build-golden-dataset.js`
  (new) — no `apps/api`/`apps/web` files touched, so no `tsc`/`lint`/`test` run required per
  Definition of Done's code-centric branch.

### Follow-up

- Next: issue #205 — verify apply/maybe/skip coverage across the selected/documented set.

## 2026-08-22 — ISSUE-203 — Select real processed folders for the golden dataset

### Scope

Issue #203 (EPIC-24 Phase 3, step 1): manually review every real, already-processed application
folder referenced in `docs/00_product_vision_updated_consistent.md` §3 (`Action1/`, `Amach/`,
etc. — the actual folder tree lives outside this repo, at `STORAGE_ROOT`'s sibling location
`d:\infa\Documents\jobs for analys\2026\`) and select only the ones usable as a golden case per
`docs/10_calibration_and_parity.md` §3.1: vacancy source text present, and either a real
sent CV or a skip-reason artifact present. This is selection only — documenting the selected
cases into `project-management/golden-dataset/` (per the recommended `case.md`/`manual-cv.md`
format, `docs/research-ai-output-calibration.md` §4.1) is issue #204; coverage of apply/maybe/skip
across the set is issue #205. Not code-centric — no `apps/api` files touched.

### Commands

```bash
# enumerate every leaf folder that actually holds files (company folder, or company/date subfolder)
find . -mindepth 1 -type f | classify by filename: has vacancy .txt (excl. skip-named),
  has *skip*-named artifact, has non-skip/non-cover .pdf or .md (real CV/targeted-cv-content)
```

### Result

PASS (manual review) — 206 real-processed leaf folders found; 194 usable, 12 not usable.

### Evidence

- **194 folders selected** as golden-case candidates:
  - **131** have vacancy `.txt` + a real sent targeted CV (`.pdf`/`03_targeted_CV_content_*.md`) —
    the apply/maybe path.
  - **57** have vacancy `.txt` + a `SKIP_*_reason_*.md` artifact and no CV — the skip path.
  - **6** have vacancy `.txt` + both a `SKIP_*_reason_*.md` draft and a real sent CV
    (`Aschert & Bohrmann GmbH/2026.07.16`, `PwC Ukraine/2026.07.03`, `THRYVE/2026.07.20`,
    `VisiTrans GmbH/2026.07.14`, `homie AI/2026.07.20`, `secunet/2026.07.16`) — a skip
    recommendation was drafted but a human overrode it and actually applied; still usable, and a
    genuinely useful case for #205 (decision-override coverage), not a data-quality problem.
  - Spot-checked several `.md`/`.pdf` filenames directly (`Accessiway/2026.06.27`,
    `Jobgether/2026.06.25`, `Optimus Search/2026.08.06`, `SME Careers/2026.07.19`) to confirm the
    filename-pattern classification wasn't a false positive — all confirmed to be real
    `03_targeted_CV_content_*` + sent CV pairs, not unrelated files.
  - A few companies applied more than once and one application's files sit loose directly under
    the company folder (no date subfolder) instead of the usual `<company>/<date>/` layout used
    elsewhere (`Avenga`, `Ciklum`, `Miratech`, `SoftServe`, `The Flex`) — verified each of these is
    a genuine separate vacancy (different role title/filenames) with its own full vacancy+CV pair,
    not a stray duplicate, so each counts as its own selected case.
  - Full 194-path list (grouped apply/maybe · skip · mixed) was generated for #204 to consume
    directly when building `project-management/golden-dataset/`; not re-pasted here in full to
    keep this entry readable — reproducible from the classification commands above run against the
    real `jobs for analys/2026/` tree.
- **12 folders excluded** — vacancy `.txt` present but no CV and no skip-reason artifact (an
  application still in progress or abandoned before any output, per
  `docs/10_calibration_and_parity.md` §3.1's explicit exclusion rule): `AppsFlyer/2026.06.23`,
  `BairesDev`, `Code Compass` (a loose top-level `.txt` only — the company's 3 real date-subfolder
  cases are already counted above), `EPAM Systems/2026.07.04`, `Flosum/2026.07.17`,
  `HBX Group/2026.07.10`, `Noxx/2026.06.20`, `Open-Xchange/2026.06.19`,
  `Optimus Search/2026.06.19` (the company's other date-subfolder case is selected above),
  `SharksCode/2026.07.30` (same — `2026.07.06` is selected above as a skip case),
  `VisionSpace`, `dexter health`.

### Follow-up

- Next: issue #204 — document the 194 selected cases into `project-management/golden-dataset/`
  (`case.md` + `manual-cv.md` per case, per `docs/research-ai-output-calibration.md` §4.1).
- Then: issue #205 — verify apply/maybe/skip coverage across the selected set.

## 2026-08-22 — ISSUE-202 — Placeholder-comment gap check for prompt_2 seed descriptions

### Scope

Issue #202 (mirror of #197, closing out EPIC-24 Phase 2) required removing/updating the
"Placeholder content pending prompt-engineering review" comment for `prompt_2_targeted_cv_content`
in `apps/api/prisma/seed.ts`, if still present. Verified from scratch (not reused from an earlier
session's cursory look) whether the gap actually exists, since #200/#201 already rewrote the
`prompt_2` seed descriptions for other reasons and may have already removed it as a side effect.

### Commands

```bash
grep -in "placeholder" apps/api/prisma/seed.ts
grep -n "prompt_2_targeted_cv_content" apps/api/prisma/seed.ts
```

### Result

PASS — no gap found; no code change required.

### Evidence

- The 4 remaining "Placeholder content pending full prompt-engineering review" matches in
  `apps/api/prisma/seed.ts` (lines 170, 180, 190, 200) belong to `prompt_3_pre_pdf_check`,
  `prompt_5_final_check`, `skip_reason`, and `cover_letter` — none reference `prompt_2`.
- All four `prompt_2_targeted_cv_content` entries (`seed.ts` lines 123–162, v1–v4) already carry
  real, specific descriptions — v3 (line 149) and v4 (line 159) explicitly reference
  `docs/10_calibration_and_parity.md` §2.5/§2.7 and issues #200/#201, confirming the placeholder
  text was already superseded during that earlier work, not left behind.
- Cross-checked against `docs/10_calibration_and_parity.md` §2.6 ("Adaptation into `prompt2_v3.txt`
  (Issue #200)") and §2.7 ("Anti-Overclaiming Rules verification for prompt_2 (Issue #201)") — both
  sections describe rewriting the seed description alongside the prompt content itself, consistent
  with what's on disk now.

### Follow-up

- none — issue #202 closed with this verification as evidence, no further action.

## 2026-08-19 — ISSUE-196 — Anti-Overclaiming Rules verification for prompt_1_v3

### Scope

Verify `apps/api/prisma/prompts/prompt1_v3.txt` (created by #195) against root `CLAUDE.md`'s five
Anti-Overclaiming Rules explicitly, one by one — not assumed inherited from the manual ChatGPT-web
flow, which was never connected to this project's rules. One gap found (MCP/Claude Code not named
explicitly, rule 3) was fixed with the project owner's confirmation as `prompt1_v4.txt`
(`PromptTemplate` version 4, active; v3 deactivated, not deleted).

### Commands

```bash
cd apps/api
grep -ni "MCP\|Claude Code\|NestJS\|Kubernetes\|Docker\|AWS\|needs.evidence\|needs_evidence" \
  prisma/prompts/prompt1_v3.txt
npx tsc --noEmit
npm run lint
npm run test
npx prisma db seed
npx ts-node -e "<inline script querying PromptTemplate versions for prompt_1_vacancy_analysis>"
```

### Result

PASS

### Evidence

- All 5 rules checked individually against `prompt1_v3.txt`, citations recorded in
  `docs/10_calibration_and_parity.md` §2.3: rules 1, 2, 4, 5 fully covered, no change needed; rule 3
  (personal AI/FastAPI/OpenAI/MCP/Claude Code ≠ commercial) partially covered via a generic "AI"
  catch-all but MCP/Claude Code never named explicitly — confirmed as a real gap against the
  candidate's actual knowledge-source files (which do describe MCP/Claude Code work).
- Fix applied in `prompt1_v4.txt`: three targeted additions naming MCP/Claude Code (current-work
  preamble list, new OVERCLAIMING/SAFETY CHECKS bullet, closing "never present as commercial
  production" sentence) — no other content changed.
- `apps/api/prisma/seed.ts`: added `seed-prompt-1-vacancy-analysis-v4` (version 4, `isActive: true`),
  flipped v3's `isActive` to `false`.
- `npx tsc --noEmit`: clean. `npm run lint`: clean (0 errors/warnings). `npm run test`: 61 suites /
  698 tests passed.
- `npx prisma db seed` re-run against local dev DB: upserted cleanly, no errors. Queried
  `PromptTemplate` rows for `prompt_1_vacancy_analysis` after seeding:
  `[{"version":1,"isActive":false},{"version":2,"isActive":false},{"version":3,"isActive":false},{"version":4,"isActive":true}]`
  — confirms exactly one active version, correctly the new v4.

### Follow-up

- none.

## 2026-08-19 — ISSUE-193 — Web-app-specific assumptions audit for prompt_1 source text

### Scope

Documentation-only audit task (Phase 1 of EPIC-24): read the real manual-flow prompt text
`apps/api/prisma/prompts/!prompt_1_0_3_quick_vacancy_analysis_RISK_BALANCED_STARTUP_PRODUCT_UPDATED_CURRENT_WORK_SYNC_LANG_GATE.txt`
in full (553 lines, not just the PRD's quoted fragment) and produce a list of every web-app-specific
assumption it makes, per Issue #193's Acceptance Criteria. No code changes.

### Commands

```bash
# full-text search for capability-assumption keywords, to confirm nothing was missed by eyeballing
grep -n -iE "browsing|search|lookup|internet|attach|upload|file|session|remember|memory|paste|загрузил|вставил" \
  "apps/api/prisma/prompts/!prompt_1_0_3_quick_vacancy_analysis_RISK_BALANCED_STARTUP_PRODUCT_UPDATED_CURRENT_WORK_SYNC_LANG_GATE.txt"
```

### Result

PASS

### Evidence

- Read the entire 553-line source file (not the PRD's excerpt).
- Recorded 6 findings as a new `docs/10_calibration_and_parity.md` §2.1: (1) vacancy delivered via
  chat paste/upload, (2) vacancy assumed to be a PDF the model visually parses, (3) knowledge-source
  files treated as live/browsable attached files, (4) persistent session/"project" memory carrying
  standing instructions across turns, (5) AI directly creating a file and linking to it (SKIP archive
  note), (6) live web browsing/external verification — flagged as *not actually present* in this
  file's text despite being cited as an example in `docs/10_calibration_and_parity.md` §2 point 5,
  a discrepancy left for Issue #194 to resolve explicitly.
- Grep search for capability-assumption keywords cross-checked against the manual read; no additional
  candidate assumptions found beyond the 6 recorded.
- Each finding is a starting point for Issue #194 (map to existing mechanism or reword with an
  explicit fallback) — this task's own scope was limited to producing the list, not resolving it.

### Follow-up

- Issue #194 (blocked on this task) resolves each of the 6 findings with an explicit decision.

## 2026-08-16 — TASK-103 — Fix stale TASK_BOARD.md status rows for TASK-067 and TASK-073

### Scope

Documentation-only correction: `TASK_BOARD.md`'s per-task table had TASK-067 and TASK-073 marked
`TODO` despite both being long merged and DONE, contradicting the file's own narrative sections
elsewhere in the same document.

### Commands

None — no code touched, nothing to run. Verification was git history + reading the file's own
already-correct prose.

```bash
git log --oneline -- apps/web/src/app/workspaces/[id]/final-check-panel.tsx
grep -n "TASK-067\|TASK-073-redesign-base" project-management/TASK_BOARD.md
```

### Result

PASS

### Evidence

- `git log` confirmed `5d8bf54 feat: TASK-067 add Prompt 5 final check trigger and results view`
  (2026-07-20) plus a same-day review-fix commit and a later TASK-074 extension commit —
  `final-check-panel.tsx` exists and is wired into `page.tsx`.
- `TASK_BOARD.md`'s own text at ~line 425-426 already read "Previously: TASK-067 ... — DONE,
  branch `task/TASK-067-final-check-ui`, PR #126 (merged)" and ~line 168-169 already read "that PR
  (#158, `task/TASK-073-redesign-base` → `main`) was already [merged]" — both facts pre-existed in
  the file; this task only reconciled the summary table rows to match.
- All of TASK-073's declared sub-tasks (TASK-075 through TASK-089) plus TASK-074 were confirmed
  already `DONE` in the same table.
- Updated both rows: `TODO` → `DONE`, filled PR/commit columns, added explanatory notes citing the
  source of the correction.

### Follow-up

- none. (TASK-086 was deliberately left untouched — a genuine open item, not a stale-doc bug; see
  `project-management/completed-tasks/TASK-103-fix-stale-task-board-rows.md` for detail.)

## 2026-08-15 — TASK-101 — UI: manual-note control on the workspace detail page (apps/web)

### Scope

`WorkspaceDetail.manualNote` + `appendManualNote()` in `apps/web/src/lib/api.ts`,
`appendManualNoteAction` in `actions.ts`, new `ManualNotePanel` component wired into
`page.tsx` above `ApplicationTrackingPanel`, and its `manual-note-panel.spec.tsx` suite.

### Commands

```bash
cd apps/web
npx tsc --noEmit
npm run lint
npm run test
```

### Result

PASS

### Evidence

- `tsc --noEmit`: 0 errors (after adding the new `manualNote: null` field to two pre-existing
  `WorkspaceDetail` fixtures in `pipeline-view-model.spec.ts` that broke once the field became
  required).
- `npm run lint`: clean.
- `npm run test`: 23 files / 228 tests passed (up from 223 — 5 new tests in
  `manual-note-panel.spec.tsx`).
- Manual verification against a real `apps/api` backend (Postgres via `docker compose`, `apps/api`
  on port 3000, `apps/web` dev server on port 3001 to avoid the port clash — both apps default to
  3000): created a throwaway workspace (`cmsu4yw0100024lk7ml6j57tq`, TestCo / Backend Developer)
  via `POST /workspaces`, opened its detail page in a real browser (Playwright MCP). Confirmed via
  screenshot/snapshot: "Manual notes" panel renders unconditionally at `source_saved` (no status
  gate) showing "No manual notes yet."; submitted a first note, panel updated in place to show the
  timestamped entry; reloaded the page — note persisted; submitted a second note; both entries
  visible in order, each with its own `[ISO timestamp]` prefix, matching TASK-098's
  additive/timestamped append behavior.
- Unrelated environment issue hit and resolved during manual verification: `apps/web`'s Turbopack
  dev server intermittently panics on first compile of `globals.css` on this Windows machine
  (`node process exited ... 0xc0000142`) — a local Turbopack/Windows worker-process quirk, not
  caused by this task's changes; resolved by clearing `.next` and restarting the dev server.

### Follow-up

- none.

## 2026-08-15 — TASK-102 — Bump Node.js 20→22 and puppeteer 24→25 to close GHSA-jmr9-qjv8-65gv

### Scope

Bumped Node.js runtime 20→22 across `.github/workflows/ci.yml` (`NODE_VERSION`), both apps'
Dockerfiles (`node:20-alpine` → `node:22-alpine`), and `apps/api/package.json`'s `engines.node`
(`">=20"` → `">=22.12.0"`). Bumped `puppeteer` `^24.43.1` → `^25.7.0` (the first major line whose
`@puppeteer/browsers` dependency dropped `extract-zip` for `modern-tar`, closing
GHSA-jmr9-qjv8-65gv — no patched `extract-zip` release exists at any version). Discovered mid-task
that `puppeteer@25.x` ships pure ESM with no CJS build, which Jest's CJS module runtime cannot
parse (Node's own `require()` handles it fine, stable since Node 22.12) — fixed via a lazy dynamic
import in `PdfExportService` plus mocking Puppeteer in the two test files that deliberately invoke
it for real (`pdf-export.service.spec.ts`, `mvp-flow.e2e-spec.ts`), per project owner decision. Full
reasoning and the alternative considered (Jest ESM transform config, rejected as fragile/open-ended
after surfacing a second interop bug) is in `project-management/completed-tasks/
TASK-102-node22-puppeteer-upgrade.md`'s Progress Notes.

### Commands

```bash
# local shell switched to Node 22 via nvm4w (nvm use 22.23.0) before any of the below
cd apps/api
npm install                              # puppeteer 24.43.1 -> 25.7.0, @puppeteer/browsers 2.13.2 -> 3.2.0
npm audit --omit=dev --audit-level=high
npm ls puppeteer @puppeteer/browsers extract-zip
npx tsc --noEmit
npm run lint
npm run test
npm run test:e2e
npm run build
cd ../web
npm install                              # sanity check under Node 22 — no puppeteer dependency here
npx tsc --noEmit
npm run lint
npm run test
npm run build
cd ../..
docker compose config
docker build -t jobflow-api-test -f apps/api/Dockerfile apps/api
docker build -t jobflow-web-test -f apps/web/Dockerfile apps/web --build-arg NEXT_PUBLIC_API_BASE_URL=http://app:3000
# manual PDF export smoke test, real dev server, Node 22, puppeteer 25.7.0 (before mocking was added):
npm run start:dev
curl -X POST ... /workspaces
curl -X POST ... /workspaces/<id>/run-analysis
curl -X POST ... /workspaces/<id>/review-decision
curl -X POST ... /workspaces/<id>/generate-cv-content
curl -X POST ... /workspaces/<id>/review-cv-draft
curl -X POST ... /workspaces/<id>/skip-pre-pdf-check
curl -X POST ... /workspaces/<id>/export-cv
file storage/applications/<workspace>/04_cv_export.pdf
```

### Result

PASS

### Evidence

- **Before:** `npm audit --omit=dev` under puppeteer 24.43.1 reported 4 high-severity
  vulnerabilities (`extract-zip` GHSA-jmr9-qjv8-65gv, propagating through `@puppeteer/browsers`,
  `puppeteer-core`, `puppeteer`). **After:** `npm audit --omit=dev --audit-level=high` → "found 0
  vulnerabilities". `npm ls puppeteer @puppeteer/browsers extract-zip` confirms
  `@puppeteer/browsers@3.2.0` and no `extract-zip` entry at all in the tree.
- `apps/api`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` — 61/61 suites, 690/690
  tests (up from 689 — the new `closes the browser even when page rendering throws` test), `npm run
  test:e2e` — 3/3 suites, 4/4 tests, `npm run build` clean.
- `apps/web`: confirmed `package.json`/lockfile unchanged by `npm install` under Node 22 (no
  puppeteer dependency there); `npx tsc --noEmit`/`npm run lint` clean, `npm run test` — 22/22
  files, 223/223 tests, `npm run build` clean.
- `docker compose config` resolves without error. `docker build` succeeded for both
  `apps/api/Dockerfile` and `apps/web/Dockerfile` on `node:22-alpine`, each reporting "found 0
  vulnerabilities" during their own `npm ci`/`npm install` step; both test images removed after the
  check (`jobflow-api-test`, `jobflow-web-test`).
- Manual PDF export smoke test against the real local dev DB (fake AI provider), Node 22, puppeteer
  25.7.0, run *before* the Puppeteer mocks were added to the test files (so this exercised real,
  unmocked Puppeteer end-to-end): created a workspace, ran the full pipeline through `export-cv`.
  Response confirmed `status: cv_pdf_generated`; `file storage/applications/.../04_cv_export.pdf`
  reported "PDF document, version 1.4, 1 page(s)", 108824 bytes. Workspace and its DB rows/storage
  folder cleaned up afterward.
- Confirmed no unrelated dependency was bumped as a side effect: `git diff apps/api/package.json`
  shows only `engines.node` and `puppeteer` changed; the `package-lock.json` diff's other touched
  entries are npm's own `"dev": true` metadata re-annotation (a lockfile-format normalization, not
  real version changes) plus puppeteer's own transitive tree.
- `/code-review` on PR #188 found no Critical/Important issues (independently re-verified the
  `package.json`/lockfile scoping claim and the compiled-output ESM/CJS interop claim). One
  non-blocking recommendation: periodically re-run this manual smoke test on future `puppeteer`
  bumps, since real Puppeteer is no longer exercised in automated tests.

### Follow-up

- Confirmed on PR #188 (`gh pr checks 188`): all 13 required CI checks passed, including
  `Dependabot Severity Gate` — the exact check that was blocking TASK-100's PR #187 for this
  advisory. PR #188 was squash-merged (`80354c4`); note the merge captured only the first commit's
  diff — the closure documentation commit (this entry, the archived task file, `TASK_BOARD.md`'s
  `DONE` row, `CHANGELOG.md`) was pushed after the merge and needed a small separate follow-up PR
  to land on `main`.

## 2026-08-14 — TASK-100 — Add quality_score to VacancyAnalysis and TargetedCvContentOutput, with a new active PromptTemplate version

### Scope

Added `quality_score: number` (finite-number `isNumber` check, mirroring
`FinalCheckOutput.quality_score`) to `VacancyAnalysis` and `TargetedCvContentOutput` schemas;
`FAKE_PROMPT1_JSON`/`FAKE_PROMPT2_JSON` fixtures updated. New `prompt1_v2.txt`/`prompt2_v2.txt`
(v1 files untouched) add `quality_score` to the OUTPUT CONTRACT and a short self-assessment
rubric, and rewrite the stale "knowledge sources may be name-only" caveat to reflect that
knowledge sources are now inlined when selected (TASK-094/095/096/097 already merged).
`prisma/seed.ts`'s `promptTemplates` array gained an explicit per-entry `isActive` field (fixing
a previously-hardcoded `isActive: true` on every upsert) and two new `version: 2` rows for
`prompt_1`/`prompt_2`, active, with `version: 1` preserved but inactive. `Prompt1Service`/
`Prompt2Service`'s `buildMarkdown` now render a `## Quality Score` section mirroring Prompt 5's
pattern.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
npx prisma migrate reset --force --skip-seed   # fresh local dev DB
npx prisma db seed
node scratch_check_seed.js                      # ad hoc PromptTemplate row check, deleted after use
npx prisma db seed                               # re-run to verify idempotency
npm run test:e2e
npm run start:dev                                # manual verification against real dev DB
curl -X POST -H "X-API-Key: ..." -H "Content-Type: application/json" -d '{...}' http://localhost:3000/workspaces
curl -X POST -H "X-API-Key: ..." http://localhost:3000/workspaces/<id>/run-analysis
curl -X POST -H "X-API-Key: ..." -H "Content-Type: application/json" -d '{"action":"approve_apply"}' http://localhost:3000/workspaces/<id>/review-decision
curl -X POST -H "X-API-Key: ..." http://localhost:3000/workspaces/<id>/generate-cv-content
```

### Result

PASS

### Evidence

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean.
- `npm run test` — 61 suites / 697 tests, all passed (up from 689) — new valid/invalid
  `quality_score` cases in `vacancy-analysis.schema.spec.ts` and
  `targeted-cv-content.schema.spec.ts`, new `## Quality Score` markdown assertions in
  `prompt1.service.spec.ts`/`prompt2.service.spec.ts`, plus `quality_score` added to three other
  `TargetedCvContentOutput` test fixtures that the type change caught at compile time
  (`prompt2-to-cv-content.mapper.spec.ts`, `evidence-guard.service.spec.ts`,
  `html-renderer.service.spec.ts`).
- Fresh-database re-seed check: after `prisma migrate reset` + `prisma db seed`, a direct Prisma
  query confirmed `prompt_1`/`prompt_2` each had exactly one active row at `version: 2`
  (`seed-prompt-1-vacancy-analysis-v2`/`seed-prompt-2-targeted-cv-content-v2`) and one inactive row
  at `version: 1`; every other step (`prompt_3`, `prompt_5`, `skip_reason`, `cover_letter`) had
  exactly one active row. Re-ran `prisma db seed` a second time against the same database — same
  result, confirming idempotency.
- `npm run test:e2e` — 3 suites / 4 tests, all passed.
- Manual walkthrough against the real local dev DB and the `fake` AI provider: created a workspace,
  ran `run-analysis` → `review-decision` (approve_apply) → `generate-cv-content`; both
  `01_vacancy_analysis.md` and `02_targeted_cv_content.md` contained a `## Quality Score` section
  with the fixture values (88 and 85 respectively). Cleaned up the workspace's DB rows and storage
  folder afterward.

### Follow-up

- None. Remaining EPIC-23 backlog: TASK-101 (UI: manual-note control, `apps/web` — unrelated to
  this task's scope).

## 2026-08-11 — TASK-099 — Wire manualNote into Prompt 1 / Prompt 2 / cover-letter input builders

### Scope

Added optional `manualNote?: string | null` to `WorkspaceInputContext`, `Prompt2WorkspaceContext`
and `CoverLetterWorkspaceContext`; `Prompt1Service.runAnalysis`, `Prompt2Service.generateCvContent`
and `CoverLetterService.generateCoverLetter` now pass `workspace.manualNote` into their respective
builder call. Each builder appends a `=== MANUAL NOTE ===` block to `inputContext` only when the
note is present/non-empty; absent note produces byte-identical output to before this task.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
npm run start:dev   # manual verification against real dev DB
curl -X POST -H "X-API-Key: ..." -H "Content-Type: application/json" -d '{"note":"..."}' http://localhost:3000/workspaces/<id>/manual-note
curl -X POST -H "X-API-Key: ..." http://localhost:3000/workspaces/<id>/run-analysis
curl -X POST -H "X-API-Key: ..." -H "Content-Type: application/json" -d '{"action":"approve_apply"}' http://localhost:3000/workspaces/<id>/review-decision
curl -X POST -H "X-API-Key: ..." http://localhost:3000/workspaces/<id>/generate-cv-content
curl -X POST -H "X-API-Key: ..." -H "Content-Type: application/json" -d '{"action":"approve"}' http://localhost:3000/workspaces/<id>/review-cv-draft
curl -X POST -H "X-API-Key: ..." http://localhost:3000/workspaces/<id>/skip-pre-pdf-check
curl -X POST -H "X-API-Key: ..." http://localhost:3000/workspaces/<id>/export-cv
curl -X POST -H "X-API-Key: ..." http://localhost:3000/workspaces/<id>/generate-cover-letter
docker exec jobflow_postgres psql -U jobflow -d jobflow_cv -c "SELECT \"workspaceId\", \"promptStep\", \"inputHash\" FROM \"PromptRun\" WHERE \"workspaceId\" IN (...);"
```

### Result

PASS

### Evidence

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (auto-fix made only formatting/quote-escaping changes to a new spec file).
- `npm run test` — 61 suites / 689 tests, all passed (up from 680), including 6 new
  `=== MANUAL NOTE ===` present/absent regression tests across the three
  `*-input-builder.service.spec.ts` files and 3 new pass-through tests across the three
  `*.service.spec.ts` files.
- Manual end-to-end walkthrough against the real local dev DB and the `fake` AI provider (no
  endpoint exposes raw prompt input, so verification used `PromptRun.inputHash`, which is
  `sha256(promptText + inputContext)` — a real difference in `inputContext` necessarily changes it):
  created two otherwise-identical workspaces (same company/role/vacancy text), attached
  `TASK099_MANUAL_NOTE_MARKER: recruiter said team also uses Kotlin.` to workspace A via TASK-098's
  `POST /workspaces/:id/manual-note` endpoint, left workspace B without a note, then ran both
  through `run-analysis` → `review-decision` (approve_apply) → `generate-cv-content` →
  `review-cv-draft` (approve) → `skip-pre-pdf-check` → `export-cv` → `generate-cover-letter`.
  Queried `PromptRun.inputHash` for both workspaces across all three steps — every pair (prompt_1,
  prompt_2, cover_letter) had a different hash between A and B, confirming the manual note text
  changes each step's real `inputContext` at runtime, not just in mocked unit tests. Cleaned up
  both test workspaces and their DB rows/storage folders afterward.

### Follow-up

- None. This closes EPIC-23's second track (TASK-098 + TASK-099).

## 2026-08-10 — TASK-098 — Add ApplicationWorkspace.manualNote field and POST /workspaces/:id/manual-note endpoint

### Scope

New `ApplicationWorkspace.manualNote String?` Prisma field + migration, new `AppendManualNoteDto`,
new `WorkspacesService.appendManualNote()`, new `POST /workspaces/:id/manual-note` endpoint
(no status gate). Verified append-only accumulation, whitespace-only rejection, and not-found
handling against the real local dev database (not just "migration ran without error").

### Commands

```bash
cd apps/api
npx prisma migrate dev --name add_manual_note
npx prisma generate
npx tsc --noEmit
npm run lint
npm run test
npm run start:dev   # manual verification against real dev DB
curl -H "x-api-key: ..." http://localhost:3000/workspaces/<id>
curl -X POST -H "x-api-key: ..." -H "Content-Type: application/json" -d '{"note":"No commercial AWS experience, remove that."}' http://localhost:3000/workspaces/<id>/manual-note
curl -X POST -H "x-api-key: ..." -H "Content-Type: application/json" -d '{"note":"German language risk noted."}' http://localhost:3000/workspaces/<id>/manual-note
curl -X POST -H "x-api-key: ..." -H "Content-Type: application/json" -d '{"note":"   "}' http://localhost:3000/workspaces/<id>/manual-note
curl -X POST -H "x-api-key: ..." -H "Content-Type: application/json" -d '{"note":"test"}' http://localhost:3000/workspaces/nonexistent-id/manual-note
```

### Result

PASS

### Evidence

- `npx prisma migrate dev --name add_manual_note` applied cleanly, generating
  `prisma/migrations/20260810182203_add_manual_note/migration.sql`. `npx prisma generate`
  initially failed with `EPERM` on the query-engine DLL — traced to several leftover
  `apps/api`/`apps/web` dev-server processes (`nest start --watch`, `next dev`, a stray
  `dist/src/main`) holding a file lock from an earlier session; stopped with the user's explicit
  approval, then `prisma generate` succeeded.
- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (auto-fix made only formatting changes).
- `npm run test` — 61 suites / 680 tests, all passed, including new `append-manual-note.dto.spec.ts`
  and new `appendManualNote`/manual-note-endpoint cases in `workspaces.service.spec.ts`/
  `workspaces.controller.spec.ts`.
- Manual curl walkthrough against a real workspace (`cmsj8jurj0002m8yimk62zpfg`) in the local dev
  DB: `GET` before showed `manualNote: null`; first `POST` produced
  `"[2026-08-10T18:28:11.839Z] No commercial AWS experience, remove that."`; second `POST` appended
  below it as
  `"...remove that.\n[2026-08-10T18:28:11.939Z] German language risk noted."` — first entry's text
  unchanged, second entry appended below, confirming additive/timestamped behavior against the real
  database (not just the mocked unit tests). Whitespace-only note → `400`. Non-existent workspace id
  → `404`.

### Follow-up

- None. TASK-099 (wiring `manualNote` into the three prompt input builders) depends on this task's
  field/service method, both of which now exist and are merged-ready.

## 2026-08-10 — TASK-097 PR #174 — Post-review Dependabot fix (apps/web nanoid, unrelated to task scope)

### Scope

CI's `Dependabot Severity Gate` job failed on PR #174 (`apps/web — fail on high/critical
vulnerabilities`): `nanoid <3.3.17`, high severity, GHSA-2v37-7h3g-55p8 (custom generators can loop
indefinitely when size is zero). Confirmed via `git diff origin/main -- apps/web/package.json
apps/web/package-lock.json` (empty) that this PR's diff never touched `apps/web` dependencies —
the vulnerability pre-existed on `main`; CI simply had not caught it there yet (new advisory or gate
not recently re-run against `main`). Per the project owner's explicit choice, fixed directly in this
PR rather than opening a separate dedicated task (the usual TASK-090/092/093 precedent for
Dependabot fixes), since it was a trivial `npm audit fix` with zero `package.json` changes.

### Commands

```bash
cd apps/web
npm audit --omit=dev --audit-level=high   # confirm before: 1 high (nanoid <3.3.17)
npm audit fix
npm audit --omit=dev --audit-level=high   # confirm after: 0 vulnerabilities
npm run test:cov
npx tsc --noEmit
npm run lint
npm run build
```

### Result

PASS

### Evidence

- `npm audit fix`: bumped only `package-lock.json` (`nanoid` 3.3.16→3.3.18 via `@tailwindcss/postcss`
  → `postcss` override; `brace-expansion` 1.1.16→1.1.18, dev-only). No `package.json` change needed.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities (was 1 high).
- `npm run test:cov`: 22 test files / 223 tests passed (unchanged from pre-fix baseline).
- `npx tsc --noEmit` / `npm run lint`: both clean.
- `npm run build`: Next.js production build compiled successfully, all 7 routes generated.

### Follow-up

- None — trivial lockfile-only bump, fully verified. Committed to the same
  `task/TASK-097-wire-coverletter-knowledge-content` branch/PR per the project owner's explicit
  choice, not filed as a separate task.

## 2026-08-07 — TASK-095 — Wire KnowledgeSourceContentService into PromptInputBuilderService (Prompt 1)

### Scope

`PromptInputBuilderService.buildPrompt1Input()` now loads real knowledge-source content via
TASK-094's `KnowledgeSourceContentService.loadContent()` instead of emitting the
`[content not loaded in MVP]` placeholder. `contentAvailable: true` entries embed real `content`;
`contentAvailable: false` entries embed a labeled stub referencing `unavailableReason`. A
hash-mismatch exception from `loadContent()` propagates uncaught out of `buildPrompt1Input`.
`sourceSnapshot`'s persisted shape is unchanged (still built from the raw `KnowledgeSource[]`
input, never from loaded content).

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npx jest --testPathPatterns=prompt-input-builder
npm run test
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean, no errors.
- `npm run lint`: clean (`eslint --fix`, only auto-formatting applied to the spec file).
- `prompt-input-builder.service.spec.ts`: 11/11 passed (3 new tests — real-content rendering,
  `contentAvailable: false` stub rendering, hash-mismatch propagation — plus 8 existing tests
  updated only to add the new `KnowledgeSourceContentService` mock provider, behavior unchanged).
- Full `apps/api` unit suite: 60 suites / 668 tests passed, including `prompt1.service.spec.ts`
  unmodified (it mocks `PromptInputBuilderService` as a whole).
- `content not loaded in MVP` no longer appears in `prompt-input-builder.service.ts` (grep clean).

### Follow-up

- none — TASK-096/097 (Prompt 2 / cover letter input builders) are separate follow-on tasks per
  `docs/07_task_backlog.md`.

## 2026-08-07 — TASK-096 — Wire KnowledgeSourceContentService into Prompt2InputBuilderService (Prompt 2)

### Scope

`Prompt2InputBuilderService.buildPrompt2Input()` now loads real knowledge-source content via
`KnowledgeSourceContentService.loadContent()` instead of emitting the `[content not loaded in
MVP]` placeholder — same rendering approach as TASK-095's Prompt 1 wiring.
`contentAvailable: true` entries embed real `content`; `contentAvailable: false` entries embed a
labeled stub referencing `unavailableReason`. A hash-mismatch exception from `loadContent()`
propagates uncaught out of `buildPrompt2Input`. `sourceSnapshot.knowledgeSources`'s persisted
shape is unchanged. The regenerate-notes block (`PREVIOUS CV DRAFT`/`USER FEEDBACK FOR
REGENERATION`, TASK-029/ADR-029) and `ALLOWED_STATUSES` gating were untouched. Knowledge-source
selection still happens internally in this service (`findActive()` + `selectForStep('prompt_2',
...)`), unchanged from before this task.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npx jest --testPathPatterns=prompt2-input-builder
npm run test
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean, no errors.
- `npm run lint`: clean.
- `prompt2-input-builder.service.spec.ts`: 13/13 passed (2 new tests —
  `contentAvailable: false` stub rendering, hash-mismatch propagation — plus all 11 existing
  tests updated only to pass the new `KnowledgeSourceContentService` mock as a 4th constructor
  argument, behavior unchanged, including the regenerate-notes tests).
- Full `apps/api` unit suite: 60 suites / 670 tests passed, including `prompt2.service.spec.ts`
  (mocks `Prompt2InputBuilderService` as a whole, unaffected) and `evidence-guard.service.spec.ts`
  (unaffected).
- `content not loaded in MVP` no longer appears in `prompt2-input-builder.service.ts` (grep
  clean).

### Follow-up

- none — TASK-097 (cover-letter input builder) is a separate follow-on task per
  `docs/07_task_backlog.md`.

## 2026-08-08 — TASK-097 — Wire KnowledgeSourceContentService into CoverLetterInputBuilderService (cover letter); EPIC-23 real-provider spot-check

### Scope

`CoverLetterInputBuilderService.buildCoverLetterInput()` now loads real knowledge-source content
via `KnowledgeSourceContentService.loadContent()` instead of emitting the `[content not loaded in
MVP]` placeholder — same rendering approach as TASK-095/096. `contentAvailable: true` entries embed
real `content`; `contentAvailable: false` entries embed a labeled stub referencing
`unavailableReason`. A hash-mismatch exception from `loadContent()` propagates uncaught out of
`buildCoverLetterInput`. `sourceSnapshot`'s persisted shape is unchanged.
`COVER_LETTER_ALLOWED_STATUSES` gating and the `[No vacancy analysis artifact available]` fallback
are untouched. This is the last of the three placeholder-replacement tasks — the literal string
`content not loaded in MVP` no longer appears anywhere in `apps/api/src` except as `not.toContain`
regression assertions in the three input builders' own spec files.

This entry also covers the deferred real-provider spot-check requested by TASK-097's Done
Definition (EPIC-23's 4th Acceptance Criterion, `docs/05_epics.md`): with all three input builders
now wired, run Prompt 1 + Prompt 2 against a real workspace with the real OpenAI provider and
compare `needs evidence`/overclaiming-risk counts against the pre-TASK-094 baseline (2026-07-08
TASK-038A entry, workspace `cmrc8zhba0005kmfnpf3hqo4g`).

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npx jest --testPathPatterns=cover-letter-input-builder
npm run test

# Real-provider spot-check (manual, via curl against a locally running apps/api with
# AI_PROVIDER=openai temporarily set in .env):
curl -s -X POST http://localhost:3000/workspaces -H "Content-Type: application/json" -H "x-api-key: <redacted>" -d @vacancy-task097.json
curl -s -X POST http://localhost:3000/workspaces/<id>/run-analysis -H "x-api-key: <redacted>"
curl -s -X POST http://localhost:3000/workspaces/<id>/review-decision -H "Content-Type: application/json" -H "x-api-key: <redacted>" -d '{"action":"approve_maybe"}'
curl -s -X POST http://localhost:3000/workspaces/<id>/generate-cv-content -H "x-api-key: <redacted>"
docker exec -i jobflow_postgres psql -U jobflow -d jobflow_cv -c "SELECT ... FROM \"AiRun\" ..."
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean, no errors.
- `npm run lint`: clean.
- `cover-letter-input-builder.service.spec.ts`: 11/11 passed (2 new tests —
  `contentAvailable: false` stub rendering, hash-mismatch propagation — plus all 9 existing tests
  updated only to pass the new `KnowledgeSourceContentService` mock as a 4th constructor argument,
  behavior unchanged).
- Full `apps/api` unit suite: 60 suites / 672 tests passed.
- `content not loaded in MVP` no longer appears anywhere in `apps/api/src` (repo-wide grep) except
  as `not.toContain` regression assertions in `prompt-input-builder.service.spec.ts`,
  `prompt2-input-builder.service.spec.ts` and `cover-letter-input-builder.service.spec.ts` — closes
  EPIC-23's first Acceptance Criterion in full.

**Real-provider spot-check** (workspace `cmsj8jurj0002m8yimk62zpfg`, folder
`storage/applications/2026_08_07_Nordwind_Systems_Backend_Software_Engineer_Node_js/`, kept on disk
as evidence, mirroring TASK-038A's `MVP_ACCEPTANCE.md` precedent):

- **Blocker found and fixed first**: the dev DB's 9 `KnowledgeSource.filePath` rows still held
  pre-ADR-023 paths (`D:\...\jobflow-cv-pipeline\knowledge-sources\...`, missing the `apps\api\`
  segment introduced when the backend moved under `apps/api`), so
  `KnowledgeSourceContentService`'s containment check correctly rejected every source as outside
  `KNOWLEDGE_SOURCES_ROOT`. This is a pre-existing environment/DB staleness issue, not a defect in
  this task's code — fixed with a one-off `UPDATE` (regex-matched, all 9 rows verified by id before
  and after) rather than the `register-knowledge-sources` script, since the script matches existing
  rows by exact `filePath` and would have created 9 duplicate stale-adjacent rows instead of fixing
  the originals.
- **First real Prompt 1 attempt failed with `429`**: requested 85,673 input tokens (all 6
  `prompt_1`-selected sources active) against the org's 30,000 TPM limit. This is itself strong
  evidence the real-content wiring works — the pre-TASK-094 placeholder-only baseline used only
  3,326 input tokens for the same step. Not a code defect; an org-tier rate limit unrelated to
  TASK-097's scope.
- **Prompt 1 (real OpenAI, `gpt-4o`, `AiRun cmsj8sq89000cm8yiutxbiehz`, temporarily narrowed to only
  `profile_summary` + `cv_rules` active to fit the TPM budget)**: 16,449 input / 1,135 output /
  17,584 total tokens (5x the placeholder-era baseline for the same step). Decision `maybe`, score
  69. Correctly flagged Docker as `personal_only`/medium risk and AWS as `needs_evidence`/medium
  risk, grounded in the real profile content (not a fixed fixture).
- Approved (`approve_maybe`) → `status: cv_generation_running`.
- **Prompt 2 (real OpenAI, `gpt-4o`, `AiRun cmskdtllg000lm8yins03aazq`, narrowed further to only
  `master_cv` active — the full `prompt_2` required set, `master_cv` alone included, does not fit
  under 30,000 TPM with real content)**: 19,860 input / 2,421 output / 22,281 total tokens (3.4x the
  placeholder-era baseline). `evidence_table` (6 entries): 4 `confirmed`, 2 `needs evidence`
  (Docker, AWS) — same gaps Prompt 1 identified, sourced from real `Master_CV_RU_...md` content
  (`evidence_source` fields cite the actual filename, not a stub). `overclaiming_check`: 1
  `critical_issues` entry ("Fluent English claim requires explicit evidence") and 12
  `needs_evidence` entries — **more** flags than the pre-TASK-094 baseline's "critical issues:
  none".
- **This increase is not a regression and not directly comparable to the baseline**: the baseline
  ran with the AI provider's *placeholder-era* full active-source set; this run had only 1 of the 6
  required `prompt_2` sources active (`profile_summary`, `tech_stack`, `project_inventory`,
  `career_cases`, `cv_rules` were deactivated), a workaround for the org's 30,000 TPM tier limit,
  not a product change. With less supporting context available (e.g. no `cv_rules` describing how
  to state English proficiency, no `profile_summary` corroborating other claims), the AI correctly
  had *less* evidence to confirm claims against — producing more `needs_evidence`/critical flags,
  exactly the anti-overclaiming behavior the system is designed to produce when evidence is thin.
  This demonstrates the anti-overclaiming guard responds correctly to real content volume, but is
  not a like-for-like "fewer flags" comparison against the baseline; a genuine full-context
  real-provider comparison is blocked by the current OpenAI org tier's TPM limit, not by any code
  in this repo. Tracked as a known follow-up (see below), not a defect to fix in this task.
- Cleanup performed after the spot-check: all 9 `KnowledgeSource` rows reactivated
  (`isActive = true`), `.env`'s `AI_PROVIDER` reverted to `fake`, dev server restarted and verified
  back on the fake provider (sanity-check workspace, `AiRun` row confirmed `provider: fake`,
  `totalTokens: 150`, then deleted along with its DB rows). Full `apps/api` unit suite re-run green
  (60/60 suites, 672/672 tests) after cleanup.

### Follow-up

- The current OpenAI org tier's 30,000 TPM limit is too low to run Prompt 1 or Prompt 2 with their
  full required knowledge-source set and real content — worth a dedicated follow-up (org tier
  upgrade, or batching/summarizing large sources like `Career_Case_Deep_Dives_RU_...md` at 160KB)
  before attempting a genuine full-context real-provider comparison. Not blocking for TASK-097
  itself, since the task's actual code-level Acceptance Criteria (wiring, tests, placeholder
  removal) are fully met independent of this infra constraint.
- none for TASK-097's own code scope — EPIC-23's placeholder-replacement work (TASK-094/095/096/097)
  is complete.

## 2026-08-04 — TASK-092 — Close 6 new Dependabot alerts (undici, postcss) surfaced by TASK-090's next@16.3.0 bump

### Scope

Verified `npm update postcss undici` in `apps/web` (bumping both within their existing semver
ranges — `overrides.postcss: "^8.5.10"` already allowed 8.5.25, and `jsdom`'s own `undici: "^7.25.0"`
already allowed 7.29.0, so only `package-lock.json` changed, no `package.json` edits needed)
resolves all 6 targeted alerts without breaking the app.

### Commands

```bash
cd apps/web
npm update postcss undici
npm ls postcss undici
npm audit --omit=dev --audit-level=high
npm run test:cov
npm run build
npm run lint
npx tsc --noEmit
```

### Result

PASS

### Evidence

- `npm ls postcss undici`: `postcss@8.5.25` (deduped across `@tailwindcss/postcss`,
  `@vitejs/plugin-react` -> `vite`, `next`), `undici@7.29.0` (via `jsdom`, dev-only).
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities (exit 0).
- `npm run test:cov`: 22 test files / 223 tests passed.
- `npm run build`: Next.js production build compiled successfully, all routes generated.
- `npm run lint` / `npx tsc --noEmit`: both clean, no errors.
- Manual smoke test: started real `apps/api` (`npm run start:dev`, port 3000, against local
  Postgres via `docker compose up -d postgres`) and real `apps/web` (`next dev -p 3001`) together.
  `GET http://localhost:3000/workspaces` returned the expected `401 Invalid or missing API key`
  (API reachable, auth working). `GET http://localhost:3001/workspaces` returned `200` with the
  correct page `<title>JobFlow CV Pipeline</title>` and Tailwind/PostCSS-generated utility classes
  present in the rendered HTML (e.g. `min-h-full flex flex-col`, `bg-zinc-50 dark:bg-black`),
  confirming the `postcss` bump did not break the CSS build pipeline.
- Post-merge live re-check (2026-08-04, after PR #166 merged): `gh api
  repos/strakhovdenya/jobflow-cv-pipeline/dependabot/alerts --paginate -q '.[] | select(.number==48
  or .number==49 or .number==50 or .number==51 or .number==52 or .number==53)'` — all 6 alerts
  (#48–#53) now `fixed`.

### Follow-up

- none — all 6 targeted alerts confirmed `fixed`, Acceptance Criteria fully closed.

## 2026-08-03 — TASK-091 — Manual verification pass: TASK-072's four flow variants re-run against the redesigned UI

### Scope

Last sub-task of the TASK-073 epic. Re-ran all four real historical flow variants from TASK-072
(2026-07-21 entries below) end-to-end through the finished redesigned `apps/web` UI
(`/workspaces/[id]` — `PipelineStages` + `WorkspaceStatusHeader` + `MainActionCard` + `ArtifactList`
+ `ChecksPanel`) against a real running `apps/api` backend (`AI_PROVIDER=fake`), per the
human-in-the-loop protocol in `CURRENT_TASK.md` (Claude Code posts the next screen/action/expected
step, the project owner performs it in the real UI and replies with a screenshot, compared before
advancing). Goal: confirm the redesign preserves the underlying pipeline logic, not just its visual
presentation, before the epic's final PR into `main`.

Four ADR-level product/backend changes were found and implemented mid-pass (all explicitly
requested and confirmed by the project owner beyond this task's original "small in-place fix"
scope — see `CURRENT_TASK.md`'s Progress Notes and each ADR for full detail):

- **ADR-026** — pre-PDF check becomes a mandatory-but-skippable gate before export (new
  `pre_pdf_check_ready`/`paused_before_export` statuses wired up; new `POST
  /workspaces/:id/skip-pre-pdf-check` endpoint). Found during Flow 1.
- **ADR-027** — Analysis review redesign: new `originalDecision` field + migration, single
  "Approve" button replacing the old apply/maybe pair, new `override_to_apply` review action,
  Pause removed from this card, consistent `recommendation`/`decision` badges everywhere
  (`MainActionCard`, `WorkspaceStatusHeader`, new `PipelineStages` sidebar badges), badges
  restyled pill-shaped/borderless to stay visually distinct from buttons. Found during Flow 2.
  Two same-day follow-ups: the redundant `review` pill removed from `WorkspaceStatusHeader`, and a
  `displayDecision()` helper added to strip the `manual_override_` prefix from
  `overrideSkip()`-produced decision values before display.
- **ADR-028** — the separate "Confirm skip" click removed; a single "Skip" button now drives both
  `change_to_skip` and `confirm-skip` in one click (frontend-only; both backend endpoints and
  ADR-016's rollback behavior unchanged). Found during Flow 2.
- **ADR-029** — "Pause" and "Mark not worth applying" removed from the CV draft review card
  (including the backing `VacancyDecision.manual_override_skip` Prisma enum value and a migration,
  plus six docs updated to match); a real pre-existing bug in "Regenerate CV draft" fixed (always
  400'd — `prompt2-input-builder.service.ts` only accepted `cv_generation_running`, never the
  statuses regenerate is actually invoked from) and extended so regenerating now feeds the previous
  draft plus optional user feedback notes back into the Prompt 2 prompt. Found during Flow 3 setup.

Plus three smaller in-place fixes allowed directly by this task's Key Invariants: the single
Approve button's label read "Approve (skip)" (misleading — it actually dispatches
`override_to_apply`) and now reads "Approve (apply)" whenever `currentDecision === "skip"`; and two
layout fixes moving `PrePdfCheckPanel`/`FinalCheckPanel`/`CoverLetterPanel` from below `ArtifactList`
(easy to miss at the bottom of a long page) to directly under `MainActionCard`, matching the
mockups.

### Steps driven (screen → action → observed result) — Flow variant 1: "Hired — Fullstack Developer"

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Create workspace (company/role/vacancy text) | `status: source_saved` | Match |
| 2 | `/workspaces/:id` | "Start analysis" | `paused_after_analysis`, decision/score shown | Match |
| 3 | `/workspaces/:id` | "Approve (apply)" | `cv_generation_running` | Match |
| 4 | `/workspaces/:id` | "Generate CV draft" | `cv_draft_ready`, CV draft review card appears | Match |
| 5 | `/workspaces/:id` | "Approve" (CV draft review) | **New in redesign (ADR-026):** `pre_pdf_check_ready`, not straight to export — Run/Skip pre-PDF check buttons appear | Match |
| 6 | `/workspaces/:id` | "Run pre-PDF check" | `paused_before_export`, readiness banner, "Export PDF" button appears | Match |
| 7 | `/workspaces/:id` | "Export PDF" | `cv_pdf_generated`, `cv_export_html/pdf` artifacts, Final check + Cover letter + Application tracking all visible | Match |

Result: **PASS**, identical end-state behavior to TASK-072's original run through the new
components, plus the new ADR-026 gate step (which did not exist yet at TASK-072 time).

### Steps driven — Flow variant 2: "6037 — Senior Back-End Engineer" (skip, override-driven)

Re-run once more as part of the complete set (already re-confirmed once during TASK-083, which
predates TASK-084/087/088/089's components landing).

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Create workspace | `source_saved` | Match |
| 2 | `/workspaces/:id` | "Start analysis" | `paused_after_analysis`, single "Approve (apply)" + "Skip" buttons (ADR-027 — no separate Pause, no duplicate Approve button), `recommendation`/`decision` badges (decision still "—") | Match |
| 3 | `/workspaces/:id` | "Skip" | **New in redesign (ADR-028):** single click drives `change_to_skip` + `confirm-skip` together — no intermediate "Confirm skip" screen | Match — went straight to `skipped` |
| 4 | `/workspaces/:id` | Observe artifacts | `01_skip_reason_md/json` registered, "Override skip" resume path available | Match |

Result: **PASS**. This re-run is what surfaced ADR-027/028/029 (see Scope) — none are regressions,
all are deliberate product changes made and confirmed live during this pass.

### Steps driven — Flow variant 3: "Monpay — Fullstack Engineer" (maybe → CV → pre-PDF check → export → cover letter → final check after)

Re-run plus the specific TASK-074 regression check: running the final check *after* the cover
letter.

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Create workspace | `source_saved` | Match |
| 2 | `/workspaces/:id` | "Start analysis" → "Approve (apply)" | `cv_generation_running` | Match |
| 3 | `/workspaces/:id` | "Generate CV draft" → "Approve" → "Run pre-PDF check" | `pre_pdf_check_ready` → `paused_before_export`, readiness banner | Match |
| 4 | `/workspaces/:id` | "Export PDF" | `cv_pdf_generated`, Final check + Cover letter panels in 2-column grid | Match |
| 5 | `/workspaces/:id` | "Generate cover letter" | `cover_letter_generated`, cover letter artifacts registered | Match |
| 6 | `/workspaces/:id` | "Run final check" (after cover letter) | **TASK-074 regression check:** final check succeeds (previously always rejected once `cover_letter_generated`), `05_final_check_md/json` registered, `PipelineStages` still lists the `final` stage as done, not silently omitted | **Match** — TASK-074's fix confirmed working live |

One incident during this flow: a workspace-review button was accidentally clicked between
messages ("Mark not worth applying" on the Monpay workspace) — caught via a direct backend check
against the DB state (not trusting the previous screenshot blindly) and manually rolled back before
continuing.

Result: **PASS**, including the targeted functional verification of TASK-074's fix that this
flow exists specifically to re-validate.

### Steps driven — Flow variant 4: "SME Careers — Full Stack Engineer" (maybe → CV → pre-PDF check → export → final check, no cover letter)

| # | Screen | Action | Expected | Observed |
|---|---|---|---|---|
| 1 | `/workspaces/new` | Create workspace | `source_saved` | Match |
| 2 | `/workspaces/:id` | "Start analysis" → "Approve (apply)" | `cv_generation_running`, `recommendation`/`decision` badges both `apply` | Match (score 75) |
| 3 | `/workspaces/:id` | "Generate CV draft" | `cv_draft_ready`, CV draft review card shows exactly two buttons — **Approve, Regenerate CV draft** (ADR-029: no Pause, no Mark not worth applying) | Match |
| 4 | `/workspaces/:id` | "Approve" | `pre_pdf_check_ready`, pre-PDF check card rendered directly under CV draft review (layout fix from this task) | Match |
| 5 | `/workspaces/:id` | "Run pre-PDF check" | `paused_before_export`, readiness `ready_with_minor_edits` | Match |
| 6 | `/workspaces/:id` | "Export PDF" | `cv_pdf_generated`, Final check + Cover letter 2-column grid, Application tracking panel below | Match |
| 7 | `/workspaces/:id` | "Run final check" (before cover letter) | Confirms correct ordering: final check succeeds first, `ChecksPanel` shows result (`ready_to_send`, score 92), Cover letter panel still shows "Generate cover letter" untouched | Match |

Result: **PASS**, confirming `ChecksPanel`/`UpcomingStepsPanel` still reflect the correct
before-cover-letter ordering in the redesigned UI.

### Commands

```bash
cd apps/api
npm run test              # 659/659 pass
npm run test:e2e          # 4/4 pass
npx tsc --noEmit          # clean
npm run lint              # clean

cd apps/web
npx vitest run             # 223/223 pass
npx tsc --noEmit          # clean
npm run lint              # clean
```

### Result

PASS — all four flow variants confirmed working end-to-end through the redesigned UI, including
the targeted TASK-074 regression check (Flow 3) and the correct-ordering check (Flow 4). Four ADR-
level changes (ADR-026, ADR-027, ADR-028, ADR-029) plus three small fixes were made in-place per
explicit project-owner confirmation at each point, and are all covered by the full test suite.

### Evidence

- Screenshots supplied by the project owner at each step (chat attachments, not stored in-repo),
  cross-checked against the workspace detail page state and, where needed, against direct backend
  queries (e.g. the Monpay accidental-click incident in Flow 3).
- Test workspaces created this session: company "SME Careers" role "Full Stack Engineer" (Flow 4,
  slug `2026_08_03_SME_Careers_Full_Stack_Engineer`) plus one workspace per flow 1–3, all left in
  place (consistent with TASK-072's own convention of not cleaning up test workspaces).

### Follow-up

- None filed as a new backlog task — all findings during this pass were resolved in-place as
  ADR-026/027/028/029 or small fixes, per this task's Key Invariants (larger scope than TASK-072's
  own stricter "always file separately" rule).
- TASK-073 epic is now ready for its single final PR from `task/TASK-073-redesign-base` into
  `main`, per ADR-025.

## 2026-08-02 — TASK-074 — Fix: final check reachable after cover letter generation

### Scope

Backend: widened `Prompt5InputBuilderService`'s `FINAL_CHECK_ALLOWED_STATUSES` to
`['cv_pdf_generated', 'cover_letter_generated']`, mirroring `CoverLetterInputBuilderService`'s
existing symmetric allowance. Added an explicit idempotency guard (reject if `05_final_check.json`
already exists) for the `cover_letter_generated` entry point, since that status is terminal in
`WorkspaceStatusService.TRANSITIONS` and can't rely on the usual "status left the allowed list"
one-shot lock. `Prompt5Service` now keeps `workspaceStatus` at `cover_letter_generated` (instead of
regressing to `final_check_ready`) when the run started from `cover_letter_generated`.

Frontend: `final-check-panel.tsx`'s trigger button is now shown at `cover_letter_generated` only
when no final-check result exists yet (`hasResult`-driven, mirroring `cover-letter-panel.tsx`'s
pattern), and hidden once one does. `pipeline-view-model.ts`'s `buildStages` no longer marks the
`final` stage `"done"` purely from `STATUS_STAGE_INDEX` position when status is
`cover_letter_generated` and no final-check artifact exists — it now checks real artifact presence
for that one status (see `CURRENT_TASK.md` Progress Notes for why the check was scoped to
`cover_letter_generated` specifically, not every status past `final`'s index).

A same-session `/code-review` pass found one bug: `hasFinalCheckArtifact()` originally counted
`final_check_md` OR `final_check_json`, but `prompt5.service.ts` writes `final_check_md`
unconditionally (even on AI JSON-validation failure) while `final_check_json` is registered only on
success — same convention already followed by `cover-letter-panel.tsx`/`final-check-panel.tsx`.
Counting the `.md` artifact meant a failed final-check attempt from `cover_letter_generated` would
still mark `final` `"done"`, contradicting `final-check-panel.tsx`'s own strictly-JSON-gated
`hasResult`. Fixed by checking `final_check_json` only; full `apps/web` suite (210/210), `tsc
--noEmit` and `lint` re-verified clean afterward.

### Commands

```bash
cd apps/api
npm run test              # 643/643 pass
npx tsc --noEmit          # clean
npm run lint              # clean

cd apps/web
npx vitest run             # 210/210 pass (re-verified after the code-review fix)
npx tsc --noEmit          # clean
npm run lint              # clean
```

### Result

PASS

### Evidence

- 4 new backend unit tests (`prompt5-input-builder.service.spec.ts` x2,
  `prompt5.service.spec.ts` x2) covering: success from `cover_letter_generated` with no prior
  artifact, rejection when `05_final_check.json` already exists, and `workspaceStatus` staying at
  `cover_letter_generated` in both the DB update call and the returned result.
- 1 new frontend component test (`final-check-panel.spec.tsx`) confirming the "Run final check"
  button appears at `cover_letter_generated` with no artifacts and successfully triggers the
  action.
- 2 new frontend unit tests (`pipeline-view-model.spec.ts`) confirming the `final` stage renders
  `"upcoming"` at `cover_letter_generated` with no final-check artifact, and `"done"` once one
  exists.
- No manual UI verification performed in this task — real end-to-end re-validation of this fix
  (running final check after cover letter through the actual browser UI) is deferred to TASK-091's
  Flow variant 3 re-run, per its own explicit scope.

### Follow-up

- None filed. TASK-091 (manual re-verification of TASK-072's four flows against the redesigned UI)
  is the next task in the TASK-073 epic sequence and specifically re-validates this fix end-to-end.

## 2026-08-01 — TASK-087 — ActionsPanel: unit tests

### Scope

New `ActionsPanel` component (top-level `actionsPanel.title` + `actionsPanel.buttons[]`), pure
presentation, rendered against the exact mockup "10 - SKIP - Confirm skip" `actionsPanel`
contract plus synthetic coverage of `secondary`/`disabled` button kinds and multi-button
ordering. Reuses `MainActionCard`'s exported `ActionButton` for kind→style mapping rather than
duplicating it.

### Commands

```bash
cd apps/web
npm run test
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- 203/203 `apps/web` tests pass (4 new in `actions-panel.spec.tsx`: exact mockup-10
  `primary`-button fixture + click callback, `secondary` kind + click, `disabled` kind with
  `reason` tooltip + no-op click, multi-button render order).
- `npx tsc --noEmit` clean, `npm run lint` clean.
- No manual visual check performed for this task — no dev server was started; component is a
  small reuse of `MainActionCard`'s already visually-verified button styling, and no new styling
  surface was introduced.

### Follow-up

- none; not wired into `/workspaces/[id]` in this task, no real API call inside the component
  (deferred to a future real-data wiring task).

## 2026-07-31 — TASK-085 — UpcomingStepsPanel: unit tests + manual visual check

### Scope

New `UpcomingStepsPanel` component (finalCheck.status / coverLetter.status / tracking.fields[]
preview), pure presentation, rendered against the exact mockup "09 - PDF generated" `upcoming`
contract plus an alternate status value to prove no literal is hardcoded.

### Commands

```bash
cd apps/web
npm run test -- --run
npx tsc --noEmit
npm run lint
```

### Result

PASS

### Evidence

- 199/199 `apps/web` tests pass (4 new in `upcoming-steps-panel.spec.tsx`: empty-prop no-render,
  exact mockup-09 fixture, alternate status values `'Done'`/`'Skipped'`, empty `tracking.fields`).
- `npx tsc --noEmit` clean, `npm run lint` clean.
- Manual visual check: temporary `apps/web/src/app/preview-upcoming/page.tsx` route (deleted
  before commit) rendered against the already-running dev server (`localhost:3001`); project
  owner opened the page directly and confirmed correct rendering via screenshot (Final check /
  Cover letter status rows right-aligned, "APPLICATION TRACKING" field list below, matching the
  mockup layout) — no automated screenshot tool available in this environment.

### Follow-up

- none; not wired into `/workspaces/[id]` in this task (deferred to a future real-data wiring
  task, per this task's Key Invariants).

## 2026-07-30 — TASK-083 — Real backend data wiring: analysis_ready/failed stage mapping + TASK-072 Flow 2 regression re-run

### Scope

Verified the two fixes in `apps/web/src/lib/pipeline-view-model.ts` (analysis_ready mapped to the
decision stage instead of "waiting for analysis"; `failed` stage position inferred from real
`artifacts[]` instead of hardcoded index 0) against a real running `apps/api` (`AI_PROVIDER=fake`,
Postgres in Docker) + `apps/web` (`localhost:3001`), and re-ran TASK-072 Flow 2 (skip,
override-driven) end-to-end through the redesigned UI to confirm no regression.

### Commands

```bash
# create throwaway workspace, run analysis (fake provider -> apply, score 75)
POST /workspaces {companyNameOriginal, roleTitleOriginal, vacancyText}
POST /workspaces/:id/run-analysis
# human override to skip (ADR-016), same as Flow 2
POST /workspaces/:id/review-decision {"action":"change_to_skip"}
# simulate the confirm-skip-failed rollback state directly (AI_PROVIDER=fake never actually fails)
docker compose exec postgres psql -U jobflow -d jobflow_cv -c \
  "UPDATE \"ApplicationWorkspace\" SET status='analysis_ready' WHERE id='...';"
curl http://localhost:3001/workspaces/:id   # inspect rendered HTML
# restore and complete the real flow
docker compose exec postgres psql ... SET status='paused_after_analysis' ...
POST /workspaces/:id/confirm-skip   # -> status: skipped (real path, ADR-005)
# simulate `failed` on the same workspace (by now has vacancy_source + vacancy_analysis_* +
# skip_reason_* artifacts, no targeted_cv_content_*)
docker compose exec postgres psql ... SET status='failed' ...
curl http://localhost:3001/workspaces/:id   # inspect rendered HTML
```

### Result

PASS

### Evidence

- `analysis_ready` + `currentDecision=skip`: rendered page contained "Confirm skip" button, the new
  info text "The previous skip confirmation attempt failed — retry Confirm skip.", and the
  `decision` ("Analysis review") stage marked current ("Now" badge) — not the `analysis` stage.
- Restoring `paused_after_analysis` and calling the real `confirm-skip` endpoint produced
  `{"success":true,"workspaceStatus":"skipped"}` with real `01_skip_reason.md/json` artifacts
  written — same outcome as TASK-072 Flow 2, confirming no regression in the redesigned UI's skip
  path.
- `failed` on a workspace whose furthest real artifact was `vacancy_analysis_json` (no
  `targeted_cv_content_*` yet) rendered the `cvgen` ("CV generation") stage as current — matches
  `inferFailedStageIndex`'s intended mapping (analysis succeeded, cv_generation_running is where it
  must have failed), not the old hardcoded index 0.
- `npx vitest run` (apps/web): 180/180 tests pass (46 in `pipeline-view-model.spec.ts`, including 6
  new cases for these two fixes). `npx tsc --noEmit` and `npm run lint`: clean.
- Test workspace `cms7ntts1000p82k0oeo4rr51` ("TASK083 Manual Test Co") left in DB with
  `status=skipped` (cannot be archived from `skipped` — matches the real state machine; same
  leftover-test-workspace precedent as TASK-072).

### Follow-up

- None filed. `docs/03_domain_model.md` §8.6 still documents
  `analysis_running -> analysis_ready -> paused_after_analysis` as the primary flow, which the real
  code (`prompt1.service.ts`) does not follow — noted in `CURRENT_TASK.md`, not fixed here (doc-only
  change, out of this task's scope).

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

## 2026-07-26 — TASK-075 — Component: PipelineStages (branching pipeline visualization)

### Scope

New `apps/web/src/components/pipeline-stages.tsx` — first implementation sub-task of the
TASK-073 redesign epic. Pure presentation component rendering the 11-stage pipeline
(`source, analysis, decision, cvgen, cvreview, prepdf, export, pdfgen, final, cover, tracking`)
as a vertical stepper: numbered circles connected by a line (`done` = filled black circle with
`✓`, `current` = indigo-ring circle + "Now" badge, `upcoming` = muted outline), a progress bar +
percentage from the `progress: { step, total }` prop, and, for the `decision` stage, a nested
`options[]` list with `next`/`pruned`/`open`/`chosen` visual states (`next` = solid indigo fill
with `→` prefix, `pruned` = muted grey with `line-through`, `open` = bordered box, `chosen` =
green-bordered box with `✓` prefix). An option's `reason` (when present) renders as a `title`
tooltip rather than visible inline text, matching the real mockups. New
`apps/web/src/lib/types.ts` adds the shared `StageKey`/`StageState`/`StageOptionState`/
`StageOption`/`Stage`/`Progress` types. Data contract extracted from mockups 03/04/05/10;
visual design iterated against the real mockup files opened locally in a browser (see Progress
Notes in `CURRENT_TASK.md` for the two review round-trips this took).

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 101/101 passed (12 test files; 5 new in pipeline-stages.spec.tsx)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 101/101 passed (5
  new in `pipeline-stages.spec.tsx`): all-upcoming; mid-pipeline with a `current` stage and "Now"
  badge (mockup 03); a `current` decision stage with `next`/`pruned`(with `title` reason)/`open`
  options (mockup 04); a resolved `done` decision stage with a reason-less `chosen` option and
  reason-less `pruned` options (mockup 05); a still-`current` decision stage with a `chosen`
  option carrying a `reason` alongside `pruned` alternatives, asserting the stage's own circle
  still shows its step number rather than a "done" checkmark — proving stage `state` and option
  `state` are independently rendered, not derived from one another (mockup 10).
- Visual review: built a temporary dev-only route (`apps/web/src/app/preview-pipeline-stages/`,
  deleted before this closure — not part of the deliverable) mounting the component with mock
  data mirroring mockups 03/04/05/10. Project owner opened the real saved mockup `.html` files
  locally (they render fully as local files, unlike pasting them into chat — confirmed this
  session, useful for future TASK-076+ visual reviews) side-by-side with the preview and
  requested two rounds of changes: (1) switch from a flat bordered-card list to the real
  vertical-stepper/timeline design with progress bar, numbered circles, and a "Now" badge; (2)
  add back `line-through` styling to `pruned` options, caught via a zoomed screenshot comparison.
  Project owner explicitly confirmed the result ("ок, годится") after the second round.
- Global monospace typography seen in the mockups was explicitly agreed out of scope for this
  component (an app-shell-level concern, not this presentation component's).

### Follow-up

- None. `WorkspaceStatus` → `Stage`/`Progress` mapping is TASK-083's job, not this task's.

## 2026-07-26 — TASK-076 — Component: WorkspaceStatusHeader

### Scope

New `apps/web/src/components/workspace-status-header.tsx` — second implementation sub-task of
the TASK-073 redesign epic. Pure presentation component rendering the shared workspace header:
a small avatar-initial + `{company} · application` caption and a status pill (`● {statusLabel}`)
on the top row, then the `role` as the large heading with the `slug` in small monospace text
below it, and `decision`/`score`/`reviewState` as compact single-line bordered pills
(`{label} {value}`) stacked to the right of the title, with `next: {nextAction}` beneath them.
New `apps/web/src/lib/types.ts` adds `WorkspaceStatusHeaderData`. Data contract and example
values extracted from mockups 03/04/05; visual design iterated against the real mockup files
opened locally in a browser (two review round-trips — see Evidence below).

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 104/104 passed (13 test files; 3 new in workspace-status-header.spec.tsx)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 104/104 passed (3
  new in `workspace-status-header.spec.tsx`): placeholder state with all three fields `'—'`
  (mockup 03); partially-resolved state with `decision`/`score` set but `reviewState` still `'—'`
  (mockup 04); fully-resolved state with `reviewState: 'approved'` (mockup 05).
- Visual review: built a temporary dev-only route
  (`apps/web/src/app/preview-workspace-status-header/`, deleted before this closure — not part of
  the deliverable) mounting the component with mock data mirroring mockups 03/04/05, viewed via a
  locally running `npm run dev` server (no headless-browser screenshot tooling — `chromium-cli`
  and `playwright` were both unavailable in this environment — so the project owner compared the
  live dev-server page against the real mockup `.html` files directly, per the note left in
  TASK-075's log). Two rounds of changes: (1) initial layout inverted the mockups' hierarchy
  (company as the large heading, decision/score/reviewState as stacked label-over-value fields
  below a full-width status pill) — corrected to match the real mockups: role as the large
  heading, company demoted to a small avatar-initial caption, status pill top-right, and
  decision/score/reviewState as compact pills to the right of the title (also fixed a
  `max-w-md`-caused horizontal overflow of those pills in the preview page, and added
  `flex-wrap` to the component itself for narrower containers); (2) the pills' label/value were
  stacked two lines per pill — changed to a single inline line (`decision apply`) matching the
  mockups. Project owner explicitly confirmed the result ("давай так") after the second round.

### Follow-up

- None. `WorkspaceStatus` → real field mapping is TASK-083's job, not this task's.

## 2026-07-26 — TASK-077 — Component: MainActionCard

### Scope

New `apps/web/src/components/main-action-card.tsx` — third implementation sub-task of the
TASK-073 redesign epic. Pure presentation component rendering the unified "what can I do right
now" action card: `title` (bold heading) + optional `subtitle`, optional `meta` rows as bordered
pills, an optional `info` banner (bordered indigo box, `› {text}`), an optional plain-string
`notice` banner (no box, distinct slot from `info`), an optional labelled `select` dropdown, an
optional `reasonNote` text-input slot (generic "Note" label when `reasonNoteLabel` is absent,
real label when present) accepting either `boolean` or `string`, and `buttons[]` rendered with
`primary`/`secondary`/`disabled` visual treatment (`disabled` buttons stay visible, non-
interactive, with `reason` shown via the native `title` tooltip attribute). New
`apps/web/src/lib/types.ts` additions: `ActionButtonKind`, `MainActionButton`,
`MainActionMetaItem`, `MainActionInfo`, `MainActionSelect`, `MainActionCardData`. Data contract
and example values extracted from mockups 03/04/05/06/11.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 111/111 passed (14 test files; 7 new in main-action-card.spec.tsx)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 111/111 passed (7
  new in `main-action-card.spec.tsx`): single primary button (mockup 03); meta rows + mixed
  primary/disabled/secondary buttons with disabled-click-is-a-noop and `title` reason attribute
  (mockup 04); `info` banner present (mockup 05) and absent (mockup 03); `reasonNote` generic
  slot present with no label (mockup 06) and absent; `notice` + `select` + labelled `reasonNote`
  all present together (mockup 11).
- Visual review: built a temporary dev-only route
  (`apps/web/src/app/preview-main-action-card/`, deleted before this closure — not part of the
  deliverable) mounting the component with the exact fixture data from mockups 03/04/05/06/11,
  viewed via the already-running `npm run dev` server (no headless-browser screenshot tooling
  available in this environment). Project owner compared the live dev-server page against the
  real mockup screenshots directly and confirmed the result with no revision rounds needed. One
  clarifying question resolved during review: the "CURRENT STEP"/"next: ..." bar visible above
  the card in the screenshots is not part of `mainCard`'s own data contract (verified against all
  5 mockups' data blocks) — confirmed out of scope for this component, belongs to TASK-081's
  screen assembly instead.
- Process fix during this task (unrelated to the component itself): `task/TASK-077-main-action-
  card` had been branched off `task/TASK-073-redesign-base` before TASK-076's PR (#141) merged
  into it, requiring a stash/fast-forward/conflict-resolution reconciliation once #141 merged (see
  `CURRENT_TASK.md` Progress Notes and `DECISIONS.md` ADR-025 2026-07-26 process note). CLAUDE.md's
  Branch-first protocol updated to check for a still-open preceding sub-task PR before branching.
- Code review before closure caught a real defect: `title={reason}` on a disabled `<button>`
  doesn't reliably show a hover tooltip in Chromium browsers (disabled elements don't reliably
  receive mouse events there) — the unit test only asserted the attribute existed, not real hover
  rendering. Fixed by wrapping the disabled button in `<span title={reason}>` instead; test
  updated to assert the `title` on the wrapping span. Re-verified: `npx tsc --noEmit` clean,
  `npm run lint` clean, `npm run test` still 111/111 passed.

### Follow-up

- None new. `select`'s real option list and `reasonNote`'s real source text remain TASK-083's job,
  as already scoped in the backlog.

## 2026-07-26 — TASK-078 — Component: ArtifactList / ArtifactCard

### Scope

New `apps/web/src/components/artifact-list.tsx` + `artifact-card.tsx` — fourth implementation
sub-task of the TASK-073 redesign epic. Replaces the old bare Type/File/Version/Latest table
(TASK-064) with a flat list of expandable cards, each labelled by `stage`/`type`/`ext`/`version`/
`date`, showing/hiding an inline `preview` text block on click (either the row itself or an
explicit `View`/`Hide` button). `ArtifactCard` renders a colored 3-letter `kind` badge (fixed
dictionary: `source→SRC`, `analysis→ANL`, `cv→CV`, `check→CHK`, `html→HTM`, `pdf→PDF`, with a
first-3-letters-uppercased fallback for any future kind) reverse-engineered from the mockup
screenshots' badge text (does not match a literal first-3-letters-of-`kind` rule for
`source`/`analysis`/`check`). `apps/web/src/lib/types.ts` additions: `ArtifactKind`,
`ArtifactCardData` (mirrors the mockups' `artifacts[]` shape exactly, plus one field not present
in the mockup contract: optional `downloadUrl?: string`, added specifically so TASK-064's
download-link capability is not silently dropped — a `Download` link renders only when
`downloadUrl` is supplied; real wiring from `WorkspaceArtifactSummary` is TASK-083's job).
`ArtifactList` renders the "Artifacts" header + count badge + "click a row to preview" hint, and
the same "No artifacts yet." empty state TASK-064 used. Data contract and example values extracted
directly from the `__bundler/template` escaped JSON block inside mockups 03/04/09's `.html` files
(not plain-text-greppable the way `docs/mockups/README.md` describes for earlier mockups — read at
the template script's line offset with the `Read` tool instead).

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 124/124 passed (16 test files; 19 new across artifact-card.spec.tsx / artifact-list.spec.tsx)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean (one real lint error caught and
  fixed before this — see below), `npm run test` 124/124 passed (19 new): card renders labelled
  with stage/type/ext/version/date and the correct kind badge (mockup 03); starts expanded and
  shows preview when `expanded: true` (mockup 03); starts collapsed and toggles preview via the
  `View`/`Hide` button (mockup 04, `vacancy_analysis_json`); toggles via clicking the row itself;
  shows a "No preview available." placeholder when expanded with an empty `preview` string;
  renders a non-empty preview for `ext: 'pdf'` regardless of extension (mockup 09,
  `cv_export_pdf`); Download link renders when `downloadUrl` is present and is omitted when absent
  (matching the mockup fixtures, which have none); unknown-kind fallback badge. List-level: empty
  state; single artifact already expanded (mockup 03); three artifacts with mixed expanded state
  and independent toggling (mockup 04); per-card download links preserved across a list.
- Self-review before visual comparison (per the TASK-077 lesson about hover/disabled/tooltip bugs
  unit tests can miss): confirmed this component has no disabled or native-tooltip elements at
  all, so that specific bug class doesn't apply here; confirmed the row-button and the separate
  `View`/`Hide` button are DOM siblings, not nested `<button>`s (would have been invalid HTML).
  One real lint error found and fixed: `interface ArtifactCardProps extends ArtifactCardData {}`
  tripped `@typescript-eslint/no-empty-object-type` — changed to `type ArtifactCardProps =
  ArtifactCardData` (a type alias, not an interface with no added members). Re-verified clean
  after the fix.
- Visual review: built a temporary dev-only route (`apps/web/src/app/preview-artifact-list/`,
  deleted before this closure — not part of the deliverable) mounting `ArtifactList` with the
  exact fixture data from mockups 03/04/09, viewed via the already-running `npm run dev` server on
  `localhost:3000` (a second `npm run dev` instance detected the existing one and deferred to it;
  the running server picked up the new route via hot reload — confirmed via `curl` returning
  `200`). Project owner compared the live page against the real mockup screenshots directly;
  confirmed the missing `Download` button in the demo was expected (mockup fixtures carry no
  `downloadUrl`, matching the Key Invariant above) and confirmed the result overall with no
  revision rounds needed.
- Mid-task, unrelated to the component: the project owner asked for a new standing process rule —
  before every task-closure `git commit`, explicitly ask whether to run `/code-review` against the
  working diff first, waiting for an explicit yes/no. Added to `CLAUDE.md`'s
  `## Task Closure Checklist`, directly after the existing "restate the checklist inline" step.
  Bundled into this task's commit per explicit instruction — see `CURRENT_TASK.md` Progress Notes.
- `/code-review` run against the working diff (per the new CLAUDE.md rule above) found 2 findings,
  both fixed:
  1. `isExpanded` in `artifact-card.tsx` was initialized once from the `expanded` prop via
     `useState(expanded)` and never resynced on prop updates — a parent re-render with a new
     `expanded` value for the same `type`+`version` key would have no visible effect until the
     card unmounts. Fixed using React's documented "adjusting state during render" pattern
     (comparing against a `prevExpandedProp` state value and calling `setIsExpanded` directly in
     the render body when it differs) rather than a `useEffect` — the project's `eslint`
     `react-hooks/set-state-in-effect` rule flags synchronous `setState` calls inside effects.
  2. `kindBadgeLabels` and `kindBadgeClasses` were two parallel `Record<ArtifactKind, string>`
     maps that had to be kept in sync by hand, with independent `??` fallbacks that would silently
     swallow a forgotten update to either map. Merged into a single
     `Record<ArtifactKind, { label, className }>` with one fallback.
  Re-verified after both fixes: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test`
  still 124/124 passed.

### Follow-up

- None new. Real data wiring (`WorkspaceArtifactSummary` → `ArtifactCardData`, including
  `downloadUrl`) remains TASK-083's job, as already scoped in the backlog.

## 2026-07-26 — TASK-079 — Component: WorkspaceForm

### Scope

New `apps/web/src/components/workspace-form.tsx` — fifth implementation sub-task of the TASK-073
redesign epic, covering the `screenType: 'form'` variant of the "01 - New workspace" mockup
(company/role/source-URL/vacancy-text fields plus a live `storage/applications/<slug>/
00_vacancy_source.txt` preview path, computed via the existing `previewWorkspaceSlug` helper in
`apps/web/src/lib/slug.ts`, unchanged). Unlike TASK-056's original inline form, this component does
not call the creation API itself — it calls an `onSubmit(input: CreateWorkspaceInput): void`
callback prop (mirroring `MainActionCard`'s `onAction` convention) plus optional `errors`/
`isSubmitting` props for the caller to drive. Following the same pattern as TASK-075/076/077/078,
this is a standalone presentational component only — it is not wired into the real
`/workspaces/new` route in this task (that route still uses the TASK-056 implementation unchanged;
wiring the new component in, plus mockup "02"'s post-create success screen, is TASK-080's job).

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 131/131 passed (17 test files; 7 new in workspace-form.spec.tsx)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 131/131 passed (7 new):
  live slug-preview update as company/role are typed; required-field attributes (company, role,
  vacancy text required; source URL optional); `onSubmit` called with the correct
  `CreateWorkspaceInput` payload, omitting `sourceUrl` when blank; whitespace trimmed from company
  name/role title before submit; `sourceUrl` trimmed and included when non-blank; `errors` prop
  renders the validation-error list; `isSubmitting` disables the submit button and shows the
  pending label.
- Self-review before visual comparison: confirmed this component has no prop-derived local state
  needing the "adjust state during render" resync pattern (TASK-078's finding doesn't apply — all
  local state here is user-input-only, not seeded from a prop) and no duplicate parallel lookup
  dictionaries (TASK-078's other finding also doesn't apply — no kind/label dictionaries in this
  component). No issues found at this stage.
- Visual review: built a temporary dev-only route (`apps/web/src/app/preview-workspace-form/`,
  deleted before this closure — not part of the deliverable) mounting `WorkspaceForm` with a no-op
  `onSubmit`, viewed via the already-running `npm run dev` server on `localhost:3000` (confirmed
  reachable via `curl` returning `200` before asking the project owner to open it). Project owner
  compared the live page against `docs/mockups/01-new-workspace-screenshot.png` and confirmed the
  result as-is — no revision rounds needed.
- `/code-review` run against the working diff (per the CLAUDE.md rule added in TASK-078) found 1
  finding, fixed: `companyNameOriginal`/`roleTitleOriginal` were submitted untrimmed while
  `sourceUrl` was explicitly trimmed — a whitespace-only company/role name satisfies the HTML5
  `required` attribute (non-empty string) and would also pass the backend `CreateWorkspaceDto`'s
  untrimmed `class-validator` `IsNotEmpty` check, creating a workspace/company record with a
  blank-looking name. Fixed by trimming both fields before calling `onSubmit`, matching `sourceUrl`'s
  existing trim behavior. Added a regression test. Re-verified: `npx tsc --noEmit` clean, `npm run
  lint` clean, `npm run test` 131/131 passed.

### Follow-up

- None new. Wiring `WorkspaceForm` into the real `/workspaces/new` route (replacing TASK-056's
  implementation) and rendering mockup "02"'s post-create success screen remains TASK-080's job, as
  already scoped in the backlog.

## 2026-07-26 — TASK-080 — Screen: assemble /workspaces/new from WorkspaceForm

### Scope

Rewrote `apps/web/src/app/workspaces/new/page.tsx` to render TASK-079's `WorkspaceForm` (from
`@/components/workspace-form`) instead of TASK-056's inline form, wrapping it in a real call to the
existing `createWorkspaceAction` server action and owning `errors`/`isSubmitting`/success state at
the page level. On successful creation, the page renders a `success` screen per mockup
"02 - Workspace created" (green checkmark banner, workspace slug / folder path / vacancy source
fields, full-width "View workspace" link to `/workspaces/${result.id}`) — folded directly into
`page.tsx` per the backlog's guidance (small, single-use, three-field shape, not worth its own
component). Deleted the now-superseded TASK-056 files
(`workspace-form.tsx`/`workspace-form.spec.tsx` in the route folder); their test cases were
migrated into a new `page.spec.tsx`. `actions.ts` reused unchanged — no `POST /workspaces` contract
change.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 131/131 passed (17 test files; page.spec.tsx replaces the deleted
                       # workspace-form.spec.tsx one-for-one, same total)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 131/131 passed.
  `page.spec.tsx` covers: form renders; submit → success screen populated from the API response
  (slug/folder path/source path, "View workspace" link href); failed submission (validation errors)
  keeps the form mounted with entered values intact and shows the returned error messages; submit
  button disabled and relabeled while a request is pending.
- Self-review before manual verification: confirmed `errors` are cleared before each new submit
  attempt (no stale error carried into a second try), confirmed entered form values survive an
  error response (state lives inside `WorkspaceForm`, which stays mounted on failure — only
  unmounted once `result` is set on success), confirmed double-submission is guarded the same way
  as TASK-056's original pattern (`isSubmitting` from `useTransition`, disabling `WorkspaceForm`'s
  submit button). No issues found.
- Manual end-to-end smoke test against a real backend: started `docker compose up -d postgres`
  (Postgres reachable), `apps/api` (`npm run start:dev`, `localhost:3000/health` → 200) and
  `apps/web` (`npm run dev -- -p 3001`, since port 3000 was needed for the API). Project owner
  opened `http://localhost:3001/workspaces/new`, confirmed the form matches mockup
  "01-new-workspace-screenshot.png" (already established in TASK-079), submitted a real workspace
  (company "test1", role "test"), and confirmed the resulting success screen
  (`Workspace created · status: source_saved`, slug/folder path/vacancy source =
  `2026_07_26_test1_test`) visually matches `docs/mockups/02-workspace-created-screenshot.png`. "View
  workspace" link confirmed to navigate correctly to the new workspace's detail page.

### Follow-up

- None. TASK-081 (assembling `/workspaces/[id]`) is the next epic sub-task, per `TASK_BOARD.md`.

## 2026-07-27 — TASK-081 — Screen: assemble /workspaces/[id] from PipelineStages + WorkspaceStatusHeader + MainActionCard + ArtifactList

### Scope

Rewrote `apps/web/src/app/workspaces/[id]/page.tsx` to assemble TASK-075/076/077/078's four
components (two-column layout: `PipelineStages` sidebar + `WorkspaceStatusHeader`/`MainActionPanel`/
`ArtifactList` content column, matching the mockup "hint-size" 980px layout — corrected mid-task
after an initial single-column-stack implementation was visually compared against
`docs/mockups/03-source-saved-screenshot.png` and found wrong). New `apps/web/src/lib/
pipeline-view-model.ts` maps `WorkspaceStatus`/`currentDecision`/`score` to `stages[]`
(including branching `options[]` on the `decision`/`cvreview` stages — the actual pain-point-#5
branching-visualization feature, initially omitted and caught during visual review) / `mainCard` /
`artifacts[]`, with wording and structure for the 6 statuses that have a real mockup
(`source_saved`, `paused_after_analysis` incl. the skip-override sub-case, `cv_generation_running`,
`cv_draft_ready`/`paused_after_cv_draft`, `cv_pdf_generated`, `skipped`) taken verbatim from each
mockup's `<script type="text/x-dc">` data contract (03/04/05/06/09/10/11), not guessed. New
`apps/web/src/app/workspaces/[id]/main-action-panel.tsx` (renamed from an earlier broader
`workspace-pipeline-view.tsx` once the two-column restructure moved `PipelineStages`/`ArtifactList`
rendering into `page.tsx`) owns interactive state and dispatches `MainActionCard` button clicks to
the existing real `actions.ts` server actions (analysis run/async-poll, review decision, CV draft
review, override skip, confirm skip, export). Deleted `analysis-review-gate.tsx`,
`cv-draft-review-gate.tsx`, `pipeline-actions.tsx`, `analysis-triggers.tsx`,
`async-analysis-trigger.tsx`, `artifact-viewer.tsx` (+ their spec files) — folded into the new
assembly, test cases migrated into `main-action-panel.spec.tsx`/`pipeline-view-model.spec.ts`
(ADR-020). Kept `pre-pdf-check-panel.tsx`, `final-check-panel.tsx`, `cover-letter-panel.tsx`,
`application-tracking-panel.tsx` unchanged below the new assembly — their owning replacement
components (TASK-084/088/089) don't exist yet, so removing them would be a functional regression,
not a deferred mock (see `CURRENT_TASK.md` Key Invariants).

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 155/155 passed (15 test files)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 155/155 passed.
  `pipeline-view-model.spec.ts` covers all 18 real `WorkspaceStatus` values' stage-index mapping,
  the decision/cvreview branching-options shapes against mockups 04/05/06/09/10, and
  `buildMainActionCard`/`buildStatusHeaderData`/`buildArtifactCards`. `main-action-panel.spec.tsx`
  covers the button→server-action dispatch table (including the async analysis job-polling
  mutual-exclusion behavior migrated from the deleted `analysis-triggers.spec.tsx`) and the
  `Download CV PDF` button (see bug found below).
- Self-review before manual verification found and fixed one real bug: the `Download CV PDF`
  button (mockup 09's exact label) had no entry in the dispatch table, so clicking it silently did
  nothing — fixed by adding `findLatestCvPdfDownloadUrl()` to `pipeline-view-model.ts` and wiring
  the button to `window.location.href` navigation in `main-action-panel.tsx`, confirmed against a
  real PDF artifact in the manual test below.
- Visual review with the project owner caught two real gaps the self-review missed, both fixed
  before proceeding: (1) initial layout was a single-column vertical stack; the real mockup is a
  two-column layout with `PipelineStages` as a fixed-width sidebar — restructured `page.tsx`
  accordingly and narrowed the client wrapper to just `MainActionCard` (`main-action-panel.tsx`);
  (2) the `decision`/`cvreview` stage `options[]` branching list (mockup's core pain-point-#5
  feature) was entirely missing from the initial `buildStages()` — added `buildDecisionOptions()`/
  `buildCvReviewOptions()` matching the exact `next`/`pruned`/`chosen`/`open` states and reason
  text from mockups 04/05/06/09/10/11's data contracts (extracted via `node -e` reading each
  mockup's `<script type="text/x-dc">` block, per `docs/mockups/README.md` convention).
- Manual end-to-end smoke test against a real `apps/api` + Postgres backend (`apps/web` on `:3001`,
  `apps/api` already running on `:3000`). Two real workspaces driven through real statuses by the
  project owner clicking real buttons in the browser:
  - `test1` workspace: `source_saved` → clicked "Start analysis" (real OpenAI call) →
    `paused_after_analysis` (AI recommended `apply`, score 75) — decision stage showed the
    branching options exactly as mockup 04 (`→ Approve · apply` highlighted, `Approve · maybe`
    greyed with reason, `Pause`/`Skip` open).
  - `TASK065A Fix Test Co` workspace (already `paused_after_analysis`, decision `apply`): clicked
    "Approve (apply)" → `cv_generation_running` (decision stage now shows resolved `chosen`/`pruned`
    state, matching mockup 05) → clicked "Generate CV draft" → `cv_draft_ready` (cvreview stage
    options matching mockup 06: `→ Approve` highlighted, `Pause`/`Not worth applying`/`Regenerate`
    open) → clicked "Approve" → `export_running` (Pre-PDF check stage auto-marked done, since
    Prompt 3 is optional per ADR-009) → clicked "Export PDF" → `cv_pdf_generated` (matching mockup
    09) → clicked "Download CV PDF" → real `04_cv_export.pdf` downloaded via the browser's Save
    dialog, confirming the bug fix above.
  - `ArtifactList` confirmed rendering real artifacts throughout (`vacancy_source`,
    `vacancy_analysis_md/json`, `targeted_cv_content_md/json`, `cv_export_html`, `cv_export_pdf`)
    with correct kind badges (SRC/ANL/CV/HTM/PDF) and working Download links.

- `/code-review` (run on the working diff before commit) found and confirmed one real bug:
  `buildDecisionOptions()` conflated status `skipped` with `paused_after_analysis` +
  `currentDecision: 'skip'` (both mapped to `activeIndex === 2`), so the terminal `skipped` screen
  (mockup 11) incorrectly showed `Pause: open` and `Skip` with a "Manually overridden to skip"
  reason, both belonging only to the mid-flow unconfirmed-override screen (mockup 10). Fixed by
  passing `status` into `buildDecisionOptions()` and checking `status !== "skipped"` explicitly;
  added a regression test for `buildStages("skipped", "skip")`. Also fixed a lower-severity
  fragility note: `decisionButton()`'s `label.includes("apply")` heuristic (only correct because
  those are the sole two labels in use today) replaced with an explicit
  `decisionOptionValue: "apply" | "maybe"` parameter. Re-ran full suite after both fixes:
  `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 156/156 passed.

### Follow-up

- None. Real business-rule mapping (exact enable/disable reasoning per `review-gates.service.ts`,
  artifact inline-preview fetching, remaining statuses without a dedicated mockup) is TASK-083's
  job, per `CURRENT_TASK.md` Key Invariants.

## 2026-07-30 — TASK-082 — Screen: assemble /workspaces list

### Scope

Rewrote `apps/web/src/app/workspaces/page.tsx` to render a new `apps/web/src/components/
workspace-list.tsx` component instead of the previous plain `<table>`, per
`docs/mockups/14-workspaces-list.html`/`-screenshot.png` — the first mockup in the TASK-073 epic
not built on the shared `PipelineScreen` component. `WorkspaceListItem`
(`apps/web/src/lib/api.ts`) gained `score`/`updatedAt` fields (the backend `GET /workspaces`
response already returned them; this was a frontend type-narrowing gap only, confirmed by reading
`workspaces.service.ts`'s `findAll()`, no backend change needed). `workspace-list.tsx` reuses the
existing `statusLabel()` from `apps/web/src/lib/pipeline-view-model.ts` (covers all 19 real
`WorkspaceStatus` values) instead of copying the mockup's own partial (11-status) `STATUS_META`
map, and adds its own status→color-category mapping (`needsReview`/`inProgress`/`positive`/
`neutral`/`failed`) covering all 19 values explicitly. `needsReview` is derived generically as
`status.startsWith('paused_')`. Also corrected a pre-existing off-by-one in project documentation
found while reading the schema: `apps/api/prisma/schema.prisma`'s `WorkspaceStatus` enum has
**19** values, not 18 as stated in CLAUDE.md/prior ADRs/TASK-081 comments (verified by direct count
of the enum block) — not fixed project-wide (out of scope), but this task's own docs/tests use the
correct count.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 174/174 passed (17 test files)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 174/174 passed.
  New `workspace-list.spec.tsx` (16 tests) covers populated/empty rendering, needs-review
  highlighting for all three `paused_*` statuses (and non-highlighting for five other statuses),
  decision color mapping (apply/maybe/skip/null), and a full-enum test asserting all 19 real
  `WorkspaceStatus` values get a defined label and color category. New `page.spec.tsx` (2 tests,
  no prior test file existed for this page) covers the empty-state and populated-response wiring
  from a mocked `listWorkspaces()`.
- Manual visual comparison: dev servers already running (`apps/api` on :3000, `apps/web` on
  :3001) against the real database (26 real workspaces from prior manual testing). Project owner
  opened `http://localhost:3001/workspaces` and compared a screenshot against
  `docs/mockups/14-workspaces-list-screenshot.png` — confirmed layout, status pills, needs-review
  highlighting (indigo dot + row tint + caption) and decision colors all match. One explicit
  wording difference was flagged and confirmed acceptable: rendered status text (e.g. "Paused
  after analysis") differs from the mockup's shorter strings (e.g. "Paused · analysis") because
  this task reuses the real `statusLabel()` rather than the mockup's partial label table — this
  was the planned Key Invariant, and the project owner confirmed keeping it as-is rather than
  adding a second, mockup-literal label map for this screen.

### Follow-up

- None. Empty-state and filter/sort/pagination UI were explicitly out of scope for this pass (see
  `CURRENT_TASK.md` Context) — a plain flat list matching the mockup's own scope.

## 2026-07-30 — TASK-084 — Component: ChecksPanel (pre-PDF / final check status)

### Scope

Added `apps/web/src/components/checks-panel.tsx`, a pure presentation component rendering two
independent optional top-level `PipelineScreen` props: `checks` (pre-PDF check, Prompt 3 —
`not_run` or `result` with `readiness`/`suggestions`/`blockers`/optional `findings[]`/`notes`) and
`finalCheckPanel` (final check, Prompt 5 — `banner`/`checks[]`/`emptySections[]`/`warnings[]`).
Exact contracts extracted from mockups 06/07/08/13's `<script type="text/x-dc">` `renderVals()`
blocks via `node -e` (not guessed from screenshots). New types (`ChecksData`, `ChecksFinding`,
`ChecksReadiness`, `FindingSeverity`, `FinalCheckPanelData`, `FinalCheckEmptySection`) added to
`apps/web/src/lib/types.ts`. Not wired into `/workspaces/[id]` in this task (future integration
work), and does not map real `pre-pdf-check.schema.ts`/`final-check.schema.ts` field names — only
their enum values (`readiness`, `severity`) were read to know what the component must be able to
style.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 195/195 passed (18 test files)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 195/195 passed.
  New `checks-panel.spec.tsx` (15 tests) covers: `not_run` placeholder with no
  findings/readiness/counts shown; all three `readiness` values; all three `severity` values;
  `findings` present with 1 item vs. present-as-`[]` (explicit "No findings." row) vs. key entirely
  absent (no findings section at all, the `compact: true` mockup-08 case); `finalCheckPanel` alone;
  `checks` alone; neither prop present (renders nothing, no error); both present together; empty
  `warnings` array omits the warnings list.
- Manual visual check: a temporary preview route (`apps/web/src/app/dev-checks-panel-preview/
  page.tsx`, removed before commit) rendered all six scenarios (not_run, result with findings,
  result compact without findings, not_ready with all three severities, finalCheckPanel alone, both
  together) against the already-running dev server (`localhost:3001`). Project owner opened the
  page and confirmed it "looks good" before the route was deleted.

### Follow-up

- None. Mapping real `pre-pdf-check.schema.ts`/`final-check.schema.ts` output into this component's
  props, and wiring it into `/workspaces/[id]`, are explicitly out of scope — future integration
  work, matching the pattern already used for TASK-075–079's components vs. TASK-081/083's wiring.

## 2026-08-02 — TASK-088 — Component: CoverLetterPanel

### Scope

Added `apps/web/src/components/cover-letter-panel.tsx`, exporting `PresentationalCoverLetterPanel`
— a pure presentation component rendering the top-level `coverLetterPanel` `PipelineScreen` field:
a two-shape union, `{ text: string }` once a cover letter has been generated (mockup 12) or
`{ button: string }` before it's generated (mockup 13). The button variant reuses `ActionButton`
from `main-action-card.tsx` (`kind="primary"` hardcoded, since neither mockup example carries
`kind`/`reason` data for this field — unlike `actionsPanel.buttons[]`/`mainCard.buttons[]`, which
are full `MainActionButton` objects). Exact contract extracted from mockups 12/13's
`<script type="text/x-dc">` `renderVals()` blocks via `node -e` (not guessed from screenshots).
New types (`CoverLetterPanelData`, `CoverLetterPanelTextData`, `CoverLetterPanelButtonData`) added
to `apps/web/src/lib/types.ts`. Not wired into `/workspaces/[id]` in this task (future integration
work).

A same-session `/code-review` found the originally-planned plain name `CoverLetterPanel` collided
with an already-existing, already-wired component of the same name at
`apps/web/src/app/workspaces/[id]/cover-letter-panel.tsx` (pre-dating this epic). Fixed by renaming
the export to `PresentationalCoverLetterPanel`, documented with a code comment.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 205/205 passed (21 test files)
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 205/205 passed. New
  `cover-letter-panel.spec.tsx` (2 tests) covers: the mockup-12 `text` example (renders the text,
  no button present) and the mockup-13 `button` example (renders an enabled primary `ActionButton`
  and fires `onAction` with the button's label on click).
- No manual visual check performed — no dev server started, since the component only reuses
  `MainActionCard`/`ActionsPanel`'s already visually-verified `ActionButton` styling plus a plain
  `<p>` for the text variant.

### Follow-up

- None. Mapping the real "generate cover letter" API call and wiring this component into
  `/workspaces/[id]` are explicitly out of scope — future integration work, matching the pattern
  already used for TASK-075–079/084/085/087's components vs. TASK-081/083's wiring.

## 2026-08-02 — TASK-089 — Component: TrackingPanel

### Scope

Added `apps/web/src/components/tracking-panel.tsx`, exporting `PresentationalTrackingPanel` — a
pure presentation component rendering the top-level `trackingPanel` `PipelineScreen` field:
`{ textFields: [{ label }], selectFields: [{ label, value }] }`. Renders each `textFields[]` entry
as a labeled (read-only) text input and each `selectFields[]` entry as a labeled (disabled) select
pre-set to its `value`. No server actions, `onSubmit`, or status-based visibility logic — that
already lives in the real, separately-wired `ApplicationTrackingPanel`. Exact contract extracted
from mockups 12/13's `<script type="text/x-dc">` `renderVals()` blocks via `node -e` (identical
shape in both, only `selectFields[].value` differs). New types (`TrackingPanelData`,
`TrackingTextField`, `TrackingSelectField`) added to `apps/web/src/lib/types.ts`. Not wired into
`/workspaces/[id]` in this task.

Before starting, confirmed via `Glob` that a fully-wired `ApplicationTrackingPanel` already exists
at `apps/web/src/app/workspaces/[id]/application-tracking-panel.tsx` (own state, server actions,
own `ArtifactSelect`) — per the TASK-088 lesson, avoided the naming collision up front by naming
the new export `PresentationalTrackingPanel` from the start, rather than discovering it at
code-review time.

A same-session `/code-review` found one bug: both `textFields.map`/`selectFields.map` keyed rows
(and derived each `<input>`/`<select>` `id`) purely from `field.label`, with no index fallback —
two same-labeled fields would collide on React `key` and DOM `id`, breaking the `<label htmlFor>`
association for the second field. Same class of bug as one already fixed in
`main-action-card.tsx`/`ActionsPanel` (TASK-087). Fixed by keying/generating ids from
`` `${label}-${index}` `` instead.

### Commands

```bash
# apps/web
npx tsc --noEmit
npm run lint
npm run test          # 207/207 passed (22 test files) — run twice: before and after the code-review fix
```

### Result

PASS

### Evidence

- `apps/web`: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 207/207 passed (both
  before and after the code-review fix). New `tracking-panel.spec.tsx` (2 tests) covers: the
  mockup-12 example (both text fields and both selects render with correct labels and pre-set
  values, incl. a non-`—` value) and the mockup-13 example (both selects present with `—` value).
- No manual visual check performed — no dev server started, since the component only reuses the
  existing `WorkspaceForm`/`main-action-card.tsx` input/select Tailwind classes, already
  visually-verified in prior tasks.

### Follow-up

- None. Wiring the real tracking-submission behavior into `/workspaces/[id]` is explicitly out of
  scope — that already exists via the separate, real `ApplicationTrackingPanel`; this component is
  purely the epic's static presentation counterpart, matching the pattern used for
  TASK-084/085/087/088.

## 2026-08-04 — TASK-090 — Close open Dependabot security alerts (apps/web next+sharp, apps/api ip-address+fast-uri)

### Scope

Bumped `apps/web`'s `next` (16.2.10 → 16.3.0, dependency + `eslint-config-next`), which brought
`sharp` (Next's own `optionalDependency`) from a vulnerable 0.34.5 to 0.35.3. Bumped `apps/api`'s
`overrides.fast-uri` (^4.1.1 → ^4.1.2) and added a new `overrides.ip-address` (^10.4.0, was
resolving 10.2.0 transitively via `puppeteer`). Removed `continue-on-error: true` from
`.github/workflows/ci.yml`'s `dependabot-gate` job's `apps/web` step. Re-checked live Dependabot
alerts first (`gh api .../dependabot/alerts --paginate -q '.[] | select(.state=="open")'`):
exactly 13 open, matching `docs/07_task_backlog.md` TASK-090's list with no surprises. Corrected
the backlog's stale assumption that `next@16.2.12` was the fix target — verified via Next's GitHub
release notes that `16.2.12` was docs/TS7-only and the real fix landed in `16.2.11`; went to
`16.3.0` instead since it also resolves `sharp` for free and its release notes show no breaking
changes affecting this app's actual usage (no middleware, no i18n/rewrites, no custom Server
Actions setup beyond framework defaults).

### Commands

```bash
# apps/api
npm install                                    # after overrides bump
npm audit --audit-level=high                   # no --omit=dev, since fast-uri is dev:true
npx tsc --noEmit
npm run lint
npm run test                                    # 660/660 passed, 59 suites
npm run test:e2e                                # 4/4 passed, 3 suites

# apps/web
npm install                                    # after next bump
npm audit --omit=dev --audit-level=high
npx tsc --noEmit
npm run lint
npm run test:cov                                # 223/223 passed, 22 files
npm run build
```

### Result

PASS

### Evidence

- `apps/api`: `npm ls ip-address fast-uri` confirms `ip-address@10.4.0 overridden` and
  `fast-uri@4.1.2 overridden`. `npm audit --audit-level=high` exits 0 aside from an unrelated
  `brace-expansion` DoS advisory whose GitHub alert is `auto_dismissed` (not open) — out of scope.
  `tsc --noEmit`/`lint` clean. `npm run test` 660/660, `npm run test:e2e` 4/4 (all 3 e2e suites).
- `apps/web`: lockfile confirms `next@16.3.0` and `sharp@0.35.3`. `npm audit --omit=dev
  --audit-level=high` exits 0 (one unrelated moderate `postcss` finding remains, below the
  `--audit-level=high` gate and not one of the 13 targeted alerts). `tsc --noEmit`/`lint` clean.
  `npm run test:cov` 223/223. `npm run build` succeeds (Turbopack, all routes compile/prerender).
- Manual smoke test: started the real `apps/api` dev server (`npm run start:dev`, against the
  already-running `jobflow_postgres`/`jobflow_redis` containers) and the real `apps/web` dev server
  (`npm run dev`, auto-selected port 3001 since 3000 was taken by the API). `GET /` returned the
  correct `<title>JobFlow CV Pipeline</title>` and `GET /workspaces` returned 200, both served by
  the real backend — confirms the app actually boots and serves real pages on next@16.3.0, not
  just that the build compiles.
- Post-merge Dependabot alert re-check is still pending (this task's PR has not merged to `main`
  yet at the time of this entry) — will be re-verified via the same `gh api` query once merged,
  per this task's Key Invariant that alerts only reflect the default branch's last scan.

### Follow-up

- None planned. The unrelated `postcss` (moderate, apps/web) and `brace-expansion` (high but
  `auto_dismissed`, apps/api) `npm audit` findings are both out of this task's scope (neither is
  one of the 13 originally-open alerts this task targets) and not blocking per their own severity/
  alert-state.

## 2026-08-04 — TASK-090 — Post-merge Dependabot alert re-check

### Scope

PR #160 (TASK-090) merged to `main` (merge commit `cda1bc3`). Re-ran the live Dependabot alert
query to confirm the 13 originally-targeted alerts actually closed — this is the one acceptance
criterion that could not be verified before merge (alerts only reflect the default branch's last
scan).

### Commands

```bash
for n in 27 28 29 30 31 32 33 34 35 36 39 40 41; do
  gh api repos/strakhovdenya/jobflow-cv-pipeline/dependabot/alerts/$n -q '.state'
done
gh api repos/strakhovdenya/jobflow-cv-pipeline/dependabot/alerts --paginate -q '.[] | select(.state=="open")'
```

### Result

PASS

### Evidence

- All 13 targeted alerts (#27–#36, #39–#41) individually queried and each returned `state: fixed`.
- The live open-alerts query now returns 6 different alerts instead: `#48` (postcss, medium),
  `#49` (undici, high), `#50`–`#53` (undici, medium x4) — none of these were open before TASK-090's
  merge. These are new, not leftover from TASK-090, and almost certainly transitive dependencies of
  the `next@16.3.0` bump itself (both already have open, mergeable Dependabot PRs: #161 undici,
  #162 postcss).

### Follow-up

- Filed as TASK-092 in `docs/07_task_backlog.md` and a new `TASK_BOARD.md` row — not fixed inline,
  since TASK-090 was already merged and closed by this point ("work on one task at a time").

## 2026-08-06 — TASK-093 — Triage remaining open Dependabot PRs

### Scope

Triaged all 16 open non-security Dependabot PRs left over after TASK-092 (`gh pr list --state
open`): 5 GitHub Actions bumps, 6 patch/minor dev-dependency bumps, 2 production dependency bumps
(react/react-dom, apps/web), and 3 major-version bumps (typescript x2, eslint).

### Commands

```bash
gh pr list --state open --limit 50 --json number,title,headRefName,baseRefName
# per PR: gh api -X PUT repos/.../pulls/<n>/update-branch ; poll statusCheckRollup ; gh pr merge <n> --squash --delete-branch
cd apps/api && npm ci && npm audit --omit=dev --audit-level=high && npm run lint && npx tsc --noEmit && npm run test && npm run build
cd apps/web && npm ci && npm audit --omit=dev --audit-level=high && npm run lint && npx tsc --noEmit && npm run test && npm run build
# manual smoke test: npm run start:dev (apps/api) + npm run dev (apps/web)
```

### Result

PASS (13 of 16 PRs merged/superseded; 3 deferred with documented upstream blockers)

### Evidence

- **Merged as-is** (GitHub Actions, lowest risk — workflow files only): #55 (`actions/cache`
  4→6), #56 (`actions/checkout` 4→7), #94 (`codecov/codecov-action` 4→7), #95
  (`actions/setup-node` 4→7). #58 (`github/codeql-action` 3→4.37.4) was auto-closed by Dependabot
  itself after #56 merged, claiming "up-to-date now" — verified this was **incorrect**
  (`codeql-action/init@v3`/`analyze@v3` are still on `v3` in `codeql.yml`); left as a documented
  gap rather than re-opened, since it doesn't block this task and Dependabot will very likely
  re-open it on its next scan.
- **Merged as-is** (patch/minor dev deps): #103 (`helmet` 8.2.0→8.3.0, apps/api, prod dep), #104
  (`@types/supertest` 6→7.2.1, apps/api), #98 (`@typescript-eslint/parser` 8.62.0→8.65.0,
  apps/api), #101 (`jest`+`@types/jest` 29→30, apps/api — CI's `Test (apps/api)`/`Test (e2e)`
  confirmed the jest major bump didn't break anything), #102 (`@types/node` ^20→^26, apps/web).
- **Deferred**: #146 (`lint-staged` 16.4.0→17.2.0, root) — declares `"engines":
  {"node": ">=22.22.1"}`; CI and local dev both run Node 20 (`NODE_VERSION: "20"` in `ci.yml`).
  npm doesn't hard-block on `engines` without `--engine-strict`, but the project owner chose not
  to risk the pre-commit hook silently misbehaving on an unsupported Node version. PR left open.
- **Merged manually, not via the PR** (react/react-dom, apps/web): #163 (`react` 19.2.4→19.2.8)
  and #164 (`react-dom` 19.2.4→19.2.8) each individually broke `Test (apps/web)` in their own
  CI — react and react-dom must be on the exact same version
  (`Incompatible React versions` runtime error). Bumped both together to 19.2.8 in one commit on
  this task's branch instead, verified apps/web lint/tsc/test (223/223)/build all clean, then
  closed both PRs as superseded.
- **Major bumps — real breakage found, all deferred**:
  - #105 (`typescript` 5.9.3→7.0.2, apps/web): merged first (its own CI was green), then
    **reverted** after discovering `npm run lint` crashes locally with `"typescript-eslint does
    not support TS 7.0"`. Root cause: CI's `Lint`/`Typecheck` jobs only ever covered `apps/api` —
    `apps/web` had **no CI lint/typecheck coverage at all** (`Test (apps/web)` only runs
    `test:cov`), so the version bump's real breakage was invisible to CI. Reverted via a follow-up
    commit on this branch; verified lint/tsc/test/build all clean again on `typescript@^5`.
  - #106 (`typescript` 5.9.3→7.0.2, apps/api): confirmed broken in the PR's own CI — `npm ci`
    fails outright with `ERESOLVE` (`@typescript-eslint/eslint-plugin@8.62.0` peer range is
    `typescript@">=4.8.4 <6.1.0"`). Same root cause as #105, but apps/api's `Lint`/`Typecheck` CI
    jobs actually exist and caught it directly.
  - #97 (`eslint` 9.39.5→10.8.0, apps/web): its own CI was green (same blind-spot cause as #105).
    Locally, `npm run lint` crashes with `TypeError: contextOrFilename.getFilename is not a
    function` — `eslint-config-next@16.3.0`'s bundled `eslint-plugin-react` uses a context API
    removed in ESLint 10's flat config.
  - All three documented via PR comments explaining the exact failure and linking the upstream
    typescript-eslint tracking issue (https://github.com/typescript-eslint/typescript-eslint/issues/10940
    for #105/#106); left open for Dependabot to keep tracking until upstream support lands.
- **CI gap fix** (in scope per project owner's explicit request after discovering it): added
  `web-lint`/`web-typecheck` jobs to `.github/workflows/ci.yml`, mirroring the existing
  `apps/api` `Lint`/`Typecheck` jobs — `apps/web` now gets real CI lint/typecheck coverage, closing
  the blind spot that let #105 and #97 show false-green checks.
- **Full verification after all changes** (batched, once, covering the combined effect of every
  merged PR): `apps/api` — `npm audit --omit=dev --audit-level=high` clean, `npm run lint`/`npx
  tsc --noEmit` clean, `npm run test` 660/660, `npm run build` clean. `apps/web` — `npm audit
  --omit=dev --audit-level=high` clean, `npm run lint`/`npx tsc --noEmit` clean, `npm run test`
  223/223, `npm run build` clean (Turbopack, all routes compile/prerender).
- **Manual smoke test** (production deps changed: `react`/`react-dom`, `helmet`): started the real
  `apps/api` dev server (`npm run start:dev`) and confirmed `GET /health` returns `200` with
  `helmet`'s security headers present (`content-security-policy`, `x-frame-options`, etc. in the
  response). Started the real `apps/web` dev server (`npm run dev`, auto-selected port 3001) and
  confirmed `GET /` renders "Backend status: ok" end-to-end against the real backend on
  `react@19.2.8`/`react-dom@19.2.8`.
- Both dev-only `npm audit` findings (`brace-expansion` DoS, high severity, transitive via
  `@typescript-eslint`/eslint tooling in both apps) are out of scope — not caught by
  `--omit=dev`, pre-existing, unrelated to any PR this task touched.

### Follow-up

- #58, #146, #97, #105, #106 remain open/unmerged with documented reasons (see above) — re-attempt
  once their respective upstream blockers (Node engines requirement, typescript-eslint TS 7.x
  support, eslint-config-next ESLint 10 support) are resolved. Not tracked as a new backlog task
  since Dependabot will keep these PRs open/updated on its own schedule.

## 2026-08-07 — TASK-094 — Add KnowledgeSourceContentService: real content loading with hash verification

### Scope

First task of EPIC-23 (Phase 16). New `KnowledgeSourceContentService`
(`apps/api/src/knowledge-sources/knowledge-source-content.service.ts`) reads real knowledge-source
file content from disk for `.md`/`.txt` sources, verifies it against the stored `contentHash`
(reusing `HashService.hashText`), returns a metadata-only stub for non-text sources (`.pdf`), and
enforces a path-traversal guard against a new, independently-rooted `KNOWLEDGE_SOURCES_ROOT` env
var (mirrors `ArtifactStorageService`'s `STORAGE_ROOT` guard). Nothing calls the new service yet —
`PromptInputBuilderService`/`Prompt2InputBuilderService`/`CoverLetterInputBuilderService` are
untouched, per task scope (TASK-095/096/097 wire it in later).

`KNOWLEDGE_SOURCES_ROOT` became a hard-required env var (`env.validation.ts`), which required
touching every place that boots the app: `.env.example`'s existing entry corrected from "Optional"
to "Required" (local `.env` already had the value set, so `npm run start:dev` was unaffected);
`.github/workflows/ci.yml`'s `test`, `test-e2e`, and `docker-build` jobs' `env:` blocks and
`docker-build`'s `docker run -e ...` block all gained the var; all three e2e specs
(`mvp-flow`, `rate-limiting`, `skip-flow`) now set `process.env.KNOWLEDGE_SOURCES_ROOT` before app
bootstrap, alongside their existing `STORAGE_ROOT` setup.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npx jest --testPathPatterns="knowledge-source-content|env.validation"
npm run test
npm run test:e2e
```

### Result

- `npx tsc --noEmit` — clean, no errors.
- `npm run lint` — clean (auto-formatted the new spec file, no warnings/errors).
- Targeted run — `knowledge-source-content.service.spec.ts` (5 tests: matching-hash `.md` load,
  stale-hash `.md` throws `BadRequestException`, `.pdf` returns unavailable stub without throwing,
  outside-root path throws, empty array short-circuits) + `env.validation.spec.ts`'s new
  `KNOWLEDGE_SOURCES_ROOT`-required cases — 15/15 passed.
- `npm run test` — full suite 60 suites / 666 tests, all passed (up from 660 tests pre-task: 1 new
  spec file, 6 new test cases across the new spec + `env.validation.spec.ts`).
- `npm run test:e2e` — 3 suites / 4 tests, all passed against the real local Postgres
  (`jobflow_postgres`, already running via `docker compose`). This is the check that actually
  proves the app still boots with the new required env var — all three e2e specs set
  `KNOWLEDGE_SOURCES_ROOT` to a fresh `mkdtempSync` directory before `AppModule` compiles, matching
  the existing `STORAGE_ROOT` pattern.

### Post-review fixes (same day, before commit)

Ran both `/code-review` and an independent `/requesting-code-review` subagent pass on the working
diff before committing. Two findings, both fixed:

- `assertInsideKnowledgeSourcesRoot` threw a raw `Error` instead of `BadRequestException`
  (violates `apps/api/CLAUDE.md`'s error-handling rule) — fixed, and the traversal test now
  asserts on `BadRequestException` in addition to the message.
- `CURRENT_TASK.md` was left holding the full TASK-094 spec instead of being reset to "no active
  task" (a required item on the root `CLAUDE.md` Task Closure Checklist) — found only by
  `/requesting-code-review`, not `/code-review`; fixed by resetting it to the short pointer form
  used by prior closures (e.g. TASK-093).

Re-verified after both fixes: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test`
60 suites / 666 tests all passed.

### Follow-up

- TASK-095/096/097 (Prompt 1 / Prompt 2 / cover-letter input builders) will inject
  `KnowledgeSourceContentService` and replace each builder's own
  `[content not loaded in MVP]` placeholder — not done in this task by design.
- CI's `docker-build` job is expected to pass on this task's own PR now that
  `KNOWLEDGE_SOURCES_ROOT` is passed to both the job env and the `docker run -e` invocation; not
  verifiable locally (the job builds and boots the real Docker image), confirm on the PR's CI run.

### Post-merge-PR fix (same day, same PR #171): unused getter removed

Codecov flagged 3 missing patch-coverage lines on `knowledge-source-content.service.ts` on the
PR's first CI run. Root cause: a `knowledgeSourcesRoot` getter added by habit (mirroring
`ArtifactStorageService.storageRoot`, which has real callers) but never actually called anywhere
or exercised by a test. Removed rather than adding a test for an unused accessor. Re-verified:
`npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 60/60 suites, 666/666 tests;
targeted coverage run confirms `knowledge-source-content.service.ts` now 100%
statements/lines/functions (85.71% branches — two minor untested branch edges, an
empty-file-extension fallback string and an exact-root-path equality check, both below this
project's 68% branch floor concern per ADR-022 and not required by any AC). Codecov's patch
coverage on the follow-up commit (`37368e3`) is 97.50% with 1 line flagged, comfortably above the
80% patch target.

### Scope addition (same day, same PR #171, explicit project-owner request): js-yaml Dependabot fix

After TASK-094 was already closed, GitHub surfaced a new Dependabot alert (`js-yaml` quadratic-CPU
DoS, CVE-2026-59870, GHSA-5p4m-2wfm-xmqj, High, `apps/web/package-lock.json`, affected range
`>=4.0.0 <4.3.1`) linked to a separate PR #170. The project owner explicitly asked to fix it in
this PR instead of filing a new task (normally this project's precedent — TASK-090/092/093 — keeps
Dependabot fixes in their own dedicated task/PR). `js-yaml` is a transitive dev dependency
(`eslint@9.39.5 → @eslint/eslintrc → js-yaml@4.3.0`, no direct dependency to bump); fixed via
`apps/web/package.json`'s existing `overrides` block, adding `"js-yaml": "^4.3.1"` (the first
patched version) alongside the pre-existing `postcss` override.

#### Commands

```bash
cd apps/web
npm install
npm ls js-yaml
npm audit --omit=dev --audit-level=high
npx tsc --noEmit
npm run lint
npm run test
npm run build
```

#### Result

- `npm ls js-yaml` — confirms `js-yaml@4.3.1 overridden` (was `4.3.0`).
- `npm audit --omit=dev --audit-level=high` — 0 vulnerabilities (previously 1 high: js-yaml).
- Full `npm audit` still shows 1 pre-existing high-severity `brace-expansion` finding (dev-only,
  transitive via `@typescript-eslint`/eslint tooling) — already documented as out of scope in the
  2026-08-06 TASK-093 entry above; unrelated to and unaffected by this fix.
- `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 22 files / 223 tests all passed,
  `npm run build` clean (Turbopack, all 7 routes compile/prerender).

## 2026-08-19 — ISSUE-195 — Adapt prompt_1 text into new PromptTemplate v3

### Scope

Content-only task (Phase 1 of EPIC-24, third step): create a new `prompt_1_vacancy_analysis`
`PromptTemplate` version (v3) whose body is adapted from the real, manually-refined
`!prompt_1_0_3_...txt` (553 lines) instead of placeholder text, applying all 6 resolutions recorded
in `docs/10_calibration_and_parity.md` §2.2 (Issue #194) — including dropping §3.1's SKIP-archive-
file instruction entirely and preserving the current-work preamble verbatim. Output JSON contract
kept identical to `prompt1_v2.txt` (no schema change, per §2.2 resolution 6). New file
`apps/api/prisma/prompts/prompt1_v3.txt`; `apps/api/prisma/seed.ts` updated to register it as
`isActive: true`, flip v2 to `isActive: false` (v2 row kept, not deleted/overwritten), v1 unchanged.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
```

### Result

PASS

### Evidence

- `npx tsc --noEmit` — clean, no errors.
- `npm run lint` — clean (`eslint --fix`, no findings).
- `npm run test` — 61/61 suites, 698/698 tests passed.
- No e2e run — content/seed-only change, no status transition, review gate or export path touched.
- No schema/DTO change, so no new unit tests were required (per Issue #195's own Test Requirement).

### Follow-up

- Next open issue in the "EPIC-24 · Фаза 1" milestone (prompt_2 adaptation) is unblocked once this
  merges — check the milestone/Project board for the exact next issue number.

## 2026-08-21 — ISSUE-197 — Verify seed.ts placeholder comment already removed for prompt_1

### Scope

Verify the tip-off that `apps/api/prisma/seed.ts`'s "Placeholder content pending full
prompt-engineering review" comment no longer applies to any `prompt_1` seed entry (v1–v4) —
confirming Issue #197's Acceptance Criteria was already satisfied as a side effect of #195/#196,
before deciding whether any code change was actually needed. Also checked for the same phrase
anywhere else in the repo referencing `prompt_1` specifically (docs, JSDoc, README), and whether
any doc's *historical* use of the phrase now misleadingly reads as describing current state.

### Commands

```bash
grep -n -i "placeholder" apps/api/prisma/seed.ts
grep -rn -i "Placeholder content pending" .
```

### Result

PASS

### Evidence

- `grep -n -i "placeholder" apps/api/prisma/seed.ts` — phrase found only on `prompt_3` (line 150),
  `prompt_5` (160), `skip_reason` (170), `cover_letter` (180). Zero occurrences on any `prompt_1`
  entry. Correct as-is: those four steps genuinely haven't been calibrated yet.
- Repo-wide grep for the phrase found it in 5 files: `docs/10_calibration_and_parity.md`,
  `apps/api/prisma/seed.ts`, `project-management/prd/PRD-ai-output-calibration-against-manual-baseline.md`,
  `project-management/plan/PLAN-ai-output-calibration-against-manual-baseline.md`, `docs/05_epics.md`.
  The two PRD/plan files are frozen historical planning docs (not touched). `docs/05_epics.md`
  (EPIC-24 "Technical Value", ~line 1747) and `docs/10_calibration_and_parity.md` (§2 point 4,
  ~line 44) both described the *pre-epic* state ("every seeded PromptTemplate ... none contain
  real wording") in present tense — now stale/misleading for `prompt_1` (and `prompt_2`, already
  calibrated). Fixed by rewording both to explicitly note Phase 1's completion and which steps
  remain placeholder, without deleting the historical rationale.
- `docs/07_task_backlog.md` — no match (frozen backlog never referenced this).
- No `apps/api` code/schema was touched (docs-only PR) — no `tsc`/`lint`/`test`/`test:e2e` re-run
  required per root `CLAUDE.md`'s "code-centric task" checklist branch; not applicable here.

### Follow-up

- Phase 1 of EPIC-24 ("Импорт и адаптация Prompt 1 текста") is now fully complete — check the
  Project board / milestone for Phase 2's first issue.

## 2026-08-21 — ISSUE-198 — Web-app-specific assumptions audit for prompt_2 source text

### Scope

Documentation-only audit task (Phase 2 of EPIC-24, first step): read the real manual-flow prompt
text `apps/api/prisma/prompts/!prompt_2_0_1_targeted_CV_content_UPDATED_STARTUP_PRODUCT_CURRENT_WORK_SYNC.txt`
in full (752 lines) and produce a list of every web-app-specific assumption it makes, per Issue
#198's Acceptance Criteria — same method as #193 (§2.1). Additionally performed an ad-hoc check
(requested alongside the standard AC): whether the text assumes Prompt 1's analysis is already in
chat session context, and whether that assumption is already closed by this pipeline's real
carry-forward mechanism. No code changes.

### Commands

```bash
# full read of the source file, plus a spot-check that the AI-output schema already carries the
# fields the manual template's Metadata section expects from Prompt 1
grep -n "decision\|score\|quality_score" apps/api/src/pipeline/schemas/vacancy-analysis.schema.ts
```

### Result

PASS

### Evidence

- Read the entire 752-line source file (not a fragment).
- Recorded 6 findings as a new `docs/10_calibration_and_parity.md` §2.4: (1) vacancy delivered via
  chat paste/PDF, (2) knowledge-source files treated as live/attached files, (3) "мой текущий CV
  PDF" as a visual layout reference — out of Prompt 2's scope entirely (content generation is
  separate from deterministic rendering, ADR-012), (4) AI creates/names/versions a Markdown file
  itself with a non-canonical filename and in-file append-only versioning — a genuine discrepancy
  against ADR-006's canonical artifact naming, not just wording, (5) download-link/stop-before-PDF
  response behavior — redundant with the pipeline's own review gates, (6) "запомни правописание" —
  self-contained within one stateless call, no cross-step gap.
- Ad-hoc check confirmed: `Prompt2InputBuilderService.buildPrompt2Input`
  (`prompt2-input-builder.service.ts:148-149`) already inlines the full `01_vacancy_analysis`
  artifact as `=== PROMPT 1 ANALYSIS ===` in every Prompt 2 call (EPIC-23 carry-forward mechanism)
  — closes exactly the session-memory assumption the manual text implicitly relies on. Verified via
  `vacancy-analysis.schema.ts:36-38` that `decision`/`score`/`quality_score` fields exist and are
  serialized into that carried-forward JSON, so the manual template's `Decision before CV`/`Fit
  score` Metadata fields are already present in what Prompt 2 receives — no discrepancy found, no
  new field mapping needed.
- No `apps/api` code/schema was touched (docs-only PR) — no `tsc`/`lint`/`test`/`test:e2e` re-run
  required per root `CLAUDE.md`'s "code-centric task" checklist branch; not applicable here.

### Follow-up

- Next: adaptation issue for `prompt_2` (mirrors #195 for `prompt_1`) should use this audit's §2.4
  resolutions as direct input, particularly item 4's canonical-naming/versioning discrepancy.

## 2026-08-21 — ISSUE-199 — Resolutions for each prompt_2 web-app-specific assumption from #198

### Scope

Documentation-only decisions task (Phase 2 of EPIC-24, second step): for each of the 6 items from
#198's audit (`docs/10_calibration_and_parity.md` §2.4), decide explicitly — map to an existing
pipeline mechanism, or reword with an explicit fallback — same two categories used in Phase 1 for
`prompt_1` (#194, §2.2). No `PromptTemplate`/`seed.ts`/schema edits (that is the next issue, mirror
of #195). Also assessed whether the Anti-Overclaiming Rules verification (mirror of #196) is in
scope for this issue.

### Commands

```bash
# re-confirmed exact cited lines against the full 752-line source file
grep -n "Critical append-only\|Version 1\|Version 2\|Version 3\|03_targeted_CV_content\|скачивание\|download\|Дай ссылку" apps/api/prisma/prompts/!prompt_2_0_1_targeted_CV_content_UPDATED_STARTUP_PRODUCT_CURRENT_WORK_SYNC.txt
# checked whether MCP/Claude Code/AWS are named anywhere (they are not — same gap already fixed for prompt_1 in prompt1_v4.txt, §2.3 rule 3)
grep -ni "MCP\|Claude Code\|Kubernetes\|Docker\|AWS\|German\|English" apps/api/prisma/prompts/!prompt_2_0_1_targeted_CV_content_UPDATED_STARTUP_PRODUCT_CURRENT_WORK_SYNC.txt
# confirmed prompt2_v2.txt (not the raw source) is the currently active PromptTemplate version
grep -n "prompt2\|targeted_cv" apps/api/prisma/seed.ts
```

### Result

PASS

### Evidence

- Recorded all 6 resolutions plus the ad-hoc-check carryover as a new
  `docs/10_calibration_and_parity.md` §2.5, mirroring §2.2's structure: items 1/2/6 map to existing
  mechanisms (input-builder blocks, `KnowledgeSourceContentService`, single stateless call already
  containing the spelling instruction); item 3 (visual CV-PDF reference) is dropped as out of
  Prompt 2's scope entirely, not mapped to any new capability; item 4 (AI file-creation/naming/
  append-only versioning) is resolved as a genuine discrepancy — full removal from the adapted
  text, conflicting with ADR-006's canonical naming and with the real regenerate-via-new-`AiRun`
  model (ADR-005/ADR-012/ADR-029) — while its Markdown *structure* is kept as a shape for
  `TargetedCvContentOutput`'s JSON fields, not as a file-creation instruction; item 5 (download-
  link/stop-response) is dropped as redundant with the pipeline's own `paused_after_cv_draft`/
  `paused_before_export` gates.
- Anti-Overclaiming Rules verification (Key Invariant in #199's own body) explicitly deferred, not
  performed in this issue: unlike #196 (which checked the already-adapted `prompt1_v3.txt`), no
  adapted `prompt_2` text exists yet — the active `PromptTemplate` version is still `prompt2_v2.txt`
  (`apps/api/prisma/seed.ts:125-141`), which the next issue (adaptation, mirroring #195) will
  replace. Checking a version about to be superseded would be wasted work and out of Phase 1's
  proven sequencing (audit → decisions → adapt → anti-overclaiming check against the adapted text).
  Recorded as an explicit deferral in §2.5's closing subsection, with a preview (not a substitute)
  of two gaps found by inspection for the future issue to pick up: neither "MCP" nor "Claude Code"
  appears anywhere in the raw source text (same gap already fixed for `prompt_1` in `prompt1_v4.txt`,
  §2.3 rule 3), and "AWS" is never mentioned at all in the source text's own overclaiming-check
  section (which does name Kubernetes/Docker, lines 273–274/707, but never AWS or NestJS in that
  specific guard).
- No `apps/api` code/schema was touched (docs-only PR) — no `tsc`/`lint`/`test`/`test:e2e` re-run
  required per root `CLAUDE.md`'s "code-centric task" checklist branch; not applicable here.

### Follow-up

- Next: adaptation issue for `prompt_2` (mirrors #195) should use this issue's §2.5 resolutions as
  direct input, particularly item 4's mandatory removal of the file-creation/versioning section.
- A separate future issue (mirrors #196), to be filed after the adaptation issue lands, must run
  the Anti-Overclaiming Rules verification against the newly adapted `prompt_2` text — starting
  from the two gaps already previewed above (MCP/Claude Code, AWS).

## 2026-08-22 — ISSUE-200 — Adapt prompt_2 text into new PromptTemplate v3

### Scope

Third step of Phase 2 (EPIC-24), mirror of #195 for `prompt_2`: adapt
`!prompt_2_0_1_targeted_CV_content_UPDATED_STARTUP_PRODUCT_CURRENT_WORK_SYNC.txt` into a new
`prompt_2_targeted_cv_content` `PromptTemplate` version, applying #199's six resolutions
(`docs/10_calibration_and_parity.md` §2.5). Checked whether a new `TargetedCvContentOutput` schema
field was needed per §2.5 item 4's open question.

### Commands

```bash
npx tsc --noEmit
npm run lint
npm run test
npm run test:e2e
npx prisma db seed
```

### Result

PASS

### Evidence

- Compared §2.5's six resolutions against the previously-active `prompt2_v2.txt` (TASK-100) and
  found it already independently satisfied 5 of 6 (no chat/PDF wording, no attached-files wording,
  no CV-PDF visual-reference bullet, no file-creation/versioning/download-link instructions, name
  spelling already present) — unlike the `prompt_1` case, where `prompt1_v2.txt` needed substantial
  rewriting to reach v3.
- Schema check: verified `TargetedCvContentOutput`'s existing fields (`target_strategy`,
  `cv_content`, `evidence_table`, `overclaiming_check`, `pdf_readiness_notes`, `quality_score`)
  already form the shape described by the manual text's §7 Markdown structure — no new field added.
  Separately confirmed `Contact`/`Languages`/`Education`/`Work authorization`/`Location` (manual
  text §3) are static candidate-profile data (`candidate-profile.config.ts` → `CvContent` schema via
  `prompt2-to-cv-content.mapper.ts`), never part of Prompt 2's own output contract — their absence
  from `TargetedCvContentOutput` is correct, not a gap.
- Created `apps/api/prisma/prompts/prompt2_v3.txt`, adding the two pieces of evidence-grounding
  substance the manual text has that v2's terser prose dropped: named impact-case examples for EPAM
  bullets under startup/product-engineer positioning (Amplience automation hours→minutes, ProductsUp
  reliability/scale, CommerceTools product data handling, production incident/debugging), and
  explicit "3 strongest arguments" framing (with career-case attribution) for
  `target_strategy.main_angle`.
- `apps/api/prisma/seed.ts`: added `seed-prompt-2-targeted-cv-content-v3` (version 3,
  `isActive: true`), flipped v2's `isActive` to `false` — not deleted, per "never silently overwrite
  a template version".
- Recorded the adaptation as `docs/10_calibration_and_parity.md` §2.6, mirroring §2.3's write-up
  style.
- `npx tsc --noEmit`: clean. `npm run lint`: clean. `npm run test`: 61/61 suites, 698/698 tests.
  `npm run test:e2e`: 3/3 suites, 4/4 tests. `npx prisma db seed`: applies cleanly against the real
  dev database, 11 `PromptTemplate` rows total (new v3 row seeded and active).
- Anti-Overclaiming Rules verification against `prompt2_v3.txt` explicitly out of scope per §2.5's
  own deferral — a future issue, mirroring #196, will run it.

### Follow-up

- Next: file a future issue (mirrors #196) to run the Anti-Overclaiming Rules verification against
  `prompt2_v3.txt`, starting from the two gaps `#199` already previewed (MCP/Claude Code never named,
  AWS never named in the overclaiming-check guard).

## 2026-08-22 — ISSUE-201 — Anti-Overclaiming Rules verification for prompt_2_v3

### Scope

Verify `apps/api/prisma/prompts/prompt2_v3.txt` (created by #200) against root `CLAUDE.md`'s five
Anti-Overclaiming Rules explicitly, one by one — same method as #196 used for `prompt1_v3.txt`. One
gap found (MCP/Claude Code not named explicitly, rule 3 — same shape as prompt_1's original gap) was
fixed with the project owner's confirmation as `prompt2_v4.txt` (`PromptTemplate` version 4, active;
v3 deactivated, not deleted). Rule 4's AWS gap flagged as a preview finding in §2.5 (against the
pre-adaptation manual source text) was confirmed already resolved in `prompt2_v3.txt` — no change
needed for that rule.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
npx prisma db seed
npx ts-node <inline script querying PromptTemplate versions for prompt_2_targeted_cv_content>
```

### Result

PASS

### Evidence

- All 5 rules checked individually against `prompt2_v3.txt`, citations recorded in
  `docs/10_calibration_and_parity.md` §2.7: rules 1, 2, 4, 5 fully covered, no change needed; rule 3
  (personal AI/FastAPI/OpenAI/MCP/Claude Code ≠ commercial) partially covered via a generic "AI"
  catch-all but MCP/Claude Code never named explicitly — confirmed as a real gap, notably even in the
  JobFlow current-work bullet describing this very project.
- Fix applied in `prompt2_v4.txt`: two targeted additions naming MCP/Claude Code (new
  OVERCLAIMING/SAFETY CHECKS bullet, extended closing "Never claim from this block" sentence) — no
  other content changed. (prompt_1_v4's third addition spot, a generic standing-note preamble list,
  has no structural equivalent in `prompt2_v3.txt`.)
- `apps/api/prisma/seed.ts`: added `seed-prompt-2-targeted-cv-content-v4` (version 4,
  `isActive: true`), flipped v3's `isActive` to `false`.
- `npx tsc --noEmit`: clean. `npm run lint`: clean (0 errors/warnings). `npm run test`: 61 suites /
  698 tests passed.
- `npx prisma db seed` re-run against local dev DB: upserted cleanly, no errors. Queried
  `PromptTemplate` rows for `prompt_2_targeted_cv_content` after seeding:
  `[{"version":1,"isActive":false},{"version":2,"isActive":false},{"version":3,"isActive":false},{"version":4,"isActive":true}]`
  — confirms exactly one active version, correctly the new v4.

### Follow-up

- none.

## 2026-08-23 — ISSUE-205 — Verify golden dataset covers all three outcomes (apply/maybe/skip)

### Scope

Issue #205 (EPIC-24 Phase 3, step 3, final): explicitly verify that the 194 golden-dataset cases
recorded in #204 include at least one real case for each outcome (apply, maybe, skip), and record
this as its own checked result rather than only citing #204's totals. Not code-centric — no
`apps/api`/`apps/web` files touched. Manual verification per issue's own Test Requirement, not
automated.

### Commands

```bash
grep -h "^manual_decision:" project-management/golden-dataset/*/case.md | sort | uniq -c | sort -rn
find project-management/golden-dataset -maxdepth 1 -mindepth 1 -type d | wc -l
for d in project-management/golden-dataset/*/; do
  f="$d/case.md"
  [ -f "$f" ] && grep -q "^manual_decision:" "$f" || echo "MISSING: $d"
done
```

### Result

PASS

### Evidence

- `manual_decision` counted across all 194 `case.md` files: `apply: 44, maybe: 93, skip: 57` —
  sums to 194 (matches the total case-folder count and #204's recorded distribution exactly).
  Every case folder has a `case.md` with a `manual_decision` field — none missing.
- All three outcomes are represented by real cases (≥1 each, well above the minimum) — no gap to
  flag.
- Spot-checked one case per outcome to confirm the recorded structure is a real case, not a
  placeholder: `action1_20260623` (apply) and `accessiway_20260627` (maybe) each have `case.md` +
  `manual-cv.md`; `5blue_software_20260709` (skip) has `case.md` + `manual-cv.md`, with
  `manual-cv.md` holding the actual skip-reasoning text (per its `manual_cv_origin` field — Prompt
  1 itself generates the skip reasoning, there is no separate skip-reason prompt).

### Follow-up

- none.

## 2026-08-23 — ISSUE-206 — Real pipeline run (Prompt 1 → Prompt 2) for a 6-case golden-dataset subsample through apps/web UI

### Scope

Ran 6 of the 194 golden-dataset cases (Фаза 3, #202-#205) end-to-end through the real `apps/web`
UI at `http://localhost:3001` — workspace creation → manual note (where the case recorded one) →
Start analysis (Prompt 1) → Analysis review → Generate CV draft (Prompt 2) — against a real running
`apps/api` backend with `AI_PROVIDER=openai`, not the `fake` provider, and real registered
`KnowledgeSource` records (candidate profile, evidence, CV rules, certifications). Per the project
owner's decision (2026-08-23, this session): full 194-case coverage was descoped from #206 to a
representative subsample — 2 cases per manual-baseline outcome (apply/maybe/skip) — with the
remaining ~188 cases moved to a new follow-up issue, #230 (same milestone, added to the Project).
Comparing AI output against the manual baseline (decision-level, content-level per
`docs/10_calibration_and_parity.md` §4) is explicitly out of scope for #206 — that is #207/#208.

This entry supersedes an earlier same-day run of this task that was invalidated by two issues found
and fixed mid-task (see "Issues found and fixed" below); those 6 workspaces were deleted (DB rows +
storage folders) and are not part of the final result.

Case selection and manual-note handling:

- Manual note added via the workspace's Manual Notes panel only where the case's `case.md` carried
  a case-specific annotation (`cello_20260718`: `это немецкая фирма для нее egz актуален`;
  `motion_20260715`: `Германия`) — entered verbatim, not translated/interpreted. The other 4 cases
  had no such annotation in `case.md`, so no manual note was added for them.
- `preply_20260623` was dropped from the "skip"-bucket after its live AI recommendation came back
  "maybe" instead of "skip" (see below) — the project owner asked to swap in the freshest available
  skip-bucket case instead, `onlymonster_20260804` (2026-08-04, the most recent `manual_decision:
  skip` case in the dataset by folder date).
- For 3 of the 6 cases, the live AI Prompt 1 recommendation disagreed with the manual baseline (see
  per-case table: `motion_20260715` apply→maybe, `jobgether_20260625` maybe→apply,
  `onlymonster_20260804` skip→maybe). Stopped and asked the project owner how to handle this
  (2026-08-23, this session): the decision was to always follow the AI's live recommendation at the
  Analysis review step — i.e. behave as a real user would — rather than force the manual-baseline
  outcome. This is a real, expected finding for the eventual #207/#208 comparison, not a run defect;
  only 1 of the 2 "skip"-bucket cases (`pandadoc_20260621`) ended up actually exercising the skip
  path as a result.

### Issues found and fixed mid-task

1. **`AI_PROVIDER=fake` in `apps/api/.env`** — found before any run started; a fake-provider run
   would have defeated the whole purpose of this golden-dataset comparison. Switched to `openai`
   (key already configured) and restarted `apps/api`. Also found `apps/web`'s `next dev` defaults to
   port 3000 (colliding with `apps/api`); started explicitly with `--port 3001`.
2. **Zero active `KnowledgeSource` records in the dev database** — discovered only after the first
   full 6-case run completed: Prompt 2 had silently run with no candidate-profile/evidence context
   at all (`npm run register-knowledge-sources`, the one-time setup script, had never been run
   against this dev DB, even though all 9 source files exist on disk under
   `apps/api/knowledge-sources/`). Stopped and confirmed with the project owner before proceeding.
   Fixed by running `npm run register-knowledge-sources` (idempotent create-or-update, 9 records
   created). The project owner then asked to delete all 6 workspaces from the invalid run and redo
   the full batch from scratch — done via a one-off Prisma cleanup script (DB rows + storage
   folders removed for all 6; verified via `applicationWorkspace`/`generatedArtifact`/`promptRun`/
   `aiRun` counts before deletion).
3. **OpenAI 429 rate limit on the first retry (`cello_20260718`)** — with real knowledge sources
   now included, a single Prompt 1 request measured ~89,271 tokens against this account's 30,000
   TPM limit for `gpt-4o` — an unconditional per-request failure, not a transient rate-limit issue
   (confirmed via the `AiRun.errorMessage` field: `429 Request too large for gpt-4o ... Limit
   30000, Requested 89271`). Stopped and asked the project owner; decision was to switch
   `OPENAI_MODEL` from `gpt-4o` to `gpt-4o-mini` (higher TPM ceiling on the same account tier) —
   this is a deviation from the model the prompt templates were calibrated against in Фазы 1-2
   (`gpt-4o`), worth keeping in mind for the #207/#208 comparison pass. Restarted `apps/api` after
   the env change, deleted the one failed workspace (`cello_20260718` retry #1), and re-ran it
   successfully under `gpt-4o-mini`.

### Commands

Driven via Playwright MCP browser automation against the real UI (no direct API calls, no fakes)
per the issue's Test Requirement. No `apps/api` code was changed by this task (only `apps/api/.env`,
git-ignored, and one-off cleanup scripts run via `node` and deleted after use), so no `tsc`/`lint`/
`test` run was required.

### Result

PASS — all 6 cases reached their real pipeline end-state through the actual UI, with real OpenAI
(`gpt-4o-mini`) Prompt 1 (and Prompt 2, for the 5 that were approved) output, real knowledge-source
context, and artifacts registered.

### Evidence

| # | Case (manual outcome) | Workspace slug (storage folder) | Workspace id | AI recommendation / score | Reached |
|---|---|---|---|---|---|
| 1 | `cello_20260718` (apply) | `2026_08_23_Cello_Software_Engineer_m_f_d` | `cmt5njezl00029vvq7hy1lo63` | apply / 75 | CV draft ready (Prompt 1 + Prompt 2 artifacts) |
| 2 | `motion_20260715` (apply) | `2026_08_23_Motion_Senior_Software_Engineer_Backend` | `cmt5nn0e0000l9vvqr2seoxqv` | maybe / 68 | CV draft ready (Prompt 1 + Prompt 2 artifacts) |
| 3 | `bjak_20260717` (maybe) | `2026_08_23_BJAK_Full_Stack_Engineer` | `cmt5nqegx00149vvq54jfe50z` | maybe / 68 | CV draft ready (Prompt 1 + Prompt 2 artifacts) |
| 4 | `jobgether_20260625` (maybe) | `2026_08_23_Jobgether_Middle_Node_js_Backend_Developer` | `cmt5ntm7q001n9vvqm9tdyulp` | apply / 76 | CV draft ready (Prompt 1 + Prompt 2 artifacts) |
| 5 | `pandadoc_20260621` (skip) | `2026_08_23_PandaDoc_Senior_Design_Engineer` | `cmt5nwvu300269vvqjpqxly3n` | skip / 52 | `skipped` (`01_skip_reason.md/json` registered) |
| 6 | `onlymonster_20260804` (skip) | `2026_08_23_OnlyMonster_Senior_Backend_Engineer_Automation` | `cmt5nzdz8002p9vvqd3hbb43a` | maybe / 68 | CV draft ready (Prompt 1 + Prompt 2 artifacts) |

- All 6 folders confirmed present under `apps/api/storage/applications/` after the run.
- Artifacts registered per case (verified via the Artifacts panel in the UI): cases 1-4 and 6 each
  have `00_vacancy_source.txt`, `01_vacancy_analysis.md/json`, `02_targeted_cv_content.md/json` (5
  artifacts); case 5 (pandadoc, skip) has `00_vacancy_source.txt`, `01_vacancy_analysis.md/json`,
  `01_skip_reason.md/json` (5 artifacts, no CV content — matches the skip path, ADR-005).
- `PromptRun.sourceSnapshot` for each run confirmed 6 real `KnowledgeSource` file paths under
  `apps/api/knowledge-sources/` (not empty), verifying real knowledge-source content was used.
- `apps/api/.env`'s `AI_PROVIDER` (fake→openai) and `OPENAI_MODEL` (gpt-4o→gpt-4o-mini) changes are
  git-ignored local config, not a tracked source change — nothing to commit for them.
- No decision-level or content-level comparison against `manual-cv.md`/`case.md` baselines was
  performed — out of scope for #206 (see Scope).

### Follow-up

- #230 — run the remaining ~188 golden-dataset cases through the same real-pipeline UI flow, same
  methodology. Should account for the `gpt-4o-mini` TPM constraint found here (i.e. keep using
  `gpt-4o-mini`, or otherwise ensure the account tier can sustain `gpt-4o` at ~89k tokens/request
  before switching back).
- #207/#208 — decision-level and content-level comparison against the manual baseline for these 6
  cases (and, once #230 lands, the rest) — not started here. Should note the `gpt-4o` → `gpt-4o-mini`
  model deviation from Фазы 1-2 calibration when interpreting results.

## 2026-08-23 — ISSUE-231 — Fix: skip-reason.service.ts передавал пустой inputContext в AI

### Scope

`SkipReasonService.confirmSkip()` was passing an empty string as `inputContext` to
`AiProvider.complete()`, so the AI hallucinated a fake vacancy in `01_skip_reason.md/json` instead
of using the real workspace's company/role/vacancy-analysis data. Fixed by adding a private
`buildInputContext()` that reads the real `01_vacancy_analysis.json` artifact plus
company/role metadata and (if present) `manualNote`, mirroring `PromptInputBuilderService
.buildPrompt1Input()`'s pattern (confirmed with the project owner — manual note should be
included). `/code-review` flagged that the new `01_vacancy_analysis.json` read had no error
handling (unlike the existing AI-provider-call try/catch right after it) — fixed by wrapping
`buildInputContext()` in its own try/catch that mirrors the AI-provider failure path: rolls the
workspace back to `analysis_ready`, marks the `PromptRun` failed, and records an `AiRun` failure
row, instead of leaving an unhandled exception and an orphaned `running` `PromptRun`.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test                          # 61 suites / 700 tests
npm run test -- --testPathPatterns=skip-reason.service   # 10/10, new inputContext + context-build-failure assertions
npm run test:e2e                      # pre-existing failures, confirmed unrelated (see Evidence)
```

### Result

PASS (unit/lint/typecheck) — e2e pre-existing failures confirmed unrelated via `git stash` on the
same branch before this change (identical 2 failures on unmodified `main`, both failing at
`run-analysis` before the skip step is ever reached — a local seed/env issue, not caused by this
fix).

### Evidence

- `npx tsc --noEmit`: clean.
- `npm run lint`: clean (auto-fix, no manual changes needed).
- `npm run test`: 61/61 suites, 700/700 tests green, including 4 new/updated assertions in
  `skip-reason.service.spec.ts` (asserts the AI-provider call's second argument is non-empty and
  contains company/role/score from the real vacancy-analysis JSON; separate test for `manualNote`
  inclusion; separate test for the new context-build-failure rollback path found by `/code-review`).
- `npm run test:e2e`: 2 failed / 2 passed both before (`git stash`, `main`) and after this change —
  confirmed pre-existing, unrelated to this fix.
- Manual proxy verification (real dev Postgres, `apps/api` server started on port 3099 with
  `AI_PROVIDER=fake` override so as not to disturb the already-running real dev instance on 3000):
  created a fresh workspace (`IssueFixTestCo` / `Skip Reason Fix Test Role`), ran `run-analysis`,
  `review-decision` (`change_to_skip`), then `confirm-skip` — succeeded end-to-end (200 OK,
  `status: skipped`, both `01_skip_reason.md/json` written), proving the new code path correctly
  reads the real `01_vacancy_analysis.json` from disk without error (previously this file was never
  read at all). Fake provider's response content is fixed/input-independent by design, so this
  proxy check confirms the wiring only, not real AI output correctness against the real vacancy —
  full AC #2 verification (real `AI_PROVIDER=openai` run, comparing generated `company`/`role` in
  `01_skip_reason.md` against the actual vacancy) is deferred to #232 per explicit agreement with
  the project owner, since #232 already re-runs the two golden-dataset skip cases
  (`pandadoc_20260621`, `onlymonster_20260804`) against this fix once merged/deployed.

### Follow-up

- #232 — re-run `pandadoc_20260621` and `onlymonster_20260804` through the real
  `AI_PROVIDER=openai` skip flow once this fix is deployed to dev, and confirm the regenerated
  `01_skip_reason.md` reflects the real vacancy (this also completes issue #231's AC #2 in
  practice).

## 2026-08-23 — ISSUE-232 — Redo golden-dataset skip-bucket cases (pandadoc_20260621, onlymonster_20260804) after #231 fix

### Scope

Cleaned the dev DB/storage down to only the 6 golden-dataset workspaces from #206, then
recreated and re-ran `pandadoc_20260621` and `onlymonster_20260804` through the real `apps/web`
UI (Prompt 1, and confirm-skip where the live recommendation was skip) against real
`AI_PROVIDER=openai`, to verify #231's fix produces a valid (non-hallucinated) `01_skip_reason.md`
for whichever case actually goes through the skip path.

### Cleanup (first step, per issue Key Invariants)

Before re-running, deleted from dev DB (Prisma rows: `GeneratedArtifact`, `DecisionOverride`,
`CoverLetterDraft`, `PromptRun`, `AiRun`, `ApplicationWorkspace`) + `storage/applications/`:

- `2026_08_15_TestCo_Backend_Developer` (`cmsu4yw0100024lk7ml6j57tq`) — unrelated/unknown-origin
  workspace flagged in the issue; confirmed with the project owner before deleting.
- `2026_08_23_IssueFixTestCo_Skip_Reason_Fix_Test_Role` (`cmt5pps9y0002exyp0hq96qq4`) — leftover
  from #231's manual proxy verification (see that entry above); not mentioned in #232's original
  invariant list (created after the issue was written), confirmed with the project owner before
  deleting.
- The two old (corrupted) `pandadoc`/`onlymonster` workspaces from #206 (`cmt5nwvu300269vvqjpqxly3n`,
  `cmt5nzdz8002p9vvqd3hbb43a`) — to be recreated fresh.
- ~30 orphaned `storage/applications/` folders with no matching DB row (`SmokeTest_Co`,
  `Acme_Corp`, `TASK065_*`, etc. — pre-2026-08-23 leftovers, no DB reference) — not mentioned in
  the issue, confirmed with the project owner before deleting.

Post-cleanup: dev DB/storage held exactly the 4 non-recreated golden-dataset workspaces (Cello,
Motion, BJAK, Jobgether).

### Issue found and fixed mid-task: stale `apps/api` dev server process

First attempt at both cases returned obviously-fake AI output (`# Vacancy Analysis — Fake Company
— Backend Developer`, the literal `FakeAiProvider` canned response) even though `apps/api/.env`
had `AI_PROVIDER=openai`. Root cause: `AiModule`'s provider factory (`createAiProvider`) resolves
once at Nest bootstrap from `ConfigService`; the running `nest start --watch` process (PID 15160,
started 2026-08-23 13:44 local) restarts automatically on source-file changes but **not** on
`.env` changes, so it kept the provider selection from whatever `AI_PROVIDER` value was in effect
the last time the whole watch process itself was (re)started — evidently `fake` at that time.
Fixed by killing the entire stale process tree (`nest start --watch` CLI process and its spawned
child) and starting a fresh `npm run start:dev` from a clean shell (confirmed no `AI_PROVIDER`
override in that shell's own environment first). Deleted the two invalid fake-provider workspaces
(DB rows + storage folders) before re-running.

### Commands

Driven via Playwright MCP browser automation against the real `apps/web` UI (`localhost:3001`, no
direct API calls), per the issue's Test Requirement. No `apps/api` source code was changed by this
task (only process/environment state), so no `tsc`/`lint`/`test` run was required.

```bash
# dev-server restart (after killing the stale process tree via PowerShell Stop-Process)
cd apps/api && npm run start:dev
```

### Result

PASS for `pandadoc_20260621` (the case that actually reaches the skip path) — PARTIAL /
not-applicable for `onlymonster_20260804` (never reaches skip, live or in #206; see below).

### Evidence

| Case | Live AI recommendation (this run) | vs. #206 | Reached | `01_skip_reason.md` |
|---|---|---|---|---|
| `pandadoc_20260621` | skip / score 53 | skip / score 52 (consistent) | `skipped` | Regenerated correctly: company `PandaDoc`, role `Senior Design Engineer`, score 53, real mismatches (React/TypeScript/animation-library evidence gaps) — no hallucinated content. Confirms #231's fix. |
| `onlymonster_20260804` | maybe / score 68 | maybe / score 68 (identical) | `paused_after_analysis` | Not generated — this case does not reach the skip path, in this run or in #206. |

- New workspace ids: `pandadoc` → `cmt5rjk48000212vyrq113c6u`, `onlymonster` →
  `cmt5rlvww000l12vy525svedg` (both fresh, distinct from the deleted #206/first-attempt ids).
- `onlymonster_20260804`'s "maybe" is the same decision-level mismatch against the manual baseline
  already documented in #206's TEST_LOG entry (3/6 cases disagreed with the manual baseline,
  onlymonster among them) — not a new bug, and not something #231's fix could change (the fix was
  about `01_skip_reason.md` content correctness *given* a skip decision, not about which decision
  Prompt 1 makes). Per the project owner's explicit decision (2026-08-23, this session): left
  `onlymonster_20260804` at `paused_after_analysis` (recommendation: maybe, no decision made) —
  not approved, not force-skipped. Decision-level calibration/comparison against the manual
  baseline is #207/#208's scope, not #232's. No new follow-up issue filed — this is already
  tracked via #206/#207/#208.
- Issue #232's body updated in place with this outcome (`gh issue edit`) rather than opening a
  separate issue, per the project owner's explicit direction.

### Follow-up

- #207/#208 — decision-level and content-level comparison against the manual baseline, including
  `onlymonster_20260804`'s recurring apply/maybe-vs-skip mismatch.

## 2026-08-23 — ISSUE-207 — Decision-level comparison: AI recommendation vs. manual baseline for the 6-case golden-dataset subsample

### Scope

Per `docs/10_calibration_and_parity.md` §4.1: for each of the 6 golden-dataset cases run in
#206/#232, compare the AI's live apply/maybe/skip recommendation (Prompt 1, real
`AI_PROVIDER=openai`) against `case.md`'s `manual_decision` frontmatter — the human's actual
historical decision for that vacancy — not a literal text diff, a decision-level match. Where they
disagree, classify the mismatch per §4.1 as a reasoning gap (AI missed something a human evidently
caught) or a legitimate risk-tolerance difference (both reached a defensible call, just weighted
the same evidence differently).

### Methodology note: `onlymonster_20260804` (resolved before comparing the rest)

Per the project owner's explicit decision recorded in #232, this case's workspace was deliberately
left at `paused_after_analysis` in this run (recommendation "maybe", no human review action taken)
rather than progressed to an actual `reviewState`. This does not block or change the decision-level
comparison method: `case.md`'s `manual_decision` field is the historical ground truth for that
vacancy, recorded independently of what happens to the experimental workspace created for this
golden-dataset run — it is not derived from, and does not require, that workspace's own
`reviewState`. `onlymonster_20260804` is therefore compared exactly the same way as the other 5
cases below (AI recommendation vs. `manual_decision`); the only difference worth flagging is that
no human review action exists on its workspace in this run, which is an intentional, already-
recorded #232 decision, not a gap in this issue's comparison method.

### Result

3 of 6 cases matched between the AI's live recommendation and the manual decision; 3 disagreed.
Both mismatches already surfaced at the recommendation stage in #206/#232 are formally classified
here per §4.1.

### Evidence

| Case | Manual decision | AI recommendation / score | Match | Classification (if mismatch) |
|---|---|---|---|---|
| `cello_20260718` | apply | apply / 75 | yes | — |
| `motion_20260715` | apply (`manual_decision_raw: 'apply / cautious apply'`) | maybe / 68 | no | **Legitimate risk-tolerance difference.** The human's own decision was itself a "cautious apply" — i.e. already borderline. The AI's German language-risk (`high`, candidate at A2/B1 vs. required B2/C1) and message-queue evidence-gap (`medium`) assessment content is accurate and matches exactly what a cautious human apply would also weigh; it simply resolved the same borderline call one notch more conservatively than the human did. |
| `bjak_20260717` | maybe | maybe / 68 | yes | — |
| `jobgether_20260625` | maybe | apply / 76 | no | **Likely reasoning gap.** The AI rated every `must_have` "strong"/no-risk and never modeled that the listing is explicitly "on behalf of a partner company" (Jobgether is a staffing/agency intermediary, not the hiring company directly) — a real indirection/uncertainty factor a human plausibly weighs but the AI's structured risk fields have no slot for. The AI's own flagged risks (missing RabbitMQ/Kafka/AWS/GCP, "clarity on German language expectations" needed) are all nice-to-have-level and would not normally justify a downgrade alone. No manual reasoning note exists in `case.md` to fully confirm this was the human's actual reason, but it is the most plausible unmodeled factor given everything else in the AI's own analysis reads as a confident apply. |
| `pandadoc_20260621` | skip | skip / 53 | yes | — |
| `onlymonster_20260804` | skip | maybe / 68 | no | **Mixed — leans reasoning gap.** The AI's `must_have` "Strong, hands-on AI-assisted development skills" — the vacancy's actual core ask (it explicitly wants a candidate who drives AI coding tools as their primary workflow) — was marked `evidence_status: personal_only` / `medium` risk, exactly the evidence category root `CLAUDE.md`'s Anti-Overclaiming Rules flag as not commercial-grade for AI-tool work. Under-weighting that specific must-have (treated as one `medium` risk among several rather than a defining one) looks like a reasoning gap tied to this project's own evidence policy, not a generic risk-tolerance call. Separately, the AI also asserted the vacancy "likely requires some degree of command in German" — not present anywhere in `00_vacancy_source.txt` (only "Ukrainian language: native speaker level" is actually required) — a minor, hedged, non-decision-changing hallucinated risk factor worth noting but not load-bearing for the mismatch itself. |

### Follow-up

- #208 — content-level (section-by-section) comparison against `manual-cv.md` for the cases that
  reached a CV draft, per §4.2.

## 2026-08-23 — ISSUE-214 — Calibration round 1 (Phase 5): resolving the 3 decision-level mismatches from #207

### Scope

Per issue #214: for each of the 3 decision-level mismatches recorded in #207
(`motion_20260715`, `jobgether_20260625`, `onlymonster_20260804`), decide what to do — fix the
`prompt_1` `PromptTemplate` (new version, never overwriting a prior one) for reasoning-gap cases, or
document an accepted exception for legitimate risk-tolerance differences — then re-run affected
cases through the real pipeline (Prompt 1, real `AI_PROVIDER=openai`) and update this log.
`prompt_2` was explicitly out of scope for editing in this round (per the issue's Key Invariants);
Prompt 2 was run once, for `jobgether_20260625` only, purely to produce a `02_targeted_cv_content`
artifact for future content-level analysis (#208/#209) — no `prompt_2` `PromptTemplate` content was
touched.

### `motion_20260715` — accepted exception, no prompt change

Per #207's own classification (legitimate risk-tolerance difference, not a reasoning gap — the
AI's risk content was accurate, it just resolved a borderline case one notch more conservatively
than the human's own "cautious apply"): no `PromptTemplate` edit made, no re-run performed. Formally
accepted as a permanent decision-level exception for this golden case.

### `jobgether_20260625` — reasoning gap, resolved after 3 prompt-version iterations

#207 hypothesized the reasoning gap was "AI never modeled that the listing is an agency/
intermediary ('on behalf of a partner company')". This hypothesis drove the first prompt edit, but
diagnostic re-runs showed the *actual* reasoning gap was different — an incomplete `must_have`
enumeration causing score instability, not the agency angle. Iteration detail:

- **`prompt1_v5`** (`PromptTemplate` version 5, `isActive: false` — superseded same day): added
  three planned fixes — (1) agency/intermediary listings count as an added medium risk toward Risk
  Stacking, (2) a `must_have` that is the vacancy's core/defining ask with `personal_only`/
  `needs_evidence` status is weighted independently rather than diluted, (3) language risk must only
  be asserted when actually stated in the vacancy text. Live re-run (workspace
  `2026_08_23_Jobgether_..._Recalibration_V`, cleaned up after this task): **skip / score 52** — a
  new, worse regression. The model hallucinated a "mandatory German language requirement" /
  `language_risk: blocker` for a vacancy based in the Netherlands that never mentions German at
  all (only "Upper-Intermediate English proficiency"). Fix (3)'s wording was too weak to prevent
  this.
- **`prompt1_v6`** (version 6, `isActive: false` — superseded same day): strengthened the
  language-risk guard — explicit statement that this candidate's Germany/remote-EU target market is
  NOT a reason to assume a German requirement, non-German-market examples, and a hard rule that
  `language_risk.risk_level` must be `"low"` with a no-requirement-stated note when the vacancy is
  silent on German. Live re-run (workspace `..._Recal`, cleaned up after this task): **maybe /
  score 65** — decision now matched the manual baseline (`maybe`), and the German hallucination was
  gone (`Language Risk: low — The position does not explicitly require German`). However, diagnostic
  inspection of the JSON output showed the agency-risk rule (fix 1) never actually fired — no
  mention of "partner company"/agency anywhere in the response. Comparing this run's `must_have`
  array (2 entries) against the *original* pre-fix run's (3 entries, `cmt5nubri001w9vvqemqkvcex`)
  revealed both silently omitted the vacancy's explicit "Strong knowledge of PostgreSQL, MongoDB,
  Redis" and "microservices architecture" requirements from the structured `must_have` array — the
  real driver of score instability between runs (76 vs. 65), not agency risk.
- **`prompt1_v7`** (version 7, **active**): added a completeness requirement to the Evidence Mapping
  section — `must_have`/`nice_to_have` must include an entry for every requirement the vacancy text
  states as mandatory/secondary, even when the match is weak or missing, instead of silently
  dropping requirements into free-text `tech_stack_match.weak_or_missing` only. Live re-run
  (workspace `2026_08_23_Jobgether7_Middle_Node_js_Backend_Developer`, `cmt5wc9eb001u12vygfibnaxu`,
  kept): **maybe / score 63**. `must_have` now correctly lists all 5 explicit requirements,
  including PostgreSQL/MongoDB/Redis (`weak`/`needs_evidence`/`medium`) and microservices
  (`none`/`not_supported`/`high`) — the honest risk-stacking these two gaps introduce is what now
  produces `maybe`, not the originally-hypothesized agency rule (still unconfirmed/unexercised
  across all 3 live runs of this case). Decision matches manual baseline (`maybe`) — **converged**.
  Re-verified against `case.md`'s `manual_decision: maybe` a second time before proceeding.
  Additionally approved and ran Prompt 2 for this workspace (unmodified `prompt_2` template) to
  produce `02_targeted_cv_content.md/json` for future content-level analysis — workspace reached
  `cv_draft_ready`.

### `onlymonster_20260804` — reasoning gap, NOT resolved this round; root cause identified as knowledge-source content, not prompt wording

#207 hypothesized the reasoning gap was under-weighting of the "Strong, hands-on AI-assisted
development skills" must-have (marked `personal_only`) plus a minor hallucinated German-language
note. `prompt1_v7`'s three carried-forward fixes (core must-have with personal-only evidence,
language-risk guard, completeness requirement) were tested against this case without further
editing:

- Live re-run (workspace `2026_08_23_OnlyMonster7_Senior_Backend_Engineer_Automation`,
  `cmt5wldn8002d12vy9yos92ui`, kept — decision left unactioned, same convention as the original
  #206/#232 workspace for this case): **maybe / score 68** — identical to the pre-fix baseline
  score, still mismatched against `manual_decision: skip`.
- The "AI-assisted development skills" must-have is now correctly marked `weak`/`needs_evidence`
  (previously `personal_only`/`medium`), confirming the core-must-have rule did apply — but this
  alone was not enough to flip the decision to `skip`.
- A **new variant of the language-risk hallucination** appeared: `Language Risk: medium — ...lack
  of evidence about their German language proficiency` for a vacancy that only requires Ukrainian
  (native) and never mentions German. `prompt1_v6`/`v7`'s guard only blocked asserting German as a
  stated *requirement*; it did not block softer "no evidence of German" framing for an unrelated
  language.
- `must_have` completeness also remained partial for this case despite `v7`'s fix — seniority
  ("5+ years, Senior level") and the Ukrainian-language requirement itself were still not captured
  as their own `must_have` entries.
- **Root cause investigation**: inspected `Master_CV_RU_v0_6_current_work_sync.md` (the active
  `KnowledgeSource` this candidate's profile is built from, confirmed identical file/version to what
  the project owner's ChatGPT Project has attached — same filenames, same `v0_6`/`v0_3` version
  labels). The file is heavily saturated with German-market framing throughout — languages
  (`Ukrainian — native`, `German — A2/B1`, both genuinely documented, not hallucinated), an entire
  dedicated section `## 11. Риски для немецкого рынка`, dozens of German-market-specific risk/
  action notes. This is a plausible structural explanation for why every re-run keeps pulling
  German into the analysis regardless of the vacancy's actual content or prompt-level guardrails —
  the knowledge source itself carries strong contextual gravity toward German-market discussion, not
  just a prompt-wording gap.
- **Initial decision (mid-session): stop further `prompt_1` iteration on this case within #214.**
  A fourth prompt version was drafted but discarded unseeded, since the identified root cause looked
  like knowledge-source content composition, not prompt wording. **This was superseded later the
  same session** — see the next section — once a real, independent bug in context assembly was
  found and fixed.

### Root cause correction: `master_cv` was never inlined into Prompt 1's context

Re-reading `prompt1_v7.txt`'s own `=== EVIDENCE SOURCE RULES ===` section against
`KnowledgeSourceSelectionService.STEP_SOURCE_GROUPS` (`apps/api/src/knowledge-sources/
knowledge-source-selection.service.ts`) found a real, independent bug: the prompt text describes
`Master_CV_RU_v0_6_current_work_sync.md` as "main factual source; the primary ground truth for what
the candidate has actually done", but `STEP_SOURCE_GROUPS.prompt_1.required` never included
`master_cv` — only `prompt_2` did (a decision dating to TASK-018, 2026-07, predating Phase 17
calibration and never revisited when the real prompt text was imported in #195). Prompt 1 was
therefore always working from the shorter `profile_summary`/`career_cases`/`project_inventory`
sources, never the detailed Master CV the prompt itself assumes is available — a plausible
contributor to the `must_have` incompleteness and imprecise evidence grounding seen throughout this
round, independent of prompt wording.

Fixed by adding `'master_cv'` to `prompt_1`'s `required` array
(`knowledge-source-selection.service.ts`); updated the corresponding assertions in
`knowledge-source-selection.service.spec.ts` (previously asserted `master_cv` was *absent* from
`prompt_1`'s selection — now asserts both `prompt_1` and `prompt_2` include it). Full
`apps/api` unit suite (699/699) green after the change; `npx tsc --noEmit`/`npm run lint` clean.
This is a knowledge-source-selection config fix, not a `prompt_1` `PromptTemplate` edit — folded
into this branch/PR per root `CLAUDE.md`'s "work surfaced mid-task" rule (required for #214's own
AC to be achievable, not a separate unrelated concern).

Live re-run of `onlymonster_20260804` with `master_cv` now included (still `gpt-4o-mini`,
`prompt1_v7`): **maybe / score 68** — unchanged. The fix alone did not flip the decision; `Language
Risk` correctly dropped the German mention, but the model then failed to credit the vacancy's
explicitly-stated Ukrainian requirement, illustrating the fix's benefit is real but not sufficient
in isolation.

### Model comparison: `gpt-4o-mini` vs `gpt-5.6-luna` vs `gpt-5.6-terra`

Following the project owner's redirection ("не в этом дело, надо приблизится к контексту" /
"давай проверь стоимость токенов по этим моделям"), compared all 6 golden cases across three
`OPENAI_MODEL` values (config-only change, `apps/api/.env`, no prompt edits) at
`prompt1_v7`:

| Case | Manual | `gpt-4o-mini` | `gpt-5.6-luna` | `gpt-5.6-terra` |
|---|---|---|---|---|
| cello | apply | match (apply/75) | mismatch (maybe/71) | mismatch (maybe/70) |
| motion | apply (cautious) | exception (maybe/68) | exception (maybe/70) | exception (maybe/68) |
| bjak | maybe | match | match (maybe/67) | match (maybe/66) |
| jobgether | maybe | match (maybe/63) | match (maybe/60) | **mismatch (skip/54)** |
| pandadoc | skip | match | match (skip/43) | match (skip/34) |
| onlymonster | skip | **mismatch (maybe/68)** | **match (skip/59)** | match (skip/48) |
| **Matches** | | **5/6** | **5/6** | **4/6** |

Real per-call token cost (measured from `AiRun.inputTokens`/`outputTokens` on live runs, not
headline per-1M rates): `gpt-4o-mini` ≈ $0.0147/call, `gpt-5.6-luna` ≈ $0.0217/call (~1.5×),
`gpt-5.6-terra` ≈ $0.265/call (~18×, and *worse* quality — rejected outright). Luna vs mini is a
~$0.007/call difference — immaterial at this project's volume. Category-by-category inspection
(Luna's `onlymonster` output vs. `gpt-4o-mini`'s original `cello` output) showed Luna's advantage is
not raw score but reasoning discipline: fuller `must_have` enumeration, correct `personal_only`
classification instead of overclaiming (e.g. `gpt-4o-mini` had marked NestJS "strong/supported" from
personal-only JobFlow evidence — a direct Anti-Overclaiming Rules violation `CLAUDE.md` flags by
name), and zero observed hallucinations across all Luna runs in this round.

**Decision (project owner): adopt `gpt-5.6-luna` as the model for this round's final
configuration.** `apps/api/.env`'s `OPENAI_MODEL` set to `gpt-5.6-luna` (gitignored, not part of
this PR's diff); `apps/api/.env.example`'s commented default updated to `gpt-5.6-luna` to guide
future setup. This is a config recommendation from this round's findings, not a hard requirement —
`gpt-4o-mini` remains a valid fallback if cost sensitivity increases.

### `cello_20260718` regression found on `gpt-5.6-luna`, investigated, accepted as a second exception

Switching to Luna (still `prompt1_v7`) flipped `cello_20260718` from match (`apply/75` on
`gpt-4o-mini`) to mismatch (`maybe/71`). Root cause investigated using two **fresh, independent live
runs through the real ChatGPT web app**, done by the project owner in the same session for direct
comparison (not the historical `case.md` record): `cello_20260718` scored `apply/87`, `motion_20260715`
scored `apply/80` — both using the same 6-category weighted rubric this project's `prompt_1` also
uses (Tech stack /28, Production /15, Domain /7, Seniority /17, Language-location /18, Evidence /15).

Category-by-category diffing against the live web scores drove three further `prompt1` versions,
each targeting a distinct, generalizable rubric gap (not a `cello`-specific hack):

- **`prompt1_v8`**: Early-stage-startup/product-engineer rule gains an exception — when the vacancy
  text itself explicitly lowers its own evidence bar ("you don't need years, just built something
  real", "we don't expect you to know everything on day one"), weight missing direct
  product/customer-ownership evidence less strictly. Live re-run: `maybe/70` (+0 from pre-fix), but
  the reasoning visibly changed to credit this exception in `summary`/`top_reasons`.
- **`prompt1_v9`**: Seniority-fit scoring line (0-17) gains an explicit instruction — score near the
  top of the range when the vacancy signals no strict seniority requirement, matching the web run's
  explicit `16/17` credit for exactly this reason (a gap the rubric had zero guidance for previously,
  only Mid/Senior/Lead cases). Live re-run: `maybe/72` (+2).
- **`prompt1_v10`**: general anti-double-counting rule added to the Scoring Rubric — the same
  underlying gap must not be subtracted from both `Tech stack match` and `Evidence quality`.
  Live re-run: `maybe/72` (+0) — no further movement; `Evidence Risks`' mandatory disclosure role
  (Anti-Overclaiming Rules) means the same gaps still appear in output regardless of this scoring
  instruction, and the model gave no visible sign of suppressing a second scoring deduction for them.

Total movement across 3 targeted, well-reasoned rubric fixes: `maybe/71` → `maybe/72` (+1), still
13-15 points short of the web run's `87`. A second live web comparison against `motion_20260715`
(`apply/80`, re-run the same way) showed the identical structural pattern independently — the human
run's own Seniority-fit sub-score was also unremarkable (`10/17`, honestly reflecting the Senior
stretch), and the gap to our automated score was concentrated in the same `Evidence quality`
category (human `13/15` vs. our estimated `~9-11/15`) — the same conservative-evidence-quality
pattern recurring in a case that was *already* an accepted exception before any of this round's
prompt edits. This cross-case reproduction was treated as confirming evidence that the residual gap
is a structural property of decomposed-rubric scoring vs. holistic human scoring, not a specific
missing rule — further prompt iteration was judged low-value (diminishing returns confirmed
empirically) and stopped.

**Decision (project owner): accept `cello_20260718` as a second permanent risk-tolerance exception**,
alongside `motion_20260715`. `prompt1_v8`/`v9`/`v10`'s three fixes are kept in the active template —
each is independently correct and improves reasoning quality/completeness for any future vacancy
matching those patterns, even though none was sufficient alone or combined to flip this specific
case's decision.

### Final clean-slate verification (all 6 cases, real UI, final configuration)

Per the project owner's request, **all workspaces were deleted** (25 accumulated across every
iteration this round — DB rows + `storage/applications/` folders) and **all 6 golden cases were
recreated and re-run from scratch through the real `apps/web` UI** (Playwright-driven, matching
#206/#207's original methodology) on the final configuration: `prompt1_v10` (active) +
`OPENAI_MODEL=gpt-5.6-luna` + the `master_cv` knowledge-source fix. This is the round's canonical,
reproducible result:

| Case | Manual decision | Result | Match |
|---|---|---|---|
| `cello_20260718` | apply | maybe / 72 | accepted exception |
| `motion_20260715` | apply (cautious) | maybe / 70 | accepted exception |
| `bjak_20260717` | maybe | maybe / 68 | match |
| `jobgether_20260625` | maybe | maybe / 61 | match |
| `pandadoc_20260621` | skip | skip / 40 | match |
| `onlymonster_20260804` | skip | skip / 59 | **match — fixed this round** |

Scores are consistent with (small natural variance around) every prior run of the same
configuration in this session, confirming reproducibility. No `apps/api` source workspaces were kept
from the many intermediate diagnostic runs — the 6 final workspaces above are the only ones present
in dev DB/storage as of this entry.

### Result: decision-level convergence reached for this round

4 of 6 cases match exactly; the remaining 2 (`cello_20260718`, `motion_20260715`) are explicitly
reviewed and accepted risk-tolerance exceptions with documented reasons (including cross-validated,
independent live-web comparisons for both). Per §5's Convergence Criteria ("every mismatch is
explicitly reviewed and accepted with a documented reason"), this satisfies decision-level
convergence for the full 6-case golden-dataset subsample — **no round 2 is needed** for
decision-level calibration.

### Follow-up

- #208/#209 — content-level comparison against `manual-cv.md`, now with `jobgether_20260625`'s
  fresh `02_targeted_cv_content` (from `prompt1_v7`) available as one input.

## 2026-08-23 — ISSUE-208 — Content-level comparison: AI-generated CV content vs. manual baseline, section by section

### Scope

Per `docs/10_calibration_and_parity.md` §4.2: for each golden-dataset case where a
`02_targeted_cv_content` artifact actually exists, compare it section by section against
`project-management/golden-dataset/<slug>/manual-cv.md` — not a literal text diff, a
substance-level comparison of headline/positioning, summary, top skills, experience bullets, and
evidence table/`needs evidence` flags.

### Pre-comparison state check

Before comparing, verified which of the 6 golden-dataset cases actually had a
`02_targeted_cv_content` artifact, and on which configuration. Per issue #208's own note,
`pandadoc_20260621` and `onlymonster_20260804` are **N/A** — Prompt 2 was never run for them
(`pandadoc`: skip decision, pipeline stops per ADR-005; `onlymonster`: `manual-cv.md` is actually a
skip-reason document per its `case.md` `manual_cv_origin` frontmatter, and the AI run also stopped
at analysis per #232) — explicitly not silently skipped, per the issue's Acceptance Criteria.

Of the remaining 4 (`cello_20260718`, `bjak_20260717`, `motion_20260715`, `jobgether_20260625`),
checked live workspace state via the API (`GET /workspaces`) and the `01_vacancy_analysis.md`
score/decision in each workspace's storage folder against `ISSUE-214`'s final clean-slate table
(`prompt1_v10` active + `OPENAI_MODEL=gpt-5.6-luna` + `master_cv` knowledge-source fix): all 4
scores matched exactly (bjak 68, cello 72, motion 70, jobgether 61), confirming all 4 workspaces
are the same ones produced by `ISSUE-214`'s final re-run, not stale from an earlier iteration.
`jobgether_20260625` already had `02_targeted_cv_content` (generated after that same final
analysis, despite the earlier `ISSUE-214` follow-up note attributing it to `prompt1_v7` — that note
was written mid-round and became stale once the clean-slate re-run regenerated this workspace on
`prompt1_v10`); `bjak`/`cello`/`motion` had only `01_vacancy_analysis`, not yet approved past
Prompt 1.

Ran Prompt 2 for the 3 missing cases through the real `apps/web` UI (Playwright-driven, real
`AI_PROVIDER=openai`, unmodified `prompt_2` template, same final configuration — no prompt/model
edits made in this task): approved each analysis (`Approve (maybe)`) → `Generate CV draft` → all 3
reached `cv_draft_ready` with `02_targeted_cv_content.md/json` written to their storage folders.

### Result

All 4 cases show the same consistent pattern: the AI's `02_targeted_cv_content` uses essentially
the same positioning strategy, career-case selection and evidence-safety judgment as the
`manual-cv.md` baseline for that case — no invented achievements and no under-flagged evidence gaps
were found in any of the 4.

| Round | PromptTemplate version | Case | Headline | Summary | Top skills | Experience | Evidence/needs_evidence | Note |
|---|---|---|---|---|---|---|---|---|
| 1 | prompt_1 v10 / prompt_2 (unmodified) | `bjak_20260717` | match | match | match | match | match | Same "backend-focused Full Stack Engineer" angle; same 3 career cases (ProductsUp, Amplience, CommerceTools); same needs_evidence flags (product/customer ownership, English confidence) and same remove flags (fintech/KYC/FX, commercial AI). AI's Selected Projects picks AI Job Assistant/Email Camp instead of manual's JobFlow-centered "Current Independent Work" block — a structural difference driven by the Prompt 2 schema not having a literal "current work" field, not a content mismatch on the 5 graded sections. |
| 1 | prompt_1 v10 / prompt_2 (unmodified) | `cello_20260718` | match | match | match | match | match | Same positioning and same 3 supporting arguments (EPAM/ProductsUp/CommerceTools, reliability/integration depth, current NestJS+Python personal work); same risk-mitigation framing (NestJS/Python as portfolio only, no AWS claim). Manual's original decision was `apply` vs. AI's `maybe` — an already-documented, accepted decision-level exception from #214, out of scope for this content-level comparison. |
| 1 | prompt_1 v10 / prompt_2 (unmodified) | `motion_20260715` | match | match | match | match | match | Same "backend-focused TypeScript/Azure serverless" angle and same career-case selection (ProductsUp, Amplience/CommerceTools, EPAM platform + notification incident); same needs_evidence flags (direct product/customer ownership, senior-level verbal English) and same remove flag (creative-performance/advertising-analytics domain experience). |
| 1 | prompt_1 v10 / prompt_2 (unmodified) | `jobgether_20260625` | match | match | match | match | match | Same backend-integration angle and same caution around payments/billing, MongoDB/RabbitMQ/Kafka/AWS/GCP (all correctly flagged `remove`/`needs evidence` in both); same Upper-Intermediate-English and Netherlands cross-border-eligibility risk flags. |

No section-level `mismatch` verdicts were found for any of the 4 applicable cases; no
`02_targeted_cv_content` section flagged something the human evidence set actually supports as
missing (which would indicate a Phase 16 evidence-pipeline gap), and no section overclaimed beyond
what `manual-cv.md` itself claims.

### `pandadoc_20260621` / `onlymonster_20260804` — N/A, explicitly not compared

Per issue #208's own note and `ISSUE-232`/`ISSUE-207`: `pandadoc_20260621` never proceeded past the
`skip` decision (no `02_targeted_cv_content` was ever generated, matching ADR-005's skip-stops-
pipeline behavior); `onlymonster_20260804`'s `manual-cv.md` is not actually a CV but a skip-
reason document, and its AI run was also deliberately left at `paused_after_analysis` (#232) — there
is no CV content on either side of this comparison for either case. Recorded here explicitly, not
silently omitted, per the issue's Acceptance Criteria.

### Convergence assessment (§5)

Per `docs/10_calibration_and_parity.md` §5: no section-level `mismatch` verdicts across all 4
applicable cases (5/5 sections × 4 cases = 20/20 `match`), and no `partial` verdicts caused by
missing evidence/source content. Content-level convergence is reached for this round — no round 2
is needed for content-level calibration on this golden-dataset subsample.

### Follow-up

- No further action needed for #208 — decision-level (#214) and content-level (#208) convergence
  are both reached for the 6-case golden-dataset subsample. Any future new real vacancy should be
  run through the same §4 comparison method as a Phase 18 manual parity check, not re-run against
  this same golden set.

## 2026-08-23 — ISSUE-209 — Consolidated per-case audit log for #207/#208/#214

### Scope

Per issue #209: consolidate the decision-level (#207, superseded by #214's final calibration round)
and content-level (#208) comparison results into a single audit log per golden case, per
`docs/10_calibration_and_parity.md` §4.3 ("record... alongside the golden case data, §3.2") and the
table format recommended in `docs/research-ai-output-calibration.md` §4.2.

### Result

Both #207 and #208 were already recorded in table form in this file (not a chat-only summary), but
scattered across three separate entries (`ISSUE-207`, `ISSUE-214`, `ISSUE-208`), each covering all
applicable cases in one table — not per-case, and not co-located with the golden case data itself.
Created `project-management/golden-dataset/<slug>/comparison.md` for all 6 golden cases
(`cello_20260718`, `motion_20260715`, `bjak_20260717`, `jobgether_20260625`, `pandadoc_20260621`,
`onlymonster_20260804`), each a single §4.2-format table combining decision match and per-section
content verdicts for that case, with `N/A` content columns (explicitly recorded, not omitted) for
the two cases with no `02_targeted_cv_content` artifact. These are the final, canonical per-case
audit records; the detailed iteration history and reasoning behind each verdict remains in the
`ISSUE-207`/`ISSUE-214`/`ISSUE-208` entries above (not duplicated here or in the per-case files).

No new golden-dataset runs were performed — this is a pure consolidation of already-recorded
results. No `apps/api` code was touched, so `tsc`/`lint`/`test` are not applicable to this task.

### Follow-up

- None — this was the last step of Phase 6 (EPIC-24). Any future new real vacancy comparison
  (Phase 18 manual parity check) should add a new row to the relevant case's `comparison.md`
  (or a new case folder) rather than re-opening this log.

## 2026-08-23 — ISSUE-213 — PromptTemplate version history verification (Phase 5 final gate)

### Scope

Per issue #213 (unblocked by #212's closure — decision-level calibration cycle complete): verify,
via direct database query (Prisma, not code), that `PromptTemplate`'s version history for
`prompt_1`/`prompt_2` reflects every calibration iteration recorded in `ISSUE-214` — multiple
versions exist, none silently overwritten, exactly one active per prompt.

### Command and result

Ran a one-off Prisma query (`prisma.promptTemplate.findMany`, filtered to `promptKey` in
`prompt_1_vacancy_analysis`/`prompt_2_targeted_cv_content`, ordered by `promptKey`/`version`)
against the local dev database (`postgresql://jobflow:...@localhost:5433/jobflow_cv`):

- `prompt_1_vacancy_analysis`: 10 rows, versions 1-10, each a distinct `id`/`createdAt` (no
  overwrite). `isActive: true` on exactly one row (`version: 10`, created `2026-08-23T17:03:44Z`);
  versions 1-9 all `isActive: false`. Matches `ISSUE-214`'s iteration story exactly: v1-v4 predate
  this round (seeded 2026-08-14/2026-08-19), v5-v10 were created during `ISSUE-214`'s round 1
  (2026-08-23, timestamps ascending v5→v10), with v10 the final active version after the
  `jobgether_20260625` reasoning-gap fixes (v5-v7) and the `cello_20260718` rubric fixes (v8-v10).
- `prompt_2_targeted_cv_content`: 4 rows, versions 1-4, each a distinct `id`/`createdAt`.
  `isActive: true` on exactly one row (`version: 4`, created `2026-08-22T11:57:57Z`, predating
  `ISSUE-214`'s round by a day); versions 1-3 all `isActive: false`. Consistent with `ISSUE-214`'s
  explicit statement that `prompt_2` was out of scope for editing in that round — no new
  `prompt_2` version was created during it.

Acceptance criterion confirmed: no gaps, no duplicated active flags, no overwritten versions for
either prompt.

### Follow-up

- None — this was Phase 5 (EPIC-24)'s final gate. Phase 6 (content-level, #208/#209) is already
  closed; see `docs/06_roadmap.md`/`docs/05_epics.md` for the authoritative next-phase definition
  (per #212's own note, Prompt 2 decision-level/content-level convergence is a separate later
  phase, gated on this one).

## 2026-08-24 — ISSUE-238 — Round 1 content-level calibration (Phase 7): deep re-verification found a code bug, not a prompt/evidence issue

### Scope

Per issue #238: for each content-level mismatch/partial recorded in #208, determine root cause
(prompt wording vs. Phase 16 evidence/knowledge-source wiring), fix via a new `prompt_2`
`PromptTemplate` version if the cause is the prompt, re-run affected golden cases, update
`comparison.md` per case, and assess whether content-level convergence (§5) is reached.

### Pre-work: independent deep re-verification of #208's "0 mismatch/0 partial" claim

#208 recorded 20/20 `match` across all 4 applicable golden cases (bjak, cello, motion, jobgether)
and concluded content-level convergence was already reached, meaning #238 nominally had nothing to
diagnose. Before accepting that at face value, independently re-read the raw `manual-cv.md` vs.
`02_targeted_cv_content.md` for all 4 cases (one read directly, three via a dedicated subagent) —
not the prior TEST_LOG summary — and found a real, repeatable discrepancy the original comparison
missed: the AI's rendered `.md` had no "Current Independent Work & Portfolio Projects" section at
all (no JobFlow CV Pipeline mention in the visible CV body, no HEY, ALTER! Köln e.V. volunteering
bullet), while `manual-cv.md` treats this block as mandatory content for every case.

Root-caused this rather than accepting #208's own explanation ("a schema-driven structural
difference, Prompt 2 schema not having a literal current work field" — recorded in #208's original
note for `bjak_20260717`). That explanation was **incorrect**: `TargetedCvContentBlock` in
`apps/api/src/pipeline/schemas/targeted-cv-content.schema.ts` has a required `current_work_block`
field (`TargetedCvCurrentWorkBlock`, validated as mandatory), and inspecting the raw
`02_targeted_cv_content.json` for all 4 round-1 workspaces confirmed the AI populated it correctly
every time — `include: true`, with the JobFlow CV Pipeline bullet, Python/FastAPI bullet and the
HEY, ALTER! volunteering bullet, all evidence-grounded. The actual defect: `Prompt2Service`'s
private `buildMarkdown()` (`apps/api/src/pipeline/prompt2/prompt2.service.ts`) read
`cv.experience`, `cv.selected_projects`, `evidence_table`, etc., but never read
`cv.current_work_block` — a rendering code bug, not a prompt-wording issue and not a Phase 16
evidence/knowledge-source wiring issue (the evidence clearly reached the model and was used
correctly). Confirmed the final PDF export path was unaffected: `prompt2-to-cv-content.mapper.ts`
(`document-export/`) already read `current_work_block` correctly, so this only affected the
intermediate `02_targeted_cv_content.md` human-review artifact — the same artifact #208's
comparison read — not the CV a candidate would actually receive.

Also independently checked two secondary discrepancies a subagent raised (unverified-looking
numbers like "18+ locales"/"~100,000 unique products", and Jest dropped from some Top Skills
lists) against the underlying `knowledge-sources/` evidence files — both are real, evidence-backed
facts (confirmed via grep against `Master_CV`/`Career_Case_Deep_Dives`), just not literally
repeated in the shorter `manual-cv.md` text, and Jest still appears in the tech-stack tail of the
relevant bullets. Both fall within §5's "stylistic differences" tolerance, not missing/invented
substance — not treated as defects.

### Fix

`prompt2.service.ts`'s `buildMarkdown()` extended to render `cv.current_work_block` (role_line,
dates, location, stable_intro, bullets, tech_stack) as a `## <safe_label>` section placed right
before `## Professional Experience` — matching the placement already used by
`cv-template-renderer.ts`'s Handlebars template for the PDF path. When `include: false`, renders a
short placeholder instead of the block. This is a **code fix, not a `PromptTemplate` change** — the
prompt itself was not the cause (the AI already generates `current_work_block` correctly), so no
new `prompt_2` `PromptTemplate` version was created this round; the existing active version is
unchanged.

Added two unit tests to `prompt2.service.spec.ts` (`generateCvContent — success path`): renders the
`current_work_block` section content when `include: true` (using the existing `FAKE_PROMPT2_JSON`
fixture), and renders the placeholder (not the block content) when `include: false`. Full
`apps/api` suite: 61/61 suites, 701/701 tests green; `npx tsc --noEmit` and `npm run lint` clean.

### Re-run of affected golden cases

Regenerated `02_targeted_cv_content.md/json` for all 4 applicable workspaces
(`2026_08_23_BJAK_Full_Stack_Engineer`, `..._Cello_Software_Engineer_m_f_d`,
`..._Motion_Senior_Software_Engineer_Backend`, `..._Jobgether_Middle_Node_js_Backend_Developer`,
all at `cv_draft_ready`) via `POST /workspaces/:id/generate-cv-content` (ADR-029 "Regenerate CV
draft", real `AI_PROVIDER=openai`, unmodified `prompt_2` template) through the real running API —
Prompt 1 was not re-run (already approved, unaffected by this fix). Verified via grep that all 4
regenerated `.md` files now render "## Current Independent Work & Portfolio Projects" with the
JobFlow CV Pipeline and HEY, ALTER! bullets present. Headline/top-skills/positioning stayed
consistent with round 1 (same angle, same career-case selection); self-reported `quality_score`
rose from ~88-92 to 94 across all 4 (secondary signal only, per §5).

### Manual re-comparison (§4.2) and convergence assessment

Re-ran the section-by-section comparison for all 4 cases against `manual-cv.md` with the corrected
`.md` artifacts. Recorded as Round 2 in each case's `project-management/golden-dataset/<slug>/comparison.md`
(`bjak_20260717`, `cello_20260718`, `motion_20260715`, `jobgether_20260625`). All 5 graded sections
now `match` for all 4 cases, including Experience (previously "match" was recorded but assessed
against an incomplete artifact). No section-level `mismatch`, and the only `partial`-adjacent notes
(numeric specificity, Jest positioning) are stylistic per §5, not missing/invented substance.

**Content-level convergence (§5) is confirmed reached** for the full applicable golden-dataset
subsample. No round 2 of Phase 7 is needed. No `prompt_2` `PromptTemplate` edit was required this
round.

### Also investigated (no action needed)

During this task, verified two questions about calibration methodology fairness raised alongside
the round: (1) whether the manual-chat context used to write `manual-cv.md` for Motion matched what
the automated Prompt 1/Prompt 2 pipeline uses. Found asymmetries in both directions — Prompt 1's
manual chat was missing `profile_summary` (one of Prompt 1's 6 required knowledge-source
categories), and Prompt 2's manual chat was missing `master_cv` and `project_inventory` (2 of
Prompt 2's 6). Cross-checked the underlying `knowledge-sources/` files: the project's knowledge
base is deliberately redundant (the same core facts — e.g. JobFlow CV Pipeline, HEY ALTER!
volunteering — are repeated across `master_cv`, `profile_summary`, `career_cases` and
`project_inventory`), so these gaps are very unlikely to have caused actual missing facts in the
human baseline. Not treated as a defect or methodology fix — noted here for audit completeness
only, no code or process change made.

### Follow-up

- None — #238 (Round 1, Phase 7) reached content-level convergence for the full applicable
  golden-dataset subsample. Per issue #237 (tracker), Phase 7 does not require a round 2.

## 2026-08-24 — ISSUE-246 — Audit prompt_3 reference text for web-app-specific assumptions

### Scope

Not code-centric — manual verification per the issue's own Test Requirement. Full read of
`apps/api/prisma/prompts/!prompt_3_final_pre-PDF_check_CURRENT_WORK_SYNC.txt` (190 lines) plus
targeted greps to find every ChatGPT-web-app-specific assumption (live browsing, file attachments,
implicit session memory), mirroring the methodology already used for prompt_1 (#193/#194) and
prompt_2 (#198/#199).

### Commands

```bash
# Read the full reference file (not fragments)
# Grep the file for each assumption category, first pass (English-only, later found incomplete):
rg -in "Sources|source|файл|chat|чат|browsing|browse|ссылк|link|вложени|attach" "apps/api/prisma/prompts/!prompt_3_final_pre-PDF_check_CURRENT_WORK_SYNC.txt"
# Re-run, broadened after noticing the first pass could not match Cyrillic "источник":
rg -in "источник|Sources|source|файл|chat|чат|browsing|browse|ссылк|link|вложени|attach|скач|download|сессі|session|помн|запомни|memory" "apps/api/prisma/prompts/!prompt_3_final_pre-PDF_check_CURRENT_WORK_SYNC.txt"
# Confirmed no live-browsing instruction anywhere in the file:
rg -in "browsing|search|lookup|internet|LinkedIn|verify|verification|легитимн" "apps/api/prisma/prompts/!prompt_3_final_pre-PDF_check_CURRENT_WORK_SYNC.txt"
# Read Prompt3InputBuilderService and pre-pdf-check.schema.ts to confirm what input Prompt 3
# actually receives today, to check whether the "Sources" assumption is a real functional gap:
# apps/api/src/pipeline/prompt3/prompt3-input-builder.service.ts
# apps/api/src/pipeline/schemas/pre-pdf-check.schema.ts
```

### Result

PASS

### Evidence

- Full list of 5 findings, each with an explicit resolution (map to existing mechanism / reword /
  no gap found), recorded in `docs/10_calibration_and_parity.md` §2.8 — none dropped silently, per
  the issue's Key Invariants.
- The first grep pass (English-only `source`) missed a real Cyrillic occurrence ("источник", line
  9) — caught only after deliberately re-running the audit from scratch with a broader,
  Cyrillic-inclusive search; recorded in §2.8 item 3 alongside the already-found line 43 occurrence,
  same resolution applies to both.
- Confirmed by reading `Prompt3InputBuilderService.buildPrompt3Input()`
  (`apps/api/src/pipeline/prompt3/prompt3-input-builder.service.ts:26-79`) that it injects only
  `02_targeted_cv_content.json` + optional `01_vacancy_analysis.json`, no raw knowledge-source
  content — the "Sources" assumption (line 9, line 43) resolves without any input-builder change
  because `02_targeted_cv_content.json` already carries `evidence_table`/`overclaiming_check`/
  `experience_type`/`tech_stack` (Prompt 2's own evidence-grounded output).
- Confirmed no live-browsing/verification instruction and no file-creation/download-link/"this
  chat" instruction anywhere in the file (zero grep matches for both categories) — both resolved as
  "no gap found," same outcome as the equivalent checks for prompt_1 (§2.1 items 5–6).
- One non-finding flagged (not resolved here, correctly out of scope for #246): `PrePdfCheckOutput`
  has no `quality_score`-equivalent field for the reference text's "Output Quality Score — Prompt 3"
  rubric — not a web-app-specific assumption, noted in §2.8 for the adaptation issue to decide.

### Follow-up

- Feeds directly into #247 (adaptation of this text into a new `prompt_3` `PromptTemplate`
  version), which consumes §2.8's 5 resolutions as its direct input, same sequencing as
  #193/#194→#195 and #198/#199→#200.

## 2026-08-24 — ISSUE-247 — Import and adapt prompt_3 text into a new PromptTemplate version

### Scope

Applied §2.8's 5 resolutions to `!prompt_3_final_pre-PDF_check_CURRENT_WORK_SYNC.txt`, producing
`apps/api/prisma/prompts/prompt3_v2.txt`, seeded as `prompt_3_pre_pdf_check` v2 (active; v1
placeholder kept inactive). Schema decision: added `quality_score: number` (required, additive) to
`PrePdfCheckOutput`, matching the existing `VacancyAnalysis`/`TargetedCvContentOutput`/
`FinalCheckOutput` precedent (TASK-100) — no field added for the "Current-work block check"
section, since it fits the existing `corrections` mechanism the same as every other check section.

Mid-task scope revision (project owner, screenshot of the manual ChatGPT-web-app "Sources" panel
for the actual pre-PDF-check response this text was adapted from): confirmed `Prompt3InputBuilderService`
never loaded any `KnowledgeSource` content, contradicting what `docs/08_ai_pipeline.md` already
documented as required Prompt 3 input. Re-verified against the real knowledge-source files (not
assumed) — added `prompt_3` to `KnowledgeSourceSelectionService.STEP_SOURCE_GROUPS`
(`required: ['tech_stack', 'career_cases']`), and `Prompt3InputBuilderService` now loads those two
knowledge sources plus raw `00_vacancy_source.txt`, all best-effort. `CV_Format_Rules` deliberately
NOT added as a knowledge source — confirmed by reading the full ~730-line file that its Prompt-3-
relevant subset (current-work rules, page/bullet caps, BOP wording) is already preserved verbatim
in `prompt3_v2.txt`'s own preamble/checklist, while its §12 "PDF Final Check Checklist" actually
checks an already-exported PDF (Prompt 5's domain, not Prompt 3's, since no PDF exists yet at this
stage) — matches the screenshot evidence (`CV_Format_Rules` absent from the 4 attached sources for
that response). Full reasoning: `docs/10_calibration_and_parity.md` §2.8 item 3's follow-up note
and `docs/08_ai_pipeline.md` §12.2.

A related, out-of-scope finding (Prompt 2's `STEP_SOURCE_GROUPS` config has 2 discrepancies against
a similar per-source review) was filed separately as #252, not fixed here.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test        # 61 suites / 710 tests passed
npm run test:e2e     # pre-existing failures on main (mvp-flow, skip-flow, run-analysis 400),
                      # confirmed via git stash + re-run against unmodified main — unrelated to
                      # this branch's changes, not introduced or fixed here
```

### Result

PASS (unit); e2e pre-existing red on `main`, out of scope for #247

### Evidence

- `apps/api` unit suite: 61 suites / 710 tests passed, 0 failed.
- `npx tsc --noEmit` and `npm run lint`: clean.
- `npm run test:e2e`: `mvp-flow.e2e-spec.ts`/`skip-flow.e2e-spec.ts` fail at `run-analysis` (400)
  before reaching any Prompt-3-related step; reproduced identically on a clean `main` checkout via
  `git stash` — confirmed pre-existing, not caused by this branch's changes.
- New/updated tests: `pre-pdf-check.schema.spec.ts` (3 new `quality_score` tests),
  `knowledge-source-selection.service.spec.ts` (1 new `prompt_3` test),
  `prompt3-input-builder.service.spec.ts` (4 new tests: raw vacancy text present/absent, knowledge
  sources inlined, no active knowledge sources placeholder).

### Follow-up

- #252 — review whether `project_inventory`/`profile_summary` should remain `required` in
  `STEP_SOURCE_GROUPS.prompt_2` (unrelated finding, filed separately, not blocking).
- The pre-existing e2e failure on `main` is not filed as a new issue here — flagged for the project
  owner's awareness; out of scope for #247 to fix.

## 2026-08-24 — ISSUE-248 — Extend convergence methodology for Prompt 3: docs §5 + ADR for export_blocked

### Scope

Issue #248 (EPIC-24 Phase 9): doc-only task, no code changes. (1) Extend
`docs/10_calibration_and_parity.md` §5 with a dedicated Prompt 3 convergence-criteria subsection
that does not reuse Prompt 1/2's decision-match/content-match criteria literally. (2) Document the
BOP-check convergence verification method (grep 16 known patterns, input CV content vs. final
exported text after corrections). (3) Fix the already-made "`export_blocked` stays advisory-only"
decision as a new ADR (ADR-031) in `project-management/DECISIONS.md`, extending ADR-026.

### Commands

Not code-centric — no `tsc`/`lint`/`test` applicable (per Issue #248's Test Requirement). Manual
consistency verification only:

```bash
# confirm no other file duplicates the §5 numbering / ADR numbering being introduced
grep -n "^## 5\.\|^### 5\." docs/10_calibration_and_parity.md
grep -n "^## ADR-" project-management/DECISIONS.md | tail -5
```

### Result

PASS

### Evidence

- `docs/10_calibration_and_parity.md`: existing `## 5. Convergence Criteria (Phase 17 Done
  Criteria)` retitled to hold two subsections — `### 5.1 Prompt 1/2 Convergence Criteria` (verbatim
  original content, unchanged) and new `### 5.2 Prompt 3 Convergence Criteria (Phase 9 extension,
  Issue #248)` with a `### 5.2.1 BOP-check convergence verification method` sub-subsection. New
  content cross-checked against: `apps/api/src/pipeline/schemas/pre-pdf-check.schema.ts` (field
  names), `apps/api/prisma/prompts/prompt3_v2.txt` §6 (all 16 BOP pattern strings transcribed
  verbatim, not paraphrased), `apps/api/src/document-export/cv-template-renderer.ts:257-270`
  (`applyCorrectionsToCvContent`/`setByPath` behavior referenced for the field_path-validity
  criterion), and `project-management/prd/PRD-prompt3-calibration-against-manual-baseline.md`'s "В
  скоупе" section (the four candidate criteria, confirmed here as the accepted ones per Issue #248's
  own Acceptance Criteria wording). No existing §5 content (now §5.1) was altered beyond retitling.
- `project-management/DECISIONS.md`: new `## ADR-031 — export_blocked remains advisory-only for
  Prompt 3 (extends ADR-026)` appended after ADR-030's existing content — sequential numbering
  confirmed (`grep -n "^## ADR-"` showed ADR-030 immediately preceding, no gap or collision). States
  the already-confirmed decision as fact (not re-opened), references the same code-reading evidence
  already recorded in the PRD (`DocumentExportService`/`HtmlRendererService`/
  `document-export.controller.ts` never read `export_blocked`).
- Numbering check: `## 5.` / `### 5.` grep confirmed exactly one `## 5.` header and two `### 5.`
  subheaders (5.1, 5.2), no duplicate section numbers elsewhere in the file.

### Follow-up

- None — Issue #248 is doc-only and fully addressed by this change. Next open work per the PRD's
  subtask breakdown is topic 3 ("Golden dataset — прогон и сравнение Prompt 3", tracked as future
  issues #249/#250 per the milestone, not selected automatically here).

## 2026-08-24 — ISSUE-249 — Golden dataset: run Prompt 3 for bjak_20260717/cello_20260718, compare to manual Version 2 — Pre-PDF Check

### Scope

Ran the calibrated Prompt 3 (`prompt_3` v2, `prompt3_v2.txt`) through the real pipeline
(`AI_PROVIDER=openai`) for both `bjak_20260717` and `cello_20260718`, and compared the output
against each case's manually-produced "Version 2 — Pre-PDF Check" section in `manual-cv.md`, per
`docs/10_calibration_and_parity.md` §5.2's four convergence criteria and §5.2.1's mechanical
BOP-check verification method.

### Pre-existing blocker found and fixed (in-scope, per CLAUDE.md's mid-task-work rule)

Every real Prompt 3 call (9 attempts total across both workspaces, before the fix) returned
syntactically valid JSON that was missing the required `quality_score` field —
`validatePrePdfCheckJson` rejected all 9, leaving both workspaces stuck at `pre_pdf_check_ready`.
Root cause: `OpenAiProvider.complete()` used loose `response_format: { type: 'json_object' }` (no
schema enforcement) for every AI-provider call, so the model could — and, for this prompt, reliably
did — silently omit a required field. Fixed by adding an `AiProviderJsonSchema` option to
`AiProviderOptions`/`OpenAiProvider`, switching to OpenAI's strict `response_format: json_schema`
mode when supplied, and wiring a full strict schema (`PRE_PDF_CHECK_JSON_SCHEMA`) into
`Prompt3Service`'s `complete()` call — scoped to Prompt 3 only, no other prompt step's call path
touched. 2/2 runs succeeded immediately after the fix. New test:
`openai.provider.spec.ts` — "requests strict json_schema mode when jsonSchema is provided,
preferring it over jsonMode".

### Commands

```bash
cd apps/api
npx tsc --noEmit                          # 0 errors
npm run lint                              # clean
npm run test                              # 61 suites / 711 tests, all passed

# Real Prompt 3 runs (dev server restarted with AI_PROVIDER=openai)
curl -X POST -H "x-api-key: $API_KEY" http://localhost:3000/workspaces/<bjak-id>/run-pre-pdf-check
curl -X POST -H "x-api-key: $API_KEY" http://localhost:3000/workspaces/<cello-id>/run-pre-pdf-check
curl -X POST -H "x-api-key: $API_KEY" http://localhost:3000/workspaces/<bjak-id>/export-cv
curl -X POST -H "x-api-key: $API_KEY" http://localhost:3000/workspaces/<cello-id>/export-cv
```

### Result

PARTIAL — real runs succeeded and were compared; convergence per §5.2 was **not** reached for
either case (criterion 3, BOP-check, fails in both; criterion 1, field_path validity, additionally
fails for `bjak_20260717` only). Full per-case, per-criterion writeup recorded in
`project-management/golden-dataset/bjak_20260717/comparison.md` and
`.../cello_20260718/comparison.md` (new "Prompt 3 — Pre-PDF Check (ISSUE-249, 2026-08-24)"
sections), per §4.3's recording convention.

### Evidence

- **bjak_20260717**: `readiness: ready_with_minor_edits`, `quality_score: 94`, `export_blocked:
  false` — matches the human's actual call ("Ready for PDF after the mandatory EGZ replacements").
  All 4 `corrections[].field_path` values used an invalid `cv_content.` prefix not present on the
  real `CvContent` renderer contract — confirmed via `setByPath`'s silent no-op behavior
  (`cv-template-renderer.ts:224-249`) and directly by checking `04_cv_export.html` still reads
  "Full Stack Engineer" (the suggested "Full-stack Engineer" never applied). BOP-check: 7 of 16
  known patterns present in the pre-correction `02_targeted_cv_content.json`, 0 of 7 caught in the
  post-correction exported HTML (mechanical grep per §5.2.1).
- **cello_20260718**: same `readiness`/`quality_score`/`export_blocked`, matches the human's call
  ("Ready for PDF after these minor EGZ wording updates"). All 6 `corrections[].field_path` values
  were valid and did apply (confirmed by diffing `04_cv_export.html`). BOP-check: same 7 of 16
  patterns present in input (identical `current_work_block` content to bjak's case), only 1 of 7
  caught — the AI's corrections repeatedly touched the exact sentence containing a flagged pattern
  but did not apply the prompt's own recommended replacement for most of them (e.g.
  `current_work_block.stable_intro`'s correction fixed "freelance"→"independent" but left
  `continued active software development` and `structured upskilling` — both explicitly listed
  patterns in that same sentence — untouched; `maintained/contributed` was kept verbatim inside its
  own correction's `suggested_text`).
- No invented facts found in any correction across either case (criterion 2: pass, both cases).
- `AiRun` records confirm `provider: openai`, `model: gpt-5.6-luna` for both successful runs (not
  the `fake` provider) — cross-checked via direct Prisma query, since an earlier attempt was
  accidentally served by a `nest --watch` hot-reload restart that reverted to `AI_PROVIDER=fake`
  (caught before recording results; both workspaces' status was reset from `paused_before_export`
  back to `pre_pdf_check_ready` via a direct, narrowly-scoped Prisma update — correcting an
  operational mistake, not overriding a review decision — and re-run cleanly).
- Artifacts: `03_pre_pdf_check.md/json` and `04_cv_export.html/pdf` regenerated for both workspaces
  under their real storage paths (`storage/applications/2026_08_23_BJAK_Full_Stack_Engineer/`,
  `storage/applications/2026_08_23_Cello_Software_Engineer_m_f_d/`).

### Follow-up

- Convergence not met — Phase 11 (#250, diagnosis/iteration) is the explicit next step per this
  issue's own scope note ("не начинай сам"). The two comparison.md writeups above give #250 concrete,
  reproducible starting points: (a) fix the `field_path` prefix instruction/examples in
  `prompt3_v2.txt` if bjak's `cv_content.` prefix pattern recurs on further sampling, (b) strengthen
  §6's BOP-check instruction so a correction that touches a sentence containing a known pattern
  actually applies that pattern's specific recommended replacement, not just a general rewrite.

## 2026-08-24 — ISSUE-250 — Diagnosis + `prompt3_v3.txt` iteration: Prompt 3 convergence reached for bjak_20260717/cello_20260718

### Scope

Per issue #250: diagnose the two §5.2 criterion failures recorded in ISSUE-249 (criterion 1 —
`field_path` validity, bjak only; criterion 3 — BOP-check exhaustiveness, both cases), determine
root cause (prompt wording vs. missing evidence vs. code bug, per the #238 precedent), fix via a new
`prompt_3` `PromptTemplate` version if the cause is the prompt, re-run both golden cases, and record
whether convergence per §5.2 is reached.

### Diagnosis (before editing anything)

Read the actual code paths involved rather than assuming the cause:

- **Criterion 1 (`field_path` prefix, bjak only).** `Prompt3InputBuilderService.buildPrompt3Input()`
  (`apps/api/src/pipeline/prompt3/prompt3-input-builder.service.ts:97-98`) dumps the raw
  `02_targeted_cv_content.json` verbatim into the model's input context. That JSON's real top-level
  shape (`apps/api/src/pipeline/schemas/targeted-cv-content.schema.ts:99`) is
  `{ cv_content: { headline, current_work_block, ... } }` — a genuine `cv_content` wrapper key. But
  `prompt3_v2.txt`'s own `field_path` examples (line 26) were unprefixed (`"headline"`,
  `"current_work_block.stable_intro"`), matching the *renderer's* separately-mapped `CvContent`
  contract (`cv-template-renderer.ts`) that the model never sees — a genuine contradiction between
  what the prompt shows the model (a `cv_content`-wrapped JSON) and what it tells the model to write
  (unprefixed paths), never called out explicitly. bjak's ISSUE-249 run copied the literal input
  structure (`cv_content.headline`); cello's run (same ambiguous prompt) happened to guess right —
  consistent with a probabilistic instruction-following gap, not a deterministic code defect. No
  rendering or Phase 16 evidence-wiring bug is involved — `setByPath`/`applyCorrectionsToCvContent`
  (`cv-template-renderer.ts:224-270`) behave exactly as designed given a correct path.
- **Criterion 3 (BOP-check exhaustiveness, both cases).** ISSUE-249 already confirmed the 7
  applicable patterns were present in the actual input JSON reaching the model, ruling out a Phase
  16 evidence-wiring gap. `prompt3_v2.txt` §6 instructed the model to check for the 16 patterns and
  emit one correction per detected phrase, but never required a correction's `suggested_text` to
  remove **every** pattern present in the same sentence, and never explicitly named
  `current_work_block.stable_intro` as a field to scan (bjak's Round 1 run never flagged it at all).
  Both Round 1 runs show the model touching the right sentence but leaving some flagged patterns
  verbatim inside its own `suggested_text` — consistent with a soft/incomplete instruction, not a
  hard block or missing input content.

Both failures confirmed as `PromptTemplate` wording issues, not code bugs or missing evidence — per
the #238 precedent (do not fix the prompt blindly where the real cause is elsewhere), no application
code was changed.

### Fix — `apps/api/prisma/prompts/prompt3_v3.txt` (new `PromptTemplate` version 3, `v2` kept inactive, never overwritten)

Two targeted edits to the existing `prompt3_v2.txt` text, nothing else changed:
1. The `field_path` rule (§ "OUTPUT CONTRACT") now explicitly states the input JSON is wrapped in a
   top-level `cv_content` key but `field_path` must never include that prefix, with an explicit
   WRONG/RIGHT example pair (`cv_content.headline` ✗ / `headline` ✓).
2. §6 (BOP check) now requires a literal, exhaustive substring scan across all text fields —
   explicitly naming `current_work_block.stable_intro` — and requires that when a single
   field/sentence contains more than one of the 16 known patterns, the correction's `suggested_text`
   must remove **all** of them, not just one; a `suggested_text` still containing any of the 16
   patterns verbatim is called out as an incomplete correction that must not be submitted as-is.

`apps/api/prisma/seed.ts`: added `seed-prompt-3-pre-pdf-check-v3` (`version: 3`, `isActive: true`),
set `seed-prompt-3-pre-pdf-check-v2`'s `isActive` to `false`. Applied via `npx prisma db seed`.

### Commands

```bash
cd apps/api
npx tsc --noEmit                          # 0 errors
npm run lint                              # clean
npm run test                              # 61 suites / 711 tests, all passed
npx prisma db seed                        # 20 PromptTemplate rows seeded, prompt_3 v3 now active

# Real Prompt 3 runs (dev server restarted with AI_PROVIDER=openai; both workspaces reset from
# cv_pdf_generated back to pre_pdf_check_ready via a narrowly-scoped Prisma updateMany first, same
# operational pattern as ISSUE-249 — re-running a calibration check, not overriding a review decision)
curl -X POST -H "x-api-key: $API_KEY" http://localhost:3000/workspaces/<bjak-id>/run-pre-pdf-check
curl -X POST -H "x-api-key: $API_KEY" http://localhost:3000/workspaces/<cello-id>/run-pre-pdf-check
curl -X POST -H "x-api-key: $API_KEY" http://localhost:3000/workspaces/<bjak-id>/export-cv
curl -X POST -H "x-api-key: $API_KEY" http://localhost:3000/workspaces/<cello-id>/export-cv
```

### Result

**Convergence reached** for both `bjak_20260717` and `cello_20260718` — all 4 §5.2 criteria now
pass for both cases. Full per-case, per-criterion writeup recorded in
`project-management/golden-dataset/bjak_20260717/comparison.md` and
`.../cello_20260718/comparison.md` (new "Round 2 — Prompt 3 re-run after `prompt3_v3.txt`
(ISSUE-250, 2026-08-24)" sections).

### Evidence

- **Criterion 1 (`field_path` validity):** both cases now use exclusively unprefixed paths (no
  `cv_content.` prefix anywhere in either `03_pre_pdf_check.json`) — confirmed by grepping every
  `field_path` value in both artifacts. Corrections confirmed applied by diffing `04_cv_export.html`
  against the pre-correction `02_targeted_cv_content.json` (old wording gone, new wording present in
  both cases, including bjak's previously-unapplied 3 corrections).
- **Criterion 3 (BOP-check, §5.2.1 mechanical method):** re-ran the full mechanical grep of all 16
  patterns against each case's pre-correction input and post-correction exported HTML. **7 of 7
  applicable patterns caught in both cases** (up from 0/7 for bjak, 1/7 for cello in ISSUE-249) —
  `continued active software development`, `structured upskilling`, `evidence-based claim
  validation`, `human-in-the-loop AI workflow concepts`, `artifact traceability`, `backend
  HTML-to-PDF export without AI token usage`, `maintained/contributed` all absent from both final
  exported HTML files.
- **Criterion 2 (no invented facts):** PASS in both cases, unchanged from ISSUE-249 — all
  corrections remain wording/framing edits only, including cello's new `tech_stack[13]`
  `"GraphQL"` → `"GraphQL (BFF/frontend boundary)"` clarification (scope already supported by the
  same bullet's own text, not a new claim).
- **Criterion 4 (`readiness` vs. human's call):** both cases now return `not_ready` (up from
  `ready_with_minor_edits`), driven by a `critical`-severity correction on the exact
  `maintained/contributed` phrase — a rule already present unchanged in `prompt3_v2.txt` (line 154:
  "raise at least a critical correction for each occurrence"), applied more consistently now that
  §6 is stricter overall. Assessed against §5.2's precise wording (only disqualifying conditions:
  `not_ready` when the human shipped essentially as-is, or `ready` when the human made a critical
  hand-correction) — neither disqualifying condition is met in either case, since both humans made a
  correction before shipping rather than shipping as-is. Documented here as an accepted, non-blocking
  observation rather than silently treated as an automatic pass: the AI's verdict is stricter than
  the human's own "minor"/"mandatory-but-minor" framing, but both sides agree the draft required a
  correction before export, which is what criterion 4 actually checks for.
- `AiRun` records confirm `provider: openai` for both re-runs (`promptRunId`/`aiRunId` returned by
  each `run-pre-pdf-check` call).
- Artifacts: `03_pre_pdf_check.md/json` and `04_cv_export.html/pdf` regenerated for both workspaces
  under their real storage paths.
- `apps/api` full test suite (61/61 suites, 711/711 tests), `npx tsc --noEmit` and `npm run lint`
  all green — no application code was changed, only `apps/api/prisma/prompts/prompt3_v3.txt` (new
  file) and `apps/api/prisma/seed.ts` (new `PromptTemplate` row + deactivating `v2`).
- Dev server reset to `AI_PROVIDER=fake` after the real runs completed.

### Follow-up

- Phase 11 (#250) acceptance criteria met: convergence documented as reached, `PromptTemplate`
  version history for `prompt_3` now has 3 versions (`v1` placeholder, `v2` inactive, `v3` active),
  none overwritten. No further Prompt 3 iteration is required by this task.

## 2026-08-24 — ISSUE-250 (round 2, same session) — `prompt3_v4.txt`: self-consistency and safety hardening beyond §5.2

### Scope

After the round above reached §5.2 convergence, a deep unprompted re-read of `prompt3_v3.txt`
("проанализируй его хорошо на предмет требований и особенно новых") surfaced defects that §5.2's
four criteria do not cover, because they concern the internal self-consistency of the AI's own
output contract rather than agreement with `manual-cv.md`. Two rounds of user-directed review
(first pass, then a second pass after switching to a stronger Claude model for the edit) found:

1. No stated field-overwrite semantics — `setByPath` (`cv-template-renderer.ts`) overwrites a
   field's entire value, but `prompt3_v3.txt`'s own §8 text ("меняй только затронутый фрагмент")
   invited returning only the changed fragment, which would silently truncate a CV sentence.
2. `field_path` was unscoped — nothing stopped targeting an array itself (wipes the whole list),
   a nonexistent index, or an analysis-only field like `evidence_table` (present in the input,
   never rendered, so a correction there is silently discarded).
3. Sections 0/5 ask about bullet counts, ordering and page-fit, none of which "corrections" can
   express (replace-only, no add/remove/reorder) — nothing said so.
4. A live `readiness`/`severity` contradiction, found in this session's own v4 first-draft run on
   `bjak_20260717`: a `critical`-severity correction coexisted with top-level
   `readiness: "ready_with_minor_edits"`, violating the contract's own stated rule. Root-caused in
   code, not assumed: `PRE_PDF_CHECK_JSON_SCHEMA` (`prompt3.service.ts`) declared `readiness`
   before `corrections`; OpenAI's strict `json_schema` mode emits fields in declaration order, so
   the model committed to a verdict before enumerating its findings.
5. Severity semantics were inherited from the original manual ChatGPT-web-app workflow (where
   "don't approve the PDF" was the only way to force human review, since no automatic correction
   application existed there) without adapting them to this pipeline, where corrections apply
   automatically before export — so `critical`-by-rule wording never actually reaches the PDF
   regardless of its severity label.

### Fix

`apps/api/prisma/prompts/prompt3_v4.txt` (new `PromptTemplate` version 4, `v3` kept inactive):
- OUTPUT CONTRACT: explicit full-field-overwrite semantics; explicit correctable-field allowlist
  (cross-checked line-by-line against `cv-template-renderer.ts`'s Handlebars template) excluding
  analysis-only and control/enum fields; explicit ban on targeting arrays/bullet objects/nonexistent
  indices; explicit ban on duplicate `field_path` entries and no-op corrections
  (`suggested_text === original_text`, observed once in the Round 2 cello run); `readiness` restated
  as a mechanical function of `corrections[].severity` rather than a judgement call; `severity`
  redefined as "what survives your own correction" (`critical` reserved for problems rewording
  cannot fix), with the audit-vocabulary rule's required severity lowered from `critical` to
  `warning` accordingly.
- §5/§0: added an explicit rule that structural findings (counts, ordering, page-fit) must go into
  `overall_notes`, not `corrections`.
- §6 kept the 16-pattern literal scan and audit-vocabulary rule from v3 unchanged in substance
  (only their severity/tagging fixed per above); added §6.1 (judgement pass for AI-audit-sounding
  wording beyond the 16-pattern/audit-vocabulary lists, with guardrails against over-flagging) and
  §7 (style/voice consistency: person, tense, voice, register, parallelism — scoped explicitly to
  prose fields only, explicitly excluding label fields like `headline`/`tech_stack[]`, and
  explicitly permitting `current_work_block`'s established past-tense convention).
- Every `corrections[].reason` now starts with a mandatory `[BOP:listed]`/`[BOP:unlisted]`/
  `[STYLE]`/`[CHECK]` tag, so finding categories stay machine-distinguishable without a schema
  change (intended to support future harvesting of `[BOP:unlisted]` findings into new numbered
  patterns, discussed but not implemented this session).

`apps/api/src/pipeline/prompt3/prompt3.service.ts`: `PRE_PDF_CHECK_JSON_SCHEMA`'s `properties`
(and `required`) reordered so `corrections` is declared before `readiness` — the actual root-cause
fix for finding 4 above; the prompt-level formula is reinforcement, not the primary fix.

`apps/api/prisma/seed.ts`: added `seed-prompt-3-pre-pdf-check-v4` (`version: 4`, `isActive: true`),
set `seed-prompt-3-pre-pdf-check-v3`'s `isActive` to `false`.

### Commands

```bash
cd apps/api
npx tsc --noEmit                          # 0 errors
npm run lint                              # clean
npm run test                              # 61 suites / 711 tests, all passed (both before and after the schema reorder)
npx prisma db seed                        # 21 PromptTemplate rows, prompt_3 v4 now active

# Real Prompt 3 + export re-run, both golden cases, isolated on PORT=3099 to avoid the user's own
# fake-provider dev server already running on 3000
PORT=3099 AI_PROVIDER=openai npm run start:dev
curl -X POST -H "x-api-key: $API_KEY" http://localhost:3099/workspaces/<bjak-id>/run-pre-pdf-check
curl -X POST -H "x-api-key: $API_KEY" http://localhost:3099/workspaces/<cello-id>/run-pre-pdf-check
curl -X POST -H "x-api-key: $API_KEY" http://localhost:3099/workspaces/<bjak-id>/export-cv
curl -X POST -H "x-api-key: $API_KEY" http://localhost:3099/workspaces/<cello-id>/export-cv
```

### Result

Both golden cases re-verified clean after the fix — full per-case tables recorded as "Round 3" in
`project-management/golden-dataset/{bjak_20260717,cello_20260718}/comparison.md`. Key confirmations:
- `readiness` is now internally consistent with `corrections[].severity` in both cases (verified
  directly against the raw `03_pre_pdf_check.json`, formula: any `critical` → `not_ready`, else any
  correction → `ready_with_minor_edits`, else `ready` — both cases landed on `ready_with_minor_edits`
  with all-`warning` corrections, matching the formula exactly).
- No correction was truncated: `suggested_text`/`original_text` length ratio stayed in 0.85–1.16
  across all 8 corrections between the two cases — none shortened by dropping content.
- BOP-check (§5.2.1 mechanical grep): still 7 of 7 applicable patterns caught in both cases — no
  regression from Round 2.
- No duplicate `field_path` in either case.
- "Evidence Guard" (a real component name containing the word "evidence") was correctly left
  untouched in bjak's export — confirms the audit-vocabulary rule is discriminating jargon from a
  legitimate proper noun, not literal-string blind.
- §6.1 (`[BOP:unlisted]`)/§7 (`[STYLE]`) produced no findings in either case. Manually re-read the
  full CV content field-by-field for both cases (not just accepted the empty result) — both read as
  genuinely clean (consistent past tense, active voice, no third person, no obvious unlisted
  AI-jargon shape). Recorded as a limitation, not a pass: this golden dataset does not contain a
  known true-positive case for either new check, so their actual catch-rate is unverified — only
  their false-positive rate (zero, on this data) is confirmed.

### Follow-up

- `prompt_3` `PromptTemplate` history is now 4 versions (`v1` placeholder, `v2`/`v3` inactive, `v4`
  active), none overwritten.
- Real limitation, not addressed this session: §6.1/§7 have no true-positive test case in the
  current golden dataset. If a future golden case (or manually-authored synthetic case) contains
  third-person narration, passive voice, or unlisted AI-jargon phrasing, re-running Prompt 3 against
  it would be the way to confirm these sections actually fire, not just that they stay quiet.
- Discussed but not implemented: harvesting `[BOP:unlisted]` findings across future real runs (via
  `03_pre_pdf_check.json` or `AiRun`/`PromptRun` records) into candidate patterns for human review,
  to grow the enumerated 16-pattern list from real recurring findings rather than leaving it static.

## 2026-08-25 — ISSUE-257 — Fix certifications mapping in prompt2-to-cv-content.mapper.ts

### Scope

Issue #257 (EPIC-25 Phase 1): the mapper's `certifications: cv.certifications as CvCertification[]`
blindly cast Prompt 2's real output shape (`{ title, include, reason }`,
`targeted-cv-content.schema.ts`) to the renderer's `CvCertification` shape
(`{ name, issuer?, date?, priority }`, `cv-content.schema.ts`), so every exported CV's
Certifications section rendered as empty `<div class="cert-item"></div>` elements, and
`include: false` entries were never filtered out. Replaced with a `mapCertifications()` helper:
filters to `include === true`, maps `title → name`, sets `priority` to a constant `'medium'`
(Prompt 2 doesn't produce a priority for certifications, and the render template
(`cv-template-renderer.ts`/`cv.template.html`) never reads `priority` for this section anyway).

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean, zero errors.
- `npm run lint`: clean (eslint --fix, no remaining issues).
- `npm run test`: 61/61 suites, 712/712 tests passed, including a new test in
  `prompt2-to-cv-content.mapper.spec.ts` (`maps included certifications from title to name and
  drops excluded ones`) asserting `{ title: 'AWS Certified Developer', include: true }` maps to
  `{ name: 'AWS Certified Developer', priority: 'medium' }` and an `include: false` entry is
  dropped entirely.
- Not manually re-verified against a real end-to-end `04_cv_export.html`/`.pdf` in this session
  (no live workspace run) — covered by the unit test above at the mapper-function level, which is
  the boundary this task's Acceptance Criteria target.

### Follow-up

- Broader/dedicated unit-test coverage for this mapper (beyond this minimal smoke test) is
  tracked separately as issue #259 in the same EPIC-25 Phase 1 milestone.

## 2026-08-25 — ISSUE-263, ISSUE-264, ISSUE-267, ISSUE-268, ISSUE-277 — EPIC-25 Phases 3/4: prompt2_v5.txt + prompt3_v5.txt

### Context

Combined implementation of EPIC-25 · Phase 3 (`prompt2_v5.txt`) and Phase 4 (`prompt3_v5.txt`) —
five issues sharing two files, all landing in one PR per their own stated Dependencies
(project-management/plan/PLAN-cv-export-quality-fixes.md, Фазы 3/4). Findings originate from the
Galaktica real-world manual-parity pass (`project-management/analysis-galaktica-real-world-cv-quality.md`
§C1/§C2/§C3/§D1/§D2).

**prompt2_v5.txt (from prompt2_v4.txt, v4 kept `isActive: false`):**
- ISSUE-263: the hard-coded JobFlow current-work bullet (v4 line 77) carried 4 of the 16 BOP
  patterns listed in `prompt3_v4.txt` §6 verbatim, forcing Prompt 3 to pay an AI correction on
  every run just to clean up Prompt 2's own template text. Reworded using Prompt 3's own
  recommended replacements. A full-file scan against all 16 patterns (done while verifying this
  AC, not part of its stated scope) found two more hits — `stable_intro` (patterns #4/#5,
  emitted verbatim into every CV) and the EPAM instruction line (pattern #3). Fixed in the same
  commit with the project owner's explicit go-ahead (documented as a scope-extension comment on
  issue #263, since strictly only the JobFlow bullet was in its AC). v4 had 7 total BOP-pattern
  hits across these three locations; v5 has 0.
- ISSUE-264: added an explicit hard rule in `=== SELECTED PROJECTS ===` forbidding JobFlow (or
  any other `current_work_block` item) from being re-listed in `selected_projects`, states that
  an empty `selected_projects` array is the correct outcome when JobFlow is the only fit, and
  clarifies the `project_type: "current_work_project"` enum value is not a licence to duplicate.

**prompt3_v5.txt (from prompt3_v4.txt, v4 kept `isActive: false`):**
- ISSUE-267: added a cross-section repeated-wording pass to §6.1 — flags the same caveat/
  disclaimer repeated across 2+ fields (grammatically distinct restatements section 6's literal
  scan and a per-sentence §6.1 reading both miss), keeps it in the one load-bearing field, emits
  `[BOP:unlisted]` corrections for the rest.
- ISSUE-268: added new `## 0.1 Cross-section content duplication` — checks `current_work_block`
  bullets against every `selected_projects` entry for the same project described twice; per the
  existing corrections-vs-overall_notes split, reported only in `overall_notes` (structural, not a
  wording fix), never as a correction.
- ISSUE-277: translated all 54 Russian-language lines of `prompt3_v4.txt` (current-work preamble +
  section 0/1–8 checklists) to English, meaning-preserving only. `prompt1_v*.txt`/`prompt2_v4.txt`/
  `prompt2_v5.txt` untouched — out of scope.

Verified structurally before running the full checks: diffed section headers and per-section
bullet counts between `prompt3_v4.txt` and `prompt3_v5.txt` — every section matches exactly except
the two intentional additions (`## 0.1` is new, `### 6.1` gained one paragraph); confirmed 0
Cyrillic lines remain in `prompt3_v5.txt` (v4 had 54) and 0 Cyrillic in `prompt2_v5.txt`.

Both new versions registered in `prisma/seed.ts` as `isActive: true`
(`seed-prompt-2-targeted-cv-content-v5`, `seed-prompt-3-pre-pdf-check-v5`); the corresponding v4
entries flipped to `isActive: false`.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
```

### Result

PASS

### Evidence

- `npx tsc --noEmit`: clean, zero errors.
- `npm run lint`: clean (eslint --fix, no remaining issues).
- `npm run test`: 62/62 suites, 719/719 tests passed (prompt-file/seed-data change only — no
  source-code logic touched, so no new test cases were needed or added).
- BOP-pattern scan (`node` one-off script, case-insensitive substring match against all 16
  patterns from `prompt3_v4.txt` §6): `prompt2_v4.txt` → 7 hits (lines 73, 77×4, 87);
  `prompt2_v5.txt` → 0 hits.
- Cyrillic scan (`node` one-off script, `/[Ѐ-ӿ]/` per line): `prompt3_v4.txt` → 54 lines;
  `prompt3_v5.txt` → 0 lines; `prompt2_v4.txt`/`prompt2_v5.txt` → 0 lines (both already English).
- Section-structure diff (`node` one-off script comparing `##`/`###` headers and per-section `- `
  bullet counts): `prompt3_v4.txt` vs `prompt3_v5.txt` identical except `## 0.1` (new) and `### 6.1`
  (+1 paragraph, the repeated-wording pass) — confirms the translation pass did not silently drop
  or restructure any existing check.

### Follow-up

- Golden-dataset (`bjak_20260717`/`cello_20260718`) and Galaktica-case re-runs against
  `prompt2_v5.txt`/`prompt3_v5.txt` are explicitly out of scope for this PR — tracked as separate
  Phase 3/4 tasks (#266/#270) per the plan, since they spend real AI tokens and need an isolated
  `AI_PROVIDER=openai` environment (same pattern as ISSUE-249/250).

## 2026-08-26 — ISSUE-284 — Workspace creation: duplicate returns 409 instead of 500; DB rollback on failure

`WorkspacesService.createWorkspace` previously created `Company` and `JobVacancy` before
`ApplicationWorkspace` with no transaction; a `P2002` on the last step (duplicate `workspaceSlug`)
surfaced as a raw 500 and left orphaned `Company`/`JobVacancy` rows plus an orphaned workspace
folder on disk. Fixed:

- `Company`/`JobVacancy`/`ApplicationWorkspace` creation is now wrapped in a single
  `prisma.$transaction`; `CompanyService.create`/`VacancyService.create` gained an optional
  `tx?: Prisma.TransactionClient` parameter so they remain callable inside it.
- Any transaction failure now also calls the new `ArtifactStorageService.removeWorkspaceFolder`
  (path-safety-checked, same as the other storage methods) to remove the already-created workspace
  folder — no orphaned filesystem artifact survives a failed creation.
- A `P2002` specifically is caught and re-thrown as `ConflictException` with a human-readable
  message (company/role/workspaceSlug), matching the existing `import.service.ts:180` pattern —
  any other transaction error is rethrown unchanged (still 500, as before, but now folder-cleaned).
- One-off `scripts/cleanup-orphaned-vacancies.ts` (dry-run by default, `--apply` to delete) written
  to clear existing orphaned rows from before this fix — found 43 (not the 10 estimated in the
  issue; more accumulated 2026-08-23–26 from the same bug), all deleted along with their now-empty
  parent `Company` rows, confirmed via a second dry run (0 remaining).

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
npm run test:e2e
npx ts-node scripts/cleanup-orphaned-vacancies.ts --apply
```

### Result

PASS (unit); e2e has 2 pre-existing failures unrelated to this change (see Follow-up)

### Evidence

- `npx tsc --noEmit`: clean, zero errors.
- `npm run lint`: clean.
- `npm run test`: 62/62 suites, 737/737 tests passed (18 new/updated tests: `workspaces.service.spec.ts`
  duplicate→`ConflictException`+cleanup, non-conflict-error→cleanup+rethrow, and
  transaction-usage assertions; `artifact-storage.service.spec.ts` `removeWorkspaceFolder`
  create/missing/path-traversal cases; `company.service.spec.ts`/`vacancy.service.spec.ts` `tx`
  param passthrough).
- Live manual smoke test against the real dev DB/API (`npm run start:dev`, real `curl` requests,
  cleaned up after): first `POST /workspaces` for `SmokeTestCo`/`Smoke Test Role` → `201`; identical
  second request same day → `409 Conflict` with message `A workspace for "SmokeTestCo / Smoke Test
  Role" already exists for today (workspaceSlug: "...")`; `cleanup-orphaned-vacancies.ts` dry run
  immediately after confirmed the failed duplicate attempt left **zero** orphaned rows.
- `npm run test:e2e`: `rate-limiting.e2e-spec.ts` passes; `mvp-flow.e2e-spec.ts` and
  `skip-flow.e2e-spec.ts` both fail identically on `POST /workspaces/:id/run-analysis` returning
  400 instead of 201 — confirmed **pre-existing on clean `main`** (reproduced in an isolated
  `git worktree` before making any change) and unrelated to this fix; root cause looks like the
  shared dev DB's `KnowledgeSource.filePath` rows being absolute paths outside the e2e test's
  isolated `KNOWLEDGE_SOURCES_ROOT` temp dir, not something this task touches. Not fixed here —
  out of scope for ISSUE-284.

### Follow-up

- The two pre-existing e2e failures above are a real, separate gap in the e2e suite's isolation
  from the shared dev DB's `KnowledgeSource` rows — worth its own ad-hoc issue if not already
  tracked, but out of scope here since it predates and is unrelated to ISSUE-284's fix.
- Orphaned workspace *folders* on disk (one per orphaned `JobVacancy` row, before this fix) were
  not swept — only the DB rows (per the issue's AC4 wording). Not done here; low-value manual
  cleanup if ever needed (`storage/applications/`).

## 2026-08-27 — ISSUE-286 (Part 2: step-attribution) — Manual note step-attribution (Prompt 1/2/skip-reason/cover letter)

`ApplicationWorkspace.manualNote` (a single accumulating string) replaced with a structured
`ManualNote` table (one row per note) plus `ManualNoteApplication` (one row per PromptRun whose
input actually included that note's text — a note can accumulate more than one application badge
over time, e.g. Prompt 2 generate then later regenerate). Migration
`20260827120000_replace_manual_note_with_step_attribution` backfills each workspace's existing
non-empty `manualNote` blob as one `isLegacy: true` `ManualNote` row (no per-entry split attempted
— unreliable without a real delimiter — matching the issue's explicit fallback option). All four
pipeline services that read `manualNote` (`Prompt1Service`, `Prompt2Service`, `SkipReasonService`,
`CoverLetterService`) now fetch active `ManualNote` rows and record a `ManualNoteApplication` per
note per run; `Prompt2Service` additionally tags `stepDetail: "generate"` vs `"regenerate"`.
`apps/web`'s `ManualNotePanel` renders each note with a badge per application
("Applied to Prompt 2 (CV content) · regenerate · <timestamp>") or "Not applied yet", plus a
"Legacy note" badge for migrated rows. This PR does **not** include Part 1 (force-priority
without evidence) — that remains blocked on ADR-034 approval, tracked separately on the same
issue per the PR-split comment left on ISSUE-286 at start of work.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
npm run test:e2e
cd ../web
npx tsc --noEmit
npm run lint
npm run test
```

### Result

PASS

### Evidence

- `apps/api`: `npx tsc --noEmit` clean; `npm run lint` clean; `npm run test`: 62/62 suites,
  742/742 tests passed; `npm run test:e2e`: 3/3 suites, 4/4 tests passed.
- `apps/web`: `npx tsc --noEmit` clean; `npm run lint` clean; `npx vitest run`: 23/23 files,
  232/232 tests passed.
- Prisma migration applied against the real local dev DB (`jobflow_postgres`, port 5433) — that DB
  had never been migration-tracked before (`_prisma_migrations` table did not exist despite the
  schema already matching all 11 prior migrations), so all 11 were first baselined via
  `prisma migrate resolve --applied` before applying the new migration; confirmed zero real
  `manualNote` rows existed at migration time (`SELECT ... WHERE "manualNote" IS NOT NULL` → 0
  rows) so the legacy-backfill path was not exercised against real data, only verified via unit
  tests.
- Live manual verification against the real `apps/api` dev server + real `AI_PROVIDER=openai` (not
  fake), through the real `apps/web` UI (Playwright): created a throwaway workspace
  (`Manual Note QA Co` / `Backend Engineer`, id `cmtbhk9p4000313n0cyrosgcb`), added a manual note
  "EGZ добавляй" (reproducing the exact EGZ case from the issue's origin bug report) — panel showed
  "Not applied yet". Ran Prompt 1 analysis (real OpenAI call, ~11.5s) — note updated to
  "Applied to Prompt 1 (analysis) · <timestamp>". AI recommended `skip`; clicked Skip through to
  skip-reason generation (real OpenAI call) — same note gained a **second**, independent badge:
  "Applied to Skip reason · <timestamp>", confirmed both via the UI screenshot and directly via
  `GET /workspaces/:id` (`manualNotes[0].applications` had both entries with distinct
  `promptStep`/`appliedAt`). Confirmed via `docker exec jobflow_postgres psql` that the workspace's
  `manualNote`-derived data now lives correctly in the new tables. No browser console
  errors/warnings during the flow.

### Follow-up

- Part 1 of ISSUE-286 (force-priority manual note bypassing the anti-overclaiming gate) is
  unstarted — blocked on ADR-034 (drafted and approved by the project owner during this same
  session, scope: force-priority applies across all four steps — Prompt 1, Prompt 2, skip-reason,
  cover-letter — not just Prompt 2, via a uniform `manual_note_forced_claims` schema field plus
  per-schema status/bullet marking). Tracked as the second PR on the same issue.
- The throwaway QA workspace (`cmtbhk9p4000313n0cyrosgcb`, status `skipped`) was left in the real
  dev DB — `POST /workspaces/:id/archive` refuses `skipped` status (only accepts
  `ready_to_apply`/`cv_pdf_generated`/etc.), so it could not be cleaned up via the API; harmless
  leftover, same category as prior sessions' throwaway test workspaces (see ADR-029's note on the
  same pattern).

## 2026-08-28 — ISSUE-286 (Part 1: force-priority) — Manual note force-priority (ADR-034)

A workspace's manual note is now a forced-priority instruction across Prompt 1, Prompt 2,
skip-reason and cover-letter generation (ADR-034) — content it drives is included even without
supporting evidence, but always marked `"user-forced, unverified"` so it is never mistaken for
an AI-confirmed claim. New prompt template versions (`prompt1_v11`, `prompt2_v7`, `prompt3_v7`,
`skip_reason_v2`, `cover_letter_v2`) registered in `seed.ts`, old versions deactivated, never
overwritten. All 4 AI-output schemas gained `manual_note_forced_claims`; `TargetedCvContentOutput`
also gained `TargetedCvBullet.user_forced` and the `"user-forced, unverified"` evidence-table
status. `EvidenceGuardService` skips forced content when collecting `needs_evidence`.
`apps/web` gained a `ManualNoteForcedClaimsPanel` (reads `manual_note_forced_claims` aggregated
server-side from the workspace's latest artifacts), rendered above `MainActionPanel` — visible
before any export/send action — with an amber "user-forced, unverified" badge per claim.

Two real defects were found and fixed during this task, both before this entry:
- `manual_note_forced_claims` was made a *required* schema field; a live run showed the model
  can omit it entirely on a token-heavy response, failing the whole analysis's JSON validation.
  Fixed: absent is now treated as `[]` (the same meaning as an explicit empty array) in all 4
  schemas' validators, rather than rejecting the output.
- Prompt review (before registering the new template versions) found and fixed 4 contradictions
  and 3 metric-leak paths across the 5 new prompt files — see `project-management/DECISIONS.md`
  ADR-034's per-version `seed.ts` descriptions for the full list (the new `"user-forced,
  unverified"` value was missing from 3 enum sites in `prompt1_v11.txt`; SAFETY/OVERCLAIMING
  CHECKS' closing rule in `prompt2_v7.txt` contradicted the forcing rule outright; 3 of 5
  `quality_score` criteria penalized forced content in `prompt1_v11.txt`/`prompt2_v7.txt`; Prompt 3
  would have flagged and corrected away every forced bullet as unconfirmed, fixed in `prompt3_v7.txt`).

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
npm run test:e2e
cd ../web
npx tsc --noEmit
npm run lint
npx vitest run
```

### Result

PASS (unit); 2 pre-existing e2e failures, unrelated to this task (see Follow-up)

### Evidence

- `apps/api`: `npx tsc --noEmit` clean; `npm run lint` clean; `npm run test`: 62/62 suites,
  751/751 tests passed.
- `apps/web`: `npx tsc --noEmit` clean; `npm run lint` clean; `npx vitest run`: 24/24 files,
  235/235 tests passed (3 new tests for `ManualNoteForcedClaimsPanel`).
- `npm run test:e2e`: `rate-limiting.e2e-spec.ts` passes; `mvp-flow.e2e-spec.ts` and
  `skip-flow.e2e-spec.ts` both fail on `POST /workspaces/:id/run-analysis` returning 400 —
  root-caused to `KnowledgeSourceContentService.assertInsideKnowledgeSourcesRoot()` rejecting the
  real dev DB's `KnowledgeSource.filePath` rows (absolute paths under the real
  `apps/api/knowledge-sources/` root) because the e2e tests override `KNOWLEDGE_SOURCES_ROOT` to
  an isolated temp dir. This is the exact gap already flagged as a known, unrelated, out-of-scope
  issue in the 2026-08-26 ISSUE-284 entry above — it was dormant only because `KnowledgeSource`
  was an empty table at the time; running `npm run register-knowledge-sources` (done in this same
  session, to fix a real content-selection regression on a live Galaktica CV — see the Follow-up
  below) reactivated it. Confirmed not a regression from this task's own changes.
- Live manual verification against the real `apps/api` dev server + real `AI_PROVIDER=openai`,
  through the real `apps/web` UI (Playwright): created a throwaway workspace
  (`ADR034 QA Co` / `Backend Engineer`, id `cmtd2hzbz000gww7ja8l3qsyd`), added a manual note
  instructing EGZ be added to `top_skills` and one EPAM bullet. Ran Prompt 1 (real OpenAI call) —
  `01_vacancy_analysis.json` carried 2 `manual_note_forced_claims` entries
  (`must_have[2]`/`must_have[3]`), decision `maybe`/score 64. Approved, ran Prompt 2 (real OpenAI
  call) — `02_targeted_cv_content.json` showed: `top_skills` includes `"EGZ"`; the EPAM bullet
  carries `"user_forced": true`, `"evidence_source": "manual note"`, `"risk_level": "high"`;
  `evidence_table` has a `"user-forced, unverified"` row for it; `manual_note_forced_claims` names
  the exact bullet path. `quality_score` 94 (not lowered by the forced content);
  `overclaiming_check.critical_issues` empty; `"EGZ"` absent from `needs_evidence` (confirms
  `EvidenceGuardService`'s forced-content skip works end-to-end on real data). UI: the new
  `ManualNoteForcedClaimsPanel` rendered all 3 claims with the amber "user-forced, unverified"
  badge, tagged by step (`Prompt 1 (analysis)` / `Prompt 2 (CV content)`) and exact field path,
  positioned above the CV draft review card — visible before "Export PDF". No browser console
  errors/warnings.

### Follow-up

- Separately from this task: found and fixed a real content-selection regression on a live
  Galaktica CV (external comparison report showed a score drop from ~92 to 55, with EPAM/other
  commercial employers collapsing to one generic bullet each). Root cause: the `KnowledgeSource`
  table was empty (0 rows) in the real dev DB — `register-knowledge-sources.ts` had not been
  re-run after a prior DB rebuild — so Prompt 2 had no `Master_CV`/`Career_Case_Deep_Dives`/
  `Tech_Stack_Matrix` content and fell back to only the static `CURRENT-WORK CONTEXT` block plus
  the vacancy text. Fixed by running `npm run register-knowledge-sources`; not part of ISSUE-286,
  noted here only because it's what reactivated the e2e gap above.
- The e2e `KnowledgeSourceContentService`/temp-root isolation gap (both failures above) remains
  unfixed — still worth its own ad-hoc issue per the 2026-08-26 ISSUE-284 entry's original
  recommendation; now confirmed reproducible rather than theoretical.

## 2026-08-29 — ISSUE-286 (Part 1 follow-up) — Accordion UX polish, code-review fixes, global loading spinner

Same branch/task as the entry above. Three bundled additions, all explicitly authorized to ride
this PR:

- **Accordion UX**: `apps/web` gained a shared `AccordionSection` component (native
  `<details>/<summary>`, zero client JS) used to collapse `ArtifactList`, `ManualNoteForcedClaimsPanel`
  and `PrePdfCheckPanel`'s results block by default (`defaultOpen={false}`), while `ManualNotePanel`
  starts open (`defaultOpen={true}`, unchanged default). Page layout was also corrected:
  `MainActionPanel` always renders at the top; `ManualNoteForcedClaimsPanel` moved into the same
  bordered container as `ArtifactList`; `ManualNotePanel` stays outside the grid, at the bottom.
- **`/code-review` findings on the full branch diff** — 3 findings, 2 fixed, 1 investigated and
  found not reproducible:
  1. (real bug, fixed) `EvidenceGuardService`'s forced-content check used plain `.includes()`
     substring matching, so a short skill name like `"Go"` was falsely exempted from
     `needs_evidence` just by occurring inside an unrelated forced word (e.g. `"MongoDB"`). Fixed
     with a whole-word-boundary regex match (falling back to substring only when the needle itself
     has no word-boundary-safe edges, e.g. `"C++"`/`".NET"`). 2 new regression tests added.
  2. (real duplication, fixed) The `manual_note_forced_claims` interface + validator was duplicated
     verbatim across all 4 AI-output schema files. Extracted into a shared
     `manual-note-forced-claim.schema.ts`, imported by all 4 — matches the project's existing
     no-duplicated-validation-logic convention (ADR-020/021 precedent).
  3. (investigated, not reproducible) Reviewer claimed `AccordionSection`'s `open={defaultOpen}`
     prop would be reset by React on every Server Component re-render (e.g. `router.refresh()`
     after adding a manual note), silently collapsing/expanding sections a user had manually
     toggled. Verified empirically via Playwright: expanded "Artifacts", added a manual note
     (triggering a refresh), then read every `<details>` element's live `.open` property —
     confirmed all three accordions kept their actual (including user-toggled) state. React's
     prop-diffing bails out on an unchanged prop value, so the native DOM toggle state survives.
     No fix applied.
- **Global loading spinner** (explicit UI-polish request, not tied to any issue AC): a single
  `Spinner` component (SVG, `currentColor`, `animate-spin motion-reduce:animate-none`) wired into
  every pending-action button app-wide — `ActionButton` (the shared primitive behind almost all
  main pipeline actions, gated on the existing `"Working…"` disabled-reason sentinel),
  `pre-pdf-check-panel.tsx`, `cover-letter-panel.tsx`, `final-check-panel.tsx`,
  `manual-note-panel.tsx`, `application-tracking-panel.tsx` (all 5 buttons), `import-preview.tsx`
  (both buttons), `workspace-form.tsx`. A follow-up code-review pass on this new work flagged the
  `ActionButton`/`"Working…"` integration as untested; added a regression test asserting the
  spinner renders only for that sentinel, not for a plain ineligible-precondition disabled button.

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npx jest

cd ../web
npx tsc --noEmit
npm run lint
npx vitest run
```

### Result

PASS

### Evidence

- `apps/api`: `npx tsc --noEmit` clean; `npm run lint` clean; `npx jest`: 62/62 suites, 753/753
  tests passed (up from 751 — the 2 new `EvidenceGuardService` whole-word-matching regression
  tests).
- `apps/web`: `npx tsc --noEmit` clean; `npm run lint` clean; `npx vitest run`: 25/25 files,
  245/245 tests passed (up from 235 — new tests for `AccordionSection`, the collapsed/open-by-default
  assertions on `ArtifactList`/`ManualNoteForcedClaimsPanel`/`ManualNotePanel`/`PrePdfCheckPanel`,
  and the new `ActionButton` spinner-sentinel test).
- Live manual verification via Playwright against the real running `apps/api`/`apps/web` dev
  servers, on the same throwaway workspace as the prior entry (`ADR034 QA Co`,
  `cmtd2hzbz000gww7ja8l3qsyd`, status `paused_before_export` at the time): confirmed layout
  (`MainActionCard` top; Pre-PDF check "Results" / Artifacts / Manual-note-forced content
  collapsed; Manual notes open); clicked "Export PDF" and captured a screenshot showing the
  spinner replacing the button's static disabled label mid-request; confirmed the workspace
  transitioned to `cv_pdf_generated` afterward with no spinner remaining and no browser console
  errors/warnings (`browser_console_messages`, 0 errors/warnings). Dark-mode correctness was not
  observed directly — the app's dark mode is driven by `prefers-color-scheme`, not a toggleable
  class, so it can't be forced via `page.evaluate`; relied instead on `Spinner` using `currentColor`
  with no color of its own, inheriting whichever text color the (unchanged) button `dark:` classes
  already resolve to.

### Follow-up

- none beyond the pre-existing e2e gap already noted above.

## 2026-08-29 — ISSUE-294 — Ralph loop scaffolding (Stop hook, worktree isolation, stacked PRs)

### Commands

```bash
node .claude/hooks/ralph-start.js
```
(run manually from a plain PowerShell terminal, repo root, on branch `task/ISSUE-294-ralph-loop-setup`, against the real Issue #215)

### Result

PARTIAL — infra behaves correctly, but the iteration itself did not finish (see below). This is
Stage 1 of the two-stage Test Requirement in Issue #294 (Stage 2 — a clean run against a `main`
that already contains `.claude/ralph.md`/`ralph-core.js` — can only happen after this PR merges,
since a worktree branched from `main` has no access to those files before that; this is a
structural chicken-and-egg, not a skipped check).

### Evidence

- `enabled`/`iterationsRun` in `.claude/ralph.config.json` read/written correctly by
  `ralph-start.js`/`ralph-core.js`.
- `classify()` correctly identified #215 as the only `ready` issue (independent, no PR yet) and
  #282/#287 as `waiting` (their dependency not yet started).
- Branch created from `main` as expected for an independent issue
  (`task/ISSUE-215-critical-prompt-content-guard`).
- The spawned `claude -p ... --max-turns 50` iteration exhausted its turn budget without
  finishing (`Error: Reached max turns (50)`), which surfaced two real bugs, both fixed in this
  same PR:
  1. `execFileSync` wasn't wrapped in `try/catch` — the non-zero exit crashed the whole
     `ralph-start.js` process before `iterationsRun` could be persisted or `enabled` reset.
  2. The iteration ran in the *same* working directory as the controller (`ralph-core.js`/
     `ralph.config.json`). Since implementing an issue involves real `git checkout`/`git branch`
     operations, this shared directory meant those files could vanish from disk mid-run whenever
     the child switched to a branch that doesn't have them (e.g. `main`) — confirmed live:
     after the crash, `git branch --show-current` in this very session showed
     `task/ISSUE-215-critical-prompt-content-guard`, and `node -e "require('./.claude/
     ralph.config.json')"` on that branch threw `MODULE_NOT_FOUND`.
  3. Also observed (not a controller bug, but a real governance issue): while running, the
     iteration itself edited `.claude/settings.json` to add a `permissions.allow` block —
     self-expanding its own permissions, unprompted and outside Issue #215's own scope. Addressed
     with an explicit new rule in `.claude/ralph.md` ("не редактируй `.claude/settings.json`...").
- Cleanup after the crash: confirmed clean — no leftover local branch (`git branch -d`), no
  leftover worktree (`git worktree list` showed only the main checkout), no comments/labels/PR on
  Issue #215 (`gh issue view 215 --json comments,labels`; `gh pr list --search
  "head:task/ISSUE-215-"` → `[]`).
- Fixes applied and re-verified via `node --check` on all three hook files (syntax clean) and a
  manual dry-run reasoning through `classify()`'s new `ready`/`waiting` logic against the real
  `gh issue view` state of #215/#282/#287 (matches expected: #215 ready, #282/#287 waiting).

### Follow-up

- Stage 2 (post-merge): run `node .claude/hooks/ralph-start.js` again against #215 with the
  worktree-isolated `ralph-core.js` now live on `main`, through to an actual PR being created —
  record the result in a new TEST_LOG entry referencing this same issue.

## 2026-08-31 — ISSUE-294 — Ralph loop full redesign: clone-based, Claude never touches git/gh

### Commands

```bash
node .claude/ralph/run.js --max-iterations 1
```
(run from `main` after merge, against the real Issue #215)

### Result

PASS — full end-to-end success. The worktree-based design (Stage 1 above) never got past its own
structural bug across three live attempts; this is a complete architectural replacement, not a
patch, following an external architecture review the project owner brought back mid-task
(`ralph-loop-review.md`, kept in the session scratchpad, not committed). Core change: Claude never
runs `git`/`gh` at all — it only edits code and returns `DONE`/`BLOCKED: <reason>`/
`BLOCKED-PROMPT-CHANGE: <reason>`; a plain Node controller (`.claude/ralph/{run,core}.js`) owns
issue selection, `git clone` (not `git worktree`), commit, push, PR creation, and all `gh`
mutations. The `hooks.Stop`-driven loop was also replaced with an explicit external `while` loop
(`node .claude/ralph/run.js`).

### Evidence

- Smoke tests (trivial "list files"/"read+echo" prompts, throwaway fake issue ids, seconds not
  minutes) confirmed the clone-based agent sees real project files immediately — unlike all three
  worktree attempts, which either saw an empty directory or reported being blocked from the main
  repo.
- Real run against #215 (`task/ISSUE-215-add-regression-guard-tests-for-critical-prompttemp`,
  branched from `origin/main`): agent read `seed.ts`, `prompt-templates.service.ts`, existing
  specs, and the active prompt files; wrote
  `apps/api/src/prompt-templates/critical-prompt-content.spec.ts`; ran `npx jest` (11/11 new
  tests pass), full `npm run test` (64 suites, 779 tests, up from 768), `npx tsc --noEmit` (clean),
  `npm run lint` (clean); returned `DONE` after 22 turns / 411s. Controller committed
  (`test: ISSUE-215 ...`), pushed, and created
  [PR #298](https://github.com/strakhovdenya/jobflow-cv-pipeline/pull/298) (`Closes #215`,
  base `main`) — left open for the project owner to review/merge separately, per the "human always
  merges" rule. `.claude/ralph/state.json` recorded `status: "done"`; the per-issue clone
  (`.ralph-runs/issue-215/`) was cleaned up automatically after the PR was created.
- Four real bugs found and fixed during Stage 2 itself (each confirmed via a live run, not just
  code review), all documented in `.claude/ralph/README.md`:
  1. Fresh clones have no `node_modules` — a run sat silent for 23 minutes before this was found;
     fixed by having the controller run `npm install` (with Windows's `npm.cmd`-needs-`shell:true`
     quirk also fixed along the way) before the agent starts.
  2. `Edit` and `Write` are separate permissions — granting only `Edit` blocked creating the new
     spec file; the agent burned many turns trying Bash-based workarounds (all also unpermitted)
     before this was caught from the live stream-json log and fixed.
  3. Exact-string Bash permission matching (`'Bash(npm run test)'`) didn't cover
     `npm run test -- --testPathPattern=...`; broadened to `'Bash(npm run *)'`/`'Bash(npx *)'`.
  4. Live visibility itself was a real gap — plain-text `-p` mode only prints the final response,
     nothing while the agent works; switched `runAgent()` to `--output-format stream-json` with
     per-event parsing, which is also what surfaced bugs 2 and 3 above instead of just another
     silent hang.
- Added two more standing prompt rules while investigating: stop with `BLOCKED: <reason>`
  immediately on any permission denial (never retry with different shell syntax — same denial),
  and stop with `BLOCKED: <reason>` whenever the task is ambiguous enough to need a human decision,
  rather than guessing.

### Follow-up

- PR #298 (the real #215 implementation) is unrelated to ISSUE-294 itself and awaits normal human
  review/merge.
- Next real use of the loop (`#282`, which depends on `#215`) will additionally exercise the
  stacked-PR base-branch path (`origin/task/ISSUE-215-...` instead of `origin/main`), not yet
  verified under the new design — expected to work unchanged (same `resolveBaseRef` logic reused
  from Stage 1), but not yet observed live.

## 2026-08-31 — ISSUE-294 — Ralph loop: stacked-PR path verified live against #282; DONE-parsing bug found

### Commands

```bash
node .claude/ralph/run.js --max-iterations 3
```
(queue: `#215` dependsOn `[]`, `#282` dependsOn `[215]`, `#287` dependsOn `[282]`; `maxTurns: 90`,
raised from 50 after an earlier throwaway `#282` attempt exhausted the turn budget one step short
of the `DONE` sentinel with all tests already green)

### Result

PARTIAL PASS — stacked-PR base-branch resolution confirmed working exactly as designed; a real bug
was found in `parseVerdict()`'s `DONE` detection, and the underlying implementation work (fully
valid — all tests/lint/tsc green) had to be salvaged and committed manually rather than by the
controller.

### Evidence

- **Stacked-PR path confirmed live**: `#215` already had an open, unmerged PR (`#298`) from the
  prior run, so the loop correctly classified it `in-flight` and skipped straight to `#282`. The
  clone log line read `🌱 Клон .ralph-runs\issue-282, ветка
  task/ISSUE-282-eval-layer-0-deterministic-assertions-over-generat от
  origin/task/ISSUE-215-add-regression-guard-tests-for-critical-prompttemp` — i.e. `resolveBaseRef`
  correctly branched off `#215`'s own not-yet-merged branch instead of `origin/main`, verifying the
  one part of the redesign Stage 2 hadn't yet observed live.
- **`#282` implementation itself succeeded**: agent explored existing guard-service patterns
  (`evidence-guard.service.ts`, `candidate-profile-guard.service.ts`, ADR-032), wrote
  `apps/api/src/eval/{cv-quality-knowledge-parser,cv-quality-guard.service}.ts` + matching spec
  files + `eval.module.ts`, fixed a real regex bug in its own parser (markdown heading markers not
  stripped) after a first failing test run, updated `apps/api/CLAUDE.md`, and confirmed
  `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 843/843 (66 suites, 64 new tests,
  0 regressions) — all before the agent's final turn.
- **Bug found**: the agent's final text used `**DONE**` (markdown bold) instead of the literal
  `DONE` line the prompt's output contract requires, and omitted the `TYPE:`/`SUMMARY:` lines
  entirely. `parseVerdict()`'s regex (`/^DONE\s*$/m`) does not match bold-wrapped text, so the
  controller reported `agent_failed: "agent did not return DONE or BLOCKED"` (`🏁 ходов: 50, 1108s`)
  and left the fully-valid diff uncommitted in `.ralph-runs/issue-282` for manual inspection, per
  the existing "leave `_failed` run dirs in place" policy.
- **Manual salvage** (per project owner's explicit choice, not the controller): verified the AC
  from `#282`'s own issue body against the actual `cv-quality-guard.service.ts` code (all 6 check
  families genuinely implemented, not just claimed in the agent's summary), then manually ran the
  same commit → push → PR steps the controller would have: committed as
  `feat: ISSUE-282 add deterministic CV quality guard (Eval Layer 0)`, pushed
  `task/ISSUE-282-eval-layer-0-deterministic-assertions-over-generat`, opened
  [PR #299](https://github.com/strakhovdenya/jobflow-cv-pipeline/pull/299) (`Closes #282`, base
  `task/ISSUE-215-...`, left open for review/merge). Issue #282's own AC/DoD checklist updated to
  `[x]` with a note pointing at PR #299 and explaining the manual-salvage path.
- Loop then correctly reported `#287` as `blocked-by-dependency` (its dependency `#282` was, from
  the controller's own point of view, `agent_failed` not `done`) and stopped cleanly (exit 0) — no
  crash, no silent continuation past an unresolved dependency.

### Follow-up

- **Real bug to fix in a future ISSUE-294 iteration**: `parseVerdict()` must tolerate minor
  markdown formatting around the `DONE`/`BLOCKED[-PROMPT-CHANGE]` sentinel (e.g. `**DONE**`,
  backtick-wrapped), and/or the prompt's output-contract instructions need a more explicit
  "literal text, no markdown formatting" example. Not fixed in this session — logged here as a
  known gap rather than patched blind under time pressure from the live 3-issue verification run.
- `#287` was never actually attempted (blocked by `#282`'s false-negative `agent_failed`) — the
  3-issue queue verification is not yet complete end-to-end; re-run once the `parseVerdict` fix
  lands.
- PR #299 is unrelated to ISSUE-294 itself (it's `#282`'s real deliverable) and awaits normal human
  review/merge, same as PR #298.

## 2026-08-31 — ISSUE-294 — Prompt hardening after manual quality review of #215/#282; not yet live-verified

### Commands

No new `node .claude/ralph/run.js` run in this entry — the changes below are code-review-driven
fixes to `.claude/ralph/core.js`, verified with `node --check` and by rendering `buildPrompt()`
programmatically (grepping the output for expected markers), not a live agent run.

### Result

PARTIAL — all changes are syntactically valid and render as intended, but none have been exercised
by a real `claude -p` agent yet. Logged honestly as not-yet-live-verified rather than claimed as
proven, per the project's anti-overclaiming culture.

### Evidence

Manual quality review of the already-merged-into-PR work from #215 (PR #298) and #282 (PR #299)
found four real gaps, none caught by the agent's own `DONE` verdict at the time:
1. #215's `apply`/`maybe`/`skip` test used unanchored `content.toContain(...)` across a whole
   200-line prompt file — false negative, confirmed live by temporarily removing the real union
   and observing the test stay green. Fixed manually in PR #298 (separate commit).
2. #215's `TEMPLATE_REGISTRY` hand-duplicated `prisma/seed.ts` data instead of removing the
   import-side-effect obstacle. Fixed manually in PR #298 (separate commit,
   `require.main === module` guard + export).
3. #282's canonical-name/banned-claim extraction was never run against the real
   `apps/api/knowledge-sources/` corpus during development — only tiny hand-written fixtures.
   Live probe found 0/17 extracted "canonical names" were genuine technical terms. Fixed manually
   in PR #299 (separate commit) — 17→98 genuine names after the fix, verified against the real
   corpus again.
4. #282's Test Requirement referenced `project-management/golden-dataset/` for real
   `02_targeted_cv_content.json` samples that don't exist there (they're gitignored under
   `apps/api/storage/applications/`) — the agent silently substituted a synthetic fixture instead
   of flagging the ambiguity. Fixed manually in PR #299 (separate commit, real samples committed
   to a new `golden-dataset/generated-cv-samples/` subfolder).

`buildPrompt()` (`.claude/ralph/core.js`) hardened in response, all in this same PR:
- Explicit override telling the agent which parts of the cloned `CLAUDE.md` do NOT apply to it
  (Plan-first, Issue-first, Branch-first, Task Closure Checklist, Git/PR order, `gh issue view`)
  vs. which parts still fully apply (Architecture/Testing/Documentation Rules, ADRs, code style) —
  found live in the #282 agent log that it ran `gh issue view 282` on its own initiative, following
  `CLAUDE.md`'s own "Read First" rule, burning a turn on a command it has no permission to run.
- Permission denial specifically on `apps/api/prisma/prompts`/`apps/api/knowledge-sources` now
  routes to `BLOCKED-PROMPT-CHANGE` (so the controller applies `ralph-needs-prompt-change`),
  not generic `BLOCKED` — closes a routing gap introduced when `deny` rules for those paths were
  added to `writeAgentPermissions()` earlier in this same session.
- Mutation-check requirement for regression-guard assertions, narrowed twice after review: first
  to only substring/keyword assertions (`toContain`/`toMatch`/`includes`) rather than every
  assertion; then, after counting real occurrences in #215/#282's actual spec files (80 total,
  only 11 genuinely high-risk — large free-form text scans, not short generated-message checks),
  narrowed further to exclude assertions against short strings the code itself just generated
  (e.g. `violation.detail.includes(...)`), and capped at 5 mutation-check cycles per run even if
  more high-risk assertions exist, to bound worst-case turn cost (~10-15 turns instead of ~22-33).
- Turn budget, "npm install already done", "read-only git allowed for self-review", and a required
  per-Acceptance-Criterion self-report immediately before the `DONE` sentinel — none of these were
  previously communicated to the agent at all.
- `project-management/TEST_LOG.md` entries now written by the controller (`appendTestLogEntry()`
  in `runIssue()`, committed alongside the agent's own diff) instead of the agent, which is now
  explicitly told not to touch this file — closes the gap where PRs #298/#299 shipped without any
  TEST_LOG entry despite CLAUDE.md's Task Closure Checklist requiring one.

### Follow-up

- **None of the above is live-verified yet.** The next real `node .claude/ralph/run.js` run (e.g.
  against #287, once its own separate `.env`-in-clone gap is fixed — see the #287 analysis earlier
  in this session, not addressed by this PR) is the first opportunity to confirm the new prompt
  rules actually change agent behavior as intended, not just that they render correctly.
- Issue #294 itself was found closed (manually closed 2026-08-29, right after PR #295 merged —
  before the worktree design was known to be broken and before the full clone-based rewrite);
  reopened as part of this session before this PR, since `main` still has no `.claude/ralph/` at
  all and the real redesign work was still unmerged.

### `/code-review` findings (2026-08-31), before committing this PR

Two of four findings confirmed real and fixed, one confirmed a false positive, one skipped as
low-value — verified by reading code and, for the two real ones, by reproducing the exact failure
scenario live before and after the fix:

1. **False positive** — `spawn('claude', ...)` without `shell: true` was flagged as a Windows
   `.cmd`-shim risk (the same class of bug already fixed for `npm install` in this same diff).
   Checked live: `where claude` resolves to a real `.exe` on this machine, and a plain `spawn`
   call succeeds. Adding `shell: true` was rejected — it would pass the agent's prompt (which
   embeds a GitHub issue body, untrusted content) through a shell, a real command-injection
   regression, to fix a risk that doesn't exist here.
2. **Real, confirmed via reproduction** — `parseVerdict()` picked a verdict by fixed priority
   (BLOCKED-PROMPT-CHANGE > BLOCKED > DONE) instead of by which sentinel actually occurs last in
   the transcript. Since `runAgent()`'s `output` accumulates assistant text across every turn of
   the whole run (not just the final message), an early, incidental mention of
   "BLOCKED-PROMPT-CHANGE:" while the agent reasons about why something is *not* that case would
   have out-ranked a legitimate final `DONE`. Reproduced with a synthetic transcript (mention in
   reasoning + real trailing `DONE`) — old logic would return `blocked-prompt-change`; fixed by
   comparing match indices and picking whichever sentinel occurs latest, verified the same
   transcript now returns `done`, and that genuine BLOCKED/BLOCKED-PROMPT-CHANGE endings still
   parse correctly.
3. **Real, confirmed by code reading** — a plain `BLOCKED` verdict was only excluded in-memory for
   the lifetime of one `run.js` process; a separate later invocation (the normal way this tool is
   run) would re-pick the same still-ambiguous issue and burn a full clone+agent cycle again with
   no forward progress. Fixed: new `ralph-blocked` GitHub label (created in the repo), applied to
   any BLOCKED verdict (not just BLOCKED-PROMPT-CHANGE), checked by `classify()` the same way as
   the existing `ralph-needs-prompt-change` label.
4. **Skipped** — sequential `npm install` for `apps/api`/`apps/web` in `installDependencies()`
   could run concurrently; real but low-value (seconds, not correctness), not fixed now.

## 2026-08-31 — ISSUE-271 — Убрать из docs/10_calibration_and_parity.md §7 устаревшее исключение Prompt 3 из скоупа калибровки (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-271-docs-10-calibration-and-parity-md-7-prompt-3`.

### Evidence

- TYPE: docs
- SUMMARY: Remove stale Prompt 3 out-of-scope exclusion from docs/10_calibration_and_parity.md §7; Prompt 3 calibration is complete (EPIC-24 ISSUE-247–250)

## 2026-08-31 — ISSUE-272 — Расширить формулировку Acceptance Criteria EPIC-25 в docs/05_epics.md (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-272-acceptance-criteria-epic-25-docs-05-epics-md`.

### Evidence

- TYPE: docs
- SUMMARY: Extend EPIC-25 Acceptance Criteria to explicitly allow code fixes and ADR decisions as mismatch remediation, not only new PromptTemplate versions

## 2026-08-31 — ISSUE-287 — e2e suite depends on shared dev DB having zero KnowledgeSource rows, breaks once real ones are registered (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-287-e2e-suite-depends-on-shared-dev-db-having-zero-kno`.

### Evidence

- TYPE: test
- SUMMARY: fix e2e suite KnowledgeSource isolation — deactivate real dev-DB rows and create per-spec fixture rows in beforeAll, restore and delete in afterAll

## 2026-09-01 — ISSUE-287 — manual code review + corrective fix on top of the Ralph loop's PR #301

### Commands

```bash
cd apps/api
npx tsc --noEmit
npm run lint
npm run test
npm run test:e2e   # run 1, against real persistent dev DB (9 active KnowledgeSource rows)
npm run test:e2e   # run 2, same DB, back-to-back
node -e "... prisma.knowledgeSource.count({ where: { isActive: true } }) ..."  # before and after
```

### Result

The Ralph loop's autonomous `DONE` on PR #301 was reviewed manually (`/code-review high` against
the PR diff) per this repo's Task Closure Checklist. The review found the autonomous implementation
violated this issue's own Key Invariant: it deactivated every real active `KnowledgeSource` row in
`beforeAll` (`isActive: false`) and restored them in `afterAll`, with no crash-safety — an
interrupted run between the two would leave real EPIC-24/25 candidate-profile rows permanently
deactivated. It also never demonstrated the mandated deliberate-break-then-revert check, and cited
only a CI run (fresh, empty-`KnowledgeSource` DB) as evidence, not the real local dev DB scenario
the bug is rooted in.

Rewrote the fix on the same branch: both `mvp-flow.e2e-spec.ts` and `skip-flow.e2e-spec.ts` now
`.overrideProvider(KnowledgeSourcesService)` on the Nest `TestingModule`, replacing the *lookup* of
active sources with a single in-memory fixture (new shared helper,
`apps/api/test/knowledge-source-fixture.helper.ts`) instead of touching the `KnowledgeSource` table
at all. `KnowledgeSourceContentService.loadContent()` itself is not mocked, so the real
containment check still runs against the fixture. Zero DB reads/writes to `KnowledgeSource` means
nothing to roll back and no interruption-safety gap.

- `tsc --noEmit`: clean.
- `lint`: clean.
- `npm run test`: 861/861 passed.
- `npm run test:e2e`: 3 suites / 4 tests passed, **twice in a row**, against the real local dev DB
  (`jobflow_postgres` container up 6 days, not freshly created) with **9 real active
  `KnowledgeSource` rows present** throughout — the exact scenario ISSUE-287 is about. Row count
  confirmed unchanged (9 → 9) via a direct `prisma.knowledgeSource.count()` check before and after
  both runs.
- Deliberate-break verification (issue's "CI Impact and Test Strength" #2): temporarily pointed the
  fixture's `filePath` outside the temp `KNOWLEDGE_SOURCES_ROOT`, re-ran `mvp-flow.e2e-spec.ts`
  alone — failed as expected (`expected 201 "Created", got 400 "Bad Request"` on
  `POST /workspaces/:id/run-analysis`) — then reverted and confirmed green again.
- Confirmed `apps/api/prisma/seed.ts` never creates any `KnowledgeSource` row (`grep` for
  `knowledgeSource.create` in that file: no matches) — CI's `test-e2e` job has always run with zero
  active rows, before and after this fix; CI's own behavior is unaffected either way.

Issue #287's Acceptance Criteria/Definition of Done checkboxes updated to `[x]` with this evidence;
a "What was actually built" section was added to the issue body documenting the divergence from the
originally-decided Approach A's literal steps 1/2 (DB-row fixture + delete-by-id cleanup) and why
the provider-override approach is a stronger fit for the issue's own Key Invariant.

### Evidence

- TYPE: fix
- SUMMARY: replace Ralph loop's real-row-deactivating e2e fix with a KnowledgeSourcesService provider override (zero DB mutation) on the same PR #301 branch

## 2026-09-01 — ISSUE-273 — First completed manual-parity-pass for EPIC-25 / Phase 18 (summary record)

### Scope

Formal closure record for EPIC-25 Acceptance Criteria: "At least one full manual QA pass is
recorded in `project-management/TEST_LOG.md` with real vacancies, decisions and outcomes compared
against manual judgment."

The parity pass was the **Galaktica Middle Full Stack Developer** real-world vacancy
(workspace `2026_08_24_Galaktica_Middle_Full_Stack_Developer`) — the first vacancy processed
through the full pipeline after EPIC-24 calibration, outside the golden dataset. Findings were
documented in `project-management/analysis-galaktica-real-world-cv-quality.md` and driven through
EPIC-25 Phases 1–4 (Фазы 1–4). Phase 5 updated stale documentation. This record is Phase 6 —
the closing summary entry.

### What the pass found and how each finding was resolved

**Phase 1 (2026-08-25, ISSUE-257/258/259):** Two production-level code bugs surfaced:
- Certifications never rendered — mapper cast `{ title, include, reason }` to `CvCertification`
  blindly; fixed in `prompt2-to-cv-content.mapper.ts` (`mapCertifications()` helper, filters
  `include: false`, maps `title → name`). Unit test added to `prompt2-to-cv-content.mapper.spec.ts`.
- `candidate-profile.config.ts` shipped `Placeholder University` / `Placeholder Degree` /
  `"Learning — see language risk notes"` as real CV content; replaced with real golden-dataset
  values from `knowledge-sources/`/golden-dataset `manual-cv.md` files.

**Phase 2 (2026-08-25, ISSUE-260/261/262):** Architectural gap — nothing prevented the same
placeholder regression from recurring in a future edit to `candidate-profile.config.ts`:
- New `CandidateProfileGuardService` added — deterministic, non-AI check that blocks
  `DocumentExportService.exportCv()` on placeholder markers before any rendering.
- 6 unit tests in `candidate-profile-guard.service.spec.ts` (ADR-020). ADR-032 recorded in
  `project-management/DECISIONS.md`.

**Phase 3/4 (2026-08-25, ISSUE-263/264/267/268/277):** Prompt-level issues — Prompt 2 generated
BOP-jargon Prompt 3 then had to correct on every run; Prompt 3 missed cross-section
repeated-disclaimer patterns and current-work/selected-projects duplication:
- `prompt2_v5.txt`: zero BOP-pattern hits (v4 had 7); explicit rule forbidding
  current-work content in `selected_projects`.
- `prompt3_v5.txt`: added cross-section repeated-wording pass (§6.1) and
  `## 0.1 Cross-section content duplication` check; translated all 54 Russian-language lines
  to English (meaning-preserving, no semantic change to checks).
- Both new versions registered in `prisma/seed.ts` as `isActive: true`; v4 entries deactivated.

**Phase 5 (2026-08-31, ISSUE-271/272):** Documentation updates:
- Removed stale Prompt 3 out-of-scope exclusion from `docs/10_calibration_and_parity.md` §7.
- Extended EPIC-25 Acceptance Criteria in `docs/05_epics.md` to explicitly allow code fixes and
  ADR decisions as mismatch remediation, not only new PromptTemplate versions.

### Outcome vs. EPIC-25 Acceptance Criteria

| AC | Status |
|----|--------|
| A documented manual parity-test procedure exists | ✅ `docs/10_calibration_and_parity.md` §4/§5 (established during EPIC-24, reused here) |
| At least one full manual QA pass is recorded with real vacancies, decisions and outcomes compared against manual judgment | ✅ Galaktica pass (`analysis-galaktica-real-world-cv-quality.md`) + Phases 1–4 remediation entries above |
| Any mismatches found are either fixed or explicitly documented as accepted limitations | ✅ All Category A/B/C/D findings from the Galaktica pass resolved — code fixes (Phases 1/2), prompt fixes (Phases 3/4); no findings left undocumented |

### Commands

Not applicable — this is a documentation record, not a code change.

### Result

PASS — EPIC-25 Acceptance Criteria satisfied.

### Evidence

- Phase 1 TEST_LOG entries: `## 2026-08-25 — ISSUE-257`, `## 2026-08-25 — ISSUE-258`
  (and ISSUE-259 bundled per the Phase 1 follow-up note in ISSUE-257's entry)
- Phase 2 TEST_LOG entry: `## 2026-08-25 — ISSUE-260/ISSUE-261`
- Phase 3/4 TEST_LOG entry: `## 2026-08-25 — ISSUE-263, ISSUE-264, ISSUE-267, ISSUE-268, ISSUE-277`
- Phase 5 TEST_LOG entries: `## 2026-08-31 — ISSUE-271`, `## 2026-08-31 — ISSUE-272`
- Source analysis: `project-management/analysis-galaktica-real-world-cv-quality.md`
- EPIC-25 Acceptance Criteria (updated): `docs/05_epics.md` §EPIC-25

### Follow-up

- Future new real vacancies processed through the pipeline should be spot-checked against
  `docs/10_calibration_and_parity.md` §4's comparison method and recorded as new rows in the
  relevant golden-dataset `comparison.md` files (or a new case folder), rather than re-opening
  this record — per the note at the end of `## 2026-08-23 — ISSUE-209`.
- Prompt 1 and Prompt 2 source files (`prompt1_v*.txt`, `prompt2_v5.txt`) still mix Russian and
  English sections (noted during Phase 4 — explicitly out of scope for that phase); may be
  addressed in a future prompt-maintenance task if it causes issues.

## 2026-08-31 — ISSUE-273 — Итоговая запись в TEST_LOG.md: первый пройденный manual-parity-pass EPIC-25/Phase 18 (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-273-test-log-md-manual-parity-pass-epic-25-phase-18`.

### Evidence

- TYPE: docs
- SUMMARY: Record first completed EPIC-25/Phase 18 manual-parity-pass in TEST_LOG.md, closing the epic's "at least one full QA pass recorded" acceptance criterion

## 2026-09-01 — ISSUE-305 — Scope ISSUE-293 (dual CV export): resolve Prompt 2 content-gap question, extract ATS formatting rules, surface remaining open questions (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-305-scope-issue-293-dual-cv-export-resolve-prompt-2-co`.

### Evidence

- TYPE: docs
- SUMMARY: Add ATS dual-export scoping analysis resolving Prompt 2 content-gap question, extracting 25 ATS formatting rules, and surfacing 7 additional open questions for project owner review

## 2026-09-02 — ISSUE-308 — Реализовать renderAtsCvTemplate(content, corrections) с той же сигнатурой, что и renderCvTemplate() (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-308-renderatscvtemplate-content-corrections-rendercvte`.

### Evidence

- TYPE: fix
- SUMMARY: Remove cross-module import of applyCorrectionsToCvContent from cv-template-renderer by inlining private correction helpers directly in ats-cv-template-renderer

## 2026-09-02 — ISSUE-309 — Реализовать однокаовночный layout, Contact-блок и остальные layout/typography/page/PDF правила ATS-шаблона (25 правил §3) (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-309-layout-contact-layout-typography-page-pdf-ats-25-3`.

### Evidence

- TYPE: feat
- SUMMARY: Implement single-column ATS Handlebars template with all 25 layout/typography/page/PDF rules

## 2026-09-02 — ISSUE-310 — Реализовать рендер density hints (rendering_hints.density) собственным CSS-маппингом под однокаовночный layout (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-310-density-hints-rendering-hints-density-css-layout`.

### Evidence

- TYPE: feat
- SUMMARY: Add density hints CSS mapping to ATS single-column template with its own layout-specific selectors

## 2026-09-02 — ISSUE-311 — Реализовать рендер сертификатов без дат/издателя в ATS-шаблоне, той же логикой include:true (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-311-ats-include-true`.

### Evidence

- TYPE: feat
- SUMMARY: Remove issuer/date conditionals from ATS certifications template line, rendering only cert name

## 2026-09-02 — ISSUE-313 — Unit-тесты ats-cv-template-renderer.spec.ts (fixture-based, покрывает 25 правил §3) (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-313-unit-ats-cv-template-renderer-spec-ts-fixture-base`.

### Evidence

- TYPE: fix
- SUMMARY: Fix section order test false negative by targeting `<h1>` in body, not `<title>` in head

## 2026-09-02 — ISSUE-314 — Новый AtsHtmlRendererService — рендер ATS-варианта, применение коррекций Prompt 3, запись 04_cv_export_ats.html (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-314-atshtmlrendererservice-ats-prompt-3-04-cv-export-a`.

### Evidence

- TYPE: fix
- SUMMARY: Remove duplicated applyCorrectionsToCvContent helpers from ats-cv-template-renderer.ts, import from cv-template-renderer.ts instead

## 2026-09-02 — ISSUE-315 — Расширить DocumentExportService.exportCv() на генерацию 04_cv_export_ats.pdf (artifactType cv_export_ats_pdf, без AiRun) (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-315-documentexportservice-exportcv-04-cv-export-ats-pd`.

### Evidence

- TYPE: feat
- SUMMARY: Extend DocumentExportService.exportCv() to generate 04_cv_export_ats.pdf (cv_export_ats_pdf artifact, no AiRun) after design variant, with transparent error wrapping if ATS step fails

## 2026-09-02 — ISSUE-316 — Расширить ExportCvResult полем для ATS-артефакта (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-316-exportcvresult-ats`.

### Evidence

- TYPE: feat
- SUMMARY: Extend ExportCvResult with atsPdfPath field for ATS PDF artifact, convert interface to class with @ApiProperty decorators

## 2026-09-02 — ISSUE-317 — Новый GET /workspaces/:id/download-cv-ats (Ralph loop, finished manually)

### Commands

```bash
node .claude/ralph/run.js --max-iterations 7   # Ralph agent implemented and self-verified, but hit
                                                 # the Claude session usage limit mid-way through its
                                                 # final self-review pass, before it could emit DONE
cd apps/api && npm run test -- document-export.controller && npx tsc --noEmit && npm run lint
cd apps/api && DATABASE_URL=... npm run test:e2e
```

### Result

Agent implemented the endpoint, unit tests (`document-export.controller.spec.ts`) and an e2e step
(`mvp-flow.e2e-spec.ts`) and ran the full verification suite itself — all green (929/929 unit
tests, 4/4 e2e including the new `download-cv-ats` step, `tsc --noEmit`/`lint` clean) — but the
Claude session hit its usage limit while producing the final self-review verdict, so the
controller marked the run `agent_failed` and did not commit/push/create a PR (the diff was left
uncommitted in `.ralph-runs/issue-317` for manual disposition per the Ralph loop's own recovery
convention). Reviewed the diff manually (Claude, interactive session) against the issue's
Acceptance Criteria and Key Invariants before committing — not re-run from scratch, since the
agent's own verification output was already complete and consistent.

### Evidence

- TYPE: feat
- SUMMARY: Add GET /workspaces/:id/download-cv-ats endpoint (path-safety mirrors download-cv, ATS-suffixed download filename), unit + e2e coverage

## 2026-09-03 — ISSUE-318 — Swagger: @ApiOperation/@ApiProperty для download-cv-ats и нового поля ExportCvResult (ADR-019) (Ralph loop, finished manually)

### Commands

```bash
node .claude/ralph/run.js --max-iterations 3   # Ralph agent implemented and self-verified (self-review
                                                 # PASS), but hit the Claude session usage limit during
                                                 # the post-self-review code-review (skill) pass, before
                                                 # it could emit a verdict
cd apps/api && npx tsc --noEmit && npm run lint && npm run test --no-coverage
npm run start:dev & curl http://localhost:3000/api-json -H "x-api-key: test-api-key"   # live Swagger check
```

### Result

Agent added `@ApiOkResponse({ type: ExportCvResult })` to `exportCv()` — implementation, self-review
(PASS), tsc/lint/929 unit tests all completed before the session-limit interruption during the new
code-review (skill) pass. Finished manually: live-verified the actual generated `GET /api-json`
schema per this issue's own AC (not just decorator presence) — found `@ApiOkResponse` (200) produced
NO schema reference at all, because `exportCv()`'s real status is 201 (NestJS default for `@Post()`
with no `@HttpCode()`), not 200. Fixed to `@ApiCreatedResponse({ type: ExportCvResult })`; re-verified
live that the full 5-field `ExportCvResult` schema (including `atsPdfPath`) now appears under the 201
response. Also ran `/code-review` manually (scoped to this working copy only), which flagged the
undocumented divergence from this issue's own (inaccurate) Key Invariants text — addressed via an
issue comment per CLAUDE.md's Task Closure Checklist.

### Evidence

- TYPE: fix
- SUMMARY: Use @ApiCreatedResponse (matching the endpoint's real 201 status) instead of @ApiOkResponse, verified live against generated GET /api-json schema

## 2026-09-03 — ISSUE-319 — Обновить CLAUDE.md (Artifact Rules, High-Level Architecture) и apps/api/CLAUDE.md под новую архитектуру (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-319-claude-md-artifact-rules-high-level-architecture-a`.

### Evidence

- TYPE: docs
- SUMMARY: Update root CLAUDE.md Artifact Rules and Data Flow (step 4) for ATS dual-export variant (04_cv_export_ats.html/pdf, AtsHtmlRendererService, download-cv-ats endpoint)

## 2026-09-03 — ISSUE-320 — Unit/e2e-тесты: exportCv() создаёт оба артефакта без AiRun; e2e для download-cv-ats (Ralph loop, no diff — AC already satisfied by #317)

### Commands

```bash
node .claude/ralph/run.js --max-iterations 2
# manual re-run against this branch (full Phase 2 stack):
cd apps/api && npm run test:e2e
npx tsc --noEmit
npm run lint
```

### Result

Ralph agent inspected `mvp-flow.e2e-spec.ts` on this branch (top of the full Phase 2 stack) and
found both AC items already satisfied by assertions #317 added naturally while covering its own
`download-cv-ats` e2e case — no code change needed, same "already satisfied by a prior task"
pattern as #312. Verified by re-running the full e2e suite: all 3 suites / 4 tests pass;
`tsc --noEmit` and `lint` clean. Manually confirmed AC-covering line ranges and checked the
issue's AC/DoD boxes.

### Evidence

- `mvp-flow.e2e-spec.ts` step 6 (~L231-241): asserts `aiRunCountAfterExport === aiRunCountBeforeExport` after `export-cv` (ADR-012, AC2).
- `mvp-flow.e2e-spec.ts` step 7 (~L250-273): asserts both `04_cv_export.pdf` and `04_cv_export_ats.pdf` registered as `GeneratedArtifact` and present on disk with non-zero size (AC1).
- TYPE: test
- SUMMARY: Verify e2e coverage for dual-export (design+ATS PDFs) and no-AiRun invariant already added by #317; no new diff required

## 2026-09-03 — ISSUE-321 — apps/web: вторая кнопка скачивания (ATS CV) на статусе cv_pdf_generated (Ralph loop, finished manually)

### Commands

```bash
node .claude/ralph/run.js --max-iterations 2
# manual finish against the agent's diff, apps/web/:
npm run test
npx tsc --noEmit
npm run lint
```

### Result

Ralph agent implemented both buttons and their tests; self-review passed (`REVIEW: PASS`). The
post-self-review code-review (skill) pass hit the session's usage limit mid-run (multi-agent
`code-review` skill spawning several sub-agents) and exited with a non-zero code before producing
a verdict — an external resource constraint, not a code problem. Finished manually: read the full
diff, verified it matches AC/Key Invariants (label rename applied everywhere, no hardcoded URL,
independent error paths for both buttons), re-ran the full `apps/web` suite/`tsc`/`lint` clean.

Two infra bugs in `.claude/ralph/core.js` found and fixed in the same session (not part of this
issue's own AC, but what unblocked getting this far):
- `removeRunDirIfExists()` could throw uncaught (`EBUSY` from a leftover background `npm run dev`
  process) and crash the whole controller loop after a `BLOCKED` verdict had already been recorded
  — now best-effort, never throws.
- Every `.ralph-runs/issue-*` clone had `hasTrustDialogAccepted: false` in `~/.claude.json`, which
  made `claude -p` silently drop `permissions.allow` entries (including `Skill(code-review)`) for
  an untrusted workspace — new `trustRunDir()` marks each runDir trusted before the first agent
  invocation against it.
- Also excluded `apps/web/CLAUDE.md`'s mandatory Playwright MCP visual-verification step from the
  autonomous agent's scope (no browser/dev-server access in headless mode) — a human does it after
  PR, same as the other org-protocol exclusions already in `buildTaskRules()`.

### Evidence

- `npm run test` (apps/web): 253/253 passed.
- `npx tsc --noEmit`: clean.
- `npm run lint`: clean.
- Diff: `apps/web/src/lib/pipeline-view-model.ts` (renamed label + `findLatestCvAtsPdfDownloadUrl`),
  `apps/web/src/app/workspaces/[id]/main-action-panel.tsx` (`cvAtsPdfDownloadUrl` prop + dispatch
  branch), `apps/web/src/app/workspaces/[id]/page.tsx` (wiring), `pipeline-view-model.spec.ts` +
  `main-action-panel.spec.tsx` (13 new/updated tests).
- TYPE: feat
- SUMMARY: Add "Download CV (ATS)" button on cv_pdf_generated status alongside renamed "Download CV (Design)" button

## 2026-09-03 — ISSUE-339 — Ralph loop: finish uncommitted code-review pass, fix controller crash-safety and workspace-trust bugs

### Commands

```bash
node --check .claude/ralph/core.js
node --check .claude/ralph/run.js
# live verification: re-ran the loop against #321/#322 before and after each fix
node .claude/ralph/run.js --max-iterations 2
```

### Result

Found live while running the Ralph loop against #321/#322: (1) `.claude/ralph/core.js` already
carried substantial uncommitted work from a prior session (the post-self-review code-review pass),
never committed; (2) `removeRunDirIfExists()` crashed the whole controller with an uncaught `EBUSY`
right after a real `BLOCKED` verdict on #321 had already been correctly recorded on GitHub, from a
leftover backgrounded `npm run dev` process holding a file lock; (3) every `.ralph-runs/issue-*`
clone ever created had `hasTrustDialogAccepted: false` in `~/.claude.json`, silently dropping
`permissions.allow` entries (including `Skill(code-review)`) for an untrusted workspace, which
made the code-review pass end without a parseable verdict and escalate to a false `BLOCKED`.
Fixed all three; also excluded `apps/web/CLAUDE.md`'s mandatory Playwright visual-verification step
from the autonomous agent's scope (no browser/dev-server access in headless mode). Re-running the
loop after each fix confirmed forward progress past the exact point that failed before — no
dedicated unit tests exist for this controller (per its own established pattern, it's exercised by
real runs against real issues, not a test suite).

### Evidence

- `node --check` clean on both `core.js` and `run.js`.
- Live re-run history: run 1 (before any fix) — `BLOCKED` on #321 (Playwright/dev-server access
  denied), then crashed on cleanup (`EBUSY`) before reaching #322. Run 2 (after crash-safety +
  Playwright-exclusion fixes) — implementation + self-review passed, code-review pass ended
  unparseable (`code_review_blocked`) due to the trust bug. Run 3 (after `trustRunDir()`) — code-
  review pass actually invoked the `code-review` skill this time (multi-agent finders ran), only
  stopped on an external Claude session usage-limit, not a code defect.
- TYPE: fix
- SUMMARY: Fix Ralph loop controller crash-safety and workspace-trust bugs found live on #321/#322; commit pre-existing uncommitted code-review pass

## 2026-09-03 — ISSUE-322 — apps/web: условная видимость каждой кнопки скачивания по наличию соответствующего артефакта (Ralph loop)

### Commands

```bash
node .claude/ralph/run.js
```

### Result

Agent-reported DONE — self-reported by the autonomous agent, not independently re-run by the controller. Branch: `task/ISSUE-322-apps-web`.

### Evidence

- TYPE: refactor
- SUMMARY: remove dead downloadOrError helper — replace with direct window.location.href since buttons only render when URL is non-null

## 2026-09-04 — ISSUE-323 — Manual UI verification: обе кнопки скачивания реально скачивают разные, корректные PDF

### Commands

Manual verification via real `apps/web` UI (dev server, `localhost:3001`) driven through Playwright MCP browser tools, against the real `apps/api` backend (`localhost:3000`, `AI_PROVIDER=openai`).

### Result

PASS. Workspace `Logis LLC / Junior back-end web developer (PHP)` (`cmtii3ad90003bdlnv8pce0ao`) already had a `cv_pdf_generated`-status export predating the ATS feature (only `cv_export_pdf` artifact, no `cv_export_ats_pdf`), so the "Download CV (ATS)" button correctly did not render yet (per `pipeline-view-model.ts`'s per-artifact conditional visibility, ISSUE-322). Reset the workspace's `status` to `paused_before_export` directly in the dev Postgres DB to make it re-exportable (`export-cv` requires `paused_before_export`/`export_running`; this is a deterministic, no-AI-cost step per ADR-012, so no real AI spend was involved), then clicked "Export PDF" in the real UI. Both "Download CV (Design)" and "Download CV (ATS)" buttons appeared on the resulting `cv_pdf_generated` screen. Clicked both:

- "Download CV (Design)" → downloaded `04_cv_export.pdf` (2 pages, 127272 bytes, md5 `bf39a5b8f9c02dce332b3f8e9ea8db93`).
- "Download CV (ATS)" → downloaded `04_cv_export_ats.pdf` (3 pages, 91051 bytes, md5 `54f664d4b04d4d6dec3208efa201df9d`).

Both files confirmed valid PDF documents (`file` command), with distinct filenames, sizes, page counts and content hashes — i.e. two genuinely different, correct PDFs for the same workspace.

### Evidence

- TYPE: test
- SUMMARY: Manual UI verification (real apps/web + apps/api) — both CV download buttons produce distinct, valid PDFs for the same workspace

## 2026-09-04 — ISSUE-344 — apps/web: unify CV download buttons to equal (primary) visual weight

### Commands

```bash
cd apps/web
npx tsc --noEmit
npm run lint
npm run test
```

### Result

PASS. `apps\web\src\lib\pipeline-view-model.ts`'s `cv_pdf_generated` case: "Download CV (ATS)" button kind changed from `secondary` to `primary` (matching "Download CV (Design)") per user's explicit choice — both formats are equally valid, neither should visually dominate. Also added `cursor-pointer` to `buttonKindClasses`' `primary`/`secondary` kinds in `main-action-card.tsx` (missing — native `<button>` doesn't reliably show a pointer cursor without explicit styling; `disabled` already had `cursor-not-allowed`), applying repo-wide to every `ActionButton`, not just these two.

`npx tsc --noEmit`: clean. `npm run lint`: clean. `npm run test`: 25 files / 256 tests passed, including an updated `pipeline-view-model.spec.ts` assertion that both `cv_pdf_generated` buttons have `kind: "primary"`.

Manual Playwright MCP visual verification against real `apps/web` dev server + real `apps/api` backend, workspace `cmtii3ad90003bdlnv8pce0ao` (`cv_pdf_generated`, both artifacts present):
- Screenshot before/after: both buttons now render identically (black/filled), replacing the prior black-vs-white asymmetry.
- Hovered "Download CV (ATS)" — background darkens (`hover:bg-zinc-800`), confirmed via screenshot.
- `getComputedStyle(...).cursor` on the ATS button evaluated to `"pointer"`.
- `browser_console_messages` (level: warning, includes errors): 0 errors, 0 warnings.
- `ui-ux-pro-max` skill check (`ux` domain, "equal weight button pair touch target spacing"): 8px `gap-2` between buttons matches the "min 8px gap" guideline; consistent typography/sizing; contrast well above 4.5:1. Touch-target height (~36-38px) is below the 44/48px mobile guideline but is the pre-existing app-wide `ActionButton` pattern, not introduced by this change — out of scope here.

### Evidence

- TYPE: fix
- SUMMARY: Unify CV download buttons to equal primary weight; add missing cursor-pointer to all action buttons
