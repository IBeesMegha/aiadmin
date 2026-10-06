/*
  Warnings:

  - You are about to drop the `CollectionEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CollectionEntry" DROP CONSTRAINT "CollectionEntry_collectionTypeId_fkey";

-- DropTable
DROP TABLE "CollectionEntry";
