-- AlterTable
ALTER TABLE "knowledge_pages" ADD COLUMN     "lastProcessedAt" TIMESTAMP(3),
ADD COLUMN     "processingStatus" TEXT NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "knowledge_sources" ADD COLUMN     "totalChunks" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "chunkText" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "embedding" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_settings" (
    "id" TEXT NOT NULL,
    "chunkSize" INTEGER NOT NULL DEFAULT 800,
    "chunkOverlap" INTEGER NOT NULL DEFAULT 100,
    "similarityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxSearchResults" INTEGER NOT NULL DEFAULT 10,
    "embeddingModel" TEXT NOT NULL DEFAULT 'nomic-embed-text',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_chunks_sourceId_idx" ON "knowledge_chunks"("sourceId");

-- CreateIndex
CREATE INDEX "knowledge_chunks_pageId_idx" ON "knowledge_chunks"("pageId");

-- CreateIndex
CREATE INDEX "knowledge_chunks_chunkIndex_idx" ON "knowledge_chunks"("chunkIndex");

-- CreateIndex
CREATE INDEX "knowledge_pages_processingStatus_idx" ON "knowledge_pages"("processingStatus");

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "knowledge_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
