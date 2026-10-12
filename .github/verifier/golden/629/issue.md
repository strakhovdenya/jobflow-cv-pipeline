# API: strip user-forced markers from AI output when the workspace has no matching manual note

## Контекст
Проблема: по ADR-034 контент из manual note (заметка владельца, которую пайплайн обязан учесть, даже без подтверждающего evidence) помечается в JSON-ответе модели Prompt 2 (CV-черновик) как `user_forced: true` у bullet, статус `"user-forced, unverified"` в статусе записи `evidence_table` и запись в `manual_note_forced_claims`. `EvidenceGuardService` (`apps/api/src/evidence/evidence-guard.service.ts`, `collectNeedsEvidence`/`collectForcedSignals`) доверяет этим меткам из ответа модели и не знает о заметках workspace; `Prompt2Service` вызывает `checkOutput(validation.data, evidenceItems)` без заметок, хотя `manualNotes` у него уже загружены. Метку может поставить модель сама (галлюцинация или текст вакансии), и тогда непроверенное утверждение пропускается мимо `needs_evidence` (список непроверенных утверждений в `overclaiming_check`) и показывается человеку как «forced пользователем».

Почему важно: если модель сама поставит метку на утверждение из текста вакансии (например, «5 лет AWS»), оно попадёт в CV как заявленное пользователем и не будет помечено как требующее evidence. Это дыра в защите от overclaiming (корневой `CLAUDE.md`, «Anti-Overclaiming Rules»): единственное исключение из неё должно быть продиктовано реальной заметкой, а не ответом модели. Находка P2-004 аудита 2026-09-24 (`project-management/audit-2026-09-24/TRIAGE.md`).

После задачи: Prompt 2 перед сохранением сверяет forced-метки с заметками workspace. Метка без соответствующей заметки (или при отсутствии заметок) снимается, и утверждение проходит обычную проверку `needs_evidence`. Метка, подкреплённая заметкой, остаётся и по-прежнему видна человеку до экспорта. Правило записано амендментом ADR-034.

Граница: разделители вакансии из #426 не затрагиваются; Prompt 3 и экспорт не меняются (Prompt 3 по-прежнему пропускает bullet с `user_forced: true`, но теперь такой флаг остаётся только после проверки). Regenerate проходит тот же путь Prompt 2, отдельной логики для него нет. Prompt 1, skip-reason и cover letter не меняются: в их коде нет гейта, зависящего от forced-меток (метки есть только в схемах ответа), смежных задач нет.

## Affects
- `apps/api/src/evidence/evidence-guard.service.ts`
- `apps/api/src/evidence/evidence-guard.service.spec.ts`
- `apps/api/src/pipeline/prompt2/prompt2.service.ts`
- `apps/api/src/pipeline/prompt2/prompt2.service.spec.ts`
- `project-management/DECISIONS.md`

## Docs to Read
- `project-management/DECISIONS.md` — ADR-033 и ADR-034
- `CLAUDE.md` — раздел «Anti-Overclaiming Rules»

## Key Invariants
- INV-1 **Resolved decision (do not re-litigate/ask):** forced-метка сохраняется, только если у workspace есть хотя бы одна manual note и текст forced-утверждения содержит (без учёта регистра и пробелов) фрагмент какой-то заметки или заметка содержит его ключевую формулировку; иначе метка снимается и утверждение проходит обычную проверку `needs_evidence`. Отвергнутая альтернатива: доверять метке модели.
- INV-2 Заметки в `EvidenceGuardService` приходят параметром `checkOutput`; сервис не обращается к Prisma, а `Prompt2Service` передаёт ему уже загруженный список `manualNotes`.
- INV-5 «Совпадение» в INV-1 означает вхождение более короткой из двух нормализованных строк (утверждение или заметка) в более длинную как целого слова или фразы, в любую сторону, после приведения к нижнему регистру и схлопывания пробелов. Границы слов: символ перед и после вхождения не буква, не цифра и не подчёркивание (Unicode). Более короткая строка должна быть не короче 3 символов; пустая строка не совпадает ни с чем.
- INV-3 Снятие меток выполняется до записи артефактов `02_targeted_cv_content.md/json`, чтобы оба файла содержали очищенный результат.
- INV-4 Изменение не добавляет в Prompt 1, skip-reason и cover letter зависимость от `EvidenceGuardService`.

