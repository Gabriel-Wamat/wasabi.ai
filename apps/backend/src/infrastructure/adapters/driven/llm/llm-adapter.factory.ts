import { ILlmRepository } from '../../../../application/ports/outbound/llm.repository'
import { ClaudeAdapter } from './claude.adapter'
import { OllamaAdapter } from './ollama.adapter'
import { OpenAiAdapter } from './openai.adapter'
import { UserLlmProvider, UserLlmSettings } from '../../../../application/ports/outbound/llm-settings.repository'

export type LlmProvider = UserLlmProvider

export function createLlmAdapter(env: NodeJS.ProcessEnv): ILlmRepository {
  const provider = normalizeProvider(env.LLM_PROVIDER)
  const model = env.LLM_MODEL
  const maxOutputTokens = env.LLM_MAX_OUTPUT_TOKENS
    ? Number(env.LLM_MAX_OUTPUT_TOKENS)
    : undefined

  if (provider === 'openai') {
    return new OpenAiAdapter({
      apiKey: env.OPENAI_API_KEY,
      model: model ?? env.OPENAI_MODEL ?? 'gpt-5.1-mini',
      maxOutputTokens,
      baseUrl: env.OPENAI_BASE_URL,
    })
  }

  if (provider === 'ollama') {
    return new OllamaAdapter({
      model: model ?? 'llama3.1',
      baseUrl: env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      maxOutputTokens,
    })
  }

  return new ClaudeAdapter({
    apiKey: env.ANTHROPIC_API_KEY,
    model: model ?? env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
    maxOutputTokens,
  })
}

export function createLlmAdapterFromSettings(
  settings: UserLlmSettings | null,
  env: NodeJS.ProcessEnv,
): ILlmRepository {
  if (!settings) return createLlmAdapter(env)

  const maxOutputTokens = env.LLM_MAX_OUTPUT_TOKENS
    ? Number(env.LLM_MAX_OUTPUT_TOKENS)
    : undefined

  if (settings.provider === 'openai') {
    return new OpenAiAdapter({
      apiKey: settings.apiKey ?? env.OPENAI_API_KEY,
      model: settings.model || env.OPENAI_MODEL || 'gpt-5.1-mini',
      maxOutputTokens,
      baseUrl: settings.baseUrl ?? env.OPENAI_BASE_URL,
    })
  }

  if (settings.provider === 'anthropic') {
    return new ClaudeAdapter({
      apiKey: settings.apiKey ?? env.ANTHROPIC_API_KEY,
      model: settings.model || env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
      maxOutputTokens,
    })
  }

  return new OllamaAdapter({
    model: settings.model || env.OLLAMA_MODEL || 'llama3.1',
    baseUrl: settings.baseUrl ?? env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    maxOutputTokens,
  })
}

function normalizeProvider(value?: string): LlmProvider {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'openai') return 'openai'
  if (normalized === 'ollama') return 'ollama'
  return 'anthropic'
}
