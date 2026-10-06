/*
  Warnings:

  - You are about to drop the `components` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `prod_category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "component_entries" DROP CONSTRAINT "component_entries_componentId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_prodCategoryId_fkey";

-- DropTable
DROP TABLE "components";

-- DropTable
DROP TABLE "prod_category";

-- DropTable
DROP TABLE "products";

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_section" (
    "id" TEXT NOT NULL,
    "heading" TEXT,
    "content" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "common_section_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Component_name_key" ON "Component"("name");

-- AddForeignKey
ALTER TABLE "component_entries" ADD CONSTRAINT "component_entries_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;
