# Current Task

## Task ID

`TASK-014 + TASK-015 + TASK-016`

## Title

GeneratedArtifact model, hashing utility and artifact access endpoints

## Source

`docs/07_task_backlog.md`

## Goal

Track all physical files in PostgreSQL via GeneratedArtifact model, implement stable content hashing, and expose artifact access endpoints.

## Scope

Allowed:

- add GeneratedArtifact model to prisma/schema.prisma;
- run migration;
- create src/artifacts/artifacts.service.ts with register and query methods;
- create src/artifacts/hash.service.ts for SHA-256 content hashing;
- add GET /workspaces/:id/artifacts endpoint;
- add GET /artifacts/:id/download endpoint with path safety check;
- register vacancy source file as artifact during POST /workspaces;
- add service and controller tests.

Not allowed:

- adding KnowledgeSource model (TASK-017);
- adding EvidenceItem model (TASK-019);
- adding AI pipeline or prompt runs;
- changing product scope.

## Acceptance Criteria

- GeneratedArtifact stores workspaceId, artifactType, format, canonicalFileName, filePath, contentHash, origin, promptRunId (optional), isLatest flag.
- Vacancy source file is registered as artifact when workspace is created.
- Multiple artifacts can belong to one workspace.
- Hash service returns stable SHA-256 for same content, different hash for changed content.
- Hashing supports UTF-8 text.
- GET /workspaces/:id/artifacts returns artifact list for workspace.
- GET /artifacts/:id/download returns file contents.
- File paths are validated against storage root — no path traversal.
- Missing file returns clear error.

## Test Requirement

- Service test for registering artifact and querying by workspace.
- Unit tests: same content → same hash, different content → different hash.
- Controller test for GET /workspaces/:id/artifacts.
- Controller test for blocked unsafe path access.
- npm run test must pass locally.
- Record result in project-management/TEST_LOG.md.

## Done Definition

- PostgreSQL knows which files belong to which workspace.
- User can access physical files through the API.
- Content hashes are stored reliably.

## Claude Code Instructions

Before editing files:

1. Read CLAUDE.md.
2. Read this file.
3. Read TASK-014, TASK-015, TASK-016 sections in docs/07_task_backlog.md.
4. Read docs/09_artifact_storage.md for artifact types and structure.
5. Create git branch as specified in Git Instructions.
6. Propose an implementation plan with GeneratedArtifact model fields.
7. List files expected to change.
8. Wait for user approval before making any changes.

After implementation is complete, Claude Code:

1. Shows changed files.
2. Shows migration output and test results.
3. Explains how acceptance criteria were met.
4. Updates project-management/TEST_LOG.md.
5. Suggests next status for project-management/TASK_BOARD.md.
6. Stops and waits for user approval.

## Git Instructions

Claude Code runs at the very start, before any file changes:
1. `git checkout -b task/TASK-014-016-artifact-registry`

Only after user explicitly writes "approved" — Claude Code runs:
1. `git add .`
2. `git commit -m "feat: TASK-014+015+016 GeneratedArtifact model, hashing and artifact access endpoints"`
3. `gh pr create --title "feat: TASK-014-016 artifact registry and access" --body "Closes TASK-014, Closes TASK-015, Closes TASK-016" --base main`
4. Stops completely. Does not push. Does not do anything else.

User handles the rest:
- merge PR on GitHub
- `git checkout main`
- `git pull`