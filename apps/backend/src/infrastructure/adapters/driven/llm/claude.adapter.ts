import Anthropic from '@anthropic-ai/sdk'
import {
  ILlmRepository,
  LlmCompletionRequest,
  LlmStreamRequest,
} from '../../../../application/ports/outbound/llm.repository'

/**
 * Anthropic Claude adapter.
 *
 * - Modelo padrão: claude-haiku-4-5 (rápido, barato).
 * - System prompt é enviado com cache_control: ephemeral (TTL ~5min).
 *   Isso reduz drasticamente o custo em conversas com múltiplas mensagens
 *   pois o context (snapshot do usuário) é reaproveitado.
 *
 * Refs:
 *   https://docs.claude.com/en/docs/build-with-claude/prompt-caching
 *   https://docs.claude.com/en/api/messages-streaming
 */
export class ClaudeAdapter implements ILlmRepository {
  private client: Anthropic | null
  private readonly model: string
  private readonly maxOutputTokens: number

  constructor(opts: { apiKey?: string; model?: string; maxOutputTokens?: number }) {
    this.model = opts.model ?? 'claude-haiku-4-5'
    this.maxOutputTokens = opts.maxOutputTokens ?? 1024
    this.client = opts.apiKey ? new Anthropic({ apiKey: opts.apiKey }) : null
  }

  isAvailable(): boolean {
    return this.client !== null
  }

  unavailableMessage(): string {
    return 'Assistente indisponível: configure a chave do provider LLM selecionado.'
  }

  async stream(req: LlmStreamRequest): Promise<{ tokensUsed: number; fullText: string }> {
    if (!this.client) throw new Error('LLM unavailable: provider API key not configured')

    const stream = this.client.messages.stream(
      {
        model:      this.model,
        max_tokens: this.maxOutputTokens,
        system: [
          {
            type: 'text',
            text: req.systemPrompt,
            cache_control: { type: 'ephemeral' },
          } as Anthropic.TextBlockParam & { cache_control: { type: 'ephemeral' } },
        ],
        messages: req.messages.map(m => ({ role: m.role, content: m.content })),
      },
      { signal: req.signal },
    )

    let fullText = ''
    stream.on('text', (delta: string) => {
      fullText += delta
      try { req.onDelta(delta) } catch { /* swallow */ }
    })

    const finalMessage = await stream.finalMessage()
    const usage = finalMessage.usage as Anthropic.Usage & {
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    }
    const tokensUsed =
      (usage?.input_tokens ?? 0) +
      (usage?.output_tokens ?? 0) +
      (usage?.cache_read_input_tokens ?? 0) +
      (usage?.cache_creation_input_tokens ?? 0)

    if (req.onDone) {
      try { req.onDone(tokensUsed) } catch { /* swallow */ }
    }

    return { tokensUsed, fullText }
  }

  async complete(req: LlmCompletionRequest): Promise<{ text: string; tokensUsed: number }> {
    if (!this.client) throw new Error('LLM unavailable: provider API key not configured')

    const response = await this.client.messages.create({
      model:      this.model,
      max_tokens: req.maxTokens ?? 200,
      system:     req.systemPrompt,
      messages:   req.messages.map(m => ({ role: m.role, content: m.content })),
    })

    const text = response.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map(block => block.text)
      .join('')

    const usage = response.usage
    const tokensUsed = (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0)

    return { text, tokensUsed }
  }
}
