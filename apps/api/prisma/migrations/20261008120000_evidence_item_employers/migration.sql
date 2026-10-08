-- AlterTable
ALTER TABLE "EvidenceItem" ADD COLUMN     "employers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
