# Current Task

## TASK-PH-019 — Fix binary-unsafe generic artifact download endpoint

User-selected 2026-07-14 (Phase PH-2 out-of-band addition — closes a gap logged during
TASK-047, not part of the original Phase 9/10 sequence).

## Status

DONE (closed 2026-07-14).

## Context

`ArtifactsController.download()` (`GET /artifacts/:id/download`) reads the target file with
`fs.readFile(resolvedFile, 'utf-8')` and sends it via `res.send(content)`. Reading a binary
file (PDF) as `utf-8` text corrupts it — invalid byte sequences get replaced/mangled during
decode, and `res.send()` then re-encodes the already-corrupted string back to bytes.

This was never triggered in practice before TASK-047 because the only PDF artifact the
pipeline itself produces (`04_cv_export.pdf`) has its own dedicated, binary-safe download
route: `GET /workspaces/:id/download-cv` in `document-export.controller.ts`, which correctly
uses `fs.readFile(resolvedFile)` with no encoding (returns a `Buffer`) followed by
`res.send(content)`. TASK-047 registers imported legacy CV PDFs and cover-letter PDFs as
plain `GeneratedArtifact` rows with no dedicated download route of their own — those *would*
hit the broken generic endpoint if downloaded, corrupting the file.

## Docs to Read

- `src/artifacts/artifacts.controller.ts` — full file, `download()` method — the method to
  fix (single-line change: drop the `'utf-8'` encoding argument to `fs.readFile`).
- `src/document-export/document-export.controller.ts` `downloadCv()` (around lines 36–88) —
  the already-correct binary-safe reference pattern to mirror exactly (`fs.readFile(path)`
  with no encoding, `res.send(buffer)`).
- `src/artifacts/artifacts.controller.spec.ts` — full file — existing `GET
  /artifacts/:id/download` test suite; the happy-path test currently mocks
  `fsMock.readFile.mockResolvedValue('vacancy text content' as any)` (a string) and asserts
  `res.send` was called with that same string — must be updated to mock/assert a `Buffer`
  instead, plus a new test proving binary content survives the round trip unchanged.
- `project-management/TASK_BOARD.md` "Known Gaps" section and the TASK-PH-019 board row —
  the gap description already written when this was discovered during TASK-047.

## Key Invariants

- This is a single-file production change (`artifacts.controller.ts`) plus its spec file —
  do not touch `document-export.controller.ts` (already correct) or `ArtifactsService`
  (no path/DB logic involved, this is purely how the file bytes are read and sent).
- `Content-Type`/`Content-Disposition` header logic is unaffected and must not change —
  only the encoding used to read the file body changes.
- The path-safety check (`resolvedFile` must start with `resolvedRoot`) and the 404/403
  error handling are unaffected and must not change.
- Existing tests that mock `fs.readFile` with a plain string must be updated to use a
  `Buffer` (e.g. `Buffer.from('vacancy text content', 'utf-8')`) so the mock accurately
  reflects the fixed method's real return type.

## Acceptance Criteria

- [x] `ArtifactsController.download()` reads the file via `fs.readFile(resolvedFile)` (no
      `'utf-8'` argument, returns `Buffer`) instead of `fs.readFile(resolvedFile, 'utf-8')`.
- [x] `res.send(content)` sends the `Buffer` directly (Express handles `Buffer` bodies
      natively — no further change needed there).
- [x] Existing `artifacts.controller.spec.ts` happy-path test updated to mock/assert a
      `Buffer` instead of a `string`.
- [x] New test proves binary content (e.g. non-UTF-8 byte sequence, such as a small fake
      "PDF-like" buffer with bytes that would corrupt under UTF-8 decode/re-encode) survives
      the download unchanged (`res.send` called with a `Buffer` deep-equal to the original).
- [x] `npm run test` all suites green (51/51, 523/523); `npx tsc --noEmit` clean;
      `npm run test:e2e` green (3/3 suites, 4/4 tests).
- [x] `TASK_BOARD.md` "Known Gaps" entry for this issue removed/resolved; TASK-PH-019 row
      status updated to `DONE`.
- [x] `project-management/TEST_LOG.md` has a dated entry with commands + results.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "fix: TASK-PH-019 ..."`
3. `git push -u origin task/TASK-PH-019-fix-binary-unsafe-artifact-download`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
