---
name: epic-discovery
description: Find, analyze, or scope the next epic/phase and determine current epic progress. Use when asked what comes next, which phase is active, or to scope an epic that was not already named.
---

# Epic and Phase Discovery — JobFlow CV Pipeline

Use this source order; do not infer current project status from a single stale planning file.

1. `docs/05_epics.md` — authoritative definition of why each epic exists: Goal, Business Value, Scope, Acceptance Criteria.
2. `docs/06_roadmap.md` — phase order, dependencies, Done Criteria, Physical Result. Epic and phase numbers are independent and only roughly map 1:1; check both files.
3. `docs/07_task_backlog.md` — frozen historical record under ADR-030. Use it only for work broken down before 2026-08-19.
4. For work broken down on/after 2026-08-19, use GitHub Issues and milestones on the `JobFlow CV Pipeline` Project as the execution/status source of truth.
5. Check `docs/` for a dedicated methodology document for the epic.
6. Check for relevant `docs/research-*.md` implementation research. Research supplements methodology/PRD/plan; it does not override already resolved decisions.

Do **not** treat `project-management/EPIC_PROGRESS.md` as authoritative for current status. It has been observed stale because its former synchronization source (`TASK_BOARD.md`) is frozen.

For current work (2026-08-19 onward), establish status from open/closed Issues, milestones, and the GitHub Project. For older work, cross-check the frozen task board with git/PR history.

When reporting the next epic/phase, distinguish:
- product definition (epics doc),
- sequencing/dependencies (roadmap),
- execution decomposition (Issues/milestones),
- observed current status (GitHub),
- optional methodology/research context.

Do not silently create Issues or start implementation from this skill. Use the `issues` skill for backlog creation and `task-lifecycle` for implementation.
