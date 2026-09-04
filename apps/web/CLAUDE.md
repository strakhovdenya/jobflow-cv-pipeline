# CLAUDE.md — apps/web

This file governs `apps/web` specifically. Read it together with the repository root
`d:\projects_js\jobflow-cv-pipeline\CLAUDE.md` (Repository Layout, ADR-023/ADR-024 monorepo/Docker
history, task/branch/commit protocol) — the root file is authoritative for cross-cutting rules and
product scope; this file adds `apps/web`-specific detail only.

## Назначение проекта

`apps/web` is the Next.js dashboard for the JobFlow CV Pipeline monorepo — Phase 13 per root
`CLAUDE.md`, secondary to the `apps/api` backend, not required for the backend MVP. It is a thin
client over `apps/api`'s HTTP surface: workspace list/detail views, the pipeline review UI
(analysis review, CV draft review, pre-PDF check, final check, cover letter, export, application
tracking) and the import-preview flow. It holds no business logic of its own beyond view-model
shaping (`src/lib/pipeline-view-model.ts`) — the pipeline state machine and gates live in
`apps/api`.

## Технологический стек

Confirmed from `apps/web/package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`:

- **Framework**: Next.js 16 (App Router, `src/app/`), React 19
- **Styling**: Tailwind CSS 4 (`@tailwindcss/postcss`), dark-mode variants used throughout
  (`dark:` classes)
- **Language**: TypeScript 5, `strict: true`, path alias `@/*` → `src/*`
- **Build output**: `output: "standalone"` (`next.config.ts`) — minimal runtime bundle, used by the
  Dockerized build (ADR-024)
- **Testing**: Vitest 4 + `@testing-library/react`/`@testing-library/user-event`, `jsdom`
  environment, setup file `vitest-setup.ts`
- **Lint**: ESLint 9 flat config (`eslint.config.mjs`) via `eslint-config-next` (`core-web-vitals` +
  `typescript` presets)
- **No state-management or data-fetching library** — data comes from directly `fetch`-ing
  `apps/api` in `src/lib/api.ts` and passing results into Server Components; no SWR/React Query/
  Redux present in `package.json`.

## Структура проекта

