# Current Task

## TASK-100 — Add quality_score to VacancyAnalysis and TargetedCvContentOutput, with a new active PromptTemplate version

**Context:** `FinalCheckOutput` (Prompt 5) already has `quality_score: number` (a plain finite
number check, not integer-constrained — `final-check.schema.ts:116-121`, `isNumber` helper).
`VacancyAnalysis` (Prompt 1) and `TargetedCvContentOutput` (Prompt 2) have no equivalent field.
Per the project owner's decision (2026-08-06): this is additive, not a replacement for
`VacancyAnalysis.score` (the vacancy-fit score) — the two are distinct concepts, same distinction
`FinalCheckOutput` already keeps between `final_decision` and `quality_score`. Scope is narrow:
**only** the single `quality_score: number` field, not the fuller verdict/proceed-yes-no structure
the epic's Business Value section describes from the real manual transcript — that richer structure
was never confirmed in scope and must not be added without asking first.

**Real complication found while planning:** `prisma/seed.ts` currently seeds exactly one
`PromptTemplate` row per `step` (fixed `id`), and its upsert loop unconditionally sets
`isActive: true` on every entry. The project's own invariant ("one active version per type at a
time") and the "never silently overwrite a template version" rule mean the new prompt content
cannot be introduced by editing `prompt1.txt`/`prompt2.txt` in place — it must become a genuine new
`version: 2` row, with `version: 1` preserved and deactivated. `seed.ts` must be fixed to support
more than one version per step safely — this is a required part of the task, not scope creep.

**Prompt-content sequencing note:** TASK-094/095/096/097 (knowledge-source content wiring) are
already merged into `main`. The current v1 prompt text's "Knowledge sources may be listed by name
only, without inlined content — in that case treat ... as needs evidence" caveat is now stale.
`prompt1_v2.txt`/`prompt2_v2.txt` must rewrite this caveat to reflect that knowledge sources are
now inlined when selected, rather than copying the v1 wording verbatim.

**Files Affected:**

```text
apps/api/src/pipeline/schemas/vacancy-analysis.schema.ts
apps/api/src/pipeline/schemas/vacancy-analysis.schema.spec.ts
apps/api/src/pipeline/schemas/targeted-cv-content.schema.ts
apps/api/src/pipeline/schemas/targeted-cv-content.schema.spec.ts
apps/api/src/ai/providers/fake.provider.ts                  (FAKE_PROMPT1_JSON, FAKE_PROMPT2_JSON)
apps/api/src/pipeline/prompt1/prompt1.service.ts             (buildMarkdown — add Quality Score section)
apps/api/src/pipeline/prompt1/prompt1.service.spec.ts
apps/api/src/pipeline/prompt2/prompt2.service.ts              (buildMarkdown — add Quality Score section)
apps/api/src/pipeline/prompt2/prompt2.service.spec.ts
apps/api/prisma/prompts/prompt1_v2.txt                        (new — v1's prompt1.txt unchanged/preserved)
apps/api/prisma/prompts/prompt2_v2.txt                        (new — v1's prompt2.txt unchanged/preserved)
apps/api/prisma/seed.ts                                       (add v2 entries, per-entry isActive, fix upsert loop)
```

**Docs to Read:**

- `apps/api/src/pipeline/schemas/final-check.schema.ts` lines 15-27, 116-121 — exact
  `quality_score: number` + `isNumber` validation pattern to mirror.
- `apps/api/src/pipeline/schemas/vacancy-analysis.schema.ts` full file — where to add the field
  alongside existing `score` (lines 36-37, 132-137) without disturbing it.
- `apps/api/src/pipeline/schemas/targeted-cv-content.schema.ts` full file — same for
  `TargetedCvContentOutput` (no existing top-level `score`).
- `apps/api/src/prompt-templates/prompt-templates.service.ts` full file — `create()`/`activate()`
  version/deactivate pattern that `seed.ts`'s fix must reproduce.
- `apps/api/prisma/seed.ts` full file — `promptTemplates` array (lines 82-137) and upsert loop
  (lines 164-184) that hardcodes `isActive: true`.
- `apps/api/prisma/prompts/prompt1.txt` / `prompt2.txt` — full current OUTPUT CONTRACT JSON blocks
  to base v2 files on.
- `apps/api/src/pipeline/prompt5/prompt5.service.ts` lines ~275-282 — `## Quality Score` Markdown
  pattern to mirror.
- `apps/api/src/document-export/cv-template-renderer.ts` and
  `apps/api/src/document-export/prompt2-to-cv-content.mapper.ts` — confirm `quality_score` is not
  read by either (confirmed during planning — no matches).

**Key Invariants:**

- `quality_score` is additive on both schemas — `VacancyAnalysis.score` (vacancy fit) unchanged;
  `TargetedCvContentOutput` gains only `quality_score`.
