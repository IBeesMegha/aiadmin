/*
  Warnings:

  - You are about to drop the `Component` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `news` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_category` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "product" DROP CONSTRAINT "product_productCategoryId_fkey";

-- DropTable
DROP TABLE "Component";

-- DropTable
DROP TABLE "news";

-- DropTable
DROP TABLE "product";

-- DropTable
DROP TABLE "product_category";

-- CreateTable
CREATE TABLE "components" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_entries" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "component_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "content" TEXT,
    "description" TEXT,
    "prodCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_category" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prod_category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "components_name_key" ON "components"("name");

-- CreateIndex
CREATE INDEX "component_entries_componentId_idx" ON "component_entries"("componentId");

-- AddForeignKey
ALTER TABLE "component_entries" ADD CONSTRAINT "component_entries_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_prodCategoryId_fkey" FOREIGN KEY ("prodCategoryId") REFERENCES "prod_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