- `src/app/` — Next.js App Router routes. `page.tsx`/`layout.tsx` are async Server Components that
  call `src/lib/api.ts` functions directly (see `app/page.tsx`'s `getHealth()` and
  `app/workspaces/page.tsx`'s `listWorkspaces()`) — no client-side fetch-on-mount for initial data.
  `app/import/` holds the import-preview flow (`actions.ts`, `import-preview.tsx`, `page.tsx`).
  `app/workspaces/[id]/page.tsx` (per root `CLAUDE.md`) assembles the
  redesigned workspace detail view from the panels below.
- `src/components/` — presentational/interactive pieces, most with a colocated `*.spec.tsx`:
  `workspace-list.tsx`, `workspace-form.tsx`, `workspace-status-header.tsx`, `pipeline-stages.tsx`,
  `main-action-card.tsx`, `actions-panel.tsx`, `artifact-list.tsx`/`artifact-card.tsx`,
  `checks-panel.tsx`, `cover-letter-panel.tsx`, `tracking-panel.tsx`, `upcoming-steps-panel.tsx`.
  Only 2 files repo-wide currently declare `"use client"` — most components are still Server
  Components or plain functions; check a component's existing directive before assuming it needs
  one.
- `src/lib/api.ts` — the sole HTTP boundary to `apps/api`; typed request/response interfaces
  (`CreateWorkspaceInput`, `WorkspaceCreationResult`, `HealthStatus`, etc.) live alongside their
  fetch functions here. `API_BASE_URL` reads `NEXT_PUBLIC_API_BASE_URL`, defaulting to
  `http://localhost:3000`.
- `src/lib/pipeline-view-model.ts` — pure view-model functions (`buildMainActionCard`,
  `buildStatusHeaderData`, `buildStages`, `displayDecision`, etc.) that translate raw workspace/API
  state into what the panels render — this is where ADR-026/027/028/029's UI-facing gate/badge/
  button logic lives. Heavily covered by `pipeline-view-model.spec.ts`; treat this file as the
  canonical source of "what does this status/decision look like in the UI."
- `src/lib/types.ts` — shared TypeScript types for workspace/pipeline data shapes.
- `src/lib/slug.ts` — a frontend-side slug helper (distinct from, but must stay display-compatible
  with, `apps/api`'s `SlugService`).
- `src/lib/artifact-download.ts` — artifact download helper used by `artifact-card.tsx`.
- `public/` — static assets.
- `vitest.config.ts` / `vitest-setup.ts` — test runner config; coverage thresholds here are a
  measured regression floor (ADR-022's method applied to `apps/web`), not a target — see the
  in-file comment for the exact baseline and reasoning before changing them.

## Команды

All commands below run from `apps/web/` (confirmed in `package.json`). There is no root-level
orchestrator (no turbo/nx/npm workspaces) — every command must `cd apps/web` first.

```bash
cd apps/web

npm install               # install deps
npm run dev                # next dev
npm run build               # next build (standalone output)
npm run start               # next start (serves the build)
npm run lint                 # eslint (flat config)
npx tsc --noEmit             # type check (no dedicated script; run directly)
npm run test                  # vitest run (single pass)
npm run test:watch            # vitest watch mode
npm run test:cov              # vitest run --coverage
```

From the repo root, the containerized build/run path is `docker compose up -d web` (depends on
`app`; see root `CLAUDE.md` and ADR-024 for the `NEXT_PUBLIC_API_BASE_URL` build-arg/`HOSTNAME`
details — both are build-time/container concerns, not something to change from within `apps/web`
source itself).

## Архитектурные правила

- **`src/lib/api.ts` is the only sanctioned place that calls `apps/api`.** Components/pages must go
  through its exported functions, not `fetch` the backend directly — keeps the HTTP contract typed
  and centrally discoverable, and matches `server-serialization`/`server-dedup-props` guidance from
  the `vercel-react-best-practices` skill (minimize what crosses the server/client boundary, don't
  duplicate fetch logic per call site).
- **Prefer Server Components for initial data loading** (existing pattern: `page.tsx` files are
  `async function` Server Components awaiting `lib/api.ts` calls directly) — do not convert a page
  to a client component with fetch-on-mount just to add interactivity; keep data-fetching in the
  server parent and pass data down, promoting only the interactive leaf to `"use client"` (matches
  `async-parallel`/`server-parallel-fetching` and the existing 2-client-component footprint).
  Re-verify the current server/client split for a file before assuming it — the exact 2 files with
  `"use client"` will change over time.
- **`pipeline-view-model.ts` is the single translation layer** between raw API/workspace state and
  what any component renders (badges, button labels, stage lists). New status/decision-dependent
  display logic belongs here, not duplicated inline in a component — this is what kept ADR-026/027
  /028/029's several UI-facing changes centralized and testable.
- **No new data-fetching library** (SWR/React Query/etc.) without an explicit task decision — the
  codebase currently has zero client-side cache/dedup dependency; introducing one is an
  architectural change, not a drive-by addition.
- **Tailwind utility classes, not a separate CSS-in-JS system** — `globals.css` + inline `className`
  strings is the established styling approach; keep new components consistent with it, including
  the existing `dark:` variant convention.

## Правила внесения изменений

- **New code location**: new routes under `src/app/<route>/page.tsx` (+ colocated `actions.ts` if
  it needs server actions, following `app/import/actions.ts`'s pattern); new reusable UI pieces
  under `src/components/`; new pure logic/helpers under `src/lib/`.
- **Types**: shared shapes go in `src/lib/types.ts`; request/response-specific types can live next
  to their function in `src/lib/api.ts` (existing pattern) if not reused elsewhere.
- **Validation**: this app does not currently perform its own input validation beyond what forms
  need for UX — `apps/api` is the validation authority (`class-validator` DTOs); do not duplicate
  backend validation rules here beyond basic required-field UX checks already present in
  `workspace-form.tsx`.
- **Error handling**: existing pattern is a `try { … } catch { … }` around a `lib/api.ts` call with
  a fallback UI state (see `app/page.tsx`'s `backendStatus = "unreachable"` fallback) — follow this
  rather than letting a fetch failure crash the Server Component render.
- **Files not to touch without necessity**: `next.config.ts` (build-time behavior shared with the
  Dockerized deploy, ADR-024), `eslint.config.mjs`, `tsconfig.json`, `vitest.config.ts`'s coverage
  `thresholds` (a measured floor — only raise it deliberately after adding coverage, per the
  in-file comment; don't lower it to make a change pass).
- **Mandatory checks after any change**: `npx tsc --noEmit`, `npm run lint`, `npm run test` — matches
  the PostToolUse hooks already wired in the repo root's `.claude/settings.json`.

## Тестирование

- **Location & convention**: colocated `*.spec.tsx`/`*.spec.ts` next to the file under test (e.g.
  `pipeline-view-model.ts` → `pipeline-view-model.spec.ts`, `workspace-list.tsx` →
  `workspace-list.spec.tsx`) — same one-file-one-spec convention as `apps/api` (ADR-020), applied
  here too even though it was formalized for the backend.
- **Tooling**: Vitest + `@testing-library/react`/`user-event`, `jsdom` environment.
- **Coverage floor**: `vitest.config.ts`'s `thresholds` are a measured regression floor (currently
  low — most of `api.ts`, review-gate components, and pages have no tests yet, per the in-file
  comment) that is expected to rise as future tasks add coverage; do not treat the current low
  number as a target to stay at.
- **Minimum bar for a change to be considered tested**: `npm run test` full suite green,
  `tsc --noEmit`/`lint` clean. For a UI/behavior change, also manually verify in a running
  `npm run dev` session against a real `apps/api` backend where feasible (per root `CLAUDE.md`'s
  general UI-testing guidance) — type checks and unit tests verify correctness of logic, not that
  the feature actually works end-to-end in the browser.
- **Обязательная визуальная проверка UI-изменений**: любое изменение, затрагивающее визуальное
  представление или поведение интерфейса (новый компонент, новый экран, изменение стилей,
  layout, интерактивности, состояний загрузки/ошибок), считается завершённым только после того,
  как оно реально проверено визуально через Playwright MCP (`mcp__playwright__*`) в запущенной
  `npm run dev` сессии против реального `apps/api` backend — недостаточно того, что
  `npm run test`/`tsc --noEmit`/`lint` проходят зелёными, эти проверки верифицируют логику, а не
  то, что фича реально работает и выглядит корректно в браузере. Обязательный минимум проверки:
  - Открыть затронутый экран/компонент через `browser_navigate`, сделать снапшот/скриншот
    (`browser_snapshot` / `browser_take_screenshot`) состояния до и после изменения.
  - Пройти golden path сценарий использования новой функциональности кликами/вводом
    (`browser_click`, `browser_type`, `browser_fill_form` и т.д.), а не только загрузку страницы.
  - Проверить видимые edge-cases, если они есть в рамках задачи (пустое состояние, состояние
    ошибки, disabled-кнопки, длинные значения) — не только happy path.
  - Проверить консоль браузера на ошибки/варнинги (`browser_console_messages`) после прохождения
    сценария.
  - Если Playwright MCP объективно недоступен или сценарий требует реального OS-уровня
    (например, системный file picker, drag-and-drop за пределы страницы, реальная печать/экспорт
    PDF, кроссбраузерная проверка) — вместо него выполняется ручная проверка в обычном браузере,
    и это явно проговаривается в ответе как исключение, а не молчаливая замена по умолчанию.
- **Обязательная проверка по скиллу `ui-ux-pro-max`**: перед тем как считать UI-задачу
  завершённой, применить `ui-ux-pro-max` к изменённому экрану/компоненту — проверить соответствие
  выбранным гайдлайнам (типографика, отступы, состояния интерактивных элементов, доступность,
  консистентность с уже использующимися паттернами репозитория — `ArtifactCard`, `MainActionCard`,
  badge/pill-примитивы и т.д.) и зафиксировать (в ответе пользователю), какие рекомендации скилла
  были применены или почему часть из них не применима к этой задаче.
- Оба пункта выше — часть "Minimum bar for a change to be considered tested" наравне с зелёными
  `test`/`tsc`/`lint`; задача с UI-изменением не может быть закрыта (Task Closure Checklist в
  корневом `CLAUDE.md`), пока эта визуальная проверка не выполнена и не описана явно (что именно
  проверено, что показал снапшот/скриншот).

## Интеграции и зависимости

- **`apps/api`**: the only backend this app talks to, over plain HTTP via `fetch` in
  `src/lib/api.ts`. Base URL comes from `NEXT_PUBLIC_API_BASE_URL` — inlined at Next.js build time,
  not overridable via a runtime container env var (ADR-024); defaults to `http://localhost:3000`
  for local `npm run dev` against a locally-running `apps/api`.
  API-key auth (`apps/api`'s global `ApiKeyGuard`) — check `src/lib/api.ts`'s current fetch calls
  for how/whether an API key header is attached before assuming a new call site needs one.
- **No direct database, queue, or filesystem access** — this app has no Prisma, no queue client, no
  server-side filesystem writes of its own; all persistence and pipeline state lives behind
  `apps/api`.
- **Docker**: `apps/web`'s own `Dockerfile` (3-stage, `output: "standalone"`) and its
  `docker-compose.yml` `web` service are described in ADR-024 — this app's source code does not
  need to account for container specifics beyond the `NEXT_PUBLIC_API_BASE_URL` build-time env var
  already wired into `next.config.ts`'s build.

## Инструкции для Claude

- Read this file **and** the repository-root `CLAUDE.md` (plus the active GitHub Issue for this
  task, and `project-management/DECISIONS.md` for the ADR-026–029 UI history) before making any
  change here — the root file is authoritative for task/branch/commit protocol (ADR-030: GitHub
  Issues, not `CURRENT_TASK.md`) and product scope.
- Before editing, read the relevant existing component/page and its `*.spec.tsx`, and check
  `src/lib/pipeline-view-model.ts` if the change touches any status/decision-dependent display —
  do not re-derive that logic inline in a component.
- Reuse existing components (`ArtifactCard`, `MainActionCard`, badge/pill primitives, etc.) and
  `src/lib/api.ts` functions rather than writing a new fetch call or duplicating a UI pattern.
- Do not introduce a new abstraction (data-fetching library, state manager, component-splitting
  layer) unless the task explicitly calls for it — this app is intentionally minimal-dependency.
- Do not change `src/lib/api.ts`'s exported function signatures or `src/lib/types.ts` shapes
  without confirming the corresponding `apps/api` contract still matches — these two apps are
  independently deployed but must stay contract-compatible.
- After any change: run `npx tsc --noEmit`, `npm run lint`, `npm run test` before considering the
  change complete; for UI-visible changes, verify in a running `npm run dev` session against a real
  backend where feasible, and say explicitly if that manual verification wasn't done.
- If information needed to implement something safely is missing from this file, the root
  `CLAUDE.md`, or the active GitHub Issue's `## Docs to Read`, stop and ask — do not invent
  components, API contracts, or status-display rules (root `CLAUDE.md`'s Insufficient Context
  Rule).
- Apply the `vercel-react-best-practices` skill's rules (Server Component data loading, avoiding
  waterfalls, re-render/bundle-size discipline) when writing or reviewing code here.
- Apply the `tailwind-4-docs` skill whenever writing or reviewing Tailwind utility classes,
  choosing variants, or touching `globals.css`/`postcss.config.mjs`/`@theme` tokens — this app is
  on Tailwind CSS v4 specifically (`@import "tailwindcss"` + `@theme inline`, not a `tailwind.config.js`-based v3 setup), and v3-era patterns/utilities do not always carry over.
- Flag any unverified assumption explicitly rather than presenting it as confirmed fact.
- **When a change alters this app's architecture** (new route/page, new component boundary, a
  changed data-fetching pattern, a new dependency on `apps/api`'s contract), update this file's
  "Структура проекта"/"Архитектурные правила" sections in the same change — do not leave them
  describing a superseded structure. Also check whether the root `CLAUDE.md`'s
  `## High-Level Architecture` (Data Flow, Workspace Status Sequence) or
  `project-management/DECISIONS.md` need updating too (root `CLAUDE.md`'s Documentation Rules).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Ограничение чтения документации Next.js

Read only the documentation directly relevant to the current task; do not scan the entire node_modules/next/dist/docs/ tree.

Start with the narrowest applicable guide and open additional documents only when the current guide explicitly points to them or required information is still missing.

Reuse documentation already read during the current session instead of reopening the same files.

Briefly state which Next.js documentation files were consulted when reporting completed work.
