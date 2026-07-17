-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('source_saved', 'analysis_running', 'analysis_ready', 'paused_after_analysis', 'skipped', 'cv_generation_running', 'cv_draft_ready', 'paused_after_cv_draft', 'pre_pdf_check_ready', 'paused_before_export', 'export_running', 'cv_pdf_generated', 'final_check_ready', 'ready_to_apply', 'cover_letter_generated', 'applied', 'rejected', 'archived', 'failed');

-- CreateEnum
CREATE TYPE "VacancyDecision" AS ENUM ('apply', 'maybe', 'skip', 'manual_override_apply', 'manual_override_maybe', 'manual_override_skip');

-- CreateEnum
CREATE TYPE "UserReviewState" AS ENUM ('pending_review', 'approved', 'edited', 'rejected', 'overridden');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "nameOriginal" TEXT NOT NULL,
    "companySlug" TEXT NOT NULL,
    "normalizedName" TEXT,
    "sourceType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobVacancy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "roleTitleOriginal" TEXT NOT NULL,
    "roleSlug" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "languageDetected" TEXT,
    "locationText" TEXT,
    "remoteType" TEXT,
    "employmentType" TEXT,
    "seniority" TEXT,
    "vacancyTextPath" TEXT NOT NULL,
    "vacancyTextHash" TEXT NOT NULL,
    "vacancyTextSizeBytes" INTEGER,
    "sourceFormat" TEXT,
    "originalImportedFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobVacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationWorkspace" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobVacancyId" TEXT NOT NULL,
    "workspaceSlug" TEXT NOT NULL,
    "storageRoot" TEXT NOT NULL,
    "workspacePath" TEXT NOT NULL,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'source_saved',
    "currentDecision" "VacancyDecision",
    "reviewState" "UserReviewState",
    "score" INTEGER,
    "skipReasonSummary" TEXT,
    "nextRecommendedAction" TEXT,
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdFrom" TEXT NOT NULL,
    "sourceImportedPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3),

    CONSTRAINT "ApplicationWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationWorkspace_jobVacancyId_key" ON "ApplicationWorkspace"("jobVacancyId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationWorkspace_workspaceSlug_key" ON "ApplicationWorkspace"("workspaceSlug");

-- AddForeignKey
ALTER TABLE "JobVacancy" ADD CONSTRAINT "JobVacancy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationWorkspace" ADD CONSTRAINT "ApplicationWorkspace_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationWorkspace" ADD CONSTRAINT "ApplicationWorkspace_jobVacancyId_fkey" FOREIGN KEY ("jobVacancyId") REFERENCES "JobVacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
