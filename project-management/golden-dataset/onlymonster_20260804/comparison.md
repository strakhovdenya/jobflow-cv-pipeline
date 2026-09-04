## onlymonster_20260804

Per `docs/10_calibration_and_parity.md` §4.3 — unified decision + content-level comparison result,
kept alongside this golden case's data (§3.2). Full iteration history and reasoning: see
`project-management/TEST_LOG.md` entries `ISSUE-207`, `ISSUE-214`, `ISSUE-208`, `ISSUE-232`.

| Round | PromptTemplate version | Decision match | Headline | Summary | Top skills | Experience | Evidence/needs_evidence | Note |
|---|---|---|---|---|---|---|---|---|
| 1 | prompt_1 v10 | yes — fixed this round (skip/59) | N/A | N/A | N/A | N/A | N/A | Reasoning gap fixed in ISSUE-214: added `master_cv` knowledge source to Prompt 1's required sources (was missing since TASK-018), plus prompt_1 v7-v10's core-must-have and language-risk-guard fixes. Content-level: N/A — `manual-cv.md` is actually a skip-reason document, and the AI run was deliberately left at `paused_after_analysis` per ISSUE-232; no CV content exists on either side. Explicitly recorded, not silently omitted, per ISSUE-208's Acceptance Criteria. |
