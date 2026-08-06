-- AlterEnum
BEGIN;
CREATE TYPE "VacancyDecision_new" AS ENUM ('apply', 'maybe', 'skip', 'manual_override_apply', 'manual_override_maybe');
ALTER TABLE "ApplicationWorkspace" ALTER COLUMN "currentDecision" TYPE "VacancyDecision_new" USING ("currentDecision"::text::"VacancyDecision_new");
ALTER TABLE "ApplicationWorkspace" ALTER COLUMN "originalDecision" TYPE "VacancyDecision_new" USING ("originalDecision"::text::"VacancyDecision_new");
ALTER TABLE "DecisionOverride" ALTER COLUMN "fromDecision" TYPE "VacancyDecision_new" USING ("fromDecision"::text::"VacancyDecision_new");
ALTER TABLE "DecisionOverride" ALTER COLUMN "toDecision" TYPE "VacancyDecision_new" USING ("toDecision"::text::"VacancyDecision_new");
ALTER TYPE "VacancyDecision" RENAME TO "VacancyDecision_old";
ALTER TYPE "VacancyDecision_new" RENAME TO "VacancyDecision";
DROP TYPE "VacancyDecision_old";
COMMIT;
