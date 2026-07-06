# Current Task

## Task ID

`TASK-037A`

> Source: `project-management/TASK_BOARD.md` "Current Focus" (recommended next task after TASK-037 SKIPPED). Full description — `docs/07_task_backlog.md`, section "TASK-037A — Implement real OpenAI provider" (lines 1339–1369) — source of truth, reconstruction not required.

## Title

Implement real OpenAI provider

## Context

`FakeAiProvider` (`src/ai/providers/fake.provider.ts`) is used in all tests and is the only `AiProvider` implementation that exists today. To run the actual MVP pipeline against a real vacancy, a real provider is required. OpenAI is the first real provider for MVP (per `CLAUDE.md` AI Provider Rules — Anthropic is future/fallback). The existing `AiProvider` interface (`src/ai/ai-provider.interface.ts`) is already provider-neutral; this task adds a second implementation behind it and wires provider selection via env var, without changing the interface or any pipeline service.

## Docs to Read

- `docs/07_task_backlog.md` lines 1339–1369 — section "TASK-037A — Implement real OpenAI provider" (source of truth)
- `src/ai/ai-provider.interface.ts` — public contract to implement:
  - `AiProvider { readonly providerName: string; readonly modelName: string; complete(prompt: string, inputContext: string, options?: AiProviderOptions): Promise<AiProviderResult> }`
  - `AiProviderOptions { jsonMode?: boolean; step?: string }`
  - `AiProviderResult { text: string; parsedJson?: unknown; rawResponse?: unknown; usage?: AiProviderUsage }`
  - `AiProviderUsage { inputTokens?, outputTokens?, totalTokens?, cachedInputTokens?, reasoningTokens?, rawJson? }`
  - `AI_PROVIDER` — DI token string, exported from this file
- `src/ai/ai.module.ts` — current provider wiring: `{ provide: AI_PROVIDER, useClass: FakeAiProvider }`. This is what must become conditional on env var.
- `src/ai/providers/fake.provider.ts` — existing implementation pattern to mirror (constructor-free `@Injectable()`, `providerName`/`modelName` readonly fields, `complete()` returns text + optional `parsedJson` when `jsonMode` is set).
- `src/config/env.validation.ts` — current Joi schema (`envValidationSchema`) that all env vars must be added to; `ConfigService` is how env vars are read elsewhere in the app (see any existing `@Injectable()` constructor using `ConfigService`).
- `.env.example` — current file; new vars must be appended following its existing `# --- Section ---` / `# Required:` / `# Optional:` comment style.
- `src/ai-runs/ai-runs.service.ts` — `saveSuccess(dto: SaveSuccessfulAiRunDto)` / `saveFailed(dto: SaveFailedAiRunDto)` — **not modified by this task**, read only to confirm the shape of token-usage fields your `AiProviderResult.usage` must be able to feed (this task does not call AiRunsService directly — that happens in `Prompt1Service`/`Prompt2Service`, out of scope here).

## Key Invariants

- Do not change the `AiProvider` interface, `AiProviderOptions`, `AiProviderResult`, or `AiProviderUsage` shapes — the new provider must implement the existing contract as-is.
- Do not change `FakeAiProvider` — it remains the default and the only provider used in unit tests.
- Do not change any pipeline service (`Prompt1Service`, `Prompt2Service`, `SkipReasonService`) — they consume `AI_PROVIDER` via DI and must not need to know which concrete provider is active.
- Provider selection must be driven by an env var (`AI_PROVIDER` = `fake` | `openai`), read via `ConfigService`/Joi validation, not hardcoded conditionals scattered across the codebase — do it once in `ai.module.ts`'s provider factory.
- `fake` must remain the default when `AI_PROVIDER` is unset, so existing tests and any environment without OpenAI credentials keep working unchanged.
- Unit tests must not call the real OpenAI API. Any new test for the OpenAI provider must mock the OpenAI SDK client / HTTP layer.
- No Prisma schema changes.
- No changes to existing CI jobs.
- `.env.example` must document all new variables (`AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT`, `AI_MODEL_DEFAULT`) per backlog acceptance criteria — do not commit a real API key.

## Acceptance Criteria (from docs/07_task_backlog.md — full description, no confirmation required)

- [ ] OpenAI provider implementation exists (`src/ai/providers/openai.provider.ts`), implementing `AiProvider`.
- [ ] Provider is selected via `AI_PROVIDER` env var (`fake` | `openai`).
- [ ] `fake` remains the default for tests; OpenAI is used when env var is set to `openai`.
- [ ] `.env.example` includes `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT` and `AI_MODEL_DEFAULT`.
- [ ] Token usage is extracted from the OpenAI response and mapped into `AiProviderUsage` (so `AiRunsService` can persist it downstream, unchanged).
- [ ] Unit tests continue to use `FakeAiProvider` — no real API calls in tests.

