CREATE TABLE "UserLlmSettings" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'openai',
  "model" TEXT NOT NULL DEFAULT 'gpt-5-mini',
  "apiKeyEncrypted" TEXT,
  "baseUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserLlmSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserLlmSettings_userId_key" ON "UserLlmSettings"("userId");
CREATE INDEX "UserLlmSettings_userId_idx" ON "UserLlmSettings"("userId");

ALTER TABLE "UserLlmSettings"
  ADD CONSTRAINT "UserLlmSettings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
