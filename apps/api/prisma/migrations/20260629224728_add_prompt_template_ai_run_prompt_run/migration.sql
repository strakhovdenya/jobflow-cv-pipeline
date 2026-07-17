-- CreateEnum
CREATE TYPE "PromptRunStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRun" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestHash" TEXT,
    "responseHash" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "cachedInputTokens" INTEGER,
    "reasoningTokens" INTEGER,
    "usageRawJson" TEXT,
    "costEstimate" DOUBLE PRECISION,
    "costCurrency" TEXT,
    "pricingConfigVersion" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "promptStep" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "status" "PromptRunStatus" NOT NULL DEFAULT 'pending',
    "inputHash" TEXT,
    "sourceSnapshot" TEXT,
    "aiRunId" TEXT,
    "outputArtifactIds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromptRun_aiRunId_key" ON "PromptRun"("aiRunId");

-- AddForeignKey
ALTER TABLE "PromptRun" ADD CONSTRAINT "PromptRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ApplicationWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptRun" ADD CONSTRAINT "PromptRun_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PromptTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptRun" ADD CONSTRAINT "PromptRun_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "AiRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
