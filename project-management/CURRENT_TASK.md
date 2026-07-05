# Current Task

## Task ID

`TASK-PH-004`

> Source: docs/07_task_backlog.md §PH. Phase PH — Production Hardening (Quick Wins). Параллельный трек с TASK-PH-003 (DONE) согласно TASK_BOARD.md Current Focus. Зависимостей нет.

## Title

Add husky + lint-staged pre-commit hooks

## Context

ESLint и Prettier настроены в проекте, но не применяются принудительно перед коммитом. Разработчик (или Claude Code) может закоммитить код, не проходящий линтинг. `husky` + `lint-staged` запускают lint-fix только на застейдженных файлах (быстро) и опционально type-check. Это предотвращает ситуацию, когда CI-пайплайн (PH-006) становится первым и единственным гейтом качества.

## Docs to Read

- `docs/07_task_backlog.md` §PH — TASK-PH-004 полное определение (эта задача)
- `package.json` — текущие devDependencies, scripts, ESLint/Prettier конфигурация

## Files Likely Affected

```text
package.json
.husky/pre-commit    (new)
.lintstagedrc.json   (new, или inline в package.json)
```

## Key Invariants

- Не реализовывать TASK-PH-005, TASK-PH-006 или любую другую задачу Phase PH в этой сессии — только TASK-PH-004.
- Не трогать `HtmlRendererService`, `PipelineModule`, `src/document-export/`.
- Не трогать Prisma schema.
- Не возобновлять Phase 6 или более поздние задачи.
- Не добавлять функциональность сверх настройки husky + lint-staged (например, не настраивать CI — это PH-006).
- Не менять существующую конфигурацию ESLint/Prettier по содержанию правил.

## Acceptance Criteria

- [x] `husky` и `lint-staged` установлены как devDependencies.
- [x] `prepare` script в `package.json` запускает `husky install`.
- [x] Pre-commit хук (`.husky/pre-commit`) запускает `lint-staged` на застейдженных `.ts` файлах: `eslint --fix` + `prettier --write`.
- [x] Коммит файла с явной ошибкой линтинга прерывается с понятным сообщением об ошибке.
- [x] `npm run test` проходит после настройки (существующие тесты не сломаны).

## Test Requirement

- Ручной тест: застейджить файл с явной ошибкой линтинга (например, неиспользуемая переменная или синтаксис, нарушающий правило), выполнить `git commit`, убедиться, что коммит прерван.
- Зафиксировать результат в `project-management/TEST_LOG.md`.

## Done Definition

Ошибки линтинга перехватываются до попадания в историю репозитория.

## Scope

**Allowed:**

- Установить `husky` и `lint-staged`.
- Настроить `prepare` script и `.husky/pre-commit`.
- Настроить `lint-staged` конфигурацию (inline в `package.json` или `.lintstagedrc.json`).

**Not allowed:**

- Реализация TASK-PH-005, TASK-PH-006 или любой другой PH-задачи.
- Настройка GitHub Actions / CI (это TASK-PH-006).
- Рефакторинг несвязанной логики модулей.
- Правки Prisma schema, `HtmlRendererService`, `src/document-export/`.
- Возобновление Phase 6 задач в этой сессии.
- Изменение содержательных правил ESLint/Prettier.

## Claude Code Instructions

Перед изменением кода:

1. Прочитать `CLAUDE.md` и этот файл полностью.
2. Запустить `npm run test` — зафиксировать базовое число тестов.
3. Вносить изменения строго в рамках Scope выше.

После реализации Claude Code:

1. Показать каждый Acceptance Criterion как ✅/❌.
2. Показать изменённые/созданные файлы.
3. Показать результаты тестов (до/после) и ручную проверку прерывания коммита.
4. Обновить `project-management/TEST_LOG.md`.
5. Предложить, можно ли пометить TASK-PH-004 как DONE.
6. Остановиться и ждать подтверждения пользователя перед коммитом.

## Git Instructions

Claude Code выполняет в самом начале, до изменений кода:

```bash
git checkout -b task/TASK-PH-004-husky-lint-staged
```

Только после явного "approved" от пользователя Claude Code выполняет:

```bash
git add .
git commit -m "chore: TASK-PH-004 add husky + lint-staged pre-commit hooks"
git push -u origin task/TASK-PH-004-husky-lint-staged
gh pr create --title "chore: TASK-PH-004 husky + lint-staged" --body "Adds husky + lint-staged pre-commit hooks. Closes TASK-PH-004" --base main
```

Затем полностью остановиться. Пользователь сам делает merge, checkout main и pull.
