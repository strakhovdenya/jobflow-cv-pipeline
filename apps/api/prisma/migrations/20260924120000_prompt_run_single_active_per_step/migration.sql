-- ISSUE-401: at most one in-flight (pending/running) PromptRun per workspace + step, so a double
-- click or parallel request on an AI step cannot create a second PromptRun/AiRun. Partial unique
-- indexes cannot be expressed in schema.prisma; Prisma does not introspect them, so this is not
-- reported as drift. Stale in-flight rows (crashed process) are reaped by PromptRunsService.

-- Runs left in flight by a crash before this migration would violate the index: fail all of them
-- (none can still be executing while migrations run).
UPDATE "PromptRun" SET "status" = 'failed' WHERE "status" IN ('pending', 'running');

CREATE UNIQUE INDEX "PromptRun_workspaceId_promptStep_active_key"
  ON "PromptRun" ("workspaceId", "promptStep")
  WHERE "status" IN ('pending', 'running');
