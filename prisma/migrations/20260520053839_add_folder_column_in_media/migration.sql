-- AlterTable
ALTER TABLE "media" ADD COLUMN     "folder" TEXT;

-- CreateTable
CREATE TABLE "blog" (
    "id" TEXT NOT NULL,
    "heading" TEXT,
    "slug" TEXT,
    "content" TEXT,
    "blogCateId" TEXT,
    "thumb" TEXT,
    "media" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_cate" (
    "id" TEXT NOT NULL,
    "heading" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_cate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "blog" ADD CONSTRAINT "blog_blogCateId_fkey" FOREIGN KEY ("blogCateId") REFERENCES "blog_cate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
