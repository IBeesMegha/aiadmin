-- CreateTable
CREATE TABLE "knowledge_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "lastCrawlAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_pages" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pageTitle" TEXT,
    "textContent" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "contentLength" INTEGER NOT NULL DEFAULT 0,
    "crawlStatus" TEXT NOT NULL DEFAULT 'discovered',
    "errorMessage" TEXT,
    "lastCrawledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_sources_websiteUrl_key" ON "knowledge_sources"("websiteUrl");

-- CreateIndex
CREATE INDEX "knowledge_pages_sourceId_idx" ON "knowledge_pages"("sourceId");

-- CreateIndex
CREATE INDEX "knowledge_pages_url_idx" ON "knowledge_pages"("url");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_pages_sourceId_url_key" ON "knowledge_pages"("sourceId", "url");

-- AddForeignKey
ALTER TABLE "knowledge_pages" ADD CONSTRAINT "knowledge_pages_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
