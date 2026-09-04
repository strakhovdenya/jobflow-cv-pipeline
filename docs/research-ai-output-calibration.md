# Research: Optimal Technical Implementation of AI Output Calibration (EPIC-24 / Phase 17)

**Дата**: 2026-08-19
**Контекст**: `project-management/plan/PLAN-ai-output-calibration-against-manual-baseline.md`,
`project-management/prd/PRD-ai-output-calibration-against-manual-baseline.md`,
`docs/10_calibration_and_parity.md`

## 1. Цель ресерча

`docs/10_calibration_and_parity.md` уже определяет методологию калибровки (golden dataset,
посекционное сравнение, convergence criteria) — этот документ не заменяет её, а отвечает на более
узкий вопрос: **как технически реализовать её оптимально**, сверяясь с тем, что делает индустрия
для похожих задач (LLM eval / golden dataset / regression testing), и адаптируя это под ограничения
проекта (ADR-002, PRD "Не в скоупе", масштаб портфолио-проекта, а не production-системы).

## 2. Что делает индустрия (2026)

Из внешнего ресерча (LLM eval / golden dataset / prompt regression testing best practices):

- **Формат golden-датасета** — машиночитаемый (обычно JSONL/JSON), каждая запись: `input`,
  `expected_output`/rubric, `required_context`, `evaluation_criteria`. Production-датасеты обычно
  100–300+ кейсов для статистической значимости регрессионных метрик.
  ([Langfuse](https://langfuse.com/resources/engineering/golden-dataset-evaluation),
  [Arize](https://arize.com/resource/golden-dataset/))
- **Golden dataset — "живой" артефакт**, не статичный снапшот: новые провалы/edge cases
  регулярно ревьюятся и вливаются обратно в набор.
  ([FutureAGI](https://futureagi.com/glossary/llm-regression-testing/),
  [Langfuse](https://langfuse.com/resources/engineering/golden-dataset-evaluation))
- **Regression testing = сравнение с последним прошедшим baseline**, не с абсолютным эталоном
  каждый раз заново — перегон кандидата против golden-сета и сравнение с предыдущим прогоном.
  ([Coverge](https://coverge.ai/blog/llm-regression-testing))
- **CI-gated eval**: каждый PR, трогающий промпт/модель/retrieval, триггерит eval-прогон против
  golden-датасета; регрессия ниже порога блокирует merge.
  ([Langfuse](https://langfuse.com/resources/engineering/golden-dataset-evaluation))
- **LLM-as-judge** — стандартный способ автоматизировать оценку "открытых" ответов (не exact-match),
  часто в комбинации с deterministic/statistical evaluator-ами.
  ([Traceloop](https://www.traceloop.com/blog/automated-prompt-regression-testing-with-llm-as-a-judge-and-ci-cd),
  [Galtea](https://galtea.ai/blog/llm-evaluation-complete-guide))

Источники:
- [Golden dataset evaluation: build and maintain LLM test sets — Langfuse](https://langfuse.com/resources/engineering/golden-dataset-evaluation)
- [Golden Dataset: Role In Custom LLM Evals — Arize AI](https://arize.com/resource/golden-dataset/)
- [LLM Regression Testing: FutureAGI Guide (2026)](https://futureagi.com/glossary/llm-regression-testing/)
- [LLM regression testing: catching quality drift before your users do — Coverge](https://coverge.ai/blog/llm-regression-testing)
- [Automated Prompt Regression Testing with LLM-as-a-Judge and CI/CD — Traceloop](https://www.traceloop.com/blog/automated-prompt-regression-testing-with-llm-as-a-judge-and-ci-cd)
- [the complete guide for LLM evaluations in 2026 — Galtea](https://galtea.ai/blog/llm-evaluation-complete-guide)

## 3. Что из этого применимо здесь — и что явно нет

| Индустриальная практика | Применимо к EPIC-24? | Почему |
|---|---|---|
| Машиночитаемый формат golden-записи (структурированные поля) | **Да** | Нужен формат, который Claude Code может читать и по которому детерминированно считать итог — см. §4.1 |
| "Живой", пополняемый golden-датасет | **Да, частично** | Датасет растёт по мере появления новых завершённых заявок — но источник ограничен реальной историей project owner, не production-трафиком |
| Regression baseline (сравнение раунда N с раундом N-1) | **Да** | Уже фактически реализовано решением "issue на раунд" (#212/#214) — раунд 2 создаётся только если раунд 1 не сошёлся, лог сравнений обновляется по кейсам, а не переписывается с нуля |
| 100–300 кейсов в датасете | **Нет** | PRD прямо оставляет объём открытым вопросом ("сколько реальных папок вообще пригодны"); это портфолио-проект с реальной историей одного пользователя, не production-масштаб — датасет будет на порядок меньше, и это ожидаемо, не пробел |
| CI-gated eval на каждый PR | **Нет** | Вне скоупа PRD ("Не в скоупе" — LLM-as-judge/автоматизация; сравнение остаётся ручным в Phase 17/18 согласно `docs/10_calibration_and_parity.md` §7) |
| LLM-as-judge для оценки открытых ответов | **Нет** | Явно исключено PRD и `docs/10_calibration_and_parity.md` §7 для этого прохода — посекционное сравнение выполняет Claude Code вручную (решение зафиксировано в плане), не отдельный AI-вызов |

## 4. Конкретные технические рекомендации для реализации

### 4.1 Формат файлов golden dataset (`project-management/golden-dataset/`)

Рекомендация: **один файл на кейс**, а не один большой файл на весь датасет — облегчает диффы в
git и точечное редактирование одного кейса без конфликтов. Формат — Markdown с YAML frontmatter
(не чистый JSON/JSONL, как в индустриальных инструментах) — потому что:
- Проект уже хранит артефакты как `.md`/`.json` пары (ADR-006) — Markdown-first для
  человекочитаемого контента, machine-readable поля вынесены во frontmatter.
- Golden-кейс — это в первую очередь текст (вакансия + CV), а не табличные метрики; Markdown-тело
  для текста, frontmatter для структурированных полей (`docs/10_calibration_and_parity.md` §3.2:
  workspace slug, decision, date added) читается легко и человеком, и Claude Code.

Предлагаемая структура:

```
project-management/golden-dataset/
  <case-slug>/
    case.md          # frontmatter (slug, source folder, manual_decision, date_added)
                      #  + тело: оригинальный текст вакансии
    manual-cv.md      # реально отправленный CV (или skip-reason, если manual_decision = skip)
```

Это прямое продолжение решения, уже принятого в плане ("Golden dataset физически хранится в
`project-management/golden-dataset/`") — здесь только формат внутри папки, не новое решение по
локации.

### 4.2 Формат лога сравнения (Фаза 4/5)

Рекомендация: **структурированная таблица в Markdown**, не JSON — результат сравнения читает и
пишет Claude Code вручную (решение зафиксировано в плане), а не программа; Markdown-таблица легко
читается человеком в PR-диффе и не требует парсера для ручной сверки. Одна таблица на кейс, одна
строка на раунд калибровки — так и decision-match, и посекционные вердикты, и history итераций
видны в одном месте без необходимости листать историю git:

```markdown
## <case-slug>

| Раунд | PromptTemplate version | Decision match | Headline | Summary | Top skills | Experience | Evidence/needs_evidence | Note |
|---|---|---|---|---|---|---|---|---|
| 1 | prompt_1 v2 / prompt_2 v2 | нет (AI: maybe, ручное: apply) | match | partial | match | mismatch | match | ... |
| 2 | prompt_1 v2 / prompt_2 v3 | да | match | match | match | match | match | конвергенция |
```

Это делает "раунд-как-issue" (уже принятое решение по Фазе 5, ADR-стиль запись в плане) и
regression-baseline-паттерн из индустрии (§2) совместимыми: каждая новая строка = новый раунд,
сравнение "стало лучше/хуже" видно по столбцам без отдельного тулинга.

### 4.3 Детерминированный скрипт подсчёта convergence-статуса

Индустриальный паттерн "CI-gated eval на каждый PR" (§2) сюда не переносится (не в скоупе,
никакого AI-вызова для оценки), но его **безопасная часть** — детерминированный подсчёт итога по
уже записанным вручную вердиктам — не является LLM-as-judge и не выходит за рамки PRD. Рекомендуется
небольшой скрипт (`apps/api` дев-скрипт или standalone Node/TS-скрипт вне `apps/`, без нового HTTP
endpoint — см. PRD "API-поверхность": "Новых HTTP endpoints не предполагается"), который:

- парсит все `project-management/golden-dataset/**/comparison.md`-таблицы (формат §4.2),
- считает для последнего раунда каждого кейса: сколько decision-match, сколько
  match/partial/mismatch по секциям,
- выводит один текстовый summary: закрыт ли convergence criteria `docs/10_calibration_and_parity.md`
  §5 для всего набора, и если нет — какие кейсы/секции ещё mismatch.

Это не оценивает качество текста (это делает Claude Code вручную) — только агрегирует уже
записанные вручную вердикты. Экономит время на каждом раунде Фазы 5 (не нужно вручную пересчитывать
"сошлось ли всё"), и даёт готовый текст для тела issue-трекера раунда (#212) на GitHub.

**Это дополнение, не обязательный шаг** — можно обойтись и без скрипта, посчитав вручную (набор
мал), но при ≥2 раундах экономия времени становится заметной. Решение, делать ли его отдельной
задачей внутри Фазы 5 или пропустить — за project owner.

### 4.4 Хранение — без изменений к уже принятым решениям

Подтверждается (не меняется этим ресерчем):
- Filesystem, не PostgreSQL, для golden-текстов (ADR-002 — реальные CV-тексты golden-кейсов это
  физические артефакты, не строки в БД; PRD уже это отмечает).
- `PromptTemplate`-версионирование — существующий механизм (ADR: "never silently overwrite a
  version"), новый ресерч не предлагает ничего поверх него.
- Никаких новых HTTP endpoints, никакой Prisma-миграции ради golden dataset/comparison log —
  всё остаётся файлами в `project-management/`.

## 5. Что осознанно НЕ рекомендуется (несмотря на то, что это стандартная практика)

- **LLM-as-judge автоматизация сравнения** — прямо исключено `docs/10_calibration_and_parity.md`
  §7 и PRD "Не в скоупе" для этого прохода. Индустриальный стандарт, но введение отдельного AI-вызова
  для оценки AI-вывода добавляет ещё один слой, который сам нужно калибровать против человека —
  преждевременно до того, как хотя бы ручная калибровка сойдётся.
- **CI-gated regression gate** (блокировать PR при регрессии) — нет CI-процесса, который что-либо
  генерирует через реальный AI provider на каждый PR (дорого, требует `OPENAI_API_KEY` в CI, и в
  этом эпике прогоны golden-сета — ручное действие через `apps/web` UI, не автоматический шаг).
  Actionable только вручную, при явном запуске раунда калибровки.
- **100+ кейсов датасета** — недостижимо и не нужно: датасет ограничен реальной историей одного
  пользователя (project owner), не production-трафиком множества пользователей. Несколько кейсов
  на apply/maybe/skip — реалистичный и достаточный масштаб для портфолио-проекта.

## 6. Итог

Подход, уже зафиксированный в PRD/плане/`docs/10_calibration_and_parity.md`, в целом совпадает с
тем, как индустрия решает эту задачу на маленьком масштабе (golden dataset + regression baseline
между раундами), и осознанно отказывается от частей, рассчитанных на production-масштаб
(LLM-as-judge, CI-gated eval, сотни кейсов) — это соответствует явному PRD "Не в скоупе", а не
пробел. Единственное новое техническое предложение этого ресерча — конкретный формат файлов
golden dataset (§4.1), формат лога сравнения (§4.2) и опциональный детерминированный
summary-скрипт (§4.3), которые не меняют ни одно уже принятое решение, а закрывают "implementation
decision for Phase 17" вопрос, оставленный открытым в `docs/10_calibration_and_parity.md` §3.2.
