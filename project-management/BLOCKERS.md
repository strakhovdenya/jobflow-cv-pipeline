# Blockers

## Purpose

Track issues that prevent safe progress. Do not expand scope to work around blockers without recording the decision.

| ID | Date | Task | Problem | Impact | Next Action | Status |
|---|---|---|---|---|---|---|
| BLK-001 | — | — | No active blocker | — | — | CLOSED |
| BLK-002 | 2026-07-01 | TASK-035A | Initial design input was missing | Resolved by chat decision: use project root as CV reference source and choose clean two-column MVP layout. TASK-035A is now a documentation task that writes the approved concept/block rules, not an open-ended analysis task. | Proceed with TASK-035A after the remaining chat discussion captures detailed block rules. | CLOSED |

## Common Expected Blockers

- Docker/PostgreSQL volume does not persist data.
- Prisma migration fails or creates unexpected schema.
- File path issue on Windows.
- Artifact file is written but not registered in PostgreSQL.
- AI provider returns invalid JSON.
- Prompt output contains unsupported claim.
- PDF export works in HTML but fails during PDF rendering.
- Unit tests require real filesystem/AI calls instead of mocks.
