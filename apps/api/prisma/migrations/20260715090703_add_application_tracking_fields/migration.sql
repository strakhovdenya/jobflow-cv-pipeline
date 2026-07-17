-- AlterTable
ALTER TABLE "ApplicationWorkspace" ADD COLUMN     "appliedAt" TIMESTAMP(3),
ADD COLUMN     "appliedVia" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionSummary" TEXT,
ADD COLUMN     "submittedCoverLetterArtifactId" TEXT,
ADD COLUMN     "submittedCvArtifactId" TEXT;
