# PRD: Prompt 3 (Pre-PDF Check) Calibration Against Manual Baseline (EPIC-24 extension)

**Дата**: 2026-08-24
**Статус**: Draft
**Затрагиваемое приложение**: apps/api (`PromptTemplate` контент для `prompt_3`, возможно
`pipeline/schemas/pre-pdf-check.schema.ts` по итогам аудита); project-management (golden dataset
документация/лог сравнений — расширение уже существующих `comparison.md`)
**Связанный issue/backlog-пункт**: новая фича — ещё не заведена как issue. Расширяет EPIC-24
(`docs/05_epics.md`, строки 1725–1832) новым скоупом; EPIC-24's собственный текст (строка 1796:
"Calibrating Prompt 3/Prompt 5 (pre-PDF/final check) — out of scope until the core Prompt 1/2
parity is reached") явно откладывал, а не исключал этот скоуп — условие снято закрытием #212
(decision-level, Фаза 5) и #237/#238 (content-level, Фаза 7) 2026-08-24.

## Цель

Откалибровать содержимое `PromptTemplate` для Prompt 3 (pre-PDF check) так, чтобы его
рекомендации (corrections, readiness verdict, BOP-style check) сходились с тем, что project owner
реально делает вручную перед отправкой CV — используя ту же методологию (`docs/10_calibration_and_parity.md`
§4), которую EPIC-24 уже применил к Prompt 1/2. Без этого шаг, который реально подставляет текст в
финальный PDF (`applyCorrectionsToCvContent`), продолжает работать на неоткалиброванном
placeholder-контенте, хотя технически уже полноценно wired в export-путь.

## Контекст и согласованность с проектом

