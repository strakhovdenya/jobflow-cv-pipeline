# Current Task

**TASK-101** — UI: manual-note control on the workspace detail page (`apps/web`)

## Context

TASK-098 added `POST /workspaces/:id/manual-note` (append-with-timestamp, no status precondition)
and TASK-099 wired the stored note into all three prompt input builders — nothing in `apps/web`
exposes it yet. This is `apps/web`-only wiring, following the same `saveRejectionText`/`"Save
rejection feedback"` pattern already established in `application-tracking-panel.tsx` (a
`<textarea>` + submit button posting `{ text }` to a workspace-scoped endpoint, refreshing on
success) — the closest existing precedent for "free-text field, appended server-side, no
client-side validation beyond non-empty."

No mockup exists for this control. Placement decision (made ahead of implementation): a new
full-width panel section at the bottom of the page, directly above `ApplicationTrackingPanel`
(outside the two-column `PipelineStages`/main-content grid) — it is a supplementary,
always-available utility unrelated to the current pipeline stage (per TASK-098's "no status
precondition" — the panel must render identically regardless of `workspace.status`, unlike every
other panel on this page which is conditionally shown), so it does not belong inside the
stage-specific column and should not visually compete with the primary action button's emphasis.

## Files Affected

```text
apps/web/src/lib/api.ts                                    (WorkspaceDetail.manualNote, appendManualNote())
apps/web/src/app/workspaces/[id]/actions.ts                (appendManualNoteAction)
apps/web/src/app/workspaces/[id]/manual-note-panel.tsx      (new)
apps/web/src/app/workspaces/[id]/manual-note-panel.spec.tsx (new)
apps/web/src/app/workspaces/[id]/page.tsx                  (wire in)
```

## Docs to Read

- `apps/api/src/workspaces/workspaces.controller.ts`'s `manual-note` endpoint (line ~236) +
  `apps/api/src/workspaces/dto/append-manual-note.dto.ts` — exact request/response shape
  (`AppendManualNoteDto { note: string }`; `WorkspacesService.appendManualNote` returns the updated
  `ApplicationWorkspace`, i.e. `{ id, manualNote, ... }`).
- `apps/web/src/lib/api.ts` lines 125-162 (`WorkspaceListItem`/`WorkspaceDetail`, `getWorkspace`)
  and lines 746-785 (`SaveRejectionTextInput`/`SaveRejectionTextResult`/`saveRejectionText`) — the
  interface-to-extend and the exact fetch-function pattern (headers, `cache: "no-store"`,
  `ApiValidationError` on non-OK) to mirror for the new `appendManualNote` function.
- `apps/web/src/app/workspaces/[id]/actions.ts` lines 183-188 (`saveRejectionTextAction`) — the
  `toActionResult` wrapper pattern to mirror for `appendManualNoteAction`.
- `apps/web/src/app/workspaces/[id]/application-tracking-panel.tsx` lines 343-372 (the "Save
  rejection feedback" sub-block) — closest existing precedent: `<textarea>` + trim-and-require-
  non-empty client-side check + `startTransition`/`router.refresh()` + `ErrorList` error display.
  This task's panel is simpler (no conditional `showX` gating — always rendered) but should reuse
  the same `buttonClass`/`secondaryButtonClass`/`inputClass` Tailwind constants and `ErrorList`
  component rather than redefining styles.
- `apps/web/src/app/workspaces/[id]/page.tsx` (full file) — exact insertion point (directly above
  the existing `<ApplicationTrackingPanel .../>` call, still inside the outer
  `flex min-h-screen ... flex-col gap-6` wrapper but outside the two-column grid `div`).

## Key Invariants

- The panel renders unconditionally regardless of `workspace.status` — no `ALLOWED_STATUSES`-style
  gate, matching TASK-098's endpoint having none.
- Client-side validation is UX-only (non-empty check before submit) — `apps/api`'s DTO validation
  remains the authority (`apps/web/CLAUDE.md`: do not duplicate backend validation rules beyond
  basic required-field UX checks).
- Do not introduce a new data-fetching library or global state — follow the existing
  Server-Component-fetches-data / Client-Component-posts-via-Server-Action split already used by
  every other panel on this page.
- Display the existing accumulated `manualNote` value (read-only) above the input, not just the
  input alone — a user attaching a second note needs to see what's already there, especially since
  TASK-098 made appends additive/timestamped rather than a single editable value.

## Acceptance Criteria

- [x] `WorkspaceDetail` (`api.ts`) gains `manualNote: string | null`, populated from the real
      `GET /workspaces/:id` response.
- [x] New `appendManualNote(id, { note })` function in `api.ts`, following the exact
      `saveRejectionText` pattern (headers, error handling, `cache: "no-store"`).
- [x] New `ManualNotePanel` component: renders the current `manualNote` value (or an empty-state
      message if `null`), a `<textarea>` for a new note, and a submit button; submitting an empty/
      whitespace-only note shows a client-side error without calling the server action.
- [x] On successful submission, the page refreshes (`router.refresh()`) and the newly appended
      entry is visible in the displayed `manualNote` text.
- [x] Wired into `page.tsx` at the placement decided above (full-width, above
      `ApplicationTrackingPanel`).
- [x] Matches the existing visual quality bar (Tailwind utility classes, dark-mode variants,
      consistent with `application-tracking-panel.tsx`'s styling) rather than unstyled markup.

## Test Requirement

`manual-note-panel.spec.tsx`: renders existing note text; renders an empty-state message when
`manualNote` is `null`; submitting a non-empty note calls the action with the trimmed text and
triggers a refresh on success; submitting an empty/whitespace-only note shows a client-side error
and does not call the action; a server-side validation error (mocked `ApiValidationError`) is
displayed via `ErrorList`.

## Done Definition

`npx tsc --noEmit`, `npm run lint`, `npm run test` (apps/web) all green. Manual verification in a
running `npm run dev` session against a real `apps/api` backend: attach a note to a real
workspace, confirm it persists across a page reload, attach a second note, confirm both are
visible in order.

## Dependencies

TASK-098 (`manualNote` field + endpoint) and TASK-099 (prompt-builder wiring) — both already
merged into `main`.

## Progress Notes

- Making `WorkspaceDetail.manualNote` required (not optional) surfaced two pre-existing
  `WorkspaceDetail` object literals in `apps/web/src/lib/pipeline-view-model.spec.ts` that were
  missing the new field — TypeScript caught this immediately (`tsc --noEmit`); fixed by adding
  `manualNote: null` to both fixtures. Not a scope change, just a mechanical consequence of adding
  a required field to a shared interface.
- Manual verification hit an unrelated pre-existing environment issue: `apps/web`'s Turbopack dev
  server panicked on the first compile of `globals.css` on this Windows machine (worker process
  exited with `0xc0000142`) — resolved by clearing `.next` and restarting; not caused by this
  task's changes (failure was in CSS module resolution, unrelated to any file this task touched).
  Also had to run `apps/web`'s dev server on port 3001 instead of the default 3000, since
  `apps/api`'s dev server also defaults to port 3000 — both were needed running simultaneously for
  the manual verification, which the two apps' individual `CLAUDE.md` files don't call out as a
  local multi-app dev conflict. Recorded here rather than filed as a new task since it's a
  workflow note, not a product change; a future task could add a `-p 3001` convention to
  `apps/web/package.json`'s `dev` script if this recurs often enough to be worth fixing.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-101 ..."`
3. `git push -u origin task/TASK-101-manual-note-panel`
4. `gh pr create --title "..." --body "..." --base main`
5. Stop completely. Do not do anything else.
