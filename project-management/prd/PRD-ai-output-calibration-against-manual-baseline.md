# PRD: AI Output Calibration Against Manual Baseline (EPIC-24 / Phase 17)

**Дата**: 2026-08-19
**Статус**: Draft
**Затрагиваемое приложение**: apps/api (PromptTemplate content, схемы Prompt 1/2, seed данные);
project-management (golden dataset документация/лог сравнений)
**Связанный backlog-пункт**: новая фича — в `docs/07_task_backlog.md` ещё не внесена как TASK-XXX.
Уже описана на уровне эпика/фазы в `docs/05_epics.md` (EPIC-24, строки 1725–1828),
`docs/06_roadmap.md` (Phase 17, строки 1317–1369) и методологически в
`docs/10_calibration_and_parity.md` — этот PRD не заменяет эти документы, а служит мостом к
дроблению на конкретные TASK-XXX.

## Цель

Откалибровать содержимое `PromptTemplate` для Prompt 1 (vacancy analysis) и Prompt 2 (targeted CV
content) так, чтобы AI-результат сходился с тем, что project owner производит вручную в ChatGPT
web app для той же вакансии — используя реальные исторические пары (вакансия, вручную сделанное
CV) как ground truth. Без этого продукт остаётся "AI-generated and hoped for the best", а не
проверенной заменой рабочего ручного процесса (`docs/05_epics.md` EPIC-24 Business Value).

## Контекст и согласованность с проектом

- Затрагивает `pipeline/` (Prompt 1/2 input builders — уже готовы, не меняются по существу),
  `prompt-templates/` (новые версии контента), `ai/` (не меняется — абстракция провайдера уже
  есть), возможно `pipeline/schemas/vacancy-analysis.schema.ts` и
  `targeted-cv-content.schema.ts` (если аудит найдёт web-app-специфичные допущения, требующие
  нового поля вроде `needs_verification`).
- Canonical-артефакты: `01_vacancy_analysis.md/json`, `02_targeted_cv_content.md/json` —
  формат/схема не меняется этим эпиком по умолчанию, меняется только содержимое промпта, которое
  их производит.
- Предпосылка полностью закрыта: EPIC-23/Phase 16 (TASK-094–101, DONE 2026-08-15) — реальный
  контент knowledge sources и manual note уже доходят до модели
  (`docs/10_calibration_and_parity.md` §1, §2 пункты 1–3). `quality_score` уже добавлен в обе
  схемы (TASK-100, DONE).
- Связанные ADR: не пересекается напрямую ни с одним Accepted ADR из `DECISIONS.md` — новых
  конфликтов не найдено. Соблюдает Prompt Pipeline Rules корневого `CLAUDE.md` ("never silently
  overwrite a template version") и `docs/07_task_backlog.md` §1 scope rules (Prompt 3/5 остаются
  P1, эта фича их не трогает).
- Зависимости (per `docs/05_epics.md` EPIC-24 Dependencies, строки 1799–1806) — все ниже DONE, но
  перечислены явно для трассируемости:
  - EPIC-23 Knowledge Source Content Wiring & Manual Note Injection (Phase 16) — DONE, разобрано
    выше.
  - EPIC-22 Full Pipeline Control UI (Phase 15) — DONE; golden-кейсы прогоняются через этот UI,
    без ручных API-вызовов.
  - EPIC-08 Prompt 1 Vacancy Analysis & Decision Gate, EPIC-10 Prompt 2 Targeted CV Content
    Generation — DONE; сами шаги пайплайна, содержимое которых калибруется.
  - EPIC-07 Prompt Template Versioning — DONE; механизм версионирования, поверх которого работает
    вся итерация калибровки.

## Пользовательские сценарии

- Project owner загружает golden-вакансию через существующий UI (EPIC-22) → пайплайн выдаёт
  Prompt 1/2 результат с реальным knowledge-source контентом → project owner сравнивает результат
  с уже отправленным вручную CV по структурированной методике → расхождения фиксируются и ведут к
  новой версии `PromptTemplate`.
- Разработчик (Claude Code или project owner), открывший `PromptTemplate` после калибровки, видит
  версионную историю итераций вместо одного черновика "placeholder content".

## В скоупе

- Импорт и адаптация текста из `apps/api/prisma/prompts/!prompt_1_0_3_...txt` и
  `!prompt_2_0_1_...txt` (уже реально используемый вручную текст, не черновик) как нового
  контента `PromptTemplate` для `prompt_1`/`prompt_2` — новая версия, старая (`v1`/`v2`
  placeholder) сохраняется неактивной, не перезаписывается.
