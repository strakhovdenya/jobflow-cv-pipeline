-- ISSUE-307: the human-readable reason the last pipeline step failed (nullable, cleared on the next run).
ALTER TABLE "ApplicationWorkspace"
  ADD COLUMN "lastStepErrorStep" TEXT,
  ADD COLUMN "lastStepErrorMessage" TEXT,
  ADD COLUMN "lastStepErrorAt" TIMESTAMP(3);
