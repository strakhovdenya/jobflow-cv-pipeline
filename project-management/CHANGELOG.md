# Changelog

All meaningful implementation changes should be recorded here. Keep entries short and factual.

## Unreleased

### Added

- Project management structure.
- Task board for Markdown-based Jira-lite tracking.
- Current task workflow for Claude Code.
- Architecture decisions log.
- Test log template.
- Blocker tracking.
- TASK-030: `DecisionOverride` Prisma model — stores `workspaceId`, `fromDecision`, `toDecision`, `reviewState`, `reasonNote?`, `createdAt` as an immutable audit record for skip overrides.
- TASK-030: `POST /workspaces/:id/override-skip` endpoint — transitions `status=skipped` workspace to `cv_generation_running`, sets `currentDecision` to `manual_override_apply` or `manual_override_maybe`, sets `reviewState=overridden`. Rejected with 400 if workspace is not in `skipped` status.
- TASK-030: Skip artifacts (`01_skip_reason.md/json`) are preserved — `overrideSkip` is database-only, no filesystem access.

### Changed

- —

### Fixed

- —

### Verified

- —

## Entry Template

```md
## YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Verified
- ...
```