- Затрагивает `pipeline/prompt3/` (`Prompt3InputBuilderService`, `Prompt3Service` — планировалось,
  что структура не меняется, меняется только `PromptTemplate` контент; **пересмотрено 2026-08-24
  в ISSUE-247** — `Prompt3InputBuilderService` теперь также загружает `tech_stack`/`career_cases`
  knowledge sources и сырой `00_vacancy_source.txt`, см. `docs/10_calibration_and_parity.md` §2.8
  item 3's follow-up note),
  `prompt-templates/` (новая версия контента для `prompt_3`), `pipeline/schemas/pre-pdf-check.schema.ts`
  (условно, только если аудит найдёт необходимость нового поля — по прецеденту `quality_score`).
- Canonical-артефакты: `03_pre_pdf_check.md/json` — формат/схема не меняется по умолчанию,
  меняется только содержимое промпта, которое их производит.
- Подтверждено в этой сессии прямым чтением кода (не по памяти):
  - `Prompt3InputBuilderService.buildPrompt3Input()` (`apps/api/src/pipeline/prompt3/prompt3-input-builder.service.ts:26-79`)
    читает `02_targeted_cv_content.json` + опционально `01_vacancy_analysis.json` как контекст —
    никакого golden-dataset-специфичного файла не читает; вход детерминирован уже существующими
    артефактами.
  - `HtmlRendererService.renderToHtml()` (`apps/api/src/document-export/html-renderer.service.ts:63-65,87-113`)
    реально читает `03_pre_pdf_check.json`, если он существует, и передаёт его `corrections` в
    `renderCvTemplate()`.
  - `applyCorrectionsToCvContent()` (`apps/api/src/document-export/cv-template-renderer.ts:257-270`)
    подменяет текст по `field_path` → `suggested_text` в глубокой копии CV-контента **до**
    финального HTML/PDF-рендера — это реальный, нагруженный (load-bearing) путь, не декоративный.
  - `export_blocked` (обязательное поле `pre-pdf-check.schema.ts:24`, провалидировано как
    required) нигде не читается в export-пути — ни `DocumentExportService`, ни
    `HtmlRendererService`, ни контроллер его не проверяют. Это не баг этого PRD (существовало и до
    него). **Решено (2026-08-24, подтверждено project owner): остаётся advisory-only** — поле
    продолжает генерироваться и попадать в `03_pre_pdf_check.md` как информация для человека, но
    export-путь его не enforce-ит, согласуясь с уже принятой философией ADR-026 ("AI не
    блокирует, человек решает"). Никакого код-изменения в export-пути в рамках этого PRD не
    требуется; решение фиксируется явно, а не оставляется молча неопределённым.
  - Активная версия `prompt_3_pre_pdf_check` в БД (проверено прямым Prisma-запросом в этой сессии):
    `v1, isActive: true, description: "...Placeholder content pending full prompt-engineering
    review"`, содержимое — `apps/api/prisma/prompts/prompt3.txt` (34 строки, generic-контракт без
    детальных проверок). Это единственная версия — калибровка ещё не проводилась ни разу.
  - Project owner располагает вручную отточенным референс-текстом
    (`!prompt_3_final_pre-PDF_check_CURRENT_WORK_SYNC.txt`, вставлен в этой сессии) — заметно
    богаче текущего placeholder: раздел "0. Current-work block check", vacancy fit, evidence
    safety, Tech Stack Matrix compliance, German market fit, PDF layout readiness, "BOP natural
    public-CV style check" (16 известных неестественно звучащих AI-паттернов с конкретными
    заменами), и Output Quality Score-рубрика (5 критериев × 20 баллов) — структурно та же схема
    расчёта итогового балла, что уже использовалась для Prompt 1/2 калибровки.
  - Проверено содержимое golden-dataset `manual-cv.md` для всех 4 применимых кейсов: **`bjak_20260717`
    и `cello_20260718` уже содержат явный "Version 2 — Pre-PDF Check"-раздел** внутри своих
    `manual-cv.md` (`bjak_20260717/manual-cv.md:461` "Version 2 — EGZ Added + Final Pre-PDF Check",
    `:666` "Output Quality Score — Prompt 3"; `cello_20260718/manual-cv.md:505` "Version 2 —
    Pre-PDF Check and EGZ Update") — то есть реальный, уже задокументированный ручной
    Prompt-3-эквивалент существует для этих 2 кейсов без необходимости заводить новые вакансии.
    `motion_20260715`/`jobgether_20260625` проверены полным чтением и **исключены** как
    golden-кейсы для Prompt 3: `motion_20260715`'s "Version 2" (строка 488) — это
    "Targeted CV Content with EGZ for Germany-based application", content-ревизия (эквивалент
    повторного Prompt 2), не pre-PDF-check пасс; у `jobgether_20260625` секции "Version 2" нет
    вообще (только "Version 1" дважды, файл лишь рекомендует Prompt 3 как следующий шаг, но не
    содержит реально пройденного пасса). Golden-сравнение для Prompt 3 работает только на
    `bjak_20260717`/`cello_20260718`.
- Связанные ADR: ADR-026 ("Prompt 3 pre-PDF check становится mandatory-but-skippable gate...
  readiness verdict сам по себе никогда не блокирует export, блокирует только факт
  запуска-или-скипа") — этот PRD не меняет ADR-026's поведение гейта, только контент промпта,
  который производит рекомендации внутри уже существующего гейта. Прямого конфликта с Accepted ADR
  не найдено.
- `docs/07_task_backlog.md` §1 scope rules: "Prompt 3 and Prompt 5 are P1 optional, not MVP
  blockers" — это правило про то, что Prompt 3 **не обязателен** для прохождения пайплайна
  (уже реализовано так через ADR-026's skip-путь), не про запрет его калибровать. Конфликта нет —
  калибровка контента не переводит Prompt 3 в MVP-блокер.
- **Трактовка двух Out-of-Scope пунктов EPIC-24 — решено (2026-08-24, подтверждено project
  owner):** `docs/05_epics.md`'s "Out of Scope" для EPIC-24 содержит два разных пункта — (a) строка
  1795: "New prompt steps beyond Prompt 1/Prompt 2" (без условия "until") и (b) строка 1796:
  "Calibrating Prompt 3/Prompt 5 (pre-PDF/final check) — out of scope until the core Prompt 1/2
  parity is reached" (явно deferred, не excluded). Принятое чтение: пункт (a) относится к запрету
  **добавлять новые** AI-шаги пайплайна (Prompt 6+, которых физически ещё нет в коде), пункт (b) —
  более специфичный, напрямую адресует калибровку уже существующего, реализованного Prompt 3, с
  явным условием снятия, которое сегодня выполнено. Этот PRD в скоупе EPIC-24.

## Зависимости

Per `docs/05_epics.md` EPIC-24 Dependencies (строки 1802–1809, все статусы ниже DONE):

- EPIC-23 Knowledge Source Content Wiring & Manual Note Injection — DONE.
- EPIC-22 Full Pipeline Control UI — DONE; Prompt 3 уже запускается через `apps/web` UI
  (`pre-pdf-check-panel.tsx`) без ручных API-вызовов.
- EPIC-08 Prompt 1 Vacancy Analysis & Decision Gate, EPIC-10 Prompt 2 Targeted CV Content
  Generation — DONE.
- EPIC-07 Prompt Template Versioning — DONE; тот же версионный механизм, поверх которого работал
  Prompt 1/2, применяется к Prompt 3 без изменений.

Дополнительная, специфичная для этого расширения зависимость (не из исходного EPIC-24 списка,
т.к. её тогда не было): **EPIC-24 Фаза 5 (#212) и Фаза 7 (#237/#238) — обе DONE**, это и есть
условие "until the core Prompt 1/2 parity is reached", снятое сегодня (2026-08-24). Без этого
Prompt 3 калибровался бы поверх ещё нестабильного Prompt 1/2 выхода, что дало бы нестабильный
сигнал (та же логика, что уже применялась к самому Prompt 2 в исходном PRD).

## Пользовательские сценарии

- Project owner запускает pre-PDF check для golden-кейса (`bjak_20260717` или `cello_20260718`,
  через `apps/web` UI) → сравнивает AI-рекомендации (`corrections`, `readiness`, BOP-style
  findings) с уже задокументированным ручным "Version 2 — Pre-PDF Check" разделом того же кейса →
  расхождения фиксируются и ведут к новой версии `PromptTemplate` для `prompt_3`.
- Разработчик (Claude Code или project owner), открывший `prompt_3` `PromptTemplate` после
  калибровки, видит версионную историю итераций вместо одного placeholder-черновика — как уже
  сделано для `prompt_1`/`prompt_2`.

## В скоупе

- Импорт и адаптация текста из `!prompt_3_final_pre-PDF_check_CURRENT_WORK_SYNC.txt` как нового
  контента `PromptTemplate` для `prompt_3` — новая версия, `v1` placeholder сохраняется неактивной,
  не перезаписывается.
- Аудит импортированного текста на допущения, специфичные для ChatGPT web app (live browsing,
  файловые вложения, неявная сессионная память) — та же методология, что уже применена к Prompt
  1/2 (issues #193/#198): каждое найденное допущение либо маппится на существующий механизм, либо
  переформулируется с явным fallback.
- Проверка/адаптация схемы вывода Prompt 3 (`pre-pdf-check.schema.ts`) под реально импортированный
  текст, если аудит найдёт поля референс-текста, которых в текущей схеме нет (например,
  структурированный результат "Current-work block check") — по прецеденту `quality_score`
  (additive поле, новая версия). **Решено (2026-08-24): BOP-style findings НЕ выносятся в отдельное
  поле схемы** — переиспользуют существующий `corrections` (`field_path`/`original_text`/
  `suggested_text`/`reason`), в котором BOP-находка ложится 1:1 (`reason` = "звучит как внутренний
  AI-аудит, не как естественная CV-формулировка"). Проверка конвергенции BOP-check делается
  внешне относительно схемы: грепом по 16 известным паттернам во входном CV-контенте против
  финального экспортированного текста (после применения `corrections`) — если паттерн был на входе
  и отсутствует на выходе, значит поймали; если остался — пропуск. Не требует нового поля,
  не требует новой версии контракта, снимает риск, что модель будет путать `corrections` и
  отдельное `bop_findings` поле.
- Golden-сравнение: прогнать Prompt 3 для `bjak_20260717` и `cello_20260718` (у которых уже есть
  задокументированный ручной "Version 2 — Pre-PDF Check" эквивалент в `manual-cv.md`) через
  реальный pipeline, сравнить результат по методологии, аналогичной `docs/10_calibration_and_parity.md`
  §4 (посекционно, не line-diff): совпадают ли найденные проблемы, совпадает ли `readiness`
  вердикт с фактическим решением project owner, ловит ли BOP-style check те же формулировки,
  которые вручную были заменены в manual-версии.
- Итерация версий `PromptTemplate` для `prompt_3` до выполнения расширенных convergence criteria
  (см. следующий пункт) или документированное принятое исключение.
- Расширение `docs/10_calibration_and_parity.md` §5 (Convergence Criteria) собственными критериями
  для Prompt 3, поскольку текущий §5 сформулирован специфично под decision-match/content-match
  Prompt 1/2 и не покрывает вывод Prompt 3 напрямую. Кандидатные критерии (подлежат подтверждению
  project owner, не финализированы этим PRD):
  - `corrections` предлагают валидные `field_path` (существующее поле в `CvContent`) и не ссылаются
    на несуществующие пути;
  - `corrections` не изобретают факты, отсутствующие в `02_targeted_cv_content.json`;
  - BOP-style check реально ловит известные проблемные паттерны (16 из референс-текста), если они
    присутствуют во входном CV-контенте;
  - `readiness`-вердикт согласуется с решением, которое project owner фактически принял в ручном
    "Version 2"-разделе того же golden-кейса.

## Не в скоупе

- Калибровка Prompt 5 (final check) — остаётся отложенной, условие её снятия ("until Prompt 1/2
  parity") в этом PRD не расширяется на неё; отдельное решение понадобится отдельно.
- Enforcement `export_blocked` в export-пути — решено оставить advisory-only (см. "Контекст и
  согласованность с проектом"); реальная блокировка экспорта на основе этого поля не строится в
  рамках этого PRD. Если в будущем потребуется enforcement — отдельная задача вне калибровки
  контента промпта (код-изменение в `DocumentExportService`, не в `PromptTemplate`).
- Автоматическое/LLM-as-judge сравнение — сравнение остаётся ручным, как и для Prompt 1/2
  (`docs/10_calibration_and_parity.md` §7, EPIC-24 Out of Scope).
- Новые AI-шаги пайплайна (Prompt 6+) — не создаются; этот PRD калибрует существующий Prompt 3, не
  добавляет новый шаг (см. "Трактовка двух Out-of-Scope пунктов EPIC-24" выше).
- Полноценный прогон Phase 4's отложенных ~188 кейсов (#230, OPTIONAL/DEFERRED) — не в скоупе этого
  расширения; golden-сравнение здесь работает на той же 2-4-кейсовой репрезентативной подвыборке,
  что уже использовалась для Prompt 1/2.
- EPIC-25 (Manual Parity Testing на новых вакансиях вне golden-сета) — отдельный следующий эпик,
  не расширяется этим PRD на Prompt 3 автоматически; если после этой калибровки понадобится
  parity-тест для Prompt 3 на новых вакансиях, это отдельное решение по аналогии с тем, как
  EPIC-25 уже спланирован для Prompt 1/2.

## Влияние на state machine

Не применимо: фича не меняет `ApplicationWorkspace.status`, `reviewState` или `currentDecision`.
Golden-кейсы прогоняются через уже существующий `pre_pdf_check_ready → paused_before_export`
переход (ADR-026) без изменений в нём.

## Влияние на модель данных

- `PromptTemplate`: новая версия контента для `prompt_3` (существующий механизм версионирования,
  без изменения схемы таблицы).
- BOP-style findings не требуют изменения `pre-pdf-check.schema.ts` (решено — переиспользуют
  `corrections`). Условно (по итогам аудита раздела "В скоупе"): возможное additive-поле только
  для "Current-work block check", если аудит найдёт, что `corrections` для этого недостаточно
  выразителен — не Prisma-модель, JSON-артефакт, как `quality_score` сегодня, не требует миграции
  БД.

## API-поверхность

Новых HTTP endpoints не предполагается — калибровка использует уже существующий
`run-pre-pdf-check`/`skip-pre-pdf-check` эндпоинты через `apps/web` UI. Если аудит потребует новое
поле в выходной схеме, это форма AI-JSON-вывода, не DTO — Swagger-документация не требуется.

## Ключевые инварианты

- "Never silently overwrite a template version" — каждая итерация калибровки создаёт новую версию
  `PromptTemplate` для `prompt_3`, не правит существующую строку (тот же инвариант, что уже
  соблюдён для `prompt_1`/`prompt_2`, включая недавний код-фикс в #238, где ровно из-за корректной
  диагностики новая версия `prompt_2` не потребовалась).
- ADR-026: Prompt 3 остаётся mandatory-but-skippable gate; калибровка контента не меняет это
  поведение — `readiness`-вердикт по-прежнему не блокирует export, блокирует только факт
  запуска/скипа гейта.
- Anti-Overclaiming Rules: адаптированный текст `prompt_3` должен продолжать помечать
  неподтверждённые `corrections` предложения так же осторожно, как остальной pipeline (BOP-check
  сам по себе — про естественность звучания, не про safety, но `corrections` не должны вводить
  новые unsupported claims в CV) — нужно явно перепроверить при импорте, не считать унаследованным
  автоматически.
- `field_path`-валидность: любая `correction`, которую `prompt_3` предлагает, должна ссылаться на
  реально существующее поле `CvContent` (`cv-template-renderer.ts`'s `setByPath` не валидирует
  путь заранее — несуществующий `field_path` сегодня тихо создаёт новое поле в клоне объекта,
  либо падает, в зависимости от структуры пути; это существующее поведение кода, не то, что меняет
  этот PRD, но калиброванный промпт не должен полагаться на непроверенные пути).

## Технические ограничения

- AI provider abstraction не меняется — калибровка работает поверх существующего `AiProvider`
  (реальные прогоны golden-кейсов через `AI_PROVIDER=openai`, `fake` для юнит-тестов нового кода,
  если он появится).
- Реальные прогоны через OpenAI требуют реального `OPENAI_API_KEY` и упираются в те же tier-лимиты,
  что уже задокументированы для Prompt 1/2 калибровки.
- Сравнение golden-кейсов — ручной процесс; фиксация результата должна быть в
  текстовом/табличном виде (расширение существующих `comparison.md` на каждый затронутый кейс),
  не устный вывод в чате — тот же паттерн, что уже используется.

## Критерии готовности (Acceptance Criteria)

- [ ] `PromptTemplate` контент для `prompt_3` основан на реальном
      `!prompt_3_final_pre-PDF_check_CURRENT_WORK_SYNC.txt` тексте, не написан с нуля; `prisma/seed.ts`
      / БД больше не помечает `prompt_3` как "Placeholder content pending full prompt-engineering
      review".
- [ ] Каждое найденное web-app-специфичное допущение в тексте `prompt_3` явно задокументировано с
      решением (замаплено на существующий механизм либо переформулировано с fallback) — ни одно не
      отброшено молча. *(зеркалит EPIC-24's исходный AC "Any instruction that previously assumed
      live web verification is reworded...", применённый теперь к Prompt 3)*
- [ ] Для `bjak_20260717` и `cello_20260718` (уже имеющих ручной "Version 2 — Pre-PDF Check"
      эквивалент) зафиксирован результат golden-сравнения Prompt 3 output против этого ручного
      раздела, по кандидатным критериям из "В скоупе" (field_path-валидность, отсутствие
      изобретённых фактов, BOP-check ловит известные паттерны, readiness согласуется с фактическим
      решением). `motion_20260715`/`jobgether_20260625` проверены и исключены (см. "Контекст и
      согласованность с проектом") — не являются golden-кейсами для Prompt 3.
- [ ] `docs/10_calibration_and_parity.md` §5 расширен собственными convergence-критериями для
      Prompt 3 (не переиспользует decision/content-match критерии Prompt 1/2 буквально, раз они не
      применимы к corrections/readiness/BOP-check напрямую).
- [ ] Convergence по расширенным критериям выполнены для golden-кейсов Prompt 3, либо
      задокументированное принятое исключение зафиксировано с обоснованием.
- [ ] *(добавлено этим PRD, отсутствует в исходном EPIC-24 AC-списке — прямое следствие находки
      этой сессии про `export_blocked`)* Решение "`export_blocked` остаётся advisory-only"
      зафиксировано в `DECISIONS.md` как новый ADR (или явное дополнение к ADR-026) — не оставлено
      только в этом PRD-файле.
- [ ] Версионная история `PromptTemplate` для `prompt_3` отражает итерации калибровки (несколько
      версий, предыдущие сохранены неактивными, не перезаписаны).

## Test Requirement (набросок)

- Юнит-тесты для любого нового кода схемы (если аудит потребует поле в `pre-pdf-check.schema.ts`)
  — по образцу существующих тестов `quality_score`/`current_work_block` (#238).
- Ручная верификация — основной метод проверки самой калибровки; фиксация в
  `project-management/TEST_LOG.md` и в `comparison.md` затронутых golden-кейсов, тем же форматом,
  что уже использован для Prompt 1/2.
- Существующий unit/e2e набор (`apps/api`) должен остаться зелёным.

## Открытые вопросы

Все вопросы решены 2026-08-24 (project owner) — см. соответствующие пункты в "Контекст и
согласованность с проектом" и "В скоупе" выше. Последний: **кто выполняет golden-сравнение** —
решено, Claude Code (как в #238) выполняет глубокое чтение обоих файлов и формирует посекционный
вердикт, project owner направляет и проверяет находки.

## Документация, которую потребуется обновить

- `docs/05_epics.md` — EPIC-24's "Out of Scope" (строка 1796) должен быть обновлён/аннотирован,
  чтобы отразить, что условие "until Prompt 1/2 parity" снято и Prompt 3 калибровка теперь
  in-scope (Prompt 5 остаётся deferred).
- `docs/10_calibration_and_parity.md` — новый раздел convergence-критериев для Prompt 3 (расширение
  §5), возможно новый под-раздел §4 для метода сравнения Prompt 3 output (аналогично существующим
  §4.1/§4.2 для Prompt 1/2).
- `apps/api/prisma/seed.ts` — комментарий "Placeholder content pending prompt-engineering review"
  для `prompt_3` должен быть убран/обновлён по мере импорта реального текста.
- `project-management/DECISIONS.md` — решение "`export_blocked` остаётся advisory-only" (см.
  "Контекст и согласованность с проектом") требует фиксации как новый ADR или явное дополнение к
  ADR-026, которое уже зафиксировало похожую философию для `readiness`.
- Per-case `comparison.md` файлы golden-кейсов (`bjak_20260717`, `cello_20260718`) — новая
  колонка/секция для Prompt 3 результата.

## Предполагаемое дробление на подзадачи (эпик)

Черновой, кандидатный список тем — не сами задачи, номера фаз назначает `.claude/skills/plan`:

1. **Импорт и адаптация Prompt 3 текста** — перенести
   `!prompt_3_final_pre-PDF_check_CURRENT_WORK_SYNC.txt` в новую версию `PromptTemplate`
   (`prompt_3`), включая аудит web-app-специфичных допущений. Покрывает AC "PromptTemplate
   контент для prompt_3..." и "web-app допущения задокументированы". Зеркалит темы 1/2 исходного
   EPIC-24 PRD (импорт Prompt 1/Prompt 2 текста), но для одного промпта, не двух.
2. **Расширение convergence-методологии под Prompt 3** — дополнить
   `docs/10_calibration_and_parity.md` §5 собственными критериями для Prompt 3 (field_path-валидность,
   отсутствие изобретённых фактов, BOP-check ловит известные паттерны, readiness согласуется с
   фактическим решением); зафиксировать решение по `export_blocked` (advisory-only) как ADR в
   `DECISIONS.md`. Зависит от темы 1 (нужно видеть реально импортированный текст).
3. **Golden dataset — прогон и сравнение Prompt 3** — прогнать `bjak_20260717`/`cello_20260718`
   через реальный pipeline, сравнить с ручным "Version 2 — Pre-PDF Check" разделом каждого кейса,
   зафиксировать в `comparison.md`. Зависит от тем 1–2. Покрывает соответствующие AC про
   golden-сравнение.
4. **Итерация до convergence** — по результатам темы 3, новые версии `PromptTemplate`, если
   расхождения найдены (аналог #238's подхода: сначала диагностировать реальную причину, не чинить
   промпт, если причина в другом). Зависит от темы 3, может потребовать несколько раундов — по
   прецеденту #237/#238 (один issue-трекер + issue на раунд).

Порядок: 1 → 2 → 3 → 4 (2 может частично идти параллельно с 3, если критерии становятся ясны
раньше полного анализа).

Эпик достаточно небольшой (один промпт, уже частично отработанная методология) — отдельная epic
base branch (ADR-025), вероятно, не нужна; каждая тема может закрываться отдельным PR напрямую в
`main`, по аналогии с тем, как Фазы 6/7 EPIC-24 (content-level) уже делались без `-base` ветки.
Финальное решение — на этапе `.claude/skills/plan`.
