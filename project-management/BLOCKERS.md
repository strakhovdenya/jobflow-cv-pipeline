# Blockers

## Purpose

Track issues that prevent safe progress. Do not expand scope to work around blockers without recording the decision.

| ID | Date | Task | Problem | Impact | Next Action | Status |
|---|---|---|---|---|---|---|
| BLK-001 | — | — | No active blocker | — | — | CLOSED |
| BLK-002 | 2026-07-01 | TASK-035A | Design input not yet provided: existing CV paths + visual concept preference + conditional block rules | TASK-035A cannot start until user provides: (1) path to 10+ existing AI-generated CVs, (2) any visual preferences. TASK-035B and TASK-035 are also blocked downstream. | User provides CV folder path and preferences → TASK-035A starts → design doc produced → user approves → TASK-035B proceeds | OPEN |

## Common Expected Blockers

- Docker/PostgreSQL volume does not persist data.
- Prisma migration fails or creates unexpected schema.
- File path issue on Windows.
- Artifact file is written but not registered in PostgreSQL.
- AI provider returns invalid JSON.
- Prompt output contains unsupported claim.
- PDF export works in HTML but fails during PDF rendering.
- Unit tests require real filesystem/AI calls instead of mocks.
