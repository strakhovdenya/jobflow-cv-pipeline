# Current Task

## TASK-047 — Implement import confirmation and artifact registration

User-selected 2026-07-14 (continues Phase 9 — Basic Existing Folder Import, following
TASK-046). Full task definition: `docs/07_task_backlog.md` § "TASK-047".

## Status

DONE (closed 2026-07-14).

## Context

TASK-045 (`scanRoot()`) and TASK-046 (`previewImport()`) are both fully read-only. This
task adds the final step: given a previewed folder, actually create the
`Company`/`JobVacancy`/`ApplicationWorkspace`/`GeneratedArtifact` database records so a
legacy application folder becomes a real workspace in the app.

Two Prisma fields exist specifically for this and are currently unused anywhere in the
codebase: `ApplicationWorkspace.sourceImportedPath` / `createdFrom`, and
`JobVacancy.originalImportedFileName` / `sourceFormat`.

## Docs to Read

- `docs/07_task_backlog.md` § "TASK-047" — Context, Acceptance criteria, Test requirement,
  Done definition.
- `src/import/import.service.ts` — full file (`previewImport()`, `scanDateFolder()`,
  `assertInsideImportRoot()` from TASK-046 — this task's `confirmImport()` reuses
  `previewImport()`'s result rather than re-deriving scan logic).
- `src/workspaces/workspaces.service.ts` lines 52–119 (`createWorkspace()`) — the manual
  workspace creation pattern (`workspaceSlug` format, folder creation, `Company`/
  `JobVacancy`/`ApplicationWorkspace` creation order, `artifactsService.register()` call)
  this task mirrors for the import path.
- `src/artifacts/artifact-storage.service.ts` — full file, especially
  `createWorkspaceFolder()`/`writeFile()`/`assertInsideStorageRoot()` — folder creation
  under `STORAGE_ROOT` and the private-method-per-service path-containment pattern this
  task's own `assertInsideImportRoot()` (TASK-046) already follows.
- `src/artifacts/artifacts.service.ts` — `RegisterArtifactDto`/`register()` — no path
  containment check happens here; `filePath`/`storageRoot` are trusted as given by the
  caller, which is what makes "register in place without copying" possible.
- `src/artifacts/artifacts.controller.ts` `download()` — confirms `storageRoot` is an
  **artifact-level** field (not a single global root) used for the download path-safety
  check, which is exactly what allows imported artifacts to be registered with
  `storageRoot: IMPORT_ROOT` when their files are left in place rather than copied.
- `prisma/schema.prisma` — `Company` (lines ~48–59), `JobVacancy` (~61–79, including
  `originalImportedFileName`/`sourceFormat`, currently unused), `ApplicationWorkspace`
  (~86–112, including `sourceImportedPath`/`createdFrom`), `GeneratedArtifact` (~211–231).
- `src/import/dto/import-preview.dto.ts` — `ImportPreviewResultDto`/`ImportDuplicateReason`
  (TASK-046) — this task's confirm DTO/flow builds directly on top of this.
- `src/import/dto/import-scan-result.dto.ts` — `ImportSuggestedStatus`/`LegacyArtifactType`
  enums — `ImportSuggestedStatus` values are reused 1:1 as `WorkspaceStatus` string values
  (same names except `import_needs_review`, which has no `WorkspaceStatus` equivalent and
  must block confirmation).
- `project-management/DECISIONS.md` — ADR-005/ADR-016 (skip semantics — an imported
  `skipped` workspace must also get `isSkipped: true`/`currentDecision: 'skip'` to stay
  consistent with confirm-skip's invariants), ADR-006 (canonical artifact naming — imported
  legacy artifacts deliberately do **not** follow this convention; see Key Invariants).

## Key Invariants

- **Reuse, don't re-derive.** `confirmImport()` must call `previewImport()` internally to
  get the final (override-applied) metadata and duplicate-detection result — never
  duplicate `scanDateFolder()` logic.
- **Block duplicates.** If `previewImport()` reports `isDuplicate: true`, `confirmImport()`
  throws `ConflictException` (409) unconditionally — this task adds no "force re-import"
  override, since none was requested and it isn't in the acceptance criteria.
- **Ambiguous vacancy source is a hard stop.** If zero or more than one
  `vacancySourceCandidates` exist, `confirmImport()` throws `BadRequestException` unless
  the caller supplies `selectedVacancySourcePath` (must be one of the candidates) — TASK-046
  already surfaces this ambiguity as a `warnings` entry; this task must not guess.
- **No copy by default (AC: "without changing original files unless configured").** By
  default, legacy files are **not** copied anywhere — `GeneratedArtifact.filePath` points
  directly at the original file under `IMPORT_ROOT`, `storageRoot` is set to `IMPORT_ROOT`
  for that row (artifact-level field, see `artifacts.controller.ts` above), and
  `canonicalFileName` is the **original legacy file name**, not an ADR-006 canonical name —
  this directly satisfies "Legacy artifact names are preserved as imported artifact
  metadata." `origin: 'imported'` on every registered row distinguishes these from
  pipeline-generated artifacts.
- **Optional canonical vacancy-source copy.** Only when the caller passes
  `copyVacancySourceToCanonical: true` does `confirmImport()` physically copy the selected
  vacancy source's content into `<workspaceFolder>/00_vacancy_source.txt` under
  `STORAGE_ROOT` (via `ArtifactStorageService.writeFile()`), registering that copy with the
  normal canonical name/type instead of the legacy one. This is the only artifact type this
  option applies to — CV PDFs, cover letters, targeted-CV-content markdown and skip-reason
  markdown are always registered in place, never copied, regardless of this flag (out of
  scope per the acceptance criteria, which names only `00_vacancy_source.txt`).
- **Workspace folder is always created** under `STORAGE_ROOT` (mkdir only, mirroring manual
  creation) even when nothing is copied into it — `ApplicationWorkspace.workspacePath` must
  always point at a real folder for consistency with the rest of the app, even if that
  folder is initially empty.
- **`workspaceSlug` uses the legacy date**, not today's date, when `legacyDateConfidence`
  is `'high'` (format: `YYYY_MM_DD_<companySlug>_<roleSlug>`, same separator convention as
  `WorkspacesService.createWorkspace()`) — preserves real application history. When
  confidence is `'low'`, `parseLegacyDate()` already falls back to *today's* ISO date, so no
  special-casing is needed; just reuse `legacyDate` either way.
- **Suggested status becomes initial status**, mapped 1:1 from `ImportSuggestedStatus` to
  `WorkspaceStatus` (identical string values for every case except `import_needs_review`,
  which is rejected — see below). When the resulting status is `skipped`, also set
  `isSkipped: true` and `currentDecision: 'skip'` per ADR-005/016 so the workspace is
  internally consistent with the rest of the skip machinery.
- **`import_needs_review` blocks confirmation.** If `previewImport()`'s `suggestedStatus`
  is `import_needs_review` (no recognizable artifacts), `confirmImport()` throws
  `BadRequestException` — there is nothing meaningful to create a workspace record for.
- **`JobVacancy.originalImportedFileName`/`sourceFormat`** get populated (basename of the
  selected vacancy source file; `sourceFormat: 'legacy_import'`) — these fields exist
  specifically for this purpose and were unused before this task.
- **`ApplicationWorkspace.createdFrom: 'import'`, `sourceImportedPath: folderPath`** — the
  latter is also what TASK-046's own path-based duplicate check reads, so every confirmed
  import must set it or future duplicate detection silently stops working for that folder.
- Do not touch `ArtifactsController.download()`'s binary-unsafe `fs.readFile(path, 'utf-8')`
  read — downloading an imported legacy PDF through the generic `/artifacts/:id/download`
  endpoint will corrupt binary content. This is a **pre-existing** bug (also already latent
  for any binary artifact registered through that generic endpoint, not something this task
  introduces) — log it as a new "Known Gap" in `TASK_BOARD.md` rather than fixing it here,
  since it's outside this task's acceptance criteria and touches shared download plumbing.

## Acceptance Criteria

- [x] New `ImportService.confirmImport(folderPath, options)` — `options` includes
      `companyNameOverride?`, `roleTitleOverride?`, `selectedVacancySourcePath?`,
      `copyVacancySourceToCanonical?: boolean` (default `false`).
- [x] Calls `previewImport()` internally; throws `ConflictException` when `isDuplicate`.
- [x] Throws `BadRequestException` for zero/ambiguous vacancy-source candidates without a
      valid `selectedVacancySourcePath`, and for `suggestedStatus === import_needs_review`.
- [x] Creates `Company`, `JobVacancy` (with `originalImportedFileName`/`sourceFormat`),
      `ApplicationWorkspace` (with `createdFrom: 'import'`, `sourceImportedPath`, initial
      `status` mapped from `suggestedStatus`, `isSkipped`/`currentDecision` set correctly
      for the `skipped` case) and one `GeneratedArtifact` row per detected legacy artifact,
      preserving original file names and registering files in place (no copy) by default.
- [x] `copyVacancySourceToCanonical: true` physically copies the selected vacancy source
      into `00_vacancy_source.txt` under the new workspace's `STORAGE_ROOT` folder and
      registers that copy with the canonical name instead of the legacy one.
- [x] New `POST /import/confirm` endpoint (Swagger-documented per ADR-019), request/response
      DTOs added alongside `import-preview.dto.ts`.
- [x] `ImportModule` gains `CompanyModule`, `VacancyModule`, `ArtifactStorageModule` imports.
- [x] Integration-style tests (real temp filesystem fixtures, mocked Prisma; real
      `CompanyService`/`VacancyService`/`ArtifactStorageService`/`ArtifactsService` instances
      backed by the mocked Prisma) cover: Action1-style (CV PDF present, no copy),
      Amach-style (cover letter present), AppsFlyer-style (vacancy source only, with
      `copyVacancySourceToCanonical: true`), Broadvoice-style (skip — asserts
      `isSkipped`/`currentDecision`), duplicate rejection, ambiguous vacancy-source
      rejection (both sub-branches: missing selection and non-matching selection),
      zero-candidate rejection, `import_needs_review` rejection. 13 new service tests + 1
      new controller test.
- [x] `npm run test` all suites green (51/51, 522/522); `npx tsc --noEmit` clean;
      `npm run test:e2e` green (3/3 suites, 4/4 tests — confirms new module imports don't
      break `AppModule`'s DI graph).
- [x] `TASK_BOARD.md` row added for TASK-047, status `DONE`; new "Known Gap" entry logged
      for the binary-unsafe generic artifact download, scheduled as TASK-PH-019.
- [x] `project-management/TEST_LOG.md` has a dated entry with commands + results.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-047 ..."`
3. `git push -u origin task/TASK-047-import-confirmation-artifact-registration`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
