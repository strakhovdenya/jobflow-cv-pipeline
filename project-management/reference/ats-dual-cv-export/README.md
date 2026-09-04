# Reference material — dual CV PDF export (current style + ATS-optimized)

Collected 2026-08-29 as input for a planned backlog task: export the targeted CV as two PDF
variants in one export step — the current design (existing `HtmlRendererService`/
`PdfExportService` output) and a second, ATS-optimized single-column variant.

Files:

- `web-prompt-ats-pdf-generation.txt` — the prompt the project owner uses on a general-purpose
  web AI tool (not this pipeline) to manually generate the ATS-ready PDF today.
- `Denys_Strakhov_Hire_Feed_JavaScript_Frontend_Developer_Remote_CV_ATS.pdf` — an example output
  of that manual process, copied from the project owner's local Downloads folder
  (`C:\Users\Denys\Downloads\...`) at their request, **to be deleted once the backlog issue this
  supports is closed** (per the project owner's instruction when handing it over).
- `example-ats-cv-extracted-text.md` — plain-text extraction of the PDF above, for a quick read
  without opening the binary.

Open questions this material is meant to unblock (see the backlog issue for the actual task):
whether Prompt 2 (`apps/api/src/pipeline/prompt2/`, `targeted-cv-content.schema.ts`) needs any
change to support an ATS-tailored second variant, or whether the existing approved
`02_targeted_cv_content.json` already carries enough structured data and only a second
rendering/export path (a new ATS-safe single-column HTML template + PDF render, analogous to
`HtmlRendererService`) is needed.
