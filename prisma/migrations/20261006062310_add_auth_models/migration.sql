/*
  Warnings:

  - You are about to drop the column `lang` on the `SingleType` table. All the data in the column will be lost.
  - You are about to drop the column `localeStatus` on the `SingleType` table. All the data in the column will be lost.
  - You are about to drop the column `translationGroupId` on the `SingleType` table. All the data in the column will be lost.
  - You are about to drop the column `isSystem` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the `chat_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `faqs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `knowledge_chunks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `knowledge_media` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `knowledge_pages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `knowledge_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `knowledge_sources` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `languages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `theme_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `widget_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `workflow_settings` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `SingleType` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `action` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "chat_sessions" DROP CONSTRAINT "chat_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "knowledge_chunks" DROP CONSTRAINT "knowledge_chunks_pageId_fkey";

-- DropForeignKey
ALTER TABLE "knowledge_chunks" DROP CONSTRAINT "knowledge_chunks_sourceId_fkey";

-- DropForeignKey
ALTER TABLE "knowledge_media" DROP CONSTRAINT "knowledge_media_chunkId_fkey";

-- DropForeignKey
ALTER TABLE "knowledge_media" DROP CONSTRAINT "knowledge_media_pageId_fkey";

-- DropForeignKey
ALTER TABLE "knowledge_pages" DROP CONSTRAINT "knowledge_pages_sourceId_fkey";

-- DropIndex
DROP INDEX "SingleType_lang_idx";

-- DropIndex
DROP INDEX "SingleType_name_lang_key";

-- DropIndex
DROP INDEX "SingleType_translationGroupId_idx";

-- DropIndex
DROP INDEX "permissions_module_idx";

-- DropIndex
DROP INDEX "permissions_name_key";

-- DropIndex
DROP INDEX "roles_name_key";

-- DropIndex
DROP INDEX "sessions_refreshToken_idx";

-- DropIndex
DROP INDEX "sessions_refreshToken_key";

-- DropIndex
DROP INDEX "users_roleId_idx";

-- AlterTable
ALTER TABLE "SingleType" DROP COLUMN "lang",
DROP COLUMN "localeStatus",
DROP COLUMN "translationGroupId";

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "action" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "roles" DROP COLUMN "isSystem";

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "chat_messages";

-- DropTable
DROP TABLE "chat_sessions";

-- DropTable
DROP TABLE "faqs";

-- DropTable
DROP TABLE "knowledge_chunks";

-- DropTable
DROP TABLE "knowledge_media";

-- DropTable
DROP TABLE "knowledge_pages";

-- DropTable
DROP TABLE "knowledge_settings";

-- DropTable
DROP TABLE "knowledge_sources";

-- DropTable
DROP TABLE "languages";

-- DropTable
DROP TABLE "theme_settings";

-- DropTable
DROP TABLE "widget_settings";

-- DropTable
DROP TABLE "workflow_settings";

-- CreateTable
CREATE TABLE "blog" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "heading" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_category" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_category" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prod_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "content" TEXT,
    "prodCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BlogToBlogCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_category_slug_key" ON "blog_category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "prod_category_slug_key" ON "prod_category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "_BlogToBlogCategory_AB_unique" ON "_BlogToBlogCategory"("A", "B");

-- CreateIndex
CREATE INDEX "_BlogToBlogCategory_B_index" ON "_BlogToBlogCategory"("B");

-- CreateIndex
CREATE UNIQUE INDEX "SingleType_name_key" ON "SingleType"("name");

-- CreateIndex
CREATE INDEX "permissions_slug_idx" ON "permissions"("slug");

-- CreateIndex
CREATE INDEX "permissions_module_action_idx" ON "permissions"("module", "action");

-- CreateIndex
CREATE INDEX "roles_slug_idx" ON "roles"("slug");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_prodCategoryId_fkey" FOREIGN KEY ("prodCategoryId") REFERENCES "prod_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogToBlogCategory" ADD CONSTRAINT "_BlogToBlogCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogToBlogCategory" ADD CONSTRAINT "_BlogToBlogCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "blog_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
