-- CreateTable
CREATE TABLE "GeneratedArtifact" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "promptRunId" TEXT,
    "artifactType" TEXT NOT NULL,
    "canonicalFileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "storageRoot" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "origin" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "downloadFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedArtifact_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GeneratedArtifact" ADD CONSTRAINT "GeneratedArtifact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ApplicationWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
