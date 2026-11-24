# PRD: Career Evidence Refresh and Registry-Aware Portfolio Selection

**Date**: 2026-11-23 (final revision)
**Status**: Ready for final owner review (не реализовано)
**Affected part of the project**: `apps/api`: knowledge sources, prompt templates, seed, `evidence/`, `document-export/`. `apps/web` не меняется.
**Related issue/backlog item**: #686 (TASK-A), #687 (TASK-B), #688 (TASK-C), #689 (TASK-D), #696 (TASK-D1, см. «Amendment TASK-D1»), #690 (TASK-E). Смежные, но не поглощаемые: #404 (пробелы EvidenceGuard/CvQualityGuard), #252 (состав источников Prompt 2), #281 (versioning KnowledgeSource).
**Audit**: `project-management/analysis-career-evidence-audit-2026-11.md`
**Plan**: `project-management/plan/PLAN-career-evidence-refresh.md`

## Goal

JobFlow должен строить каждое CV из актуального и проверенного профиля кандидата:
- пять основных портфолио-проектов;
- практическая инженерия с Claude Code и OpenAI Codex;
- Google ADK как подкрепляющее обучение;
- неизменный коммерческий опыт.

Отбор проектов и сертификатов должен зависеть от вакансии, а архивные и неподтверждённые утверждения не должны молча попадать в экспортированный CV. Объём — около двух рабочих дней.

## Context and Project Alignment

Проблема (подробности — в аудите, разделы 1 и 6):

1. Пул проектов прописан литералами в активных промптах (`prompt1_v12`, `prompt2_v10`, `prompt3_v8`). Поэтому AI Job Assistant и Email Camp выбираются, а Dark Factory, B1 Kompass и Home Budget недоступны.
2. Активные источники (≈ 480 KB) состоят из слоёв «Update vX». Новые правила дописываются сверху, а старые рекомендации ниже продолжают действовать.
3. Источники описывают Dark Factory как часть репозитория JobFlow (устарело) и содержат неподтверждённые факты о Cards (мультиязычный UI, React Query).
4. EvidenceGuard не сверяет названия проектов и сертификатов, а его `critical_issues` не блокируют экспорт. Архивный проект или выдуманный сертификат может дойти до PDF.

Слои: knowledge sources (append-only версии, `scripts/register-knowledge-sources.ts`), `PromptTemplate` (seed, ADR-039), `EvidenceItem` (seed), `EvidenceGuardService` (`src/evidence/`), `DocumentExportService` (`src/document-export/`).

ADR:
- ADR-012 — экспорт детерминирован, без `AiRun`.
- ADR-020 — один файл — один spec.
- ADR-026, ADR-037 — gate Prompt 3, regenerate из `paused_before_export`.
- ADR-032 — детерминированный guard блокирует экспорт до claim. Это образец для нового export gate.
- ADR-033 и **ADR-034** — manual note как исключение. Требуется amendment, см. Key Invariants.
- ADR-038 — переходы статусов. Не меняются.
- ADR-039 — одна активная версия шаблона.
- ADR-043 — изменяемость.

## Dependencies

No explicit dependencies found.

## User Scenarios

- Backend Node.js/TS вакансия:
  - Summary варианта A;
  - лидирует EPAM;
  - JobFlow остаётся одним bullet в Current Independent Work;
  - Selected Projects пусто или содержит Home Budget (если вакансия требует data integrity, а коммерческий опыт это не покрывает);
  - нет Dark Factory, ADK и архивных проектов.
- AI-assisted engineering / Developer Productivity:
  - Summary варианта C;
  - Dark Factory в Selected Projects (`must_show`);
  - ADK badge в Certifications как подкрепление;
  - labs только подкрепляют навыки и в Certifications не попадают.
- React/Next.js full-stack:
  - Summary варианта B;
  - после EPAM React/Next.js выбирается B1 Kompass, затем Cards, если остаётся непокрытое требование.
- Модель вставила архивный проект в Summary:
  - guard записывает нарушение registry;
  - экспорт отвечает 400 и не создаёт PDF;
  - владелец делает regenerate Prompt 2.
- Владелец добавил проект через manual note:
  - незарегистрированный проект проходит как user-forced и виден на review;
  - проект, явно помеченный в registry как `archived`, manual note не разблокирует.

## In Scope

