# API: createWorkspace deletes an existing workspace folder on slug collision

## Context
`WorkspacesService.createWorkspace` (`apps/api/src/workspaces/workspaces.service.ts`, catch block after the `$transaction`) calls `removeWorkspaceFolder(absolutePath)` on any failure. `createWorkspaceFolder` uses `mkdir({ recursive: true })`, so when today's slug `YYYY_MM_DD_company_role` already belongs to an existing workspace, the folder is the existing workspace's own: `saveVacancySource` overwrites its `00_vacancy_source.txt`, the transaction fails with P2002 on `workspaceSlug`, and the cleanup `fs.rm(..., { recursive: true })` deletes every artifact of the existing workspace from disk. If `rm` throws, the original 409 is masked.

`ImportService.confirmImport` already handles both cases (`workspaceFolderExisted`, `discardWorkspaceFolder`, ISSUE-402); `createWorkspace` should behave the same. Found by `/code-review` on ISSUE-402; pre-existing, not introduced there.

## Affects
`apps/api/src/workspaces/workspaces.service.ts`, `apps/api/src/workspaces/workspaces.service.spec.ts`

## Docs to Read
- ADR-039 (import cleanup rules), Key Invariants in root `CLAUDE.md` (files only inside `STORAGE_ROOT`)

## Key Invariants
- Never delete a workspace folder this call did not create.
- Cleanup failure must not mask the original error.

## Acceptance Criteria
- [x] Creating a workspace whose slug already exists returns 409 and leaves the existing folder and its files intact (including `00_vacancy_source.txt`, which must not be overwritten)
- [x] Cleanup only removes a folder created by this call; a cleanup failure is logged, not thrown over the original error

## Test Requirement
Unit tests in `workspaces.service.spec.ts`: pre-existing folder is not removed on P2002; `removeWorkspaceFolder` rejecting does not replace the original error.

## Definition of Done
- [x] Acceptance Criteria met
- [x] `cd apps/api && npx tsc --noEmit && npm run lint && npm run test && npm run test:e2e` green

## Dependencies
Follows ISSUE-402 (same helper pattern).


