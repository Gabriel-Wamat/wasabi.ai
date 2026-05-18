import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .transform(v => Number(v))
    .optional()
    .refine(v => v === undefined || (Number.isInteger(v) && v > 0 && v < 65536), 'Invalid PORT'),
  CORS_ORIGIN: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  OLLAMA_BASE_URL: z
    .string()
    .url({ message: 'OLLAMA_BASE_URL must be a valid URL' })
    .optional(),
  SLACK_DIGEST_WEBHOOK_URL: z
    .string()
    .url({ message: 'SLACK_DIGEST_WEBHOOK_URL must be a valid URL' })
    .optional(),
  SLACK_DIGEST_ENABLED: z
    .string()
    .transform(v => v.toLowerCase() === 'true')
    .optional(),
  SLACK_DIGEST_TIMEZONE: z.string().default('America/Sao_Paulo'),
})

export type Env = z.infer<typeof EnvSchema>

export function parseEnv(src: Record<string, string | undefined>): Env {
  // Clone only known keys to avoid accidentally exposing unexpected vars
  const input: Record<string, string | undefined> = {
    NODE_ENV: src.NODE_ENV,
    PORT: src.PORT,
    CORS_ORIGIN: src.CORS_ORIGIN,
    DATABASE_URL: src.DATABASE_URL,
    JWT_SECRET: src.JWT_SECRET,
    OLLAMA_BASE_URL: src.OLLAMA_BASE_URL,
    SLACK_DIGEST_WEBHOOK_URL: src.SLACK_DIGEST_WEBHOOK_URL,
    SLACK_DIGEST_ENABLED: src.SLACK_DIGEST_ENABLED,
    SLACK_DIGEST_TIMEZONE: src.SLACK_DIGEST_TIMEZONE,
  }
  return EnvSchema.parse(input)
}

export const env = parseEnv(process.env)
