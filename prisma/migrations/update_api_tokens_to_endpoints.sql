-- Drop old table
DROP TABLE IF EXISTS "api_token_permissions";

-- CreateTable
CREATE TABLE IF NOT EXISTS "api_token_endpoints" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_token_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_token_endpoints_tokenId_idx" ON "api_token_endpoints"("tokenId");

-- CreateIndex
CREATE INDEX "api_token_endpoints_module_idx" ON "api_token_endpoints"("module");

-- CreateIndex
CREATE UNIQUE INDEX "api_token_endpoints_tokenId_endpoint_method_key" ON "api_token_endpoints"("tokenId", "endpoint", "method");

-- AddForeignKey
ALTER TABLE "api_token_endpoints" ADD CONSTRAINT "api_token_endpoints_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "api_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
