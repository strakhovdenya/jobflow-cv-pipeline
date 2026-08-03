# Current Task

## TASK-080 — Screen: assemble /workspaces/new from WorkspaceForm

Branch: `task/TASK-080-workspace-new-screen` (off epic base branch `task/TASK-073-redesign-base`,
which merged PR #144 / TASK-079 before this branch was created).

### Context

First integration sub-task of the TASK-073 epic — the first task where a standalone component
built in TASK-075–079 is actually wired into a real application route rather than staying
presentational-only. Wires TASK-079's `WorkspaceForm` (`apps/web/src/components/workspace-form.tsx`)
into the real `/workspaces/new` route, replacing the current TASK-056 implementation
(`apps/web/src/app/workspaces/new/page.tsx` + `workspace-form.tsx` + `workspace-form.spec.tsx`).
`actions.ts` (the `createWorkspaceAction` server action) is reused unchanged.

`WorkspaceForm` does not call the API itself — it takes an `onSubmit(input: CreateWorkspaceInput):
void` callback plus optional `errors?: string[]` / `isSubmitting?: boolean` props. This task wraps
that in a real call to `createWorkspaceAction` and owns `errors`/`isSubmitting`/success state at
the page level.

On successful creation, the page renders a `success` screen (mockup "02 - Workspace created") with
three fields — workspace slug, folder path, vacancy source path — plus a "View workspace" link.
This is a small, single-use shape (three strings) — per the backlog, it is folded directly into
`page.tsx`'s own render logic, not built as a separate `SuccessPanel`/`WorkspaceCreatedScreen`
component.

### Mockup reference

- `docs/mockups/01-new-workspace-screenshot.png` — via TASK-079's `WorkspaceForm`, already
  implemented, no changes needed here.
- `docs/mockups/02-workspace-created-screenshot.png` — the post-create success screen: green
  "Workspace created · status: `<status>`" banner with a checkmark, three light-gray label/value
  blocks (WORKSPACE SLUG / FOLDER PATH / VACANCY SOURCE, mono-font values), and a full-width black
  "View workspace" button.

### Files Affected

```text
apps/web/src/app/workspaces/new/page.tsx        (rewritten)
apps/web/src/app/workspaces/new/workspace-form.tsx       (deleted — superseded by
                                                            src/components/workspace-form.tsx)
apps/web/src/app/workspaces/new/workspace-form.spec.tsx  (deleted — superseded, see below)
apps/web/src/app/workspaces/new/page.spec.tsx   (new)
apps/web/src/app/workspaces/new/actions.ts      (unchanged, reused as-is)
```

### Docs to Read

- `apps/web/src/components/workspace-form.tsx` + `.spec.tsx` — TASK-079's props contract
  (`onSubmit`, `errors?`, `isSubmitting?`).
- `apps/web/src/app/workspaces/new/actions.ts` — `createWorkspaceAction` return shape
  (`CreateWorkspaceActionResult = { ok: true; data: WorkspaceCreationResult } | { ok: false; errors:
  string[] }`).
- `apps/web/src/lib/api.ts` lines 20-39 — `CreateWorkspaceInput` / `WorkspaceCreationResult` shape
  (`id`, `status`, `workspaceSlug`, `folderPath`, `vacancySourcePath`, etc.) — unchanged by this
  task.
- `docs/mockups/02-workspace-created-screenshot.png` — success screen layout (already viewed).

### Key Invariants

- No change to the underlying `POST /workspaces` API contract — this is a presentation-layer swap
  only.
- The success screen's slug/folder path/source path come straight from the real `POST /workspaces`
  response (`WorkspaceCreationResult.workspaceSlug` / `.folderPath` / `.vacancySourcePath`) — do not
  invent additional fields not present in the mockup's contract.
- Navigation target after "View workspace" stays `/workspaces/${result.id}`, matching TASK-056's
  existing post-create destination.

### Acceptance Criteria

- [x] `/workspaces/new` renders `WorkspaceForm` (from `@/components/workspace-form`) and creates a
      real workspace end-to-end against a real `apps/api` backend.
- [x] On successful creation, renders the `success` screen (slug/folder path/source path) per
      mockup "02", with a "View workspace" link to `/workspaces/${result.id}`.
- [x] On a failed creation (validation error from the API), the page stays on the form and shows
      the returned error messages — it does not silently fail or lose entered input.
- [x] Double-submission while a request is pending is guarded (`isSubmitting` disables the form's
      submit button via the existing `WorkspaceForm` prop).
- [x] Existing TASK-056 component tests (`workspace-form.spec.tsx`) are migrated/rewritten into the
      new `page.spec.tsx`, not left orphaned (ADR-020) — the old `workspace-form.tsx` +
      `workspace-form.spec.tsx` files are deleted.

### Test Requirement

- New `apps/web/src/app/workspaces/new/page.spec.tsx`: renders the form; submits and renders the
  success screen using mockup "02"'s fixture data; renders validation errors on failure and stays
  on the form; submit button disabled while pending.
- Manual smoke test: create a real workspace through the new `/workspaces/new` UI against a running
  `apps/api` + Postgres, recorded in `project-management/TEST_LOG.md`.

### Done Definition

A user can create a new workspace end-to-end through the redesigned `/workspaces/new` screen,
seeing a clear success confirmation (mockup "02") before moving on to the workspace detail page.

### Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-080 ..."`
3. `git push -u origin task/TASK-080-workspace-new-screen`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Do not select the next task automatically.

## Last completed: TASK-079

Component: WorkspaceForm — fifth implementation sub-task of the TASK-073 epic. New
`apps/web/src/components/workspace-form.tsx` renders the "01 - New workspace" mockup's `form`
variant (company/role/source-URL/vacancy-text fields plus a live `storage/applications/<slug>/
00_vacancy_source.txt` preview path via the existing `previewWorkspaceSlug` helper, unchanged from
TASK-056). Unlike the old inline form, it does not call the creation API itself — it calls an
`onSubmit(input: CreateWorkspaceInput): void` callback prop (mirroring `MainActionCard`'s
`onAction` convention) plus optional `errors`/`isSubmitting` props, so TASK-080 can wire in the
real server action and mockup "02"'s post-create success screen without touching this component
again. Following the same pattern as TASK-075/076/077/078, this is a standalone presentational
component only — not yet wired into the real `/workspaces/new` route (still TASK-056's
implementation unchanged). Visual direction confirmed by the project owner against
`docs/mockups/01-new-workspace-screenshot.png` with no revision rounds needed. `/code-review` found
and fixed one bug: company/role names were submitted untrimmed (whitespace-only input would pass
both the HTML `required` attribute and the backend's untrimmed `IsNotEmpty` check), now trimmed
like `sourceUrl` already was. 131/131 `apps/web` tests pass (7 new). Archived verbatim to
`project-management/completed-tasks/TASK-079-workspace-form.md`.

## Recommended next

Per `TASK_BOARD.md`: after TASK-080, **TASK-081** (Screen: assemble `/workspaces/[id]` from
PipelineStages + WorkspaceStatusHeader + MainActionCard + ArtifactList), on a new branch off the
epic base branch `task/TASK-073-redesign-base` — per the branch-sequencing rule (ADR-025), wait
until TASK-080's own PR has merged into the base branch before branching TASK-081 off it. Awaiting
explicit user selection before starting.
