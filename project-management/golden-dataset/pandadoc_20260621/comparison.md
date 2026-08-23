## pandadoc_20260621

Per `docs/10_calibration_and_parity.md` §4.3 — unified decision + content-level comparison result,
kept alongside this golden case's data (§3.2). Full iteration history and reasoning: see
`project-management/TEST_LOG.md` entries `ISSUE-207`, `ISSUE-214`, `ISSUE-208`.

| Round | PromptTemplate version | Decision match | Headline | Summary | Top skills | Experience | Evidence/needs_evidence | Note |
|---|---|---|---|---|---|---|---|---|
| 1 | prompt_1 v10 | yes (skip/40) | N/A | N/A | N/A | N/A | N/A | Content-level: N/A — `skip` decision, Prompt 2 never run (pipeline stops per ADR-005), no `02_targeted_cv_content` exists on either side. Explicitly recorded, not silently omitted, per ISSUE-208's Acceptance Criteria. |
