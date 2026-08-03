# Current Task

## TASK-082 — Screen: assemble /workspaces list

**Context:** Third integration sub-task of the TASK-073 epic (branch
`task/TASK-082-workspaces-list`, off `task/TASK-073-redesign-base`). Replaces the current plain
`<table>` in `apps/web/src/app/workspaces/page.tsx` with the mockup's list/table component. This is
the first mockup in the epic NOT built on the shared `PipelineScreen` component (single-workspace
detail) — it is a standalone list component with its own data contract.

Two gaps found while reading the mockup against the real codebase, both resolved as part of this
task rather than left open:

- The mockup's own `STATUS_META` only maps 11 of the real `WorkspaceStatus` enum values
  (`apps/api/prisma/schema.prisma` — **19** values as of this task; most prior docs/ADRs say "18",
  a pre-existing off-by-one in project documentation not introduced here and out of scope to fix
  project-wide — verified by direct count of the enum block), falling back to the raw status
  string for the rest. The real implementation must not copy that partial map —
  `apps/web/src/lib/pipeline-view-model.ts` already exports `statusLabel(status)`, which maps all
  19 values to a human label, and must be reused instead of introducing a second, partial
  status-label table.
- The mockup's row shape needs `score` and `updatedAt`, which the frontend's `WorkspaceListItem`
  type (`apps/web/src/lib/api.ts`) does not currently declare. Confirmed by reading
  `apps/api/src/workspaces/workspaces.service.ts`'s `findAll()`: it returns the raw
  `ApplicationWorkspace` Prisma entity (no trimming DTO), and `score`/`updatedAt` are real columns
  on that model — so the backend response already includes them today. This is a frontend
  type-narrowing gap only; **no backend change is needed** for this task.

**Mockup reference:** `docs/mockups/14-workspaces-list.html`, `docs/mockups/14-workspaces-list-screenshot.png`.

**Files affected:**

```text
apps/web/src/lib/api.ts                         (extend WorkspaceListItem with score/updatedAt)
apps/web/src/components/workspace-list.tsx      (new — row/table rendering, split out for testability)
apps/web/src/components/workspace-list.spec.tsx (new)
apps/web/src/app/workspaces/page.tsx            (rewritten to render WorkspaceList)
apps/web/src/app/workspaces/page.spec.tsx       (new — no prior test file existed for this page)
```

**Docs to Read:**

- `docs/mockups/14-workspaces-list.html` — exact `<script type="text/x-dc">` data contract
  (`STATUS_META` labels/colors, `needsReview` rule, decision color rule, empty-state copy).
- `docs/mockups/14-workspaces-list-screenshot.png` — visual layout (column widths, row highlight,
  badge shapes) — the `.html` is Claude-Artifact-compressed and not reliable for layout on its own.
- `apps/web/src/lib/api.ts` lines 125–133 (`WorkspaceListItem`) and line 166 (`listWorkspaces()`).
- `apps/web/src/lib/pipeline-view-model.ts` lines 70–94 (`STATUS_LABELS`/`statusLabel()`) — reuse,
  do not duplicate.
- `apps/api/prisma/schema.prisma` lines 10–29 (`WorkspaceStatus` enum, all 19 values).
- Current `apps/web/src/app/workspaces/page.tsx` — the existing plain-table placeholder this task
  replaces.

**Key Invariants:**

- `needsReview` is derived as `status.startsWith('paused_')` (matches `paused_after_analysis`,
  `paused_after_cv_draft`, `paused_before_export`) — a generalizable rule from the real enum, not a
  hardcoded status list; do not enumerate statuses by hand for this check.
- Status label must come from `statusLabel()` (all 19 values covered); status *color*/category
  (needs-review / in-progress / terminal-positive / skipped-or-archived / failed) needs its own
  small mapping since `pipeline-view-model.ts` has no existing color concept — derive it from the
  same 19-value enum, covering every value (no silent fallback to a raw/ungrouped color for an
  unmapped status).
- Decision color rule (per mockup): `apply` = green, `skip` = gray, `maybe` = amber, `null` = light
  gray em dash (`—`).
- `GET /workspaces` (`listWorkspaces()`) already returns `score`/`updatedAt` on the wire — this is a
  type-only fix in `WorkspaceListItem`, not a new API call or backend change.
- No backend/state-machine changes in this task.

**Acceptance Criteria:**

- [x] `/workspaces` renders the mockup's table shape: COMPANY/ROLE, STATUS, DECISION, SCORE,
      UPDATED columns, header count label ("N workspaces" / "1 workspace"), "Import from folder"
      and "New workspace" actions top-right (existing links preserved).
- [x] Each row shows: company name (bold, linking to `/workspaces/:id`), role title, workspace slug
      (small, muted, monospace), a status pill using `statusLabel()` text and a color derived from
      the status's category, decision text/color, score (or `—` when null), and a relative date
      derived from `updatedAt`.
- [x] Rows where `status.startsWith('paused_')` get the "needs review" visual treatment (row
      highlight + indigo dot + "needs review" caption under the status pill), matching the mockup.
- [x] Empty state (`workspaces.length === 0`) renders the mockup's dashed-icon + copy + "New
      workspace" CTA instead of the current plain "No workspaces yet." text line.
- [x] `WorkspaceListItem` in `apps/web/src/lib/api.ts` gains `score: number | null` and
      `updatedAt: string` fields; no other change to `listWorkspaces()`'s fetch call.
- [x] All 19 `WorkspaceStatus` values produce a defined label (via `statusLabel()`) and a defined
      color category — verified by a test that iterates the full enum list.

**Test Requirement:**

- Unit/component test (`workspace-list.spec.tsx`) covering: populated list rendering, empty state,
  needs-review highlighting for `paused_*` statuses, decision color mapping for apply/maybe/skip/
  null, and full-enum status-label/color coverage. Done — 16 tests.
- New `page.spec.tsx` (no prior test file existed for this page) covering the empty-state wire-up
  and a populated-response wire-up from a mocked `listWorkspaces()`. Done — 2 tests.
- `npm run test` passes in `apps/web` — 174/174.

**Done Definition:**

- `/workspaces` visually matches `docs/mockups/14-workspaces-list-screenshot.png` (manual visual
  comparison, not just text/DOM assertions — see TASK-081's lesson on layout-only bugs). Done —
  project owner compared a real running `/workspaces` page (26 real workspaces) against the mockup
  screenshot and confirmed layout/colors/needs-review highlighting match.
- All acceptance criteria checked, tests passing, `npx tsc --noEmit` clean. Done.

**Progress Notes:**

Implementation matched the plan with no structural changes. One explicit decision point was raised
during the visual comparison and confirmed by the project owner: the rendered status text (e.g.
"Paused after analysis") differs in wording from the mockup's shorter status strings (e.g.
"Paused · analysis"), because this task reuses the real, all-19-status `statusLabel()` from
`pipeline-view-model.ts` rather than the mockup's own partial (11-status) `STATUS_META` label
table — this was already the planned Key Invariant, and the project owner confirmed keeping
`statusLabel()`'s wording as-is rather than introducing a second, mockup-literal label map for this
screen.

**Git Instructions:**

1. `git add <files>`
2. `git commit -m "feat: TASK-082 ..."`
3. `git push -u origin task/TASK-082-workspaces-list`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Do not select the next task automatically.
