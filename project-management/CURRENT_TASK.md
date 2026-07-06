# Current Task

## Task ID

`TASK-036B`

> Source: TASK_BOARD.md, строка TASK-036B (Current Focus подтверждает: TASK-036A DONE, следующая — TASK-036B). Полное описание — docs/07_task_backlog.md, раздел TASK-036B — реконструкция не требуется. Рекомендованный порядок Phase 6: TASK-035A → TASK-035B → TASK-035C → TASK-035 → TASK-036A → **TASK-036B** → TASK-037. Зависимости TASK-035 (HtmlRendererService) и TASK-036A (PdfExportService) — DONE.

## Title

DocumentExportController and full export orchestration

## Context

Реализует `POST /workspaces/:id/export-cv` — endpoint, который пользователь вызывает для получения финального PDF. Оркестрирует уже реализованные `HtmlRendererService` (TASK-035) и `PdfExportService` (TASK-036A). Обрабатывает переход статуса workspace, регистрацию артефактов в PostgreSQL и human-readable download endpoint.

Эта задача — первая, где `PdfExportService.htmlFileToPdf()` вызывается не изолированно (как в TASK-036A), а как часть реального пайплайна экспорта.

## State Machine (из docs/03_domain_model.md §8.6 — не менять, только использовать)

| Action            | Precondition                | Status after (success) | Status after (failure) |
| ----------------- | --------------------------- | ---------------------- | ---------------------- |
| `POST /export-cv` | `status === export_running` | `cv_pdf_generated`     | `failed`               |

**Важно:** `export_running` устанавливается заранее в `ReviewGatesService.submitCvDraftReview(action=approve)` (TASK-034) — **не** этим endpoint'ом. Контроллер проверяет `export_running` как precondition (guard), а не выполняет переход в него.

## Docs to Read

- `docs/07_task_backlog.md`, раздел TASK-036B — полное описание (источник истины)
- `docs/DECISIONS.md`, ADR-017 (правила границ NestJS-модулей) — новый `document-export.module.ts` должен следовать этим правилам: импортировать свои зависимости напрямую, не полагаться на транзитивные экспорты, минимальный `exports: []`
- `docs/DECISIONS.md`, ADR-019 — каждый новый HTTP endpoint должен быть задокументирован через `@ApiOperation` / `@ApiProperty` (Swagger)
- `src/document-export/html-renderer.service.ts` — публичный интерфейс `HtmlRendererService.renderToHtml(workspaceId)` (не трогать реализацию, только вызывать)
- `src/document-export/pdf-export.service.ts` — публичный интерфейс `PdfExportService.htmlFileToPdf(htmlFilePath, pdfOutputPath)` (не трогать реализацию, только вызывать; реализован standalone `@Injectable`, без своего модуля — см. TASK-036A notes в TASK_BOARD.md)
- Существующий сервис перехода статусов workspace (используется в TASK-028/TASK-034) — для перехода `export_running → cv_pdf_generated` / `→ failed`
- Существующий `ArtifactsService`/`GeneratedArtifact` registry (TASK-014, TASK-011) — для регистрации HTML и PDF артефактов

## Files Likely Affected

```text
src/document-export/document-export.service.ts
src/document-export/document-export.controller.ts
src/document-export/document-export.module.ts
```

## Key Invariants

- Не реализовывать TASK-037 (Markdown/JSON export endpoints) в этой сессии — только TASK-036B.
- Не трогать `HtmlRendererService`, `PdfExportService`, их схемы и HTML-шаблон — они уже реализованы и протестированы (TASK-035, TASK-036A).
- Не менять Prisma schema (WorkspaceStatus enum и GeneratedArtifact модель уже существуют).
- Не создавать новый `AiRun` и не вызывать AI provider — это чисто детерминированный шаг (ADR-012).
- `export_running` — precondition, а не действие контроллера; не переопределять логику `ReviewGatesService.submitCvDraftReview`.
- Следовать ADR-017: новый `document-export.module.ts` импортирует свои зависимости напрямую (Prisma/Artifacts модуль и т.д.), минимальный `exports`.
- Следовать ADR-019: `@ApiOperation` на обоих новых endpoint'ах, `@ApiProperty`/`@ApiPropertyOptional` на новых DTO-полях, если такие появятся.
- Не менять существующие CI jobs.
- Не менять существующую бизнес-логику других сервисов/модулей.

## Acceptance Criteria (из docs/07_task_backlog.md — полное описание, подтверждения не требует)

- [ ] `POST /workspaces/:id/export-cv`: guard возвращает 400, если `workspace.status !== export_running`.
- [ ] Вызывает `HtmlRendererService.renderToHtml(workspaceId)` — производит `04_cv_export.html`, регистрирует `GeneratedArtifact`.
- [ ] Вызывает `PdfExportService.htmlFileToPdf(htmlPath, pdfPath)` — производит `04_cv_export.pdf`.
- [ ] Регистрирует `04_cv_export.pdf` как `GeneratedArtifact` с `origin = generated_by_export_service`.
- [ ] Не создаётся `AiRun`. AI provider не вызывается. Token usage не применим.
- [ ] Статус workspace → `cv_pdf_generated` при успехе; → `failed` при невосстановимой ошибке.
- [ ] `GET /workspaces/:id/download-cv` — отдаёт `04_cv_export.pdf` с `Content-Disposition: attachment; filename="Denys_Strakhov_<company_slug>_<role_slug>_CV.pdf"`.
- [ ] Оба новых endpoint'а задокументированы в Swagger (`@ApiOperation`, соответствующие DTO аннотированы) — ADR-019.
- [ ] Все существующие тесты по-прежнему проходят (актуальный baseline — 303/303, см. примечание ниже).

