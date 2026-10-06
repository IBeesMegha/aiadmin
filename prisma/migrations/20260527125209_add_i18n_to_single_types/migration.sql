/*
  Warnings:

  - A unique constraint covering the columns `[name,lang]` on the table `SingleType` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `lang` to the `SingleType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `translationGroupId` to the `SingleType` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SingleType_name_key";

-- AlterTable
ALTER TABLE "SingleType" ADD COLUMN     "lang" TEXT NOT NULL,
ADD COLUMN     "localeStatus" TEXT NOT NULL DEFAULT 'published',
ADD COLUMN     "translationGroupId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "SingleType_translationGroupId_idx" ON "SingleType"("translationGroupId");

-- CreateIndex
CREATE INDEX "SingleType_lang_idx" ON "SingleType"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "SingleType_name_lang_key" ON "SingleType"("name", "lang");
