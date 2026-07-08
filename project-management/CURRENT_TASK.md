# Current Task

## TASK-037D — Complete .env setup and developer onboarding documentation

**Phase:** Phase 6 — PDF Export by Default: First Usable MVP
**Priority:** P0
**Depends on:** TASK-037A (DONE)
**Status:** TODO → starting now

## Context

`.env.example` currently only has PostgreSQL vars. API keys, storage root, and AI
provider selection are not documented. A developer must be able to set up the
project from scratch without asking the author.

## Files likely affected

```text
.env.example
README.md  (or docs/00_setup.md)
```

This is a **documentation-only task**. No application code, schema, or endpoint
changes are in scope.

## Acceptance Criteria

- [ ] `.env.example` includes all required vars: `DATABASE_URL`, `STORAGE_ROOT`,
      `KNOWLEDGE_SOURCES_ROOT`, `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`,
      `AI_PROVIDER_DEFAULT`, `AI_MODEL_DEFAULT`.
- [ ] Setup steps documented: Docker, migrations, seed, knowledge sources, env vars.
- [ ] OpenAI is documented as the first real provider for MVP; Anthropic is
      later/fallback, not required for MVP.
- [ ] `.env` is in `.gitignore` (already is — verify, do not just assume).

## Test Requirement

- Manual: fresh checkout → follow docs → `npm run start:dev` → first workspace
  created successfully.
- Record result in `project-management/TEST_LOG.md`.

## Done Definition

Another developer can set up and run the project without asking the author.

## Out of scope (do not expand)

- No changes to `.env.example` variables beyond the list above.
- No refactoring of existing config/validation logic (that's TASK-PH-001, already DONE).
- No work on TASK-038 / TASK-038A (smoke tests) — separate tasks, come after this one.
- No new endpoints, no Swagger changes.

## Next task after this one

Per `TASK_BOARD.md` dependency chain, next is **TASK-038** (mechanical MVP smoke
test with fake provider) — do not start it automatically after TASK-037D closes.
