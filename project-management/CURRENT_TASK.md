# Current Task

## Task ID

`TASK-PH-007A`

> Source: TASK_BOARD.md, строка TASK-PH-007A (задача НЕ имеет полного описания в docs/07_task_backlog.md — только сводная строка в TASK_BOARD). Следующая по порядку после TASK-PH-007 (DONE) согласно Current Focus: PH-001 → PH-002+003+004 → PH-005 → PH-006 → PH-007 → **PH-007A** → PH-008. Зависит от TASK-PH-005 (production Dockerfile) и TASK-PH-006 (GitHub Actions CI).

> ⚠️ ВНИМАНИЕ: полного акцептанс-описания этой задачи в 07_task_backlog.md нет. Ниже — предположения, реконструированные из контекста PH-005/PH-006. Перед запуском Claude Code рекомендуется подтвердить или скорректировать Acceptance Criteria вручную.

## Title

Add Docker build validation to CI

## Context

TASK-PH-005 добавил production Dockerfile (multi-stage, non-root user). TASK-PH-006 добавил CI pipeline (lint + typecheck + test + build), но CI пока не проверяет, что Docker-образ действительно собирается и работает. Без этого шага поломка Dockerfile или ошибка при старте контейнера (например, недостающая переменная окружения, непройденные миграции) обнаружится только вручную или в проде.

Цель — добавить в CI job, который:

1. Собирает Docker-образ.
2. Поднимает контейнер (+ PostgreSQL, как в docker-compose) и делает быструю проверку работоспособности:
   - контейнер стартует и не падает;
   - приложение отвечает на `/health` (или аналогичный endpoint);
   - БД доступна из контейнера;
   - миграции Prisma применены полностью (например, `prisma migrate status` без pending-миграций).

Проверка должна быть быстрой (секунды, не минуты) — не полноценный e2e-прогон, а smoke-check, что контейнер реально пригоден к запуску.

## Docs to Read

- `docs/07_task_backlog.md` §PH — проверить, нет ли отдельного описания TASK-PH-007A (могло быть добавлено позже)
- `.github/workflows/*.yml` — существующий CI pipeline из TASK-PH-006
- `Dockerfile` — production Dockerfile из TASK-PH-005
- `docker-compose.yml` — сервисы и переменные окружения, нужные для сборки

## Files Likely Affected

```text
.github/workflows/ci.yml (или отдельный workflow-файл)
docker-compose.yml (возможно, отдельный docker-compose.ci.yml для тестового окружения)
.env.example / .env.ci (тестовые переменные для CI, без реальных секретов)
```

## Key Invariants

- Не реализовывать TASK-PH-008 или любую другую задачу Phase PH в этой сессии — только TASK-PH-007A.
- Не трогать `HtmlRendererService`, `PipelineModule`, `src/document-export/`.
- Не трогать Prisma schema.
- Не возобновлять Phase 6 или более поздние задачи.
- Не менять существующую бизнес-логику приложения.
- Не менять существующие CI jobs (lint/typecheck/test/build) из TASK-PH-006 — только добавить новый шаг/job.
- Docker build в CI не должен публиковать образ в registry (это не входит в задачу, если явно не указано иное).

## Acceptance Criteria (предварительно, требует подтверждения)

- [x] В CI добавлен job/step, который выполняет `docker build` по production Dockerfile.
- [x] Job запускается на каждый push и pull request (как и существующие jobs).
- [x] Сборка образа завершается ошибкой CI при поломке Dockerfile.
- [x] В том же job поднимается контейнер приложения + PostgreSQL (postgres service + docker run --network host).
- [x] CI ждёт готовности приложения (health-check с коротким таймаутом, не больше ~30–60 сек) и проверяет, что `/health` отвечает успешно.
- [x] CI проверяет, что миграции Prisma применены полностью — через `npx prisma migrate status`, без pending-миграций.
- [x] После проверки контейнер останавливается и удаляется (docker stop/rm, if: always()).
- [x] Весь smoke-check укладывается в разумное время (ориентир — не больше 1–2 минут сверх времени сборки образа).
- [x] Существующие jobs (lint, typecheck, test, build) не затронуты и продолжают проходить.
- [x] Образ не публикуется в registry.

## Test Requirement

- Ручная проверка: убедиться, что новый CI job появляется в GitHub Actions и успешно проходит на тестовом push/PR.
- Убедиться, что job действительно падает, если сознательно сломать миграцию или health endpoint (опционально, если позволяет время — иначе описать вручную, как это будет обнаружено).
- Зафиксировать результат и время выполнения job в `project-management/TEST_LOG.md`.

## Done Definition

- CI автоматически проверяет на каждый push/PR, что:
  - production Docker-образ собирается без ошибок;
  - контейнер стартует и отвечает на health-check;
  - БД доступна и все Prisma-миграции применены полностью.
- Проверка быстрая (smoke-check), не дублирует полноценные e2e/интеграционные тесты.

## Scope

**Allowed:**

- Добавить новый job или step в существующий `.github/workflows/*.yml` из TASK-PH-006.
- Использовать `docker build` (или `docker buildx build`) с указанием на существующий Dockerfile.

**Not allowed:**

- Публикация образа в Docker Hub / GHCR / любой registry (без отдельного подтверждения пользователя).
- Реализация TASK-PH-008 или любой другой PH-задачи.
- Правки Prisma schema, `HtmlRendererService`, `src/document-export/`.
- Изменение бизнес-логики.
- Возобновление Phase 6 задач в этой сессии.

## Claude Code Instructions

Перед изменением кода:

1. Прочитать `CLAUDE.md` и этот файл полностью.
2. Проверить `docs/07_task_backlog.md`, нет ли там актуального полного описания TASK-PH-007A — если есть, использовать его как источник истины вместо предположений выше.
3. Запустить `npm run build` и `npm run test` — зафиксировать базовое состояние.
4. Вносить изменения строго в рамках Scope выше.

После реализации Claude Code:

1. Показать каждый Acceptance Criterion как ✅/❌.
2. Показать изменённые файлы.
3. Показать итоговый workflow YAML (новый job/step).
4. Показать вывод `npm run test` (число suite/tests — не должно измениться).
5. Обновить `project-management/TEST_LOG.md`.
6. Предложить, можно ли пометить TASK-PH-007A как DONE.
7. Остановиться и ждать подтверждения пользователя перед коммитом.

## Git Instructions

Claude Code выполняет в самом начале, до изменений кода:

```bash
git checkout -b task/TASK-PH-007A-docker-build-validation-ci
```

Только после явного "approved" от пользователя Claude Code выполняет:

```bash
git add .github/workflows/ project-management/TASK_BOARD.md project-management/CURRENT_TASK.md project-management/TEST_LOG.md
git commit -m "chore: TASK-PH-007A add Docker build validation to CI"
git push -u origin task/TASK-PH-007A-docker-build-validation-ci
gh pr create --title "chore: TASK-PH-007A Docker build validation in CI" --body "Adds a CI job that validates the production Docker image builds successfully on every push/PR. Closes TASK-PH-007A" --base main
```

Затем полностью остановиться. Пользователь сам делает merge, checkout main и pull.
