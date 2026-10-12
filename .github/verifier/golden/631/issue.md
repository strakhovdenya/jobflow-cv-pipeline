# Calibration Judge: запуск только при FAIL/NEEDS_HUMAN и лейбле calibrate (Issue или PR), в том числе при лейбле после верификатора

## Контекст
Проблема: Calibration Judge (платный advisory-разбор первопричины вердикта Acceptance Verifier, ADR-044) в `.github/workflows/calibration-judge.yml` запускается на `workflow_run` после каждого завершённого круга верификатора на любой PR из ветки `task/ISSUE-*`. Фильтров по вердикту или по желанию владельца нет: PASS-круги разбираются так же, как FAIL, и каждая задача тратит вызовы модели. Включить Judge только на нужной задаче можно лишь вручную через `workflow_dispatch`.

Почему важно: Judge нужен для калибровки верификатора, а не для каждой задачи. Круги с PASS почти ничего не дают калибровке, а стоимость растёт с числом PR и кругов. Владельцу нужен выбор задач и круг-за-кругом автоматика только там, где он её включил.

После задачи: Judge запускается только если верификатор вернул FAIL или NEEDS_HUMAN и при этом владелец поставил лейбл `calibrate` на Issue задачи или на её PR (лейбл — это пометка «разбирать эту задачу»; ставится только владельцем из `.github/verifier/owners.json`, авторство проверяется так же, как у `manual-verified`). Judge никогда не стартует раньше, чем верификатор закончил круг. Путь 1: лейбл уже стоит, когда верификатор закончил, и Judge стартует автоматически; пока лейбл стоит, каждый следующий круг после нового коммита разбирается так же. Путь 2: лейбл поставлен позже, во время работы над PR; тогда по событию постановки лейбла проверяется, что верификатор уже закончил круг на текущей голове PR, и Judge запускается для этого круга; если круг ещё идёт, ничего не запускается, а Judge стартует сам по пути 1, когда круг закончится. Ручной `workflow_dispatch` по номеру PR работает как раньше, без этих условий.

Граница: разбор самого круга, таксономия, промпты и публикация комментария не меняются. Верификатор (`acceptance-verifier.yml`, промпт, схема, скрипты вердикта) не меняется. Включение модели Judge — #579, документация калибровки в `docs/12` — #578.

## Affects
- `.github/workflows/calibration-judge.yml`
- `scripts/calibration-judge/trigger.js`
- `scripts/calibration-judge/trigger.spec.js`
- `scripts/calibration-judge.js`
- `scripts/calibration-judge.spec.js`
- `scripts/calibration-judge/workflow.spec.js`
- `project-management/DECISIONS.md`

## Docs to Read
- `project-management/DECISIONS.md` — ADR-044 (Calibration Judge, пункты 1, 3, 6), ADR-042 амендмент ISSUE-473 (авторство лейблов)
- `.github/workflows/calibration-judge.yml` — job `collect`: шаги `Resolve round` и `Identify pull request`
- `scripts/label-authority.js` — `authorizeLabel`, `isLabelPresent`
- `.claude/skills/adr/SKILL.md` — процедура амендмента ADR

