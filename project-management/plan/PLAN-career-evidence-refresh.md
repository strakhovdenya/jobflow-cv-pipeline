# Plan: Career Evidence Refresh and Registry-Aware Portfolio Selection

**PRD:** `project-management/prd/PRD-career-evidence-refresh.md`
**Audit:** `project-management/analysis-career-evidence-audit-2026-11.md`
**Date:** 2026-11-23 (final revision); TASK-D1 добавлена 2026-11-24; финальная спецификация TASK-E — 2026-11-24
**Status:** A–D1 реализованы (#686–#689, #696); TASK-E (#690) — финальная спецификация (раздел «TASK-E — Final Validation (#690)»), ожидает решения владельца

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
| E | полный перечень — раздел «TASK-E — Final Validation (#690)», §9 |

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
- [x] TASK-D — Registry-Aware Selection and EvidenceGuard (#689, PR #695)
- [x] TASK-D1 — Portfolio Positioning and CV/Cover Letter Consistency (#696, PR #697), см. раздел «TASK-D1» ниже
- [ ] TASK-E — Final Validation (#690), см. раздел «TASK-E — Final Validation (#690)» ниже

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

### TASK-E — Final Validation (P0, ~0.3 д + время провайдера)

Исходная редакция (до D1) заменена финальной спецификацией от 2026-11-24 — раздел «TASK-E — Final Validation (#690)» ниже. Кратко:
- список активных источников переносится в `apps/api/src/knowledge-sources/active-knowledge-sources.ts`; его используют скрипт регистрации, `critical-prompt-content.spec.ts` и новый набор тестов на реальных файлах (файлы существуют, один файл на `sourceType`, оба registry разбираются, структурные свойства `portfolio-registry`, архивные названия в источниках Prompt 1/2/3 и cover letter — только внутри registry);
- регистрация отклоняет список с повтором `sourceType` до записи в БД;
- документация называет источники по `sourceType` и ссылается на список;
- синтетические «семейства вакансий» для guard'а отклонены как дубли;
- список обязан содержать каждый обязательный `sourceType` шагов (`STEP_SOURCE_GROUPS` экспортируется);
- владелец: 5 обязательных реальных прогонов CV и 2 письма, 3 дополнительных прогона P1; отчёт — комментарием в #690 по шаблону.

## TASK-D1 — Portfolio Positioning and CV/Cover Letter Consistency (#696)

План от 2026-11-24 по `main` @ `85133dd` (merge PR #695); редакция 2 — после consolidated review владельца и внешнего ревьюера; редакция 2.1 — финальная проверка спецификации (manual note в письме, роль `requirement_coverage`/`evidence_table`, перенос тестов рендереров, вес AI в обычных ролях, приоритет LLM-прогона). Реализация — после одобрения владельцем.

### 1. Текущее состояние (после TASK-D)

| Область | Как сейчас | Где |
|---|---|---|
| Current Independent Work | Ровно четыре пункта: small tasks → JobFlow (меню фасетов) → один «vacancy-chosen fact» → volunteering. Для backend, Azure и database по умолчанию — `Deepened Node.js engineering through LinkedIn Learning courses…` | `cv_rules` v0_6 §8; `prompt2_v11.txt` CURRENT-WORK BLOCK («inventory holds exactly four items») |
| Selected Projects | Кандидаты: `cvEligible` + `placement: selected_projects` + **совпадение `roleFamilies`** (фильтр). «Do not include» обязательна для главного семейства, снимается только `must_have` другого семейства. Не больше двух AI-проектов | `cv_rules` v0_6 §9.2–9.4; `prompt2_v11.txt` CAREER REGISTRY, AI MODE, SELECTED PROJECTS |
| AI при «AI is a plus» | Dark Factory — один bullet «only when the vacancy names AI coding tools and the slot is free»; иначе фраза в JobFlow-bullet. Виды AI-запроса: AI tools / LLM integration / RAG-agents | `prompt2_v11.txt:164, 172–175`; `cv_rules` v0_6 §9.3 |
| AI не упомянут | Dark Factory исключён всегда («projects whose roleFamilies are AI families only») | `prompt2_v11.txt:183` |
| JobFlow | Единственная запись `placement: current_work_block` | registry `Project_Inventory` v0_8; `career-registry.parser.ts` |
| AI-группа навыков | cv_rules §5 описывает отдельную группу, которой нет ни в контракте Prompt 2, ни в рендерерах | `cv_rules` v0_6 §5; `prompt2_v11.txt` TOP SKILLS |
| Сертификаты | `certifications[].title` — только идентичность; design-шаблон умеет `issuer`/`date`, но они не заполняются; ATS печатает только `name` | `prompt2-to-cv-content.mapper.ts:87`; `cv-template-renderer.ts:108`; `ats-cv-template-renderer.ts:133` |
| Снимок registry | `registry-snapshot/v1`: у credential нет `issuer` и `issued`; парсер снимка требует точный набор ключей; формат `issued` (`YYYY-MM`) проверяет только `career-registry.parser.ts` (`ISO_MONTH`, не экспортируется) | `registry-compliance.ts:29, 115, 433–500`; `career-registry.parser.ts:148, 525` |
| Prompt 3 v9 | §0 ждёт отдельный «vacancy-chosen fact» bullet и «at most 1–2 bullets adapted»; §0.1 начинается с «same project … in exactly one section», ссылается на таблицу третьего bullet и для дубля велит снять проект (`include: false`); `cv_rules` в Prompt 3 не передаётся (`knowledge-source-selection.service.ts:42`) | `prompt3_v9.txt:80–102, 103–116` |
| Cover letter | v4: Dark Factory «inside the JobFlow repository», агент «without Git access», RAG/agents → «Python RAG … personal projects»; правило ADR-034 forced-claims без оговорки о registry. Input builder передаёт **весь черновик `02`** (включая `include: false`, `overclaiming_check`, снимок), а не CV после corrections Prompt 3 | `cover_letter_v4.txt`; `cover-letter-input-builder.service.ts:68–117` |
| Prompt 1 v13 | Не отбирает проекты; `roleFamilies` — описание; личный AI-опыт засчитывается при «AI tools daily» | `prompt1_v13.txt:73, 199–211` |

### 2. Проблемы и причины

1. **Период с мая 2025 выглядит как «JobFlow + курсы».** Фиксированный инвентарь из четырёх пунктов отдаёт единственный свободный слот обучению, которое к тому же уже есть в Certifications.
2. **`roleFamilies`-фильтр и обязательная «Do not include» противоречат «coverage, not topic»** и таблице AI weight того же `cv_rules` (backend-вакансия с «AI tools daily»).
3. **Сильнейшее отличие кандидата прячется в обычных вакансиях.** При «AI is a plus» Dark Factory появляется лишь «если слот свободен»; вид AI-запроса (использование ассистентов, проверка AI-кода, workflow, tooling) не влияет на то, *какой* факт показан.
4. **Абсолютное исключение Dark Factory без упоминания AI** скрывает его и там, где вакансия просит именно developer tooling, CI-автоматизацию или quality gates.
5. **Сертификаты без происхождения**: нет issuer, года и метки «skill badge».
6. **Prompt 3 v9 проверяет старую структуру блока** и не видит новых правил `cv_rules`.
7. **Cover letter v4 противоречит источникам** и опирается на черновик до corrections Prompt 3: формулировку, которую Prompt 3 исправил как overclaim, письмо может повторить; проекты с `include: false` для письма неотличимы от показанных.

### 3. Альтернативы архитектуры CV

| Критерий | **A** — JobFlow остаётся в блоке + обзор портфеля | **B** — главный проект блока по вакансии | **C** — блок = общий обзор, все пять в Selected Projects |
|---|---|---|---|
| Видимость периода | В каждом CV видно, что работа шире JobFlow; какие проекты и грани — по вакансии | 1 главный + 0–2 | обзор + 0–2, JobFlow может выпасть |
| Registry, парсер, gate | без изменений | новая семантика `placement`, парсер, compliance, снимок | JobFlow → `selected_projects`, новая версия registry |
| Дублирование | действующее правило «одно достижение — одно место» | новая логика взаимного исключения | возвращается дубль JobFlow (ISSUE-268) |
| Страницы | обзор заменяет курсовой bullet | +0–1 запись | почти всегда +1 запись |
| Меню фасетов JobFlow | не трогается | частично | переносится |

**Решение: A** (владелец согласен в принципе). Поправка к первой редакции: формулировка «все пять проектов видны в каждом CV» была неточной — обзор выбирает грани и проекты по вакансии, а в CV без AI-запроса AI-пакет в обзор не попадает. Ограничение A, найденное при ревью (отбор AI-доказательств и проверка Prompt 3), закрывается правилами промптов, а не сменой архитектуры.

### 4. Решение

**4.1 Current Independent Work** (`cv_rules` v0_7 §8, `prompt2_v12` CURRENT-WORK BLOCK, `prompt3_v10` §0). Рамка блока, даты, место, intro и формулировка small tasks не меняются.

| # | Пункт | Присутствие | Содержание |
|---|---|---|---|
| 1 | Small tasks | всегда | стабильная формулировка |
| 2 | JobFlow | всегда, ровно один bullet | меню фасетов (без изменений) |
| 3 | **Обзор портфеля** | **всегда** | одна фраза об остальных `cvEligible` проектах периода; 1–2 грани по вакансии из проверенного списка: самостоятельная разработка backend-приложений; PostgreSQL (SQL-миграции, Supabase, Drizzle ORM); full-stack на TypeScript/React/Next.js; публичный деплой (два приложения); аутентификация и access control; финансовая доменная логика; тесты и CI; AI-assisted разработка; переиспользуемый developer tooling. Описывает по виду, без названий; не каталог всех приложений и технологий |
| 4 | **Дополнительное доказательство** | 0–1, только если покрывает требование вакансии | по релевантности: реализованное инженерное достижение или проверенная практика из проекта, которого нет в Selected Projects и в обзоре; пройденное hands-on обучение (ADK labs); курс (FastAPI; Node.js-курсы — только если требование названо, а Certifications его не покрывает). Порядок — ориентир, решает релевантность |
| 5 | Volunteering | по рынку | без изменений |

- Число: обычно 4; 5 — когда пункт 4 покрывает требование и CV помещается; без volunteering — 4 при наличии пункта 4, иначе **3 без наполнителя** (повтор, общий курс ради счёта, второй JobFlow — запрещены).
- Правила обзора: каждое утверждение верно для приложения, о котором оно (RLS — только про B1 Kompass, не про Cards); не повторяет механизм, цифру или функцию записи Selected Projects; AI-грань — только при AI-запросе или требовании developer tooling; при выбранном Dark Factory обзор не описывает его снова; Claude Code не приписывается Cards и B1 Kompass отдельно (`tech_stack` v2_5 §3: только через формулировку Dark Factory «installed in three personal repositories»).
- Черновые варианты (окончательный текст — при реализации, ревью владельца):
  - backend без AI: `Built three further personal TypeScript applications backed by PostgreSQL, two of them publicly available, with SQL migrations and automated tests in CI.`
  - full-stack (B1 Kompass в Selected Projects): `Built further personal Next.js/React applications in TypeScript, including a publicly available vocabulary trainer with invite-only sign-up and a server-enforced read-only demo, and a private budgeting app on Drizzle ORM and PostgreSQL.`
  - финансовый backend (Home Budget не выбран): `Built further PostgreSQL-backed TypeScript applications, including a private single-owner budgeting app that keeps money in integer cents and is covered by integration tests against a real PostgreSQL.`
  - AI-assisted (Dark Factory не выбран): `Built further personal TypeScript applications, two of them publicly available, and a reusable Node.js package that installs an AI-assisted delivery workflow with Claude Code and independent OpenAI Codex verification into three of these repositories.`

**4.2 Отбор проектов** (`cv_rules` v0_7 §9, `prompt2_v12` CAREER REGISTRY и SELECTED PROJECTS).
- `cvEligible` и `placement` — жёсткие ограничения (без изменений).
- `roleFamilies` — релевантность по умолчанию; проект вне семейств допустим, если inclusion test называет требование (`must_have`, `nice_to_have`, hidden); причина — в `target_strategy.main_angle`.
- «Do not include» → «Not by default»; лимит двух AI-проектов удаляется; число записей — по доказательствам (0–2, 3 при обосновании).
- Подкрепление коммерческого требования новым измерением (сквозная разработка, публичный деплой, названная технология, access control, data integrity, money handling); повтор технологии без нового измерения — нет. Общий стек не делает проекты альтернативами.
- **Узкий override для Dark Factory без упоминания AI:** только если вакансия называет построение developer tooling, CI/CD-автоматизации, quality gates или переиспользуемых Node.js-пакетов, а коммерческий опыт этого не покрывает (у EPAM — участие в CI/CD Azure DevOps, не построение tooling). Тогда — компактная запись (1 bullet) с фактами tooling: versioned Node.js package (releases), CI на Linux и Windows, GitHub Actions workflow, детерминированные проверки; AI называется лишь как то, что инструмент оркестрирует (скрыть суть нельзя). Summary без AI-фразы, без AI-credentials, обзор без AI-грани. Простое «experience with CI/CD» override не открывает.
- Проверка старых инструкций, которые могли бы вернуть жёсткие исключения: в `prompt2_v11` (`:164`, `:177`, `:183`, `:328`) и `cv_rules` v0_6 (§9.2–9.4) — переписываются в v12/v0_7; `certifications` 2026-11 §2.2 «Do not show» касается credentials и согласован с правилом «AI не упомянут → без AI-credentials»; матрица релевантности `Project_Inventory` v0_8 — справочная; Master_CV и Deep Dives отсылают к активному `cv_rules`; Prompt 1 v13 и Prompt 3 не фильтруют по `roleFamilies`.

**4.3 Профессиональная AI-assisted разработка** (`cv_rules` v0_7 §9.3, `prompt2_v12` AI-MENTIONING VACANCY MODE). Двухмерная модель сохраняется в существующей форме: **вес** (Core / Plus / не упомянут) решает объём, **вид запроса** решает, какой факт показан. Вид «AI tools» v11 делится на подвиды:

| Вид запроса | Доказательство | Plus | Core |
|---|---|---|---|
| Использование ассистентов (Claude Code, Copilot, Cursor, «AI tools daily») | Dark Factory: scoped GitHub Issues с acceptance criteria → Claude Code → независимая Codex-проверка → решение о merge за человеком | Summary A/B + фраза; Dark Factory — компактная запись (1 bullet) **по умолчанию** (`show_if_space`), если не вытесняет requirement-covering коммерческий bullet и не выходит за `max_pages`; иначе — фраза в JobFlow-bullet | Summary C; Dark Factory 2 bullets, `must_show` |
| Качество и проверка AI-кода («review AI-generated code», «code quality with AI») | `Identified AI-generated changes that passed tests but violated requirements, then added targeted checks and acceptance gates` (Deep Dives v0_9) | этот факт — содержание единственного bullet | среди 2 bullets |
| AI-assisted delivery workflow / developer productivity | повторное использование: пакет установлен в трёх репозиториях; Home Budget — отдельный Codex-native workflow | 1 bullet | 2 bullets |
| Coding-agent tooling, AI developer platforms | механизмы: sandbox, Git-граница агента, контроллер, вердикт кодом, hooks/skills | — | после proof points, только для таких вакансий |
| LLM / AI API integration | JobFlow AI-integration и background jobs; Dark Factory — только если просят и coding agents | фасет JobFlow | Summary C с JobFlow, фасет JobFlow |
| Agent frameworks / ADK | ADK skill badge (Certifications), labs (доп. bullet) — только обучение | ≤ 1 AI-credential | badge + labs |
| RAG / Python AI | реализованного проекта нет → обучение или `not_shown` | — | — |

**Вес AI ≠ должность.** Core определяется важностью AI-assisted разработки в вакансии (`must_have`, ключевая обязанность), а не названием роли. В обычной backend- или full-stack-роли, где разработка с AI-ассистентами — ключевая обязанность, вес Core: Summary остаётся вариантом семейства роли (A или B) с одним полным AI-предложением вместо короткой фразы, Dark Factory — 2 bullets, `must_show`. Вариант C — для ролей, где AI-assisted engineering, developer productivity или LLM integration — сам фокус роли. Упоминание в «nice to have» или «a plus» остаётся весом Plus.

Распределение по CV: Summary — одна фраза о компетенции; обзор — AI-грань, только если Dark Factory не выбран; Selected Projects — конкретное доказательство; `tech_stack` — Claude Code у Dark Factory и JobFlow, OpenAI Codex у Dark Factory и Home Budget, не у Cards и B1 Kompass. Один факт — одно место. Категории A (разработка с агентами), B (AI внутри приложения) и C (обучение) не смешиваются; C не заслоняет A/B; провенанс «Personal Project», без должности AI Engineer, без метрик продуктивности и внешних пользователей.

**4.4 Сертификаты — `registry-snapshot/v2`.**
- `certifications[].title` остаётся идентичностью; Prompt 2/3 ничего не дописывают.
- Guard пишет v2: у credential добавляются `issuer` (непустая строка) и `issued` (`YYYY-MM` или `null`). Формат `issued` проверяется **тем же** предикатом, что в `career-registry.parser.ts` (экспорт `ISO_MONTH`-проверки, без второй копии).
- `parseRegistrySnapshot` выбирает схему по полю `schema`: v1 — точные ключи v1, v2 — точные ключи v2. v2 без `issuer` или с неверной датой → `null` (отказ 400), а не «v1»; v1 с лишними ключами → `null`.
- `findSnapshotCredential(snapshot, name)` в `registry-compliance.ts` — поиск по нормализованному title или alias на существующем `indexByName`; метаданные берутся только из записи с `cvEligible: true`; название из `acceptedForced` (по определению отсутствующее в registry) метаданных не получает.
- `applyCredentialMetadata(content, snapshot)` (`document-export/credential-metadata.ts`): `issuer`, `kind` (`skill_badge` → `skill badge`, `professional_certificate` → `professional certificate`, `course_completion` → нет), `date` (год); `name` не меняется. Снимок v1 → метаданных нет.
- `DocumentExportService.exportCv`: эффективный контент → `parseRegistrySnapshot` (один раз) → `findRegistryViolations` → `applyCredentialMetadata` с тем же снимком → claim → оба рендерера получают один объект.
- Шаблоны: design — `name — issuer kind` + год; ATS — `name — issuer kind, year` одной строкой; только `{{…}}`.

**4.5 Cover letter v5 и вход письма.**
- **Вход** (`cover-letter-input-builder.service.ts`): вместо всего черновика `02` письмо получает «EXPORTED CV» — видимые разделы эффективного контента, **заново собранного из артефактов workspace** (`02_targeted_cv_content.json` + `03_pre_pdf_check.json` через `buildEffectiveCvContent`; PDF не читается, новое хранилище не нужно). Он равен экспортированному: из `cv_pdf_generated` и `final_check_ready` нет переходов назад к Prompt 2/3 (`workspace-status.service.ts:71–84`), поэтому `02`/`03` после экспорта не меняются. В «EXPORTED CV» — только `include: true` проекты и включённые сертификаты, с метаданными при снимке v2 (`parseRegistrySnapshot` + `applyCredentialMetadata`, как на экспорте). Из черновика добавляются `requirement_coverage` и `evidence_table` — **только как контекст**: они помогают заполнить `evidence_alignment`, но не разрешают утверждение, которого нет в «EXPORTED CV» или которое там исправлено. `overclaiming_check` и снимок registry в контекст письма не попадают. Черновик без снимка (экспорт до TASK-D) → без метаданных, без ошибки; невалидный черновик или pre-PDF check → 400 до AI-вызова. Зависимость `pipeline/cover-letter → document-export` уже существует (`cover-letter.service.ts:16–18`); новые функции чистые, Nest-модули не меняются.
- **Промпт v5:** **названия проектов и credentials — только те, что есть в «EXPORTED CV».** Это единственный и достаточный признак допуска: экспорт уже прошёл registry gate, а незарегистрированное название попадает в CV, только если guard Prompt 2 принял его по manual note (`acceptedForced`). Manual note письма может добавить другое содержание (как user-forced, ADR-034), но **не добавляет названий проектов и credentials, которых нет в «EXPORTED CV»**; такая просьба записывается в `risks`. Так письму не нужно отличать исключённый credential от незарегистрированного: без `credential-registry` в контексте оно и не смогло бы это сделать. Новое название — через manual note и перегенерацию CV, где решение принимает guard (amendment ADR-034 распространяется на письмо). `requirement_coverage` и `evidence_table` — только контекст; AI — по той же модели вида и веса (§4.3): для обычной backend/full-stack вакансии с ассистентами — одна-две конкретные фразы о дисциплинированной AI-assisted разработке, а не упоминание инструмента; отдельный абзац — только при Core; Dark Factory — отдельный пакет; Git-граница — как в источниках; RAG/Python-проектов нет; ADK — skill badge; разработка с агентами ≠ AI внутри приложения.
- Источники письма не меняются (`certifications` не нужен: credentials приходят из экспортированного CV, тип — из метаданных снимка v2; при v1 ADK как skill badge определяет `cv_rules`). Отклонено: вернуть в контекст письма список исключённых записей из снимка — лишние данные и вторая логика допуска, когда достаточно правила «только названия из экспортированного CV».

**4.6 Prompt 3 v10 (узкая правка).** Только: абзац CURRENT-WORK CONTEXT о числе bullets; пункты §0 о «vacancy-chosen fact» и «at most 1–2 adapted» → обзор портфеля (обязателен, правила 4.1) и необязательный дополнительный bullet, адаптируемые пункты — JobFlow, обзор, дополнительный; §0.1 — первое предложение про «то же достижение», а не «тот же проект»; для обзора или дополнительного bullet, повторяющего факт записи Selected Projects, — correction, сужающая текст этого bullet (а не снятие проекта); снятие записи (`include: false`) остаётся только для дубля JobFlow или того же содержания как проекта; убрать ссылку на таблицу третьего bullet. Остальной Prompt 3 (BOP, canonical terms, tech stack, layout, registry violations) без изменений.

**4.7 Prompt 1 v13 — без новой версии.** Проверено: CAREER REGISTRY (`:73`) не фильтрует по `roleFamilies`; PERSONAL AI EVIDENCE (`:199–211`) засчитывает личный AI-опыт как `personal_only` «strong/partial» при «AI tools daily», ограничивает его при требовании коммерческого AI; приоритет коммерческого опыта, risk stacking и покрытие требований стратегии D1 не противоречат. Prompt 1 не строит CV, поэтому структура блока и отбор его не касаются.

### 5. Решения по предложениям (обе редакции)

| Предложение | Решение | Причина |
|---|---|---|
| Portfolio-wide Current Independent Work | **Принято**: обзор обязателен, содержание по вакансии | закрывает проблему 1 без изменения registry |
| B, C (переменный главный проект / общий пул) | **Отклонено** | §3 |
| «Все пять видны в каждом CV» (собственная формулировка первой редакции) | **Исправлено** | противоречила исключению AI-пакета без AI-запроса |
| Доп. bullet: достижение / практика / обучение / курс | **Принято с ограничениями** | 0–1, только при покрытии требования; не проект из Selected Projects, не второй JobFlow |
| 3 bullets без volunteering | **Принято** | лучше наполнителя; прежний пол «4» вынуждал вставлять курсы |
| Вид × вес AI | **Принято в форме уточнения существующих правил** | двухмерность уже есть (вес + виды запроса); нужна только детализация вида «AI tools»; новая схема или поле не нужны |
| Dark Factory при «AI coding assistants as a plus» | **Принято с изменением**: компактная запись по умолчанию, 1 bullet, содержание по подвиду | 2 bullets при Plus — нет: объём следует весу, а давление на 2 страницы — реальное |
| Dark Factory без упоминания AI | **Частично**: узкий override только для требований developer tooling / CI-автоматизации / quality gates | абсолютное исключение прятало релевантное доказательство; широкий override внёс бы AI в обычные CV |
| AI-assisted практика по всему портфелю | **Принято с ограничением** | Claude Code не приписывается Cards и B1 Kompass отдельно (`tech_stack` v2_5); Home Budget — Codex-native, не Dark Factory |
| Иллюстративные формулировки ревьюера | **Частично**: заменены проверенными (`allowedWording`, Deep Dives v0_9, `tech_stack` §3) | «Developed multiple personal software applications using Claude Code and OpenAI Codex» без привязки к проектам слишком общая; «applied the workflow across multiple personal projects» уточнено до «installed in three personal repositories» |
| Prompt 3 без изменений (первая редакция) | **Пересмотрено → prompt3_v10** | §0/§0.1 v9 противоречат новой структуре, а `cv_rules` Prompt 3 не получает |
| Prompt 1 v14 | **Не нужно** | §4.7 |
| Snapshot v2 + чтение v1 | **Принято**, контракт уточнён | §4.4 |
| Cover letter по эффективному CV | **Принято** (§4.5) | corrections Prompt 3 исправляют overclaims; письмо по черновику могло их вернуть; зависимость и функции уже есть |
| Manual note в письме | **Принято**: ADR-034 amendment на письмо | v4 forced-правило могло вернуть исключённую запись |
| Как письму отличить исключённый credential от незарегистрированного (ред. 2.1) | **Решено правилом**: названия проектов и credentials — только из экспортированного CV; manual note письма их не добавляет | без `credential-registry` и снимка в контексте модель не может отличить их; допуск уже решён guard Prompt 2 и export gate. Список исключений в контексте отклонён как вторая логика допуска |
| `requirement_coverage`/`evidence_table` в письме (ред. 2.1) | **Принято**: только контекст | не возвращают исправленное или опущенное утверждение |
| Источник эффективного CV для письма (ред. 2.1) | **Уточнено**: заново собирается из `02` + `03`, не из PDF | `02`/`03` неизменны после экспорта (нет обратных переходов) |
| Перенос тестов параметра `corrections` рендереров (ред. 2.1) | **Принято** | каждое утверждение 3 design- и 7 ATS-тестов сохраняется: рендер результата `applyCorrectionsToCvContent` |
| Вес AI в обычной роли (ред. 2.1) | **Принято** | Core по важности, а не по должности; Summary остаётся A/B с полным AI-предложением |
| `certifications` как источник письма | **Отклонено** | credentials приходят из экспортированного CV |
| Детерминированная проверка текста письма | **Отложено (P1)** | новый gate шага письма; v5 и тест промпта снимают причину; проверка — в TASK-E |
| Отдельное поле personal AI skills | **Отложено (P2)**, решение после TASK-E | новое публичное поле затрагивает схему, шаблоны, guard, сканирование registry |
| Долг #695: registry до платного вызова, снимок в Prompt 3/5, дубли ключей JSON | **Отложено** (отдельный issue) | не связано с позиционированием; снимок уходит из контекста письма как побочный эффект §4.5 |
| Долг #695: комментарий и аргумент `corrections` рендереров | **Принято в D1** | те же файлы |
| INV-2 / Acceptance Verifier PR #695 | **Не в D1** | относится к закрытию #689 |

### 6. Изменения файлов

Новые: `apps/api/knowledge-sources/cv-rules/CV_Format_Rules_EN_v0_7_portfolio_positioning.md`, `apps/api/prisma/prompts/prompt2_v12.txt`, `apps/api/prisma/prompts/prompt3_v10.txt`, `apps/api/prisma/prompts/cover_letter_v5.txt`, `apps/api/src/document-export/credential-metadata.ts`, `apps/api/src/document-export/credential-metadata.spec.ts`.

Изменяемые: `apps/api/scripts/register-knowledge-sources.ts`, `apps/api/knowledge-sources/README.md`, `apps/api/prisma/seed.ts`, `apps/api/src/prompt-templates/critical-prompt-content.spec.ts`, `apps/api/src/evidence/career-registry.parser.ts`, `apps/api/src/evidence/registry-compliance.ts`, `apps/api/src/evidence/registry-compliance.spec.ts`, `apps/api/src/pipeline/schemas/cv-content.schema.ts`, `apps/api/src/document-export/document-export.service.ts`, `apps/api/src/document-export/document-export.service.spec.ts`, `apps/api/src/document-export/cv-template-renderer.ts`, `apps/api/src/document-export/cv-template-renderer.spec.ts`, `apps/api/src/document-export/ats-cv-template-renderer.ts`, `apps/api/src/document-export/ats-cv-template-renderer.spec.ts`, `apps/api/src/pipeline/cover-letter/cover-letter-input-builder.service.ts`, `apps/api/src/pipeline/cover-letter/cover-letter-input-builder.service.spec.ts`, `apps/api/test/mvp-flow.e2e-spec.ts`, `docs/08_ai_pipeline.md`, `apps/api/CLAUDE.md`, `project-management/DECISIONS.md`, `project-management/plan/PLAN-career-evidence-refresh.md`, `project-management/prd/PRD-career-evidence-refresh.md`.

Не меняются (проверено): исторические промпты и источники; `prompt1_v13.txt`; registry-блоки; `findRegistryViolations`; `targeted-cv-content.schema.ts`; `knowledge-source-selection.service.ts`; фикстуры `registry-snapshot/v1` в `prompt2.service.spec.ts` и `targeted-cv-content.schema.spec.ts` (непрозрачные значения, v1 остаётся читаемым); `evidence-guard.service.spec.ts` (сверяет схему через `REGISTRY_SNAPSHOT_SCHEMA`); `html-renderer.service.ts`, `ats-html-renderer.service.ts` (вызывают рендереры без `corrections`); `test/knowledge-source-fixture.helper.ts` (уже содержит `issuer`).

### 7. Версии и совместимость

- Активные после D1: `cv_rules` v0_7; prompt_1 v13; prompt_2 v12; prompt_3 v10; cover_letter v5.
- Черновики между D и D1 (снимок v1) экспортируются без метаданных; письма по черновикам до TASK-D (без снимка) строятся без метаданных.

### 8. Тестовая стратегия D1

- Unit (CI): снимок v1/v2 и отказы; метаданные (alias, `issued: null`, course без метки, неизвестное имя, запись `cvEligible: false`, `name` не меняется); `findSnapshotCredential` (найдено и не найдено); экспорт (порядок gate → метаданные → claim, один объект для обоих рендереров, v1, отказ v2); шаблоны (метаданные, только имя, экранирование в обоих); вход письма (экспортированный CV после corrections, без `include: false`, без снимка, метаданные v2, отказ при невалидном черновике или pre-PDF check).
- Контент промптов (CI): правила в тексте и absence удалённых формулировок. **Это проверка текста инструкций, а не поведения модели**; поведение проверяют реальные прогоны TASK-E.
- Рендереры: тесты, которые сейчас передают `corrections` в `renderCvTemplate` (3 в `cv-template-renderer.spec.ts`) и `renderAtsCvTemplate` (7 в `ats-cv-template-renderer.spec.ts`), переписываются на рендер результата `applyCorrectionsToCvContent(content, corrections)` с сохранением каждого утверждения (правило корня `CLAUDE.md` о разбиении тестов); сквозная регрессия — существующий `document-export.service.spec.ts` «exports a valid Prompt 3 correction».
- E2E (CI): `mvp-flow` — снимок v2.

### 9. Риски

| Риск | Мера |
|---|---|
| Обзор превращается в каталог или повторяет Selected Projects | 1–2 грани, без названий; Prompt 3 v10 §0/§0.1; TASK-E |
| Dark Factory по умолчанию при Plus добавляет страницу | 1 bullet; запрет вытеснять коммерческий bullet и выходить за `max_pages`; TASK-E проверяет страницы |
| Узкий override без AI расширяется | требование построения tooling, не «опыт CI/CD»; TASK-E P1 |
| Письмо по экспортированному CV меняет поведение | evidence_table сохраняется; legacy без снимка работает |
| Модель дописывает issuer в `title` | gate вернёт 400; v12 отдаёт оформление экспорту |

### 10. Границы

Не в D1: реальные прогоны; новые поля CV; registry, парсер (кроме экспорта предиката даты), правила gate; Prompt 1; источники кроме `cv_rules`; input builders, кроме cover letter; HTTP, Prisma, статусы, `apps/web`.

### 11. Один PR

Один issue (#696), один PR, коммиты: (1) план/PRD; (2) снимок v2, метаданные, экспорт, шаблоны; (3) вход письма; (4) `cv_rules`, промпты, seed, тесты промптов, документация, ADR. Строка `cv_rules` об оформлении сертификатов и сам экспорт, а также вход письма и v5 должны появиться вместе; Ralph неприменим (`protectedPaths`).

### 12. TASK-D1 → изменения для TASK-E (#690)

> Предложения на момент плана D1. Итоговое решение — раздел «TASK-E — Final Validation (#690)»: он принимает их частично (LLM integration — обязательный прогон, AC-13 заменён ссылкой на список источников, финансовый backend и Azure объединены в один P1-прогон).

- Dependencies: #696.
- AC-13: `docs/08_ai_pipeline.md` называет `CV_Format_Rules_EN_v0_7`.
- Реальные прогоны (каждый — строка таблицы результатов):

| Сценарий | Приоритет | Что проверить |
|---|---|---|
| Backend Node.js/TS/PostgreSQL без AI | **обязательно** | обзор без AI-грани и без каталога; Selected Projects 0–1; сертификаты с issuer/годом в обоих PDF |
| Backend с AI coding assistants как plus | **обязательно** | Summary A + фраза; Dark Factory — компактная запись или обоснованный отказ; коммерческие bullets не вытеснены; ≤ 1 AI-credential; **cover letter** — одна-две конкретные фразы о AI-assisted разработке |
| Full-stack с ежедневной AI-assisted разработкой как ключевой обязанностью | **обязательно** | вес Core при Summary B (не C); Dark Factory 2 bullets; B1 Kompass и Dark Factory без дублей; обзор не повторяет B1 Kompass; Claude Code не приписан Cards/B1 Kompass; число страниц |
| AI-assisted SE / developer productivity | **обязательно** | Summary C; Dark Factory 2 bullets с proof points; ADK — skill badge; механизмы — только если вакансия про tooling |
| Чистая LLM integration | **P1, первый дополнительный** | прямая AI-интеграция JobFlow ведёт и не заслонена доказательствами AI-assisted разработки; Dark Factory не обязателен |
| Финансовый backend | P1 | Home Budget или финансовая грань обзора |
| Комбинированная (full-stack + финансы + AI) | P1 | решения по требованиям, а не по шаблону семейства |
| Developer tooling без AI | P1 | узкий override Dark Factory без AI-фразы в Summary |
| Azure, Python | P2 | как в исходном плане |

Во всех прогонах: архивные и неподтверждённые утверждения отсутствуют; `registry_violations` пусто; JobFlow — один bullet; число страниц ≤ `max_pages`.

## TASK-E — Final Validation (#690)

Финальная спецификация от 2026-11-24 по `main` @ `7096ddf` (merge PR #697). Заменяет исходную редакцию TASK-E и уточняет §12 раздела «TASK-D1». Реализация — после одобрения владельцем.

### 1. Что уже проверено и не дублируется

| Область | Покрытие (CI) | Где |
|---|---|---|
| Registry-контракт и отказы парсера | все отказы AC9 PRD | `apps/api/src/evidence/career-registry.parser.spec.ts` |
| Guard: архивные, недопустимые, незарегистрированные записи, manual note | archived/lab/in-progress/unregistered, ADR-034 в обе стороны | `apps/api/src/evidence/evidence-guard.service.spec.ts`, `apps/api/src/evidence/registry-compliance.spec.ts` |
| Export gate, corrections Prompt 3, снимок v1/v2, метаданные сертификатов, оба шаблона | регрессии #689 и TR-1…TR-25 #696 | `apps/api/src/document-export/document-export.service.spec.ts`, `credential-metadata.spec.ts`, `cv-template-renderer.spec.ts`, `ats-cv-template-renderer.spec.ts` (все в `apps/api/src/document-export/`) |
| Вход cover letter: экспортированный CV, `include: false`, снимок вне контекста, отказы | TR-16…TR-19, TR-24 #696 | `apps/api/src/pipeline/cover-letter/cover-letter-input-builder.service.spec.ts` |
| Текст промптов: активные версии, отсутствие названий registry, правила D1 | AC-6…AC-22, AC-42 #696 | `apps/api/src/prompt-templates/critical-prompt-content.spec.ts` |
| Сквозной поток на fixtures | registry → guard → снимок v2 → gate → экспорт без `AiRun` | `apps/api/test/mvp-flow.e2e-spec.ts` |

Не покрыто: реальные активные файлы источников (кроме `portfolio-registry`, который `critical-prompt-content.spec.ts` читает по жёстко прописанному пути), сам список активных источников (живёт в скрипте вне `src/`, Jest его не видит), повтор `sourceType` при регистрации, устаревшие имена файлов в `docs/01`, `docs/03`, `docs/08`, поведение модели.

### 2. Детерминированный объём (CI)

1. **Один список источников.** `SOURCES` переносится без изменений в `apps/api/src/knowledge-sources/active-knowledge-sources.ts` (`ACTIVE_KNOWLEDGE_SOURCES`, только данные). Его импортируют скрипт регистрации, `critical-prompt-content.spec.ts` (вместо второго литерального пути `project_inventory`) и новый `active-knowledge-sources.spec.ts`.
2. **Тесты на реальных файлах** (`active-knowledge-sources.spec.ts`):
   - каждый файл списка существует;
   - у каждого `sourceType` одна запись;
   - список содержит каждый обязательный (`required`) `sourceType` каждого шага `STEP_SOURCE_GROUPS`. Сейчас `selectForStep` только фильтрует и обязательность нигде не проверяет: без `career_cases` или `cv_rules` в списке Prompt 1/2/3 и письмо молча получили бы неполный контекст. Для проверки `STEP_SOURCE_GROUPS` экспортируется из `knowledge-source-selection.service.ts` (одно слово `export`, поведение `selectForStep` не меняется); второго перечня обязательных типов не появляется;
   - активные `project_inventory` и `certifications` разбираются `parseCareerRegistries` — той же функцией, что Prompt 2 (при неразборном registry Prompt 2 сейчас падает уже после оплаченного вызова, поэтому проверка в CI — дешёвая защита до прогона);
   - структурные свойства `portfolio-registry`: ровно одна запись `placement: current_work_block`, она `cvEligible`; каждая `portfolioPriority: primary` — `active` и `cvEligible` (парсер требует «не больше одной» записи блока, но не «хотя бы одну»);
   - названия и aliases записей `status: archived` встречаются в текстовых источниках, которые `KnowledgeSourceSelectionService.selectForStep` отдаёт шагам `STEP_SOURCE_GROUPS` (сейчас `prompt_1`, `prompt_2`, `prompt_3`, `cover_letter`), только внутри блока registry. Множество файлов берётся из настоящей маршрутизации, а не из второго списка типов: `linkedin_source_decision` (зарегистрирован, но ни одному шагу не отдаётся и называет архивные проекты) и PDF-макет в проверку не входят; если тип позже добавят в шаг, проверка охватит его автоматически.
3. **Регистрация отклоняет повтор `sourceType`** до транзакции, функцией `findDuplicateSourceTypes(entries)` из `knowledge-source-registration.ts`; тот же предикат проверяет реальный список в CI. Сейчас два файла одного типа оба становятся активными, а Prompt 2 узнаёт об этом только после платного вызова (`findSingleSourceText` в парсере).
4. **`stripRegistryBlocks(sourceText)`** в `career-registry.parser.ts`: удаляет fenced-блоки registry; распознавание блоков выносится в одну внутреннюю функцию, общую с `extractRegistryBlock` (без второй копии правила ограждения); незакрытый блок — `CareerRegistryError`. Сканирование названий в тесте — `stripRegistryBlocks` + существующий `containsRegistryName`; сама функция сканирования остаётся локальной для spec.
5. **Документация:** `docs/08_ai_pipeline.md` называет источники по `sourceType` и ссылается на список (имена файлов устаревали при каждой новой версии источника — так же, как раньше в промптах до ISSUE-612); таблица §6.8 приводится к `STEP_SOURCE_GROUPS` (Prompt 3 — только `tech_stack` и `career_cases`; Prompt 5 и skip reason источников не получают; добавлен cover letter); пример ответа Prompt 2 в §10.4 — к структуре v12 (без архивного проекта и bullet о Python-обучении). `docs/01_requirements.md` FR-018 и `docs/03_domain_model.md` §12.3 — тоже по `sourceType` со ссылкой на список, пример `sourceSnapshot` — без версионного имени файла (иначе каждая новая версия источника снова требовала бы правки трёх документов); абзац о регистрации в `docs/03` и `apps/api/knowledge-sources/README.md` — отказ при повторе `sourceType`; `apps/api/CLAUDE.md` — новый модуль списка.

Не меняются: registry-блоки и источники, промпты и `seed.ts`, guard, export gate, credential metadata, вход cover letter, Prisma, HTTP, статусы, Nest-модули, `KnowledgeSourceSelectionService`, `apps/web`. `apps/api/knowledge-sources/README.md` — в `protectedPaths`, поэтому задача выполняется интерактивно, не Ralph.

### 3. Решения по исходной спецификации и предложениям

| Предложение | Решение | Причина |
|---|---|---|
| Один экспортируемый список, скрипт и тесты используют его | **Принято** | Jest видит только `src/`; убирает и вторую копию пути в `critical-prompt-content.spec.ts`, которую D1 явно оставил до TASK-E |
| Оба registry валидны на реальных файлах | **Принято** | через `parseCareerRegistries`, как в Prompt 2 |
| «Ровно пять основных проектов» (AC1/AC13 PRD) | **Изменено** → структурные свойства | литерал «пять» противоречит variation point PRD (набор проектов меняется новой версией источника без правки кода); структурная проверка ловит то, что парсер пропускает (нет записи JobFlow, `primary` без допуска); пять конкретных записей подтвердила TASK-A, а их снимок виден в каждом реальном прогоне |
| `credential-registry` без допущенных lab/in-progress (исходный AC-2) | **Уже покрыто** | парсер отклоняет такой registry; при разборе реального файла свойство выполняется по построению |
| Архивные названия вне registry в активных источниках | **Принято с уточнением** | только `status: archived` и только источники, которые получают шаги. Записи `cvEligible: false` без `archived` (AI Bootcamp RAG Service, `needs_evidence`) намеренно названы в Master_CV, Deep Dives, Tech Stack как ограничения («в CV не используется»): это не утечка, а инструкция модели, и guard с export gate блокируют их в выходе. Проверка «во всех активных источниках» упала бы на `linkedin_source_decision`, который ни один шаг не получает |
| Один файл на `sourceType` (тест чистой функции) | **Принято с изменением** | правило проверяется в самой регистрации (runtime) и тем же предикатом в CI, а не только тестом вспомогательной функции |
| Каждый активный файл существует | **Принято** | регистрация и так падает на отсутствующем файле, но лишь когда её запускает владелец; в CI — раньше |
| Полнота обязательных `sourceType` (ревью 2026-11-24) | **Принято** | `required` в `STEP_SOURCE_GROUPS` нигде не проверяется; проверка в CI по экспортированному контракту выбора. Проверка во время регистрации отклонена: существующие тесты регистрации и частичная регистрация используют неполные списки |
| Синтетические сценарии guard'а по семействам вакансий (database, Azure, Python) | **Отклонено** | `EvidenceGuardService.checkOutput` не получает вакансию, поэтому «Python-вакансия с архивным проектом» — это существующий тест «flags an included archived project»; lab и in-progress уже покрыты, learning path идёт той же веткой `cvEligible: false` |
| Ссылка на `CV_Format_Rules_EN_v0_7` в docs/08 (§12 D1, AC-13) | **Изменено** | имена файлов заменяются ссылкой на список; absence-проверки старых суффиксов `_ai_factory_sync.md`, `_ai_recruiter_sync.md` |
| Сквозная e2e-проверка метаданных сертификата в HTML | **Отклонено** | fake provider возвращает `certifications: []`; его изменение затрагивает ≥ 5 spec. Совместимость снимка guard → gate уже доказана `mvp-flow` (gate разбирает v2, иначе 400), метаданные — unit-тестами с настоящими рендерерами, видимость в PDF проверяет владелец в обязательных прогонах |
| Детерминированная проверка структуры блока Current Independent Work (число bullets, один JobFlow) | **Отложено** | новая проверка вывода модели (eval layer), а не валидация инициативы; решать по итогам прогонов |
| Новые сэмплы в `project-management/golden-dataset/generated-cv-samples/` | **Отклонено** | набор ISSUE-282 в `cv-quality-guard.service.spec.ts` сверяет точные счётчики по всем файлам каталога; артефакты остаются в `STORAGE_ROOT` |

### 4. Реальные прогоны (владелец, вне CI)

Принцип: модель проверяется по двум осям D1 — **вес** AI (нет / Plus / Core / фокус роли) и **вид** запроса (ассистенты, качество AI-кода, tooling, LLM integration). Обязательный набор — минимальный, который покрывает каждое значение каждой оси хотя бы раз и отдельно — правило «вес ≠ должность». Вакансии берутся из `project-management/golden-dataset/` (реальные тексты, решение владельца известно); `manual-cv.md` того же кейса — ориентир для сохранности коммерческих фактов, не эталон вывода.

| # | Сценарий | Приоритет | Вакансия (альтернатива) | Что проверяет | Почему выбран |
|---|---|---|---|---|---|
| S1 | Backend Node.js/TS/PostgreSQL без AI | **обязательно** | `chabre_20260715` (`sysint_20260710` — без упоминания CI/CD: подпроверка «участие в CI/CD не открывает исключение tooling» переходит к S6) | режим off: без AI-фразы, AI-credentials, AI-грани обзора и Dark Factory; «CI/CD pipelines» в вакансии не открывает исключение tooling; EPAM/Factor–IT ведут; Summary A | самый частый тип вакансии; заодно отрицательная сторона узкого исключения (H) |
| S2 | Backend + AI coding assistants как плюс | **обязательно**, + письмо | `jobgether_20260714` (`innovecs_20260623` — ассистенты в «desirable extras», но роль full-stack: ожидаемый Summary — B; `jobgether_20260715` — тот же текст, не альтернатива) | вес Plus: Summary A + фраза с Claude Code и Codex; Dark Factory — компактная запись 1 bullet по умолчанию или причина отказа в `main_angle`; обзор без AI-грани при выбранном Dark Factory; ≤ 1 AI-credential; письмо — 1–2 конкретные фразы без отдельного AI-абзаца | приоритет владельца; главный новый default D1 |
| S3 | Full-stack, AI-assisted разработка — ключевая обязанность | **обязательно** | `sigma_software_20260624` (`liveeo_20260709` — full-stack, agentic coding в must have; вида «качество AI-кода» нет) | вес Core при обычной должности: Summary B с полным AI-предложением, не C; Dark Factory 2 bullets `must_show`; вид «качество AI-кода» → факт (3); B1 Kompass/Cards по inclusion test; обзор не повторяет записи; Claude Code не приписан Cards/B1 Kompass; страницы | самое тонкое правило D1 («вес ≠ должность»); ещё и давление на `max_pages` |
| S4 | AI-assisted SE / developer productivity | **обязательно** | `orbit_20260709` (равноценной альтернативы в `golden-dataset` нет — новая реальная вакансия по правилу ниже) | Summary C; Dark Factory 2 bullets: сначала proof points, затем механизмы (вид tooling); Git-граница агента, контроллер, решение человека, «installed in three personal repositories»; Home Budget — Codex-native; ADK — skill badge; нет метрик продуктивности и коммерческого AI | максимум AI-утверждений — максимум риска overclaiming; единственный сценарий для Summary C и механизмов |
| S5 | LLM application integration без ассистентов | **обязательно**, + письмо | `hartleyco_20260717` (`homie_ai_20260720` — тот же вид и вес, должность Full Stack Developer: Summary B с полным AI-предложением допустим) | вид LLM integration: ведёт фасет JobFlow (provider abstraction, OpenAI API, валидация structured output, call policy, BullMQ); Dark Factory не по умолчанию; письмо не подменяет интеграцию LLM работой с ассистентами | единственный сценарий второго значения оси «вид»; правило уточнено в финальном ревью D1 (`bb10f0b`) |
| S6 | Финансовый + Azure production backend | P1 | `tangany_20260622` | Factor–IT/EPAM (Azure Functions, Azure DevOps) ведут; Home Budget — только как personal data integrity, не FinTech; «implement CI/CD pipelines» покрыто EPAM → без Dark Factory | объединяет F и J одним прогоном |
| S8 | AI-интеграция и агенты как плюс + Python secondary | P1 | `avenga_20260704` | вес Plus вида LLM/AI integration и agent frameworks без ассистентов: Summary A с фразой о компетенции интеграции, фасет JobFlow, Dark Factory не по умолчанию, ≤ 1 AI-credential (ADK); Python — только курс, AI Bootcamp не появляется | единственное значение «вид ≠ ассистенты» при весе Plus; чистой вакансии «LLM только плюс» в корпусе нет — у avenga продукт команды тоже AI, поэтому вес Core будет допустимым результатом анализа, а не дефектом; заменяет отдельный сценарий K |
| S7 | Developer tooling без AI | P1 | `softserve` («establishing CI/CD automation») | положительная сторона узкого исключения: 1 bullet о tooling, AI только как то, что инструмент оркестрирует; без AI в Summary, credentials и обзоре — либо обоснованный отказ | исключение сужено в `e6b9ccf`; редкое (в `golden-dataset` среди вакансий без AI — единицы) |
| — | Письмо для S3 (Core-абзац) | P1 | — | отдельный AI-абзац только при Core | 1 вызов после готового экспорта |
| — | Комбинированная (G), full-stack без AI (I) | P2, не планируются | — | — | G перекрыт S3/S6 (выбор по требованиям проверяется в каждом прогоне); I — пересечение S1 (режим off) и S3 (full-stack). K вошёл в S8 |

**Альтернативная вакансия** заменяет основную, только если сохраняет то, что сценарий проверяет: вес AI, вид AI-запроса, отсутствие другого вида AI, который поменял бы ведущее доказательство, и проверяемые инженерные требования. Семейство роли может отличаться, только когда сценарий не проверяет вариант Summary; ожидаемый вариант тогда следует семейству роли. Prompt 1 и Prompt 2 ничего не навязывается: если модель, обоснованно по тексту вакансии, определила вес или вид иначе, чем задумано сценарием, это записывается как наблюдение (не дефект), прогон не засчитывается за сценарий и берётся альтернатива. Если подходящей нет в `golden-dataset`, владелец берёт новую реальную вакансию с теми же свойствами.

**Стоимость.** Обязательный набор: 5 прогонов × (Prompt 1 + Prompt 2 + Prompt 3) + 2 письма = 17 вызовов; P1 (S6, S7, S8 и письмо S3) — ещё 10. Prompt 3 выполняется в каждом обязательном прогоне: v10 изменён в D1, его corrections входят в экспорт и в письмо. Пропуск Prompt 3 детерминирован и покрыт e2e, отдельного прогона не требует. Повторная генерация — только при блокирующей находке. `AiRun.costEstimate` провайдер не заполняет: стоимость — по `inputTokens`/`outputTokens` и цене модели.

**Сравнение до/после Prompt 3** — облегчённое: число corrections, их `field_path`, затронуты ли `current_work_block`, `selected_projects`, `certifications`, вносит ли correction новый факт (критерий 2 `docs/10_calibration_and_parity.md` §5.2). Полный построчный diff не нужен: эффективный CV детерминированно проверяет export gate.

### 5. Процедура владельца

1. Конфигурация: `AI_PROVIDER=openai`, `OPENAI_MODEL` — модель, на которой будут работать реальные заявки; лимиты `OPENAI_MAX_OUTPUT_TOKENS_*` не ниже `apps/api/.env.example`; в логе старта API выбран провайдер `openai`; worker `ai-step` и Redis запущены.
2. `cd apps/api && npm run register-knowledge-sources && npx prisma db seed` (список и seed одинаковы на `main` и ветке TASK-E). Проверка (только чтение):
   - `SELECT "sourceType", "versionLabel" FROM "KnowledgeSource" WHERE "isActive" ORDER BY 1;` — 9 строк, по одной на тип, версии из `active-knowledge-sources.ts`;
   - `SELECT step, version FROM "PromptTemplate" WHERE "isActive" ORDER BY 1;` — `cover_letter` 5, `prompt_1` 13, `prompt_2` 12, `prompt_3` 10.
3. Для каждого сценария: новый workspace с текстом вакансии из `case.md` (раздел «Vacancy source»), без manual note.
4. Prompt 1 → review. `apply`/`maybe` — approve. `skip` — записать как наблюдение и взять альтернативную вакансию (override меняет контекст Prompt 2 и смешивает проверку). Если вес или вид AI определены иначе, чем задумано сценарием, — правило «Альтернативная вакансия» (§4).
5. Prompt 2 → review черновика: `registry_violations` пуст, `target_strategy.main_angle` называет вес и вид AI с цитатой вакансии → approve.
6. Prompt 3 → `paused_before_export` → экспорт. Открыть оба PDF: число страниц, читаемость, строка сертификата `title — issuer [skill badge], год` в design и ATS, одинаковое содержание.
7. S2 и S5: cover letter.
8. После каждого прогона — запрос токенов (только чтение): `SELECT pr."promptStep", pr."templateVersion", ar.model, ar."inputTokens", ar."outputTokens", ar.id FROM "PromptRun" pr LEFT JOIN "AiRun" ar ON ar.id = pr."aiRunId" WHERE pr."workspaceId" = '<id>' ORDER BY pr."createdAt";` — версии промптов совпадают с шагом 2.
9. Отчёт — один комментарий в #690 (шаблон ниже). Артефакты остаются в `STORAGE_ROOT`, в репозиторий не коммитятся.
10. PR TASK-E мержится после комментария: merge закрывает #690 и инициативу. Каждая блокирующая находка до merge либо исправлена отдельным issue с повтором её сценария, либо явно принята владельцем с причиной.

### 6. Шаблон отчёта

```text
## Real-provider validation — <date>, model <OPENAI_MODEL>
Config: sources 9/9 active as listed; prompt_1 v13 / prompt_2 v12 / prompt_3 v10 / cover_letter v5 — OK | deviation: …

| Run | Vacancy | P1 decision | Summary | AI weight / kind (main_angle) | Selected Projects (in / not) | Pages design/ATS (max) | Verdict |
|---|---|---|---|---|---|---|---|

### S<n> — <scenario> — workspace <slug>
- CIW: <n> bullets — small tasks / JobFlow (<facet>) / overview (<facets>) / extra (<what> | none) / volunteering (yes | no)
- Selected Projects: <title> (<bullets>, <display_priority>, reason) …; not included: …
- Certifications (rendered): …
- Requirement coverage: must_have not shown: … ; AI request registered: yes | no
- registry_violations: [] ; critical_issues: <n>
- Prompt 3: <readiness>; corrections <n> (<field_paths>); touched CIW/projects/certs: …; new facts: none | …
- Commercial evidence (EPAM, Factor–IT) intact: yes | no — …
- Unsupported claims: none | … ; substantive duplication: none | …
- Cover letter (S2, S5): names ⊆ exported CV: yes | no; AI wording by kind/weight: … (quote)
- Tokens: P1 in/out, P2 in/out, P3 in/out, CL in/out; AiRun ids: …
- Findings: [class] <text> — blocking | non-blocking — follow-up #<n>
```

### 7. Классификация находок

**Блокирующие** (до merge TASK-E — исправление отдельным issue и повтор сценария, либо явное принятие владельцем с причиной):
1. Дефект реализации: экспорт или письмо падают; gate пропускает нарушение; метаданные неверны или выдуманы.
2. Нарушение registry или доказательств в экспортированном CV или письме: архивная, `cvEligible: false` или незарегистрированная запись без manual note; название в письме, которого нет в экспортированном CV.
3. Overclaiming: личная работа или обучение как коммерческие; метрики продуктивности; выдуманные факты; должность AI Engineer.
4. Неверная атрибуция: Dark Factory внутри JobFlow или «без доступа к Git»; Ralph во всех трёх репозиториях; Home Budget как установка пакета; Claude Code у Cards/B1 Kompass.
5. Вытеснен или изменён коммерческий bullet, покрывающий требование.
6. Нарушена жёсткая структура блока: нет обзора, нет или два JobFlow-bullet, наполнитель ради счёта.
7. Режим off нарушен: AI-фраза, AI-credential, AI-грань или Dark Factory вне узкого исключения tooling.
8. Неверный вид AI ведёт: в S5 доказательство ассистентов заслоняет интеграцию LLM; в письме работа с ассистентами выдана за интеграцию LLM.
9. PDF длиннее `max_pages`; содержание design и ATS расходится.
10. Одно и то же конкретное достижение в двух разделах экспортированного CV.
11. Существенный провал отбора доказательств: требование `must_have` или ключевая обязанность, для которой в источниках есть сильное проверенное доказательство, в экспортированном CV не показано или показано заметно слабее доступного (`requirement_coverage`: `not_shown` или `partial` при доступном `strong`) без причины, основанной на вакансии или `max_pages`. Сюда относится и пропуск главного отличающего доказательства кандидата, когда вакансия прямо просит именно его (например, AI-assisted разработка как ключевая обязанность — без доказательства из записи проекта AI-assisted разработки). Критерий — сила и проверенность доказательства для требования, а не наличие конкретного проекта: другое доказательство той же силы для того же требования — допустимая вариация.

**Допустимая вариация** (не находка): другой набор проектов или доказательств той же силы для тех же требований с причиной в `main_angle`; вариант Summary на границе Core/фокус роли с причиной; отсутствие компактной записи Dark Factory при Plus с причиной (вытеснение, `max_pages`); разброс между запусками в этих пределах. Таблица «Ожидаемый отбор» — ориентир, а не шаблон.

**Не блокирующие** (записываются; при необходимости — follow-up): стиль и редакторские недочёты; страниц больше `target_pages`, но ≤ `max_pages`; слабость позиционирования, не достигающая п. 11 (например, требование `nice_to_have` показано слабее возможного); ограничения оценки.

**Другие слои — не находки о качестве CV:**
- *Сбой выполнения прогона* (таймаут провайдера, падение worker, 409 от параллельного запуска): шаг повторяется; если сбой воспроизводится в коде приложения — это блокирующий п. 1.
- *Формальная приёмка PR TASK-E* (CI, CodeQL, Acceptance Verifier) — отдельный статус, который не ослабляется и не заменяется отчётом прогонов: в PR и в #690 записывается фактический вердикт. Сбой верификатора по причинам инфраструктуры (недоступный отчёт, неверная цитата) не считается ни дефектом реализации, ни успешной проверкой: верификатор перезапускается; решение о merge при сохраняющемся сбое принимает владелец явно, с записанной причиной, как и при любом PR. Ремонт верификатора — в `dark-factory`, не в TASK-E.

### 8. Отложенный долг

| Пункт | Решение | Причина |
|---|---|---|
| Отдельное представление personal AI skills | после TASK-E, решение по прогонам | отчёт фиксирует, где появляются Claude Code/Codex (`tech_stack`, `top_skills`) |
| Детерминированная проверка текста письма | follow-up P1, только если прогоны найдут нарушение | S2/S5 проверяют письмо вручную; новый gate шага письма — не валидация |
| Registry до платного вызова Prompt 2 | follow-up | TASK-E снижает риск проверкой реальных registry в CI; runtime-исправление — правка Prompt 2 input/guard |
| Снимок registry в контексте Prompt 3/5 | follow-up | расход токенов, не корректность |
| Дубли ключей JSON в registry | follow-up, низкий приоритет | `JSON.parse` берёт последний; ни один тест TASK-E их не ловит |
| `apps/api/src/document-export/templates/cv.template.html` расходится со встроенным шаблоном | follow-up (удалить или синхронизировать) | файл не используется во время выполнения |
| Надёжность Acceptance Verifier (ссылки на несуществующие пути, «report not readable») | вне репозитория — в `dark-factory` | инфраструктура фабрики, этой сессией не меняется |

### 9. Файлы

Новые: `apps/api/src/knowledge-sources/active-knowledge-sources.ts`, `apps/api/src/knowledge-sources/active-knowledge-sources.spec.ts`.

Изменяемые: `apps/api/scripts/register-knowledge-sources.ts`, `apps/api/src/knowledge-sources/knowledge-source-selection.service.ts` (только `export` у `STEP_SOURCE_GROUPS`), `apps/api/src/knowledge-sources/knowledge-source-registration.ts`, `apps/api/src/knowledge-sources/knowledge-source-registration.spec.ts`, `apps/api/src/evidence/career-registry.parser.ts`, `apps/api/src/evidence/career-registry.parser.spec.ts`, `apps/api/src/prompt-templates/critical-prompt-content.spec.ts`, `apps/api/knowledge-sources/README.md`, `apps/api/CLAUDE.md`, `docs/01_requirements.md`, `docs/03_domain_model.md`, `docs/08_ai_pipeline.md`, `project-management/plan/PLAN-career-evidence-refresh.md`, `project-management/prd/PRD-career-evidence-refresh.md`.

`docs/00_product_vision_updated_consistent.md`, `docs/02_user_flows_v3_consistent.md`, `docs/07_task_backlog.md`, `docs/10_calibration_and_parity.md` не меняются: это видение, исходные пользовательские сценарии, история задач и калибровки с версиями своего времени.

### 10. Риски

| Риск | Мера |
|---|---|
| Структурная проверка `primary` ложно падает при будущем осознанном изменении | правка registry — PR владельца; падение указывает запись, решение принимает владелец |
| Реальные прогоны находят проблему промпта | новые версии промптов — отдельные issues; TASK-E не превращается в редизайн |
| Разброс модели между запусками | вердикт по классам §7, не по совпадению с таблицей ожиданий; при сомнении — повтор одного сценария |
| Вакансия получает `skip` в Prompt 1 или иной вес/вид AI | альтернатива по правилу §4; для S4 — новая реальная вакансия |

## Тестовая стратегия

| Уровень | Что | Где |
|---|---|---|
| Unit (CI) | парсер, правила registry, guard, эффективный контент, export gate (включая регрессии Prompt 3 corrections), Prompt 2 wiring, schema | `src/evidence/*.spec.ts`, `src/document-export/effective-cv-content.spec.ts`, `src/document-export/document-export.service.spec.ts`, `src/pipeline/**` |
| Контент (CI) | активные промпты, активные источники | `critical-prompt-content.spec.ts`, `active-knowledge-sources.spec.ts` |
| E2E (CI) | существующие наборы на fixtures с registry | `apps/api/test/*.e2e-spec.ts` |
| Реальный прогон (владелец, не гейтится) | S1–S5 — **обязательно** (backend без AI, backend + AI как плюс, full-stack с AI как ключевой обязанностью, AI-assisted SE, LLM integration) + письма S2 и S5; S6 (финансы + Azure), S7 (tooling без AI), S8 (AI-интеграция как плюс + Python) — P1 | отчёт в #690, раздел «TASK-E — Final Validation», §4–§7 |

Отбор для любой вакансии детерминированно проверяется только на уровне допуска (registry, guard, export gate); ранжирование и формулировки — реальными прогонами. Content-тесты промптов доказывают наличие инструкций, а не поведение модели.

## Ожидаемый отбор для эталонных вакансий

Редакция TASK-D1, вторая (2026-11-24); приоритеты строк — по TASK-E (2026-11-24). Таблица — ориентир, а не шаблон: другой набор, обоснованный требованиями вакансии и проверенными доказательствами, дефектом не считается (TASK-E, §7). Current Independent Work во всех строках: small tasks → JobFlow (фасет по вакансии) → обзор портфеля (обязателен, грани по вакансии) → дополнительное доказательство (0–1, только при покрытии требования) → volunteering по рынку; обычно 4, до 5; без volunteering допустимо 3 без наполнителя. «Не по умолчанию» снимается inclusion test с причиной в `main_angle`. Сертификаты печатаются экспортом как `title — issuer [skill badge], год`.

| Вакансия | Ведущие доказательства | Обзор / доп. доказательство | Selected Projects | Не по умолчанию | Certifications | Summary |
|---|---|---|---|---|---|---|
| Backend Node.js/TS без AI | EPAM, Factor–IT (SQL), JobFlow (NestJS/PostgreSQL) | обзор: PostgreSQL-приложения, публичный деплой, тесты в CI; без AI; доп. — только при названном требовании | пусто или Home Budget при требовании data integrity | Dark Factory, Cards, B1 Kompass, ADK | Node.js Testing, Node.js Security, System Design in Cloud | A |
| Backend + AI coding assistants as a plus | как выше | обзор без AI (AI — в записи Dark Factory) | Dark Factory — компактно, 1 bullet по подвиду запроса (`show_if_space`); Home Budget — как выше | Cards, B1 Kompass | backend-курсы + ≤ 1 AI-credential | A + AI-фраза |
| Full-stack с ежедневной AI-assisted разработкой | EPAM React/Next.js/BFF, JobFlow (dashboard) | обзор: full-stack и access control без механизмов B1 Kompass | B1 Kompass; Dark Factory: 1 bullet при Plus, 2 bullets при Core (ключевая обязанность); Cards при непокрытом требовании | — | Node.js-курсы; ≤ 1 AI-credential при Plus | B + AI-фраза (Plus) или полное AI-предложение (Core) |
| React/Next.js full-stack без AI (P2) | EPAM React/Next.js/BFF, JobFlow (dashboard) | обзор без механизмов B1 Kompass | B1 Kompass; Cards при непокрытом требовании | Dark Factory, ADK | Node.js-курсы | B |
| AI-assisted SE / DevProd | EPAM, Dark Factory, JobFlow (AI integration) | обзор без повторного описания Dark Factory; доп. — ADK labs | Dark Factory (`must_show`, 2 bullets) | Cards, Home Budget; B1 Kompass отдельной записью | ADK (Google Cloud skill badge), Claude Code 101, MCP Advanced Topics | C |
| Чистая LLM integration (обязательно, S5) | EPAM, JobFlow (AI integration, background jobs) | обзор без AI-tooling | пусто; Dark Factory — только если просят coding agents | Cards, Home Budget | React+OpenAI course, MCP; ADK при агентах | C |
| Database / financial (P1, S6 вместе с Azure) | Factor–IT, EPAM | обзор: PostgreSQL, без механизмов Home Budget | Home Budget | Dark Factory, Cards, ADK | System Design, Node.js Testing | A |
| Комбинированная full-stack + финансы + AI (P2) | EPAM, Factor–IT | обзор по требованиям | по inclusion test (например, B1 Kompass, Home Budget, Dark Factory компактно), с учётом `max_pages` | — | по требованиям | B или C |
| Developer tooling без AI (P1) | EPAM (CI/CD участие) | обзор без AI | Dark Factory — узкий override, 1 bullet о tooling | Cards | backend-курсы | A |
| Azure / production (P1, S6 вместе с financial) | EPAM (Durable Functions, интеграции, App Insights/KQL) | обзор | пусто | все Selected Projects | System Design in Cloud, Node.js Security | A |
| Python/FastAPI (P1, S8 вместе с AI-интеграцией как плюсом) | EPAM, Factor–IT | обзор; доп. — курс FastAPI | пусто (нет `cvEligible` Python-проекта) | — | FastAPI course | A |
| Cover letter (обязательно на S2 «Backend + AI as a plus» и S5 «LLM integration») | экспортированный CV | — | только проекты экспортированного CV | — | только credentials экспортированного CV | — |

Во всех вакансиях: архивные и `cvEligible: false` проекты — никогда; `registry_violations` пусто; JobFlow — один bullet в Current Independent Work и никогда в Selected Projects; обзор портфеля не повторяет механизм записи Selected Projects.

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
TASK-B ─┼─► TASK-C ─► TASK-D ─► TASK-D1 ─► TASK-E
        └─ (код парсера/guard/gate в TASK-D можно начать параллельно на синтетических fixtures)
```

TASK-D1 добавлена после consolidated review #695: реальные прогоны TASK-E должны проверять окончательную стратегию, чтобы не тратить платные прогоны дважды.

| Задача | Приоритет | Оценка |
|---|---|---|
| A | P0 | 0.5 д |
| B | P0 | 0.3 д |
| C | P0 | 0.3 д |
| D | P0 | 0.7 д |
| E | P0 (CI-тесты, docs, 5 прогонов CV + 2 письма), P1 (3 прогона + 1 письмо) | 0.3 д + время провайдера |
| **Итого** | | **≈ 2.1 д**, без запаса (рамка «около двух дней» сохраняется за счёт порядка сокращения ниже) |

**День 1:** A, B, C (источники), старт кода D (парсер, guard, gate с unit-тестами).
**День 2:** промпты D, seed, e2e fixtures, ADR amendment → PR D; E: перенос `SOURCES`, тесты на реальных файлах, docs, регистрация, seed, реальные прогоны по разделу «TASK-E — Final Validation».

**Сокращение при перерасходе (в этом порядке):** доп. прогоны P1 → правка Prompt 1/3 сводится к удалению литеральных перечней (без новых правил).

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

- **P1:** реальные прогоны S6 (финансы + Azure), S7 (tooling без AI), S8 (AI-интеграция как плюс + Python), письмо S3; проверка AI Bootcamp RAG Service (для `cvEligible: true`). **P2:** прогоны G, I.
- **P2:** Prisma registry, GitHub sync, scoring engine, UI портфолио, блокировка экспорта по прочим `critical_issues`, #404, #252, #281.
- **После D1 (предложено отдельными issues, не созданы; решения — раздел «TASK-E — Final Validation», §8):** tech debt #695 — ошибка registry до платного вызова Prompt 2, снимок registry вне контекста Prompt 3/5 (из контекста письма он уходит в D1), дубли ключей JSON (низкий приоритет); P1 — детерминированная registry-проверка текста cover letter; P2 — отдельное поле CV для personal AI skills (решение — по итогам TASK-E).
