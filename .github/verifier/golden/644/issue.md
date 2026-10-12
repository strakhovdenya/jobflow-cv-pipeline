# Golden eval: проверка ожидаемой причины FAIL (criterion ID + reason code), раздельный отчёт ошибок

## Контекст
Проблема: `scripts/verifier-eval.js` сравнивает только итоговый вердикт кейса golden eval с `expected`. Кейс, который должен падать из-за убранного негативного теста, засчитывается как «пойман», даже если верификатор выдал FAIL совсем по другой причине: сломанный вход, отсутствующий approval или посторонняя упавшая проверка. Причину FAIL кейс не фиксирует: в `case.json` есть только `expected` и свободный текст `reason`.

Почему важно: мутационная пара — это корректный PR с ожидаемым PASS и тот же PR с одной намеренной порчей (`mutation.patch`) с ожидаемым FAIL (#570, #572). Такие пары имеют смысл, только если верификатор ловит порчу по ожидаемому механизму. Иначе eval показывает 0 ложных PASS, а верификатор на самом деле мутацию не видит. Ложный FAIL и несовпадение причины — разные ошибки, и в отчёте их нужно разделять.

После задачи: `case.json` фиксирует `expected`, `expected_criterion_id` (ID пункта issue или `null` для правила без ID) и `expected_reason_code` — код причины из закрытого списка, который пишет машинный `result.json` верификатора (#567). Eval-workflow сохраняет `result.json` каждого кейса. `scripts/verifier-eval.js` засчитывает FAIL-кейс как пойманный, только если среди причин есть причина с ожидаемым кодом и ID. Отчёт показывает отдельно ложные PASS, ложные FAIL, run failures и несовпадения причины. Три существующих кейса (434, 446, 463) получают ожидаемую причину. Run failure, как и сейчас, означает, что кейс не удалось оценить вовсе: результата нет, он не парсится или в нём нет нужных данных.

Граница: наложение мутации и пересборка входов — #570; новые пары кейсов — #572. Список кодов причин задаёт верификатор (#567), eval его не дублирует.

## Affects
- `scripts/verifier-eval.js`
- `scripts/verifier-eval.spec.js`
- `.github/workflows/acceptance-verifier-eval.yml` (job `summarize`: `--result-out` и запись результата кейса с причинами)
- `.github/verifier/golden/434/case.json`
- `.github/verifier/golden/446/case.json`
- `.github/verifier/golden/463/case.json`
- `.github/verifier/golden/README.md` (поля `expected_criterion_id`, `expected_reason_code`, метрика несовпадения причины)

## Docs to Read
- `project-management/prd/PRD-verifier-calibration-and-root-cause-analysis.md` — «В скоупе» D (проверка ожидаемой причины)
- `scripts/verifier-eval.js` — `readCases`, `parseActual`, `summarize`, `render`
- `scripts/acceptance-verdict/result.js` — формат `result.json` и список кодов причин (после #567)
- `.github/verifier/golden/README.md`, `.github/verifier/golden/*/case.json` — текущие кейсы и их `reason`

## Key Invariants
- INV-1 `verifier-eval.js` не содержит кодов причин литералами: допустимость `expected_reason_code` проверяется по кодам, которые встречаются в `result.json`, и по списку кодов, экспортируемому `scripts/acceptance-verdict/result.js`.
- INV-2 Ложный PASS, ложный FAIL, run failure и несовпадение причины считаются раздельно; кейс попадает ровно в одну из категорий «совпал», «ложный PASS», «ложный FAIL», «run failure», «несовпадение причины».
- INV-3 Для PASS-кейса причина не проверяется; `expected_criterion_id` и `expected_reason_code` у PASS-кейса равны `null`.
- INV-4 Кейс без `expected_reason_code` в `case.json` считается некорректным и попадает в run failures, а не проверяется только по вердикту.
- INV-5 Никаких литералов проекта в коде фабрики: `scripts/verifier-eval.js` не содержит путей приложений, имён CI-проверок, логинов, имён моделей и номеров ADR.
- INV-6 Из ревью черновика (research-агент) сознательно отклонены: отдельный тест взаимоисключения категорий (INV-2 обеспечивает одна функция классификации, и AC-1…AC-6 проверяют каждую категорию на своём кейсе) и рендер пустого набора (уже покрыт существующим тестом `no cases found`).
- INV-7 Job `summarize` и шаг записи результата кейса получают каталог golden-кейсов только через `GOLDEN_DIR` из #570 и не повторяют его литерал.

## Acceptance Criteria
- [x] AC-1 [behavior] Given FAIL-кейс, и среди причин результата есть причина с ожидаемыми кодом и ID When считается сводка Then кейс засчитан как совпавший. Verify: scripts/verifier-eval.spec.js "counts fail case caught by expected reason"
- [x] AC-2 [behavior] Given FAIL-кейс с вердиктом FAIL, но без причины с ожидаемым кодом When считается сводка Then кейс попадает в «несовпадение причины», а не в совпавшие. Verify: scripts/verifier-eval.spec.js "counts unrelated fail as reason mismatch"
- [x] AC-3 [behavior] Given причина с ожидаемым кодом есть, но с другим ID пункта When считается сводка Then это несовпадение причины. Verify: scripts/verifier-eval.spec.js "requires expected criterion id"
- [x] AC-4 [behavior] Given `expected_criterion_id: null` When сравнивается причина Then учитывается только код. Verify: scripts/verifier-eval.spec.js "matches rule without criterion id by code"
- [x] AC-5 [behavior] Given PASS-кейс получил FAIL When считается сводка Then это ложный FAIL; Given FAIL-кейс получил PASS Then это ложный PASS. Verify: scripts/verifier-eval.spec.js "separates false pass and false fail"
- [x] AC-6 [behavior] Given у кейса нет `expected_reason_code`, результат не парсится как JSON или в нём нет поля причин When считается сводка Then кейс засчитан как run failure. Verify: scripts/verifier-eval.spec.js "treats missing reason data as run failure"
- [x] AC-7 [behavior] Рендер отчёта показывает по каждому кейсу ожидаемые и фактические вердикт, код и ID и отдельные счётчики ложных PASS, ложных FAIL, run failures и несовпадений причины. Verify: scripts/verifier-eval.spec.js "renders reason columns and separate counters"
- [x] AC-8 [behavior] Выход CLI ненулевой при любом ложном PASS, run failure или несовпадении причины и нулевой, когда все кейсы совпали. Verify: scripts/verifier-eval.spec.js "exits non-zero on reason mismatch"
- [x] AC-9 [behavior] Job `summarize` вызывает скрипт вердикта с `--result-out` и пишет в результат кейса вердикт и причины из `result.json`. Verify: scripts/verifier-eval.spec.js "summarize stores coded reasons per case"
- [x] AC-10 [config] `case.json` кейса 434 содержит `expected_criterion_id: null` и код причины упавшей CI-проверки. Verify: .github/verifier/golden/434/case.json
- [x] AC-11 [config] `case.json` кейса 446 содержит `expected_criterion_id` и код причины FAIL пункта моделью, совпадающие с его `reason`. Verify: .github/verifier/golden/446/case.json
- [x] AC-12 [config] `case.json` кейса 463 содержит `expected_criterion_id` и код причины FAIL пункта моделью, совпадающие с его `reason`. Verify: .github/verifier/golden/463/case.json
- [x] AC-13 [doc] README описывает новые поля кейса и категорию «несовпадение причины». Verify: .github/verifier/golden/README.md
- [x] AC-14 [behavior] Given текст job `summarize` When проверяется вызов `scripts/verifier-eval.js` и запись результата кейса Then каталог задаётся через `GOLDEN_DIR`, а подстроки `verifier/golden` в job нет. Verify: scripts/verifier-eval.spec.js "summarize uses shared golden directory value"

## Test Requirement
- [x] TR-1 [behavior] Given PASS-кейс получил PASS с непустым списком причин (например предупреждений) When считается сводка Then кейс засчитан как совпавший без проверки причин. Verify: scripts/verifier-eval.spec.js "does not check reason for pass cases"

## Definition of Done
- [x] DOD-1 [ci] Проверка скриптов на голове PR успешна. Verify: ci "Test (scripts)"

## Dependencies
#567 (машинный `result.json` верификатора с кодами причин); #570 (переменная `GOLDEN_DIR` в workflow). Общие файлы с #570: `acceptance-verifier-eval.yml`, `verifier-eval.spec.js`.

---
Сгенерировано из `project-management/plan/PLAN-verifier-calibration-and-root-cause-analysis.md` (PRD: `project-management/prd/PRD-verifier-calibration-and-root-cause-analysis.md`).