1. **Пять основных проектов**: `dark-factory`, `jobflow-cv-pipeline`, `cards`, `b1-kompass`, `home-budget`. Все `status: active`, `portfolioPriority: primary`, `cvEligible: true`. JobFlow — `placement: current_work_block`, остальные — `selected_projects`.
2. **Вторичные проекты**: AI Bootcamp RAG Service — `active`, `secondary`, `evidenceClass: needs_evidence`, `cvEligible: false`, пока реализация не проверена. Проверка отложена.
3. **Архив**: AI Job Assistant и Email Camp — `archived`, `cvEligible: false`. История остаётся в прежних версиях файлов. Вернуть проект можно только новой версией registry по решению владельца.
4. **Новые версии активных источников**. Устаревшие рекомендации удаляются из тела копии, а не перекрываются сверху. Архивные проекты в новых активных файлах названы только в registry-блоке.
5. **Три независимые AI-категории** в источниках навыков:
   - A — AI-assisted Software Engineering;
   - B — AI Integration & Agent Workflow Engineering;
   - C — Agent Development Training.
6. **Google Cloud**:
   - ADK skill badge (`skill_badge`, earned 2026-11-23, `cvEligible: true`);
   - 9 labs (`lab`, completed 2026-11, `cvEligible: false`);
   - «Wrap Up: Deploy Production-Ready Agents» (`course_completion`, completed 2026-11-22, `cvEligible: false`);
   - 2 paths и «Build Agent Skills with Google» (`in_progress`, `cvEligible: false`).
7. **Master Profile Summary**: три варианта (A, B, C) по 60–90 слов и правило выбора по вакансии; стоп-лист — в `cv_rules`.
8. **Current Independent Work**: третий bullet «Python/FastAPI learning» заменяется на конкретный bullet, выбираемый по вакансии.
9. **Строгий registry-контракт** (два fenced JSON-блока, см. план) и парсер с валидацией.
10. **Промпты Prompt 1/2/3 новых версий** берут пул и AI-роль проекта из registry.
11. **EvidenceGuard**: проверка проектов и сертификатов по registry, поиск архивных проектов во всех публичных полях, отдельное поле `overclaiming_check.registry_violations`.
12. **Export gate**: до claim экспорт собирает эффективный контент (черновик Prompt 2 + corrections Prompt 3, ровно вход рендереров) и проверяет его по снимку registry, сохранённому guard'ом в черновике. Нарушение или отсутствие снимка → 400 до claim, по образцу ADR-032. Так закрыт обход, при котором Prompt 3 через correction вносит архивный проект или недопустимый сертификат после проверки Prompt 2.
13. **Amendment ADR-034**: manual note не отменяет явное исключение в registry.
14. **Тесты**: детерминированные (CI) + три обязательных реальных smoke-прогона.

## Out of Scope

- Prisma-модели `Project/Skill/Evidence/Certification/VacancyEvidenceMatch`, миграции, UI портфолио.
- Автоматическая синхронизация с GitHub и фоновый мониторинг. Новый проект или credential добавляется вручную: аудит → новая версия источника → PR → регистрация.
- Численный scoring engine. Ранжирование остаётся prompt-правилом «Inclusion test — coverage, not topic».
- Блокировка экспорта по прочим `critical_issues` (regex-паттерны и пр.): поведение не меняется.
- Изменения переходов статусов и `apps/web`.
- Пункты #404 (`current_work_block` в skill-проверке, `claimArea`, `EvalModule`), #252, #281.
- Проверка AI Bootcamp RAG Service, cover letter и recruiter message (Phase 2), LinkedIn-тексты.
- Реальные прогоны для database/financial, Azure и Python-вакансий (P1).

## Key Invariants

- Коммерческий опыт (EPAM, Factor–IT, CHI: компании, роли, даты, `experience_type: "commercial"`) не меняется. Портфолио-технологии и обучение не попадают в коммерческие записи.
- `Current Independent Work & Portfolio Projects`, `May 2025 – Present`, `Cologne, Germany`, stable intro и bullet о небольших независимых оплачиваемых задачах не меняются. Блок обязателен в каждом CV.
- **`cvEligible` — единственный признак допуска.**
  - `portfolioPriority` — только приоритет видимости.
  - `placement` — только раздел CV.
  - Запись с `status: archived` или `evidenceClass: needs_evidence` не может быть `cvEligible: true`: парсер отклоняет такой registry.
- Training (`skill_badge`, `course_completion`, `lab`, `assessment`, `learning_path`) никогда не формулируется как commercial или production experience. `lab`, `assessment`, `learning_path` и `in_progress` всегда `cvEligible: false`.
- Три AI-категории классифицируются независимо. Общей формулировки «AI expertise» нет. Обучение (C) не подменяет реализацию (A, B).
- Dark Factory описывается точно:
  - агенту в Ralph запрещены `git commit`, `git push` и `gh`, но разрешены чтение `git status/diff/log/show`;
  - commit, push и PR делает контроллер;
  - формулировки «no Git access» нет;
  - установлен в JobFlow, Cards и B1 Kompass;
  - в Home Budget не установлен: там Codex-native workflow, другой артефакт.