> **Test count baseline note:** run `npm run test` before starting and record the actual current suite/test count (last known figure in `TASK_BOARD.md` is 316/316 tests, 36/36 suites, as of TASK-036B — confirm against the real local run, don't assume it's still accurate).

## Test Requirement

- Unit test: `ai.module.ts` (or a factory function extracted from it) selects `FakeAiProvider` when `AI_PROVIDER` is unset or `fake`.
- Unit test: `ai.module.ts` (or factory) selects the OpenAI provider when `AI_PROVIDER=openai`.
- Unit test: `OpenAiProvider.complete()` correctly maps a mocked OpenAI SDK response into `AiProviderResult` (`text`, `parsedJson` when `jsonMode` is requested, `usage` fields) — OpenAI client must be mocked, no real network call.
- Unit test: existing `FakeAiProvider`/pipeline tests still pass unmodified.
- Record the result in `project-management/TEST_LOG.md`.
- Manual smoke test (documented in `TEST_LOG.md`, not automated): with a real `OPENAI_API_KEY` set locally, provider returns a parseable response for Prompt 1 — do not commit any real key or response transcript containing it.

## Done Definition

A real OpenAI call can be made through the `AiProvider` abstraction using env-configured credentials (`AI_PROVIDER=openai`), while automated tests still run only with `FakeAiProvider` (`AI_PROVIDER` unset/`fake`).

## Scope

**Allowed:**

- New `src/ai/providers/openai.provider.ts` implementing `AiProvider`.
- Updating `src/ai/ai.module.ts` to select provider by `AI_PROVIDER` env var.
- Adding `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER_DEFAULT`, `AI_MODEL_DEFAULT` to `src/config/env.validation.ts`, `.env.example`, and (if a real `.env` exists locally) a local-only `.env` — never commit real secrets.
- Adding the OpenAI SDK as a dependency (`package.json`/`package-lock.json`) if needed to call the API.
- Unit tests listed in Test Requirement.

**Not allowed:**

- Any change to `AiProvider`/`AiProviderOptions`/`AiProviderResult`/`AiProviderUsage` contracts.
- Any change to `FakeAiProvider`, `Prompt1Service`, `Prompt2Service`, `SkipReasonService`, or any other pipeline consumer of `AI_PROVIDER`.
- Any change to Prisma schema.
- Any change to existing CI jobs.
- Implementing TASK-037B/037C-0/037C/037D/038/038A or any task outside TASK-037A.
- Committing real API keys or secrets.

## Claude Code Instructions

Before changing code:

1. Read `CLAUDE.md` and this file fully.
2. Read `docs/07_task_backlog.md` lines 1339–1369 (TASK-037A) as source of truth.
3. Run `npm run build` and `npm run test` — record the actual current baseline (suite/test count) before starting.
4. Study `src/ai/ai-provider.interface.ts` and `src/ai/providers/fake.provider.ts` to understand the contract and existing implementation pattern — do not modify either file.
5. Check whether an OpenAI SDK package is already a dependency; if not, confirm with the user before adding a new npm dependency.
6. Make changes strictly within the Scope above.

After implementation, Claude Code must:

1. Show each Acceptance Criterion as ✅/❌.
2. Show changed/created files.
3. Show the final `OpenAiProvider` implementation and the updated `ai.module.ts` provider selection logic.
4. Show `npm run test` output (suite/test count — compare against the baseline from step 3).
5. Confirm provider selection (fake vs openai) and token-usage mapping are covered by tests.
6. Update `project-management/TEST_LOG.md`.
7. Propose whether TASK-037A can be marked `DONE`.
8. Stop and wait for user confirmation before committing.

## Git Instructions

Claude Code runs at the very start, before any code changes:

```bash
git checkout -b task/TASK-037A-openai-provider
```

Only after explicit "approved" from the user does Claude Code run:

```bash
git add src/ai/providers/openai.provider.ts src/ai/ai.module.ts src/config/env.validation.ts .env.example project-management/TASK_BOARD.md project-management/CURRENT_TASK.md project-management/TEST_LOG.md
git commit -m "feat: TASK-037A real OpenAI provider"
git push -u origin task/TASK-037A-openai-provider
gh pr create --title "feat: TASK-037A Implement real OpenAI provider" --body "Adds OpenAiProvider implementing the existing AiProvider interface. Provider selection via AI_PROVIDER env var (fake default, openai when configured). Token usage mapped to AiProviderUsage. Tests continue to use FakeAiProvider. Closes TASK-037A" --base main
```

Then stop completely. The user does the merge, checkout main and pull.
