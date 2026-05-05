/**
 * Port para um modelo de linguagem (LLM).
 * Implementações driven: Anthropic, OpenAI ou qualquer outro provider
 * que respeite esse contrato.
 */

export interface LlmMessage {
  role:    'user' | 'assistant'
  content: string
}

export interface LlmStreamRequest {
  systemPrompt: string
  messages:     LlmMessage[]
  /** Callback para cada chunk de texto recebido. */
  onDelta:      (text: string) => void
  /** Callback ao terminar; recebe o total de tokens consumidos (input+output). */
  onDone?:      (tokensUsed: number) => void
  /** Sinal opcional para cancelar a geração. */
  signal?:      AbortSignal
}

export interface LlmCompletionRequest {
  systemPrompt: string
  messages:     LlmMessage[]
  maxTokens?:   number
}

export interface ILlmRepository {
  /**
   * Streaming completion. Chama `onDelta` por cada token/chunk.
   * Resolve quando o stream termina (após `onDone`).
   */
  stream(req: LlmStreamRequest): Promise<{ tokensUsed: number; fullText: string }>

  /**
   * Completion não-streaming, usado para tarefas curtas (ex: gerar título de conversa).
   */
  complete(req: LlmCompletionRequest): Promise<{ text: string; tokensUsed: number }>

  /** Indica se o adapter está configurado (ex: API key presente). */
  isAvailable(): boolean

  /** Mensagem segura para configuração ausente. Não deve expor segredos. */
  unavailableMessage(): string
}
