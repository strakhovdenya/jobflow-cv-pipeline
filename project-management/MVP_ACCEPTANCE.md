# MVP Acceptance — Practical Real-Provider Smoke Test

## Task

TASK-038A — Run practical MVP real-provider smoke test (see `TASK_BOARD.md`, `TEST_LOG.md` entry dated 2026-07-08).

## Provider / Model

- Provider: `openai` (`AI_PROVIDER=openai` in `.env`)
- Model: `gpt-4o`
- Prompt 1 AiRun: `cmrc90397000ckmfnlirhou7u` — 3326 input / 1532 output / 4858 total tokens
- Prompt 2 AiRun: `cmrc93dg4000lkmfnklsg6mqp` — 5822 input / 2109 output / 7931 total tokens

## Test Vacancy

- Company: Atmen (Munich-based RegTech startup)
- Role: Software Engineer
- Source: real public job ad text, pasted in full as `vacancyText`

## Workspace

- Workspace ID: `cmrc8zhba0005kmfnpf3hqo4g`
- Folder: `storage/applications/2026_07_08_Atmen_Software_Engineer/`

## Generated Artifacts

| File | Origin | Notes |
|---|---|---|
| `00_vacancy_source.txt` | pasted | full vacancy text saved |
| `01_vacancy_analysis.md/json` | prompt_1 | decision `MAYBE`, score 64 |
| `02_targeted_cv_content.md/json` | prompt_2 | overclaiming check: critical issues none |
| `04_cv_export.html` | generated_by_export_service | no AiRun created (ADR-012) |
| `04_cv_export.pdf` | generated_by_export_service | 119350 bytes, PDF 1.4, 1 page — opens correctly |

All 7 artifacts confirmed present both on disk and as `GeneratedArtifact` rows in PostgreSQL.

## Pipeline Result

- Prompt 1: `MAYBE` (score 64) — correctly flagged NestJS/PostgreSQL/React depth as `needs_evidence`
  (personal/portfolio exposure, not verified commercial experience), consistent with the project's
  anti-overclaiming rules.
- Human review: approved `maybe` (matched the AI's own recommendation; no override needed).
- Prompt 2: targeted CV content generated. Commercial experience (EPAM Systems, Factor-IT, CHI Software)
  correctly kept separate from personal/project experience (AI Job Assistant / FastAPI). No critical
  unsupported claims; multiple skills correctly marked `needs evidence` rather than asserted as fact.
- CV draft approved by human review.
- Export produced a real, valid, non-zero-size PDF without creating an `AiRun` — confirms ADR-012
  (Step 4 export is deterministic, not an AI prompt).

## Known Issues

- A stale dev server process (started before `.env` was updated to `AI_PROVIDER=openai`) was still
  running the fake provider on port 3000 at the start of this test. Its Prompt 1 output was caught
  by inspecting the generated analysis content (wrong company/role name — the fake fixture's
  "Fake Company — Backend Developer" instead of "Atmen — Software Engineer"), not by any automated
  check. The stale process was killed, the server restarted, and the contaminated workspace deleted
  before re-running cleanly. No code change was required — this was an environment/process hygiene
  issue, not a product defect. Worth noting for future manual runs: verify a freshly started server
  is in use, since NestJS reads `.env` only at process start.

## MVP Status

**PASS.** First usable MVP (TASK-001 through TASK-038A) is complete: a real OpenAI-backed run on a
real vacancy produces a real generated CV PDF, with correct human review gating and anti-overclaiming
enforcement at every step.
