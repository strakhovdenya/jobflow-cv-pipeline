# Analysis: Career Evidence Audit — five priority repositories (2026-11-23)

Вспомогательный документ к `prd/PRD-career-evidence-refresh.md`. Фиксирует, что проверено в коде на дату аудита. PRD и план на этот документ ссылаются и не повторяют его.

**Метод.** Каждый репозиторий клонирован и прочитан локально (read-only). Факт считается проверенным, только если найден в коде, миграциях или CI, а не в README. Зависимость в `package.json` без места вызова фактом не считается. Живое состояние (Vercel, Supabase, Neon, GitHub branch protection) **не проверялось**: всё о деплое — `needs evidence`, пока владелец не подтвердит.

**Классы доказательств** (используются ниже и в registry):

| Класс | Значение |
|---|---|
| `commercial` | Подтверждённый коммерческий production-опыт (EPAM, Factor–IT, CHI) |
| `personal_verified` | Личный проект, реализация видна в коде |
| `training_verified` | Пройденный hands-on lab/course/badge (скриншот кандидата) |
| `candidate_confirmed` | Заявлено кандидатом, независимо не проверено |
| `planned` | Запланировано или экспериментально, не реализовано |
| `needs_evidence` | Доказательств нет |

---

## 1. JobFlow: как сейчас устроен поток

`Career Sources → Prompt 1 → review gate → Prompt 2 → EvidenceGuard → (Prompt 3 / skip) → deterministic export`. Поток реализован так, как описан в документации. Разница с документацией только одна: **выбор проектов, навыков и сертификатов полностью отдан LLM**, кода для него нет.

