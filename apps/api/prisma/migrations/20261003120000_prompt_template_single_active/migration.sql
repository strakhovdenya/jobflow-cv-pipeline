-- ISSUE-498: a step has at most one active PromptTemplate and (step, version) is unique, so two
-- parallel activations or a manual edit cannot leave a step running on an arbitrary prompt.
-- The partial unique index cannot be expressed in schema.prisma; Prisma does not introspect it,
-- so it is not reported as drift (same approach as ADR-038/ADR-039).

-- Existing data first, otherwise creating the indexes aborts: keep only the highest active
-- version of every step active.
UPDATE "PromptTemplate" AS t
SET "isActive" = false
WHERE t."isActive" = true
  AND EXISTS (
    SELECT 1
    FROM "PromptTemplate" AS newer
    WHERE newer."step" = t."step"
      AND newer."isActive" = true
      AND newer."version" > t."version"
  );

CREATE UNIQUE INDEX "PromptTemplate_step_version_key"
  ON "PromptTemplate" ("step", "version");

CREATE UNIQUE INDEX "PromptTemplate_step_active_key"
  ON "PromptTemplate" ("step")
  WHERE "isActive" = true;
