# CV Generation Quality Refinement — финальная сравнительная валидация (Baseline D против Baseline C)

**Задача:** TASK-B, #702. **Инициатива:** `project-management/prd/PRD-cv-generation-quality-refinement.md`, план — `project-management/plan/PLAN-cv-generation-quality-refinement.md` (Phase 2).
**Даты прогонов:** 2026-11-25 — 2026-11-26 (UTC). **Модель:** gpt-6-luna.
**Основание метода:** [Future Validation and Regression Baseline Protocol](https://github.com/strakhovdenya/jobflow-cv-pipeline/issues/690#issuecomment-7158146161) (далее — протокол), [reproduction notes](https://github.com/strakhovdenya/jobflow-cv-pipeline/issues/690#issuecomment-7148869709), [Baseline C](https://github.com/strakhovdenya/jobflow-cv-pipeline/issues/690#issuecomment-7159756486).

Отчёт публичный: в нём нет текста CV, писем и вакансий — только метрики, классификации, идентификаторы workspace, названия технологий и проектов registry. Приватные материалы — в git-ignored папке `apps/api/storage/cv-quality-refinement-validation/` (далее **D/**).

Термины: S1 Action1, S2 DevCom, S3 Binary Studio, S4 Employment Hero, S5 paddy — пять вакансий регрессионного набора TASK-E. CIW — блок Current Independent Work. F1–F10 — находки [отчёта валидации #690](https://github.com/strakhovdenya/jobflow-cv-pipeline/issues/690#issuecomment-7148778780).

---

## 1. Итог в двух строках

- **Процедура выполнена:** пять сценариев прогнаны в утверждённом порядке, Baseline D сохранён, каждое отличие от Baseline C классифицировано. Процедура отступала от протокола (суффикс компании, одобрение всех сценариев одним решением, повторы Prompt 1, 20 вызовов вместо 17) — раздел 10.
- **Вердикт инициативы: цели достигнуты частично** (решение владельца 2026-11-26, раздел 12). F1, F2, F3, F5, F7 и ограничение Docker — resolved на одном прогоне; F6 — partially resolved; в S4 — материальная регрессия (потеря доказательств безопасности и аутентификации Cards).

---

## 2. Оценки до прогонов (AC-1, AC-2, AC-3)

Оценки записаны только по `00_vacancy_source.txt` (побайтово равны Baseline B) до создания первого workspace Baseline D и до чтения любого CV D.

| Файл (D/) | sha256 | Записан и заморожен (UTC) | Первый workspace D создан (UTC) |
|---|---|---|---|
| `assessments/vacancy-assessments-2026-11-25.md` | `c41920fb543bf94707977fac6d7802286b03e1f34c5924046998f4cafda91e50` | 2026-11-25 20:04:16 (файл read-only) | 2026-11-25 20:16:00 (`cmwwkczlw00036i1qhmy18znb`) |

Время и хеш опубликованы до прогонов в [комментарии #702](https://github.com/strakhovdenya/jobflow-cv-pipeline/issues/702#issuecomment-7173232289).

### 2.1. Требования

| Сценарий | must-have | nice-to-have | ключевые обязанности | подразумеваемые | Статус списка |
|---|---|---|---|---|---|
| S1 Action1 | 7 | 0 | 4 | 1 | original rows kept (7 строк сравнения) + дополнение 2026-11-25 |
| S2 DevCom | 9 | 5 | 0 | 1 | original rows kept (M1–M9, N1–N5, надёжность интеграций); новых строк не потребовалось |
| S3 Binary Studio | 11 | 6 | 10 | 2 | reconstructed 2026-11-25, not original |
| S4 Employment Hero | 6 | 0 | 9 | 3 | reconstructed 2026-11-25, not original |
| S5 paddy | 0 | 0 | 5 | 3 | original rows kept (T1–T5 + немецкий) + дополнение 2026-11-25 |

Оценка Baseline C по этим спискам (протокол §7.4, п. 2) записана до прогона D каждого сценария: `assessments/baseline-C-S3-…`, `baseline-C-S5-…`, `baseline-C-S1-S2-S4-…`.

### 2.2. Классификация AI-запроса (F10)

Классификация — по разделу вакансии, а не по числу ключевых слов.

| Сценарий | must-have | ключевая обязанность | nice-to-have | tooling note | Ожидаемый вес | Ожидаемый вид | Baseline C |
|---|---|---|---|---|---|---|---|
| S1 | — | — | — | — | Not mentioned | — | none |
| S2 | M8 (раздел «Must have») | — | — | — | Core | AI assistants | Core / assistants |
| S3 | — | только оговорка в R6 (раздел «Responsibilities») | N6 (раздел «Nice to have») | строка «Tech Stack» вакансии | Plus | AI assistants | Plus / assistants |
| S4 | M5 (раздел «Who You Are») | R2 («Your key focus areas»), R7 («This will include») | — | «AI First» (раздел «The EH Way») | Core | AI assistants + качество AI-кода | Core / assistants |
| S5 | — | R4 (раздел «Aufgaben») | — | — | Core | LLM / AI API integration | Core / LLM integration |

**Непокрытый сценарий:** «AI-assisted engineering как ключевая обязанность в обычной роли (средний вес)» в наборе не представлен (S2 — одна must-have строка, S4 — AI-first роль, S3 — nice-to-have). Сценарий S6 вне набора и не выполнялся.

### 2.3. Ожидаемый язык писем (F7) и технологии вакансий

| Сценарий | Язык вакансии | Сработавший пункт политики `cover_letter` v6 | Ожидаемый `language` |
|---|---|---|---|
| S1 | английский | п. 3 (язык вакансии); пп. 1–2 не применимы | `en` |
| S5 | немецкий | п. 3 (язык вакансии); пп. 1–2 не применимы | `de`, немецкий не выше подтверждённого A2/B1 |

| Сценарий | Технологии, названные вакансией | Из них в `techStack` JobFlow (область F3) |
|---|---|---|
| S1 | Node.js, JavaScript, TypeScript, React, REST API, DynamoDB, MySQL, AWS (Lambda, EC2), PHP | TypeScript |
| S2 | Node.js, TypeScript, AdonisJS, NestJS, PostgreSQL, Redis, Git, GitLab, AWS, Azure, GitHub Copilot, Cursor, Claude Code, ChatGPT, Jest, React, Solr, Elasticsearch/OpenSearch, Docker, GitLab CI; Agile/Scrum | NestJS, TypeScript, PostgreSQL, Redis, Jest, Docker Compose |
| S3 | Node.js, TypeScript, NestJS, React, Next.js, Tailwind CSS, PostgreSQL, Prisma, Amazon S3, AWS, Microsoft Graph/Outlook, Docker, GitHub Actions, Claude Code, Codex, Cursor; REST API | NestJS, TypeScript, PostgreSQL, Prisma, Docker Compose, GitHub Actions, Next.js |
| S4 | Claude, Cursor, GitHub Copilot, Gemini, Ruby on Rails, React, TypeScript, .NET Core, C#, PostgreSQL, MySQL, Redis, Java, Node.js, Python, Go, Angular, OWASP Top 10, Jira, Slack, Confluence; REST | TypeScript, PostgreSQL, Redis |
| S5 | конкретных технологий нет (APIs, Cloud-Infrastruktur, KI, Testing, Observability, IT-Sicherheit) | — |

Замечание: роль S3 называется «Middle JS Full-Stack Engineer», но JavaScript не попал в замороженный список технологий S3 (упущение подготовки). Метрика F6 считается по замороженному списку; влияние упущения показано в разделе 6.

---

## 3. Проверка базы и окружения перед первым вызовом (AC-4)

Скрипт `D/scripts/env_check.js`, результат `D/env/env-check-2026-11-25T20-00-38-281Z.json`, 2026-11-25 20:00 UTC.

| Проверка | Результат |
|---|---|
| sha256 `baselines/baseline-C/SHA256SUMS.txt` | `0554a81d63b9afbb680ffb02f0197af6d01edae63b6e7953c6ba40e55c634737`; 15 из 15 файлов совпадают |
| `manifest-sha256.txt` (артефакты 12 workspaces A/B) | **98 из 98** совпадают |
| индекс папки VAL (`manifest-local-sha256.txt`) | 90 из 90 |
| вход сценариев | `00_vacancy_source.txt` S1–S5 побайтово равны Baseline B |
| коммит API | `main` @ `d24663f` (merge PR #703, TASK-A); сборка `dist` 2026-11-25 19:58 UTC из чистого дерева |
| активация TASK-A в рабочей БД | `register-knowledge-sources` и `prisma db seed` — 2026-11-25 19:54 UTC, после merge #703 |
| модель (`AiRun.model`) | gpt-6-luna во всех 20 вызовах (17 Baseline D + 3 остановленных и побочных) |
| провайдер | `AI_PROVIDER=openai`, `OPENAI_MODEL=gpt-6-luna`, `OPENAI_TIMEOUT_MS=600000`; `OPENAI_MAX_RETRIES` и `OPENAI_MAX_OUTPUT_TOKENS*` не заданы → значения кода: retries 2, prompt_1 16000, prompt_2 50000, prompt_3 10000, cover_letter 6000 |

Активные шаблоны (содержимое в БД = файл репозитория):

| Шаг | Версия | sha256 содержимого |
|---|---|---|
| prompt_1 | 13 | `7879e9fd6e654cee91bb109d1a126be47edba0d100d3c3ace88f2d9bcdc9cfab` (не менялся с Baseline B) |
| prompt_2 | 13 | `7fd6997ed8b6acf9aa6f651db3115e6d0fd5f74ae135c2b9f96019f9b3ae81f9` |
| prompt_3 | 11 | `11311de4a7e610b99c4851aba8306691cd0aca562580b8fdbcf9e0631c14f04c` |
| cover_letter | 6 | `a000318d656e90da94eff7d6b2628189db551a60eacf363ff718e5bab5e2d022` |

Активные knowledge sources (совпадают с `ACTIVE_KNOWLEDGE_SOURCES` и с хешем файла; тот же набор — в `PromptRun.sourceSnapshot` всех 20 вызовов: 17 Baseline D + 3 остановленных и побочных):

| sourceType | versionLabel | contentHash |
|---|---|---|
| cv_rules | v0_8_generation_quality | `812244e25768b860ff31edfce1d7f9dd117b8a2bba1fe4358038d3b442f3128b` |
| master_cv | v0_8_portfolio_refresh | `fa6946b60d13547ddb5bd0f9024ea456c29252e1c5699a698e6498163fd11651` |
| profile_summary | v0_8_portfolio_refresh | `83083f24ea47b65166b67983b2ac44cda6d306dcf719ece42b3e5b13b23f7be5` |
| project_inventory | v0_8_portfolio_refresh | `f1ad290a118ded5c6dc5d7493892a571f81495aa1fadb1067fed005ce52c829b` |
| career_cases | v0_9_portfolio_refresh | `352b3a155595d98912ba40f2fa5677cb5c583fbcfd329539f5980388b2bc30fb` |
| tech_stack | v2_5_portfolio_refresh | `955a72c9461c6d1aa4d881c1ec8b2ffa73f0e65fdbdf6d96122be09de875bdd2` |
| certifications | 2026-11 | `da1b03a1dbc241309d95b72f6030129a3e39b76c98806ecdee5a28daf9c77b30` |
| layout | 2026-06 | `b8f9fba169d1fc1de4fe954ebc589db4bb69505a20276eccd0f7961dfb6c131b` |
| linkedin_source_decision | v0_3_current_work_sync | `02b0893b377c340dc12f00ce9c98e1ad91f9a48dccd30976b8b4bf830a97c5f2` |

---

## 4. Журнал прогонов (AC-5, TR-2)

Решения владельца записаны на #702: [суффикс, одобрение всех сценариев, правило страниц](https://github.com/strakhovdenya/jobflow-cv-pipeline/issues/702#issuecomment-7173398744) (2026-11-25), [остановка и повтор S3](https://github.com/strakhovdenya/jobflow-cv-pipeline/issues/702#issuecomment-7173793738) (2026-11-25), [повтор S1, запуск S2 и S4, классификация регрессий и вердикт](https://github.com/strakhovdenya/jobflow-cv-pipeline/issues/702#issuecomment-7179565041) (2026-11-26). Порядок S3 → S5 → S1 → S2 → S4 сохранён.

| Сценарий | Workspace D (id / slug) | Шаги | Prompt 1 D (C) | Токены D: вход / кэш / выход | Одобрение |
|---|---|---|---|---|---|
| S3 | `cmwwkrp6l000hupdrfziegox5` / `2026_11_25_Binary_Studio_test_2_Middle_JS_Full_Stack_Engineer` | P1, P2, P3, экспорт | maybe 68 (maybe 68) | P1 113 468 / 7 437 / 5 101; P2 136 139 / 26 731 / 15 584; P3 79 075 / 0 / 3 713 | 2026-11-25 (все сценарии); повтор — 2026-11-25 |
| S5 | `cmwwkw9q8001xupdrjmm5azxb` / `2026_11_25_paddy_test_1_Backend_Engineer` | P1, P2, P3, экспорт, письмо | maybe 68 (maybe 68) | P1 113 047 / 7 437 / 3 982; P2 134 672 / 26 731 / 12 693; P3 76 575 / 15 231 / 3 329; письмо 93 163 / 0 / 2 293 | 2026-11-25 |
| S1 | `cmwwtnxg9003zupdrrv40v45v` / `2026_11_26_Action1_test_2_…` | P1, P2, P3, экспорт, письмо | maybe 71 (maybe 67) | P1 113 150 / 0 / 4 928; P2 135 067 / 0 / 20 875; P3 77 958 / 0 / 3 025; письмо 94 129 / 0 / 2 164 | 2026-11-25; повтор — 2026-11-26 |
| S2 | `cmwwtt66p005mupdr5qyemhiy` / `2026_11_26_DevCom_test_1_…` | P1, P2, P3, экспорт | maybe 72 (maybe 72) | P1 113 373 / 7 437 / 6 329; P2 135 758 / 26 731 / 18 775; P3 79 316 / 15 231 / 5 356 | 2026-11-25; запуск подтверждён 2026-11-26 |
| S4 | `cmwwty1nd006vupdrr092zust` / `2026_11_26_Employment_Hero_test_1_…` | P1, P2, P3, экспорт | maybe 69 (maybe 70) | P1 114 075 / 7 437 / 7 057; P2 136 914 / 26 731 / 14 909; P3 80 556 / 15 231 / 5 593 | 2026-11-25; запуск подтверждён 2026-11-26 |

**Остановленные и побочные прогоны (TR-2), не входят в Baseline D:**

| Прогон | Что случилось | Шаги после остановки |
|---|---|---|
| S3, попытка 0 (`cmwwkczlw00036i1qhmy18znb`) | Prompt 1 упал до вызова провайдера: API был запущен из рабочей папки с буквой диска в нижнем регистре, а проверка принадлежности источника корню сравнивает строки с учётом регистра (`filePath` в БД — `D:\…`). PromptRun и AiRun не созданы. API перезапущен из `D:\…`; Prompt 1 запущен на том же нетронутом workspace | — |
| S3, попытка 1 (тот же workspace, суффикс `_test_1`) | Prompt 1: **skip 67** против maybe 68 в C → остановка по правилу | Владелец выбрал сначала override (вариант 1), затем повтор в новом workspace (вариант 2). К моменту смены решения Prompt 2 этого workspace уже был у провайдера и завершился (137 096 / 0 / 12 849); Prompt 3 и экспорт не выполнялись. Workspace — побочный материал |
| S1, попытка 1 (`cmwwl1at1003kupdrw8tocu19`, суффикс `_test_1`) | Prompt 1: **skip 61** против maybe 67 в C → остановка по правилу | Prompt 2, Prompt 3, экспорт и письмо не выполнялись; владелец решил повторить Prompt 1 в новом workspace |

В Baseline D решения Prompt 1 всех пяти сценариев совпадают с Baseline C (`maybe`), оценки отличаются на −1…+4. Jobgether не пересматривался: в итоговых прогонах решения совпали с C, повторы — отдельное решение владельца.

**Вызовы провайдера:** 20 (план — не больше 17): 15 вызовов Baseline D + 2 письма = 17, плюс Prompt 1 со `skip` в S3 и S1 и Prompt 2 побочного workspace S3. Токены всех 20: 2 190 149 входных (из них 189 802 из кэша), 160 199 выходных. Оценка стоимости ≈ **$0.28** по сторонней цене ($0.10 / $0.01 / $0.50 за 1M; `AiRun.costEstimate` не заполняется) — оценка, не счёт.

---

## 5. Базис сравнения и способ подсчёта (AC-16, TR-1)

| Метрики | Базис C | Базис D | Способ подсчёта (общий для C и D) |
|---|---|---|---|
| содержание CV: вводная строка, строка Tech CIW, обзор портфолио, Selected Projects, ограничения, покрытие требований, must-keep, AI weight/kind | эффективный контент `task-e-validation-2026-11/baselines/baseline-C/S*.effective.json` (replay без повторного экспорта) | эффективный контент D: тот же `baseline_c_replay.js` по `02`/`03` D → `D/baseline-D/S*/S*.effective.json` | `D/scripts/target_metrics.js` (поля ниже) + ручная проверка по правилам протокола §4 |
| правки Prompt 3 | `03_pre_pdf_check.json` Baseline B (= C) | `03` D | `target_metrics.js` `corrections.*`; `b1_audit.js` |
| страницы design/ATS, совпадение design и ATS, недопустимый контент в ATS, канон в экспорте | файлы экспорта Baseline B (PDF и HTML) | файлы экспорта D | `baseline_fingerprint.js` (`designPages`, `atsPages`, `designAtsSameWordCount`, `notAllowedTodayInAts`); `d_post.js` (`pdftotext`, наличие канона в тексте design и ATS) |
| язык письма | `cover_letter.json` Baseline B | `cover_letter.json` D | поле `language` + `D/scripts/letter_language.js` (служебные слова DE/EN) + чтение |
| названия в письме ⊆ CV | текст письма и ATS Baseline B | текст письма и ATS D | список названий проектов, работодателей и технологий против извлечённого текста ATS |

**S3 и дефект B1.** Файлы экспорта Baseline B для S3 содержат дефект B1 в одном поле стека EPAM (`experience[0].tech_stack[22]`). Метрики содержания S3 сравниваются по эффективному контенту C, где B1 уже исправлен; метрики экспорта S3 (страницы 2/3, совпадение design и ATS по числу слов) у B и D совпадают, вклад поля B1 в них не обнаружен. Отличие, вызванное B1, этой инициативе не приписывается.

Поля `target_metrics.js`: `f1.stableIntroCorrections` (правки с `field_path` `current_work_block.stable_intro`), `f1.effectiveIntroIsCanon` (равенство строке 145 активного `cv_rules`); `ciw.items`, `ciw.duplicateBaseNames` (правило fingerprint: первое слово метки), `ciw.untracedItems` (метка без версии и уточнения не названа bullets блока и не входит в список JobFlow вакансии из 2.3), `ciw.aiItemsNotNamedByBullets`; `corrections.duplicateCandidates` (причина правки о дубле) + ручная проверка, чей факт удалён; `overview.publicMentioned/publicPlural/publicAmongRepresented` (представленные приложения — `cvEligible` записи с `placement: selected_projects`, не выбранные в Selected Projects, без Dark Factory, их `deployment.kind`); `selectedProjects[].vacancyTechFirst` (все метки, совпавшие со списком технологий вакансии из 2.3, стоят раньше остальных), `sameAsRegistry`, `missingFromRegistry`; `restricted` (Docker у EPAM без «local», Kubernetes где угодно, MongoDB у CHI — наблюдение).

---

## 6. Целевые метрики: Baseline C → Baseline D (AC-6, AC-7)

| Метрика | S3 | S5 | S1 | S2 | S4 |
|---|---|---|---|---|---|
| **F1** правки Prompt 3 по `stable_intro` | 1 → **0** | 1 → **0** | 1 → **0** | 1 → **0** | 1 → **0** |
| F1 канон: эффективный контент / design / ATS | нет → **да / да / да** | нет → **да / да / да** | да* → **да / да / да** | нет → **да / да / да** | нет → **да / да / да** |
| **F3** позиций в строке Tech CIW | 32 → **10** | 28 → **8** | 16 → **7** | 16 → **11** | 30 → **6** |
| F3 дубли базовых имён | 4 → **0** | 2 → **0** | 0 → 0 | 1 → **0** | 4 → **0** |
| F3 позиции без следа в bullets блока или списке JobFlow вакансии | 19 → **0** | 20 → **0** | 8 → **0** | 4 → **0** | 20 → **0** |
| F3 AI-технологии строки, не названные bullets | 1 (OpenAI Codex) → **0** | 2 (Claude Code, OpenAI Codex) → **0** | 1 (OpenAI API) → **0** | 1 (Claude Code) → **0** | 1 (Claude Code) → **0** |
| **F2** правки Prompt 3, удалившие факт другого проекта как дубль | 0 → 0 | 0 → 0 | 0 → 0 | **1 → 0** | 0 → 0 |
| **F5** факт о публичных приложениях верен для представленных | нет факта → **верен** (ед. ч., 1 публичное) | нет факта → нет факта (Prompt 2 написал верно, мн. ч. при 2 публичных; Prompt 3 убрал) | **неверен** (мн. ч. при 1) → **верен** (ед. ч.) | нет факта → нет факта | нет факта → нет факта (Prompt 2 написал верно, мн. ч. при 2; Prompt 3 убрал) |
| **Docker / ограничения** в коммерческих записях без оговорки | **1 (EPAM) → 0** | 0 → 0 | 0 → 0 | 0 → 0 (EPAM: с оговоркой «local development only») | 0 → 0 |
| MongoDB у CHI (наблюдение) | есть → есть | есть → есть | есть → есть (с пометкой exposure) | есть → есть (с пометкой training) | есть → есть |

\* В S1 Prompt 3 v10 в Baseline B переписал вводную строку в форму, совпавшую с будущим каноном v0_8; правка всё равно была (1).

**F6 — Selected Projects** (технологии вакансии раньше остальных; состав = `techStack` registry):

| Сценарий | Запись | C: вакансия первой / состав | D: вакансия первой / состав | Отсутствующие технологии и исключившее правило |
|---|---|---|---|---|
| S3 | B1 Kompass | нет / = registry | **да** / = registry | нет |
| S3 | Dark Factory | (в C нет записи) | нет (JavaScript на позиции 4 раньше GitHub Actions и Docker) / = registry | нет. Если считать «JS» из названия роли технологией вакансии — да |
| S1 | B1 Kompass | нет / = registry | **нет** (порядок registry: Next.js 16 первым, вакансия Next.js не называет) / = registry | нет |
| S2 | Dark Factory | нет / = registry | нет (JavaScript на позиции 2 раньше Claude Code) / = registry | нет |
| S2 | Home Budget | нет / = registry | (в D нет записи) | — |
| S4 | Dark Factory | нет / = registry | нет (JavaScript на позиции 2 раньше Claude Code) / = registry | нет |
| S4 | Cards | нет / = registry | (в D нет записи) | — |
| S5 | — | — | — | — |

Состав `techStack` сохранён во всех 5 записях D (ни одна технология registry не удалена, лишних нет). Правило порядка выполнено в 1 из 5 записей D (в 2 из 5, если JavaScript считать названным в S3).

**F7 — письма:**

| Сценарий | C: `language` / фактический язык | D: `language` / фактический язык | Совпадение с ожиданием 2.3 | Утверждения о немецком |
|---|---|---|---|---|
| S1 | `English` / английский (EN 44, DE 0) | **`en`** / английский (EN 43, DE 0) | да (`en`, п. 3) | нет |
| S5 | `en` / английский (EN 44, DE 0) | **`de`** / немецкий (DE 39, EN 5) | да (`de`, п. 3) | уровень не заявлен; в `risks` письма записан подтверждённый A2/B1 |

---

## 7. Проверки регрессии (AC-8)

| Проверка | S3 | S5 | S1 | S2 | S4 |
|---|---|---|---|---|---|
| `registry_violations` / `critical_issues` (D) | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| недопустимый контент (FastAPI, Email Camp, AI Job Assistant, AI Bootcamp, Kubernetes, Python) | 0 | 0 | 0 | 0 | 0 |
| страницы design / ATS (C → D); `max_pages` черновика D | 2/3 → 2/3; 2 | 2/3 → 2/3; 2 | 2/3 → 2/3; 3 | 2/3 → 2/3; 3 | 2/3 → 2/3; 3 |
| правило страниц (design ≤ `max_pages`, ATS ≤ C) | да | да | да | да | да |
| design = ATS по содержанию | да | да | да | да | да |
| названия в письме ⊆ экспортированный CV | — | да | да (AWS, DynamoDB, MySQL — только как честно названные разрывы) | — | — |
| AI weight / kind D против C | Plus / assistants = | Core / LLM integration = | none = | Core / assistants = | Core / assistants = |
| AI в вакансии без AI (S1) | — | — | 0 (Summary, bullets, строка Tech, сертификаты, письмо) | — | — |
| must-keep §2, которые вакансия просит | все сохранены | абстракция провайдера ослаблена (см. D5) | все сохранены; Redis caching — только в стеке (D9) | Home Budget заменён JobFlow e2e на реальном PostgreSQL (D12); incident analysis нет, как в C | **Cards потерян (D16)**; Redis caching — только в стеке |
| уровни покрытия must-have / ключевых обязанностей против C | без понижений | без понижений (T4 тот же уровень) | без понижений | без понижений (M9 — тот же уровень, другое доказательство) | **понижены R1 (аутентификация) и R3 (безопасность, OWASP)** |
| `b1_audit.js` по новым правкам D | 0 расхождений | 0 | 0 | 0 | 0 |

`b1_audit.js` по всем 115 workspaces с проверкой Prompt 3 после прогонов: 120 правок, 119 совпадают, 1 расхождение — прежнее (Baseline B S3, пропускается после #699).

---

## 8. Классификация отличий D от C (AC-9)

Измерения — матрица протокола §4. Класс: material / acceptable variation / stylistic. Причина: source, rule, code, unexplained (one run). Отдельно обозначена причина **input** — отступление от входа Baseline B по решению владельца (суффикс компании, раздел 10).

| # | Сценарий, поле | Измерение §4 | Отличие | Класс | Причина | Обоснование причины |
|---|---|---|---|---|---|---|
| D1 | все, `current_work_block.stable_intro` | 4 CIW | Prompt 3 больше не переписывает вводную строку; экспорт содержит канон | material (улучшение) | rule | канон в `cv_rules` v0_8 и prompt_3 v11, BOP-поиск в `stable_intro` снят (TASK-A) |
| D2 | все, `current_work_block.tech_stack` | 6 технологии | строка Tech CIW 6–11 позиций вместо 16–32, без дублей, версий и стеков невыбранных приложений | material (улучшение) | rule | область строки Tech CIW в `cv_rules` v0_8 §8 и prompt_2 v13 |
| D3 | S1, S3, S5, S2, S4, AI-метки строки Tech CIW | 7 AI | AI-технологии, не названные bullets, исчезли (S1: OpenAI API; S5: Claude Code, Codex) | material (улучшение) | rule | правило AI-технологий строки Tech CIW (TASK-A) |
| D4 | S3, `experience[EPAM].tech_stack` | 9 точность | голого Docker нет; Azure Key Vault на месте | material (улучшение) | rule | правило существенных ограничений prompt_2 v13; B1 исправлен в C и не приписывается |
| D5 | S5, bullet JobFlow (правка Prompt 3) | 10 правки P3 / 2 must-keep | стилистическая правка Prompt 3 убрала деталь об абстракции провайдера; интеграция OpenAI API, проверка ответов, фоновые задачи и review gates остались | acceptable variation (регрессия детали must-keep, не материальная; решение владельца) | unexplained (one run) | правка помечена как стилистическая; правило, требующее удалить деталь, отсутствует |
| D6 | S5, S4, обзор портфолио (правка Prompt 3) | 10 правки P3 | Prompt 2 написал верный факт о публичных приложениях (мн. ч. при двух), Prompt 3 убрал его «ради фокуса» | acceptable variation | unexplained (one run) | факт не нужен требованиям; правило дубля к нему не применялось |
| D7 | S1, обзор портфолио | 4 CIW / 9 точность | «public deployments» (мн. ч. при одном) → верное единственное число | material (улучшение) | rule | facet без фиксированного числа, по `deployment.kind` (`cv_rules` v0_8) |
| D8 | S3, Selected Projects | 5 проекты / 7 AI | добавлена компактная запись Dark Factory (1 bullet, `show_if_space`); AI-клауза JobFlow убрана; один AI-сертификат | acceptable variation | unexplained (one run) | правило Plus (`cv_rules` §9.3) было и в C; выбор между двумя разрешёнными формами |
| D9 | S1, EPAM | 2 коммерческие | Redis caching — только в стеке (в C — bullet); Cosmos DB поднят в Top Skills | acceptable variation | unexplained (one run) | R4 покрыт оптимизацией запросов Factor–IT; M4 — тем же Cosmos DB |
| D10 | S1, сертификаты | 8 сертификаты | System Design in Cloud → Node.js: Security (без AI) | acceptable variation | unexplained (one run) | оба `cvEligible`, без AI |
| D11 | S1, письмо | 13 письмо | `English` → `en` | stylistic (формат) | rule | формат ISO 639-1 в cover_letter v6 |
| D12 | S2, Selected Projects | 5 проекты / 1 покрытие | Home Budget не выбран; M9 (integration tests) закрыт bullet JobFlow о тестах на реальном PostgreSQL в CI | acceptable variation (решение владельца) | unexplained (one run) | доказательство подтверждено `career_cases` (JobFlow CI: e2e на реальном PostgreSQL); правила отбора проектов TASK-A не меняла |
| D13 | S2, EPAM | 2 коммерческие | вернулся bullet ProductsUp (retries, idempotency); стек EPAM с Docker «local development only» | material (улучшение, F4-класс) | unexplained (one run) для ProductsUp; rule для оговорки Docker | F4 — наблюдение без правила; оговорка — правило ограничений |
| D14 | S2, обзор портфолио | 10 правки P3 | ложного удаления «дубля» нет | material (улучшение) | rule | единое определение дубля в prompt_2 v13 / prompt_3 v11 |
| D15 | S4, сертификаты | 8 сертификаты | ADK skill badge убран, добавлены два Redis-курса | acceptable variation | unexplained (one run) | при Core badge допускается «по релевантности»; Redis — M2 |
| D16 | **S4, Selected Projects** | 2 must-keep / 1 покрытие | **запись Cards не выбрана: пропали доказательства аутентификации, read-only demo с проверкой на сервере и rate limiting** | **material (регрессия)** | **unexplained (one run)** | правила отбора проектов TASK-A не меняла (prompt_2 v12 → v13, `cv_rules` v0_7 → v0_8: изменения только в CIW, порядке стека, ограничениях, дублях) |
| D17 | S4, EPAM | 2 коммерческие | Redis caching — только в стеке и Top Skills; Service Bus — только в стеке, как в C | acceptable variation | unexplained (one run) | M2 покрыт PostgreSQL и Redis в стеке |
| D18 | S5, заголовок | 3 Summary/headline | заголовок точнее совпадает с ролью вакансии | acceptable variation | unexplained (one run) | правила заголовка не менялись |
| D19 | S5, F7 | 13 письмо | английское письмо → немецкое `de` | material (улучшение) | rule | политика языка cover_letter v6, п. 3 |
| D20 | S1, S5, шапка письма | 13 письмо | в шапке письма компания с суффиксом `_test_N` | stylistic | input | суффикс компании по решению владельца (раздел 10) |
| D21 | все, формулировки bullets EPAM / Factor–IT / Summary | 3, 2 | перефразирование и сокращение без изменения фактов (в том числе правки «product-information flows») | stylistic | unexplained (one run) | известное наблюдение PRD про BOP-фразу; остальное — вариативность формулировок |
| D22 | S1, S3 (P1 первой попытки) | — (Prompt 1) | решение `skip` при оценке 61–67 против `maybe` в C; в повторах — `maybe` | см. раздел 9 | unexplained (one run) | шаблон Prompt 1 не менялся; разрывы в анализе те же, что в C |

Самооценки модели (`quality_score`, `requirement_coverage`, решения Prompt 1) использованы только как перекрёстная проверка.

---

## 9. Наблюдения F4, F8 и вариативность Prompt 1

- **F4 (выбор сильных bullets EPAM).** S2: ProductsUp вернулся (улучшение против C), incident analysis по-прежнему не выбран. S1: Cosmos DB заметнее (Top Skills). S4: Service Bus по-прежнему только в стеке. Итог: выбор по-прежнему различается от прогона к прогону; правило не менялось — наблюдение.
- **F8 (вес Core для одной must-have строки, S2).** D: Core / assistants, как в C, по `cv_rules` §9.3. Наблюдение, решение владельца — правило не менять.
- **Вариативность решения Prompt 1.** Из семи прогонов Prompt 1 два дали `skip` (S3 — 67, S1 — 61) при `maybe` в C (68 и 67); повторы в новых workspaces дали `maybe` (68 и 71). Шаблон Prompt 1 тот же; `cv_rules` v0_8 входит во вход Prompt 1, но правил решения не меняет; второе изменение входа — суффикс компании. Различия в анализе — оценка риска локации (S3) и итоговая оценка в диапазоне 55–64, где правило оставляет выбор между `maybe` и `skip` (S1). Вывод: решение Prompt 1 у этих вакансий находится у границы и не воспроизводится между прогонами; причина — unexplained (one run). Это наблюдение, не исправление и не регрессия правил инициативы.

---

## 10. Отступления от протокола и бюджета

| Отступление | Решение | Влияние на сравнение |
|---|---|---|
| Компания на входе: значение Baseline B + суффикс `_test_1` (повторы — `_test_2`); INV-4 требовал идентичного значения | владелец, 2026-11-25 | метаданные workspace на входе Prompt 1/2/3 и письма отличаются суффиксом; суффикс виден в шапке писем (D20); иных следов в CV не найдено |
| Все пять сценариев одобрены одним решением вместо одобрения каждого | владелец, 2026-11-25 | правила остановки соблюдались: две остановки по Prompt 1 переданы владельцу |
| Повтор Prompt 1 в новом workspace для S3 и S1 после остановки | владелец, 2026-11-25 и [2026-11-26](https://github.com/strakhovdenya/jobflow-cv-pipeline/issues/702#issuecomment-7179565041) | в Baseline D вошли повторы; первые прогоны — побочный материал (раздел 4) |
| Лишний Prompt 2 в побочном workspace S3 | смена решения владельца (вариант 1 → 2), когда вызов уже был у провайдера | 1 лишний вызов, результат не используется |
| 20 вызовов вместо 17 | следствие трёх строк выше | ≈ $0.28 против ориентира $0.25 (оценка) |
| Правило страниц: протокол писал «`max_pages` 3 везде», фактически `max_pages` черновиков различается (2 или 3): в Baseline B ATS больше `max_pages` черновика в S1 и S3, в Baseline D — в S3 и S5 (3 страницы при `max_pages` 2) | владелец, 2026-11-25: design ≤ `max_pages`, ATS ≤ ATS Baseline C | все пять D проходят |
| Прогоны шли через полночь: S1 (повтор), S2, S4 имеют дату 2026_11_26 в slug | — | не влияет |
| Перезапуск API после ошибки окружения (регистр буквы диска) | исполнитель, без вызова провайдера | не влияет; записано в журнале |
| JavaScript не включён в замороженный список технологий S3 | — | F6 для Dark Factory в S3 считается по замороженному списку; альтернативное прочтение указано в разделе 6 |

---

## 11. Итог по находкам (AC-10)

| Находка | Итог | Метрика |
|---|---|---|
| F1 вводная строка | resolved (5/5, один прогон) | раздел 6: правки 1 → 0, канон в design и ATS 5/5 |
| F2 ложный дубль | resolved (один прогон) | раздел 6: S2 1 → 0, во всех D 0 |
| F3 строка Tech CIW | resolved (5/5, один прогон) | раздел 6: 16–32 → 6–11 позиций; дубли, позиции без следа и лишние AI-технологии — 0 |
| F5 публичные приложения | resolved (один прогон) | раздел 6: S1 неверно → верно; S3 верно; верные факты S4/S5 Prompt 3 убрал (D6) |
| F6 порядок стека Selected Projects | **partially resolved** | раздел 6: порядок соблюдён в 1 из 5 записей D (S3 B1 Kompass; 2 из 5, если «JS» из названия роли S3 считать технологией вакансии); состав = registry 5/5 |
| F7 язык письма | resolved (один прогон) | раздел 6: S5 `de` немецкий, S1 `en` английский; уровень немецкого не завышен |
| Ограничение Docker | resolved (один прогон) | раздел 6: EPAM S3 1 → 0; S2 с оговоркой |
| F4 (наблюдение) | без изменений: выбор bullets EPAM по-прежнему различается | раздел 9 |
| F8 (наблюдение) | без изменений: Core в S2 по `cv_rules` §9.3 | раздел 9 |

**Не объявлены исправленными (нецелевые):** F10 (только задокументирован пробел покрытия, раздел 2.2); фраза BOP-шаблона «product-information flows» в источниках (Prompt 3 по-прежнему её правит, D21); видимость пропущенных правок B1 в UI (отложена владельцем); вариативность решения Prompt 1 (раздел 9); выбор проектов Selected Projects (D12, D16).

**Ограничения одного прогона:** каждый сценарий D — один прогон против одного прогона C; модель та же по имени, но одинаковое поведение не гарантировано; отличие без следа в правиле, источнике или коде не отделяется от вариативности модели («unexplained (one run)»); для F4, F7, F8 и для выбора проектов (D12, D16) нужно не меньше двух прогонов Prompt 2 на сценарий, прежде чем называть причину; «resolved» в этом отчёте — свидетельство одного прогона, не доказательство стабильности; суффикс компании меняет вход относительно Baseline B.

**Материалы D:** `apps/api/storage/cv-quality-refinement-validation/` (git-ignored): оценки и запись о заморозке, оценки C, метрики C и D, эффективный контент, fingerprint, копии артефактов и их sha256, извлечённый текст, журнал прогонов, экспорт `PromptRun`/`AiRun`, скрипты. Манифест `manifest-sha256.txt` (151 файл) — sha256 `0f2f65de3b4868c7e62c29cd3e50c60c10a09a46740e4ae3c54bef89dcbc22a6`.

---

## 12. Вердикт инициативы (AC-15)

Этот раздел отделён от выполнения процедуры (разделы 3–8): выполненная процедура не означает достигнутых целей.

| Целевая находка | Вердикт |
|---|---|
| F1 | resolved |
| F2 | resolved |
| F3 | resolved |
| F5 | resolved |
| F6 | partially resolved |
| F7 | resolved |
| Ограничение Docker | resolved |

Все «resolved» — по одному прогону на сценарий (раздел 11).

**Блокирующие находки:** нет (недопустимого контента, нарушений registry, AI в вакансии без AI, выдуманных фактов — 0).

**Материальные регрессии:**

| # | Регрессия | Доказательство | Решение владельца (2026-11-26) |
|---|---|---|---|
| R-1 | S4: потеря доказательств безопасности и аутентификации — запись Cards (аутентификация, read-only demo с проверкой на сервере, rate limiting) не выбрана; понижены R1 (аутентификация пользователей) и R3 (zero-trust, OWASP); причина unexplained (one run) | раздел 7, D16 | [записано на #702](https://github.com/strakhovdenya/jobflow-cv-pipeline/issues/702#issuecomment-7179565041): материальная регрессия; причина — unexplained (one run); отдельная задача пока не создаётся |

Отличия S2 (D12) и S5 (D5) — по решению владельца не блокирующие вариации, при условии, что доказательства выше их подтверждают: в S2 требование M9 закрыто подтверждённым источниками доказательством того же уровня; в S5 обязанность T4 сохраняет уровень.

**Общий итог: цели достигнуты частично** ([решение владельца 2026-11-26](https://github.com/strakhovdenya/jobflow-cv-pipeline/issues/702#issuecomment-7179565041)). Причины: материальная регрессия R-1 в S4 и частично решённая F6.
