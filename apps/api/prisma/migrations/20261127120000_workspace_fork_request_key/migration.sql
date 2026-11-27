-- ISSUE-716 (ADR-046 item 8): idempotent source fork. A repeated fork request with the same source
-- and request key finds the fork the first request created; PostgreSQL treats NULL keys as
-- distinct, so a request without a key always creates a new fork.
-- AlterTable
ALTER TABLE "ApplicationWorkspace" ADD COLUMN     "forkRequestKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationWorkspace_forkedFromWorkspaceId_forkRequestKey_key" ON "ApplicationWorkspace"("forkedFromWorkspaceId", "forkRequestKey");
