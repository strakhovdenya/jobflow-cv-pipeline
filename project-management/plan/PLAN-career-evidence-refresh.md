# Plan: Career Evidence Refresh and Registry-Aware Portfolio Selection

**PRD:** `project-management/prd/PRD-career-evidence-refresh.md`
**Audit:** `project-management/analysis-career-evidence-audit-2026-11.md`
**Date:** 2026-11-23 (final revision)
**Status:** Ready for final owner review

## Архитектура: A+

**Состав:** существующие Markdown knowledge sources + строгие registry-блоки внутри них + промпты, которые читают registry + детерминированная проверка в EvidenceGuard + export gate по образцу ADR-032.

**Поток доказательств:**

```text
knowledge-sources/*.md (новая версия, PR владельца)
  → register-knowledge-sources (одна активная версия каждого типа)
  → Prompt 2 input builder: полный текст источников + разобранные registries
  → LLM: выбор по «coverage, not topic» только среди cvEligible-записей
  → EvidenceGuard: registry_violations (+ critical_issues)
  → review gate (человек) → Prompt 3 / skip
  → export gate (до claim): эффективный контент (Prompt 2 + corrections Prompt 3) × registry_snapshot → нарушения? 400
  → deterministic HTML/PDF
```

**Что НЕ строим:** Prisma-модели и миграции для registry, UI портфолио, GitHub sync и фоновый мониторинг, scoring engine, блокировку экспорта по остальным `critical_issues`, изменения статус-машины, правки `apps/web`.

| Вариант | Сложность | Миграции | Тестируемость | Риск overclaiming | Решение |
|---|---|---|---|---|---|
| A — только источники и промпты | низкая | нет | низкая | средний | недостаточно |
| **A+** | низкая–средняя | нет | высокая | низкий | **выбран** |
| B — Prisma registry | высокая | да | высокая | низкий | P2 |
| C — GitHub sync | очень высокая | да | средняя | высокий без ревью | P2 |

## Registry-контракт (strict)

### Синтаксис

- Блок — fenced code с info string ровно `json portfolio-registry` или `json credential-registry`; закрывается строкой ```` ``` ````.
- `portfolio-registry` ищется только в активном источнике `sourceType: project_inventory`, `credential-registry` — только в `sourceType: certifications`.
- В источнике ровно один блок своего типа. Ноль блоков или больше одного — ошибка.
- Содержимое — строгий JSON (RFC 8259): без комментариев и без висячих запятых. Неизвестные поля — ошибка.

### `portfolio-registry/v1`

| Поле | Обяз. | Тип / значения | Смысл |
|---|---|---|---|
| `schema` | да | `"portfolio-registry/v1"` | версия контракта |
| `projects[].id` | да | kebab-case, уникален | стабильный ключ |
| `projects[].title` | да | string | точное название для CV |
| `projects[].status` | да | `active` \| `archived` | жизненный статус |
| `projects[].cvEligible` | да | boolean | **единственный** признак допуска в CV |
| `projects[].portfolioPriority` | да | `primary` \| `secondary` \| `none` | только приоритет видимости, допуска не даёт |
| `projects[].placement` | да | `current_work_block` \| `selected_projects` \| `none` | раздел CV |
| `projects[].evidenceClass` | да | `personal_verified` \| `candidate_confirmed` \| `needs_evidence` | класс доказательства |
| `projects[].repositoryUrl` | да | `https://…` или `null` | публичный репозиторий |
| `projects[].lastVerifiedAt` | да | `YYYY-MM-DD` | дата проверки |
| `projects[].aliases` | нет | string[] | другие названия для сопоставления |
| `projects[].verifiedCommit` | нет | string | проверенный commit |
| `projects[].deployment` | нет | `{ "kind": "public" \| "private_single_owner" \| "package" \| "none", "url": string \| null }` | деплой |
| `projects[].roleFamilies` | нет | enum[] (ниже) | для каких вакансий проект релевантен |
| `projects[].techStack`, `allowedWording`, `prohibitedClaims` | нет | string[] | для промпта и интервью |

`roleFamilies`: `backend_node`, `nestjs`, `ai_integration`, `ai_assisted_engineering`, `developer_productivity`, `fullstack_react`, `database_financial`, `azure_production`, `python_secondary`.

