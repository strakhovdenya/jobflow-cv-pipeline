# Current Task

## Task ID

`TASK-036A`

> Source: TASK_BOARD.md, строка TASK-036A (Current Focus). Полное описание — docs/07_task_backlog.md, раздел TASK-036A — реконструкция не требуется. Рекомендованный порядок Phase 6: TASK-035A → TASK-035B → TASK-035C → TASK-035 → **TASK-036A** → TASK-036B → TASK-037. Зависимость TASK-035B — DONE.

## Title

Choose PDF library and implement PdfExportService

## Context

PDF-генерация требует библиотеки HTML→PDF конвертации. Библиотека должна быть выбрана и подтверждена рабочей на машине разработчика до реализации любой оркестрации экспорта. Puppeteer (скачивает Chromium через `npm install`) — рекомендованный выбор для точного рендеринга CSS Grid двухколоночной раскладки CV из TASK-035B. Эта задача реализует только сервис конвертации — без endpoint'а, без переходов статуса, без регистрации артефактов.

## Library Decision

Использовать `puppeteer`.

- На Windows 11 `npm install puppeteer` автоматически скачивает локальный Chromium — системный Chrome не требуется.
- Если Puppeteer не запускается (например, sandbox-проблемы на Windows), добавить `{ args: ['--no-sandbox'] }` в опции запуска и задокументировать причину в отчёте.
- Не использовать `wkhtmltopdf` (внешний бинарник), `html-pdf` (не поддерживается), `jsPDF` (плохая поддержка CSS Grid).

## Docs to Read

- `docs/07_task_backlog.md`, раздел TASK-036A — полное описание (источник истины)
- `src/document-export/html-renderer.service.ts` — для понимания, где лежит `04_cv_export.html`, который будет подан на вход (только для контекста; сам HtmlRendererService не трогать)
- `package.json` — текущие зависимости

## Files Likely Affected

```text
src/document-export/pdf-export.service.ts
package.json
```

## Key Invariants

- Не реализовывать TASK-036B (endpoint, оркестрация, переходы статуса, регистрация артефактов) в этой сессии — только TASK-036A.
- Не читать workspace/БД, не писать `GeneratedArtifact` — сервис должен быть чистым I/O (принимает путь к HTML-файлу, отдаёт путь к PDF-файлу).
- Не трогать `HtmlRendererService`, `cv-content.schema.ts`, `cv.template.html`, `pre-pdf-check.schema.ts` — они уже реализованы (TASK-035B, TASK-035).
- Не трогать Prisma schema.
- Не менять существующую бизнес-логику других сервисов.
- Не менять существующие CI jobs.
- Браузерный инстанс Puppeteer обязан закрываться после каждого вызова экспорта — не оставлять висящие процессы Chrome.

## Acceptance Criteria (из docs/07_task_backlog.md — полное описание, подтверждения не требует)

- [x] `puppeteer` установлен и добавлен в `package.json` (dependencies).
- [x] `PdfExportService.htmlFileToPdf(htmlFilePath: string, pdfOutputPath: string): Promise<void>` — запускает Puppeteer, переходит на `file://` URL HTML-файла, вызывает `page.pdf()` с форматом A4, закрывает браузер.
- [x] Браузерный инстанс закрывается после каждого вызова экспорта — нет утечки процессов Chrome.
- [x] Нет чтения workspace, нет записи `GeneratedArtifact`, нет переходов статуса — чистый I/O-сервис.
- [x] Unit-тест: пишет минимальный HTML-файл во временную директорию, вызывает `htmlFileToPdf`, проверяет что выходной файл существует и `statSync(pdfPath).size > 0`.
- [x] Все существующие тесты по-прежнему проходят.

> **Примечание по числу тестов:** в backlog зафиксировано «All 283 existing tests still pass» — это число устарело (написано до TASK-035). По `TASK_BOARD.md` после TASK-035 актуальный baseline — **302/302**. Ориентироваться нужно на фактический результат `npm run test` до начала работы (шаг 4 ниже), а не на цифру 283 из backlog.

## Test Requirement

- Один интеграционный unit-тест (реальный Puppeteer, временные файлы), подтверждающий что библиотека работает end-to-end на машине разработчика.
- Puppeteer в этом тесте не мокается — цель теста именно подтвердить реальную работу библиотеки.
- Зафиксировать результат в `project-management/TEST_LOG.md`.

## Done Definition

- `PdfExportService.htmlFileToPdf()` производит непустой PDF-файл из HTML-файла без побочных эффектов. Подтверждено работающим на Windows 11.

## Scope

**Allowed:**

- Установка `puppeteer` (добавление в `package.json`).
- Реализация `PdfExportService` (метод `htmlFileToPdf`) в `src/document-export/`.
- Unit/интеграционный тест на реальном Puppeteer с временными файлами.

**Not allowed:**

- Реализация TASK-036B (`DocumentExportController`, `POST /workspaces/:id/export-cv`, переходы статуса, регистрация артефактов, download endpoint) или любой другой задачи вне TASK-036A.
- Правки `HtmlRendererService`, схем TASK-035B, HTML-шаблона.
- Правки Prisma schema.
- Чтение workspace или запись в БД внутри `PdfExportService`.
- Изменение существующих CI jobs.

## Claude Code Instructions

Перед изменением кода:

1. Прочитать `CLAUDE.md` и этот файл полностью.
2. Прочитать `docs/07_task_backlog.md`, раздел TASK-036A, как источник истины.
3. Запустить `npm run build` и `npm run test` — зафиксировать базовое состояние (актуальное число suite/tests, см. примечание выше про 283 vs 302).
4. Установить `puppeteer`, подтвердить что `npm install` проходит без ошибок на текущей машине (Windows 11).
5. Вносить изменения строго в рамках Scope выше.
6. Если Puppeteer не запускается без флагов — задокументировать в отчёте, какие опции запуска потребовались и почему (например, `--no-sandbox`), не решать проблему обходными путями вне этой задачи.

После реализации Claude Code:

1. Показать каждый Acceptance Criterion как ✅/❌.
2. Показать изменённые/созданные файлы.
3. Показать итоговую реализацию `PdfExportService.htmlFileToPdf()`.
4. Показать вывод `npm run test` (число suite/tests — прирост ожидаем за счёт нового теста; сравнить с baseline из шага 3).
5. Подтвердить, что генерация PDF реально проверена на машине разработчика (не только моки).
6. Обновить `project-management/TEST_LOG.md`.
7. Предложить, можно ли пометить TASK-036A как DONE.
8. Остановиться и ждать подтверждения пользователя перед коммитом.

## Git Instructions

Claude Code выполняет в самом начале, до изменений кода:

```bash
git checkout -b task/TASK-036A-pdf-export-service
```

Только после явного "approved" от пользователя Claude Code выполняет:

```bash
git add package.json src/document-export/pdf-export.service.ts project-management/TASK_BOARD.md project-management/CURRENT_TASK.md project-management/TEST_LOG.md
git commit -m "feat: TASK-036A choose PDF library and implement PdfExportService"
git push -u origin task/TASK-036A-pdf-export-service
gh pr create --title "feat: TASK-036A PdfExportService (Puppeteer)" --body "Implements PdfExportService.htmlFileToPdf() using Puppeteer. Pure I/O service, no orchestration. Closes TASK-036A" --base main
```

Затем полностью остановиться. Пользователь сам делает merge, checkout main и pull.
