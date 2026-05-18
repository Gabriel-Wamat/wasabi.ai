import { existsSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { uuidv7 } from 'uuidv7'
import bcrypt from 'bcryptjs'
import type { PrismaClient } from '@prisma/client'
import { getPaths } from '../../shared/paths'

const SCHEMA_HASH_KEY = 'schemaHash'

/**
 * Bootstrap do app no modo local:
 * - Garante que o arquivo SQLite existe e tem o schema atual.
 * - Cria o usuário default e categorias padrão na primeira execução.
 *
 * Estratégia simples: na 1ª execução (ou quando o schema mudar), aplicamos
 * o schema via `prisma db push` (idempotente, cria tudo).
 */
export async function ensureLocalBootstrap(prisma: PrismaClient, schemaPath: string): Promise<{ defaultUserId: string }> {
  const paths = getPaths()
  const dbExists = existsSync(paths.databaseFile)

  // Em dev, schema vem do prisma/schema.prisma. No binário standalone vai
  // estar empacotado junto — vide build:sidecar (Bun embute como assets).
  const schemaContent = existsSync(schemaPath) ? readFileSync(schemaPath, 'utf-8') : ''
  const currentHash = simpleHash(schemaContent)

  const config = readConfig(paths.configFile)
  const lastHash = config[SCHEMA_HASH_KEY]

  if (!dbExists || lastHash !== currentHash) {
    await applySqliteSchema(prisma, schemaPath, paths.databaseFile)
    config[SCHEMA_HASH_KEY] = currentHash
    writeConfig(paths.configFile, config)
  }

  const userId = await ensureDefaultUser(prisma)
  await ensureDefaultCategories(prisma, userId)

  return { defaultUserId: userId }
}

function simpleHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return String(hash)
}

function readConfig(file: string): Record<string, string> {
  if (!existsSync(file)) return {}
  try { return JSON.parse(readFileSync(file, 'utf-8')) } catch { return {} }
}

function writeConfig(file: string, value: Record<string, string>): void {
  writeFileSync(file, JSON.stringify(value, null, 2))
}

async function applySqliteSchema(prisma: PrismaClient, schemaPath: string, dbFile: string): Promise<void> {
  // Em produção (binário Bun), se houver template empacotado, copiamos.
  const templatePath = join(dirname(schemaPath), 'db.template')

  if (existsSync(templatePath) && !existsSync(dbFile)) {
    copyFileSync(templatePath, dbFile)
    return
  }

  for (const statement of SQLITE_SCHEMA_SQL) {
    await prisma.$executeRawUnsafe(statement)
  }
}

