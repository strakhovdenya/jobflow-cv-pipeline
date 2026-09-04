## motion_20260715

Per `docs/10_calibration_and_parity.md` §4.3 — unified decision + content-level comparison result,
kept alongside this golden case's data (§3.2). Full iteration history and reasoning: see
`project-management/TEST_LOG.md` entries `ISSUE-207`, `ISSUE-214`, `ISSUE-208`.

| Round | PromptTemplate version | Decision match | Headline | Summary | Top skills | Experience | Evidence/needs_evidence | Note |
|---|---|---|---|---|---|---|---|---|
| 1 | prompt_1 v10 / prompt_2 (unmodified) | accepted exception (manual: apply / cautious apply, AI: maybe/70) | match | match | match | match (see Round 2) | match | Legitimate risk-tolerance difference — the human's own decision was itself a "cautious apply"; the AI's German language-risk assessment content is accurate, just resolved one notch more conservatively. Cross-validated against an independent live web run (`apply/80`). Content-level: same "backend-focused TypeScript/Azure serverless" angle and same career-case selection. ISSUE-238 later found the "match" verdict on Experience was assessed against a `.md` artifact silently missing the mandatory Current Independent Work block (see Round 2). |
| 2 | prompt_1 v10 / prompt_2 (unmodified — code fix, not a prompt edit) | accepted exception (manual: apply / cautious apply, AI: maybe/94) | match | match | match | match | match | ISSUE-238 root-cause finding: `TargetedCvContentBlock.current_work_block` (required schema field) was correctly populated by the AI in Round 1's JSON (JobFlow, HEY ALTER! volunteering, Python/FastAPI) but `Prompt2Service.buildMarkdown()` never rendered it — a code bug, not a prompt or Phase-16 evidence-wiring issue (final PDF export via `prompt2-to-cv-content.mapper.ts` was already correct). Fixed in `prompt2.service.ts`, workspace regenerated via real Prompt 2 call (`AI_PROVIDER=openai`); `.md` now includes the block, matching manual-cv.md's mandatory content. |
