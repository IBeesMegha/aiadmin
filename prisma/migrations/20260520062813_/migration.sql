-- CreateTable
CREATE TABLE "component_entries" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "component_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "component_entries_componentId_idx" ON "component_entries"("componentId");

-- AddForeignKey
ALTER TABLE "component_entries" ADD CONSTRAINT "component_entries_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;
