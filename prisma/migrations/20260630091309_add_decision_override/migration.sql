-- CreateTable
CREATE TABLE "DecisionOverride" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fromDecision" "VacancyDecision" NOT NULL,
    "toDecision" "VacancyDecision" NOT NULL,
    "reasonNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionOverride_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DecisionOverride" ADD CONSTRAINT "DecisionOverride_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ApplicationWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
