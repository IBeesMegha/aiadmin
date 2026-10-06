-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alternativeText" TEXT,
    "caption" TEXT,
    "url" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "ext" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "date" TIMESTAMP(3),
    "subHeading" TEXT,
    "thumb" TEXT,
    "images" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "code" DOUBLE PRECISION,
    "productCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_category" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_category_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "product_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
