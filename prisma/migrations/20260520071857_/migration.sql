-- CreateTable
CREATE TABLE "blogs" (
    "id" TEXT NOT NULL,
    "heading" TEXT,
    "thumb" TEXT,
    "slug" TEXT,
    "cateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cate" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_cateId_fkey" FOREIGN KEY ("cateId") REFERENCES "cate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
