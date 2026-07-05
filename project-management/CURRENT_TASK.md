# Current Task

## Task ID

`TASK-PH-008`

> Source: TASK_BOARD.md, строка TASK-PH-008 (Current Focus). Полное описание есть в docs/07_task_backlog.md, раздел 17.1 — реконструкция не требуется. Последняя задача Phase PH согласно рекомендованному порядку: PH-001 → (PH-002 + PH-003 + PH-004) → PH-005 → PH-006 → PH-007 → PH-008. TASK-PH-007A выполнена (DONE), но не входила в изначальный рекомендованный порядок — это была ad hoc вставка. Зависимостей нет.

## Title

Add Swagger/OpenAPI documentation (@nestjs/swagger)

## Context

API не имеет документации. Операционные команды, потенциальные потребители API и рецензенты не могут разобраться в API без чтения исходного кода. `@nestjs/swagger` генерирует интерактивную OpenAPI-документацию из уже существующих декораторов NestJS с минимальной дополнительной разметкой.

## Docs to Read

- `docs/07_task_backlog.md` §17.1 TASK-PH-008 — полное описание (источник истины)
- `src/main.ts` — точка входа приложения, куда добавляется SwaggerModule
- `src/workspaces/workspaces.controller.ts` и `src/workspaces/dto/*.ts` — основные endpoints/DTO для документирования
- `src/app.controller.ts`

## Files Likely Affected

```text
package.json
src/main.ts
src/workspaces/workspaces.controller.ts
src/workspaces/dto/*.ts
src/artifacts/artifacts.controller.ts (если существует)
src/app.controller.ts
```

## Key Invariants

- Не реализовывать TASK-039 и другие задачи Phase 7 в этой сессии — только TASK-PH-008.
- Не трогать `HtmlRendererService`, `PipelineModule`, `src/document-export/`.
- Не трогать Prisma schema.
- Не возобновлять Phase 6 задачи в этой сессии.
- Не менять существующую бизнес-логику приложения.
- Не менять поведение существующих endpoints — только добавлять декораторы документации (`@ApiOperation`, `@ApiProperty` и т.п.).
- Не менять существующие CI jobs.

## Acceptance Criteria (из docs/07_task_backlog.md — полное описание, подтверждения не требует)

- [x] `@nestjs/swagger` и `swagger-ui-express` установлены.
- [x] В `main.ts` настроены `SwaggerModule.createDocument()` + `SwaggerModule.setup('api', app, document)`.
- [x] `DocumentBuilder` задаёт: title `JobFlow CV Pipeline`, version `0.1.0`, описание (одна строка), `BearerAuth` placeholder.
- [x] Все endpoints контроллеров задокументированы `@ApiOperation({ summary: '...' })`.
- [x] Все DTO задокументированы `@ApiProperty()` на каждом поле.
- [x] `GET /api` открывает Swagger UI в браузере.
- [x] `GET /api-json` возвращает сырой OpenAPI JSON.
- [x] `npm run test` проходит; `npx tsc --noEmit` проходит.
- [x] Swagger отключён при `NODE_ENV=production` (Вариант A выбран пользователем — реализовано и проверено вручную).

## Открытый вопрос перед запуском — РЕШЕНО

Выбран **Вариант A** (по запросу пользователя — "согласно best практикам"): Swagger UI не монтируется, если `NODE_ENV=production`. Реализовано в `src/main.ts` и проверено вручную (`GET /api` и `GET /api-json` → 404 при `NODE_ENV=production`, `GET /health` по-прежнему 200).

## Test Requirement

- Ручная проверка в браузере: открыть `http://localhost:3000/api`, убедиться что все endpoints видны, выполнить один тестовый запрос через UI.
- Проверить `GET /api-json` — валидный JSON.
- Зафиксировать результат в `project-management/TEST_LOG.md`.

## Done Definition

- API самодокументируется и доступен для интерактивного изучения через браузер.

## Scope

**Allowed:**

- Установка `@nestjs/swagger`, `swagger-ui-express`.
- Добавление `SwaggerModule` конфигурации в `main.ts`.
- Добавление декораторов `@ApiOperation`, `@ApiProperty`, `@ApiTags` и т.п. к существующим контроллерам и DTO.

**Not allowed:**

- Реализация TASK-039 или любой другой задачи Phase 7.
- Правки Prisma schema, `HtmlRendererService`, `src/document-export/`.
- Изменение бизнес-логики или сигнатур существующих endpoints.
- Возобновление Phase 6 задач в этой сессии.
- Изменение существующих CI jobs.

## Claude Code Instructions

Перед изменением кода:

1. Прочитать `CLAUDE.md` и этот файл полностью.
2. Прочитать `docs/07_task_backlog.md` §17.1 TASK-PH-008 как источник истины.
3. Если "Открытый вопрос" выше не отмечен пользователем — остановиться и спросить, прежде чем реализовывать отключение Swagger в production.
4. Запустить `npm run build` и `npm run test` — зафиксировать базовое состояние.
5. Вносить изменения строго в рамках Scope выше.

После реализации Claude Code:

1. Показать каждый Acceptance Criterion как ✅/❌.
2. Показать изменённые файлы.
3. Показать итоговую конфигурацию `SwaggerModule` в `main.ts`.
4. Показать вывод `npm run test` (число suite/tests — не должно измениться).
5. Обновить `project-management/TEST_LOG.md`.
6. Предложить, можно ли пометить TASK-PH-008 как DONE.
7. Остановиться и ждать подтверждения пользователя перед коммитом.

## Git Instructions

Claude Code выполняет в самом начале, до изменений кода:

```bash
git checkout -b task/TASK-PH-008-swagger-openapi-docs
```

Только после явного "approved" от пользователя Claude Code выполняет:

```bash
git add package.json src/main.ts src/**/*.controller.ts src/**/dto/*.ts project-management/TASK_BOARD.md project-management/CURRENT_TASK.md project-management/TEST_LOG.md
git commit -m "chore: TASK-PH-008 add Swagger/OpenAPI documentation"
git push -u origin task/TASK-PH-008-swagger-openapi-docs
gh pr create --title "chore: TASK-PH-008 Swagger/OpenAPI documentation" --body "Adds interactive OpenAPI documentation via @nestjs/swagger. Closes TASK-PH-008" --base main
```

Затем полностью остановиться. Пользователь сам делает merge, checkout main и pull.
