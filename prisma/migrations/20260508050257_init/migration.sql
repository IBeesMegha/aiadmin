-- CreateTable
CREATE TABLE "CollectionType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SingleType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SingleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionEntry" (
    "id" TEXT NOT NULL,
    "collectionTypeId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectionType_name_key" ON "CollectionType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SingleType_name_key" ON "SingleType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Component_name_key" ON "Component"("name");

-- CreateIndex
CREATE INDEX "CollectionEntry_collectionTypeId_idx" ON "CollectionEntry"("collectionTypeId");

-- AddForeignKey
ALTER TABLE "CollectionEntry" ADD CONSTRAINT "CollectionEntry_collectionTypeId_fkey" FOREIGN KEY ("collectionTypeId") REFERENCES "CollectionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