const SQLITE_SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatar" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiry" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email")`,
  `CREATE TABLE IF NOT EXISTS "UserLlmSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "model" TEXT NOT NULL DEFAULT 'claude-haiku-4-5',
    "apiKeyEncrypted" TEXT,
    "baseUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserLlmSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserLlmSettings_userId_key" ON "UserLlmSettings"("userId")`,
  `CREATE INDEX IF NOT EXISTS "UserLlmSettings_userId_idx" ON "UserLlmSettings"("userId")`,
  `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token")`,
  `CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId")`,
  `CREATE INDEX IF NOT EXISTS "Session_token_idx" ON "Session"("token")`,
  `CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "number" TEXT,
    "issuerName" TEXT,
    "issuedAt" DATETIME,
    "expiresAt" DATETIME,
    "fileUrl" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "company" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Document_userId_type_idx" ON "Document"("userId", "type")`,
  `CREATE INDEX IF NOT EXISTS "Document_expiresAt_idx" ON "Document"("expiresAt")`,
  `CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "links" TEXT NOT NULL DEFAULT '[]',
    "color" TEXT NOT NULL DEFAULT '#11C76F',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Project_userId_status_idx" ON "Project"("userId", "status")`,
  `CREATE TABLE IF NOT EXISTS "FinancialCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#888888',
    "icon" TEXT NOT NULL DEFAULT '💰',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "ipcaGroup" TEXT,
    CONSTRAINT "FinancialCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "FinancialCategory_userId_type_idx" ON "FinancialCategory"("userId", "type")`,
  `CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'PIX',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "attachmentUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Transaction_userId_date_idx" ON "Transaction"("userId", "date")`,
  `CREATE INDEX IF NOT EXISTS "Transaction_userId_categoryId_idx" ON "Transaction"("userId", "categoryId")`,
  `CREATE TABLE IF NOT EXISTS "FinancialGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetAmount" INTEGER NOT NULL,
    "currentAmount" INTEGER NOT NULL DEFAULT 0,
    "deadline" DATETIME NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🎯',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "FinancialGoal_userId_idx" ON "FinancialGoal"("userId")`,
  `CREATE TABLE IF NOT EXISTS "ChatConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Nova conversa',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "archivedAt" DATETIME,
    CONSTRAINT "ChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "ChatConversation_userId_updatedAt_idx" ON "ChatConversation"("userId", "updatedAt")`,
  `CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt")`,
  `CREATE TABLE IF NOT EXISTS "DataEmbedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DataEmbedding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DataEmbedding_userId_sourceType_sourceId_key" ON "DataEmbedding"("userId", "sourceType", "sourceId")`,
  `CREATE INDEX IF NOT EXISTS "DataEmbedding_userId_sourceType_idx" ON "DataEmbedding"("userId", "sourceType")`,
]

const DEFAULT_USER_EMAIL = 'me@wasabi.local'

async function ensureDefaultUser(prisma: PrismaClient): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: DEFAULT_USER_EMAIL } })
  if (existing) return existing.id

  const passwordHash = await bcrypt.hash('local-only', 12)
  const user = await prisma.user.create({
    data: {
      id:           uuidv7(),
      name:         'Você',
      email:        DEFAULT_USER_EMAIL,
      passwordHash,
      timezone:     'America/Sao_Paulo',
      plan:         'PRO',
    },
  })
  return user.id
}

const DEFAULT_CATEGORIES = [
  { name: 'Moradia',      type: 'EXPENSE', color: '#4A90D9', icon: '🏠', ipcaGroup: '7445' },
  { name: 'Alimentação',  type: 'EXPENSE', color: '#11C76F', icon: '🛒', ipcaGroup: '7170' },
  { name: 'Transporte',   type: 'EXPENSE', color: '#FFC107', icon: '🚗', ipcaGroup: '7486' },
  { name: 'Saúde',        type: 'EXPENSE', color: '#A78BFA', icon: '❤️',  ipcaGroup: '7625' },
  { name: 'Lazer',        type: 'EXPENSE', color: '#FB923C', icon: '🎮', ipcaGroup: '7660' },
  { name: 'Assinaturas',  type: 'EXPENSE', color: '#34D399', icon: '📱', ipcaGroup: '7715' },
  { name: 'Outros',       type: 'EXPENSE', color: '#888888', icon: '💸', ipcaGroup: null  },
  { name: 'Salário',      type: 'INCOME',  color: '#11C76F', icon: '💼', ipcaGroup: null  },
  { name: 'Freelance',    type: 'INCOME',  color: '#4A90D9', icon: '💰', ipcaGroup: null  },
  { name: 'Investimentos',type: 'INCOME',  color: '#A78BFA', icon: '📈', ipcaGroup: null  },
] as const

async function ensureDefaultCategories(prisma: PrismaClient, userId: string): Promise<void> {
  const count = await prisma.financialCategory.count({ where: { userId } })
  if (count > 0) return
  await Promise.all(DEFAULT_CATEGORIES.map(c => prisma.financialCategory.create({
    data: {
      id:        uuidv7(),
      userId,
      name:      c.name,
      type:      c.type,
      color:     c.color,
      icon:      c.icon,
      ipcaGroup: c.ipcaGroup,
      isDefault: true,
    },
  })))
}
