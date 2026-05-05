CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "DataEmbedding" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "embedding" vector(1536),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DataEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DataEmbedding_userId_sourceType_sourceId_key"
  ON "DataEmbedding"("userId", "sourceType", "sourceId");

CREATE INDEX "DataEmbedding_userId_sourceType_idx"
  ON "DataEmbedding"("userId", "sourceType");

CREATE INDEX "DataEmbedding_userId_embedding_idx"
  ON "DataEmbedding"
  USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE "DataEmbedding"
  ADD CONSTRAINT "DataEmbedding_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
