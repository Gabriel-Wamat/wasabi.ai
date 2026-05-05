import { uuidv7 } from 'uuidv7'
import { IChatRepository } from '../../ports/outbound/chat.repository'
import { ILlmRepository, LlmMessage } from '../../ports/outbound/llm.repository'
import { ICacheRepository } from '../../ports/outbound/cache.repository'
import { ILlmSettingsRepository } from '../../ports/outbound/llm-settings.repository'
import { ChatContextBuilder } from '../../services/chat-context-builder'
import { AppError } from '../../../shared/errors/app-error'
import { createLlmAdapterFromSettings } from '../../../infrastructure/adapters/driven/llm/llm-adapter.factory'

interface Input {
  userId:         string
  conversationId: string
  content:        string
  onDelta:        (text: string) => void
  onTitle?:       (title: string) => void
}

interface Output {
  messageId:  string
  tokensUsed: number
  fullText:   string
  newTitle?:  string
}

const RATE_LIMIT_PER_HOUR = 20
const HISTORY_LIMIT = 10
const MAX_INPUT_CHARS = 4000

export class SendMessageUseCase {
  constructor(
    private readonly chat:    IChatRepository,
    private readonly fallbackLlm: ILlmRepository,
    private readonly cache:       ICacheRepository,
    private readonly context:     ChatContextBuilder,
    private readonly settings:    ILlmSettingsRepository,
    private readonly env:         NodeJS.ProcessEnv,
  ) {}

  async execute(input: Input): Promise<Output> {
    const llmSettings = await this.settings.get(input.userId)
    const llm = llmSettings
      ? createLlmAdapterFromSettings(llmSettings, this.env)
      : this.fallbackLlm

    if (!llm.isAvailable()) {
      throw AppError.validation(llm.unavailableMessage())
    }

    const trimmed = input.content.trim()
    if (!trimmed) throw AppError.validation('Mensagem vazia.')
    if (trimmed.length > MAX_INPUT_CHARS) {
      throw AppError.validation(`Mensagem muito longa (máx ${MAX_INPUT_CHARS} caracteres).`)
    }

    /* Rate limit por hora */
    const rateKey = `chat:rate:${input.userId}`
    const current = (await this.cache.get<number>(rateKey)) ?? 0
    if (current >= RATE_LIMIT_PER_HOUR) {
      throw AppError.validation(`Limite de ${RATE_LIMIT_PER_HOUR} mensagens por hora atingido. Tente novamente em alguns minutos.`)
    }
    await this.cache.set(rateKey, current + 1, 3600)

    /* Conversa válida do usuário */
    const conv = await this.chat.findConversationById(input.conversationId, input.userId)
    if (!conv) throw AppError.notFound('Conversa')

    /* Persiste mensagem do usuário */
    await this.chat.createMessage({
      id:             uuidv7(),
      conversationId: input.conversationId,
      role:           'USER',
      content:        trimmed,
    })

    /* Histórico recente (últimas N — exclui a que acabamos de gravar pra montar separado) */
    const history = await this.chat.listMessages(input.conversationId, HISTORY_LIMIT + 1)

    /* System prompt (snapshot do usuário) — montado no backend e enviado ao provider ativo */
    const isLocalOllama = llmSettings?.provider === 'ollama'
    const systemPrompt = await this.context.build(input.userId, trimmed, { compact: isLocalOllama })

    /* messages[] em ordem cronológica, limitado às últimas N */
    const messages: LlmMessage[] = history
      .slice(-HISTORY_LIMIT)
      .map(m => ({
        role:    m.role === 'USER' ? 'user' : 'assistant',
        content: m.content,
      }))

    /* Streaming */
    const { fullText, tokensUsed } = await llm.stream({
      systemPrompt,
      messages,
      onDelta: input.onDelta,
    })

    /* Persiste resposta do assistant */
    const assistantMsgId = uuidv7()
    await this.chat.createMessage({
      id:             assistantMsgId,
      conversationId: input.conversationId,
      role:           'ASSISTANT',
      content:        fullText,
      tokensUsed,
    })
    await this.chat.touchConversation(input.conversationId, input.userId)

    /* Gera título se ainda for "Nova conversa" */
    let newTitle: string | undefined
    if (conv.title === 'Nova conversa') {
      newTitle = isLocalOllama ? this.generateLocalTitle(trimmed) : await this.generateTitle(llm, trimmed)
      if (newTitle) {
        await this.chat.updateConversationTitle(input.conversationId, input.userId, newTitle)
        if (input.onTitle) input.onTitle(newTitle)
      }
    }

    return { messageId: assistantMsgId, tokensUsed, fullText, newTitle }
  }

  private async generateTitle(llm: ILlmRepository, firstMessage: string): Promise<string | undefined> {
    try {
      const { text } = await llm.complete({
        systemPrompt: 'Gere um título curto (3-6 palavras, em português) que resuma a pergunta abaixo. Responda APENAS com o título, sem aspas, sem pontuação final.',
        messages: [{ role: 'user', content: firstMessage }],
        maxTokens: 30,
      })
      const cleaned = text.trim().replace(/^["'`]|["'`]$/g, '').slice(0, 60)
      return cleaned || undefined
    } catch {
      return undefined
    }
  }

  private generateLocalTitle(firstMessage: string): string {
    const cleaned = firstMessage
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return cleaned
      .split(' ')
      .filter(Boolean)
      .slice(0, 6)
      .join(' ')
      .slice(0, 60) || 'Nova conversa'
  }
}
