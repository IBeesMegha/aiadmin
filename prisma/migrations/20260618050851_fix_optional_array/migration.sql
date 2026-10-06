-- CreateTable
CREATE TABLE "knowledge_media" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "chunkId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'image',
    "mediaUrl" TEXT NOT NULL,
    "altText" TEXT,
    "caption" TEXT,
    "title" TEXT,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "metadata" JSONB,
    "embedding" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_media_pageId_idx" ON "knowledge_media"("pageId");

-- CreateIndex
CREATE INDEX "knowledge_media_chunkId_idx" ON "knowledge_media"("chunkId");

-- CreateIndex
CREATE INDEX "knowledge_media_type_idx" ON "knowledge_media"("type");

-- AddForeignKey
ALTER TABLE "knowledge_media" ADD CONSTRAINT "knowledge_media_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "knowledge_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_media" ADD CONSTRAINT "knowledge_media_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "knowledge_chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
