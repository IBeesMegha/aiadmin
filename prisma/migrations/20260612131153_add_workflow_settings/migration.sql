-- CreateTable
CREATE TABLE "workflow_settings" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "settings" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_settings_type_key" ON "workflow_settings"("type");