- Аудит каждого импортированного промпта на допущения, специфичные для ChatGPT web app (live
  browsing, файловые вложения, неявная сессионная память) — по каждому найденному: либо
  замаппить на существующий механизм (carry-forward предыдущих шагов, manual note, JSON-schema
  output вместо свободного Markdown), либо переформулировать инструкцию с явным fallback
  (`needs_verification`, по аналогии с существующим `needs_evidence`).
- Построение golden dataset из реальных уже обработанных папок (например `Action1/`, `Amach/` —
  см. `docs/00_product_vision_updated_consistent.md` §3): исходный текст вакансии + реально
  отправленное CV + skip reason (если применимо). Формат записи — по
  `docs/10_calibration_and_parity.md` §3.2.
- Прогон каждого golden-кейса через реальный pipeline (Prompt 1 → Prompt 2) через существующий
  `apps/web` UI, с реальным knowledge-source контентом и manual note.
- Структурное (не line-diff) сравнение AI-результата с ручным baseline: apply/maybe/skip
  decision match + посекционное сравнение CV (headline, summary, top skills, experience bullets,
  evidence table/`needs evidence` флаги) — методология `docs/10_calibration_and_parity.md` §4.
- Итерация версий `PromptTemplate` до выполнения convergence criteria
  (`docs/10_calibration_and_parity.md` §5) или документированное принятое исключение с
  обоснованием.

## Не в скоупе

- Автоматическое/LLM-as-judge сравнение — в этом первом проходе сравнение только ручное
  (`docs/10_calibration_and_parity.md` §7).
- Новые шаги промпт-пайплайна сверх Prompt 1/Prompt 2 — этот эпик калибрует существующие два
  шага, не добавляет новые (EPIC-24 Out of Scope, `docs/05_epics.md` строка 1792).
- Калибровка Prompt 3 (pre-PDF check) и Prompt 5 (final check) — только Prompt 1/2, до достижения
  паритета по ним (EPIC-24 Out of Scope).
- Полноценная multi-turn conversation система взамен одиночного накопительного поля manual note
  из Phase 16 — не строится.
- Новая capability (например реальный web search) для закрытия web-app-специфичного пробела —
  фиксируется как известное ограничение через `needs_verification`; решение строить или нет —
  отдельный follow-up после того, как реальные промпт-файлы покажут фактическую потребность
  (EPIC-24 Out of Scope, `docs/05_epics.md` строки 1795–1797).
- Phase 18 / EPIC-25 (Manual Parity Testing на новых вакансиях вне golden-сета) — отдельный
  следующий эпик, стартует только после того, как этот эпик достигнет convergence.

## Влияние на state machine

Не применимо: фича не меняет `ApplicationWorkspace.status`, `reviewState` или `currentDecision`.
Golden-кейсы прогоняются через уже существующие статусные переходы пайплайна без изменений в них.

## Влияние на модель данных

- `PromptTemplate`: новые версии контента для `prompt_1`/`prompt_2` (существующий механизм
  версионирования, без изменения схемы таблицы).
- Возможное (условное, зависит от результата аудита в разделе "В скоупе") добавление поля
  `needs_verification` (или аналогичного) в `VacancyAnalysis`/`TargetedCvContentOutput`
  TypeScript-типы и Zod/class-validator схемы (`pipeline/schemas/vacancy-analysis.schema.ts`,
  `targeted-cv-content.schema.ts`) — по прецеденту `quality_score` (TASK-100): additive поле,
  новая активная версия промпта, старая версия сохраняется неактивной. Требует миграции только
  если поле добавляется на уровне Prisma-модели (сомнительно — `needs_evidence`/`quality_score`
  сегодня живут внутри JSON-артефакта, не как отдельные колонки `ApplicationWorkspace`).
- Golden dataset: где физически хранить — открытый вопрос (см. ниже), решение не должно нарушать
  ADR-002 (PostgreSQL — метаданные, файловая система — физические артефакты); реальные CV-тексты
  golden-кейсов — это скорее файловые артефакты, чем строки в БД.

## API-поверхность

Новых HTTP endpoints не предполагается — калибровка использует уже существующие
`run-analysis`/`generate-cv-content` эндпоинты через `apps/web` UI. Если аудит потребует новое
поле в выходной схеме (`needs_verification`), это не HTTP-контракт, а форма AI-JSON-вывода,
Swagger-документация не требуется (не DTO, а `PromptTemplate`-driven output).

## Ключевые инварианты

