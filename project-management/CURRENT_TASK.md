# Current Task

## Task ID

`TASK-PH-007`

> Source: docs/07_task_backlog.md §PH. Phase PH — Production Hardening (Quick Wins). Следующий по порядку после TASK-PH-006 (DONE) согласно TASK_BOARD.md Current Focus (PH-001 → PH-002+PH-003+PH-004 → PH-005 → PH-006 → **PH-007** → PH-008). Зависит от TASK-PH-001 (ConfigService + LOG_LEVEL).

## Title

Add structured logging (nestjs-pino)

## Context

Приложение использует только `console.log()` в `main.ts`. В продакшне plain-text логи неудобны для поиска. Structured JSON логи (timestamp, level, request ID, context) можно отправлять в ELK, DataDog или CloudWatch. `nestjs-pino` — идиоматичное NestJS-решение: оборачивает Pino и инжектирует `Logger`, заменяющий стандартный NestJS logger.

## Docs to Read

- `docs/07_task_backlog.md` §PH — TASK-PH-007 полное определение (эта задача)
- `src/app.module.ts` — куда добавить `LoggerModule`
- `src/main.ts` — текущая конфигурация bootstrap, `console.log()` для замены
- `src/config/env.validation.ts` — как читается `LOG_LEVEL` через `ConfigService`

## Files Likely Affected

```text
package.json
src/app.module.ts
src/main.ts
```

## Key Invariants

- Не реализовывать TASK-PH-008 или любую другую задачу Phase PH в этой сессии — только TASK-PH-007.
- Не трогать `HtmlRendererService`, `PipelineModule`, `src/document-export/`.
- Не трогать Prisma schema.
- Не возобновлять Phase 6 или более поздние задачи.
- Не менять существующую бизнес-логику приложения.
- `npm run test` должен оставаться зелёным — не ломать существующие тесты.

## Acceptance Criteria


- [x] `nestjs-pino` и `pino-http` установлены.
- [x] `LoggerModule.forRootAsync({ ... })` зарегистрирован в `AppModule`, использует `ConfigService` для `LOG_LEVEL` (default `info`).
- [x] `app.useLogger(app.get(Logger))` установлен в `main.ts`.
- [x] NestJS startup logs выводятся как structured JSON в `NODE_ENV=production`.
- [x] В `NODE_ENV=development` включён pretty-print через `pino-pretty`.
- [x] `console.log()` в `main.ts` заменён на структурированный лог.
- [x] `npm run test` проходит без изменения числа тестов.


## Test Requirement

- Ручная проверка: запустить приложение, убедиться в JSON-логах в production mode, pretty-output в dev mode.
- Зафиксировать результат в `project-management/TEST_LOG.md`.

## Done Definition

- Логи приложения структурированы, уровень настраивается через `LOG_LEVEL`, в production — machine-readable JSON.

## Scope

**Allowed:**

- `npm install nestjs-pino pino-http pino-pretty`
- Добавить `LoggerModule` в `AppModule`.
- Обновить `main.ts`: `app.useLogger`, заменить `console.log`.

**Not allowed:**

- Реализация TASK-PH-008 или любой другой PH-задачи.
- Правки Prisma schema, `HtmlRendererService`, `src/document-export/`.
- Изменение бизнес-логики.
- Возобновление Phase 6 задач в этой сессии.

## Claude Code Instructions

Перед изменением кода:

1. Прочитать `CLAUDE.md` и этот файл полностью.
2. Запустить `npm run build` и `npm run test` — зафиксировать базовое состояние.
3. Вносить изменения строго в рамках Scope выше.

После реализации Claude Code:

1. Показать каждый Acceptance Criterion как ✅/❌.
2. Показать изменённые файлы.
3. Показать вывод `npm run test` (число suite/tests).
4. Показать пример JSON-лога (production mode) и pretty-лога (dev mode).
5. Обновить `project-management/TEST_LOG.md`.
6. Предложить, можно ли пометить TASK-PH-007 как DONE.
7. Остановиться и ждать подтверждения пользователя перед коммитом.

## Git Instructions

Claude Code выполняет в самом начале, до изменений кода:

```bash
git checkout -b task/TASK-PH-007-structured-logging
```

Только после явного "approved" от пользователя Claude Code выполняет:

```bash
git add package.json package-lock.json src/app.module.ts src/main.ts project-management/TASK_BOARD.md project-management/CURRENT_TASK.md project-management/TEST_LOG.md
git commit -m "chore: TASK-PH-007 add structured logging (nestjs-pino)"
git push -u origin task/TASK-PH-007-structured-logging
gh pr create --title "chore: TASK-PH-007 structured logging (nestjs-pino)" --body "Adds nestjs-pino structured logging with JSON output in production and pino-pretty in development. Closes TASK-PH-007" --base main
```

Затем полностью остановиться. Пользователь сам делает merge, checkout main и pull.
