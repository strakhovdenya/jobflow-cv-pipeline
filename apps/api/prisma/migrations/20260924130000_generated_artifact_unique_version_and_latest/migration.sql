-- ISSUE-402: DB-level backstop for GeneratedArtifact invariants, so they no longer rest on the
-- order of calls in ArtifactsService.register:
--   1. (workspaceId, artifactType, version) is unique — no version collision.
--   2. at most one isLatest row per (workspaceId, artifactType). A partial unique index cannot be
--      expressed in schema.prisma; Prisma does not introspect it, so it is not reported as drift.

-- Pre-existing rows written by the old non-atomic register() may violate both indexes.
-- Renumber duplicate versions, keeping the original order (version, then createdAt, then id).
WITH renumbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "workspaceId", "artifactType"
      ORDER BY "version", "createdAt", "id"
    ) AS "newVersion"
  FROM "GeneratedArtifact"
)
UPDATE "GeneratedArtifact" AS a
SET "version" = r."newVersion"
FROM renumbered AS r
WHERE a."id" = r."id" AND a."version" <> r."newVersion";

-- Keep only the highest-version isLatest row per workspace + type.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "workspaceId", "artifactType"
      ORDER BY "version" DESC, "createdAt" DESC, "id" DESC
    ) AS "rank"
  FROM "GeneratedArtifact"
  WHERE "isLatest" = true
)
UPDATE "GeneratedArtifact" AS a
SET "isLatest" = false
FROM ranked AS r
WHERE a."id" = r."id" AND r."rank" > 1;

CREATE UNIQUE INDEX "GeneratedArtifact_workspaceId_artifactType_version_key"
  ON "GeneratedArtifact" ("workspaceId", "artifactType", "version");

CREATE UNIQUE INDEX "GeneratedArtifact_workspaceId_artifactType_latest_key"
  ON "GeneratedArtifact" ("workspaceId", "artifactType")
  WHERE "isLatest" = true;
