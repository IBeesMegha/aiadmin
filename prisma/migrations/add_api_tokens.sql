-- CreateTable
CREATE TABLE "api_tokens" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'read_only',
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_token_permissions" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "actions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_token_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_token_key" ON "api_tokens"("token");

-- CreateIndex
CREATE INDEX "api_tokens_token_idx" ON "api_tokens"("token");

-- CreateIndex
CREATE INDEX "api_tokens_type_idx" ON "api_tokens"("type");

-- CreateIndex
CREATE INDEX "api_tokens_createdById_idx" ON "api_tokens"("createdById");

-- CreateIndex
CREATE INDEX "api_token_permissions_tokenId_idx" ON "api_token_permissions"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "api_token_permissions_tokenId_resource_key" ON "api_token_permissions"("tokenId", "resource");

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_token_permissions" ADD CONSTRAINT "api_token_permissions_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "api_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
