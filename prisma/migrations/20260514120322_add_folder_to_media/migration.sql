/*
  Warnings:

  - You are about to drop the `common_section` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `component_entries` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "component_entries" DROP CONSTRAINT "component_entries_componentId_fkey";

-- DropTable
DROP TABLE "common_section";

-- DropTable
DROP TABLE "component_entries";

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "designation" TEXT,
    "teamCategoryId" TEXT,
    "profileImg" TEXT,
    "portfolioImg" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_category" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "content" TEXT,
    "testImg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blogs" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "date" TIMESTAMP(3),
    "order" DOUBLE PRECISION,
    "slug" TEXT,
    "thumb" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blogs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_teamCategoryId_fkey" FOREIGN KEY ("teamCategoryId") REFERENCES "team_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
