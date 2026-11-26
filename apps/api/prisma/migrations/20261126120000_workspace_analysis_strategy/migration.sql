-- ISSUE-713 (ADR-046): analysis strategy, experiment context profile and fork columns.
-- Every existing and new workspace defaults to the legacy strategy and the single / full profile.
-- CreateEnum
CREATE TYPE "AnalysisStrategy" AS ENUM ('legacy', 'b', 'c');

-- CreateEnum
CREATE TYPE "ContextLayout" AS ENUM ('single', 'boundary');

-- CreateEnum
CREATE TYPE "ContextSourceSet" AS ENUM ('full', 'assessment');

-- AlterTable
ALTER TABLE "ApplicationWorkspace" ADD COLUMN     "analysisStrategy" "AnalysisStrategy" NOT NULL DEFAULT 'legacy',
ADD COLUMN     "comparisonGroupId" TEXT,
ADD COLUMN     "contextLayout" "ContextLayout" NOT NULL DEFAULT 'single',
ADD COLUMN     "contextSourceSet" "ContextSourceSet" NOT NULL DEFAULT 'full',
ADD COLUMN     "forkedFromWorkspaceId" TEXT;

-- CreateIndex
CREATE INDEX "ApplicationWorkspace_comparisonGroupId_idx" ON "ApplicationWorkspace"("comparisonGroupId");

-- AddForeignKey
ALTER TABLE "ApplicationWorkspace" ADD CONSTRAINT "ApplicationWorkspace_forkedFromWorkspaceId_fkey" FOREIGN KEY ("forkedFromWorkspaceId") REFERENCES "ApplicationWorkspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

