import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

describe('env parsing', () => {
  it('applies defaults and accepts empty optional vars', () => {
    const cfg = parseEnv({})
    expect(cfg.NODE_ENV).toBe('development')
    expect(cfg.PORT).toBeUndefined()
    expect(cfg.CORS_ORIGIN).toBeUndefined()
    expect(cfg.OLLAMA_BASE_URL).toBeUndefined()
    expect(cfg.SLACK_DIGEST_WEBHOOK_URL).toBeUndefined()
    expect(cfg.SLACK_DIGEST_ENABLED).toBeUndefined()
    expect(cfg.SLACK_DIGEST_TIMEZONE).toBe('America/Sao_Paulo')
  })

  it('validates PORT range and URL formats', () => {
    expect(() => parseEnv({ PORT: 'abc' as any })).toThrow()
    expect(() => parseEnv({ PORT: '70000' })).toThrow()
    expect(parseEnv({ PORT: '3001' }).PORT).toBe(3001)

    expect(() => parseEnv({ OLLAMA_BASE_URL: 'not-a-url' })).toThrow()
    expect(parseEnv({ OLLAMA_BASE_URL: 'http://localhost:11434' }).OLLAMA_BASE_URL).toBe('http://localhost:11434')
    expect(() => parseEnv({ SLACK_DIGEST_WEBHOOK_URL: 'not-a-url' })).toThrow()
    expect(parseEnv({ SLACK_DIGEST_WEBHOOK_URL: 'https://hooks.slack.com/services/test' }).SLACK_DIGEST_WEBHOOK_URL).toBe('https://hooks.slack.com/services/test')
    expect(parseEnv({ SLACK_DIGEST_ENABLED: 'true' }).SLACK_DIGEST_ENABLED).toBe(true)
  })
})
