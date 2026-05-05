import {
  ILlmRepository,
  LlmCompletionRequest,
  LlmMessage,
  LlmStreamRequest,
} from '../../../../application/ports/outbound/llm.repository'

interface OpenAiStreamEvent {
  type?: string
  delta?: string
  response?: {
    usage?: {
      input_tokens?: number
      output_tokens?: number
      total_tokens?: number
    }
  }
  error?: {
    message?: string
  }
}

interface OpenAiResponse {
  output_text?: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
  }
  error?: {
    message?: string
  }
}

/**
 * OpenAI adapter backed by the Responses API.
 *
 * The app depends on ILlmRepository, so provider choice stays an env concern:
 * LLM_PROVIDER=openai, OPENAI_API_KEY, LLM_MODEL.
 */
export class OpenAiAdapter implements ILlmRepository {
  private readonly apiKey?: string
  private readonly model: string
  private readonly maxOutputTokens: number
  private readonly baseUrl: string

  constructor(opts: {
    apiKey?: string
    model?: string
    maxOutputTokens?: number
    baseUrl?: string
  }) {
    this.apiKey = opts.apiKey
    this.model = opts.model ?? 'gpt-5.1-mini'
    this.maxOutputTokens = opts.maxOutputTokens ?? 1024
    this.baseUrl = opts.baseUrl ?? 'https://api.openai.com/v1'
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey)
  }

  unavailableMessage(): string {
    return 'Assistente indisponível: configure a chave do provider LLM selecionado.'
  }

  async stream(req: LlmStreamRequest): Promise<{ tokensUsed: number; fullText: string }> {
    if (!this.apiKey) throw new Error('LLM unavailable: provider API key not configured')

    const response = await fetch(`${this.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        instructions: req.systemPrompt,
        input: this.toOpenAiInput(req.messages),
        max_output_tokens: this.maxOutputTokens,
        stream: true,
        store: false,
      }),
      signal: req.signal,
    })

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '')
      throw new Error(this.extractErrorMessage(errorText) ?? `OpenAI request failed with status ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''
    let tokensUsed = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const rawEvent of events) {
        const dataLines = rawEvent
          .split('\n')
          .filter(line => line.startsWith('data: '))
          .map(line => line.slice(6))

        if (dataLines.length === 0) continue

        const payload = dataLines.join('\n')
        if (payload === '[DONE]') continue

        const event = JSON.parse(payload) as OpenAiStreamEvent
        if (event.type === 'response.output_text.delta' && event.delta) {
          fullText += event.delta
          try { req.onDelta(event.delta) } catch { /* noop */ }
        }
        if (event.type === 'response.completed' && event.response?.usage) {
          tokensUsed = this.tokensFromUsage(event.response.usage)
        }
        if (event.type === 'error') {
          throw new Error(event.error?.message ?? 'OpenAI stream failed')
        }
      }
    }

    if (req.onDone) {
      try { req.onDone(tokensUsed) } catch { /* noop */ }
    }

    return { tokensUsed, fullText }
  }

  async complete(req: LlmCompletionRequest): Promise<{ text: string; tokensUsed: number }> {
    if (!this.apiKey) throw new Error('LLM unavailable: provider API key not configured')

    const response = await fetch(`${this.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        instructions: req.systemPrompt,
        input: this.toOpenAiInput(req.messages),
        max_output_tokens: req.maxTokens ?? 200,
        store: false,
      }),
    })

    const body = await response.json() as OpenAiResponse
    if (!response.ok || body.error) {
      throw new Error(body.error?.message ?? `OpenAI request failed with status ${response.status}`)
    }

    return {
      text: body.output_text ?? '',
      tokensUsed: body.usage ? this.tokensFromUsage(body.usage) : 0,
    }
  }

  private toOpenAiInput(messages: LlmMessage[]) {
    return messages.map(message => ({
      role: message.role,
      content: message.content,
    }))
  }

  private tokensFromUsage(usage: NonNullable<OpenAiResponse['usage']>): number {
    return usage.total_tokens ?? ((usage.input_tokens ?? 0) + (usage.output_tokens ?? 0))
  }

  private extractErrorMessage(text: string): string | undefined {
    try {
      const parsed = JSON.parse(text) as OpenAiResponse
      return parsed.error?.message
    } catch {
      return text || undefined
    }
  }
}
