# Eval workflow: перенести golden-src из workspace перед checkout коммита кейса

## Контекст
Проблема: Acceptance Verifier Eval — ручной workflow `.github/workflows/acceptance-verifier-eval.yml`, который прогоняет текущий верификатор (модель Codex) по замороженным golden-кейсам: старым PR с известным ожидаемым вердиктом (ADR-042 и его поправка про golden eval в `project-management/DECISIONS.md`). Файлы кейса (`GOLDEN_DIR`) скачиваются в `golden-src` внутри workspace. В jobs `verify-case` и `verify-case-second` шаг `Checkout case head (data only)` делает `actions/checkout` в корень workspace. Корень на этот момент ещё не git-репозиторий, а `actions/checkout` в таком случае удаляет всё содержимое каталога независимо от `clean` (исходник `src/git-directory-helper.ts` в репозитории actions/checkout: нет `.git` → `remove = true`; лог run 38164083455: при `clean: false` всё равно `Deleting the contents of '.../jobflow-cv-pipeline'`). Поэтому `golden-src` исчезает, и `Prepare inputs` падает на `cp golden-src/.../issue.md: No such file or directory`. Первая попытка исправления (#645/#646, `clean: false`) не помогла, потому что механизм был определён неверно.

Есть и вторая проблема, которую это исправление нельзя оставлять незамеченной: файлы кейса лежат в рабочем дереве, которое читает модель. `case.json` содержит `"expected": "FAIL"` и ожидаемый код причины, то есть ответ на задание.

Почему важно: golden eval нужен, чтобы заметить, что изменение промпта, схемы или модели верификатора перестало ловить известный дефект. Пока workflow не доходит до запуска модели, этой проверки нет; а если модель видит ожидаемый ответ, результат прогона ничего не доказывает.

После задачи: после чтения `case.json` каталог `golden-src` переносится из workspace в `$RUNNER_TEMP` и больше в workspace не возвращается. `Checkout case head (data only)` стирает пустой корень без последствий. Все последующие шаги (определение и применение `mutation.patch`, `Prepare inputs`) читают файлы кейса из `$RUNNER_TEMP`, поэтому к запуску модели в workspace нет ни `golden-src`, ни ожидаемого вердикта. Корень workspace остаётся корнем checkout, от которого читают `git diff`, сканер тамперинга и модель.

Граница: логика `scripts/verifier-eval.js`, формат кейсов, промпт и схема верификатора не меняются; `clean: false` из #646 удаляется как не работающий; новые кейсы делает #572.

## Affects
- `.github/workflows/acceptance-verifier-eval.yml`
- `scripts/verifier-eval.spec.js`
- `scripts/golden-mutation.spec.js` (тест "leaves cases without mutation unchanged" проверяет текст условия `hashFiles`, которое заменяется)

## Docs to Read
- `.github/workflows/acceptance-verifier-eval.yml` — jobs `verify-case` и `verify-case-second`, шаги checkout, `Apply mutation patch`, `Prepare inputs`
- `scripts/verifier-eval.spec.js` — хелперы `workflowText`, `jobText`, `stepsOf`, `stepNamed`; тесты про checkout из #646 (заменяются) и тест "eval workflow rebuilds code dependent inputs after mutation" (условие `hashFiles` меняется)

## Key Invariants
- INV-1 В jobs `verify-case` и `verify-case-second` порядок шагов такой: checkout с `path: golden-src`, `Read case.json`, `Move golden files out of workspace`, затем `Checkout case head (data only)`.
- INV-2 Шаг `Move golden files out of workspace` выполняет `mv golden-src "$RUNNER_TEMP/golden-src"`; шага, возвращающего каталог в workspace, нет.
- INV-3 Шаги после `Move golden files out of workspace` обращаются к файлам кейса только через `$RUNNER_TEMP/golden-src`; путь `golden-src/` относительно workspace и `hashFiles` по `golden-src` в них не встречаются.
- INV-4 Наличие `mutation.patch` определяется отдельным шагом `Detect mutation patch` (проверка файла в `$RUNNER_TEMP/golden-src`, результат в output шага); шаг `Apply mutation patch` включается по этому output.
- INV-5 Каталог golden-кейсов по-прежнему задаётся только через `GOLDEN_DIR`; новые шаги не содержат литерала `verifier/golden` (существующий тест "eval workflow defines golden directory once" остаётся зелёным).

## Acceptance Criteria
- [x] AC-1 [behavior] Given job `verify-case` When проверяется порядок шагов Then он соответствует INV-1, и `Move golden files out of workspace` содержит `mv golden-src` и `$RUNNER_TEMP`. Verify: scripts/verifier-eval.spec.js "first run moves golden files out before head checkout"
- [x] AC-2 [behavior] Given job `verify-case-second` When проверяется порядок шагов Then он соответствует INV-1, и шаг переноса содержит `mv golden-src` и `$RUNNER_TEMP`. Verify: scripts/verifier-eval.spec.js "second run moves golden files out before head checkout"
- [x] AC-3 [behavior] Given любой шаг `actions/checkout` без `path:` или с `path: .` / `path: ./` в jobs `verify-case` и `verify-case-second` When проверяется workflow Then ему предшествует шаг `Move golden files out of workspace`; шаги с `path: golden-src` и `path: trusted` этого не требуют. Verify: scripts/verifier-eval.spec.js "root checkouts in verify jobs follow golden move"
- [x] AC-4 [behavior] Given шаги jobs `verify-case` и `verify-case-second` после `Move golden files out of workspace` When проверяется их текст Then в них нет `golden-src/` вне `$RUNNER_TEMP/golden-src` и нет `hashFiles` по `golden-src`, а `Apply mutation patch` включается по output шага `Detect mutation patch`. Verify: scripts/verifier-eval.spec.js "verify jobs read golden files only from runner temp"
- [x] AC-5 [behavior] Given шаг `Checkout case head (data only)` в обоих jobs When проверяется его текст Then в нём нет `clean: false`. Verify: scripts/verifier-eval.spec.js "head checkout does not rely on clean false"

## Test Requirement
- [x] TR-1 [behavior] Given текст job с checkout в корень без предшествующего шага переноса, а также с `path: .` без него, а также с переносом, стоящим после checkout When на нём запускается та же функция проверки, что использует тест из AC-3 Then она сообщает нарушение во всех трёх случаях; для checkout с `path: trusted` без переноса нарушения нет. Verify: scripts/verifier-eval.spec.js "detects root checkout without golden move"

## Definition of Done
- [ ] DOD-1 [ci] Проверка скриптов на голове PR успешна. Verify: ci "Test (scripts)"

## Manual verification (owner, not gated)
- После мержа запустить `Acceptance Verifier Eval` через `workflow_dispatch`: `Prepare inputs` проходит для кейсов 434, 446, 463 и `Summarize` формирует таблицу. Тесты выше проверяют только текст workflow; работу самого checkout и то, что `golden-src` не виден модели, доказывает только этот запуск.

## Dependencies
Нет. Заменяет неработающее исправление #645 (PR #646).

---
Создано отдельно, без плана: ad-hoc issue по итогам второго запуска Acceptance Verifier Eval.
