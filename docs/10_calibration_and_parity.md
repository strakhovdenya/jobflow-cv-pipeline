# JobFlow CV Pipeline — AI Output Calibration & Manual Parity Testing

## 1. Purpose

This document defines the methodology for two related, sequential activities:

- **Calibration** (Phase 17 / EPIC-24) — tuning `PromptTemplate` content for Prompt 1 and Prompt 2
  so AI-produced output converges with what the project owner currently produces manually for the
  same vacancy.
- **Manual parity testing** (Phase 18 / EPIC-25) — after calibration, a formal manual QA pass
  confirming the pipeline generalizes to *new* real vacancies, not just the golden set it was
  tuned against.

Both depend on Phase 16 (EPIC-23) first closing the knowledge-source-content and manual-note gaps
described below — calibrating prompt wording against a model that never receives real source
content cannot converge on anything meaningful.

## 2. Why Calibration Is Needed (Background)

The manual workflow this product replaces (`docs/00_product_vision_updated_consistent.md` §2)
happens inside the ChatGPT **web app**, one AI chat session per vacancy. A real transcript of a
full session (Prompt 1 → Prompt 2 → Prompt 3 → PDF, reviewed while planning this phase) surfaced
concrete properties of that manual flow the automated pipeline does not yet replicate:

1. **Real source content is visible to the model.** In the manual chat, the user's master CV,
   project inventory, tech stack matrix etc. are part of what the model can draw on. In the
   current pipeline, `PromptInputBuilderService` (Prompt 1), `Prompt2InputBuilderService` and
   `CoverLetterInputBuilderService` all substitute the literal placeholder string
   `[content not loaded in MVP]` for every knowledge source instead of its real content — a gap
   tracked since TASK-037B and never closed (TASK-037C-0/037C only registered file *metadata* in
   PostgreSQL). Phase 16 closes this.
2. **Ad hoc human clarifications carry forward.** In the manual chat, the user can type a
   correction or instruction mid-flow ("no commercial AWS experience, remove that", "add this
   project") and the chat's own memory carries it into later steps. The pipeline already carries
   forward each step's *own* output (`Prompt2InputBuilderService` includes the full
   `01_vacancy_analysis` artifact as `=== PROMPT 1 ANALYSIS ===`), but has no field for a
   human-authored note. Phase 16 adds this as a single accumulating per-workspace field — not a
   full multi-turn chat system.
3. **Every step self-scores its own output.** The transcript showed each of Prompt 1, Prompt 2
   and Prompt 3 ending with an "Output Quality Score" — a weighted rubric out of 100, a verdict,
   and a proceed yes/no. `FinalCheckOutput` (Prompt 5) already has an equivalent `quality_score`
   field; `VacancyAnalysis` (Prompt 1) and `TargetedCvContentOutput` (Prompt 2) do not. Phase 16
   adds it to both.
4. **The prompt wording itself did not exist yet (at the time of this analysis).** `prisma/seed.ts`
   marked every seeded `PromptTemplate` as placeholder content pending prompt-engineering review —
   none contained real, refined wording. The project owner already has manually-refined,
   heavily-iterated prompt text for each step (the same text used to produce the reviewed
   transcript). Phase 17 imports and adapts that text rather than writing prompt wording from
   scratch. As of Phase 17's completion (ISSUE-193 through ISSUE-197), `prompt_1` carries real,
   calibrated content; `prompt_2`, `prompt_3`, `prompt_5`, `skip_reason` and `cover_letter` are
   addressed separately (`prompt_2` already calibrated, the rest still pending).
5. **The manual prompts assume the ChatGPT web app's environment, not a bare API call.** The web
   app gives a prompt implicit capabilities an API-based call does not automatically have — e.g.
   its own browsing feature (used in the reviewed transcript to verify a real employer via a
   LinkedIn lookup), its file-attachment handling, and its session memory. Some of these map
   cleanly onto mechanisms this pipeline already has or Phase 16 adds (attachments → knowledge
   source content wiring; session memory for the human's own input → the manual note); others
   (e.g. live browsing) do not have an equivalent yet. Phase 17's prompt-import step must audit
   each imported prompt for this kind of web-app-specific assumption and, for anything not already
   covered, reword the instruction with an explicit fallback (e.g. `needs_verification`, the same
   pattern already used for `needs_evidence`) rather than silently dropping it or having the model
   guess. Whether it is worth building a dedicated capability to close a specific gap found this
   way is a decision to make once the real prompt files reveal what is actually needed — not
   something to design blind ahead of time.

Points 1–3 are prerequisites (Phase 16) — calibrating prompt wording against a model that never
receives real source content, or that lacks the same self-assessment signal the manual flow
already has, cannot converge on anything meaningful. Points 4–5 are the actual work of Phase 17.

### 2.1 Web-app-specific assumptions found in `!prompt_1_0_3_...txt` (full read, Issue #193)

Full file: `apps/api/prisma/prompts/!prompt_1_0_3_quick_vacancy_analysis_RISK_BALANCED_STARTUP_PRODUCT_UPDATED_CURRENT_WORK_SYNC_LANG_GATE.txt`
(553 lines). This audit covers the whole file, not only the fragment the PRD originally quoted.
Each item below needs an explicit decision in Issue #194 (map to an existing pipeline mechanism,
or reword with an explicit fallback) — none may be silently dropped during Phase 17 adaptation.

