# Scoping analysis — dual CV PDF export (ATS variant)

**Task**: ISSUE-305 scoping investigation for ISSUE-293 ("Dual CV PDF export: current design +
ATS-optimized variant").  
**Date**: 2026-09-01  
**Author**: autonomous analysis pass  
**Status of `web-prompt-ats-pdf-generation.txt`**: **readable, not corrupted** (see §1 below).

---

## §1 — Reference file status: `web-prompt-ats-pdf-generation.txt`

The file at `project-management/reference/ats-dual-cv-export/web-prompt-ats-pdf-generation.txt`
is **fully readable**. ISSUE-293 noted a concern about mojibake corruption; that is not the case.
The file is a long Russian-language prompt used in an external web AI tool to generate the
ATS-ready PDF manually. All text is correctly encoded (UTF-8, no replacement characters). No
implementation blockers from this file's content.

---

## §2 — Open Question 1: Does Prompt 2 need any change?

**Finding: No Prompt 2 change is needed. This is a render-only change.**

### §2.1 — What `TargetedCvContentOutput` already carries

`apps/api/src/pipeline/schemas/targeted-cv-content.schema.ts` defines
`TargetedCvContentOutput`, whose `cv_content: TargetedCvContentBlock` field contains:

| Field | Type | Already in schema |
|---|---|---|
| `headline` | `string` | ✅ |
| `summary` | `string[]` | ✅ |
| `top_skills` | `string[]` | ✅ |
| `current_work_block` | `TargetedCvCurrentWorkBlock` | ✅ |
| `current_work_block.include` | `boolean` | ✅ |
| `current_work_block.safe_label` | `string` | ✅ |
| `current_work_block.role_line` | `string` | ✅ |
| `current_work_block.dates` | `string` | ✅ |
| `current_work_block.stable_intro` | `string` (prose intro, NOT a bullet) | ✅ |
| `current_work_block.bullets` | `TargetedCvBullet[]` | ✅ |
| `experience[]` | companies, roles, dates, bullets | ✅ |
| `selected_projects[]` | title, bullets, include flag | ✅ |
| `certifications[]` | (opaque `unknown[]`, mapper filters `include: true`) | ✅ |
| `rendering_hints` | density, target_pages, max_pages | ✅ |

`TargetedCvContentOutput` does **not** contain: contact details, location, work_authorization,
education, languages, links, volunteering. These are not Prompt 2's concern — they come from
`CANDIDATE_PROFILE_CONFIG` in `apps/api/src/document-export/candidate-profile.config.ts`.

### §2.2 — What the ATS example (`example-ats-cv-extracted-text.md`) needs

Comparing section by section against the extracted ATS CV:

| ATS section | Source in current pipeline | Gap? |
|---|---|---|
| Name | `CANDIDATE_PROFILE_CONFIG.candidate.name` | None |
| Headline | `cv_content.headline` | None |
| Phone, Email, LinkedIn, GitHub | `CANDIDATE_PROFILE_CONFIG.candidate.contact.*` | None |
| Location (`Cologne, Germany \| Remote preferred \| Open to hybrid/office roles in Cologne`) | `CANDIDATE_PROFILE_CONFIG.candidate.location` — currently `"Cologne, Germany"` only | **Minor gap** (location string is shorter than ATS example; see §5.1) |
| `Authorized to work in Germany` | `CANDIDATE_PROFILE_CONFIG.candidate.work_authorization` — currently `"Eligible to work in Germany"` | **Wording mismatch** (see §5.2) |
| EGZ subsidy line | Not in any schema or config | **Data gap** (see §5.3) |
| Summary | `cv_content.summary[]` | None |
| Current Independent Work block (intro line + bullets) | `cv_content.current_work_block.stable_intro` + `.bullets[]` | None |
| Professional Experience (company, role, dates, bullets) | `cv_content.experience[]` | None |
| Education | `CANDIDATE_PROFILE_CONFIG.education[]` | None |
| Top Skills (inline `\|`-separated) | `cv_content.top_skills[]` | None (rendering differs; see ATS rule §3 item 16) |
| Languages | `CANDIDATE_PROFILE_CONFIG.languages[]` | None |
| Certifications | `cv_content.certifications[]` via mapper | None |

**Conclusion**: The combined `CvContent` object (Prompt 2 output + profile config, produced by
`mapPrompt2OutputToCvContent()`) already carries **every field** the ATS variant needs except:
- EGZ hiring subsidy line (new data; see §5.3 — this is a product decision, not a rendering gap)
- Optional longer location/authorization wording (minor wording, already in existing config fields)

The ATS variant only needs a new, single-column Handlebars template that renders the same
`CvContent` object differently. No new Prompt 2 fields, no schema changes, no DB changes.

---

## §3 — Extracted ATS formatting rules (implementation checklist)

Derived directly from `web-prompt-ats-pdf-generation.txt`. Written so each rule can be pasted
directly into an implementation issue's Acceptance Criteria.

### Layout rules

1. **Single-column, single reading order.** The rendered HTML must use no CSS grid/flex
   multi-column layout, no `aside`/sidebar element, no `float`, no multi-column text. One
   vertical content flow top-to-bottom.

2. **No ATS-hostile layout elements.** Must not use: `<table>`, positioned `<div>` overlays,
   CSS text boxes, floating shapes, graphical timelines, skill bars, or icons as substitutes
   for text labels.

3. **Section order** (top to bottom): Name → Headline → Contact block (visible) → optional
   simple divider → Summary → Current Independent Work (if `include: true`) → Professional
   Experience → Education → Top Skills → Languages → Certifications → Selected Projects (if
   any). Skills, Languages, Certifications must be regular in-flow sections, not moved to a
   sidebar or separate area.

4. **Contact block placement.** The Contact block must appear as real, visible, selectable text
   **between Headline and Summary** — not in a sidebar, not in a HTML `<header>` or `<footer>`,
   not as a hidden layer, not as annotation-only, not only as link metadata.

5. **Contact block content.** Must contain at minimum: Phone, Email, LinkedIn URL, GitHub URL.
   Location and work authorization may follow on the same or next line(s) if part of approved
   content.

6. **Contact block preferred format (single-line)**:
   `Phone: [phone] | Email: [email] | LinkedIn: https://linkedin.com/in/denys-strakhov | GitHub: https://github.com/strakhovdenya`  
   If this does not fit at readable font size, use two lines:  
   `Phone: [phone] | Email: [email]`  
   `LinkedIn: https://linkedin.com/in/denys-strakhov | GitHub: https://github.com/strakhovdenya`

7. **LinkedIn URL format**: strictly `https://linkedin.com/in/denys-strakhov` — no `www.`, not
   replaced by an icon, not just the word "LinkedIn" as link text without the visible URL.

8. **GitHub URL format**: full `https://github.com/strakhovdenya` — must be visible plain text
   in the PDF, not just a clickable icon.

9. **Hyperlinks must be clickable AND have visible URL text** where the URL itself is meaningful
   (email, LinkedIn, GitHub). It is acceptable for clickable links to also have matching `href`
   attributes, but the visible text must include the URL, not only an icon or label word.

10. **Current work block structure**: safe_label (section heading) → role_line (sub-heading) →
    dates/location line → `stable_intro` (description prose, **without** a bullet marker `•`/`-`
    prefix) → bullets list. The stable_intro must not be rendered as a bullet item.

11. **Current work block length**: description + max 4 bullets by default; 5 bullets permitted
    only if approved Prompt 2 content sets 5 and layout fits on page.

12. **Current work block must not visually dominate EPAM** as the main commercial experience.
    Layout hierarchy must make EPAM the prominent experience block.

### Typography and size rules

13. **Body text**: 10–12pt preferred; **never below 9.5pt** to accommodate page-fit. If the
    content does not fit at 9.5pt minimum, content must be shortened rather than the font
    shrunk further.

14. **Heading style**: section headings as plain text (bold/uppercase/spacing OK); must not be
    replaced by graphical or image-based labels.

15. **Bold, italic and standard bullet markers** (`•`, `-`) are permitted, provided they do not
    break text extraction order.

### Page rules

16. **Page size**: A4 (for Germany/EU output).

17. **Target page count**: 2 pages. If 2 pages is impossible without exceeding the 9.5pt minimum
    font constraint, implementation must flag this (not silently truncate or shrink below minimum).

18. **No orphan section headings** at the bottom of a page without at least one following line.

19. **No text clipping** — no content may be visually cut off at page boundaries or container
    edges.

### PDF technical rules

20. **Text-based PDF**: all body text must be selectable with a mouse, findable via Ctrl+F, and
    correctly extractable as plain text. Must not be an image-only or flattened/rasterized PDF.

21. **No password, encryption, or security restrictions** that would prevent text extraction or
    copying.

22. **No decorative images as carriers of meaningful content** (e.g. no icon replacing a section
    label, no image timeline).

23. **Extracted text reading order** must match visual top-to-bottom reading order: Skills,
    Languages, Certifications, Education must not appear before or interleaved with Experience
    in the extracted text.

24. **File size target**: up to 2 MB, without rasterizing text.

25. **Skills section rendering**: top_skills rendered as a readable `|`-separated line (e.g.
    `JavaScript / TypeScript | React | ...`) or standard list — not as visual "skill tag" chips
    or background-filled boxes that may not extract cleanly.

---

## §4 — Open Questions 2 & 3: recommendations

### §4.1 — Open Question 2: Deterministic render vs. second AI prompt

**Recommendation: deterministic render (new Handlebars template). No second AI call.**

Reasoning:
- The existing `mapPrompt2OutputToCvContent()` already produces a complete `CvContent` object
  that contains every field the ATS variant needs (see §2 above).
- The current design CV is already rendered deterministically from `CvContent` via
  `renderCvTemplate()` and a Handlebars template embedded in `cv-template-renderer.ts`.
- The ATS variant's differences are purely structural (single-column vs. two-column,
  Contact block placement, Skills/Languages as inline sections vs. sidebar). These are
  rendering/layout decisions, not content decisions — they do not require the AI to produce
  different content, only to have that content laid out differently.
