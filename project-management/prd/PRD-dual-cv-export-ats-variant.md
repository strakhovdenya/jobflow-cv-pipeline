# PRD: Dual CV PDF export — ATS-optimized variant

**Дата**: 2026-09-02
**Статус**: Draft
**Затрагиваемое приложение**: оба (apps/api — рендер/экспорт; apps/web — UI скачивания)
**Связанный issue/backlog-пункт**: [#293](https://github.com/strakhovdenya/jobflow-cv-pipeline/issues/293)
(остаётся открытым до создания эпика/задач из этого PRD); предшествующая скоупинг-задача
[#305](https://github.com/strakhovdenya/jobflow-cv-pipeline/issues/305) (закрыта, PR #306) дала
анализ `project-management/analysis-ats-dual-export-scoping.md`, на котором построен этот PRD.

## Цель

Экспорт CV (`POST /workspaces/:id/export-cv`) должен за один вызов производить не только текущий
визуальный дизайн CV, но и второй, ATS-оптимизированный однокаовночный PDF — без ручного
"выхода" из пайплайна в сторонний веб-инструмент, как это делается сейчас.

## Контекст и согласованность с проектом

- Затрагивает Step 4 (export) пайплайна — `apps/api/src/document-export/` (`DocumentExportService`,
  `HtmlRendererService`, `PdfExportService`, `cv-template-renderer.ts`,
  `prompt2-to-cv-content.mapper.ts`, `candidate-profile.config.ts`).
- Затрагивает canonical-артефакты: добавляет два новых — `04_cv_export_ats.html`,
  `04_cv_export_ats.pdf` (см. ADR-006). Существующие `04_cv_export.html/.pdf` не переименовываются
  и не перезаписываются.
- Связанные ADR:
  - **ADR-012** (Step 4 — деترminированный, не-AI шаг): оба варианта рендерятся детерминированно,
    ни один не создаёт `AiRun`/`PromptTemplate`.
  - **ADR-006** (canonical artifact names): новый вариант получает собственное стабильное имя,
    не переиспользует `04_cv_export.*`.
  - **ADR-026** (Prompt 3 — mandatory-but-skippable gate перед export): гейт не меняется, оба
    варианта экспортируются только после того как этот гейт уже пройден (см. Открытые вопросы —
    вопрос про применение коррекций Prompt 3 к ATS-варианту решён владельцем — см. ниже).
  - **ADR-034** (manual note — forced-priority исключение из anti-overclaiming): применяется
    одинаково к обоим вариантам — форсированный контент рендерится в оба PDF без дополнительной
    логики.

## Зависимости

Явных технических зависимостей от незавершённых эпиков/фаз не найдено. Функциональность строится
поверх уже существующего и полностью рабочего Step 4 export pipeline (`02_targeted_cv_content.json`
→ `CvContent` → `04_cv_export.html/.pdf`), который на момент написания PRD в проекте уже DONE.

## Пользовательские сценарии

- Пользователь нажимает "Export PDF" на workspace в статусе `paused_before_export` ->
  получает оба файла: обычный дизайн-PDF (как сейчас) и ATS-совместимый PDF, без дополнительных
  действий.
- Пользователь на странице workspace в статусе `cv_pdf_generated` видит две отдельные кнопки
  скачивания и может скачать любой из двух PDF независимо.

## В скоупе

1. Новый Handlebars-шаблон для однокаовночного ATS-рендера, реализующий 25 форматных правил из
   `analysis-ats-dual-export-scoping.md` §3 (layout, typography, контакт-блок, технические PDF-
   требования — текстовый, не растровый PDF, и т.д.).
2. Расширение `DocumentExportService.exportCv()` — один вызов `POST /workspaces/:id/export-cv`
   генерирует оба PDF (`04_cv_export.pdf` и `04_cv_export_ats.pdf`) и регистрирует оба как
   `GeneratedArtifact` (новый `artifactType: 'cv_export_ats_pdf'`, `origin:
   'generated_by_export_service'`, без `AiRun` — ADR-012).
3. Новый endpoint `GET /workspaces/:id/download-cv-ats` для скачивания ATS-варианта (та же логика
   безопасности путей, что у существующего `download-cv`).
4. `apps/web`: вторая кнопка скачивания ("ATS CV") на экране workspace в статусе
   `cv_pdf_generated`, видимая только когда соответствующий артефакт существует.
5. Коррекции Prompt 3 (`03_pre_pdf_check.json`, если существует) применяются к ATS-варианту так
   же, как к текущему дизайну (owner-решение — см. §7 анализа, подтверждено).
6. Density hints (`cv_content.rendering_hints.density`) учитываются ATS-шаблоном так же, как
   текущим дизайн-шаблоном, с собственным CSS-маппингом под однокаовночный layout (owner-решение,
   подтверждено).
7. Location/work authorization и EGZ-строка в ATS-варианте рендерятся по тем же правилам/
   источникам данных, что и в обычном дизайне — никакого отдельного ATS-специфичного текста или
   конфигурации не вводится (owner-решение, подтверждено; закрывает открытые вопросы §5.1/§5.2/
   §5.3 анализа как "без изменений").
8. Сертификаты в ATS-варианте рендерятся без дат/издателя — тем же способом, что и сейчас в
   дизайн-варианте (`mapCertifications()`, `include: true` фильтр) — без изменений Prompt 2/схемы
   (owner-решение, подтверждено; закрывает §5.6 анализа).
9. Обновление ADR-006/`CLAUDE.md` Artifact Rules и `## High-Level Architecture` под новые
   canonical-имена и расширенный шаг экспорта.

## Не в скоупе

- Изменения Prompt 2 или `TargetedCvContentOutput`/схемы — подтверждено анализом (§2), это чисто
  render-only фича; никаких новых полей от AI-шага не требуется.
- Второй AI-промпт для ATS-варианта — явно отклонено (owner подтвердил рекомендацию §4.1
  анализа: детерминированный рендер, без AI-вызова).
- Отдельный endpoint `POST /workspaces/:id/export-cv-ats` — явно отклонено (owner подтвердил
  рекомендацию §4.2 анализа: один вызов `export-cv` генерирует оба варианта).
- Cover letter / Phase 2 функциональность — не затрагивается (ADR-010, отдельная тема).
- Любые изменения `CandidateProfileConfig` под ATS-специфичный текст (более длинная строка
  location, отдельная work-authorization формулировка, EGZ-поле) — явно отклонено owner-ом: ATS-
  вариант использует те же поля/правила, что и обычный дизайн, без отдельной ATS-версии текста.

## Влияние на state machine

Не применимо: фича не меняет `ApplicationWorkspace.status`, `reviewState` или `currentDecision`.
`export-cv` продолжает переводить workspace `paused_before_export → cv_pdf_generated` (или из
legacy `export_running`, ADR-026) — переход не меняется, просто в рамках этого же вызова
создаётся дополнительный артефакт.

## Влияние на модель данных

- Новое значение artifact type: `cv_export_ats_pdf` (и, вероятно, `cv_export_ats_html` для
  промежуточного HTML — по аналогии с существующей парой `cv_export_pdf`/`cv_export_html`, если
  такая пара существует в текущей схеме `GeneratedArtifact.artifactType`; уточнить точный enum/
  string-набор при разбивке на Issues).
- Никаких новых Prisma-моделей. Оба варианта — обычные `GeneratedArtifact` записи, привязанные к
  тому же `ApplicationWorkspace`, `origin: 'generated_by_export_service'`, без `AiRun`/
  `PromptRun` (ADR-012).
- Файл на диске (не только в БД) — `04_cv_export_ats.pdf` физически лежит в
  `storage/applications/<workspace>/`, как и текущий `04_cv_export.pdf` (ADR-002).

## API-поверхность

- `POST /workspaces/:id/export-cv` — поведение расширяется (не меняется контракт запроса), ответ
  (`ExportCvResult`) дополняется полем с путём/идентификатором ATS-артефакта.
- Новый `GET /workspaces/:id/download-cv-ats` — аналог существующего `download-cv`, отдаёт
  `04_cv_export_ats.pdf`.
- Оба — потребуют `@ApiOperation({ summary: '...' })` на новом/изменённом контроллере, новое поле
  ответа — `@ApiProperty()`/`@ApiPropertyOptional()` (ADR-019). Это требование к реализации, не
  факт на этапе PRD.

## Ключевые инварианты

- **ADR-012**: ни один из двух рендеров не создаёт `AiRun`. Шаг остаётся детерминированным.
- **Anti-overclaiming / ADR-034**: manual-note forced claims (форсированные без evidence
  утверждения) должны попадать в ATS-рендер так же, как в дизайн-рендер — тот же `CvContent`,
  тот же набор форсированных bullet'ов, без отдельной логики фильтрации.
- **ADR-026**: пре-PDF-check гейт (`paused_before_export`) остаётся единственным гейтом перед
  export; оба варианта генерируются только после того как этот гейт уже пройден (run или skip).
- **Module boundary (ADR-017)**: новый ATS-рендер-сервис — пир существующего
  `HtmlRendererService`, с собственным экспортируемым провайдером, не смешивается с ним в одном
  классе.
- **Filesystem root (`STORAGE_ROOT`)**: ATS-файлы пишутся строго внутри `STORAGE_ROOT`, по тому
  же паттерну путей, что и текущие `04_cv_export.*`.
- **25 форматных правил** из `analysis-ats-dual-export-scoping.md` §3 — обязательный чеклист для
  реализации ATS-шаблона (однокаовночный layout, видимый контакт-блок между Headline и Summary,
  текстовый а не растровый PDF, минимум 9.5pt шрифт, порядок чтения при извлечении текста
  соответствует визуальному, и т.д. — полный список см. в анализе, копируется в Acceptance
  Criteria будущего Issue).

## Технические ограничения

- Рендер должен оставаться детерминированным Handlebars-шаблоном (как текущий
  `cv-template-renderer.ts`), без обращения к AI provider — не требует моков AI provider в
  unit-тестах, т.к. AI не вызывается вовсе для этого шага.
- PDF-генерация — тот же `PdfExportService`/движок, что уже используется (без нового внешнего
  PDF-инструмента), чтобы не расширять поверхность зависимостей.
- Текстовая (не растровая) природа PDF — техническое ограничение самого экспорт-движка должно
  быть подтверждено на выбранном шаблоне (правило §3.20 анализа).

## Критерии готовности (Acceptance Criteria)

- [ ] Новый ATS Handlebars-шаблон реализует все 25 правил из
      `analysis-ats-dual-export-scoping.md` §3 (layout, typography, контакт-блок, page rules,
      PDF technical rules, skills rendering).
- [ ] `POST /workspaces/:id/export-cv` за один вызов генерирует и регистрирует оба артефакта:
      `04_cv_export.pdf` (без изменений) и `04_cv_export_ats.pdf` (новый), без создания `AiRun`
      для ATS-варианта.
- [ ] `GET /workspaces/:id/download-cv-ats` отдаёт корректный, отдельно скачиваемый
      `04_cv_export_ats.pdf`.
- [ ] Коррекции Prompt 3 (`03_pre_pdf_check.json`, если существует) применяются к ATS-варианту
      так же, как к дизайн-варианту.
- [ ] Density hints (`rendering_hints.density`) учитываются ATS-шаблоном (собственный CSS-маппинг
      под однокаовночный layout).
- [ ] Сертификаты в ATS-варианте рендерятся без дат/издателя, той же логикой, что и в
      дизайн-варианте (без изменений Prompt 2/схемы).
- [ ] Location/work authorization/EGZ рендерятся из тех же существующих полей
      `CandidateProfileConfig`, без новых ATS-специфичных полей или отдельной формулировки.
- [ ] `apps/web` показывает две отдельные, независимо активные кнопки скачивания на статусе
      `cv_pdf_generated`, каждая видима только если соответствующий артефакт существует.
- [ ] `CLAUDE.md` Artifact Rules и `## High-Level Architecture` (Data Flow, шаг 4) обновлены под
      новые canonical-имена `04_cv_export_ats.html/.pdf` и расширенное поведение `export-cv`.
- [ ] `apps/api/CLAUDE.md` "Структура проекта" обновлена, если появляется новый файл/сервис
      (`AtsHtmlRendererService`, `ats-cv-template-renderer.ts`).

## Test Requirement (набросок)

- Unit-тесты нового `ats-cv-template-renderer.ts` — тот же fixture-based подход, что у
  `cv-template-renderer.spec.ts` (покрывает все 25 форматных правил, где это применимо к
  структуре выходного HTML).
- Unit/e2e-тесты `DocumentExportService.exportCv()` — проверка, что оба артефакта создаются за
  один вызов, ни один не создаёт `AiRun`.
- e2e-тест нового `download-cv-ats` endpoint.
- Manual UI verification (`apps/web`) — обе кнопки скачивания реально скачивают разные, корректные
  файлы.

## Открытые вопросы

Все девять пунктов из §7 анализа (`analysis-ats-dual-export-scoping.md`) закрыты владельцем
проекта перед написанием этого PRD:

1. Prompt 2 не меняется — подтверждено.
2. Детерминированный рендер (не второй AI-промпт) — подтверждено.
3. Один вызов `export-cv` генерирует оба PDF (не отдельный endpoint) — подтверждено.
4. EGZ-строка — по тем же правилам, что и обычный дизайн (т.е. рендерится из тех же
   существующих источников данных, без новой ATS-специфичной строки/поля).
5. Location/work authorization wording — тот же текст/конфиг, что в обычном дизайне, без
   отдельной ATS-формулировки.
6. Даты сертификатов — без дат в ATS-варианте, как в текущем дизайне.
7. `apps/web` UX двух кнопок — по общим UI best-practices (точные подписи/расположение — решается
   на этапе реализации/дизайна, не блокирует этот PRD).
8. Коррекции Prompt 3 — применяются к ATS-варианту так же, как к дизайн-варианту.
9. Density hints — учитываются ATS-шаблоном так же, как дизайн-шаблоном.

Оставшийся не полностью формализованный момент: пункт 7 (точные подписи кнопок в `apps/web`) не
имеет финального текста — это нормально оставить как деталь реализации Phase 3, не блокер PRD.

## Документация, которую потребуется обновить

- Корневой `CLAUDE.md`: `## High-Level Architecture` → Data Flow (шаг 4 export), `## Artifact
  Rules` (новые canonical-имена `04_cv_export_ats.html/.pdf`).
- `apps/api/CLAUDE.md`: "Структура проекта" — новый сервис/файл в `document-export/`.
- `project-management/DECISIONS.md`: рассмотреть новый ADR, фиксирующий решение "ATS-вариант —
  render-only, один вызов export-cv, без отдельного AI-шага" (по аналогии с тем, как ADR-026/031/
  032 фиксируют аналогичные архитектурные развилки в этой же области) — решить на этапе `plan`/
  `issues`, не обязательно в этом PRD.

## Предполагаемое дробление на подзадачи

Это эпик — работа затрагивает и backend (шаблон + сервис + endpoint), и frontend (UI), и состоит
из независимо тестируемых шагов, как уже описано в §6 анализа.

1. **ATS HTML-шаблон + чистая render-функция** — новый `ats-cv-template-renderer.ts`,
   реализующий все 25 правил §3 анализа как pure function, без изменений сервисов/контроллеров.
   Покрывает Acceptance Criteria "новый ATS-шаблон реализует все 25 правил". Низкий риск, нет
   побочных эффектов.
2. **Расширение `export-cv` на оба PDF + новый download endpoint** — `AtsHtmlRendererService`,
   расширение `DocumentExportService.exportCv()`, `GET /workspaces/:id/download-cv-ats`,
   применение коррекций Prompt 3 и density hints к ATS-варианту, регистрация нового artifact
   type. Покрывает большинство остальных Acceptance Criteria. Средний риск (трогает существующий
   `exportCv()`), зависит от задачи 1.
3. **`apps/web`: две кнопки скачивания** — UI на статусе `cv_pdf_generated`, видимость по
   наличию артефакта. Покрывает Acceptance Criteria про `apps/web`. Низко-средний риск,
   фронтенд-only, зависит от задачи 2 (нужен реальный `download-cv-ats` endpoint).

Задачи 1 и 2 реалистично объединяются в один PR (см. §6 анализа: "Phases 1 and 2 together are a
realistic single-PR scope"); задача 3 — отдельный PR. При разбивке через `plan`/`issues`
рассмотреть, требуется ли epic base branch (ADR-025) — при объёме в 2 PR это, вероятно, не
обязательно, но окончательное решение — на этапе `plan`.