- Prompt Pipeline Rules (корневой `CLAUDE.md`): Prompt 1 всегда останавливается на human review;
  Prompt 2 запускается только после apply/maybe approval — калибровка не меняет эти гейты, только
  контент промптов.
- Anti-Overclaiming Rules: новый промпт-текст должен продолжать помечать неподтверждённые
  утверждения как `needs evidence`, разделять commercial/personal опыт, не выдавать
  personal AI/FastAPI/OpenAI/MCP/Claude Code работу за commercial production experience — при
  адаптации `!prompt_1.../!prompt_2...` текста это нужно явно перепроверить, а не считать
  автоматически выполненным только потому, что текст "уже проверен вручную" (ручной ChatGPT-флоу
  не был связан этим правилом до появления пайплайна).
- "Never silently overwrite a template version" — каждая итерация калибровки создаёт новую
  версию `PromptTemplate`, а не правит существующую строку.
- `seed.ts`'s upsert-логика (исправлена в TASK-100) уже поддерживает несколько **версий** на шаг
  при сохранении инварианта "ровно одна **активная** версия на шаг" (root `CLAUDE.md`: "one active
  version per type at a time") — использовать её как есть, не откатывать и не заводить свою.

## Технические ограничения

- AI provider abstraction не меняется — калибровка работает поверх существующего `AiProvider`
  интерфейса (`AI_PROVIDER=openai` для реальных прогонов golden-кейсов, `fake` для юнит-тестов
  нового кода, если он появится).
- Реальные прогоны golden dataset через OpenAI требуют реального `OPENAI_API_KEY` и упираются в
  tier-лимиты org (уже зафиксировано в TASK-097's TEST_LOG spot-check: 30,000 TPM лимит) — при
  большом golden-датасете это может стать практическим ограничением скорости итераций, не
  архитектурным.
- Сравнение golden-кейсов — ручной процесс (не в скоупе автоматизации), но фиксация результата
  сравнения должна быть в текстовом/табличном виде, пригодном для последующего аудита (не устный
  вывод в чате).

## Критерии готовности (Acceptance Criteria)

- [ ] `PromptTemplate` контент для `prompt_1`/`prompt_2` основан на реальном
      `!prompt_1_0_3_...txt`/`!prompt_2_0_1_...txt` тексте, не написан с нуля; `prisma/seed.ts`
      больше не помечает эти шаги как "Placeholder content pending prompt-engineering review".
- [ ] Каждое найденное web-app-специфичное допущение (browsing, attachments, session memory)
      явно задокументировано с решением: либо замаплено на существующий механизм, либо
      переформулировано с `needs_verification`-подобным fallback — ни одно не отброшено молча.
- [ ] Golden dataset существует, задокументирован в формате `docs/10_calibration_and_parity.md`
      §3.2, и содержит ≥1 реальный кейс на каждый исход (apply, maybe, skip — если такие кейсы
      реально существуют в истории project owner).
- [ ] Для каждого golden-кейса зафиксирован результат сравнения: decision match (да/нет + note) и
      посекционный вердикт для CV-контента (match/partial/mismatch + note).
- [ ] Convergence criteria из `docs/10_calibration_and_parity.md` §5 выполнены для всего golden
      набора, либо задокументированные исключения зафиксированы с обоснованием (не молча
      проигнорированы).
- [ ] *(добавлено этим PRD, отсутствует в `docs/05_epics.md`'s собственном AC-списке — прямое
      требование `CLAUDE.md`'s Anti-Overclaiming Rules)* Anti-overclaiming правила (needs
      evidence, commercial/personal разделение) верифицированы против адаптированного текста
      промптов, а не унаследованы автоматически из ручного ChatGPT-флоу.
- [ ] Версионная история `PromptTemplate` отражает итерации калибровки (несколько версий,
      предыдущие сохранены неактивными, не перезаписаны).

## Test Requirement (набросок)

- Юнит-тесты для любого нового кода схемы (например поле `needs_verification`, если добавляется)
  — по образцу существующих тестов `quality_score` (TASK-100).
- Ручная верификация — основной метод проверки самой калибровки (сравнение golden-кейсов не
  автоматизируется в этом эпике); фиксация в `project-management/TEST_LOG.md` по каждому
  golden-кейсу или пакету кейсов, аналогично существующим manual-verification записям
  (TASK-072, TASK-091).
- Существующий unit/e2e набор (`apps/api`) должен остаться зелёным — калибровка не должна менять
  поведение input builders или state machine.

## Открытые вопросы

- Где физически хранить golden dataset — отдельная папка рядом с `knowledge-sources/`, файл(ы) в
  `project-management/`, или отдельные workspace-записи, созданные специально для калибровки?
  `docs/10_calibration_and_parity.md` §3.2 сознательно оставляет это implementation-решением для
  Phase 17, но не для этого PRD — нужно решение до дробления на TASK-XXX, иначе первая же
  подзадача упрётся в неопределённость.
- Сколько golden-кейсов минимально нужно для "покрытия" (документ не даёт числа, только "full
  golden set" по каждому исходу apply/maybe/skip)? Сколько реальных завершённых папок
  (`Action1/`, `Amach/` и др.) вообще пригодны как golden-кейсы (есть и вакансия, и реально
  отправленное CV)?
- Кто выполняет посекционное сравнение и фиксацию результата — Claude Code (читает оба текста и
  формирует вердикт) или project owner вручную? Это влияет на то, разбивается ли эта часть на
  отдельную задачу с чёткими Acceptance Criteria или остаётся ручным шагом project owner вне
  Claude Code.
- Аудит web-app-специфичных допущений (browsing, attachments, session memory) может выявить
  дополнительные пробелы сверх уже перечисленных трёх — объём этой части неизвестен до реального
  прочтения `!prompt_1.../!prompt_2...` текста целиком (в этом PRD прочитан только фрагмент
  `!prompt_1...`).
- Нужна ли новая схема-поле (`needs_verification`) точно, или существующего `needs_evidence`
  окажется достаточно после переформулировки инструкций? Решается только по факту аудита, не
  заранее.

## Документация, которую потребуется обновить

- `docs/07_task_backlog.md` — новый раздел с TASK-XXX записями для этого эпика (после дробления
  ниже).
- `project-management/EPIC_PROGRESS.md` — уже устарел (не отражает реальный DONE-статус ранних
  фаз); при старте этого эпика стоит либо исправить его целиком, либо явно пометить как
  неактуальный — вне скоупа этого PRD, но стоит внимания при первом TASK-XXX.
- `apps/api/prisma/seed.ts` — комментарии "Placeholder content pending prompt-engineering review"
  должны быть убраны/обновлены по мере импорта реального текста.
- Если аудит найдёт необходимость нового поля в схеме — `docs/08_ai_pipeline.md` (контракт
  Prompt 1/2 output) и `apps/api/CLAUDE.md`, если меняется структура модуля.
- `docs/10_calibration_and_parity.md` сам по себе, вероятно, потребует финального апдейта с
  фактическим golden dataset location/логом сравнений после решения открытых вопросов выше.

## Предполагаемое дробление на подзадачи (эпик)

Черновой, кандидатный список тем для будущих TASK-XXX — без номеров (нумерация последовательная и
назначается вручную в `docs/07_task_backlog.md`):

1. **Импорт и адаптация Prompt 1 текста** — перенести `!prompt_1_0_3_...txt` в новую версию
   `PromptTemplate` (`prompt_1`), включая аудит web-app-специфичных допущений для этого шага.
   Покрывает AC "PromptTemplate контент для prompt_1..." и "web-app допущения задокументированы".
2. **Импорт и адаптация Prompt 2 текста** — то же для `prompt_2` / `!prompt_2_0_1_...txt`.
   Зависит от темы 1 (общий подход к аудиту допущений и, возможно, к схема-полю
   `needs_verification` должен быть согласован один раз, не дважды по-разному).
3. **Golden dataset — сбор и документирование** — выбрать реальные завершённые папки, записать в
   согласованном формате (после решения открытого вопроса про место хранения). Покрывает AC
   "Golden dataset существует...".
4. **Golden dataset — прогон и сравнение** — прогнать каждый кейс через реальный pipeline,
   зафиксировать decision match + посекционный вердикт. Зависит от тем 1–3. Покрывает AC
   "Для каждого golden-кейса зафиксирован результат сравнения".
5. **Итерация до convergence** — по результатам темы 4, при необходимости новые версии
   `PromptTemplate` и повторный прогон. Зависит от темы 4, может потребовать несколько раундов
   (не одна задача с фиксированным концом — стоит явно обсудить с project owner, как оформлять
   повторные раунды: одна задача на раунд, или один TASK на весь итеративный процесс).

Порядок 1→2→(3 может идти параллельно с 1/2)→4→5.

Рекомендуется epic base branch: `task/TASK-XXX-ai-calibration-base` (ADR-025), т.к. это
многошаговый эпик с независимо тестируемыми частями (импорт промптов, сбор датасета, прогон,
итерация), которые не имеет смысла закрывать одним PR, и `main` должен оставаться releasable на
всём протяжении калибровочных итераций.
