# Current Task

## Task ID

`TASK-035`

> Source: TASK_BOARD.md, строка TASK-035 (Current Focus). Полное описание — docs/07_task_backlog.md, раздел TASK-035 — реконструкция не требуется. Рекомендованный порядок Phase 6: TASK-035A → TASK-035B → TASK-035C → **TASK-035** → TASK-036A → TASK-036B → ... Все зависимости (TASK-035B, TASK-035C, TASK-032A) — DONE.

## Title

Implement deterministic CV draft to HTML renderer

## Context

PDF-экспорт должен иметь промежуточный HTML для предпросмотра/отладки. Это часть детерминированного Step 4 (document export) и не должно вызывать AI-провайдера. Если `03_pre_pdf_check.md/json` существует, рендерер обязан применить эти рекомендации как обязательный CV-специфичный контекст перед генерацией HTML.

## Mapping Contract — РЕШЕНО (обязательно к прочтению перед кодом)

`02_targeted_cv_content.json` хранит `Prompt2Output` (форма из TASK-032). `renderCvTemplate()` принимает `CvContent` (схема из TASK-035B). Это разные типы — `Prompt2Output` не имеет верхнеуровневых `candidate`, `education`, `languages`, `links`, `volunteering`. `HtmlRendererService` должен маппить `Prompt2Output` → `CvContent`.

Источники недостающих полей — зафиксированы по итогам разведки в чате (не предполагать иначе, не искать альтернативные источники):

| Поле CvContent                                                         | Источник                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `candidate.name`, `candidate.location`, `candidate.work_authorization` | **ИСПРАВЛЕНО в чате перед реализацией**: статический config-файл (не БД). `Company.nameOriginal` — имя работодателя, `JobVacancy.locationText` — локация вакансии; ни одно из полей `Company`/`JobVacancy` не описывает самого кандидата. Пользователь подтвердил: source = статический config-файл, тот же, что для `candidate.contact`. |
| `candidate.contact`                                                    | статический config-файл (не из Prompt2Output)                                                                                                                                                                                                                                                                                      |
| `current_work_block`                                                   | **прямое копирование** `Prompt2Output.cv_content.current_work_block` — это top-level поле-сосед `experience[]` (подтверждено: `src/pipeline/schemas/prompt2.schema.ts:40-60`, `Prompt2CurrentWorkBlock`; фикстура `src/ai/providers/fake.provider.ts:77-92`). НЕ элемент массива `experience[]`, флага `is_current` не существует. |
| `education`, `languages`, `links`, `volunteering`                      | статический config-файл (не из Prompt2Output)                                                                                                                                                                                                                                                                                      |

Перед реализацией маппинга `current_work_block` проверить точное совпадение полей `Prompt2CurrentWorkBlock` (prompt2.schema.ts) и `CvCurrentWorkBlock` (cv-content.schema.ts из TASK-035B) — комментарий в коде утверждает, что они зеркальны ("Mirrors CvCurrentWorkBlock"), но 1:1 соответствие полей нужно подтвердить, а не предполагать. Если найдено расхождение имени/типа поля — остановиться и сообщить, не менять схемы самостоятельно.

Формат/путь статического config-файла для `candidate.contact`, `education`, `languages`, `links`, `volunteering` не задан заранее — Claude Code выбирает разумное решение (например, `config/candidate-profile.json` или через `ConfigService`), кратко описывает выбор в отчёте после реализации, но не создаёт сложную инфраструктуру ради этого.

## Docs to Read

- `docs/07_task_backlog.md`, раздел TASK-035 — полное описание (источник истины)
- `docs/cv-template-design/visual-concept.md`, `block-rules.md` — утверждённый визуальный концепт (TASK-035A)
- `src/pipeline/schemas/prompt2.schema.ts` — форма `Prompt2Output` / `Prompt2CvContent`
- `src/document-export/templates/cv.template.html`, `src/pipeline/schemas/cv-content.schema.ts` — целевая форма `CvContent` (TASK-035B)
- `src/pipeline/schemas/pre-pdf-check.schema.ts` — форма `03_pre_pdf_check.json`

## Files Likely Affected

```text
src/document-export/html-renderer.service.ts
```

(Плюс новый статический config-файл для контактов/образования/языков/ссылок, если потребуется — путь на усмотрение Claude Code, см. Mapping Contract.)

## Key Invariants

- Не реализовывать TASK-036A, TASK-036B или другие задачи Phase 6/7 в этой сессии — только TASK-035.
- Не менять `cv-content.schema.ts`, `pre-pdf-check.schema.ts`, `cv.template.html` — они уже реализованы в TASK-035B. Если найдено расхождение полей — остановиться и сообщить, не чинить самостоятельно.
- Не вызывать AI-провайдера ни в каком виде.
- Не менять формулировки/содержание CV и не добавлять новые заявления (claims) при маппинге.
- Не реализовывать переходы статуса workspace — это TASK-036B.
- Не трогать Prisma schema.
- Не трогать `PdfExportService`, `DocumentExportController`, PDF-генерацию.
- Не менять существующие CI jobs.

