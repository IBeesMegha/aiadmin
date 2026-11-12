-- The generated table name is stored on the definition so it can be referenced
-- safely (and never re-derived from a display name) at runtime.
ALTER TABLE "SingleType" ADD COLUMN "tableName" TEXT;

-- Backfill existing definitions. Normalization matches the runtime service:
-- lower-case, hyphens become underscores, and invalid characters are collapsed
-- to underscores. This is a no-op for definitions that already have a value.
UPDATE "SingleType"
SET "tableName" = regexp_replace(lower("name"), '[^a-z0-9_]+', '_', 'g')
WHERE "tableName" IS NULL;

CREATE UNIQUE INDEX "SingleType_tableName_key" ON "SingleType"("tableName");