- **ADR-034 сохраняется для неизвестного**: проект или сертификат, отсутствующий в registry, но подтверждённый в `manual_note_forced_claims`, не считается нарушением registry. Он попадает в `warnings` и виден на review.
- **ADR-034 не распространяется на явное исключение**: запись registry с `cvEligible: false` (archived, lab, in_progress и т. д.) остаётся нарушением при любом manual note.
- Export gate не меняет статусов: отказ — 400 до claim, статус `paused_before_export` сохраняется (ADR-032, ADR-038). Нарушение исправляется regenerate Prompt 2 (ADR-037), повторным или пропущенным pre-PDF check или новой версией registry.
- Export gate проверяет **скорректированный структурированный контент**, а не отрендеренный HTML: рендерер добавляет к нему только статичный профиль кандидата (ADR-032) и литералы шаблона. Рендереры и gate получают контент из одной функции, правила registry реализованы один раз и используются guard'ом и gate. Gate не загружает knowledge sources: правила берутся из снимка в черновике, поэтому экспорт остаётся детерминированной функцией артефактов workspace.
- Prompt 3 не вводит новых forced-исключений: незарегистрированное название проходит экспорт, только если guard Prompt 2 принял его по manual note и записал в снимок.
- Экспорт детерминирован, без `AiRun` (ADR-012). Human review gates не меняются. JobFlow не дублируется в Selected Projects. Сгенерированные CV не являются источником фактов.
- Стоп-лист Summary и headline: `Passionate about technology`, `Always learning`, `AI enthusiast`, `Highly motivated developer`, `Expert in artificial intelligence`, `Experienced ML engineer`, `Production-grade autonomous AI architect`. Внутренние термины доказательств (`evidenceClass`, `needs evidence`, `personal_verified`) в публичный текст не попадают.
- **Variation point**: набор проектов и credentials меняется через существующую границу — новую версию knowledge source и `register-knowledge-sources`. Промпты, guard и export gate не содержат названий проектов и читают registry. Новых модулей и абстракций нет.

## Technical Constraints

- Без миграций и новых Nest-модулей. Registry — fenced-блок в существующем `.md`, потому что `KnowledgeSourceContentService` читает только `.md`/`.txt`.
- Unit-тесты без реальных AI-вызовов. Fixtures синтетические (anti-literal), кроме набора тестов «active knowledge sources», который намеренно читает реальные активные файлы.
- `apps/api/knowledge-sources/` и `apps/api/prisma/prompts/` — `protectedPaths`. TASK-A…C и промптовая часть TASK-D выполняются интерактивно (Claude Code + владелец), не Ralph.
- Контекст Prompt 1/2 не должен вырасти. Новые версии источников заменяют устаревшие разделы, а не дописывают поверх.
- Реальные прогоны тратят токены и запускаются владельцем.

## Acceptance Criteria

- [ ] AC1. Активный `project_inventory` содержит ровно один валидный блок `portfolio-registry`. В нём ровно пять записей `status: active` + `portfolioPriority: primary` + `cvEligible: true`: `dark-factory`, `jobflow-cv-pipeline`, `cards`, `b1-kompass`, `home-budget`. Записи AI Job Assistant и Email Camp — `archived` + `cvEligible: false`, AI Bootcamp RAG Service — `secondary` + `needs_evidence` + `cvEligible: false`.
- [ ] AC2. Факты о пяти проектах в новых источниках соответствуют аудиту:
  - Dark Factory — точная граница git-прав агента и фактические consumer-репозитории;
  - Cards — без мультиязычного UI и React Query;
  - Home Budget — частное приложение одного владельца, без публичной ссылки, пользователей, банковских интеграций, платежей и мультивалютности, не FinTech;
  - публичные URL — только у Cards и B1 Kompass, взятые из их README.