## Acceptance Criteria (из docs/07_task_backlog.md — полное описание, подтверждения не требует)

- [x] `HtmlRendererService.renderToHtml(workspaceId): Promise<string>` — читает `02_targeted_cv_content.json`, маппит в `CvContent` по согласованному mapping contract, опционально читает `03_pre_pdf_check.json`, вызывает `renderCvTemplate(content, corrections?)`, записывает `04_cv_export.html`, регистрирует `GeneratedArtifact` с `origin = generated_by_export_service`.
- [x] Не вызывает AI-провайдера.
- [x] Не меняет формулировки CV и не добавляет новые заявления при маппинге.
- [x] Если `03_pre_pdf_check.json` существует — коррекции применяются через `applyCorrectionsToCvContent()` перед рендерингом. Если отсутствует — экспорт проходит без ошибки.
- [x] Нет переходов статуса workspace (это делает контроллер в TASK-036B).
- [x] `npm run test` проходит; `npx tsc --noEmit` проходит.

## Test Requirement

- Unit-тест: `renderToHtml()` выдаёт HTML с ожидаемыми секциями (имя, headline, компания из experience, education).
- Unit-тест: AI-провайдер никогда не вызывается.
- Unit-тест: коррекции Prompt 3 применяются, если `03_pre_pdf_check.json` предоставлен; отсутствие коррекций не вызывает ошибку.
- Unit-тест: регистрация `GeneratedArtifact` вызывается с корректным каноническим именем `04_cv_export.html`.
- Зафиксировать результат в `project-management/TEST_LOG.md`.

## Done Definition

- Утверждённый CV-драфт может быть отрендерен в HTML-артефакт. `04_cv_export.html` существует на диске с корректным содержимым.

## Scope

**Allowed:**

- Реализация `HtmlRendererService` (метод `renderToHtml`) в `src/document-export/`.
- Реализация функции маппинга `Prompt2Output` → `CvContent` согласно Mapping Contract выше.
- Создание статического config-файла для полей, не покрытых Prompt2Output (contact/education/languages/links/volunteering).
- Вызов уже существующих `renderCvTemplate()` и `applyCorrectionsToCvContent()` из TASK-035B.
- Регистрация `GeneratedArtifact` через существующий сервис реестра артефактов (TASK-014).

**Not allowed:**

- Реализация TASK-036A, TASK-036B или любой другой задачи вне TASK-035.
- Правки схем `cv-content.schema.ts`, `pre-pdf-check.schema.ts`, HTML-шаблона.
- Правки Prisma schema.
- Изменение бизнес-логики Prompt 2 / EvidenceGuardService / других уже реализованных сервисов.
- Реализация PDF-конвертации или контроллера экспорта.
- Изменение переходов статуса workspace.
- Изменение существующих CI jobs.

## Claude Code Instructions

Перед изменением кода:

1. Прочитать `CLAUDE.md` и этот файл полностью.
2. Прочитать `docs/07_task_backlog.md`, раздел TASK-035, как источник истины.
3. Прочитать Mapping Contract выше — он уже согласован с пользователем, повторного подтверждения не требует. Единственный пункт для самостоятельной проверки — совпадение полей `Prompt2CurrentWorkBlock` и `CvCurrentWorkBlock` (см. выше); при расхождении — остановиться и сообщить.
4. Запустить `npm run build` и `npm run test` — зафиксировать базовое состояние.
5. Вносить изменения строго в рамках Scope выше.

После реализации Claude Code:

1. Показать каждый Acceptance Criterion как ✅/❌.
2. Показать изменённые/созданные файлы.
3. Показать выбранный формат/путь статического config-файла и его содержимое.
4. Показать итоговую реализацию функции маппинга `Prompt2Output` → `CvContent`.
5. Показать вывод `npm run test` (число suite/tests — прирост ожидаем за счёт новых unit-тестов).
6. Обновить `project-management/TEST_LOG.md`.
7. Предложить, можно ли пометить TASK-035 как DONE.
8. Остановиться и ждать подтверждения пользователя перед коммитом.

## Git Instructions

Claude Code выполняет в самом начале, до изменений кода:

```bash
git checkout -b task/TASK-035-cv-draft-html-renderer
```

Только после явного "approved" от пользователя Claude Code выполняет:

```bash
git add src/document-export/html-renderer.service.ts project-management/TASK_BOARD.md project-management/CURRENT_TASK.md project-management/TEST_LOG.md
git commit -m "feat: TASK-035 implement deterministic CV draft to HTML renderer"
git push -u origin task/TASK-035-cv-draft-html-renderer
gh pr create --title "feat: TASK-035 CV draft to HTML renderer" --body "Implements HtmlRendererService: maps Prompt2Output to CvContent and renders 04_cv_export.html. Closes TASK-035" --base main
```

Затем полностью остановиться. Пользователь сам делает merge, checkout main и pull.
