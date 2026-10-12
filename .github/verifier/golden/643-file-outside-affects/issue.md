# Golden eval: mutation.patch поверх head_sha, пересборка входов, замороженные фикстуры approval и исключений

## Контекст
Проблема: golden eval верификатора (`.github/verifier/golden/`, `.github/workflows/acceptance-verifier-eval.yml`, ADR-042 амендмент ISSUE-483) — ручной прогон текущего промпта и схемы Acceptance Verifier на прошлых PR по замороженным входам с известным правильным вердиктом. Сейчас в нём 3 кейса, и все `expected: FAIL`. Кейс обязан ссылаться на `head_sha`, достижимый из `main`, поэтому намеренно испорченную версию корректного PR положить некуда: такого коммита в истории нет. Кроме того, eval не передаёт скрипту вердикта approval спеки и авторизованные исключения (`manual-verified`, `test-removal-approved`). Для issue в формате контракта v2 (пункты с ID `AC-n`, ADR-042) верификатор требует approval — хэш тела, зафиксированный лейблом `spec-approved` (амендмент ISSUE-474); без фикстуры approval eval не может воспроизвести ни `spec not approved`, ни `spec changed after approval`, а если бы всегда передавал `--approval` без файла, каждый кейс падал бы по посторонней причине «spec approval was not checked».

Почему важно: без корректных PR с ожидаемым PASS и их испорченных пар eval не видит ложный FAIL (излишнюю строгость верификатора), а ложный PASS видит только на трёх старых дефектах. Любая правка промпта или схемы верификатора проверяется на половине ошибок. Мутация — единственный способ получить заведомо дефектный код на базе реального корректного PR.

После задачи: каталог golden-кейса может содержать `mutation.patch`. Скрипт `scripts/golden-mutation.js` накладывает патч на выписанный `head_sha`, строит diff от `base_sha` до результирующего дерева и список файлов (включая добавленные патчем) и пишет метаданные: исходный `head_sha`, sha256 патча и хэш результирующего дерева. Синтетический кейс не выдаётся за реальный коммит. Eval-workflow после мутации заново считает scope, tampering scan и lint спеки. CI, approval, исключения и версии политики берутся из фикстур кейса, а не из текущего API. Патч, который не накладывается, и неконсистентный пакет дают `run failure`. Протокол описан в `.github/verifier/golden/README.md`, решение — амендментом ADR-042.

Граница: проверка ожидаемой причины FAIL — #571; подбор и добавление самих пар кейсов — #572. Eval не заявляет, что CI сам поймал бы мутацию: CI здесь замороженная фикстура.

## Affects
- `scripts/golden-mutation.js` (новый)
- `scripts/golden-mutation.spec.js` (новый)
- `.github/workflows/acceptance-verifier-eval.yml` (наложение патча, пересборка входов, передача фикстур approval и исключений)
- `scripts/verifier-eval.spec.js` (проверки конфигурации eval-workflow по тексту YAML)
- `.github/verifier/golden/README.md` (протокол мутационных кейсов и фикстур)
- `project-management/DECISIONS.md` (амендмент ADR-042 к ISSUE-483)

## Docs to Read
- `project-management/prd/PRD-verifier-calibration-and-root-cause-analysis.md` — «В скоупе» D, «Технические ограничения» (патч без конфликтов)
- `.github/workflows/acceptance-verifier-eval.yml` — шаг `Prepare inputs` (diff, tampering scan, scope, provenance) и job `summarize` (аргументы скрипта вердикта)
- `.github/verifier/golden/README.md` — текущий формат кейса и заморозка `ci.json`
- `scripts/verifier-eval.js` — подсчёт run failures
- `project-management/DECISIONS.md` — ADR-042 амендмент ISSUE-483 (golden set), ISSUE-474 (approval), ISSUE-473/535 (авторизация лейблов)

## Key Invariants
- INV-1 Код из `head_sha` и из мутации никогда не исполняется: патч накладывается на выписанное как данные дерево (`git apply`), и ни один шаг не запускает скрипты, тесты или `npm` из этого дерева.
- INV-2 `scripts/golden-mutation.js` вызывает `git` только через `execFileSync`/`spawnSync` с массивом аргументов, без shell и без интерполяции путей или SHA в строку команды.
- INV-3 Метаданные мутационного кейса хранят исходный `head_sha` отдельно от хэша результирующего дерева; `provenance.json` кейса не подменяет `head_sha` хэшем дерева и не выдаёт синтетическое дерево за коммит.
- INV-4 CI, approval спеки и авторизованные исключения в eval берутся только из файлов кейса; шаги eval не читают для них текущий API GitHub. Prompt, схема, `allowed-models` и версия Codex берутся из текущего pin на default-ветке: eval проверяет именно его, и это не данные кейса.
- INV-5 Кейсы без `mutation.patch` обрабатываются как прежде: их diff, список файлов и вердикт на тех же входах не меняются.
- INV-6 Никаких литералов проекта в коде фабрики: `scripts/golden-mutation.js` не содержит путей приложений, имён CI-проверок, логинов, имён моделей и номеров ADR.
- INV-7 Из ревью черновика (research-агент) сознательно отклонены: отдельные пункты на сбой пересборки tampering scan или scope после мутации (их скрипты уже fail closed, и скрипт вердикта даёт FAIL с видимой причиной) и на отсутствующую фикстуру approval (без `approval.json` eval не передаёт `--approval`, как и скрипт вердикта без этого аргумента: проверка approval не применяется, и существующие кейсы сохраняют вердикты; кейс, которому нужна проверка approval, содержит `approval.json`).
- INV-8 Путь к каталогу golden-кейсов в `acceptance-verifier-eval.yml` определён один раз как переменная `GOLDEN_DIR` в top-level `env`; все места, читающие файлы кейсов (поиск кейсов, checkout кейсов, чтение `case.json`, подготовка входов, `summarize`, аргумент `scripts/verifier-eval.js`), ссылаются на `GOLDEN_DIR`. Причина: при выносе фабрики в пакет значение станет входом reusable workflow, и менять нужно будет одно место.

