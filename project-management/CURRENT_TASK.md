# Current Task

## TASK-046 — Implement import preview and manual metadata correction

User-selected 2026-07-14 (continues Phase 9 — Basic Existing Folder Import, following
TASK-045). Full task definition: `docs/07_task_backlog.md` § "TASK-046".

## Status

DONE (closed 2026-07-14).

## Context

TASK-045 added `ImportService.scanRoot()` — a read-only scanner that walks the configured
`IMPORT_ROOT` `Company/YYYY.MM.DD/` folder tree and returns an `ImportScanResultDto[]` with
inferred company/role/date, detected legacy artifacts, a suggested workspace status, and
`warnings` for ambiguous cases (multiple vacancy-source candidates, mismatched role title
between vacancy source and skip file, unparseable date folder). It creates no DB records.

TASK-046 adds the next step: given one scanned folder, let the caller preview the exact
metadata that would be imported and correct company/role before anything is written to the
database (TASK-047, not this task, does the actual `ApplicationWorkspace`/
`GeneratedArtifact` creation). This task must also detect duplicates — a folder that has
already been imported — by path and by content hash, so re-running import scans doesn't
silently create duplicate workspaces later.

`ApplicationWorkspace.sourceImportedPath` and `ApplicationWorkspace.createdFrom` already
exist in `prisma/schema.prisma` (added ahead of time, currently unused by any service) —
they are the path-based duplicate-detection and provenance fields this task is expected to
populate the *design* for (TASK-047 will be the one to actually set them on create).

## Docs to Read

- `docs/07_task_backlog.md` — `### TASK-046` section (Context, Files likely affected,
  Acceptance criteria, Test requirement, Done definition) — full section, already short.
- `src/import/import.service.ts` — full file, especially `scanDateFolder()` (lines 50–187)
  — the per-folder scan logic this task must reuse for a single arbitrary `folderPath`
  rather than a full `scanRoot()` walk, and `extractRoleTitle()`/slug derivation to reuse
  when applying a manual company/role override.
- `src/import/dto/import-scan-result.dto.ts` — full file — `ImportScanResultDto` shape to
  extend/reuse for the preview response, and `LegacyArtifactType`/`ImportSuggestedStatus`
  enums.
- `src/import/import.controller.ts` — full file — existing `GET /import/scan` pattern
  (`@ApiOperation` usage per ADR-019) to follow for the new preview endpoint.
- `src/import/import.service.spec.ts` — full file — existing fixture-folder test pattern
  (temp dirs built per test) to extend for preview + duplicate-detection tests.
- `prisma/schema.prisma` lines 86–112 (`ApplicationWorkspace` model) — `sourceImportedPath`
  (path-based duplicate key) and `createdFrom` fields; `jobVacancyId`/`workspaceSlug` are
  `@unique`, relevant context for why duplicate detection must happen before TASK-047 tries
  to create a workspace.
- `src/artifacts/hash.service.ts` — full file — `hashFile()`/`hashText()`, to use for
  content-hash duplicate detection against existing `GeneratedArtifact.contentHash` rows.
- `src/workspaces/workspaces.service.ts` lines 1–50, 90–113 — `artifactType: 'vacancy_source'`
  / `canonicalFileName: '00_vacancy_source.txt'` naming convention, so the hash-duplicate
  query filters on the same `artifactType` string manually-created workspaces use.
- `src/import/import.module.ts` and `src/workspaces/workspaces.module.ts` — module-import
  patterns (`PrismaModule` is `@Global()` — see ADR-017 rule 5 — but other feature modules
  still import it directly for self-documentation; follow that convention here plus import
  `ArtifactsModule` for `HashService`).

## Key Invariants

- This task does **not** create `ApplicationWorkspace`/`GeneratedArtifact`/`Company`/
  `JobVacancy` records — it is preview/correction only, read-only against the database
  (duplicate-check queries) and filesystem (re-scan of one folder). Record creation is
  TASK-047, explicitly out of scope here.
- Do not change `scanRoot()`'s existing behavior or `GET /import/scan` response shape —
  TASK-045 is already `DONE` and tested; this task adds a new endpoint/method alongside it,
  reusing (not replacing) `scanDateFolder()`'s per-folder logic.
- Duplicate detection must check **both** signals per the acceptance criteria ("Duplicates
  are detected by path/hash"): `ApplicationWorkspace.sourceImportedPath === folderPath`
  (catches re-scanning the exact same folder) and vacancy-source content hash matching an
  existing `GeneratedArtifact` (`artifactType: 'vacancy_source'`) `contentHash` (catches a
  folder that was copied/renamed but has identical vacancy text). Only hash-check when
  exactly one `vacancySourceCandidate` exists — with zero or multiple candidates, skip the
  hash check and rely on the existing `warnings` mechanism (already in `scanDateFolder()`)
  instead of guessing which file to hash.
- Company/role override must go through `SlugService` the same way `scanDateFolder()`
  already does, so preview slugs exactly match what TASK-047 (or a manual
  `POST /workspaces`) would later compute — no separate slugging logic.
- Follow ADR-019: new `POST /import/preview` endpoint needs `@ApiOperation`, new DTO fields
  need `@ApiProperty`/`@ApiPropertyOptional`.

## Acceptance Criteria

- [x] New `ImportService` method (e.g. `previewImport(folderPath, overrides?)`) re-derives
      the scan result for a single folder (company/role/date/artifacts/suggested status/
      warnings), reusing `scanDateFolder()`'s logic rather than duplicating it.
- [x] Caller can pass `companyNameOverride`/`roleTitleOverride`; when present, the preview
      recomputes `companySlug`/`roleSlug` via `SlugService` from the override instead of the
      inferred value, and the response reflects the corrected values.
- [x] Preview response includes duplicate detection: `isDuplicate: boolean` plus enough
      detail to explain why (matched `sourceImportedPath`, or matched content hash) and the
      existing `ApplicationWorkspace` id it collides with.
- [x] New `POST /import/preview` endpoint (Swagger-documented per ADR-019), request DTO
      accepts `folderPath` + optional overrides, response DTO documented.
- [x] Service tests added to `import.service.spec.ts` (per ADR-020: `previewImport` is a
      method of `ImportService`, same file as `scanRoot`'s existing tests, not a separate
      module). Cover: no override (uses inferred values), company override, role override,
      path-based duplicate detected, hash-based duplicate detected, multi-candidate skips
      hash check, no duplicate (clean import candidate). 7 new tests.
- [x] `npm run test` all suites green; `npx tsc --noEmit` clean.
- [x] `TASK_BOARD.md` row added for TASK-046, status `DONE`.
- [x] `project-management/TEST_LOG.md` has a dated entry with commands + results.
- [x] `project-management/CHANGELOG.md` updated.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-046 ..."`
3. `git push -u origin task/TASK-046-import-preview-metadata-correction`
4. `gh pr create --title "..." --body "..." --base main`
5. Stops completely. Does not do anything else.
