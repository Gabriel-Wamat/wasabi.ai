-- Add IPCA mapping for expense categories.
ALTER TABLE "FinancialCategory" ADD COLUMN "ipcaGroup" TEXT;

-- Chat with user data.
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE "ChatConversation" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Nova conversa',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
  "id" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "role" "ChatRole" NOT NULL,
  "content" TEXT NOT NULL,
  "tokensUsed" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatConversation_userId_updatedAt_idx"
  ON "ChatConversation"("userId", "updatedAt" DESC);

CREATE INDEX "ChatMessage_conversationId_createdAt_idx"
  ON "ChatMessage"("conversationId", "createdAt");

ALTER TABLE "ChatConversation"
  ADD CONSTRAINT "ChatConversation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatMessage"
  ADD CONSTRAINT "ChatMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