| Область | Факт (код) |
|---|---|
| Хранилище знаний | Markdown-файлы в `apps/api/knowledge-sources/`. Модель `KnowledgeSource` (`schema.prisma`) хранит `filePath/sourceType/isActive/contentHash/versionLabel`, без enum-статусов. Новая версия — новый файл, старая остаётся (README). |
| Активная версия | Задаётся списком `SOURCES` в `apps/api/scripts/register-knowledge-sources.ts:13`. Регистрация деактивирует всё остальное. Версия не вычисляется. |
| Подача в промпт | `knowledge-source-selection.service.ts`, `STEP_SOURCE_GROUPS`: `prompt_1`/`prompt_2` получают **полный текст** шести обязательных источников + `certifications` (и `layout` у Prompt 2). Без фильтрации и без усечения. Читаются только `.md`/`.txt` (`knowledge-source-content.service.ts:21`), содержимое сверяется по hash. |
| Активные промпты | `prisma/seed.ts`: Prompt 1 = `prompt1_v12.txt`, Prompt 2 = `prompt2_v10.txt`, Prompt 3 = `prompt3_v8.txt`. Тест `critical-prompt-content.spec.ts` закрепляет эти версии. |
| **Пул проектов** | **Прописан в промпте**: `prompt2_v10.txt`, раздел `=== SELECTED PROJECTS ===` (≈ стр. 308–313) — AI Job Assistant, AI Bootcamp RAG Service, AI-Assisted Software Factory, Email Camp. `prompt1_v12.txt:197` и `prompt3_v8.txt:75,106,204` тоже называют эти проекты. |
| Current Independent Work | `prompt2_v10.txt` (≈ стр. 238–290): ровно четыре пункта — independent work, JobFlow (меню фасетов), «Python/FastAPI learning» (по сути стек AI Job Assistant), volunteering. |
| Логика выбора | Только prompt-правило «Inclusion test — coverage, not topic». Само правило хорошее, но пул устарел. В коде `selected_projects`/`certifications` фильтруются лишь по `include` (`prompt2-to-cv-content.mapper.ts`, `cv-template-renderer.ts`). Лимитов количества в коде нет. |
| EvidenceGuard | `evidence-guard.service.ts:120 checkOutput(output, evidenceItems, manualNotes)`. Делает regex `CRITICAL_PATTERNS` (commercial AI, AI Engineer, fluent English и т. п.) и проверяет skills/tech_stack по `EvidenceItem` (33 записи в seed) через совпадение подстроки. `critical_issues` сохраняются, но **не блокируют** шаг. Названия проектов и сертификатов **не проверяются**. |
| CvQualityGuard | `eval/cv-quality-guard.service.ts` в pipeline не подключён (открытый #404). |
| Устаревшие факты | (а) Правило «JobFlow and the factory are one repository» (`CV_Format_Rules_EN_v0_5`, Prompt 2/3) устарело: с 2026-10 фабрика — отдельный пакет `dark-factory`. (б) AI Job Assistant активен в 7 из 8 активных источников и в трёх активных промптах. (в) `seed.ts:87,236` (`EvidenceItem` про OpenAI API и GitHub Actions) ссылаются на AI Job Assistant. (г) `fake.provider.ts:148` использует его как fixture. |
| Стоимость контекста | Активные источники ≈ 480 KB текста попадают в каждый вызов Prompt 1/2. Каждый новый «Update»-раздел увеличивает стоимость. |

Связанные открытые issues: #404 (дыры EvidenceGuard, `current_work_block` не сканируется), #252 (состав источников Prompt 2), #281 (versioning KnowledgeSource). Эти issues мы не дублируем.

---

## 2. Инвентаризация пяти репозиториев

### P1 — Dark Factory · `github.com/strakhovdenya/dark-factory` · HEAD `054feb3` (2026-11-15)

- **Назначение:** переиспользуемый npm-пакет (`v0.1.0…v0.1.3`, GitHub releases), который ставит AI-assisted delivery workflow в другие репозитории: Claude Code hooks/skills/agents, Ralph, Acceptance Verifier, Calibration Judge.
- **Реализовано (код):**
  - Ralph: Claude Code CLI headless (`ralph/agent.js`), fresh clone + branch (`ralph/workspace.js:77`). У агента нет `git push/commit/gh` (`workspace.js:437`). Конвейер `implement → self-review → code-review → final-gate` (`ralph/steps/registry.js`), PR создаёт контроллер (`ralph/github.js:323`). Issues берутся из списка в профиле с `dependsOn` (`ralph/config.js:95`), а не GitHub-запросом.
  - Docker sandbox: `ralph/sandbox/Dockerfile` + `ralph/sandbox.js`, egress proxy (`ralph/sandbox/proxy.js`). Отдельный CI-job `ralph-sandbox-integration.yml`.
  - Acceptance Verifier: reusable workflow на `openai/codex-action`, allowlist моделей. Вердикт считает код (`verifier/verdict.js`, `NEEDS_HUMAN` при расхождении двух прогонов). Есть checks, в т. ч. test-tampering и protected paths (`ralph/boundary.js`).
  - Calibration Judge (`judge/`), issue linter (`verifier/issue-lint.js`), пять Claude Code hooks (fail-closed), setup/postinstall в consumer-репозитории.
  - 84 тест-файла `node --test`. CI на Linux и Windows: lint, typecheck, test.
- **Переиспользование (проверено):** `dark-factory#v0.1.3` подключён в **JobFlow**, **Cards** (`package.json:58`, `.claude/settings.json`, `.factory/`) и **B1 Kompass** (`package.json:40`). В **Home Budget не установлен**: там Codex-native адаптация (`docs/AGENT_FACTORY.md`: «not an installation or fork»).
- **Не подтверждено:** GitHub Projects в коде (отсутствует); фактический прогон Ralph «в бою» (документирован один consumer-run, PR #678); что Judge «только наблюдает».
- **Класс:** `personal_verified`. **Зрелость:** рабочий пакет с релизами, 3 consumer-репозитория одного владельца. **Confidence:** high.
- **Роли:** AI-assisted SE, Developer Productivity, AI Integration, Software Architect (tooling), Quality Engineering.
- **Запрещено:** autonomous production deployment, enterprise/team adoption, external users, auto-merge, «AI platform ownership», commercial AI.

### P2 — JobFlow CV Pipeline · HEAD `5f97499`

- **Реализовано:** NestJS 11/TS, Prisma/PostgreSQL (migrations), REST + Swagger (ADR-019), API-key guard, throttling, явный status machine (ADR-038), BullMQ/Redis AI-jobs (202 + jobId), `AiProvider` + OpenAI, LLM call policy, prompt versioning + source snapshots + hash, token/cost tracking, EvidenceGuard, deterministic HTML/PDF + ATS-вариант (Handlebars/Puppeteer), Next.js dashboard (`apps/web`).
- **Тесты/CI:** 79 unit spec в `apps/api/src`, 3 e2e-набора, coverage floor 90/68/90/90; ~35 тест-файлов web. Workflows: `ci.yml`, `codeql.yml`, `acceptance-verifier*.yml`, `calibration-judge.yml`, `spec-approval.yml`.
- **Масштаб:** 782 коммита (с 2026-06-28), 354 merged PR, 45 ADR.
- **Не подтверждено:** публичный деплой, пользователи кроме владельца. Нет user auth, только API key.
- **Класс:** `personal_verified`. **Confidence:** high. **Роли:** Backend Node.js/NestJS, AI Integration, PostgreSQL.
- **Циклическая ссылка:** доказательства о JobFlow берутся только из кода и ADR репозитория. Сгенерированные CV (`storage/`, `golden-dataset/`) источником фактов не являются.

### P3 — Cards · HEAD `b90b9e5` (2026-10-30)

- **Назначение (код):** тренажёр немецкой лексики: flashcards, артикли, спряжение глаголов, время (`src/components/*Trainer*`, `VerbTraining.tsx`, `TimeTraining.tsx`). Редактор карточек, bulk import.
- **Стек (используется):** Next.js 16 App Router, React 19, TS, Supabase (auth email/password, invite-only через RPC, 7 таблиц), Upstash rate-limit с in-memory fallback, Strategy pattern для типов карточек. ~18 route handlers.
- **Demo/guest:** read-only demo-пользователь, запрет записи на сервере (`src/lib/auth-server.ts:74-76`), прогресс гостя в localStorage.
- **Тесты/CI:** 47 файлов Vitest + 1 Playwright. CI: check, test, build, CodeQL, factory-separation.
- **Не подтверждено / противоречит источникам:** RLS-политики лежат как ручные SQL в `docs/` (не миграции), живое состояние `needs_evidence`. **i18n-библиотеки нет**: UI на русском, «multilingual UI» в текущих источниках не подтверждается. **AI-вызовов нет** (только копирование prompt в буфер). Нет spaced repetition и PWA. React Query, вопреки `Project_Inventory v0.7`, не найден. Live demo URL из README не проверялся.
- **Класс:** `personal_verified`. **Зрелость:** средняя, рабочее приложение с 2025-07. **Роли:** Full-stack, React/Next.js.

### P4 — B1 Kompass · HEAD `2766a0b` (2026-11-19)

- **Назначение (код):** онлайн-тренажёр экзамена DTZ (A2–B1), Hören + Lesen, гостевой режим без регистрации. Интерфейс EN/RU (`next-intl`).
- **Стек:** npm-workspaces monorepo (`packages/domain` — чистый TS + zod, `apps/web`), Next.js 16, React 19, MUI 7, TS `strict` + `noUncheckedIndexedAccess`. 10 route handlers. Supabase: **15 SQL-миграций**, 15 таблиц, RLS, signed URLs в Storage.
- **Техническая сложность (код):** server-side тайминг экзамена с ревизиями timing-profiles, immutable exam versions + trigger на неизменяемость answer keys, publish guard в SQL, httpOnly guest-cookie, origin check, scoring по правилам DTZ (`packages/domain/src/scoring/dtz.ts`). Интеграции MyMemory/OpenThesaurus с кэшем и бюджетом.
- **Тесты/CI:** 29 unit (Vitest) + 49 Playwright-спек на изолированном локальном Supabase. CI: typecheck, lint, unit, build, `supabase start`, E2E. Ручной `release-production.yml` (Vercel CLI). Подключён Dark Factory (verifier/spec-approval).
- **AI в приложении:** нет.
- **Не подтверждено:** продакшн-деплой и число экзаменов (README: «owner-reported, not independently verified»), «answer key never leaves the server» прослежено не до конца.
- **Класс:** `personal_verified`. **Зрелость:** самый инженерно-зрелый full-stack проект из пяти (E2E в CI, миграции, release-процесс). **Роли:** Full-stack, Next.js/TS, product engineering, немецкий рынок.

### P5 — Home Budget · HEAD `1561218` (2026-11-18)

- **Назначение (код):** личное бюджетирование для одного владельца (EUR, одна карта): подтверждённые checkpoints баланса, распределение по месяцам, резервы обязательств, накопления, дневной прогноз, закрытие месяца с immutable-версиями, история, аналитика, onboarding.
- **Стек:** Next.js 16, React 19, MUI 9, next-intl, Auth.js (Google OAuth, один allowlisted email с `email_verified`), **Drizzle ORM + PostgreSQL**, 6 ручных SQL-миграций, 12 таблиц, `audit_events`, CHECK-constraint на валюту.
- **Финансовая логика (код):** деньги — `bigint` cents (`schema.ts:5`, `money.ts`), арифметика с проверкой диапазона и `Result`-типами (`addCents`), `periodBudget`, `calculateLiquidity`, `calculatePeriodReserves`, `planAllocationChange`. Часовой пояс Berlin (`BerlinDate`).
- **Тесты/CI:** ~100 тест-файлов (domain, 18 integration на реальной PostgreSQL, Playwright E2E). CI: lint, typecheck, unit, build, двойной `db:migrate`, integration, прогон под другой TZ, `check-finance-coverage.mjs` gate.
- **AI workflow:** Codex-native (`AGENTS.md`, `.codex/`, `.agents/skills/`), Dark Factory не установлен. ~27 % tracked-файлов — vendored skill docs.
- **Не реализовано:** категории, транзакции, экспорт, PDF-импорт, мультивалютность, multi-user. Деплой: `needs_evidence` (в `.env.example` «Neon is rejected», но есть коммит про Neon channel binding; production release «gated» по `docs/TASKS.md`). Владельческая авторизация в каждой server action проверена не полностью.
- **Класс:** `personal_verified`. **Зрелость:** ранняя, но дисциплинированная (44 коммита за 18 дней). **Роли:** Backend/business-logic, PostgreSQL/data integrity, FinTech-adjacent, Full-stack.
- **Запрещено:** production users, банковские интеграции, платежи, мультивалютность, «FinTech experience» как коммерческий опыт.

### Retire — AI Job Assistant (`job-assistant`, Python, последний коммит 2026-05-19)

Не завершён, в пять приоритетных не входит. Сейчас активно упоминается: Master_CV v0.7 (9), Profile Summary v0.7 (15), Tech_Stack v2.4 (15), Deep Dives v0.8 (9), CV_Format_Rules v0.5 (6), Project_Inventory v0.7 (4), LinkedIn decision v0.3 (4), а также `prompt1_v12`, `prompt2_v10` (стр. 158, 310, 330), `prompt3_v8`, `seed.ts:87,236`. Python/FastAPI при этом остаются подтверждёнными другими источниками: Udemy FastAPI course (`training_verified`), AI Bootcamp RAG Service (в этом аудите не проверялся → `needs_evidence`, не в пятёрке).

---

## 3. Матрица релевантности (высокая ● / средняя ◐ / низкая ○ / нет —)

| Вакансия | EPAM | Factor–IT | JobFlow | Dark Factory | Cards | B1 Kompass | Home Budget | Google ADK |
|---|---|---|---|---|---|---|---|---|
| Backend Node.js/TS | ● | ◐ | ● | ○ | — | ○ | ◐ | — |
| NestJS | ◐ | — | ● | — | — | — | — | — |
| AI Integration / LLM | ◐ | — | ● | ◐ | — | — | — | ◐ |
| AI-assisted SE / DevProd | ◐ | — | ◐ | ● | ○ | ◐ (factory consumer) | ○ (Codex) | ◐ |
| React/Next.js Full-stack | ● | — | ◐ (dashboard) | — | ◐ | ● | ◐ | — |
| Database / Financial backend | ◐ | ● | ◐ | — | — | ◐ (SQL-триггеры) | ● | — |
| Azure / Production backend | ● | ○ | ○ | — | — | — | — | — |

---

## 4. Google Cloud (кандидат, скриншоты от 2026-11-23)

| Запись | Тип | Статус | Класс | CV-раздел |
|---|---|---|---|---|
| Engineer AI Agents with Agent Development Kit (ADK) — Google Cloud, Credly, 2026-11-23, Intermediate | Google Cloud Skill Badge (не professional certification) | earned | `training_verified` (URL/ID не предоставлены) | Certifications, если вакансия про AI/agents |
| 9 labs (ADK Challenge Labs ×2, Agent Runtime, Multi-Agent Systems, tools, Get Started ADK, Antigravity ×3 вкл. MCP + Go) | hands-on lab, 100 % | completed | `training_verified` | только как подкрепление навыка, не в Certifications |
| Professional Agentic Architect Certification — Path; Deploy Production Ready Agents — Path | learning path | started, не завершены (нет «Date finished») | `planned` | **никогда** |
| Wrap Up: Deploy Production-Ready Agents — Course | course (завершающий модуль незавершённого path) | completed, passed, 2026-11-22, без score | `training_verified` | не в Certifications (часть path); только как подкрепление навыка |
| Build Agent Skills with Google — Course | course | started, не завершён | `planned` | **никогда** |
| Quiz — Check | check | passed 100 %, 2026-11-21 | — | не выводится |

Источник — второй скриншот кандидата (activity history, 2026-11-23). Даты вычислены из относительных («N days ago») от 2026-11-23. Все labs пройдены 2026-11-21 … 2026-11-23, в CV — «Nov 2026». Скриншот Credly подтверждает: badge «Engineer AI Agents with Agent Development Kit (ADK)», Google Cloud, issued November 23, 2026, Validation, Intermediate. Публичный URL и ID не предоставлены и не выдумываются.

Тезисы бейджа о tokenization/fine-tuning/pretraining практических навыков не доказывают. Lab-опыт деплоя ADK не равен production deployment агентов.

---

## 5. Главные пробелы (needs evidence)

1. ~~Живой деплой~~ — **подтверждён кандидатом 2026-11-23** (`candidate_confirmed`): Cards и B1 Kompass работают публично. Home Budget работает как **частное приложение только для владельца**, без публичной ссылки и без demo. В CV: публичные ссылки — только Cards и B1 Kompass; Home Budget — «private single-owner app», без URL и без утверждений о пользователях.
2. Credly URL бейджа — не предоставлен (даты labs закрыты скриншотом, см. раздел 4).
3. ~~Статус двух Google-курсов~~ — закрыт скриншотом (раздел 4).
4. Реальные RLS-политики Cards (ручные SQL в `docs/`).
5. Детали и рамки «small independent paid tasks» (без изменений с v0.6).

---

## 6. Дополнение 2026-11-23: решения владельца, уточнения и ограничения

### 6.1 Решения владельца (финальные)

| Тема | Решение |
|---|---|
| Основные проекты | ровно пять: `dark-factory`, `jobflow-cv-pipeline`, `cards`, `b1-kompass`, `home-budget` (все `primary`, `cvEligible: true`; выбор в CV — по вакансии) |
| AI Job Assistant | `archived`, `cvEligible: false`; вернуть можно только явным решением владельца |
| Email Camp | `archived`, `cvEligible: false` |
| AI Bootcamp RAG Service | `secondary`, не проверен → `needs_evidence`, `cvEligible: false`; проверка отложена (P1) |
| Деплой | Cards и B1 Kompass публичны (URL из их README); Home Budget — частное приложение одного владельца, без URL |

### 6.2 Уточнения к разделам 1–2

- **Граница git-прав агента в Dark Factory** (`ralph/workspace.js:431-437`, HEAD `054feb3`). Агенту разрешено только чтение: `git status`, `git diff`, `git log`, а на review-проходах ещё `git show`. Всегда запрещены `git commit`, `git push` и `gh`. Commit, push и PR делает контроллер. Формулировка «no Git access» неточна и не используется.
- **Consumer-репозитории Dark Factory:** JobFlow, Cards и B1 Kompass (`dark-factory#v0.1.3`). В B1 Kompass используются verifier и spec approval, Ralph не найден. Поэтому формулировка «installed in three personal repositories» точна, а «Ralph runs in three repositories» — нет.
- **Codex-native workflow в Home Budget** (`AGENTS.md`, `.codex/`, `.agents/skills/`, `docs/AGENT_FACTORY.md`) — отдельное доказательство AI-assisted разработки (категория A). Это не установка Dark Factory.
- **Активные промпты** называют архивные проекты:
  - `prompt1_v12.txt:197`;
  - `prompt2_v10.txt:158, 310, 313, 330`;
  - `prompt3_v8.txt:75, 106, 204`.

  Описания исторических `PromptTemplate` в `seed.ts:379, 459` — история, их не переписываем. Активные описания `EvidenceItem` в `seed.ts:87, 236` нужно исправить.
- **Export уже имеет детерминированный блокирующий guard** до claim: `candidateProfileGuard` в `document-export.service.ts:96-103` (ADR-032). Это образец для export gate по registry: статус не меняется, переходы не нужны.
- **Prompt 2 падает при исключении в guard** (путь «Evidence guard failed», `prompt2.service.ts:242-248`), а `critical_issues` шаг не блокируют. Поэтому fail-closed по registry делается на двух уровнях: ошибка registry роняет Prompt 2, нарушения блокируют экспорт.
- **Имена активных файлов** перечислены в `docs/01_requirements.md:481-487`, `docs/03_domain_model.md:870, 1092-1098`, `docs/08_ai_pipeline.md` (много мест) и `fake.provider.ts:97-109`. Их нужно обновить вместе с новыми версиями.

### 6.3 Практические AI-доказательства по категориям

| Категория | Доказательства (класс) |
|---|---|
| A — AI-assisted Software Engineering | Dark Factory: Claude Code hooks/skills/agents, Ralph, Codex verifier (`personal_verified`). JobFlow: построен через Claude Code + Ralph + verifier, 354 merged PR (`personal_verified`). Cards и B1 Kompass: тот же workflow (`personal_verified`). Home Budget: Codex-native workflow (`personal_verified`). |
| B — AI Integration & Agent Workflow Engineering | JobFlow: `AiProvider` + OpenAI API, structured output validation, LLM call policy, BullMQ/Redis AI jobs, human review gates, EvidenceGuard (`personal_verified`). Dark Factory: оркестрация агента в Docker sandbox, детерминированный вердикт, protected paths, test-tampering scan (`personal_verified`). |
| C — Agent Development Training | Google ADK skill badge, 9 labs, wrap-up course (`training_verified`); Anthropic MCP Intro/Advanced, Claude Code 101 (`training_verified` по inventory 2026-06). |

Ни одна категория не означает коммерческий AI- или production-опыт. В Summary и CV порядок такой: A/B (реализация) впереди C (обучение). Исключение — вакансия, где ADK явно в требованиях.

### 6.4 Оставшиеся пробелы

1. Credly URL/ID бейджа не предоставлены (`null`).
2. Live-состояние RLS в Cards не проверено: в CV RLS для Cards не утверждаем.
3. AI Bootcamp RAG Service не проверен (P1).
4. Владельческая проверка доступа в каждой server action Home Budget прослежена не полностью: в CV не утверждаем «per-action authorization».