## Key Invariants
- INV-1 Решение «запускать или нет» принимается в `scripts/calibration-judge/trigger.js`; workflow только передаёт ему данные и действует по его ответу. Сборка входов, две стадии модели, сборка и публикация разбора не меняются.
- INV-2 Авторство лейбла проверяется существующим `authorizeLabel` из `scripts/label-authority.js` по trusted `.github/verifier/owners.json`; второй реализации проверки нет.
- INV-3 Имя лейбла задаётся только в workflow; скрипты получают его аргументом.
- INV-4 Judge остаётся advisory (ADR-044 п. 1): права `statuses: write` не добавляются, вердикт, статус и комментарий верификатора не меняются.
- INV-5 `.github/workflows/acceptance-verifier.yml`, `.github/verifier/prompt.md`, `.github/verifier/schema.json` и `scripts/acceptance-verdict/` не меняются.
- INV-6 **Resolved decision (do not re-litigate/ask):** условие запуска — вердикт круга FAIL или NEEDS_HUMAN И лейбл на Issue ИЛИ на PR. Отвергнуто: «любое из трёх» (почти не ограничивает запуски) и «все три сразу» (два лейбла на одну цель).
- INV-7 **Resolved decision (do not re-litigate/ask):** один лейбл `calibrate`, и на Issue, и на PR. Отвергнуто: два разных лейбла.
- INV-8 **Resolved decision (do not re-litigate/ask):** запуск при постановке лейбла уже после верификатора идёт событиями `labeled` (`pull_request_target` для PR, `issues` для Issue); workflow берётся из default-ветки, код PR не исполняется, PR-голова остаётся только данными, как сейчас. Это исключение из запрета `pull_request_target` в ADR-044 п. 3 и оформляется амендментом. Отвергнуто: только лейбл на Issue (лейбл на PR не давал бы немедленного запуска).

- INV-9 Из ревью черновика сознательно отклонено: замечание о расхождении текста AC-4 и теста (AC-4 уже говорит о FAIL без лейбла; PASS проверяет AC-3) и предложение переносить авторизацию из `label-authority.js` в Judge (общий модуль уже обслуживает три лейбла, и Judge только вызывает его, не меняя).

## Acceptance Criteria
- [x] AC-1 [behavior] Given вердикт круга FAIL и лейбл от владельца на Issue When проверяется запуск Then Judge запускается. Verify: scripts/calibration-judge/trigger.spec.js "runs on FAIL when owner labeled the issue"
- [x] AC-2 [behavior] Given вердикт круга NEEDS_HUMAN и лейбл от владельца на PR When проверяется запуск Then Judge запускается. Verify: scripts/calibration-judge/trigger.spec.js "runs on NEEDS_HUMAN when owner labeled the pull request"
- [x] AC-3 [behavior] Given вердикт круга PASS и лейбл от владельца When проверяется запуск Then Judge не запускается. Verify: scripts/calibration-judge/trigger.spec.js "skips PASS even with owner label"
- [x] AC-4 [behavior] Given вердикт FAIL и лейбла нет ни на Issue, ни на PR When проверяется запуск Then Judge не запускается. Verify: scripts/calibration-judge/trigger.spec.js "skips FAIL without label"
- [x] AC-5 [behavior] Given лейбл поставлен не владельцем из owners.json или ботом When проверяется запуск Then лейбл не учитывается и Judge не запускается. Verify: scripts/calibration-judge/trigger.spec.js "ignores label set by non-owner or bot"
- [x] AC-6 [behavior] Given вердикт круга отсутствует или не равен PASS, FAIL, NEEDS_HUMAN When проверяется запуск Then Judge не запускается. Verify: scripts/calibration-judge/trigger.spec.js "skips when verdict is missing or unknown"
- [x] AC-7 [behavior] Given имя ветки `task/ISSUE-123-name` When определяется Issue задачи Then возвращается номер 123. Verify: scripts/calibration-judge/trigger.spec.js "extracts issue number from task branch"
- [x] AC-8 [behavior] Given ветка без номера Issue или с нечисловым номером When проверяется запуск Then учитывается только лейбл на PR, ошибки нет. Verify: scripts/calibration-judge/trigger.spec.js "branch without issue number leaves only pull request label"
- [x] AC-9 [behavior] Given лейбл поставлен владельцем после того, как верификатор закончил круг на текущей голове PR с вердиктом FAIL When приходит событие постановки лейбла Then Judge запускается для этого круга. Verify: scripts/calibration-judge/trigger.spec.js "runs on label added after the round finished"
- [x] AC-10 [behavior] Given лейбл поставлен, а круга верификатора на текущей голове PR ещё нет или он старше текущей головы When приходит событие постановки лейбла Then Judge не запускается. Verify: scripts/calibration-judge/trigger.spec.js "skips labeled event while verifier round is unfinished"
- [x] AC-11 [behavior] Given лейбл уже стоит и верификатор закончил круг на новом коммите с вердиктом FAIL When приходит завершение верификатора Then Judge запускается для нового круга. Verify: scripts/calibration-judge/trigger.spec.js "runs next round when label already present"
- [x] AC-12 [behavior] Given событие постановки лейбла с именем, отличным от заданного When проверяется запуск Then Judge не запускается. Verify: scripts/calibration-judge/trigger.spec.js "ignores label events for other labels"
- [x] AC-13 [behavior] Команда `check-trigger` печатает решение run или skip с причиной по файлам вердикта, таймлайнов и владельцев. Verify: scripts/calibration-judge.spec.js "check-trigger prints run or skip with reason"
- [x] AC-14 [behavior] Workflow не применяет условия запуска к ручному `workflow_dispatch`. Verify: scripts/calibration-judge/workflow.spec.js "manual dispatch bypasses trigger gate"
- [x] AC-15 [behavior] Workflow запускается на `workflow_run` верификатора и на события `labeled` для PR и для Issue. Verify: scripts/calibration-judge/workflow.spec.js "triggers on verifier completion and labeled events"
- [x] AC-16 [behavior] Job, обрабатывающий `labeled`-событие PR, извлекает исполняемые файлы (включая `scripts/label-authority.js` и `scripts/calibration-judge/`) только из default-ветки, а PR-голова остаётся данными. Verify: scripts/calibration-judge/workflow.spec.js "labeled path executes only default-branch files"
- [x] AC-17 [absence] В решающем модуле нет литерала имени лейбла. Verify: absent "calibrate" in scripts/calibration-judge/trigger.js
- [x] AC-18 [doc] ADR-044 содержит амендмент про условия запуска Judge и событие `labeled`. Verify: project-management/DECISIONS.md