## Acceptance Criteria
- [ ] AC-1 [behavior] Given workspace без manual notes When ответ модели содержит `user_forced: true` и запись в `manual_note_forced_claims` Then после обработки в записанном `02_targeted_cv_content.json` нет `user_forced: true`, записей `"user-forced, unverified"` и `manual_note_forced_claims`, а утверждение попадает в `needs_evidence`. Verify: apps/api/src/pipeline/prompt2/prompt2.service.spec.ts "strips forced markers and flags needs_evidence when workspace has no manual notes"
- [ ] AC-2 [behavior] Given заметка, текст которой совпадает с forced-утверждением When выполняется проверка Then метка сохраняется и `needs_evidence` не пополняется. Verify: apps/api/src/evidence/evidence-guard.service.spec.ts "keeps forced marker when a manual note matches the claim"
- [ ] AC-3 [behavior] Given заметка есть, но forced-утверждение ей не соответствует When выполняется проверка Then метка снимается и утверждение попадает в `needs_evidence`. Verify: apps/api/src/evidence/evidence-guard.service.spec.ts "strips forced marker when no manual note matches the claim"
- [ ] AC-4 [behavior] Prompt2Service передаёт загруженные manual notes в проверку и записывает `02_targeted_cv_content.md` и `.json` уже с очищенными метками; вызов проверки получает именно загруженные заметки, не пустой список. Verify: apps/api/src/pipeline/prompt2/prompt2.service.spec.ts "passes manual notes to the evidence guard and writes sanitized output"
- [ ] AC-5 [doc] ADR-034 дополнен правилом проверки forced-меток по заметкам workspace. Verify: project-management/DECISIONS.md

## Test Requirement
- [ ] TR-1 [behavior] Given forced-утверждение отличается от текста заметки только регистром и пробелами When выполняется проверка Then метка сохраняется. Verify: apps/api/src/evidence/evidence-guard.service.spec.ts "matches manual note ignoring case and whitespace"
- [ ] TR-2 [behavior] Given заметка содержит ключевую формулировку, а forced-утверждение шире неё When выполняется проверка Then метка сохраняется. Verify: apps/api/src/evidence/evidence-guard.service.spec.ts "keeps forced marker when the note contains the claim key phrase"
- [ ] TR-3 [behavior] Given forced-утверждение пустое When выполняется проверка Then оно не считается совпавшим ни с одной заметкой и метка снимается. Verify: apps/api/src/evidence/evidence-guard.service.spec.ts "never matches an empty forced claim"
- [ ] TR-4 [behavior] Given заметка короче 3 символов или входит в утверждение только внутри другого слова (например, заметка `go` и утверждение про MongoDB) When выполняется проверка Then метка снимается и утверждение попадает в `needs_evidence`. Verify: apps/api/src/evidence/evidence-guard.service.spec.ts "does not let a short note or a mid-word fragment back a claim"

## Definition of Done
- [ ] DOD-1 [ci] Проверка Lint на голове PR успешна. Verify: ci "Lint"
- [ ] DOD-2 [ci] Проверка Typecheck на голове PR успешна. Verify: ci "Typecheck"
- [ ] DOD-3 [ci] Проверка Test (apps/api) на голове PR успешна. Verify: ci "Test (apps/api)"
- [ ] DOD-4 [ci] Проверка Analyze (javascript-typescript) на голове PR успешна. Verify: ci "Analyze (javascript-typescript)"

## Dependencies
Нет (дополняет #426).

---
Создано как отдельная задача (без плана/PRD) по итогам аудита 2026-09-24.