1. **Vacancy delivered via chat paste/upload** (line 13: "Используй вакансию, которую я загрузил
   или вставил в этот чат") — assumes the vacancy text arrives through an interactive upload/paste
   action inside the chat turn itself, not as a structured field of an API request. The pipeline
   already receives vacancy text structurally (`00_vacancy_source.txt`, built by
   `PromptInputBuilderService`) — no functional gap, only wording that references "this chat"
   needs to be adapted away.

2. **Vacancy assumed to be a PDF the model visually parses** (line 42: "Если PDF вакансии плохо
   читается или часть информации не видна, прямо напиши: [vacancy parsing issue]") — assumes the
   model itself receives and reads a raw PDF attachment. The pipeline never passes PDF bytes to the
   AI provider — only already-extracted plain text. The `[vacancy parsing issue]` fallback behavior
   itself is worth keeping (incomplete/malformed vacancy text is a real case), but the instruction
   text needs rewording to drop the "PDF" framing.

3. **Knowledge-source files treated as live, directly-attached/browsable files** (Sources lists,
   lines 15–24 and 160–169 — `Master_CV_RU_v0_6_current_work_sync.md` etc. referenced by filename
   as things the model can consult) — assumes ChatGPT's persistent project-file access to these
   named `.md` files. This is the same gap already tracked as the `[content not loaded in MVP]`
   placeholder (§2 point 1 above, closed by Phase 16's `PromptInputBuilderService` real-content
   injection) — confirms Phase 16 must land before/alongside this text going live, since the prompt
   literally names files by filename as if the model can look them up directly.

4. **Persistent session/"project" memory carrying standing instructions silently across turns**
   (lines 1–11 preamble — "ВАЖНО — current-work source sync 2026-07" and the current-work block
   rendering rules) — in the ChatGPT web app this kind of standing instruction persists via custom
   instructions/Projects memory across an entire conversation. The pipeline's Prompt 1 call is
   stateless aside from what is explicitly built into its input. This is not a capability gap so
   much as a hard constraint on adaptation: this content must be preserved verbatim inside the
   adapted `PromptTemplate` body itself (or the knowledge-source content it draws from), not
   trimmed as if it were redundant boilerplate just because it reads like a one-time reminder.

5. **AI directly creates a file and links to it** (§3.1, lines 340–386: "additionally create a
   separate plain-text/markdown archive note... Suggested filename format:
   `SKIP_<Company>_<Role>_reason_RU.md`... In the main chat response, after the Decision section,
   add a link to the created SKIP file") — assumes the model has file-creation/sandbox tooling
   (e.g. Code Interpreter/Canvas) that produces a downloadable artifact and a clickable link in the
   same turn. The pipeline's actual mechanism is the opposite direction: the AI returns structured
   JSON (validated against a schema), and `SkipReasonService`/`ArtifactStorageService`
   deterministically write `01_skip_reason.md/json` to disk afterward (ADR-005, same
   AI-output-vs-deterministic-file-write separation as ADR-012's export step). The AI must never be
   instructed to "create a file" or "add a link" — it has no filesystem or tool access in this
   pipeline. Needs rewording: the instruction should ask for the SKIP content as structured data
   matching the skip-reason schema; file creation and any user-facing path is the app's job.

6. **Live web browsing / external verification — not actually present in this file's text.**
   `docs/10_calibration_and_parity.md` §2 point 5 (above) cites a LinkedIn lookup used mid-transcript
   to verify a real employer as an example of a web-app-specific capability gap. However, a full-text
   search of this prompt file (`browsing`, `search`, `lookup`, `internet`, `LinkedIn`) found **no
   instruction anywhere asking the model to browse or verify anything externally**. The transcript's
   browsing use looks like an ad hoc manual action by the project owner mid-chat, not something the
   template text itself requests. Flagged as a discrepancy for Issue #194 to resolve explicitly
   (e.g. decide whether company-legitimacy verification should be added as a new
   `needs_verification`-style fallback even though the current text never asks for it) rather than
   an existing instruction that needs rewording.

### 2.2 Resolutions for Issue #194

Issue #194 is a decisions-only step — it does not itself edit `PromptTemplate` content or
`prisma/seed.ts` (that is #195's job, "Адаптировать текст в новую версию PromptTemplate"). Each
item from §2.1 gets an explicit resolution below so #195 has a direct, unambiguous input; none are
silently dropped.

1. **Chat paste/upload wording (§2.1 item 1) — map to an existing mechanism.** The pipeline already
   receives vacancy text structurally via `PromptInputBuilderService`'s `=== VACANCY TEXT ===` input
   block (built from `00_vacancy_source.txt`) — the same mechanism `prompt1_v2.txt` already
   consumes. Resolution: #195 rewords "вакансию, которую я загрузил или вставил в этот чат" to
   reference the provided vacancy-text input block instead. No functional gap, no schema change.

2. **PDF visual-parsing fallback (§2.1 item 2) — reword with existing-field mapping.** The pipeline
   never passes PDF bytes to the AI provider, only extracted plain text, so the "PDF" framing must
   go — but the underlying fallback behavior (flag incomplete/malformed vacancy text) is worth
   keeping. Resolution: #195 rewords the instruction to something like "If the provided vacancy text
   is incomplete, garbled, or has missing information (regardless of original source format), state
   this explicitly in `summary` and list what's missing" — mapped onto the existing free-text
   `summary`/`top_reasons` fields in `VacancyAnalysis`. No new schema field.

3. **Knowledge-source files as live/browsable attachments (§2.1 item 3) — already mapped.** This is
   the same gap already tracked as the `[content not loaded in MVP]` placeholder (§2 point 1) and
   closed by Phase 16/TASK-100: `PromptInputBuilderService` now inlines selected knowledge-source
   content, and `prompt1_v2.txt`'s `=== EVIDENCE SOURCE RULES ===` paragraph already encodes
   "inlined content = real evidence; name-only reference = `needs evidence`". Resolution: #195
   carries over the fuller per-file role descriptions from the manual text (main factual source /
   positioning guide / overclaiming guardrail / career case map / evidence bank / CV format rules /
   LinkedIn framing / certifications), reworded away from "files I've attached", using the mechanism
   that already exists — no new mechanism needed.

4. **Persistent session/"project" memory — current-work preamble (§2.1 item 4) — hard constraint,
   not a capability gap.** The ChatGPT web app carries this kind of standing instruction across an
   entire conversation via custom instructions/Projects memory; Prompt 1's API call is stateless
   aside from what is explicitly built into its input. Resolution: #195 must preserve lines 1–11 of
   the source file (the "current-work source sync" preamble, current-work rendering rules, and the
   market-dependent volunteering-bullet logic) **verbatim inside the adapted `PromptTemplate` body
   itself** — not trimmed as if it were a one-time reminder, since there is no session-memory
   mechanism to carry it otherwise.

5. **AI directly creates a file and links to it — SKIP archive note, §3.1 (§2.1 item 5) — already
   fully mapped to an existing mechanism.** The pipeline's actual mechanism is the opposite
   direction from what the manual text assumes: the AI returns structured JSON, and
   `SkipReasonService`/`ArtifactStorageService` deterministically write `01_skip_reason.md/json`
   afterward (ADR-005, same AI-output-vs-deterministic-file-write separation as ADR-012). This is
   not prompt_1's own responsibility — it is the separate `skip_reason` `PromptTemplate`
   (`skip_reason.txt`) plus `SkipReasonAnalysis` (`skip-reason.schema.ts`), which already matches
   §3.1's SKIP file structure field-for-field (`main_skip_reason` / `key_mismatches` /
   `evidence_from_profile` / `risks_if_applying_anyway` / `useful_keywords_to_track_later` /
   `future_reconsideration_condition` ↔ "Main skip reason" / "Key mismatches" / "Evidence from my
   profile" / "Risks if applying anyway" / "Useful keywords to track later" / "Future
   reconsideration condition"). Resolution: #195 must **drop §3.1 entirely** from prompt_1's adapted
   body — Prompt 1 must never be instructed to "create a file" or "add a link", since it has no
   filesystem/tool access in this pipeline. The manually-refined SKIP-note wording itself belongs in
   a future adaptation pass of `skip_reason.txt` (which is still explicitly marked "placeholder...
   pending full prompt-engineering review" on its own) — out of scope for both #194 and #195, since
   Phase 1's milestone covers prompt_1 only; not filed as a new issue unless the project owner wants
   it tracked now.

6. **Live web browsing / company-legitimacy verification (§2.1 item 6) — decided: do not add now.**
   No instruction in the audited text actually requests browsing or external verification, so there
   is nothing to map or reword. The project owner confirmed during this issue (2026-08-19) that no
   `needs_verification`-style schema field should be added at this time — `VacancyAnalysis`
   (`vacancy-analysis.schema.ts`) and `prisma/seed.ts` stay unchanged by #194. If real usage later
   shows a recurring need (e.g. repeated agency/anonymous-employer vacancies), it should be scoped as
   its own separate issue/PRD rather than folded into Phase 17 calibration.

### 2.3 Anti-Overclaiming Rules verification for prompt_1 (Issue #196)

Issue #195 adapted the manual text into `prompt1_v3.txt` (root `PromptTemplate`, version 3) without
itself being connected to this project's Anti-Overclaiming Rules — the manual ChatGPT-web-app flow
that produced the source text predates this project and was never checked against them. Issue #196
performs that explicit check, rule by rule, against `prompt1_v3.txt` as it stood before this issue
(citations below refer to that text; one gap found is fixed in `prompt1_v4.txt`, see below).

Each of root `CLAUDE.md`'s five Anti-Overclaiming Rules, checked individually:

1. **"Mark unsupported claims as `needs evidence`."** — Present in the OUTPUT CONTRACT
   (`evidence_status` enum includes `needs_evidence`; `evidence_risks[].status` enum includes
   `"needs evidence"`), in `=== EVIDENCE SOURCE RULES ===` (a knowledge source referenced by name
   only, without inlined content, must be treated as `needs_evidence`), and in
   `=== OVERCLAIMING / SAFETY CHECKS ===` (unsupported/ambiguous claims must be flagged via
   `evidence_risks`/`top_reasons`/`summary`). Confirmed adequate.
   *Observation, not a rule violation:* the two fields spell the value differently —
   `needs_evidence` (underscore, `evidence_status`) vs. `needs evidence` (space,
   `evidence_risks[].status`). This inconsistency predates v3 (already present in `prompt1_v2.txt`)
   and `vacancy-analysis.schema.ts` does not enum-validate either field (both typed as plain
   `string`), so it is not a functional defect — left as-is; noted here in case a future schema
   tightening pass wants to unify it.
2. **"Separate commercial experience from personal/project experience."** — Present in
   `=== EVIDENCE SOURCE RULES ===` ("Always separate commercial (employer) experience from
   personal/portfolio/project exposure when judging evidence strength") and reinforced by
   `=== CURRENT-WORK AWARENESS IN SCORING ===` (the current post-EPAM period is explicitly scored
   as secondary/personal evidence; the candidate's most recent commercial employer remains the
   primary evidence for commercial claims). Confirmed adequate.
3. **"Do not present personal AI/FastAPI/OpenAI/MCP/Claude Code work as commercial production
   experience."** — Partially present in v3: the CURRENT-WORK preamble ("JobFlow / NestJS / Prisma
   / Swagger / OpenAI / FastAPI / AI проекты — personal/portfolio evidence") and
   `=== OVERCLAIMING / SAFETY CHECKS ===` ("Python / FastAPI / OpenAI / AI / RAG — personal/
   portfolio only"; "Never present personal AI/RAG/FastAPI exposure as commercial production
   experience") cover most of the named technologies via an explicit list plus a generic "AI"
   catch-all — but **MCP and Claude Code were never named**, even though the candidate's real
   knowledge-source files (`Master_CV_RU_v0_6_current_work_sync.md` and others) do describe MCP/
   Claude Code work, and root `CLAUDE.md` names both explicitly. The generic "AI" catch-all likely
   already steers an LLM toward classifying MCP/Claude Code work as personal-only, but this is
   materially weaker than the named coverage the other four technologies in the same rule receive.
   **Gap confirmed and fixed**: `prompt1_v4.txt` (`PromptTemplate` version 4, replaces v3 as the
   active version) adds explicit "MCP" / "Claude Code" mentions in the same three places —
   the current-work preamble list, a new dedicated OVERCLAIMING/SAFETY CHECKS bullet ("MCP / Claude
   Code — personal/portfolio tooling exposure only, not commercial production"), and the closing
   "never present as commercial production" sentence. Decided with the project owner during #196
   rather than silently edited.
4. **"Do not present Docker/NestJS/Kubernetes/AWS as commercial core skills unless evidence is
   added later."** — Present verbatim in intent in `=== OVERCLAIMING / SAFETY CHECKS ===`: "Never
   treat Docker, NestJS, Kubernetes or AWS as commercial core skills without explicit supporting
   evidence in the input context." Confirmed adequate, no change.
5. **"Keep German language risk and English communication risk explicit when relevant."** —
   Present and substantially more detailed than the source rule: `=== LANGUAGE RISK RULES ===`
   defines explicit German fluency gates/caps (blocker / high / medium / low by context — internal
   vs. customer-facing) and a separate English-risk paragraph (B1/B1+ default, C1 risk scaling by
   seniority). Confirmed adequate, no change.

**Net result**: 4 of 5 rules were already fully covered by `prompt1_v3.txt` with no change needed.
Rule 3 had a partial, generic-catch-all gap for MCP/Claude Code specifically — fixed by creating
`prompt1_v4.txt` (three targeted additions, no other content changed) and activating it as the new
version-4 `PromptTemplate` row in `apps/api/prisma/seed.ts` (v3 deactivated, not deleted — per the
"never silently overwrite a template version" invariant).

### 2.4 Web-app-specific assumptions found in `!prompt_2_0_1_...txt` (full read, Issue #198)

Full file: `apps/api/prisma/prompts/!prompt_2_0_1_targeted_CV_content_UPDATED_STARTUP_PRODUCT_CURRENT_WORK_SYNC.txt`
(752 lines). This audit covers the whole file, following the same method used for prompt_1 in
§2.1. Each item below needs an explicit decision in the adaptation issue for `prompt_2`
(map to an existing pipeline mechanism, or reword with an explicit fallback) — none may be
silently dropped.

1. **Vacancy delivered via chat paste/PDF** (line 19: "текст / PDF вакансии из этого чата") —
   same assumption as prompt_1 items 1–2 (§2.1). No functional gap:
   `Prompt2InputBuilderService`'s `=== VACANCY SOURCE ===` input block already supplies the
   vacancy text structurally. Only the wording referencing "этот чат"/PDF needs to be adapted
   away.

2. **Knowledge-source files treated as live/attached files** (lines 20–27,
   `Master_CV_RU_v0_6_current_work_sync.md` etc. referenced by filename) — the same gap already
   tracked and closed by Phase 16's `KnowledgeSourceContentService` real-content injection (same
   resolution as §2.2 item 3 for prompt_1). No new mechanism needed; the adaptation step should
   reword away from "attached files" language and separately verify (outside this audit's scope)
   that these exact filenames match the currently-registered `KnowledgeSource` rows.

3. **"Мой текущий CV PDF / CV format reference" as a visual layout reference** (line 26) —
   assumes the model visually inspects an existing CV PDF to copy its layout. In this pipeline,
   content generation (Prompt 2) is architecturally separate from deterministic visual rendering
   (`HtmlRendererService`/`PdfExportService`, ADR-012, fixed template in `cv-template-renderer.ts`).
   This instruction is out of scope for an API-based Prompt 2 call entirely — it should be dropped
   or reworded, not mapped onto a new capability, since Prompt 2 never needs to reproduce a visual
   layout itself.

4. **AI creates/names/versions a Markdown file itself, with append-only in-file versioning**
   (§7 "Critical append-only rule", lines ~296–673) — the same "model has file/tool access"
   assumption as prompt_1 item 5 (§2.1), but broader here: the instructed filename
   (`03_targeted_CV_content_[Company]_[Role].md`) is **non-canonical**, conflicting with this
   project's canonical artifact name `02_targeted_cv_content.md/json` (ADR-006), and the
   instructed "Version 1 / Version 2 / Version 3" append-in-one-file model does not match how
   this pipeline actually handles regeneration (each regenerate overwrites the canonical artifact
   via a new `AiRun`/`PromptRun`, same AI-output-vs-deterministic-file-write separation as
   ADR-005/ADR-012). **This is a genuine discrepancy, not only a wording fix** — the adaptation
   step must explicitly decide to drop all AI-side file-creation/naming/versioning instructions;
   §7's Markdown structure is still useful as a shape for the `TargetedCvContentOutput` schema's
   JSON output, but file creation under the canonical name stays `ArtifactStorageService`'s job,
   never the model's.

5. **"Дай ссылку на скачивание" / stop-before-PDF response behavior** (lines ~677–688) — assumes
   the model manages a download link and conversationally decides not to proceed to PDF. Already
   structurally enforced by the pipeline's own gate (Prompt 2 always pauses at
   `paused_after_cv_draft`; PDF export requires separate, later approval steps) — redundant, not a
   gap. Resolution: drop the download-link/stop-response instructions as inapplicable rather than
   reword them.

6. **"Запомни правописание" (line 15)** — phrased for persistent chat memory, but since Prompt 2
   is a single stateless call that already includes this instruction in its own input, it is
   self-contained within that call. No functional gap for later steps.

**Ad-hoc check: does the text assume Prompt 1's analysis is already in context (session memory),
and is that already covered by this pipeline's carry-forward mechanism?**

1. **Yes, implicitly.** "Ок, делаем targeted CV под эту вакансию" (line 13) continues a chat
   session, and the output template's Metadata section (line 383) expects `Decision before CV:
   apply / maybe` and a fit score from Prompt 1 to already be known — i.e. it relies on the same
   ChatGPT session carrying Prompt 1's answer forward, without ever saying "paste Prompt 1's
   output here."
2. **Already covered by this pipeline's carry-forward mechanism — confirmed, not a gap.**
   `Prompt2InputBuilderService.buildPrompt2Input` (`prompt2-input-builder.service.ts:148-149`)
   inlines the entire `01_vacancy_analysis.json`/`.md` artifact as an `=== PROMPT 1 ANALYSIS ===`
   block in every Prompt 2 call — the same EPIC-23 carry-forward mechanism referenced in
   `apps/api/CLAUDE.md`'s `pipeline/` section. This closes exactly the web-flow assumption found
   in item 1 above; no further work needed here, only recording it as "already covered" in this
   assumption list.
3. **No discrepancy found.** `VacancyAnalysis`'s schema (`vacancy-analysis.schema.ts:36-38`)
   defines `decision`, `score`, and `quality_score` fields, all serialized into the JSON artifact
   that gets inlined wholesale — so the specific fields the manual template's Metadata section
   expects (`Decision before CV`, `Fit score from quick analysis`) are present in what already
   carries forward. No new explicit field-mapping or schema change is required.

### 2.5 Resolutions for Issue #199

Issue #199 is a decisions-only step, same as #194 for prompt_1 — it does not itself edit
`PromptTemplate` content, `apps/api/prisma/seed.ts`, or `targeted-cv-content.schema.ts` (that is
the next issue's job, adapting the text into a new `prompt_2` `PromptTemplate` version, mirroring
#195). Each item from §2.4 gets an explicit resolution below so that issue has a direct,
unambiguous input; none are silently dropped.

1. **Vacancy delivered via chat/PDF (§2.4 item 1, line 19) — map to an existing mechanism.** Same
   resolution as prompt_1 §2.2 item 1: `Prompt2InputBuilderService`'s `=== VACANCY SOURCE ===`
   input block already supplies vacancy text structurally. Resolution: reword "текст / PDF вакансии
   из этого чата" to reference that input block instead. No functional gap, no schema change.

2. **Knowledge-source files as attached files (§2.4 item 2, lines 20–27) — already mapped.** Same
   resolution as prompt_1 §2.2 item 3: the gap is already closed by Phase 16's
   `KnowledgeSourceContentService` real-content injection. Resolution: reword away from "attached
   files" language for each named source (`Master_CV_RU_v0_6...`, `Master_Profile_Summary_RU_v0_6...`,
   `Tech_Stack_Matrix_RU_v2_3...`, `Project_Inventory_RU_v0_6...`, `Career_Case_Deep_Dives_RU_v0_6...`,
   `CV_Format_Rules_EN_v0_3...`, `LinkedIn_Certifications_Inventory_RU_EN_2026-06`), keeping each
   file's role description (main factual source / positioning guide / overclaiming guardrail /
   career case map / evidence bank / CV format rules / certifications source) — same mechanism, no
   new one needed. Verifying these exact filenames match the currently-registered `KnowledgeSource`
   rows is separate and out of scope for this decisions-only issue.

3. **"Мой текущий CV PDF / CV format reference" as visual layout reference (§2.4 item 3, line 26) —
   drop, no fallback needed.** Not a capability gap to map or reword with a fallback: Prompt 2
   (content generation) is architecturally separate from deterministic visual rendering
   (`HtmlRendererService`/`PdfExportService`/`cv-template-renderer.ts`, ADR-012). Resolution: the
   adapted text must drop this bullet from the "Используй:" source list entirely — Prompt 2 never
   needs to visually inspect an existing CV PDF, since layout is `cv-template-renderer.ts`'s
   responsibility, not the model's.

4. **AI creates/names/versions a Markdown file itself, append-only (§2.4 item 4, §7 lines 296–673)
   — hard decision, the one genuine discrepancy, not just wording.** Confirmed against the full
   source text (re-read in full for this issue): §7's file-creation instructions
   (`03_targeted_CV_content_[Company]_[Role].md`, the "Critical append-only rule" with
   `Version 1`/`Version 2`/`Version 3` in-file versioning, the `Copy this content into: ...`
   fallback, and the entire `### Response behavior` subsection about download links/stopping) must
   be **fully removed** from the adapted text. Reasons this is a real conflict, not only phrasing:
   - The instructed filename is non-canonical, conflicting with ADR-006's canonical
     `02_targeted_cv_content.md/json`.
   - The instructed append-only, in-file `Version N` model does not match how this pipeline
     actually handles regeneration: each regenerate is a new `AiRun`/`PromptRun` whose output
     overwrites the canonical artifact (same AI-output-vs-deterministic-file-write separation as
     ADR-005/ADR-012, now also the substrate for ADR-029's regenerate-with-notes flow, which
     threads the *previous* draft into the next prompt's input context rather than appending to a
     file the model itself maintains).
   - The model has no filesystem/tool access in this pipeline at all (same category of assumption
     as prompt_1 item 5, §2.2.5) — `ArtifactStorageService` is the only writer of canonical
     artifacts, never the AI output itself.

   What is preserved: §7's *Markdown structure* (the `# Targeted CV Content — [Company] — [Role]`
   template from `## Metadata` through `## 10. Change Log`, lines ~366–673) is useful as a content
   **shape** to carry over into the `TargetedCvContentOutput` JSON schema's fields (strategy
   rationale, section plan, evidence table, overclaiming check, length check, manual-review notes,
   quality score) — not as an instruction telling the model to create/name/version a file. The
   `## 10. Change Log`'s `Version 1` section is itself redundant with the dropped append-only
   mechanism and should not be carried over in any form (there is nothing for the model to version
   inside a single stateless JSON response).

5. **Download-link / stop-before-PDF response behavior (§2.4 item 5, lines 677–688,
   `### Response behavior`) — drop as inapplicable, not reworded.** Confirmed redundant: the
   pipeline's own gate already enforces exactly this pause (Prompt 2 always stops at
   `paused_after_cv_draft`; PDF export requires the separate `paused_before_export`/export-approval
   steps later in the flow). Resolution: drop this subsection entirely — it is covered by item 4's
   removal of `## 7` above, since `### Response behavior` is part of the same file-creation section.

6. **"Запомни правописание" (§2.4 item 6, line 15) — no gap, no fallback needed.** Confirmed: Prompt
   2 is a single stateless call that already includes this instruction (the candidate's name
   spelling) in its own input on every call. No functional gap for later steps, no change needed.

**Ad-hoc check carried over from §2.4 (Prompt 1 analysis already in context)**: already resolved as
"confirmed, not a gap" in §2.4's own ad-hoc check — `Prompt2InputBuilderService.buildPrompt2Input`
inlines the full `01_vacancy_analysis` artifact as `=== PROMPT 1 ANALYSIS ===`. No further
resolution needed here.

**Anti-Overclaiming Rules verification — explicitly deferred, not in scope for #199.** Unlike
prompt_1 (where #196 checked the *already-adapted* `prompt1_v3.txt` against root `CLAUDE.md`'s five
Anti-Overclaiming Rules, per §2.3), prompt_2 has no equivalent adapted text yet at this point in the
sequence: the currently-active `PromptTemplate` version is `prompt2_v2.txt` (`apps/api/prisma/
seed.ts`), which predates this calibration effort and is exactly what the next issue (adapting
`!prompt_2_0_1_...txt` into a new version, mirroring #195) will replace. Checking anti-overclaiming
compliance now would mean checking a version about to be superseded — wasted work, and out of order
with how Phase 1 actually sequenced this (audit → decisions → **adapt** → anti-overclaiming check
against the adapted text). Resolution: the anti-overclaiming check belongs to a future issue,
mirroring #196, scoped to run **after** the adaptation issue produces the new prompt_2 version — not
created now, to avoid getting ahead of that issue's own scope; the project owner can decide when to
file it.

As a preview only (not a substitute for that future issue's real check): a plain-text grep of
`!prompt_2_0_1_...txt` during this issue's audit found the same gap already fixed for prompt_1 in
`prompt1_v4.txt` (§2.3 rule 3) — neither "MCP" nor "Claude Code" appears anywhere in the file, only
a generic "AI"/"OpenAI"/"FastAPI" catch-all (lines 9, 93, 271, 706) — and also found "AWS" is never
mentioned at all (rule 4 names Docker/NestJS/Kubernetes/AWS; the source text's overclaiming checks
cover Kubernetes and Docker by name — lines 273–274, 707 — but never AWS or NestJS by name in that
specific guard). Both are flagged here so the future anti-overclaiming issue does not have to
re-discover them from scratch, but no `PromptTemplate` change is made for either in #199.

### 2.6 Adaptation into `prompt2_v3.txt` (Issue #200)

Issue #200 adapted `!prompt_2_0_1_...txt` into a new `prompt_2_targeted_cv_content` `PromptTemplate`
version, applying §2.5's six resolutions, mirroring #195's prompt_1 adaptation.

**Finding: `prompt2_v2.txt` (the previously-active version, from TASK-100) already independently
satisfied 5 of the 6 resolutions.** Comparing §2.5 item-by-item against `prompt2_v2.txt`'s existing
text: no "chat/PDF" wording (item 1), knowledge sources already referenced by role rather than as
"attached files" (item 2), no CV-PDF visual-layout-reference bullet (item 3), no file-creation/
naming/append-only-versioning instructions or `### Response behavior` download-link/stop text
(items 4/5), and the candidate name-spelling instruction already present (item 6). This differs
from the prompt_1 case, where `prompt1_v2.txt` needed the current-work standing note added
verbatim and the decision-rule prose substantially rewritten to reach v3.

**Schema check (item 4's "decide whether a new field is needed"): no new field added.** The
manual text's §7 Markdown structure (`## Metadata` through `## 10. Change Log`) was checked against
`TargetedCvContentOutput` (`targeted-cv-content.schema.ts`) field-by-field: `target_strategy` covers
the CV Strategy section, `cv_content` covers the Targeted CV Content section, `evidence_table`
covers the Evidence Table, `overclaiming_check` covers the Overclaiming Check (and folds in Manual
Review Before PDF's risk-flagging intent via `needs_evidence`), `pdf_readiness_notes` covers the
Length Check and PDF readiness/next-step notes, and `quality_score` covers the Output Quality
Score. Separately confirmed: the manual §3's `Contact`/`Languages`/`Education`/`Work authorization`/
`Location` fields are not part of Prompt 2's contract at all — they are static candidate-profile
data (`candidate-profile.config.ts`, applied to the `CvContent` renderer contract by
`prompt2-to-cv-content.mapper.ts`), never AI-generated, so their absence from
`TargetedCvContentOutput` is correct and pre-existing, not a gap introduced or left by this issue.

**What `prompt2_v3.txt` actually changed relative to v2** — concrete evidence-grounding substance
present in the manual source text that v2's terser prose had dropped, restored per the same
"do not silently drop real content" principle #195 applied to prompt_1's decision rules:

1. Named impact-case examples for EPAM bullets under startup/product-engineer positioning (manual
   text's startup rule, "Amplience automation from hours to minutes, ProductsUp reliability/scale,
   CommerceTools product data handling, production incident/debugging") — added as concrete anchor
   examples in the `=== PROFESSIONAL EXPERIENCE ===` section's EPAM guidance, conditioned on the
   provided context actually supporting them for this candidate (never asserted unconditionally).
2. Explicit "3 strongest arguments" framing for `target_strategy.main_angle` (manual text's
   `## 1. Target CV strategy`, "3 strongest arguments"), including naming which career cases back
   each argument — v2 only said "reference the 2-3 strongest supporting arguments" without the
   career-case attribution.

Activated as `PromptTemplate` version 3 (`isActive: true`) in `apps/api/prisma/seed.ts`; v2
deactivated (`isActive: false`, not deleted — per the "never silently overwrite a template version"
invariant, same as prompt_1's v2→v3→v4 history).

**Anti-Overclaiming Rules verification against `prompt2_v3.txt` — explicitly out of scope for #200**,
per §2.5's own deferral: a future issue, mirroring #196, will run that check once the project owner
schedules it.

### 2.7 Anti-Overclaiming Rules verification for prompt_2 (Issue #201)

Issue #201 performs the deferred check from §2.5/§2.6 — the same rule-by-rule verification #196 ran
for `prompt1_v3.txt` (§2.3), applied here to `prompt2_v3.txt` as it stood before this issue
(citations below refer to that text; one gap found is fixed in `prompt2_v4.txt`, see below).

Each of root `CLAUDE.md`'s five Anti-Overclaiming Rules, checked individually:

1. **"Mark unsupported claims as `needs evidence`."** — Present in the OUTPUT CONTRACT
   (`evidence_table[].status` enum includes `"needs evidence"`; `overclaiming_check.needs_evidence`
   field), in `=== EVIDENCE SOURCE RULES ===` ("its name alone is not evidence for specific bullet
   claims — fall back to the concrete facts below and mark anything else `needs evidence`"), and in
   `=== SAFETY / OVERCLAIMING CHECKS ===` ("unresolved unsupported claims go into `needs_evidence`
   and must also appear in `evidence_table` with status 'needs evidence'"). Confirmed adequate.
2. **"Separate commercial experience from personal/project experience."** — Present via
   `cv_content.experience[].experience_type: "commercial" | "personal"`,
   `selected_projects[].project_type: "personal_project" | "current_work_project"`, the explicit
   "Never present these personal projects as commercial production work" in
   `=== SELECTED PROJECTS ===`, and the current-work block's own framing throughout
   `=== CURRENT-WORK BLOCK (MANDATORY, SEMI-FIXED) ===` (e.g. the JobFlow bullet: "Keep this as
   personal/portfolio evidence, never as commercial production"). Confirmed adequate.
3. **"Do not present personal AI/FastAPI/OpenAI/MCP/Claude Code work as commercial production
   experience."** — Partially present in v3, the same gap shape as prompt_1's original gap
   (§2.3 rule 3): `=== SAFETY / OVERCLAIMING CHECKS ===` has "Personal AI/RAG/FastAPI/OpenAI
   exposure is never presented as commercial production experience" — covering four of the six named
   technologies plus a generic "AI" catch-all, but **MCP and Claude Code were never named anywhere in
   the file** (confirmed by a full-file grep for both terms, zero matches). This is notable because
   the current-work block's own JobFlow bullet (line 77) describes building *this very project* —
   the most direct evidence anchor for MCP/Claude Code work — without naming either tool. Root
   `CLAUDE.md` names both explicitly. **Gap confirmed and fixed**: `prompt2_v4.txt`
   (`PromptTemplate` version 4, replaces v3 as the active version) adds "MCP" / "Claude Code" in two
   places — a new dedicated `=== SAFETY / OVERCLAIMING CHECKS ===` bullet ("MCP / Claude Code —
   personal/portfolio tooling exposure only, not commercial production"), matching prompt_1's
   equivalent bullet verbatim, and an extension of the current-work block's closing "Never claim from
   this block" sentence to include "commercial NestJS/FastAPI/OpenAI/MCP/Claude Code production
   usage". (prompt_1's third addition spot — a generic Russian-language standing-note preamble list
   of personal-portfolio technologies — has no structural equivalent in `prompt2_v3.txt`, which
   never carried that preamble in the first place; two targeted additions are the honest mirror of
   prompt_1's fix here, not three.) Decided with the project owner during #201 rather than silently
   edited.
4. **"Do not present Docker/NestJS/Kubernetes/AWS as commercial core skills unless evidence is
   added later."** — Present and, unlike the §2.5 preview finding (which was against the
   pre-adaptation manual source text, not `prompt2_v3.txt` itself), **AWS is not missing here**:
   `=== SAFETY / OVERCLAIMING CHECKS ===` states "Docker, NestJS, Kubernetes, MongoDB or AWS are
   never presented as commercial core skills without explicit supporting evidence in the input
   context" — AWS (and MongoDB, an extra addition beyond the source rule's four names) made it into
   v3 during #200's adaptation even though §2.5's preview grep found AWS absent from the raw manual
   text. Confirmed adequate, no change.
5. **"Keep German language risk and English communication risk explicit when relevant."** — Present:
   `=== SAFETY / OVERCLAIMING CHECKS ===` states default caps ("German above the level stated in the
   input context (default A2/B1)"; "English as fluent (default B1/B1+ professional working use)")
   with an explicit "unless the context states otherwise" honesty condition. Less elaborate than
   prompt_1's dedicated `=== LANGUAGE RISK RULES ===` section (which defines German fluency
   blocker/high/medium/low gates by internal-vs-customer-facing context), but prompt_2 (CV content
   generation) does not perform vacancy-fit risk scoring the way prompt_1 does — that risk
   assessment already happened upstream and is carried forward via
   `Prompt2InputBuilderService`'s `=== PROMPT 1 ANALYSIS ===` block (§2.4's ad-hoc check). For
   prompt_2's own scope (not overstating language claims in generated CV content), the rule is
   confirmed adequate, no change.

**Net result**: 4 of 5 rules were already fully covered by `prompt2_v3.txt` with no change needed —
including rule 4 (Docker/NestJS/Kubernetes/AWS), which the §2.5 preview had flagged as a risk but
which #200's adaptation had already resolved. Rule 3 had the same partial, generic-catch-all gap for
MCP/Claude Code found in prompt_1 (§2.3) — fixed by creating `prompt2_v4.txt` (two targeted
additions, no other content changed) and activating it as the new version-4 `PromptTemplate` row in
`apps/api/prisma/seed.ts` (v3 deactivated, not deleted — per the "never silently overwrite a
template version" invariant, same as prompt_1's v3→v4 history).

## 3. Golden Dataset

### 3.1 Source

Built from real, already-completed application folders — the same ones referenced in
`docs/00_product_vision_updated_consistent.md` §3 (`Action1/`, `Amach/`, etc.). A usable golden
case needs, at minimum:

- the original vacancy text (already exists as the folder's `.txt` source file);
- the manually-produced targeted CV content for that vacancy (the manually-written
  `03_targeted_CV_content_*.md` or equivalent);
- for skip cases: the manually-written skip reason, if one exists.

Folders with only a vacancy text file and no manual CV output yet (e.g. an application still in
progress) are not usable as golden cases — there is nothing to compare against.

### 3.2 Recording

Each golden case should record, at minimum:

```text
- workspace slug or folder reference
- vacancy source text (path or copy)
- manual decision (apply / maybe / skip) as it was actually made at the time, if known
- manual targeted CV content (or skip reason) actually produced
- date added to the golden set
```

Where the golden set is physically stored (a `knowledge-sources/`-adjacent folder, a
`project-management/` file, or workspace records created specifically for calibration) is an
implementation decision for Phase 17 — this document defines what must be captured, not the
storage mechanism.

## 4. Comparison Method

**Do not compare with a literal text diff.** Exact wording will never match between a human and an
AI, and is not the goal — evidence-grounded substance is.

### 4.1 Decision-level comparison (Prompt 1)

- Does the AI's apply/maybe/skip recommendation match the decision the project owner actually
  made for that vacancy?
- If not: is the mismatch a reasoning gap (AI missed something a human caught) or a legitimate
  difference in risk tolerance? Record which.

### 4.2 Content-level comparison (Prompt 2)

Compare section by section, not as one block:

| Section | What to check |
|---|---|
| Headline / positioning | Same overall angle, not necessarily same words |
| Summary | Same key claims emphasized |
| Top skills | Same core skills surfaced, in roughly the same priority |
| Experience bullets | Same achievements/responsibilities represented; no invented ones |
| Evidence table / `needs evidence` flags | AI does not flag things the human evidence set actually supports (a sign source content isn't reaching the model), and does not overclaim things the human draft doesn't claim |

### 4.3 Recording a comparison result

For each golden case, record: decision match (yes/no + note), and a short per-section verdict
(match / partial / mismatch + note) for the CV content. Keep this alongside the golden case data
(§3.2).

## 5. Convergence Criteria (Phase 17 Done Criteria)

Calibration is "done enough" for Phase 17 when, across the full golden set:

- Decision-level matches for all cases, or every mismatch is explicitly reviewed and accepted with
  a documented reason (not silently ignored).
- No section-level "mismatch" verdicts caused by missing evidence/source content (that would
  indicate Phase 16 wasn't actually fixed, not a prompt-wording problem).
- Remaining section-level "partial" verdicts are limited to stylistic differences, not missing or
  invented substance.

If convergence isn't reached, iterate on the relevant `PromptTemplate` (new version, per
`CLAUDE.md`'s Prompt Pipeline Rules — never silently overwrite a version) and re-run the golden
set.

The self-assessment `quality_score` added to `VacancyAnalysis`/`TargetedCvContentOutput` in
Phase 16 (§2 point 3) is a secondary signal, not a substitute for the manual comparison above — a
high self-reported score does not mean the output matches the manual baseline, only that the
model considers its own output internally consistent. Use it to spot-check for cases where a low
self-score correlates with a real mismatch, not as the pass/fail criterion itself.

## 6. Manual Parity Testing (Phase 18)

Once Phase 17's convergence criteria are met, run the same comparison method (§4) against a small
number of **new** real vacancies — ones not in the golden set, ideally processed for the first
time going forward. This checks generalization, not just golden-set overfitting.

Record each parity-test pass in `project-management/TEST_LOG.md`, same as any other manual test
(see the TASK-005/TASK-059 persistence-check entries for the expected level of detail: what was
run, what was compared, and the result).

If a parity-test case reveals a real mismatch, treat it as a regression: either fix it (new
`PromptTemplate` version, back to Phase 17) or explicitly document it as an accepted limitation —
do not silently let it pass.

## 7. Out of Scope (for this first pass)

- Automatic/AI-graded comparison (LLM-as-judge). Comparison in Phase 17/18 is manual.
- Calibrating Prompt 3 (pre-PDF check) or Prompt 5 (final check) — only Prompt 1/Prompt 2 are in
  scope until core parity is reached.
- A full multi-turn conversation system replacing the single manual-note field from Phase 16.
