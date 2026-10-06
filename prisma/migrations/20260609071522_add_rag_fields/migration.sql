-- AlterTable
ALTER TABLE "knowledge_chunks" ADD COLUMN     "sectionHeading" TEXT;

-- AlterTable
ALTER TABLE "knowledge_settings" ADD COLUMN     "llmModel" TEXT NOT NULL DEFAULT 'Qwen/Qwen3-8B-Instruct',
ADD COLUMN     "rerankerModel" TEXT NOT NULL DEFAULT 'BAAI/bge-reranker-base',
ALTER COLUMN "chunkSize" SET DEFAULT 500,
ALTER COLUMN "chunkOverlap" SET DEFAULT 50,
ALTER COLUMN "embeddingModel" SET DEFAULT 'BAAI/bge-base-en-v1.5';
