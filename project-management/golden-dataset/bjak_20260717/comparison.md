## bjak_20260717

Per `docs/10_calibration_and_parity.md` §4.3 — unified decision + content-level comparison result,
kept alongside this golden case's data (§3.2). Full iteration history and reasoning: see
`project-management/TEST_LOG.md` entries `ISSUE-207`, `ISSUE-214`, `ISSUE-208`.

| Round | PromptTemplate version | Decision match | Headline | Summary | Top skills | Experience | Evidence/needs_evidence | Note |
|---|---|---|---|---|---|---|---|---|
| 1 | prompt_1 v10 / prompt_2 (unmodified) | yes (maybe/68) | match | match | match | match | match | Same "backend-focused Full Stack Engineer" angle; same 3 career cases (ProductsUp, Amplience, CommerceTools); same needs_evidence and remove flags. AI's Selected Projects picks AI Job Assistant/Email Camp instead of manual's JobFlow-centered block — attributed at the time to a schema-driven structural difference. ISSUE-238 found this attribution was wrong (see Round 2). |
| 2 | prompt_1 v10 / prompt_2 (unmodified — code fix, not a prompt edit) | yes (maybe/94) | match | match | match | match | match | ISSUE-238 root-cause finding: Round 1's "Selected Projects instead of Current Independent Work block" was **not** a schema limitation — `TargetedCvContentBlock.current_work_block` is a required schema field and the AI populated it correctly (JobFlow, HEY ALTER! volunteering, Python/FastAPI) in every round-1 case's `02_targeted_cv_content.json`, but `Prompt2Service.buildMarkdown()` never rendered it into the `.md` artifact — a code bug, not a prompt or Phase-16 evidence-wiring issue (final PDF export was unaffected; `prompt2-to-cv-content.mapper.ts` already read this field correctly). Fixed in `prompt2.service.ts`, workspace regenerated via real Prompt 2 call (`AI_PROVIDER=openai`) on the fix; `.md` now renders "Current Independent Work & Portfolio Projects" with JobFlow + HEY, ALTER! bullets, matching manual-cv.md. |
