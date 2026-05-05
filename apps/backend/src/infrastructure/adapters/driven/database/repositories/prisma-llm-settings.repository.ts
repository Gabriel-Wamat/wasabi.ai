import { PrismaClient } from '@prisma/client'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { uuidv7 } from 'uuidv7'
import {
  ILlmSettingsRepository,
  PublicUserLlmSettings,
  SaveUserLlmSettingsInput,
  UserLlmProvider,
  UserLlmSettings,
} from '../../../../../application/ports/outbound/llm-settings.repository'

const DEFAULTS: Record<UserLlmProvider, { model: string; baseUrl?: string }> = {
  openai:    { model: 'gpt-5.1-mini' },
  anthropic: { model: 'claude-haiku-4-5' },
  ollama:    { model: 'llama3.1' },
}

export class PrismaLlmSettingsRepository implements ILlmSettingsRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly encryptionSecret: string,
  ) {}

  async get(userId: string): Promise<UserLlmSettings | null> {
    const row = await this.prisma.userLlmSettings.findUnique({ where: { userId } })
    if (!row) return null
    const provider = normalizeProvider(row.provider)
    return {
      id:        row.id,
      userId:    row.userId,
      provider,
      model:     row.model || DEFAULTS[provider].model,
      apiKey:    row.apiKeyEncrypted ? this.decrypt(row.apiKeyEncrypted) : undefined,
      baseUrl:   row.baseUrl ?? DEFAULTS[provider].baseUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async getPublic(userId: string): Promise<PublicUserLlmSettings> {
    const row = await this.prisma.userLlmSettings.findUnique({ where: { userId } })
    if (!row) {
      return {
        provider:  'openai',
        model:     DEFAULTS.openai.model,
        hasApiKey: false,
      }
    }
    const provider = normalizeProvider(row.provider)
    return {
      provider,
      model:     row.model || DEFAULTS[provider].model,
      baseUrl:   row.baseUrl ?? DEFAULTS[provider].baseUrl,
      hasApiKey: Boolean(row.apiKeyEncrypted),
      updatedAt: row.updatedAt,
    }
  }

  async save(input: SaveUserLlmSettingsInput): Promise<PublicUserLlmSettings> {
    const provider = normalizeProvider(input.provider)
    const data = {
      provider,
      model:   input.model.trim() || DEFAULTS[provider].model,
      baseUrl: normalizeBaseUrl(input.baseUrl) ?? DEFAULTS[provider].baseUrl,
      ...(input.apiKey !== undefined
        ? { apiKeyEncrypted: input.apiKey.trim() ? this.encrypt(input.apiKey.trim()) : null }
        : {}),
    }

    const row = await this.prisma.userLlmSettings.upsert({
      where:  { userId: input.userId },
      create: { id: uuidv7(), userId: input.userId, ...data },
      update: data,
    })

    return {
      provider,
      model:     row.model,
      baseUrl:   row.baseUrl ?? DEFAULTS[provider].baseUrl,
      hasApiKey: Boolean(row.apiKeyEncrypted),
      updatedAt: row.updatedAt,
    }
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`
  }

  private decrypt(value: string): string {
    const [ivRaw, tagRaw, encryptedRaw] = value.split('.')
    if (!ivRaw || !tagRaw || !encryptedRaw) return ''
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(ivRaw, 'base64'))
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  }

  private key(): Buffer {
    return createHash('sha256').update(this.encryptionSecret).digest()
  }
}

export function normalizeProvider(value: string): UserLlmProvider {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'anthropic') return 'anthropic'
  if (normalized === 'ollama') return 'ollama'
  return 'openai'
}

function normalizeBaseUrl(value?: string): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return trimmed.replace(/\/+$/, '')
}