Правила согласованности (нарушение → ошибка парсера):
- `status: archived` ⇒ `cvEligible: false`, `placement: none`, `portfolioPriority: none`;
- `evidenceClass: needs_evidence` ⇒ `cvEligible: false`;
- `cvEligible: true` ⇒ `placement` ≠ `none`;
- `deployment.kind: private_single_owner` ⇒ `deployment.url: null`;
- не больше одной записи с `placement: current_work_block`.

### `credential-registry/v1`

| Поле | Обяз. | Тип / значения |
|---|---|---|
| `schema` | да | `"credential-registry/v1"` |
| `credentials[].id` | да | kebab-case, уникален |
| `credentials[].title` | да | точное название credential |
| `credentials[].issuer` | да | string |
| `credentials[].type` | да | `professional_certificate` \| `skill_badge` \| `course_completion` \| `lab` \| `learning_path` \| `assessment` |
| `credentials[].status` | да | `earned` \| `completed` \| `in_progress` |
| `credentials[].cvEligible` | да | boolean |
| `credentials[].evidenceClass` | да | `training_verified` \| `candidate_confirmed` \| `needs_evidence` |
| `credentials[].issued` | да | `YYYY-MM` или `null` |
| `credentials[].credentialId`, `verificationUrl` | нет | string \| `null` |
| `credentials[].aliases`, `skills`, `roleFamilies` | нет | string[] / enum[] |
| `credentials[].aiCategory` | нет | `ai_assisted_engineering` \| `ai_integration` \| `agent_training` |

Правила: `type` ∈ {`lab`, `learning_path`, `assessment`} ⇒ `cvEligible: false`; `status: in_progress` ⇒ `cvEligible: false`; `evidenceClass: needs_evidence` ⇒ `cvEligible: false`.

### Сопоставление и ошибки

- Нормализация: Unicode NFKC, lowercase, схлопнутые пробелы, `trim`. Значение из CV совпадает, если нормализованное значение равно нормализованному `title` или одному из `aliases`.
- Дубликат `id`, а также нормализованного `title` или `alias` внутри одного registry — ошибка.
- Поиск архивного проекта в тексте: экранированное название или alias, без учёта регистра, с границами слова по Unicode (без конструирования regex из неэкранированного ввода).
- Ошибки — typed `CareerRegistryError` с `blockType` и читаемой причиной. В Prompt 2 ошибка проходит существующим путём «Evidence guard failed» (шаг падает, статус откатывается через `StepFailureService`). Пропуска проверки при отсутствующем блоке нет: это fail-closed.

### Пример (валидный JSON)

```json portfolio-registry
{
  "schema": "portfolio-registry/v1",
  "projects": [
    {
      "id": "dark-factory",
      "title": "Dark Factory",
      "aliases": ["dark-factory"],
      "status": "active",
      "cvEligible": true,
      "portfolioPriority": "primary",
      "placement": "selected_projects",
      "evidenceClass": "personal_verified",
      "repositoryUrl": "https://github.com/strakhovdenya/dark-factory",
      "lastVerifiedAt": "2026-11-23",
      "verifiedCommit": "054feb3",
      "deployment": { "kind": "package", "url": null },
      "roleFamilies": ["ai_assisted_engineering", "developer_productivity", "ai_integration"]
    },
    {
      "id": "home-budget",
      "title": "Home Budget",
      "status": "active",
      "cvEligible": true,
      "portfolioPriority": "primary",
      "placement": "selected_projects",
      "evidenceClass": "personal_verified",
      "repositoryUrl": "https://github.com/strakhovdenya/home-budget",
      "lastVerifiedAt": "2026-11-23",
      "verifiedCommit": "1561218",
      "deployment": { "kind": "private_single_owner", "url": null },
      "roleFamilies": ["database_financial", "fullstack_react", "backend_node"]
    },
    {
      "id": "ai-job-assistant",
      "title": "AI Job Assistant",
      "status": "archived",
      "cvEligible": false,
      "portfolioPriority": "none",
      "placement": "none",
      "evidenceClass": "personal_verified",
      "repositoryUrl": "https://github.com/strakhovdenya/job-assistant",
      "lastVerifiedAt": "2026-11-23"
    }
  ]
}
```

