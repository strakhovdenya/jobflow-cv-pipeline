-- CreateEnum
CREATE TYPE "CoverLetterDraftStatus" AS ENUM ('draft_ready', 'approved', 'edited', 'exported', 'rejected');

-- CreateTable
CREATE TABLE "CoverLetterDraft" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "promptRunId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "CoverLetterDraftStatus" NOT NULL DEFAULT 'draft_ready',
    "letterType" TEXT NOT NULL,
    "summaryPreview" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverLetterDraft_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CoverLetterDraft" ADD CONSTRAINT "CoverLetterDraft_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ApplicationWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
