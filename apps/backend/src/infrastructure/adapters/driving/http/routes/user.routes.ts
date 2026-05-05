import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Container } from '../../../../../infrastructure/container'
import { authMiddleware, getUserId } from '../middlewares/auth.middleware'
import { createLlmAdapterFromSettings } from '../../../driven/llm/llm-adapter.factory'
import { UserLlmProvider, UserLlmSettings } from '../../../../../application/ports/outbound/llm-settings.repository'

const updateProfileBody = z.object({
  name:     z.string().min(2).max(100).optional(),
  timezone: z.string().optional(),
  avatar:   z.string().url().optional(),
})

const changePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8).max(100),
})

const llmProviderSchema = z.enum(['openai', 'anthropic', 'ollama'])

const llmSettingsBody = z.object({
  provider: llmProviderSchema,
  model:    z.string().trim().min(1).max(120),
  apiKey:   z.string().max(5000).optional(),
  baseUrl:  z.union([z.string().url(), z.literal('')]).optional(),
})

const ollamaModelsQuery = z.object({
  baseUrl: z.union([z.string().url(), z.literal('')]).optional(),
})

const OLLAMA_FALLBACK_URLS = [
  'http://localhost:11434',
  'http://127.0.0.1:11434',
  'http://host.docker.internal:11434',
]

interface OllamaTagsResponse {
  models?: Array<{
    name?: string
    model?: string
    modified_at?: string
    size?: number
    details?: {
      family?: string
      parameter_size?: string
      quantization_level?: string
    }
  }>
}

export async function userRoutes(app: FastifyInstance, { container }: { container: Container }) {
  app.addHook('onRequest', authMiddleware)

  app.get('/me', async (req, reply) => {
    const userId = getUserId(req)
    const user = await container.getProfile.execute({ userId })
    return reply.send({ data: user.toPublic() })
  })

  app.put('/me', async (req, reply) => {
    const userId = getUserId(req)
    const body = updateProfileBody.parse(req.body)
    const user = await container.updateProfile.execute({ userId, ...body })
    return reply.send({ data: user.toPublic() })
  })

  app.post('/me/change-password', async (req, reply) => {
    const userId = getUserId(req)
    const body = changePasswordBody.parse(req.body)
    await container.changePassword.execute({ userId, ...body })
    return reply.send({ data: { success: true } })
  })

  app.get('/me/llm-settings', async (req, reply) => {
    const userId = getUserId(req)
    const settings = await container.llmSettingsRepo.getPublic(userId)
    return reply.send({ data: settings })
  })

  app.get('/me/llm-settings/ollama-models', async (req, reply) => {
    const userId = getUserId(req)
    const query = ollamaModelsQuery.parse(req.query)
    const current = await container.llmSettingsRepo.get(userId)
    const candidates = uniqueUrls([
      query.baseUrl,
      current?.baseUrl,
      process.env.OLLAMA_BASE_URL,
      ...OLLAMA_FALLBACK_URLS,
    ])

    for (const baseUrl of candidates) {
      try {
        const data = await fetchOllamaModels(baseUrl)
        return reply.send({
          data: {
            available: true,
            baseUrl,
            models: (data.models ?? [])
              .map(item => ({
                name: item.name ?? item.model ?? '',
                model: item.model ?? item.name ?? '',
                modifiedAt: item.modified_at ?? null,
                size: item.size ?? null,
                family: item.details?.family ?? null,
                parameterSize: item.details?.parameter_size ?? null,
                quantizationLevel: item.details?.quantization_level ?? null,
              }))
              .filter(item => item.name),
          },
        })
      } catch {
        // Try the next candidate. The UI can still offer manual setup if all fail.
      }
    }

    return reply.send({
      data: {
        available: false,
        baseUrl: null,
        models: [],
      },
    })
  })

  app.put('/me/llm-settings', async (req, reply) => {
    const userId = getUserId(req)
    const body = llmSettingsBody.parse(req.body)
    const settings = await container.llmSettingsRepo.save({
      userId,
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl || undefined,
    })

    return reply.send({ data: settings })
  })

  app.post('/me/llm-settings/test', async (req, reply) => {
    const userId = getUserId(req)
    const body = llmSettingsBody.parse(req.body)
    const current = await container.llmSettingsRepo.get(userId)
    const tempSettings: UserLlmSettings = {
      id: current?.id ?? 'test',
      userId,
      provider: body.provider as UserLlmProvider,
      model: body.model,
      apiKey: body.apiKey || current?.apiKey,
      baseUrl: body.baseUrl || current?.baseUrl,
      createdAt: current?.createdAt ?? new Date(),
      updatedAt: new Date(),
    }

    if (tempSettings.provider === 'ollama') {
      const candidates = uniqueUrls([
        body.baseUrl,
        current?.baseUrl,
        process.env.OLLAMA_BASE_URL,
        ...OLLAMA_FALLBACK_URLS,
      ])

      let lastError = ''
      for (const baseUrl of candidates) {
        const candidateSettings = { ...tempSettings, baseUrl }
        const llm = createLlmAdapterFromSettings(candidateSettings, process.env)
        try {
          const result = await llm.complete({
            systemPrompt: 'Responda apenas OK.',
            messages: [{ role: 'user', content: 'Teste de conexão' }],
            maxTokens: 12,
          })

          return reply.send({
            data: {
              ok: true,
              provider: body.provider,
              model: body.model,
              baseUrl,
              text: result.text,
            },
          })
        } catch (error) {
          lastError = (error as Error).message
        }
      }

      return reply.status(400).send({
        error: {
          message: lastError || 'Não foi possível conectar ao Ollama. Abra o Ollama e baixe o modelo selecionado.',
        },
      })
    }

    const llm = createLlmAdapterFromSettings(tempSettings, process.env)
    if (!llm.isAvailable()) {
      return reply.status(400).send({
        error: { message: llm.unavailableMessage() },
      })
    }

    try {
      const result = await llm.complete({
        systemPrompt: 'Responda apenas OK.',
        messages: [{ role: 'user', content: 'Teste de conexão' }],
        maxTokens: 12,
      })

      return reply.send({
        data: {
          ok: true,
          provider: body.provider,
          model: body.model,
          text: result.text,
        },
      })
    } catch (error) {
      return reply.status(400).send({
        error: {
          message: (error as Error).message || 'Não foi possível conectar ao provider selecionado.',
        },
      })
    }
  })
}

function uniqueUrls(values: Array<string | undefined>): string[] {
  return Array.from(new Set(
    values
      .map(value => value?.trim().replace(/\/+$/, ''))
      .filter((value): value is string => Boolean(value)),
  ))
}

async function fetchOllamaModels(baseUrl: string): Promise<OllamaTagsResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Ollama respondeu HTTP ${response.status}`)
    }
    return await response.json() as OllamaTagsResponse
  } finally {
    clearTimeout(timeout)
  }
}
