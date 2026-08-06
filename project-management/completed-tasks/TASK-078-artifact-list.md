# Current Task

## TASK-078 — Component: ArtifactList / ArtifactCard

**Status:** DONE (2026-07-26). Branch: `task/TASK-078-artifact-list`, off epic base branch
`task/TASK-073-redesign-base` (fast-forwarded to `origin/task/TASK-073-redesign-base` @ `7a75e41`,
which includes TASK-077's merged PR #142, verified via `gh pr list --base
task/TASK-073-redesign-base` before branching).

**Context:** Fourth component sub-task of the TASK-073 epic (see TASK-075). Extracted from the
mockups' `artifacts[]` shape: `{ type, kind, ext, version, date, stage, expanded, preview }`.
Replaces the current bare Type/File/Version/Latest table (TASK-073 pain point #4) with expandable
cards, each showing an inline text preview when expanded (per the "04 - Analysis review" mockup,
`01_vacancy_analysis_json`'s `preview` field contains formatted JSON text;
`01_vacancy_analysis_md` contains formatted Markdown text).

**Mockup reference:** `docs/mockups/03-source-saved-screenshot.png`,
`docs/mockups/04-analysis-review-screenshot.png`, `docs/mockups/09-pdf-generated-screenshot.png`.

Exact `artifacts[]` fixture data extracted directly from each mockup's `__bundler/template` escaped
JSON block (the `<script type="text/x-dc">`'s `renderVals()`), not readable via plain-text grep on
the `.html` files as `docs/mockups/README.md` describes for earlier mockups — read with the `Read`
tool at the template script's line offset instead:

```text
// 03-source-saved.html
artifacts: [ { type: 'vacancy_source', kind: 'source', ext: 'txt', version: 1, date: '21 Jul, 09:02', stage: 'Source', expanded: true,
  preview: 'Fullstack Developer (React/Node.js) — Remote / Work from Anywhere, US.\nCompensation $230,000–$280,000/year.\nStack: React.js, Node.js, JavaScript ES6+, HTML5, CSS3,\nREST APIs, PostgreSQL or MongoDB, Git, CI/CD, Jest or Mocha.' } ]

// 04-analysis-review.html
artifacts: [
  { type: 'vacancy_source', kind: 'source', ext: 'txt', version: 1, date: '21 Jul, 09:02', stage: 'Source', expanded: false, preview: '' },
  { type: 'vacancy_analysis_md', kind: 'analysis', ext: 'md', version: 1, date: '21 Jul, 09:05', stage: 'Analysis', expanded: true, preview: 'Decision: apply\nScore: 75\nReasoning: strong stack match and remote preference.' },
  { type: 'vacancy_analysis_json', kind: 'analysis', ext: 'json', version: 1, date: '21 Jul, 09:05', stage: 'Analysis', expanded: false, preview: '{\n  "decision": "apply",\n  "score": 75\n}' }
]

// 09-pdf-generated.html
artifacts: [
  { type: 'vacancy_source', kind: 'source', ext: 'txt', version: 1, date: '21 Jul, 09:02', stage: 'Source', expanded: false, preview: '' },
  { type: 'vacancy_analysis_md', kind: 'analysis', ext: 'md', version: 1, date: '21 Jul, 09:05', stage: 'Analysis', expanded: false, preview: '' },
  { type: 'vacancy_analysis_json', kind: 'analysis', ext: 'json', version: 1, date: '21 Jul, 09:05', stage: 'Analysis', expanded: false, preview: '' },
  { type: 'targeted_cv_content_md', kind: 'cv', ext: 'md', version: 1, date: '21 Jul, 09:12', stage: 'CV generation', expanded: false, preview: '' },
  { type: 'targeted_cv_content_json', kind: 'cv', ext: 'json', version: 1, date: '21 Jul, 09:12', stage: 'CV generation', expanded: false, preview: '' },
  { type: 'pre_pdf_check_md', kind: 'check', ext: 'md', version: 1, date: '21 Jul, 09:18', stage: 'Pre-PDF check', expanded: false, preview: '' },
  { type: 'pre_pdf_check_json', kind: 'check', ext: 'json', version: 1, date: '21 Jul, 09:18', stage: 'Pre-PDF check', expanded: false, preview: '' },
  { type: 'cv_export_html', kind: 'html', ext: 'html', version: 1, date: '21 Jul, 09:24', stage: 'Export', expanded: false, preview: '' },
  { type: 'cv_export_pdf', kind: 'pdf', ext: 'pdf', version: 1, date: '21 Jul, 09:24', stage: 'Export', expanded: true, preview: '[ cv_export.pdf — 2 pages ]\nTargeted CV — Fullstack Developer\nHired · 2026-07-21' }
]
```

Screenshots (03/04/09) show a **flat list**, not stage-grouped headers: each row has a colored
3-letter `kind` badge (`source→SRC`, `analysis→ANL`, `cv→CV`, `check→CHK`, `html→HTM`, `pdf→PDF`
— a fixed dictionary reverse-engineered from the screenshot's badge text, since it does not match
a literal first-3-letters-of-`kind` rule for `source`/`analysis`/`check`), bold `type` name, a gray
subtitle line, right-aligned `Download`/`View` buttons + a chevron, and an expandable bordered
preview box below the row when expanded. Header: "Artifacts" + count badge + "click a row to
preview" hint text.

**Files affected:**

```text
apps/web/src/lib/types.ts                             (edit — add ArtifactKind, ArtifactCardData)
apps/web/src/components/artifact-card.tsx              (new)
apps/web/src/components/artifact-list.tsx              (new)
apps/web/src/components/artifact-card.spec.tsx          (new)
apps/web/src/components/artifact-list.spec.tsx          (new)
CLAUDE.md                                              (edit — process rule, unrelated to the
                                                          component itself, see Progress Notes)
```

**Docs to Read:**

- "03 - Source saved" and "04 - Analysis review" and "09 - PDF generated" mockup data blocks
  (already extracted above).
- `apps/web/src/app/workspaces/[id]/artifact-viewer.tsx` + `artifact-download.ts` — TASK-064's
  existing download-link/inline-content-viewer implementation, used by the *old*
  `/workspaces/[id]/page.tsx`. This task does not replace that wiring (TASK-083 does) — it adds the
  new presentation component standalone, matching how TASK-075/076/077 landed.
- `apps/web/src/components/main-action-card.tsx` + `.spec.tsx` (TASK-077) — structure/Tailwind/test
  convention reference.
- `apps/web/src/lib/types.ts` — existing sibling types (`MainActionCardData` etc.) for naming
  convention.

**Key Invariants:**

- Pure presentation component — receives `artifacts[]` as a prop (already including `preview`
  text); does not itself fetch artifact content. Internal `expanded` state is a per-card React
  `useState` seeded from the `expanded` prop (no callback in the mockup contract — this is a
  presentation-only toggle, not lifted state).
- The mockup's `artifacts[]` shape has no `id`/download-URL field. To avoid silently dropping
  TASK-064's download capability while keeping the component's required props exactly matching the
  mockup contract, `ArtifactCardData` adds one field **not** present in the mockup: optional
  `downloadUrl?: string`. When present, a `Download` link renders; when absent (e.g. in the mockup
  fixtures, which have none), it does not. Real wiring of `downloadUrl` from
  `WorkspaceArtifactSummary` happens in TASK-083.
- `ext` is not visually distinct in the mockup screenshots' subtitle text (it's implied by the
  `type` name and the kind badge), but the backlog's acceptance criteria explicitly requires
  labelling by `ext` — folded into the subtitle line as an explicit deviation from pixel-exact
  mockup match, confirmed with the project owner at visual review.

**Acceptance criteria:**

- Renders each artifact as a card labelled with its `stage`, `type`, `ext`, `version`, `date`.
- Cards toggle `expanded` state on click, showing/hiding the `preview` text.
- Existing download-link capability (TASK-064) is preserved via the optional `downloadUrl` prop,
  not silently dropped.

**Test requirement:**

- `artifact-card.spec.tsx`/`artifact-list.spec.tsx` covering render of multiple artifacts,
  expand/collapse toggling, and download-link presence/absence, using the exact fixture data above.

**Done definition:**

- Component renders correctly standalone with the exact `artifacts[]` example data from mockups
  03, 04, and 09, including expand/collapse interaction.

**Progress Notes:**

- Mid-task, the project owner asked for a new standing process rule (unrelated to
  ArtifactList/ArtifactCard itself): before every task-closure `git commit`, explicitly ask
  whether to run `/code-review` against the working diff, and wait for an explicit yes/no rather
  than assuming or silently skipping it. Added to `CLAUDE.md`'s `## Task Closure Checklist`,
  directly after the existing "restate the checklist inline" step (the one chokepoint every task
  closure already passes through, so the new question can't be silently missed). Bundled into this
  task's commit rather than a separate one, per explicit instruction, even though it is a
  process/doc change rather than component work.
- Self-review before visual comparison found and fixed one real lint error (not a functional bug):
  `interface ArtifactCardProps extends ArtifactCardData {}` tripped
  `@typescript-eslint/no-empty-object-type` — changed to a `type` alias. No hover/disabled/tooltip
  bug class applied here (unlike TASK-077), since this component has no disabled or
  native-tooltip elements.
- Visual review confirmed the project owner was satisfied with the rendered result as-is,
  including the expected absence of a `Download` button in the demo fixtures (mockups carry no
  `downloadUrl`, matching the documented Key Invariant above) — no revision rounds needed.
- `/code-review` (run per the new CLAUDE.md rule added this task) found and both were fixed: (1)
  `isExpanded` never resynced when the `expanded` prop changed after initial mount — fixed via
  React's "adjust state during render" pattern instead of `useEffect` (the repo's
  `react-hooks/set-state-in-effect` lint rule forbids synchronous `setState` in effects); (2) the
  kind-badge label/color were two parallel `Record<ArtifactKind, string>` maps that had to be
  hand-kept in sync — merged into one `Record<ArtifactKind, { label, className }>`. Re-verified:
  `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test` 124/124 passed.

**Git Instructions:**

1. `git add <files>`
2. `git commit -m "feat: TASK-078 ..."`
3. `git push -u origin task/TASK-078-artifact-list`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Do not select the next task automatically.