- A second AI prompt would add latency, cost, and non-determinism (ADR-012: step 4 is
  deterministic, no AiRun) for zero content benefit.
- Pattern precedent: Prompt 3 corrections are applied by `applyCorrectionsToCvContent()`
  in `cv-template-renderer.ts` — a purely deterministic, in-memory operation — before
  rendering. The ATS variant follows the same pattern.

**This recommendation is for the project owner to confirm or override.** If the project owner
decides that ATS-specific content rewriting (e.g. reformatting bullets, reordering skills) is
needed that cannot be expressed as a template layout change, a second AI prompt step would be
warranted — but the current evidence from reading the reference material does not indicate this.

### §4.2 — Open Question 3: Single export call vs. separate endpoint

**Recommendation: single export call generates both variants simultaneously.**

Reasoning:

- The existing `POST /workspaces/:id/export-cv` triggers a status transition
  (`paused_before_export → cv_pdf_generated`). A second endpoint would need its own status
  management, or would run outside the status machine — both awkward.
- The ATS variant is not an independent deliverable that needs its own gate or human-review
  step. It is a second rendering of the same approved content. Generating it alongside the
  design CV in the same call is architecturally simpler.
- Concrete change: `DocumentExportService.exportCv()` would, after generating
  `04_cv_export.html`/`04_cv_export.pdf`, also call a new `AtsHtmlRendererService.renderToHtml()`
  → `04_cv_export_ats.html`, then `PdfExportService.htmlFileToPdf()` →
  `04_cv_export_ats.pdf`, and register `04_cv_export_ats.pdf` as a second `GeneratedArtifact`
  (artifact type: `cv_export_ats_pdf`, `origin: 'generated_by_export_service'`, matching
  ADR-012's "no AiRun" invariant).
- `GET /workspaces/:id/download-cv` currently hard-codes `04_cv_export.pdf`. A new endpoint
  `GET /workspaces/:id/download-cv-ats` (or a `?variant=ats` query param) would serve the
  ATS download by looking up the `cv_export_ats_pdf` artifact.

**This recommendation is for the project owner to confirm or override.** The alternative (a
separate `POST /workspaces/:id/export-cv-ats` endpoint) is viable but adds a second status
transition and a second human trigger; the project owner may prefer a fully independent ATS
export step if they want to generate the ATS variant separately after reviewing the design CV.

---

## §5 — Additional open questions found during investigation

These were NOT among ISSUE-293's original three open questions.

### §5.1 — Location string scope

The ATS example shows:
```
Cologne, Germany | Remote preferred | Open to hybrid/office roles in Cologne
Authorized to work in Germany.
```
`CANDIDATE_PROFILE_CONFIG.candidate.location` is currently `"Cologne, Germany"` — shorter.
The ATS template could either use only the config value (and lose the "Remote preferred /
Open to hybrid/office" detail), or `CandidateProfileConfig` could be extended with a
`location_full_line` optional field for ATS-specific use.

**Decision needed**: Should the ATS template use the existing short location string, or should
the candidate profile config be extended with a fuller location/authorization string specifically
for ATS output?

### §5.2 — Work authorization wording

`CANDIDATE_PROFILE_CONFIG.candidate.work_authorization` is currently `"Eligible to work in
Germany"`. The ATS example shows `"Authorized to work in Germany."` (different wording, period
at end). The reference prompt explicitly states: `строку work authorization писать только так:
Authorized to work in Germany.`

**Decision needed**: Should the config value be updated to match (it's a direct factual statement
about the candidate, not a Prompt 2 concern), and if updated, should it be updated in the existing
field or as a separate ATS-specific field?

### §5.3 — EGZ hiring subsidy line

The ATS example includes:
```
Potential EGZ hiring subsidy: up to 30% for 3 months, subject to Jobcenter approval.
```
This line does not exist in any current schema, config, or Prompt 2 output. It is also highly
context-specific (Germany-only, Jobcenter eligibility, potentially workspace-specific). Rendering
it in every ATS export unconditionally may not be appropriate for all applications.

**Decision needed**:
- Should this line be added as a static optional field in `CandidateProfileConfig`?
- Or as a workspace-level flag (included only when explicitly set)?
- Or omitted from the automated ATS export for now?

### §5.4 — apps/web: surfacing the second download

The current `apps/web` UI surfaces a single "Download CV PDF" button linked to
`GET /workspaces/:id/download-cv`. If a second `04_cv_export_ats.pdf` artifact is generated,
the UI needs:
- A second download button/link (e.g. "Download ATS CV PDF") at the `cv_pdf_generated` status.
- A way to tell whether the ATS variant exists for a given workspace (the artifact registry is
  the source of truth — `artifactsService.findByWorkspaceId()` already provides this).

**Decision needed**: How should the `apps/web` UI label and surface the two PDF downloads?
(Out of scope for the API implementation but must be addressed in the same epic.)

### §5.5 — ATS variant artifact lifecycle and Prompt 3 corrections

`HtmlRendererService.renderToHtml()` applies Prompt 3 corrections (from `03_pre_pdf_check.json`
if present) before rendering. The ATS variant will need the same consideration: should Prompt 3
corrections also be applied to the ATS template render, or is the ATS template structurally
different enough that the same field-path corrections would be invalid (e.g. a correction that
references a sidebar field that doesn't exist in the ATS template)?

**Decision needed**: Should Prompt 3 corrections apply to both variants, only the design variant,
or be applied to both but validated against the ATS template's structure?

### §5.6 — ATS template: certifications rendering

The current design template renders certifications in the sidebar. The current mapper
(`mapCertifications()`) filters `include: true` items and assigns `priority: 'medium'` uniformly.
The ATS example lists certifications as a plain numbered/bulleted section in the main flow.
The certification date/issuer fields (`CvCertification.issuer`, `.date`) are populated from
`Prompt 2`'s `certifications` array (opaque `unknown[]`), but the actual data shape coming from
Prompt 2 is `{ title, include, reason }` — not the `CvCertification` shape `{ name, issuer?,
date? }`. The mapper maps `title → name` and drops `issuer`/`date` (they're not in Prompt 2's
shape).

In the ATS example, certifications show dates (e.g. "Advanced Node.js: Scaling Applications —
LinkedIn Learning Community, 2026"). This date information is not currently passed through from
Prompt 2 to the ATS render — it would either need Prompt 2 to include it in the certifications
array, or the mapper to be extended.

**Decision needed**: Should the ATS template render certifications without dates (current mapper
output) or with dates (requires Prompt 2 schema extension or mapper change)?

### §5.7 — Rendering hints and density for ATS template

`cv_content.rendering_hints.density` controls CSS class (`density-compact`, `density-normal`,
`density-extended`) in the current design template. An ATS template would need its own density
handling. Should the ATS template respect the same density hints from Prompt 2, or use a fixed
density?

---

## §6 — Recommended phase breakdown

Based on the investigation, the work divides cleanly across three phases. All three phases can be
implemented without any Prompt 2, schema, DB, or migration changes (except the open questions in
§5 — those may add minor config changes).

### Phase 1 — ATS HTML template + pure render function (low risk, no service changes)

**Deliverable**: A new `ats-cv-template-renderer.ts` (peer of `cv-template-renderer.ts`) that:
- Contains a new single-column ATS Handlebars template satisfying all rules in §3.
- Exports a `renderAtsCvTemplate(content: CvContent, corrections?: PrePdfCheckCorrection[]): string`
  function with the same signature as `renderCvTemplate()`.
- Is unit-tested with the same fixture-based approach as `cv-template-renderer.spec.ts`.

No `DocumentExportService` or controller changes in this phase. The render function can be
tested in isolation before being wired in.

**Risk**: Low. Pure rendering, no side effects, no DB, no status transitions.

### Phase 2 — Extend `export-cv` to generate both PDFs in one call (medium risk)

**Deliverable**:
- New `AtsHtmlRendererService` (peer of `HtmlRendererService`) using `renderAtsCvTemplate()`,
  writing `04_cv_export_ats.html` and registering it as a `GeneratedArtifact`.
- `DocumentExportService.exportCv()` extended to also call the ATS renderer and PDF exporter,
  producing `04_cv_export_ats.pdf` (registered with artifact type `cv_export_ats_pdf`,
  `origin: 'generated_by_export_service'`, no `AiRun` — ADR-012).
- New endpoint `GET /workspaces/:id/download-cv-ats` serving the ATS PDF (same path-safety
  logic as `download-cv`).
- Artifact names to add to ADR-006 / root `CLAUDE.md` Artifact Rules:
  `04_cv_export_ats.html`, `04_cv_export_ats.pdf`.
- `ExportCvResult` extended with `atsPdfPath`.

**Risk**: Medium. Touches `DocumentExportService.exportCv()` and the status transition. The
existing design variant is unchanged; the ATS variant is additive. Existing e2e tests cover the
design path; new e2e assertions cover the ATS path.

### Phase 3 — apps/web UI: dual download buttons (low-medium risk, frontend only)

**Deliverable**: `apps/web` shows two download buttons at `cv_pdf_generated`:
- "Download CV (design)" → existing `GET .../download-cv`
- "Download CV (ATS)" → new `GET .../download-cv-ats`

Button visibility conditioned on whether the corresponding artifact exists (API response or a
`HEAD` check).

**Risk**: Low-medium. Frontend only; no API contract change beyond Phase 2's new endpoint.

### Single-PR vs. multi-PR

Phases 1 and 2 together are a realistic single-PR scope if the template implementation is
straightforward. Phase 3 (frontend) is a natural separate PR into an epic base branch. The
standard ADR-025 epic base branch pattern applies.

---

## §7 — Summary decision table for project owner

| Question | Recommendation | Status |
|---|---|---|
| Prompt 2 change needed? | **No** — render-only change | **Confirmed by investigation** |
| Deterministic render vs. AI prompt? | **Deterministic** — new Handlebars template | **Recommendation; owner to confirm** |
| Single call vs. second endpoint? | **Single call** — both PDFs generated by `export-cv` | **Recommendation; owner to confirm** |
| EGZ line (§5.3) | Not included by default — product decision needed | **Open — owner decision** |
| Location/authorization wording (§5.1, §5.2) | Config field update — owner to confirm exact text | **Open — owner decision** |
| Certification dates in ATS (§5.6) | Skip dates for now or extend Prompt 2 — owner to decide | **Open — owner decision** |
| `apps/web` dual download UX (§5.4) | Two labeled download buttons — owner to confirm labels | **Open — owner decision** |
| Prompt 3 corrections on ATS variant (§5.5) | Apply same corrections — owner to confirm | **Open — owner decision** |
| Density hints on ATS template (§5.7) | Respect same hints — owner to confirm | **Open — owner decision** |
