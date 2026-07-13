# Current Task

## Status

Active task: TASK-PH-014 — Fix CodeQL code-scanning findings (path-injection
guard, ReDoS/length hardening).

## Docs to Read

- `docs/07_task_backlog.md` §17.2 — TASK-PH-014 (context, files affected,
  acceptance criteria, test requirement, done definition)
- `src/artifacts/artifact-storage.service.ts` — full file; `writeFile()`
  (already calls `assertInsideStorageRoot()`) vs `saveVacancySource()`
  (does not) — the pattern to mirror
- `src/workspaces/dto/create-workspace.dto.ts` — full file; fields to add
  `@MaxLength` to

## Investigation (done before implementation)

- GitHub code-scanning API (`gh api repos/.../code-scanning/alerts`) shows
  4 open high-severity alerts, all pre-dating this task (found during a
  routine post-merge check, not introduced by this task):
  - 2x `js/path-injection` in `artifact-storage.service.ts`: line 24
    (`createWorkspaceFolder`) is already guarded by
    `assertInsideStorageRoot()` on the line above — likely a CodeQL false
    positive (custom guard not recognized as a sanitizer). Line 33
    (`saveVacancySource`) has no guard at all — a real gap, though not
    currently exploitable since the only call site
    (`workspaces.service.ts`) always passes an already-validated path.
  - 2x `js/polynomial-redos` in `slug.service.ts`: simple single-quantifier
    regexes (`/_+/g`, `/^_+|_+$/g`), not classic exponential ReDoS —
    likely overly cautious. Root cause worth fixing regardless:
    `companyNameOriginal`/`roleTitleOriginal` have no `@MaxLength` in the
    DTO, so input length is technically unbounded.

## Scope Decision

- Fix the real gap: add `assertInsideStorageRoot()` guard to
  `saveVacancySource`, mirroring `writeFile()`.
- Do not add a redundant guard to `createWorkspaceFolder` — it's already
  guarded; that alert may remain open as a documented likely-false-positive.
- Add `@MaxLength(200)` to `companyNameOriginal` and `roleTitleOriginal` in
  `CreateWorkspaceDto` — addresses both the ReDoS alert and general input
  hygiene. Do not assume this auto-closes the CodeQL ReDoS alerts; record
  the actual outcome.
- User-confirmed 2026-07-13: proceed with implementation now.

## Key Invariants

- No behavior change for any existing valid input — defense-in-depth /
  input-hygiene fix only, not a feature change.
- Do not touch unrelated code.

## Acceptance Criteria

- [x] `saveVacancySource` calls `assertInsideStorageRoot(filePath)` before
      `fs.writeFile`.
- [x] `CreateWorkspaceDto.companyNameOriginal` and `roleTitleOriginal` have
      `@MaxLength(200)` with `@ApiProperty` updated to document the limit.
- [x] New unit test: `saveVacancySource` throws for a path outside
      `STORAGE_ROOT`.
- [x] New unit test: DTO validation rejects over-length
      `companyNameOriginal`/`roleTitleOriginal`.
- [x] `npm run test` (47/47 suites, 479/479 tests) and `npx tsc --noEmit`
      pass.
- [x] `project-management/TEST_LOG.md` updated.
- [ ] GitHub code-scanning alerts tab confirms `saveVacancySource`
      `js/path-injection` alert closed post-merge (user to confirm, same
      pattern as prior tasks).

## Git Instructions

1. `git add <files>`
2. `git commit -m "fix: TASK-PH-014 ..."`
3. `git push -u origin <branch-name>`
4. `gh pr create --title "..." --base main`
5. Stops completely. Does not do anything else.

Never call `gh pr create` before `git push` — it will always fail.