- [x] AC-19 [behavior] Given вердикт NEEDS_HUMAN и лейбла нет ни на Issue, ни на PR When проверяется запуск Then Judge не запускается. Verify: scripts/calibration-judge/trigger.spec.js "skips NEEDS_HUMAN without label"
- [x] AC-20 [behavior] Given лейбл от владельца стоит и на Issue, и на PR When проверяется запуск Then решение одно: run. Verify: scripts/calibration-judge/trigger.spec.js "runs once when both issue and pull request are labeled"
- [x] AC-21 [behavior] Решающая функция берёт имя лейбла из переданного аргумента: лейбл с другим именем не учитывается, пока имя не передано. Verify: scripts/calibration-judge/trigger.spec.js "uses label name given by caller"
- [x] AC-22 [absence] В workflow Judge нет права записи статусов. Verify: absent "statuses: write" in .github/workflows/calibration-judge.yml

## Test Requirement
- [x] TR-1 [behavior] Given нечитаемый или некорректный файл таймлайна When `check-trigger` проверяет запуск Then команда отвечает skip и не падает с исключением. Verify: scripts/calibration-judge.spec.js "check-trigger fails closed on unreadable timeline"
- [x] TR-2 [behavior] Given лейбл снят после постановки владельцем When проверяется запуск Then лейбл не учитывается. Verify: scripts/calibration-judge/trigger.spec.js "skips when label was removed"

## Definition of Done
- [ ] DOD-1 [ci] Проверка скриптов на голове PR успешна. Verify: ci "Test (scripts)"

## Manual verification (owner, not gated)
Владелец создаёт лейбл `calibrate` в репозитории, ставит его на тестовый PR после завершения верификатора и смотрит, что Judge стартовал для последнего круга; затем пушит новый коммит и проверяет, что следующий круг разобран автоматически.

## Dependencies
Фазы 1–4 EPIC-31; #579 включает модель Judge и нужен для реального запуска.

---
Создано отдельно, без плана и PRD (ad-hoc), по запросу владельца.

