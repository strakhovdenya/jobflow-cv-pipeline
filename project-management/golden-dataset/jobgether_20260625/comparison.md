## jobgether_20260625

Per `docs/10_calibration_and_parity.md` §4.3 — unified decision + content-level comparison result,
kept alongside this golden case's data (§3.2). Full iteration history and reasoning: see
`project-management/TEST_LOG.md` entries `ISSUE-207`, `ISSUE-214`, `ISSUE-208`.

| Round | PromptTemplate version | Decision match | Headline | Summary | Top skills | Experience | Evidence/needs_evidence | Note |
|---|---|---|---|---|---|---|---|---|
| 1 | prompt_1 v10 / prompt_2 (unmodified) | yes (maybe/61) | match | match | match | match | match | Reasoning gap resolved in ISSUE-214 across 3 prompt versions (v5-v7/v10) — root cause was incomplete `must_have` enumeration, not the originally-hypothesized agency/intermediary angle. Content-level: same backend-integration angle, same caution around payments/billing and MongoDB/RabbitMQ/Kafka/AWS/GCP (correctly flagged `remove`/`needs evidence`). |