```json credential-registry
{
  "schema": "credential-registry/v1",
  "credentials": [
    {
      "id": "gc-adk-engineer-ai-agents",
      "title": "Engineer AI Agents with Agent Development Kit (ADK)",
      "issuer": "Google Cloud",
      "type": "skill_badge",
      "status": "earned",
      "cvEligible": true,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "credentialId": null,
      "verificationUrl": null,
      "aiCategory": "agent_training",
      "roleFamilies": ["ai_integration", "ai_assisted_engineering"]
    },
    {
      "id": "gc-lab-multi-agent-adk",
      "title": "Build Multi-Agent Systems with ADK",
      "issuer": "Google Cloud",
      "type": "lab",
      "status": "completed",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": "2026-11",
      "aiCategory": "agent_training"
    },
    {
      "id": "gc-path-professional-agentic-architect",
      "title": "Professional Agentic Architect Certification",
      "issuer": "Google Cloud",
      "type": "learning_path",
      "status": "in_progress",
      "cvEligible": false,
      "evidenceClass": "training_verified",
      "issued": null
    }
  ]
}
```

## Файлы и модули

| Задача | Файлы |
|---|---|
| A | `knowledge-sources/evidence/Project_Inventory_RU_v0_8_portfolio_refresh.md`, `knowledge-sources/evidence/Career_Case_Deep_Dives_RU_v0_9_portfolio_refresh.md`, `knowledge-sources/candidate-profile/Master_CV_RU_v0_8_portfolio_refresh.md` (новые), `scripts/register-knowledge-sources.ts`, `knowledge-sources/README.md` |
| B | `knowledge-sources/certifications/LinkedIn_Certifications_Inventory_RU_EN_2026-11.md`, `knowledge-sources/evidence/Tech_Stack_Matrix_RU_v2_5_portfolio_refresh.md` (новые), `prisma/seed.ts` (`evidenceItems`), `scripts/register-knowledge-sources.ts`, `knowledge-sources/README.md` |
| C | `knowledge-sources/candidate-profile/Master_Profile_Summary_RU_v0_8_portfolio_refresh.md`, `knowledge-sources/cv-rules/CV_Format_Rules_EN_v0_6_portfolio_refresh.md` (новые), `scripts/register-knowledge-sources.ts`, `knowledge-sources/README.md` |
| D | `src/evidence/career-registry.parser.ts` (+spec, новые), `src/evidence/evidence-guard.service.ts` (+spec), `src/pipeline/prompt2/prompt2-input-builder.service.ts` (+spec), `src/pipeline/prompt2/prompt2.service.ts` (+spec), `src/pipeline/schemas/targeted-cv-content.schema.ts` (+spec), `src/evidence/registry-compliance.ts` (+spec, новые), `src/document-export/effective-cv-content.ts` (+spec, новые), `src/document-export/html-renderer.service.ts`, `ats-html-renderer.service.ts` (+spec), `src/document-export/document-export.service.ts` (+spec), `document-export.controller.ts` (Swagger 400), `prisma/prompts/prompt1_v13.txt`, `prompt2_v11.txt`, `prompt3_v9.txt` (новые), `prisma/seed.ts`, `src/prompt-templates/critical-prompt-content.spec.ts`, `src/ai/providers/fake.provider.ts`, `test/` fixtures, `apps/api/CLAUDE.md`, `docs/08_ai_pipeline.md` (раздел registry/export gate), `project-management/DECISIONS.md` (ADR-034 amendment) |
| E | `src/knowledge-sources/active-knowledge-sources.ts` (+spec, новые: перенос `SOURCES` из скрипта), `scripts/register-knowledge-sources.ts`, `docs/01_requirements.md`, `docs/03_domain_model.md`, `docs/08_ai_pipeline.md` (имена файлов), отчёт smoke-прогонов в issue |

## Implementation Phases

Две фазы, пять задач, каждая задача — один PR в `main`. A–C и промпты D меняют `protectedPaths` (`apps/api/knowledge-sources/`, `apps/api/prisma/prompts/`) и выполняются интерактивно, не Ralph.

