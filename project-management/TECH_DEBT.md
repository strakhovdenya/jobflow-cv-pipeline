# Tech Debt / Future Improvement Backlog

## Purpose

Ideas, best-practice gaps and improvement candidates that are **not yet** scoped GitHub Issues —
either too small to justify one on their own, or not yet prioritized. This is a holding area, not
an execution tracker: per ADR-030, actual task creation/execution still goes through GitHub Issues
+ the `JobFlow CV Pipeline` Project. When an entry below is picked up, create a proper Issue for it
(Issue-first protocol, root `CLAUDE.md`) and mark the entry `PROMOTED -> #<n>` here rather than
deleting it.

Do not treat an entry here as pre-approved scope — each one still needs its own plan/confirmation
before implementation, same as any other task.

## Data flow (DB + filesystem) — best-practice review, 2026-08-23

Context: `ApplicationWorkspace`/`GeneratedArtifact` etc. in Postgres (Prisma) + physical files under
`STORAGE_ROOT` via `ArtifactStorageService` (ADR-002 hybrid pattern). Reviewed against general
data-architecture best practices (not tied to a specific epic). Overall pattern is sound for
current MVP scale; the items below are gaps found during that review, roughly ordered by
cost/benefit.

| ID | Date | Area | Problem | Recommendation | Impact | Status |
|---|---|---|---|---|---|---|
| TD-001 | 2026-08-23 | `GeneratedArtifact` | `isLatest: Boolean` has no DB-level uniqueness guard — a race or bug could leave two "latest" artifacts of the same `(workspaceId, artifactType)`, and nothing but application code would ever catch it. **This is not a new idea — `docs/09_artifact_storage.md` §30 already specifies this exact constraint** (`(workspace_id, artifact_type, is_latest) partial unique where is_latest = true, if supported`); it was simply never implemented in `schema.prisma`. | Add a partial unique index via Prisma raw SQL migration (`CREATE UNIQUE INDEX ... WHERE "isLatest" = true`), since Prisma's `@@unique` can't express a `WHERE` clause. | Low effort, high integrity payoff — do this first. | OPEN |
| TD-002 | 2026-08-23 | FS + DB write ordering / missing-file handling | File write (`ArtifactStorageService`) and its DB record (`GeneratedArtifact`/hash) are two independent steps with no compensation — a crash between them leaves an orphaned file or a DB row pointing at a missing file. **`docs/09_artifact_storage.md` §23 already specifies a `missing_on_disk` artifact status and a recovery flow (Locate/Restore/Regenerate/Archive/Remove link) for exactly this case** — `GeneratedArtifact.status` exists in the schema but nothing ever sets or checks `missing_on_disk`, and no reconciliation job exists to detect drift. | Write file first, then DB row; add a reconciliation check (startup or on-demand) that flags DB rows with missing files as `missing_on_disk`, matching the doc's already-defined recovery options. | Medium effort. No known incident yet — preventive. | OPEN |
| TD-003 | 2026-08-23 | Path storage | Several models store resolved/absolute paths or a duplicated `storageRoot` per row (`ApplicationWorkspace.storageRoot/workspacePath`, `GeneratedArtifact.filePath/storageRoot`, `JobVacancy.vacancyTextPath`). If `STORAGE_ROOT` ever moves (disk change, migration to object storage), every stored path goes stale at once. | Store only paths relative to `STORAGE_ROOT`; resolve the root from current config at read time (mirrors `ArtifactStorageService.resolveWorkspacePath`, which already does this — the DB-stored `storageRoot` column is the redundant part). | Medium effort (migration + read-path updates), currently zero pain since root hasn't moved — reprioritize if a storage migration is ever planned. | OPEN |
| TD-004 | 2026-08-23 | Artifact regeneration overwrites without versioning | Regenerating an artifact (e.g. `Regenerate CV draft`, ADR-029) currently goes through `ArtifactStorageService.writeFile()`, which is a plain `fs.writeFile` — it **silently overwrites the previous canonical file with no history**, so a user cannot compare or roll back to the pre-regeneration draft. **`docs/09_artifact_storage.md` §20 already specifies the fix**: before writing a regenerated artifact, move the current canonical file into `versions/<name>.v<N>.<ext>`, mark the old `GeneratedArtifact` row `is_latest = false, status = superseded`, and set a `superseded_by_artifact_id` link (field not yet in `schema.prisma` either) on write of the new one. This is the most concrete, user-facing gap of the review — regenerate is already a real, reachable button. | Implement §20's versioning flow for at minimum the artifacts §20 lists as requiring it (`01_vacancy_analysis`, `01_skip_reason`, `02_targeted_cv_content`, `04_cv_export.html/pdf`); add `superseded_by_artifact_id` to `GeneratedArtifact`. | High — real data loss risk today, not hypothetical. | OPEN |
| TD-005 | 2026-08-23 | `ApplicationWorkspace.status` | No optimistic locking on the status-machine field — concurrent requests against the same workspace could race on a transition. | Add a `@@version`/`updatedAt`-based optimistic lock check in `workspace-status.service.ts`'s transition method if concurrent multi-client access becomes real (currently single-user local tool, so risk is theoretical). | Low urgency — single-user MVP has no real concurrent-writer scenario yet. | OPEN |
| TD-006 | 2026-08-23 | `GeneratedArtifact` schema completeness | `docs/09_artifact_storage.md` §10.1 specifies several `GeneratedArtifact` fields not present in `schema.prisma`: `metadata_json` (step-specific extra data), `error_message` (for `status = failed`), `legacy_original_path`/`legacy_original_file_name` (import provenance), `superseded_by_artifact_id` (see TD-004). Current `origin` field likely corresponds to the doc's `source_kind` — naming not verified as intentional vs. drift. | When implementing TD-002/TD-004, add the missing fields in the same migration rather than one at a time. Confirm `origin` vs. `source_kind` naming intentionally before renaming anything. | Low urgency standalone — bundle with TD-002/TD-004. | OPEN |

Source: ad-hoc architecture discussion, 2026-08-23 — user asked for a best-practices review of the
current DB+filesystem data flow; captured here per their request rather than opening Issues
immediately, since these are improvement candidates, not yet-scoped tasks. TD-001/TD-002/TD-004/
TD-006 were re-verified against `docs/09_artifact_storage.md` (§20, §23, §30) in a follow-up pass —
these are gaps between an already-written spec and the actual implementation, not new proposals.
