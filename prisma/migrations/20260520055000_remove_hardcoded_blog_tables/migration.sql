/*
  Warnings:

  - You are about to drop the `blog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `blog_cate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "blog" DROP CONSTRAINT "blog_blogCateId_fkey";

-- DropTable
DROP TABLE "blog";

-- DropTable
DROP TABLE "blog_cate";
