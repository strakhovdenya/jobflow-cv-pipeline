-- ISSUE-286 (step-attribution): replace ApplicationWorkspace.manualNote (single accumulating
-- string, entries joined by "\n") with a structured ManualNote table, plus ManualNoteApplication
-- to record which PromptRun(s) each note's text was actually included in.
--
-- Backfill strategy (per the issue's Key Invariants — either parse existing entries into
-- separate rows, or explicitly preserve them as one "legacy" element without attribution): this
-- migration takes the second, safer option. The old column has no reliable, unambiguous
-- delimiter between multi-line note entries (a note's own text may itself contain newlines), so
-- each non-empty existing manualNote blob becomes exactly one ManualNote row with isLegacy = true
-- and no ManualNoteApplication rows (no attribution can be reconstructed for it).

-- CreateTable
CREATE TABLE "ManualNote" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isLegacy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualNote_workspaceId_idx" ON "ManualNote"("workspaceId");

-- AddForeignKey
ALTER TABLE "ManualNote" ADD CONSTRAINT "ManualNote_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ApplicationWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: one legacy ManualNote row per workspace with a non-empty existing manualNote blob.
-- Id generated the same way Prisma's own cuid()-backed inserts would collide-avoid (md5 of a
-- random+timestamp seed) — format doesn't need to match cuid() exactly, only be a unique TEXT PK.
INSERT INTO "ManualNote" ("id", "workspaceId", "text", "isLegacy", "createdAt")
SELECT
    md5(random()::text || clock_timestamp()::text || "id"),
    "id",
    "manualNote",
    true,
    COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "ApplicationWorkspace"
WHERE "manualNote" IS NOT NULL AND btrim("manualNote") <> '';

-- AlterTable
ALTER TABLE "ApplicationWorkspace" DROP COLUMN "manualNote";

-- CreateTable
CREATE TABLE "ManualNoteApplication" (
    "id" TEXT NOT NULL,
    "manualNoteId" TEXT NOT NULL,
    "promptRunId" TEXT NOT NULL,
    "stepDetail" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualNoteApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualNoteApplication_manualNoteId_idx" ON "ManualNoteApplication"("manualNoteId");

-- CreateIndex
CREATE INDEX "ManualNoteApplication_promptRunId_idx" ON "ManualNoteApplication"("promptRunId");

-- AddForeignKey
ALTER TABLE "ManualNoteApplication" ADD CONSTRAINT "ManualNoteApplication_manualNoteId_fkey" FOREIGN KEY ("manualNoteId") REFERENCES "ManualNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualNoteApplication" ADD CONSTRAINT "ManualNoteApplication_promptRunId_fkey" FOREIGN KEY ("promptRunId") REFERENCES "PromptRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
