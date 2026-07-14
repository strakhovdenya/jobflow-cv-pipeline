# Current Task

## Status

Active: TASK-PH-012 — Raise TypeScript compiler strictness incrementally.

## Docs to Read

- `docs/07_task_backlog.md` §17.2 — TASK-PH-012 (context, files affected,
  acceptance criteria, test requirement, done definition)
- `tsconfig.json` — current disabled flags

## Scope Decision

- Five flags enabled one at a time, each its own commit, cheapest/lowest
  risk first: `forceConsistentCasingInFileNames` →
  `noFallthroughCasesInSwitch` → `strictBindCallApply` → `noImplicitAny` →
  `strictNullChecks`.
- After each flag: `npx tsc --noEmit` must be clean before moving to the
  next flag; fix real errors properly (correct types, proper null
  narrowing) — no `any`/non-null assertion (`!`) unless individually
  justified with a one-line comment.
- `npm run test` must pass after each step. This is a type-safety task,
  not a behavior change — if a fix would change runtime behavior, stop
  and flag it rather than proceeding silently.
- Final state: all five flags explicitly `true` in `tsconfig.json` (not
  merely removed).
- One PR at the end covering all five commits (not five separate PRs) —
  matches "final state: all five flags enabled" as the acceptance unit.

## Key Invariants

- Flags must be explicitly present and `true`, not removed (removing
  would silently fall back to ambiguous defaults).
- No behavior changes hidden inside type fixes.

## Acceptance Criteria

- [ ] `forceConsistentCasingInFileNames: true` — tsc clean, tests green,
      committed.
- [ ] `noFallthroughCasesInSwitch: true` — tsc clean, tests green,
      committed.
- [ ] `strictBindCallApply: true` — tsc clean, tests green, committed.
- [ ] `noImplicitAny: true` — tsc clean, tests green, committed.
- [ ] `strictNullChecks: true` — tsc clean, tests green, committed.
- [ ] All five flags explicitly `true` in final `tsconfig.json`.
- [ ] `npm run test` passes after the full sequence.

## Git Instructions

1. `git add <files>`
2. `git commit -m "fix: TASK-PH-012 ..."` (one commit per flag)
3. `git push -u origin task/TASK-PH-012-typescript-strictness`
4. `gh pr create --title "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
