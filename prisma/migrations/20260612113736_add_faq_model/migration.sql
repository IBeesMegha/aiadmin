-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "keywords" TEXT[],
    "category" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "faqs_status_idx" ON "faqs"("status");

-- CreateIndex
CREATE INDEX "faqs_category_idx" ON "faqs"("category");

-- CreateIndex
CREATE INDEX "faqs_priority_idx" ON "faqs"("priority");
