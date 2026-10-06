/*
  Warnings:

  - You are about to drop the column `folder` on the `media` table. All the data in the column will be lost.
  - You are about to drop the `blogs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `team_category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teams` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "teams" DROP CONSTRAINT "teams_teamCategoryId_fkey";

-- AlterTable
ALTER TABLE "media" DROP COLUMN "folder";

-- DropTable
DROP TABLE "blogs";

-- DropTable
DROP TABLE "team_category";

-- DropTable
DROP TABLE "teams";