- [ ] AC3. AI Job Assistant и Email Camp не названы ни в одном активном источнике, кроме записи registry, ни в активных Prompt 1/2/3, ни в описаниях `evidenceItems` в `seed.ts`.
- [ ] AC4. Активный `certifications` содержит ровно один валидный блок `credential-registry` с записями Google Cloud из In Scope п. 6 и всеми сертификатами прежнего inventory. `credentialId` и `verificationUrl` бейджа — `null`.
- [ ] AC5. Активный `tech_stack` классифицирует навыки раздельно как `commercial` / `personal` (с проектом) / `training` (с credential) и содержит три AI-категории A/B/C. Claude Code и OpenAI Codex отнесены к A и B со ссылками на Dark Factory, JobFlow и Home Budget. ADK, multi-agent, Agent Runtime, MCP и Antigravity отнесены к C.
- [ ] AC6. Активный `profile_summary` содержит варианты A, B, C (60–90 слов) и правило выбора по типу вакансии; стоп-лист закреплён в активном `cv_rules`. Ни один вариант не содержит фраз стоп-листа и внутренних терминов доказательств. Первое предложение каждого варианта — о коммерческом опыте.
- [ ] AC7. Активный `cv_rules` сохраняет даты, место и stable intro Current Independent Work. Третий bullet задан как выбор конкретного факта по вакансии (AI, Node.js, full-stack, Python), без формулировки «structured upskilling» в публичном тексте и без повтора содержимого Selected Projects.
- [ ] AC8. Активные Prompt 1/2/3 новых версий берут кандидатов из registry (`status`, `cvEligible`, `placement`, `roleFamilies`) и не называют ни одного проекта registry, кроме JobFlow. Тест закрепляет новые активные версии.
- [ ] AC9. Парсер registry отклоняет: невалидный JSON, нарушение обязательных полей или enum, противоречия `cvEligible`, дубликаты `id`/`title`/`aliases`, отсутствие блока, два блока одного типа. Каждый случай покрыт unit-тестом.
- [ ] AC10. EvidenceGuard записывает нарушение в `registry_violations` (и дублирует в `critical_issues`), когда включены:
  - проект не из пула или неизвестный;
  - сертификат не `cvEligible` или неизвестный;
  - любое упоминание архивного проекта в публичных полях (headline, summary, top_skills, current_work_block, experience, selected_projects, certifications).
- [ ] AC11. Unit-тесты подтверждают обе стороны правила для manual note: неизвестный проект с подтверждением в `manual_note_forced_claims` нарушением не считается, а архивный проект с manual note — считается. ADR-034 дополнен amendment.
- [ ] AC12. Экспорт отвечает 400 до claim, не меняет статус и не пишет и не регистрирует HTML/PDF/ATS-файлы, если эффективный контент (черновик Prompt 2 после corrections Prompt 3) нарушает снимок registry или в черновике нет `overclaiming_check.registry_snapshot`. Unit-тесты покрывают:
  - correction Prompt 3, вносящую архивный проект в текст;
  - correction, вносящую недопустимый сертификат;
  - валидную correction, которая экспортируется как раньше.

  Сообщение называет нарушение и действие (перегенерировать черновик или пересоздать pre-PDF check).
- [ ] AC13. Набор тестов «active knowledge sources» в CI проверяет реальные активные файлы: оба registry валидны, пять основных проектов на месте, архивные названия не встречаются вне registry.
- [ ] AC14. Три обязательных реальных smoke-прогона (backend Node.js/TS, AI-assisted SE, React/Next.js full-stack) выполнены владельцем. Отбор совпал с таблицей ожиданий плана, `registry_violations` пусто, CV ≤ целевого числа страниц, Current Independent Work на месте, коммерческие bullets EPAM/Factor–IT не вытеснены. Результаты записаны в TASK-E.
- [ ] AC15. `Lint`, `Typecheck`, `Test (apps/api)`, `Test (e2e)` зелёные, coverage floor не опустился.
- [ ] AC16. Документация обновлена:
  - `apps/api/knowledge-sources/README.md`;
  - `apps/api/CLAUDE.md` (evidence, document-export);
  - `docs/08_ai_pipeline.md` (registry, export gate, имена файлов);
  - `docs/01_requirements.md`, `docs/03_domain_model.md` (имена файлов);
  - ADR-034 amendment в `project-management/DECISIONS.md`.

## Test Requirement (Sketch)

- Unit: парсер registry, EvidenceGuard (проекты, сертификаты, архивные упоминания, manual note), export gate, передача registries в guard из Prompt 2, `critical-prompt-content.spec.ts`, набор тестов «active knowledge sources».
- E2E: существующие наборы с обновлёнными fixtures (registry-блоки в fixture-источниках).
- Manual (не гейтится): три реальных smoke-прогона. Database/financial, Azure и Python — P1.

## Open Questions

Нет. Решения владельца от 2026-11-23 зафиксированы в In Scope и Key Invariants.

## Documentation to Update

См. AC16.

## Влияние на конечный автомат

Не применимо: фича не меняет состояние. Export gate отказывает до перехода `paused_before_export → export_running`.

## Влияние на модель данных

