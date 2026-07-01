/*
  Warnings:

  - Added the required column `reviewState` to the `DecisionOverride` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DecisionOverride" ADD COLUMN     "reviewState" "UserReviewState" NOT NULL;