### Phase 1: Career sources refresh
**Goal:** активные knowledge sources описывают пять основных проектов, AI-категории, Google Cloud и новый Summary строго и без устаревших рекомендаций; registry-блоки на месте.
**Affects:** `apps/api` (knowledge sources, `prisma/seed.ts`, скрипт регистрации).
**Tasks:**
- [ ] TASK-A — Portfolio Evidence Refresh (#686)
- [ ] TASK-B — Skills and Credentials Refresh (#687)
- [ ] TASK-C — Master Summary and Career Positioning (#688)

**Done when:** закрыты AC1–AC7 PRD.

### Phase 2: Registry-aware selection and validation
**Goal:** промпты и guard работают от registry, экспорт закрыт от нарушений registry, результат проверен тестами и реальными прогонами.
**Affects:** `apps/api` (`src/evidence`, `src/pipeline/prompt2`, `src/document-export`, prompts, seed, tests, docs).
**Tasks:**
- [ ] TASK-D — Registry-Aware Selection and EvidenceGuard (#689)
- [ ] TASK-E — Integration and CV Validation (#690)

**Done when:** закрыты AC3 (промпты), AC8–AC16 PRD.

### TASK-A — Portfolio Evidence Refresh (P0, ~0.5 д)

- Создать новые версии файлов из Affects (копия → правка тела, а не дописывание сверху).
- В `Project_Inventory` v0_8 — блок `portfolio-registry` (5 основных + AI Bootcamp RAG `secondary/needs_evidence` + AI Job Assistant и Email Camp `archived`). Кейсы:
  - Dark Factory — отдельный пакет, граница git-прав агента, 3 consumer-репозитория;
  - Cards — исправить стек;
  - B1 Kompass — новый кейс;
  - Home Budget — новый кейс;
  - JobFlow — актуальная зрелость.
- Прозаические разделы AI Job Assistant и Email Camp удаляются из новых версий (история остаётся в v0_7/v0_8 и старше).
- `Career_Case_Deep_Dives` v0_9: кейсы с фактами (`file`/commit), safe wording, prohibited claims, глубиной для интервью. Отдельно — Codex-native workflow Home Budget (AI-категория A), не путать с Dark Factory.
- `Master_CV` v0_8: список проектов и упоминания в рекомендациях приведены к registry.
- `SOURCES` и README — новые пути.

### TASK-B — Skills and Credentials Refresh (P0, ~0.3 д)

- Certifications 2026-11:
  - `credential-registry` со всеми прежними сертификатами и Google Cloud-записями из PRD (In Scope п. 6);
  - раздел «Recommended CV usage» по семействам вакансий, лимит 3–5;
  - labs не выводятся;
  - ADK — «skill badge», не «certification».
- Tech_Stack v2_5: таблица skill → commercial / personal (проект) / training (credential); три AI-категории A/B/C; Python/FastAPI опирается на курс FastAPI, AI Job Assistant не используется как основание; новые personal-технологии (Supabase, Drizzle, Auth.js, next-intl, MUI, Playwright, Vitest).
- `seed.ts` `evidenceItems`:
  - из описаний OpenAI API и GitHub Actions убраны архивные проекты;
  - добавлены `risky`-записи для personal/training навыков, которые могут попасть в `top_skills`: Supabase, Drizzle, Playwright, Claude Code, OpenAI Codex, Google ADK.
- Исторические описания `PromptTemplate` (≈ `seed.ts:379`, `:459`) не переписываются.

### TASK-C — Master Summary and Career Positioning (P0, ~0.3 д)

- Profile Summary v0_8: варианты A/B/C (ниже), правило выбора по вакансии, порядок AI-доказательств: коммерческий фундамент → Dark Factory/Claude Code/Codex → JobFlow AI integration → Google ADK (ADK выше, только если он явно в требованиях).
- CV Rules v0_6:
  - Dark Factory — отдельный репозиторий;
  - AI-weight таблица через `roleFamilies`;
  - таблица ожидаемого отбора (ниже);
  - третий bullet Current Independent Work — выбор конкретного факта (варианты ниже);
  - сертификаты — только `cvEligible`, 3–5, по релевантности, а не по дате;
  - стоп-лист Summary и headline.
- Устаревшие разделы v0_5 удаляются.

### TASK-D — Registry-Aware Selection and EvidenceGuard (P0, ~0.7 д)

- Парсер (`career-registry.parser.ts`): контракт выше, typed errors.
- `Prompt2InputResult` дополняется разобранными registries из уже загруженного содержимого (без повторного чтения файлов). `Prompt2Service` передаёт их в `checkOutput`.
- Guard:
  - `registry_violations` (+ те же строки в `critical_issues`);
  - сканирование архивных названий по публичным полям;
  - правило manual note из PRD.
- Правила registry — одна чистая функция `findRegistryViolations(content, snapshot)` в `src/evidence/registry-compliance.ts`. Её вызывают guard (на черновике Prompt 2) и export gate (на эффективном контенте).
- Схема: `overclaiming_check.registry_violations?: string[]` и `registry_snapshot?` (необязательные при валидации AI-ответа, всегда пишутся guard'ом).
- `src/document-export/effective-cv-content.ts`: одна функция сборки эффективного контента (валидация `02_targeted_cv_content.json` → `mapPrompt2OutputToCvContent` → corrections `03_pre_pdf_check.json` → `applyCorrectionsToCvContent`). Ей пользуются оба рендерера, вместо дублированного `readCorrections`.
- Export gate в `DocumentExportService.exportCv` рядом с `candidateProfileGuard` (до claim):
  - эффективный контент → `findRegistryViolations` со снимком из черновика;
  - нарушение или отсутствие снимка → 400 с перечнем и действием;
  - статус и файлы не меняются.
- Граница проверки — скорректированный структурированный контент, а не HTML: рендерер добавляет только статичный профиль (ADR-032) и литералы шаблона. Knowledge sources на экспорте не загружаются, экспорт остаётся функцией артефактов workspace.
- Обязательные регрессии: correction Prompt 3 вносит архивный проект → 400; correction вносит недопустимый сертификат → 400; валидная correction → экспорт проходит.
- Промпты v13/v11/v9:
  - литеральные перечни проектов заменены registry-правилами;
  - сертификаты — только `cvEligible`, title дословно;
  - третий bullet current-work — по CV Rules v0_6.
- `seed.ts`: новые версии активны. `critical-prompt-content.spec.ts`: новые версии + отсутствие названий из registry (названия берутся из активного `project_inventory`).
- `fake.provider.ts`: синтетический проект вместо архивного, имена файлов `evidence_source` — новые.
- e2e fixtures: минимальные синтетические registry-блоки.
- ADR-034 amendment (через skill `adr`). `apps/api/CLAUDE.md` и `docs/08_ai_pipeline.md`: registry и export gate.

### TASK-E — Integration and CV Validation (P0 частично, ~0.3 д + время провайдера)

- `SOURCES` переносится в `src/knowledge-sources/active-knowledge-sources.ts` (скрипт импортирует), `active-knowledge-sources.spec.ts` — набор тестов на реальных файлах:
  - оба registry валидны;
  - пять основных проектов;
  - архивные названия вне registry отсутствуют во всех активных источниках;
  - один активный файл на `sourceType`.
- Синтетические сценарии guard'а для семейств вакансий database/financial, Azure и Python (архивный проект при Python-вакансии → нарушение).
- Имена файлов в `docs/01`, `docs/03`, `docs/08`.
- Владелец: `register-knowledge-sources`, `prisma db seed`, три обязательных smoke-прогона, проверка PDF. Отчёт — комментарием в issue по таблице ожиданий.

## Тестовая стратегия

| Уровень | Что | Где |
|---|---|---|
| Unit (CI) | парсер, правила registry, guard, эффективный контент, export gate (включая регрессии Prompt 3 corrections), Prompt 2 wiring, schema | `src/evidence/*.spec.ts`, `src/document-export/effective-cv-content.spec.ts`, `src/document-export/document-export.service.spec.ts`, `src/pipeline/**` |
| Контент (CI) | активные промпты, активные источники | `critical-prompt-content.spec.ts`, `active-knowledge-sources.spec.ts` |
| E2E (CI) | существующие наборы на fixtures с registry | `apps/api/test/*.e2e-spec.ts` |
| Реальный прогон (владелец, не гейтится) | backend Node.js/TS, AI-assisted SE, React/Next.js full-stack — **обязательно**; database/financial, Azure, Python — P1 | отчёт в TASK-E |

Отбор database/financial, Azure и Python детерминированно проверяется только на уровне допуска (registry); ранжирование для них проверяется реальным прогоном P1.

## Ожидаемый отбор для эталонных вакансий

| Вакансия | Ведущие доказательства | Selected Projects | Не включать | Certifications | Summary |
|---|---|---|---|---|---|
| Backend Node.js/TS | EPAM, Factor–IT (SQL), JobFlow bullet | пусто или Home Budget при требовании data integrity | Dark Factory, Cards, ADK | Node.js Testing, Node.js Security, System Design in Cloud | A |
| AI-assisted SE / DevProd | EPAM, Dark Factory, JobFlow (AI integration facet) | Dark Factory (`must_show`) | Cards, Home Budget | ADK badge, Claude Code 101, MCP Advanced Topics | C |
| React/Next.js full-stack | EPAM React/Next.js/BFF, JobFlow dashboard facet | B1 Kompass; Cards при непокрытом требовании | Dark Factory, ADK | Node.js-курсы; React+OpenAI только при AI-требовании | B |
| Database / financial (P1) | Factor–IT, EPAM | Home Budget | Dark Factory, Cards, ADK | System Design, Node.js Testing | A |
| Azure / production (P1) | EPAM (Durable Functions, интеграции, App Insights/KQL) | пусто | все проекты, кроме JobFlow bullet | System Design in Cloud, Node.js Security | A |
| Python/FastAPI (P1) | EPAM, Factor–IT | пусто (AI Bootcamp RAG не `cvEligible`) | AI Job Assistant | FastAPI course | A |

Во всех вакансиях: AI Job Assistant, Email Camp — никогда; `registry_violations` пусто; Current Independent Work на месте.

## Предлагаемые тексты (English; финальная редакция — в TASK-C)

**Variant A — General Backend / Software Engineer**
> Backend-focused TypeScript developer based in Cologne, Germany. At EPAM, built and supported Node.js/TypeScript services on Azure Functions and Durable Functions for a large-scale e-commerce platform, integrating CommerceTools, Amplience and ProductsUp, covering them with Jest tests and resolving production issues with Application Insights and KQL. Earlier work on financial accounting systems built a solid PostgreSQL foundation in complex SQL, data migrations and query optimization. Since 2025 has kept building software independently, including a NestJS/PostgreSQL application with REST APIs, background jobs and CI.

**Variant B — Backend-focused Full-stack**
> Backend-focused full-stack developer based in Cologne, Germany, with commercial Node.js/TypeScript backend work and production React/Next.js contributions to a large-scale e-commerce platform at EPAM, including BFF/GraphQL changes and Azure serverless integrations. Continues to build and ship full-stack TypeScript applications: a publicly available Next.js and Supabase exam-practice app with SQL migrations, row-level security and Playwright end-to-end tests in CI, and a NestJS/PostgreSQL backend with a Next.js review dashboard.

**Variant C — AI-friendly Backend / Developer Productivity**
> Backend-focused TypeScript developer based in Cologne, Germany, with commercial Node.js and Azure serverless experience in large-scale e-commerce integrations, production debugging and a strong PostgreSQL foundation. Develops software with Claude Code and OpenAI Codex and built Dark Factory, a reusable Node.js toolkit that takes scoped GitHub Issues to pull requests through a sandboxed Claude Code agent and checks every change with an independent Codex-based acceptance verifier before a human merge; it is installed in three personal repositories. Holds the Google Cloud skill badge "Engineer AI Agents with Agent Development Kit (ADK)".

**Выбор варианта:**
- A — обычные backend Node.js/TS, NestJS, Azure, database-вакансии;
- B — full-stack и React/Next.js;
- C — AI-assisted engineering, developer productivity, AI integration или вакансии, где AI — core.

Для «AI as a plus» используется A или B с одной короткой фразой о Claude Code и Codex. Подставляемые факты сужаются под требования вакансии; Summary не перечисляет все пять проектов.

**Current Independent Work — третий bullet (выбор по вакансии, не повторяет Selected Projects):**
- AI: `Completed Google Cloud hands-on labs on agent development with ADK, covering tool-enabled agents, multi-agent systems and deployment to Agent Runtime, alongside ongoing development with Claude Code and OpenAI Codex.`
- Node.js/backend: `Deepened Node.js engineering through LinkedIn Learning courses on scaling, testing, security and design patterns.`
- Full-stack (если проекты не в Selected Projects): `Built and published Next.js/React applications on Supabase PostgreSQL with SQL migrations and Playwright end-to-end tests.`
- Python: `Completed the Udemy course "FastAPI - The Complete Course 2026 (Beginner + Advanced)".`

**Проектные bullets (проверенные факты):**
- *Dark Factory:* `Built Dark Factory, a versioned Node.js package (releases v0.1.0–v0.1.3) that installs an AI-assisted delivery workflow into a repository: Claude Code hooks, skills and agents; Ralph, a loop that runs Claude Code in a Docker sandbox on a scoped GitHub Issue, where the agent can read Git history but cannot commit, push or call the GitHub CLI, and the controller opens the pull request; and an OpenAI Codex-based acceptance verifier in GitHub Actions whose verdict is computed and re-checked by code.`
- *Dark Factory (reuse):* `Extracted the workflow from JobFlow into this standalone package and installed it in two further personal projects; the package test suite runs in CI on Linux and Windows.`
- *B1 Kompass:* `Built B1 Kompass, a publicly available Next.js/TypeScript practice app for the German DTZ exam (listening and reading) with guest sessions, server-enforced exam timing and a Supabase PostgreSQL schema with 15 SQL migrations, row-level security and immutable answer keys, covered by Vitest and Playwright end-to-end tests in CI.`
- *Home Budget:* `Built a private single-owner budgeting app with Next.js, Drizzle ORM and PostgreSQL that stores money as integer cents and computes period budgets, obligation reserves and liquidity forecasts in unit-tested domain functions, with integration tests against a real PostgreSQL in CI; developed with OpenAI Codex using repository-specific agent instructions and skills.`
- *Cards:* `Built a German vocabulary trainer on Next.js and Supabase with invite-only email/password sign-up, a publicly accessible read-only demo enforced on the server, and rate limiting with an Upstash Redis limiter and in-memory fallback.`
- *JobFlow:* фасеты остаются в Prompt 2 (current-work block). Разделять приложение с AI-интеграцией (OpenAI API, BullMQ/Redis jobs, provider abstraction) и AI-assisted процесс разработки (Dark Factory).

## Critical path, оценка, приоритеты

```text
TASK-A ─┐
TASK-B ─┼─► TASK-C ─► TASK-D ─► TASK-E
        └─ (код парсера/guard/gate в TASK-D можно начать параллельно на синтетических fixtures)
```

| Задача | Приоритет | Оценка |
|---|---|---|
| A | P0 | 0.5 д |
| B | P0 | 0.3 д |
| C | P0 | 0.3 д |
| D | P0 | 0.7 д |
| E | P0 (CI-тесты + 3 прогона), P1 (3 доп. прогона) | 0.3 д + время провайдера |
| **Итого** | | **≈ 2.1 д**, без запаса (рамка «около двух дней» сохраняется за счёт порядка сокращения ниже) |

**День 1:** A, B, C (источники), старт кода D (парсер, guard, gate с unit-тестами).
**День 2:** промпты D, seed, e2e fixtures, ADR amendment → PR D; E: перенос `SOURCES`, тесты на реальных файлах, docs, регистрация, seed, три smoke-прогона.

**Сокращение при перерасходе (в этом порядке):** доп. прогоны P1 → синтетические сценарии семейств в E → правка Prompt 1/3 сводится к удалению литеральных перечней (без новых правил).

## Риски

| Риск | Класс | Мера |
|---|---|---|
| Prompt 2 v11 ухудшает другие разделы CV | Non-blocking | менять только перечисленные разделы; smoke-прогоны E |
| e2e ломаются из-за fail-closed registry | Non-blocking | синтетические registry-блоки в fixtures (D) |
| Перенос сборки эффективного контента из двух рендереров в общую функцию может изменить вывод | Non-blocking | существующие spec рендереров + `Test (e2e)`; рендереры получают тот же контент, что проверил gate |
| Объём правки больших файлов (Master_CV 86 KB) | Non-blocking | удалять устаревшее, не переписывать стабильные разделы |
| Workspaces с черновиком до TASK-D получат 400 на экспорте | Non-blocking, ожидаемо | regenerate Prompt 2 |
| Реальная ссылка Credly отсутствует | Non-blocking | бейдж без URL/ID |

## Отложено

- **P1:** реальные прогоны database/financial, Azure, Python; проверка AI Bootcamp RAG Service (для `cvEligible: true`).
- **P2:** Prisma registry, GitHub sync, scoring engine, UI портфолио, блокировка экспорта по прочим `critical_issues`, #404, #252, #281.
