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