> **Примечание по числу тестов:** в backlog зафиксировано «all existing tests pass» без конкретной цифры. По `TASK_BOARD.md` после TASK-036A актуальный baseline — **303/303** (34 suites). Ориентироваться нужно на фактический результат `npm run test` до начала работы (шаг 3 ниже).

## Test Requirement

- Unit-тест: guard отклоняет неверный статус с 400.
- Unit-тест: `HtmlRendererService` и `PdfExportService` вызываются в правильном порядке; оба замоканы.
- Unit-тест: статус workspace переходит в `cv_pdf_generated` после успешного экспорта.
- Unit-тест: статус workspace переходит в `failed`, если `PdfExportService` бросает исключение.
- Unit-тест: `GeneratedArtifact` регистрируется для обоих артефактов (HTML и PDF).
- Unit-тест: мок AI provider ни разу не вызывается.
- Зафиксировать результат в `project-management/TEST_LOG.md`.

## Done Definition

- `POST /export-cv` → `04_cv_export.html` + `04_cv_export.pdf` на диске, оба зарегистрированы в БД, workspace в статусе `cv_pdf_generated`. Пользователь может скачать PDF через `GET /download-cv`.

## Scope

**Allowed:**

- Реализация `DocumentExportService` (оркестрация `HtmlRendererService` + `PdfExportService`, переход статуса, регистрация артефактов).
- Реализация `DocumentExportController` (`POST /workspaces/:id/export-cv`, `GET /workspaces/:id/download-cv`).
- Реализация `DocumentExportModule` (правила ADR-017).
- Swagger-аннотации на новых endpoint'ах и DTO (ADR-019).
- Unit-тесты, перечисленные в Test Requirement.

**Not allowed:**

- Реализация TASK-037 (Markdown/JSON export endpoints) или любой другой задачи вне TASK-036B.
- Правки `HtmlRendererService`, `PdfExportService`, их схем и HTML-шаблона.
- Правки Prisma schema.
- Создание `AiRun` или вызов AI provider.
- Изменение логики `ReviewGatesService.submitCvDraftReview` или перехода в `export_running`.
- Изменение существующих CI jobs.

## Claude Code Instructions

Перед изменением кода:

1. Прочитать `CLAUDE.md` и этот файл полностью.
2. Прочитать `docs/07_task_backlog.md`, раздел TASK-036B, как источник истины.
3. Запустить `npm run build` и `npm run test` — зафиксировать базовое состояние (актуальное число suite/tests, см. примечание выше про baseline 303).
4. Изучить публичные интерфейсы `HtmlRendererService.renderToHtml()` и `PdfExportService.htmlFileToPdf()` — не читать их внутреннюю реализацию сверх необходимого для правильного вызова.
5. Вносить изменения строго в рамках Scope выше.
6. Следовать ADR-017 (границы модулей) и ADR-019 (Swagger) при создании `document-export.module.ts` и endpoint'ов.

После реализации Claude Code:

1. Показать каждый Acceptance Criterion как ✅/❌.
2. Показать изменённые/созданные файлы.
3. Показать итоговую реализацию `DocumentExportService` и `DocumentExportController`.
4. Показать вывод `npm run test` (число suite/tests — прирост ожидаем за счёт новых тестов; сравнить с baseline из шага 3).
5. Подтвердить, что guard, оба перехода статуса (`cv_pdf_generated` / `failed`) и регистрация обоих артефактов покрыты тестами.
6. Обновить `project-management/TEST_LOG.md`.
7. Предложить, можно ли пометить TASK-036B как DONE.
8. Остановиться и ждать подтверждения пользователя перед коммитом.

## Git Instructions

Claude Code выполняет в самом начале, до изменений кода:

```bash
git checkout -b task/TASK-036B-document-export-controller
```

Только после явного "approved" от пользователя Claude Code выполняет:

```bash
git add src/document-export/document-export.service.ts src/document-export/document-export.controller.ts src/document-export/document-export.module.ts project-management/TASK_BOARD.md project-management/CURRENT_TASK.md project-management/TEST_LOG.md
git commit -m "feat: TASK-036B DocumentExportController and full export orchestration"
git push -u origin task/TASK-036B-document-export-controller
gh pr create --title "feat: TASK-036B DocumentExportController and export orchestration" --body "Implements POST /workspaces/:id/export-cv and GET /workspaces/:id/download-cv. Orchestrates HtmlRendererService + PdfExportService. Status transitions export_running -> cv_pdf_generated/failed. Closes TASK-036B" --base main
```

Затем полностью остановиться. Пользователь сам делает merge, checkout main и pull.
