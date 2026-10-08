-- AlterTable
ALTER TABLE "EvidenceItem" ADD COLUMN     "employers" TEXT[] DEFAULT ARRAY[]::TEXT[];