## Acceptance Criteria
- [ ] AC-1 [behavior] На временном git-репозитории скрипт накладывает патч на `head_sha` и пишет diff от `base_sha` до результирующего дерева, который содержит изменения патча. Verify: scripts/golden-mutation.spec.js "applies patch and rebuilds diff from base"
- [ ] AC-2 [behavior] Given патч добавляет, удаляет и переименовывает файлы When строится список файлов Then они есть в списке со статусами `A`, `D` и `R` соответственно, а добавленное содержимое — в diff. Verify: scripts/golden-mutation.spec.js "lists files added by the patch"
- [ ] AC-3 [behavior] Given патч конфликтует с `head_sha` When скрипт его накладывает Then он завершается ненулевым кодом, пишет причину `run failure` и не оставляет diff или список файлов. Verify: scripts/golden-mutation.spec.js "reports conflicting patch as run failure"
- [ ] AC-4 [behavior] Метаданные содержат исходный `head_sha`, sha256 файла патча и хэш результирующего дерева, и хэш дерева отличается от `head_sha`. Verify: scripts/golden-mutation.spec.js "records head sha patch hash and tree hash separately"
- [ ] AC-5 [behavior] Given `mutation.patch` пустой или не является unified diff When скрипт запускается Then результат — `run failure`, а не кейс без мутации. Verify: scripts/golden-mutation.spec.js "rejects empty or malformed patch"
- [ ] AC-6 [behavior] Workflow eval вызывает `scripts/golden-mutation.js` только для кейсов с `mutation.patch` и после него пересчитывает tampering scan, scope и lint спеки по новым diff и списку файлов. Verify: scripts/verifier-eval.spec.js "eval workflow rebuilds code dependent inputs after mutation"
- [ ] AC-7 [behavior] Job `summarize` передаёт скрипту вердикта `--approval` из файла кейса и флаги исключений из фикстуры кейса и не вызывает `gh api` для этих данных. Verify: scripts/verifier-eval.spec.js "eval passes frozen approval and exceptions"
- [ ] AC-8 [doc] README описывает `mutation.patch`, фикстуры approval и исключений, метаданные мутации, правило `run failure` при конфликте и то, что CI в eval — замороженная фикстура, а не запуск мутированного кода. Verify: .github/verifier/golden/README.md
- [ ] AC-9 [doc] ADR-042 содержит амендмент к ISSUE-483 о мутационных кейсах и замороженных фикстурах с отвергнутыми альтернативами. Verify: project-management/DECISIONS.md
- [ ] AC-10 [behavior] Given текст `acceptance-verifier-eval.yml` без строк-комментариев When в нём ищется подстрока `verifier/golden` Then она встречается ровно один раз — в определении `GOLDEN_DIR` в top-level `env`. Verify: scripts/verifier-eval.spec.js "eval workflow defines golden directory once"
- [ ] AC-11 [behavior] Given каждое место workflow, читающее файлы кейсов (поиск кейсов, checkout кейсов, чтение `case.json` в обоих job, подготовка входов, `summarize`) When проверяется его текст Then оно ссылается на `GOLDEN_DIR` (`env.GOLDEN_DIR` или `$GOLDEN_DIR`), а не на собранный из частей путь. Verify: scripts/verifier-eval.spec.js "eval workflow steps reference GOLDEN_DIR"

## Test Requirement
- [ ] TR-1 [behavior] Given кейс без `mutation.patch` When eval готовит входы Then diff и список файлов совпадают с `git diff base...head` так же, как до задачи. Verify: scripts/golden-mutation.spec.js "leaves cases without mutation unchanged"

## Definition of Done
- [ ] DOD-1 [ci] Проверка скриптов на голове PR успешна. Verify: ci "Test (scripts)"

## Dependencies
Нет. Фаза не зависит от Фаз 1–2.

---
Сгенерировано из `project-management/plan/PLAN-verifier-calibration-and-root-cause-analysis.md` (PRD: `project-management/prd/PRD-verifier-calibration-and-root-cause-analysis.md`).


