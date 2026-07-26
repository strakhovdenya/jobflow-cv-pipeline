# Current Task

## TASK-079 — Component: WorkspaceForm (new-workspace creation form)

**Status:** DONE (2026-07-26). Branch: `task/TASK-079-workspace-form`, off epic base branch
`task/TASK-073-redesign-base` (fast-forwarded to `origin/task/TASK-073-redesign-base` @ `be1cb32`,
which includes TASK-078's merged PR #143, verified via `gh pr list --base
task/TASK-073-redesign-base` before branching).

**Context:** Fifth component sub-task of the TASK-073 epic (see TASK-075). Covers the
`screenType: 'form'` variant from the "01 - New workspace" mockup — fields `company`, `role`,
`sourceUrlPlaceholder`, `vacancyText`, and a live-updating `previewPath` showing the computed
`storage/applications/<slug>/00_vacancy_source.txt` path as the user types company/role.

Following the same pattern already established by TASK-075/076/077/078, this task builds a pure
presentation component in `src/components/` only — it is **not** wired into the real
`/workspaces/new` route in this task. The real route currently still uses the TASK-056
implementation (`apps/web/src/app/workspaces/new/workspace-form.tsx` + `actions.ts`) unchanged.
Wiring the new component into the real route (and rendering mockup "02"'s new `success` screen
after a successful `POST /workspaces`) is TASK-080's job, not this one.

**Mockup reference:** `docs/mockups/01-new-workspace-screenshot.png` (primary — see
`docs/mockups/README.md`). Exact `form` data contract extracted from the mockup's
`__bundler/template` escaped JSON block (`<script type="text/x-dc">`'s `renderVals()`), read via
the `Read` tool at the script's line offset (not readable via plain-text grep):

```text
// 01-new-workspace.html
{ screenType: 'form', form: {
  company: 'Hired', role: 'Fullstack Developer React Node js Remote',
  sourceUrlPlaceholder: '(none provided)',
  vacancyText: 'Fullstack Developer (React/Node.js) — Remote / Work from Anywhere, US.\nCompensation $230,000–$280,000/year.\nStack: React.js, Node.js, JavaScript ES6+, HTML5, CSS3,\nREST APIs, PostgreSQL or MongoDB, Git, CI/CD, Jest or Mocha.',
  previewPath: 'storage/applications/2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote/00_vacancy_source.txt'
} }
```

Screenshot layout: eyebrow "new workspace" + bold heading "Create application workspace", a
two-column row (Company name / Role title), full-width Source URL (optional, placeholder
"(none provided)" when empty), full-width Vacancy text textarea, a muted "will save to
storage/applications/…/00_vacancy_source.txt" preview strip, and a full-width black
"Create workspace" submit button.

**Files affected:**

```text
apps/web/src/components/workspace-form.tsx        (new)
apps/web/src/components/workspace-form.spec.tsx   (new)
```

**Docs to Read:**

- "01 - New workspace" mockup data block (already extracted above).
- Current `apps/web/src/app/workspaces/new/workspace-form.tsx` + `actions.ts` (TASK-056) — read for
  reference only; NOT edited/replaced in this task (TASK-080's job). Existing `previewWorkspaceSlug`
  in `apps/web/src/lib/slug.ts` already implements the Unicode-Cyrillic-aware client preview logic
  mirroring `apps/api/src/common/slug/slug.service.ts` (ADR-013) — reused as-is, no new slug logic
  needed.
- `apps/web/src/components/main-action-card.tsx` + `.spec.tsx` (TASK-077) and
  `apps/web/src/components/artifact-card.tsx` + `.spec.tsx` (TASK-078) — structure, Tailwind
  zinc/indigo conventions, "adjust state during render" pattern reference (not needed here since
  this component has no prop-derived local state to resync, but kept in mind).
- `apps/web/src/lib/api.ts` — `CreateWorkspaceInput` type (reused directly, no new type added to
  `lib/types.ts` for this task).

**Key Invariants:**

- Pure presentation/interactive-form component — manages its own local field state (company, role,
  source URL, vacancy text) and its own live `previewPath` computation via the existing
  `previewWorkspaceSlug`, but does **not** call `createWorkspaceAction`/the API itself. On submit it
  calls an `onSubmit(input: CreateWorkspaceInput): void` callback prop with the assembled payload
  (mirrors `MainActionCard`'s `onAction` callback convention) — this is what lets TASK-080 wire in
  the real server action and the new "02" success screen without touching this component again.
- `errors?: string[]` and `isSubmitting?: boolean` are optional props for the caller to drive
  validation-error display and submit-button pending state; this component does not fetch or manage
  that state on its own.
- `previewPath` is a cosmetic/best-effort client-side slug preview — the real slug is always
  computed authoritatively by the backend `SlugService` on submit; a frontend/backend slug-rule
  mismatch must never block submission (already true of the existing `previewWorkspaceSlug`, reused
  unchanged).
- No success-screen UI belongs in this component — that's mockup "02" territory, explicitly
  TASK-080's job.

**Acceptance criteria:**

- Renders company, role, source-URL (optional, placeholder "(none provided)"), and vacancy-text
  fields, plus a live-updating `storage/applications/<slug>/00_vacancy_source.txt` preview as
  company/role are typed.
- Client-side slug preview uses the same Unicode-Cyrillic-aware rules as `SlugService` (ADR-013),
  via the existing `previewWorkspaceSlug` helper.
- Submitting the form calls `onSubmit` with a `CreateWorkspaceInput` payload
  (`companyNameOriginal`, `roleTitleOriginal`, `vacancyText`, `sourceUrl` — `undefined` when blank)
  identical in shape to what TASK-056's form previously sent to the creation API directly.
- Required-field validation (`company`, `role`, `vacancyText` required; `sourceUrl` optional)
  matches TASK-056's existing behavior.
- `errors` prop renders a validation-error list when non-empty; `isSubmitting` disables the submit
  button and updates its label.

**Test requirement:**

- `workspace-form.spec.tsx`: typing into company/role updates the live preview path; required-field
  attributes; submitting calls `onSubmit` with the correct payload shape (including `sourceUrl:
  undefined` when left blank); `errors` prop renders the error list; `isSubmitting` disables the
  button.

**Done definition:**

- Component renders correctly standalone (verified via a temporary preview route, removed before
  commit) against the "01" mockup screenshot, and produces the same `CreateWorkspaceInput` payload
  shape as TASK-056's form via its `onSubmit` callback, with the new layout/preview styling.

**Git Instructions:**

1. `git add <files>`
2. `git commit -m "feat: TASK-079 ..."`
3. `git push -u origin task/TASK-079-workspace-form`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Do not select the next task automatically.

**Progress Notes:**

- No divergence from the plan above — implementation matched the design as written. Self-review
  before visual comparison found no issues (the two bug classes found on TASK-077/TASK-078 don't
  apply to this component: no prop-derived local state to resync, no duplicate parallel lookup
  dictionaries). Visual review against `docs/mockups/01-new-workspace-screenshot.png` confirmed by
  the project owner with no revision rounds needed.
- `/code-review` (run per the CLAUDE.md rule added in TASK-078) found 1 finding, fixed:
  `companyNameOriginal`/`roleTitleOriginal` were submitted untrimmed while `sourceUrl` was
  explicitly trimmed — a whitespace-only company/role name would satisfy the HTML5 `required`
  attribute and the backend's untrimmed `class-validator` `IsNotEmpty` check, creating a
  workspace/company record with a blank-looking name. Fixed by trimming both fields before calling
  `onSubmit`, matching `sourceUrl`'s existing behavior; added a regression test. Re-verified:
  `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 131/131 passed (7 new).
