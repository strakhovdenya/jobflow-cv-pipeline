# Current Task

## Task ID

`TASK-033` — DONE

> Next task to be selected by user. See `project-management/TASK_BOARD.md`.

## Title

Implement basic anti-overclaiming guard

## Source

`docs/07_task_backlog.md`

## Context

MVP must prevent unsupported claims from reaching CV output. The guard follows the strict MVP policy: critical unsupported claims block PDF export unless the user explicitly overrides with a note; medium warnings are stored for review but do not block export.

## Docs to Read

- `docs/07_task_backlog.md` — TASK-033
- `docs/08_ai_pipeline.md` section 11 — Basic Anti-Overclaiming Guard (11.1–11.5)
- `docs/03_domain_model.md` section 13 — Entity: EvidenceItem
- `docs/08_ai_pipeline.md` section 10.4 — Prompt 2 Output schema (`overclaiming_check` field, already implemented in TASK-032)

If these sections are insufficient or conflict with the existing implementation, stop and ask.

## Note on Design Options (docs/08_ai_pipeline.md §11.1)

The doc explicitly allows several implementation styles:

- structured checks inside Prompt 2;
- a small deterministic rule-based service;
- a separate AI-assisted validation step later;
- a combination of the above.

Given "Not allowed: calling the real AI provider" below and the acceptance criterion "Guard must not invent evidence", implement this as a **deterministic rule-based service**, not an AI call. If existing code or docs suggest otherwise, stop and ask before proceeding.

## Existing Services / Files to Inspect

- `src/pipeline/prompt2/prompt2.service.ts` (from TASK-032, produces `02_targeted_cv_content.json` with `overclaiming_check` field already in schema)
- `src/pipeline/schemas/prompt2.schema.ts` (`Prompt2OverclaimingCheck`, `Prompt2Bullet.risk_level` — already defined, currently passive/uninterpreted)
- `src/knowledge-sources/**` (EvidenceItem access, if implemented)
- `prisma/schema.prisma` (`EvidenceItem` model, `EvidenceCategory` enum)
- related tests for Prompt 2 service

## Files Likely Affected

```text
src/evidence/evidence-guard.service.ts
src/pipeline/prompt2/**
src/evidence/**
```

## Acceptance Criteria

- Guard flags unsupported claims such as commercial AI/RAG, commercial NestJS, commercial JobFlow/NestJS/OpenAI production experience, Docker production ownership, Kubernetes production experience, AWS without evidence.
- Guard distinguishes `critical`, `warning` and `needs_evidence` severities.
- Critical unsupported claims set export readiness to blocked until the claim is removed, safely rephrased or manually overridden with an audit note.
- Medium warnings do not block export by default.
- Guard outputs warning severity and safe wording suggestion.
- Prompt 2 output stores guard warnings in JSON.
- Guard must not invent evidence; missing support remains `needs evidence`.

## Test Requirement

- Unit tests for known risky claims.
- `npm run test` must pass locally.
- Record result in `project-management/TEST_LOG.md`.

## Scope

Allowed:

- add `EvidenceGuardService` (or equivalent) implementing deterministic rule-based checks;
- integrate guard output into Prompt 2 flow so warnings are stored in `02_targeted_cv_content.json` (`overclaiming_check` field already exists in schema from TASK-032 — populate it, do not redesign it unless conflicting with docs);
- read `EvidenceItem` records to determine whether a claim is supported;
- add/update tests for the above.

Not allowed:

- calling the real AI provider;
- implementing Prompt 3 pre-PDF check (TASK-042, P1/optional);
- implementing CV draft review endpoint (TASK-034);
- implementing renderer/PDF export;
- changing prompt-step source selection logic from TASK-018;
- changing Prompt 2 content-generation logic itself (bullets, selected projects) — only add/populate guard warnings;
- bypassing review gates;
- inventing or fabricating evidence for unsupported claims.

## Done Definition

- CV draft includes explicit overclaiming warnings or safe alternatives.

## Notes

### 2026-07-04 — Critical Claims List: Merged from Two Sources

`docs/07_task_backlog.md` (TASK-033 acceptance criteria) and `docs/08_ai_pipeline.md` §11.4 list overlapping but not identical example claims. Both are treated as valid examples of the same guard behavior — merged, not chosen one-over-the-other, since neither excludes the other and losing coverage would weaken the guard.

Merged list of critical claims to flag (source noted per item):

| Claim                                                  | Source                      |
| ------------------------------------------------------ | --------------------------- |
| commercial AI/RAG production experience                | backlog                     |
| commercial NestJS production experience                | backlog                     |
| commercial JobFlow/NestJS/OpenAI production experience | backlog                     |
| Docker production ownership                            | backlog + ai_pipeline §11.4 |
| Kubernetes production experience                       | backlog + ai_pipeline §11.4 |
| AWS production experience (without evidence)           | backlog + ai_pipeline §11.4 |
| commercial MCP production experience                   | ai_pipeline §11.4           |
| AI Engineer (as job title/role claim)                  | ai_pipeline §11.4           |
| LLM platform engineer                                  | ai_pipeline §11.4           |
| production Claude Code automation                      | ai_pipeline §11.4           |
| agentic AI production experience                       | ai_pipeline §11.4           |
| commercial NestJS EPAM production stack                | ai_pipeline §11.4           |
| Kafka production experience                            | ai_pipeline §11.4           |
| fluent English                                         | ai_pipeline §11.4           |
| professional German                                    | ai_pipeline §11.4           |

This list is a starting rule set for the deterministic guard, not necessarily exhaustive. New claim patterns may be added later without requiring a new task, as long as the underlying guard mechanism (severity classification: `critical` / `warning` / `needs_evidence`) does not change — that mechanism itself is the deliverable of TASK-033.

Guard implementation must not hardcode a fixed final list as the _only_ possible claims — it should classify claims found in Prompt 2 output against `EvidenceItem` support, using this list as the initial known-risky-pattern set for test coverage (see Test Requirement).

## Claude Code Instructions

Before editing code:

1. Read `CLAUDE.md`.
2. Read this file fully.
3. Read all Docs to Read listed above.
4. Inspect existing Prompt 2 service and schema (post-TASK-032) to confirm how `overclaiming_check` is currently populated (likely empty/passive).
5. Confirm whether `EvidenceItem` records already exist/seeded (TASK-019) and how to query them.
6. Propose exact method signatures and file list for `EvidenceGuardService` and its integration point in `Prompt2Service`.
7. Wait for user approval before making code changes.

After implementation is complete, Claude Code:

1. Show each Acceptance Criterion as ✅/❌.
2. Show changed files.
3. Show test results.
4. Update `project-management/TEST_LOG.md`.
5. Suggest whether TASK-033 can be marked DONE.
6. Stop and wait for user approval.

## Git Instructions

Claude Code runs at the very start, before code changes:

```bash
git checkout -b task/TASK-033-anti-overclaiming-guard
```

Only after user explicitly writes "approved" — Claude Code runs:

```bash
git add .
git commit -m "feat: TASK-033 implement basic anti-overclaiming guard"
git push -u origin task/TASK-033-anti-overclaiming-guard
gh pr create --title "feat: TASK-033 basic anti-overclaiming guard" --body "Closes TASK-033" --base main
```

Then stop completely. User handles merge, checkout main and pull.
