# Current Task

## Task ID

`TASK-PH-003`

> Source: docs/07_task_backlog.md §PH. Phase PH — Production Hardening (Quick Wins). Runs after TASK-PH-002 (DONE), в параллельном треке с PH-004 согласно TASK_BOARD.md Current Focus.

## Title

Add rate limiting (@nestjs/throttler)

## Context

Без rate limiting любой эндпоинт открыт для brute-force и DoS. `@nestjs/throttler` добавляет глобальный sliding-window guard за счёт минимальной конфигурации. По умолчанию: 100 запросов в минуту. Зависит от PH-001 (done) для значений `THROTTLE_TTL`/`THROTTLE_LIMIT` через `ConfigService`.

## Docs to Read

- `docs/07_task_backlog.md` §PH — TASK-PH-003 полное определение (эта задача)
- `src/app.module.ts` — текущая конфигурация модулей

## Files Likely Affected

```text
package.json
src/app.module.ts
```

## Key Invariants

- Не реализовывать PH-004, PH-005 или любую другую задачу Phase PH в этой сессии — только TASK-PH-003.
- Не трогать `HtmlRendererService`, `PipelineModule`, `src/document-export/`.
- Не трогать Prisma schema.
- Не возобновлять Phase 6 или более поздние задачи.
- Не добавлять функциональность сверх настройки throttler.

## Acceptance Criteria

- [ ] `@nestjs/throttler` установлен.
- [ ] `ThrottlerModule.forRootAsync({ ... })` зарегистрирован в `AppModule` через `ConfigService` для `THROTTLE_TTL` (default 60) и `THROTTLE_LIMIT` (default 100).
- [ ] `APP_GUARD` установлен глобально на `ThrottlerGuard`.
- [ ] При превышении лимита возвращается 429.
- [ ] Существующие тесты не сломаны.

## Test Requirement

- Unit- или e2e-тест, который отправляет запросы сверх лимита и ожидает 429.
- Зафиксировать результат в `project-management/TEST_LOG.md`.

## Done Definition

Все эндпоинты защищены от request flooding.

## Scope

**Allowed:**

- Установить `@nestjs/throttler`.
- Настроить `ThrottlerModule` и глобальный `APP_GUARD` в `src/app.module.ts` через `ConfigService`.

**Not allowed:**

- Реализация TASK-PH-004 или любой другой PH-задачи.
- Рефакторинг несвязанной логики модулей.
- Правки Prisma schema, `HtmlRendererService`, `src/document-export/`.
- Возобновление Phase 6 задач в этой сессии.

## Claude Code Instructions

Перед изменением кода:

1. Прочитать `CLAUDE.md` и этот файл полностью.
2. Запустить `npm run test` — зафиксировать базовое число тестов.
3. Вносить изменения строго в рамках Scope выше.

После реализации Claude Code:

1. Показать каждый Acceptance Criterion как ✅/❌.
2. Показать изменённые/созданные файлы.
3. Показать результаты тестов (до/после) и проверку 429.
4. Обновить `project-management/TEST_LOG.md`.
5. Предложить, можно ли пометить TASK-PH-003 как DONE.
6. Остановиться и ждать подтверждения пользователя перед коммитом.

## Git Instructions

Claude Code выполняет в самом начале, до изменений кода:

```bash
git checkout -b task/TASK-PH-003-rate-limiting
```

Только после явного "approved" от пользователя Claude Code выполняет:

```bash
git add .
git commit -m "chore: TASK-PH-003 add rate limiting"
git push -u origin task/TASK-PH-003-rate-limiting
gh pr create --title "chore: TASK-PH-003 rate limiting" --body "Adds @nestjs/throttler. Closes TASK-PH-003" --base main
```

Затем полностью остановиться. Пользователь сам делает merge, checkout main и pull.