- Validation matches `FinalCheckOutput.quality_score` exactly: `isNumber` (finite number), no
  integer constraint.
- Do NOT add the fuller "verdict + proceed yes/no" structure from the epic's Business Value
  section — scope is the single numeric field only.
- `prisma/prompts/prompt1.txt`/`prompt2.txt` (v1) stay byte-for-byte unchanged — new prompt text is
  added as new `_v2.txt` files only.
- `seed.ts`'s `promptTemplates` array entries get an explicit `isActive` field each (not a
  loop-wide hardcoded `true`) — exactly one entry per `step` has `isActive: true`. Other steps
  (`prompt_3`, `prompt_5`, `skip_reason`, `cover_letter`) keep a single `isActive: true` entry each,
  unaffected by this task.
- `quality_score` must never be read by `Prompt2ToCvContentMapper`/`CvTemplateRenderer`/the PDF
  export path — self-assessment/review-only field, not rendering input (ADR-012 unaffected).
- Do not touch `prompt3.txt`, `prompt5.txt`, `skip_reason.txt`, `cover_letter.txt`, or their
  `PromptTemplate` rows.

**Acceptance Criteria:**

- [x] `VacancyAnalysis` gains `quality_score: number`; `validateVacancyAnalysisJson` rejects a
      payload missing it or with a non-numeric value.
- [x] `TargetedCvContentOutput` gains `quality_score: number`; `validateTargetedCvContentJson`
      rejects a payload missing it or with a non-numeric value.
- [x] `FAKE_PROMPT1_JSON` and `FAKE_PROMPT2_JSON` both include a realistic `quality_score` value.
- [x] `prompt1_v2.txt`/`prompt2_v2.txt` exist, based on current v1 content, add `quality_score` to
      the OUTPUT CONTRACT JSON block, add a short self-assessment rubric, and do NOT copy the stale
      "name only" knowledge-source caveat forward.
- [x] `seed.ts` seeds `prompt_1`/`prompt_2` at `version: 2` (from the new `_v2.txt` files) as the
      active template, with `version: 1` present but `isActive: false`.
- [x] Re-running `npx prisma db seed` against a fresh database is idempotent: exactly one active
      `PromptTemplate` row per `step` afterward.
- [x] `Prompt1Service`/`Prompt2Service`'s `buildMarkdown` render a `## Quality Score` section
      (mirroring Prompt 5's wording pattern) when `data` is non-null.

**Test Requirement:**

- `vacancy-analysis.schema.spec.ts` / `targeted-cv-content.schema.spec.ts`: new cases for a valid
  payload with `quality_score`, and a payload missing/with invalid `quality_score` rejected with
  the expected error message.
- `prompt1.service.spec.ts` / `prompt2.service.spec.ts`: existing `buildMarkdown` tests updated for
  fixture data including `quality_score`, plus a new assertion that rendered Markdown contains a
  `## Quality Score` section with the right value.
- No new spec file needed for `seed.ts` itself; Done Definition requires a live re-seed check
  instead.

**Done Definition:**

`npx prisma generate`, `npx prisma db seed` against a fresh local database; a direct query confirms
`prompt_1`/`prompt_2` each have exactly one active row at `version: 2` and one inactive row at
`version: 1`. `npx tsc --noEmit`, `npm run lint`, `npm run test` and `npm run test:e2e` all green.
A manual fake-provider run of Prompt 1 and Prompt 2 against a real workspace shows `## Quality
Score` in both resulting `.md` artifacts.

**Dependencies:** None upstream in build order. Touches `prompt1.service.ts`/`prompt2.service.ts`'s
`buildMarkdown` and `fake.provider.ts`'s fixtures (same files as TASK-095/096/099, different
fields) — both tracks already merged into `main`, so no conflicts starting from up-to-date `main`.

**Git Instructions:**

1. `git add <files>`
2. `git commit -m "feat: TASK-100 ..."`
3. `git push -u origin task/TASK-100-quality-score`
4. `gh pr create --title "..." --body "..." --base main`
5. Stop completely. Do not do anything else.

**Progress Notes (added at closure, 2026-08-14):**

Implementation matched the plan closely; one divergence from the original "Files Affected" list —
adding `quality_score` to `TargetedCvContentOutput` (a required field) caused `npx tsc --noEmit` to
fail on three pre-existing test files that construct `TargetedCvContentOutput` object literals
directly rather than importing `FAKE_PROMPT2_JSON`:
`apps/api/src/document-export/prompt2-to-cv-content.mapper.spec.ts`,
`apps/api/src/evidence/evidence-guard.service.spec.ts`, and
`apps/api/src/document-export/html-renderer.service.spec.ts`. Each got a `quality_score` value
added to its fixture (not in the original Files Affected list, discovered only via the type
checker). No other divergence — schema/seed/prompt/markdown changes matched the plan as written.
