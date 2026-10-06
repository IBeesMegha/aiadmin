/*
  Warnings:

  - You are about to drop the `blogs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "blogs" DROP CONSTRAINT "blogs_cateId_fkey";

-- DropTable
DROP TABLE "blogs";

-- DropTable
DROP TABLE "cate";
