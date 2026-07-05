# Current Task

## Task ID

`TASK-PH-006`

> Source: docs/07_task_backlog.md §PH. Phase PH — Production Hardening (Quick Wins). Следующий по порядку после TASK-PH-005 (DONE) согласно TASK_BOARD.md Current Focus (PH-001 → PH-002+PH-003+PH-004 → PH-005 → **PH-006** → PH-007 → PH-008). Зависит от TASK-PH-005 (Dockerfile готов).

## Title

Add GitHub Actions CI pipeline (test + lint + build + typecheck)

## Context

CI-пайплайна нет — каждый PR и push не защищён. Сломанные тесты или TypeScript-ошибки могут попасть в main. Базовый GitHub Actions workflow даёт автоматические quality gates и делает проект портфолио-credible для инженерных позиций. Supersedes TASK-058.

## Docs to Read

- `docs/07_task_backlog.md` §PH — TASK-PH-006 полное определение (эта задача)
- `package.json` — scripts: lint, test, build
- `Dockerfile` — текущая конфигурация (для опционального docker-build step)
- `.env.example` — переменные окружения, которые нужны в CI (DATABASE_URL, STORAGE_ROOT и т.д.)

## Files Likely Affected

```text
.github/workflows/ci.yml    (new)
```

## Key Invariants

- Не реализовывать TASK-PH-007 или любую другую задачу Phase PH в этой сессии — только TASK-PH-006.
- Не трогать `HtmlRendererService`, `PipelineModule`, `src/document-export/`.
- Не трогать Prisma schema.
- Не возобновлять Phase 6 или более поздние задачи.
- Не менять существующую бизнес-логику приложения.
- Секреты не хардкодить в workflow — использовать GitHub Secrets или безопасные дефолты для CI.

## Acceptance Criteria

- [ ] Workflow triggers: `push` to `main` и `pull_request` to `main`.
- [ ] Job 1 — **lint**: `npm ci` + `npm run lint` (без --fix, fail on error).
- [ ] Job 2 — **typecheck**: `npx tsc --noEmit`.
- [ ] Job 3 — **test**: PostgreSQL через `services:` (postgres:16-alpine) + `npx prisma migrate deploy` + `npm run test`.
- [ ] Job 4 — **build**: `npm run build`.
- [ ] Node.js версия: 20.x (через `actions/setup-node`).
- [ ] Зависимости кэшируются через `actions/cache` по `package-lock.json`.
- [ ] Все четыре job должны проходить для зелёного чека.
- [ ] Никаких реальных AI-вызовов в CI (FakeAiProvider уже используется в unit-тестах).

## Test Requirement

- Push feature branch и убедиться, что все четыре CI job проходят в GitHub Actions.
- Зафиксировать URL run в `project-management/TEST_LOG.md`.

## Done Definition

- Каждый push в репозиторий запускает автоматический lint, type-check, unit-тесты и build.

## Scope

**Allowed:**

- Создать `.github/workflows/ci.yml`.

**Not allowed:**

- Реализация TASK-PH-007 или любой другой PH-задачи.
- Настройка деплоя или CD.
- Рефакторинг несвязанной логики модулей.
- Правки Prisma schema, `HtmlRendererService`, `src/document-export/`.
- Возобновление Phase 6 задач в этой сессии.

## Claude Code Instructions

Перед изменением кода:

1. Прочитать `CLAUDE.md` и этот файл полностью.
2. Запустить `npm run build` и `npm run test` — зафиксировать базовое состояние.
3. Вносить изменения строго в рамках Scope выше.

После реализации Claude Code:

1. Показать каждый Acceptance Criterion как ✅/❌.
2. Показать изменённые/созданные файлы.
3. Показать URL GitHub Actions run с результатами всех четырёх job.
4. Обновить `project-management/TEST_LOG.md`.
5. Предложить, можно ли пометить TASK-PH-006 как DONE.
6. Остановиться и ждать подтверждения пользователя перед коммитом.

## Git Instructions

Claude Code выполняет в самом начале, до изменений кода:

```bash
git checkout -b task/TASK-PH-006-github-actions-ci
```

Только после явного "approved" от пользователя Claude Code выполняет:

```bash
git add .
git commit -m "chore: TASK-PH-006 add GitHub Actions CI pipeline"
git push -u origin task/TASK-PH-006-github-actions-ci
gh pr create --title "chore: TASK-PH-006 GitHub Actions CI pipeline" --body "Adds GitHub Actions CI with lint, typecheck, test (with PostgreSQL service) and build jobs. Closes TASK-PH-006" --base main
```

Затем полностью остановиться. Пользователь сам делает merge, checkout main и pull.
