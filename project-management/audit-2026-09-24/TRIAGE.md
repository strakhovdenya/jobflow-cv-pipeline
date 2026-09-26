# Audit 2026-09-24 — triage

Source: three-part adversarial audit of `main` at `92a6420` (2026-09-24): Part 1 — workflows and pipeline
reliability (P1-*), Part 2 — security, PII, LLM, data integrity, performance (P2-*), Part 3 — NestJS
architecture, tests, Claude/Ralph tooling (P3-*).

The full reports are **not** in the repository yet: the repository is public and they contain
step-by-step attack scenarios for findings that are still open. They will be added under this folder
after the security findings below are closed. Findings are re-checked against `main` at `6df932b`
(2026-09-26) before triage.

Legend for **Where**: `#N` — existing or new GitHub issue; **EPIC-29** — planned epic «pipeline step
atomicity and recovery» (`project-management/prd/PRD-pipeline-step-atomicity-and-recovery.md`); **EPIC-28** — dark factory extraction (#491), Ralph core phase;
**deferred** — no issue now, reason given; **fixed** — already fixed on `main`.

## Part 1 — workflows and reliability

| ID | Severity | Finding (short) | Where |
|---|---|---|---|
| P1-001 | Critical | Creating a workspace with an existing slug deleted the existing workspace folder | **fixed** — #421 (`createWorkspaceFolderExclusive`) |
| P1-002 | High | AI steps commit side effects before the status compare-and-set; different steps of one workspace can run concurrently | EPIC-29 |
| P1-003 | High | `failed` is a dead end; only a new Prompt 1 run leaves it | EPIC-29 (absorbs #307) |
| P1-004 | Medium | No graceful shutdown; in-flight AI jobs are killed and block retries up to 15 min | #406 (extended 2026-09-26) |
| P1-005 | Medium | OpenAI SDK retries and 120 s timeout repeat paid calls silently | #496 |
| P1-006 | Medium | Artifact versions share one overwritten file; failed regenerate overwrites the reviewed md | EPIC-29 |
| P1-007 | Medium | Full Docker deployment cannot run the pipeline end to end (no artifact volume, no knowledge sources, no Chromium) | #503; owner runs only Postgres/Redis in Docker today |
| P1-008 | Low | Failed confirm-skip leaves only «Skip» available | EPIC-29 |
| P1-009 | Low | Re-running Prompt 1 from `failed` keeps stale review state and downstream artifacts | EPIC-29 |
| P1-010 | Low | Enqueue check-remove-add race on a reused job id | EPIC-29 |

## Part 2 — security, PII, LLM, data, performance

| ID | Severity | Finding (short) | Where |
|---|---|---|---|
| P2-001 | High | Prompt 3 corrections are applied through an unrestricted path setter | #492 |
| P2-002 | High | Services and dashboard reachable from the network | #495 (bind to localhost); dashboard auth — deferred while the owner runs locally only |
| P2-003 | Medium | API key written to request logs | #493 |
| P2-004 | Medium | Prompt injection via spoofable section headers; forced-claim exemption trusts the AI's own label | #426 (delimiters); #501 (forced claims without a manual note) |
| P2-005 | Medium | Download fails with 500 for Cyrillic file names | #494 |
| P2-006 | Medium | Global throttler keyed by the Next server's single IP trips on job polling; AI enqueue not limited | #497 |
| P2-007 | Medium | `AI_PROVIDER` silently defaults to `fake` | #496 |
| P2-008 | Medium | No output cap, no `finish_reason`/refusal handling, unbounded notes | #496 |
| P2-009 | Low | «One active PromptTemplate per step» not enforced by the DB | #498 |
| P2-010 | Low | Same as P1-006 (shared physical file for versions) | EPIC-29 |
| P2-011 | Low | Same as P1-006(b) (failed regenerate overwrites md) | EPIC-29 |
| P2-012 | Low | API responses and prompts expose absolute server paths | #499 |
| P2-013 | Low | Swagger exposed in the Compose deployment | #503 |
| P2-014 | Low | Candidate contact data and master CV committed to the public repository | deferred — owner decision 2026-09-26: keep as is |
| P2-015 | Low | Chromium per PDF, JS enabled, `--no-sandbox` | #405 (JS off, request blocking, sandbox); browser reuse — deferred |
| P2-016 | Low | Unpaginated workspace list; no index on `PromptRun.workspaceId` | #406 (pagination, index) |

## Part 3 — architecture, tests, agent tooling

| ID | Severity | Finding (short) | Where |
|---|---|---|---|
| P3-001 | High | Ralph's agent boundary not enforced: gate runs agent-editable scripts, `npx *`, `npm install` with scripts, issue body not marked as data | #398 (extended 2026-09-26) |
| P3-002 | High | Self-review diff misses new (untracked) files | #399 |
| P3-003 | High | Nothing runs `next build` for `apps/web` (CI and Ralph gate) | #500 (CI); Ralph gate — EPIC-28 |
| P3-004 | Medium | Ralph writes agent permissions before metaskills are installed | #399 (extended 2026-09-26) |
| P3-005 | Medium | Ralph ticks AC and posts evidence before the PR exists | #399 |
| P3-006 | Medium | Doc-only shortcut skips reviews and gate for `CLAUDE.md`, `DECISIONS.md`, fixtures | EPIC-28 (Ralph core) |
| P3-007 | Medium | Code-review scope by `Affects` waves through the agent's own out-of-scope files | EPIC-28 (Ralph core); verifier side — EPIC-27 #477 |
| P3-008 | Medium | Reviewers can write files; gate applies `eslint --fix` after review | #398 (reviewer deny, gate dirtiness check) |
| P3-009 | Medium | Same as P1-004 | #406 |
| P3-010 | Medium | Concurrency guarantees tested only against mocks | EPIC-29 |
| P3-011 | Medium | Unit test codified P1-001 | **fixed** — #421 |
| P3-012 | Medium | Ralph has no wall-clock limits | #398 |
| P3-013 | Low | `trustRunDir()` rewrites `~/.claude.json` non-atomically | EPIC-28 (Ralph core) |
| P3-014 | Low–Medium | AI worker runs inside the API process | deferred — revisit when scaling |
| P3-015 | Low | `/health` is liveness only | #503 |
| P3-016 | Low | e2e does not boot `main.ts`; shares the dev DB locally | #502 |
| P3-017 | Low | Hook and DEL_RALPH defects | commit-gate bypass and `TEST_LOG.md` reference — **fixed** (#445, #400); rest — EPIC-28 (Ralph core) |
| P3-018 | Low | `EvalModule` is orphaned | #404 |

## Uncertain findings

Part 1 U-1…U-4, Part 2 U-1…U-5, Part 3 U-1…U-5 are not filed. Each will be re-checked when the related
issue or epic is worked on (for example, Part 2 U-4 «forced bullets overwritten by Prompt 3 corrections»
together with #492 and the forced-claims issue).