Prisma-схема не меняется. Меняются:
- строки `KnowledgeSource` (регистрация новых версий);
- `PromptTemplate` (seed новых активных версий);
- описания `EvidenceItem` (seed);
- поля `overclaiming_check.registry_violations: string[]` и `overclaiming_check.registry_snapshot` (архивные названия и aliases, допущенные проекты и сертификаты, принятые через manual note незарегистрированные названия) в JSON-артефакте `02_targeted_cv_content.json`. Их пишет guard, модель их не возвращает; при валидации AI-ответа поля необязательные.

## API-поверхность

HTTP-маршруты не меняются. `POST` экспорта получает новую причину ответа 400 («Export blocked: registry violations …»). Описание ответа 400 в Swagger (`@ApiResponse`) дополняется по ADR-019.

## Proposed Subtask Breakdown (only if this is an epic)

1. TASK-A — Portfolio Evidence Refresh (AC1, AC2, AC3 — источники проектов)
2. TASK-B — Skills and Credentials Refresh (AC4, AC5, AC3 — seed)
3. TASK-C — Master Summary and Career Positioning (AC6, AC7, AC3 — правила)
4. TASK-D — Registry-Aware Selection and EvidenceGuard (AC3 — промпты, AC8–AC12)
5. TASK-E — Integration and CV Validation (AC13–AC16)

Эпик-ветка не используется: каждая задача — отдельный PR в `main`.

## Amendment TASK-D1 (2026-11-24, #696; редакция 2.1 после consolidated review и финальной проверки; действует после одобрения владельцем)

Основание: consolidated review PR #695 отложил четыре изменения (portfolio-wide Current Independent Work, гибкое placement JobFlow, оформление сертификатов, cover letter v5); ревью плана владельцем и внешним ревьюером добавило позиционирование профессиональной AI-assisted разработки, согласование Prompt 3 и вход cover letter. План, альтернативы и решения по каждому предложению — `plan/PLAN-career-evidence-refresh.md`, раздел «TASK-D1».

Изменения требований:
- **In Scope п. 8 / AC7.** Current Independent Work: small tasks → JobFlow → **обзор портфеля** (обязателен; 1–2 грани по вакансии, по виду, без названий и без механизмов записей Selected Projects) → 0–1 **дополнительное доказательство** (реализованное достижение, практика, hands-on обучение или курс — только при покрытии требования) → volunteering по рынку. Обычно 4 bullets, до 5; без volunteering допустимо 3 без наполнителя. Даты, место, stable intro и bullet о small tasks не меняются.
- **Отбор проектов.** `cvEligible` и `placement` — жёсткие ограничения; `roleFamilies` — релевантность по умолчанию; «Do not include» → «Not by default», снимается inclusion test; лимит двух AI-проектов удаляется. Узкое исключение: проект AI-assisted разработки допустим без упоминания AI, только если вакансия требует построения developer tooling, CI-автоматизации или quality gates, которых не покрывает коммерческий опыт.
- **AI-assisted разработка.** Вес AI (Core / Plus / не упомянут) решает объём, вид запроса (использование ассистентов, качество AI-кода, workflow, tooling, LLM integration, agent frameworks) — какой факт показан. При «AI coding assistants as a plus» компактная запись проекта AI-assisted разработки — выбор по умолчанию, если она не вытесняет requirement-covering коммерческий bullet и CV укладывается в `max_pages`. Core определяется важностью в вакансии, а не названием роли: в обычной backend/full-stack-роли с AI-assisted разработкой как ключевой обязанностью Summary остаётся A/B с полным AI-предложением. Категории A/B/C не смешиваются; коммерческий AI-опыт не утверждается.
- **Сертификаты.** `certifications[].title` остаётся registry-идентичностью; экспорт добавляет issuer, метку типа (`skill badge`) и год из `registry-snapshot/v2` в оба PDF; снимок v1 читается без метаданных; отсутствующие данные не выводятся.
- **Prompt 3 v10** — узкая правка проверки блока и дублирования под новую структуру.
- **Cover letter** (ранее Out of Scope) — v5 по актуальным источникам; письмо получает экспортированный CV, заново собранный из `02` + `03` (только видимые разделы), и называет только проекты и credentials, названные в нём; manual note письма их не добавляет (решение о допуске принимает guard Prompt 2, amendment ADR-034); `requirement_coverage` и `evidence_table` — только контекст.

Без изменений: Key Invariants этого PRD, registry-контракт, правила export gate, Prompt 1 v13, коммерческие факты. Отклонено: переменный главный проект блока и общий пул из пяти проектов. Отложено: отдельное поле personal AI skills (после TASK-E), детерминированная registry-проверка текста cover letter, tech debt #695 (кроме очистки рендереров).
