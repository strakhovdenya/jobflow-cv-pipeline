# Ralph/scripts: hook path-case bug and doc/config drift after ADR-035

## Контекст
Мелкие расхождения вокруг Ральфа и хуков, плюс по ходу работы найден пропуск процесса: `gh issue create`/`gh issue edit` выполнялись без загруженного скилла `issues`, поэтому issue оставались в устаревшем формате и красили верификатор в `UNVERIFIABLE`. Гейт на это добавляется в тот же хук, что уже проверяет `task-lifecycle` перед commit/push.
- `scripts/lint-hook.js`, `typecheck-hook.js`: `startsWith(appRoot + path.sep)` чувствителен к регистру; на Windows `d:\` против `D:\` хук молча не срабатывает.
- `scripts/git-closure-gate-hook.js` всё ещё говорил про «TEST_LOG.md entry added» (ADR-035 заменил это комментарием в issue).
- `.claude/ralph/README.md` описывал `appendTestLogEntry()`, который заменён `postTestEvidenceComment` (ADR-035).
- `scripts/task-archive-sync-hook.js` — задокументированный no-op, но запускался на каждый Bash.
- `config.example.json` устарел (закрытые issues).
- В README не отражены: второй code-review проход, tracker #334, грант `Agent`, root `npm install --ignore-scripts` + setup-metaskills.
- Новое: хук блокирует `gh issue create` / `gh issue edit`, пока в сессии не загружен скилл `issues`.

## Affects
`scripts/lint-hook.js`, `scripts/typecheck-hook.js`, `scripts/git-closure-gate-hook.js`, `scripts/git-closure-gate-hook.spec.js`, `scripts/task-archive-sync-hook.js` (удаление), `.claude/settings.json`, `.claude/ralph/README.md`, `.claude/ralph/config.example.json`, `CLAUDE.md` (Claude Code Configuration: описание хуков), `.claude/skills/issues/SKILL.md` (правила проверяемости: PR body/комментарии и критерии-отсутствия), `scripts/acceptance-verdict.js`, `scripts/acceptance-verdict.spec.js`, `.github/workflows/acceptance-verifier.yml` (шаг Check references получает `--issue`), `project-management/DECISIONS.md` (поправка ADR-041), `.claude/skills/task-lifecycle/SKILL.md` (шаг Issue first: сверить формат issue со скиллом `issues`, привести устаревший формат в порядок до старта)

## Docs to Read
ADR-030, ADR-035, ADR-041 (поправка ISSUE-441); корневой `CLAUDE.md` (Claude Code Configuration); `.claude/skills/issues/SKILL.md` («Проверяемость пунктов»).

## Key Invariants
Хуки не должны падать и не должны блокировать Bash сверх заявленного. Гейт скилла `issues` срабатывает только на `gh issue create` и `gh issue edit` в начале сегмента команды (не на `gh issue comment`/`view`/`list` и не на текст внутри `echo`), по тому же правилу, что и гейт commit/push.

## Acceptance Criteria
- [x] `scripts/lint-hook.js` и `scripts/typecheck-hook.js` определяют app через `path.relative`, а не `startsWith` (регистр буквы диска и разделители на Windows не влияют)
- [x] В `scripts/git-closure-gate-hook.js` нет упоминаний `TEST_LOG.md`
- [x] `.claude/ralph/README.md` не содержит `appendTestLogEntry`; `.claude/ralph/config.example.json` не содержит номеров закрытых issue 215, 282, 287
- [x] `scripts/task-archive-sync-hook.js` удалён, `.claude/settings.json` на него не ссылается
- [x] `scripts/git-closure-gate-hook.js` блокирует (exit 2, сообщение упоминает `issues`) `gh issue create` и `gh issue edit`, пока в маркере сессии нет скилла `issues`; с загруженным `issues` пропускает без вывода
- [x] Гейт не срабатывает на `gh issue comment`, `gh issue view`, `gh issue list` и на `echo` с текстом `gh issue edit`; срабатывает на `cd x && gh issue edit 1` и `FOO=1 gh issue create`
- [x] Эти случаи покрыты автотестами в `scripts/git-closure-gate-hook.spec.js` (выполняются `npm run test:scripts`, CI-check `Test (scripts)`)
- [x] `.claude/skills/task-lifecycle/SKILL.md` в шаге «Issue first» требует сверить тело issue с форматом скилла `issues` и предложить привести его в порядок, если формат устарел
- [x] `.claude/skills/issues/SKILL.md` в разделе «Проверяемость пунктов» называет содержимое тела PR и комментариев непроверяемым, а в правиле про перенос/удаление говорит, что пояснительные упоминания совпадают с критерием-отсутствием
- [x] `scripts/acceptance-verdict.js --check-refs` с `--issue <file>` добавляет в refs-problems проблему «report covers N of M issue items», если записей в отчёте меньше, чем пунктов верхнего уровня в Acceptance Criteria, Definition of Done и Test Requirement (прозаический Test Requirement = 1); нечитаемый файл issue тоже проблема; покрыто тестами в `scripts/acceptance-verdict.spec.js`
- [x] Проблема «quote not found on that line» содержит саму отклонённую цитату; покрыто тестом в `scripts/acceptance-verdict.spec.js`
- [x] `.github/workflows/acceptance-verifier.yml` передаёт `--issue .verifier/issue.md` в шаг Check references; `project-management/DECISIONS.md` содержит поправку ADR-041 про ISSUE-400

## Test Requirement
Автотесты в `scripts/git-closure-gate-hook.spec.js` и `scripts/acceptance-verdict.spec.js`, CI-check `Test (scripts)`.

## Definition of Done
- [x] Acceptance Criteria выше выполнены
- [ ] CI-checks `Test (scripts)` и `Lint` зелёные

## Manual verification (owner, not gated)
- Решение по `task-archive-sync-hook.js` (удалить, а не оставить) записано в теле PR #463.
- Комментарий с тест-эвидленсом (команды и результат) на этом issue (ADR-035).
- `node --check` для изменённых `.js`; прогон гейта на синтетическом вводе.

## Dependencies
Нет.

---
Создано как отдельная задача (без плана/PRD). Источник: ревью 2026-09-23; расширено 2026-09-25 после пропуска скилла `issues` при работе над этой же задачей.






