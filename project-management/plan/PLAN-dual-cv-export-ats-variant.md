# Plan: Dual CV PDF export — ATS-optimized variant

**PRD:** `project-management/prd/PRD-dual-cv-export-ats-variant.md`
**Дата:** 2026-09-02

## Фазы реализации

### Фаза 1: ATS HTML-шаблон + чистая render-функция
**Цель:** Новый однокаовночный ATS Handlebars-шаблон, реализующий все форматные правила, как
чистая функция без побочных эффектов — тестируемая изолированно, до подключения к сервисам.
**Затрагивает:** apps/api (новый файл `ats-cv-template-renderer.ts`, peer of
`cv-template-renderer.ts`; никаких изменений `DocumentExportService`/контроллеров в этой фазе)
**Задачи:**
- [ ] Реализовать `renderAtsCvTemplate(content: CvContent, corrections?: PrePdfCheckCorrection[]): string`
      с той же сигнатурой, что и `renderCvTemplate()`.
- [ ] Реализовать однокаовночный layout, видимый Contact-блок между Headline и Summary, порядок
      секций и все остальные layout/typography/page/PDF-технические правила из
      `analysis-ats-dual-export-scoping.md` §3 (25 правил).
- [ ] Реализовать рендер density hints (`rendering_hints.density`) собственным CSS-маппингом под
      однокаовночный layout.
- [ ] Реализовать рендер сертификатов без дат/издателя — той же логикой фильтра `include: true`,
      что и в `cv-template-renderer.ts`, без изменений Prompt 2/схемы.
- [ ] Реализовать рендер location/work authorization/EGZ строго из существующих полей
      `CandidateProfileConfig`, без новых ATS-специфичных полей.
- [ ] Unit-тесты `ats-cv-template-renderer.spec.ts` — fixture-based подход, аналогичный
      `cv-template-renderer.spec.ts`.

**Когда готова:** закрывает пункты AC PRD: "Новый ATS Handlebars-шаблон реализует все 25 правил
из `analysis-ats-dual-export-scoping.md` §3", "Density hints ... учитываются ATS-шаблоном
(собственный CSS-маппинг под однокаовночный layout)", "Сертификаты в ATS-варианте рендерятся без
дат/издателя, той же логикой, что и в дизайн-варианте (без изменений Prompt 2/схемы)",
"Location/work authorization/EGZ рендерятся из тех же существующих полей `CandidateProfileConfig`,
без новых ATS-специфичных полей или отдельной формулировки".

### Фаза 2: Расширение `export-cv` на оба PDF + новый download endpoint
**Цель:** `POST /workspaces/:id/export-cv` за один вызов генерирует и регистрирует оба PDF-варианта;
ATS PDF доступен для скачивания отдельным endpoint'ом.
**Затрагивает:** apps/api (`DocumentExportService`, новый `AtsHtmlRendererService`,
`document-export.controller.ts`, `PdfExportService`; корневой `CLAUDE.md` и `apps/api/CLAUDE.md`
— документация)
**Задачи:**
- [ ] Новый `AtsHtmlRendererService` (peer of `HtmlRendererService`), использующий
      `renderAtsCvTemplate()`, применяющий коррекции Prompt 3 из `03_pre_pdf_check.json` (если
      существует) так же, как это делает `HtmlRendererService`, пишущий `04_cv_export_ats.html` и
      регистрирующий его как `GeneratedArtifact`.
- [ ] Расширить `DocumentExportService.exportCv()` — после генерации дизайн-варианта также
      вызывать ATS-рендерер и `PdfExportService`, производя `04_cv_export_ats.pdf`
      (`artifactType: 'cv_export_ats_pdf'`, `origin: 'generated_by_export_service'`, без
      `AiRun` — ADR-012).
- [ ] Расширить `ExportCvResult` полем для ATS-артефакта.
- [ ] Новый `GET /workspaces/:id/download-cv-ats` — та же логика безопасности путей, что у
      существующего `download-cv`.
- [ ] Swagger: `@ApiOperation`/`@ApiProperty(Optional)` для нового endpoint'а и изменённого поля
      ответа (ADR-019).
- [ ] Обновить корневой `CLAUDE.md` (`## High-Level Architecture` → Data Flow шаг 4, `## Artifact
      Rules`) и `apps/api/CLAUDE.md` ("Структура проекта") под новые canonical-имена и новый
      сервис — в том же PR (Documentation Rules).
- [ ] Unit/e2e-тесты: `exportCv()` создаёт оба артефакта за один вызов без `AiRun` для ATS;
      e2e-тест `download-cv-ats`.

**Когда готова:** закрывает пункты AC PRD: "`POST /workspaces/:id/export-cv` за один вызов
генерирует и регистрирует оба артефакта: `04_cv_export.pdf` (без изменений) и
`04_cv_export_ats.pdf` (новый), без создания `AiRun` для ATS-варианта", "`GET
/workspaces/:id/download-cv-ats` отдаёт корректный, отдельно скачиваемый `04_cv_export_ats.pdf`",
"Коррекции Prompt 3 ... применяются к ATS-варианту так же, как к дизайн-варианту", "`CLAUDE.md`
Artifact Rules и `## High-Level Architecture` ... обновлены под новые canonical-имена и
расширенное поведение `export-cv`", "`apps/api/CLAUDE.md` \"Структура проекта\" обновлена, если
появляется новый файл/сервис".

### Фаза 3: apps/web — две кнопки скачивания
**Цель:** Пользователь видит и может независимо скачать оба PDF-варианта на экране workspace.
**Затрагивает:** apps/web (UI на статусе `cv_pdf_generated`)
**Задачи:**
- [ ] Добавить вторую кнопку скачивания ("ATS CV") рядом с существующей "Download CV PDF",
      ссылающуюся на новый `GET .../download-cv-ats`.
- [ ] Показывать каждую кнопку только если соответствующий артефакт существует (через
      `artifactsService.findByWorkspaceId()` / API-ответ).
- [ ] Manual UI verification: обе кнопки реально скачивают разные, корректные файлы.

**Когда готова:** закрывает пункт AC PRD: "`apps/web` показывает две отдельные, независимо
активные кнопки скачивания на статусе `cv_pdf_generated`, каждая видима только если
соответствующий артефакт существует".

Рекомендуется epic base branch: `task/ISSUE-<tracking-issue-n>-dual-cv-export-ats-base`
(ADR-025/ADR-030), т.к. план затрагивает и apps/api (Фазы 1–2), и apps/web (Фаза 3) тремя
независимо тестируемыми шагами — тот же паттерн, что PRD уже отметил в разделе "Предполагаемое
дробление на подзадачи" (Фазы 1+2 реалистичны как один PR, Фаза 3 — отдельный PR).
