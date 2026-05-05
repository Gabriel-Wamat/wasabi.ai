import {
  ILlmRepository,
  LlmCompletionRequest,
  LlmStreamRequest,
} from '../../../../application/ports/outbound/llm.repository'

interface OllamaChunk {
  message?: { content?: string; thinking?: string }
  done?: boolean
  prompt_eval_count?: number
  eval_count?: number
  error?: string
}

const stripOllamaThinking = (text: string) => {
  let visible = text.replace(/<think>[\s\S]*?<\/think>/gi, '')

  const lastClosingThink = visible.toLowerCase().lastIndexOf('</think>')
  if (lastClosingThink >= 0) {
    visible = visible.slice(lastClosingThink + '</think>'.length)
  }

  const openThink = visible.toLowerCase().lastIndexOf('<think>')
  if (openThink >= 0) {
    visible = visible.slice(0, openThink)
  }

  return visible
}

const hasReasoningPreamble = (text: string) => (
  /\b(okay,?\s+the|the user|the instruction|instructions say|let me|i need to|i should|so the answer|chain of thought|racioc[ií]nio)\b/i.test(text)
)

const INITIAL_STREAM_GUARD_CHARS = 180

const buildOllamaSystemPrompt = (systemPrompt: string) => [
  systemPrompt,
  '',
  '/no_think',
  'Responda diretamente. Não inclua raciocínio interno, análise de instruções, cadeia de pensamento ou explicações sobre como chegou à resposta.',
].join('\n')

const buildOllamaUserMessage = (content: string) => `${content}\n\n/no_think`

const removeCommonReasoningPreamble = (text: string) => {
  const trimmed = text.trim()
  const lastOk = trimmed.match(/\bOK\b\s*$/i)
  if (lastOk && hasReasoningPreamble(trimmed)) {
    return 'OK'
  }

  if (hasReasoningPreamble(trimmed)) {
    const paragraphs = trimmed.split(/\n{2,}/).map(item => item.trim()).filter(Boolean)
    const lastParagraph = paragraphs.at(-1)
    if (lastParagraph && !hasReasoningPreamble(lastParagraph)) {
      return lastParagraph
    }
  }

  return trimmed
}

export class OllamaAdapter implements ILlmRepository {
  private readonly model: string
  private readonly baseUrl: string
  private readonly maxOutputTokens: number

  constructor(opts: { model?: string; baseUrl?: string; maxOutputTokens?: number }) {
    this.model = opts.model ?? 'llama3.1'
    this.baseUrl = (opts.baseUrl ?? 'http://localhost:11434').replace(/\/+$/, '')
    this.maxOutputTokens = opts.maxOutputTokens ?? 1024
  }

  isAvailable(): boolean {
    return Boolean(this.baseUrl && this.model)
  }

  unavailableMessage(): string {
    return 'Ollama indisponível: configure a URL local e o modelo.'
  }

  async stream(req: LlmStreamRequest): Promise<{ tokensUsed: number; fullText: string }> {
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: buildOllamaSystemPrompt(req.systemPrompt) },
            ...req.messages.map((m, index) => ({
              role: m.role,
              content: index === req.messages.length - 1 && m.role === 'user'
                ? buildOllamaUserMessage(m.content)
                : m.content,
            })),
          ],
          stream: true,
          think: false,
          options: { num_predict: this.maxOutputTokens },
        }),
        signal: req.signal,
      })
    } catch {
      throw new Error(`Não foi possível conectar ao Ollama em ${this.baseUrl}. Verifique se o Ollama está rodando e se o modelo "${this.model}" foi baixado.`)
    }

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '')
      throw new Error(errorText || `Ollama request failed with status ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let rawText = ''
    let fullText = ''
    let emittedText = ''
    let pendingText = ''
    let streamGuardResolved = false
    let suppressReasoningStream = false
    let tokensUsed = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        const chunk = JSON.parse(line) as OllamaChunk
        if (chunk.error) throw new Error(chunk.error)
        const text = chunk.message?.content
        if (text) {
          rawText += text
          if (hasReasoningPreamble(rawText.slice(0, 1200))) {
            suppressReasoningStream = true
          }
          const nextFullText = stripOllamaThinking(rawText)
          const delta = nextFullText.slice(fullText.length)
          fullText = nextFullText
          if (delta) {
            pendingText += delta
          }

          if (!streamGuardResolved && fullText.length >= INITIAL_STREAM_GUARD_CHARS) {
            streamGuardResolved = true
          }

          if (pendingText && streamGuardResolved && !suppressReasoningStream) {
            emittedText += pendingText
            try { req.onDelta(pendingText) } catch { /* noop */ }
            pendingText = ''
          }
        }
        if (chunk.done) {
          streamGuardResolved = true
          tokensUsed = (chunk.prompt_eval_count ?? 0) + (chunk.eval_count ?? 0)
        }
      }
    }

    const cleanedText = removeCommonReasoningPreamble(fullText)
    const remainingText = cleanedText.slice(emittedText.length)
    if (remainingText && (suppressReasoningStream || pendingText)) {
      try { req.onDelta(remainingText) } catch { /* noop */ }
    }

    if (req.onDone) {
      try { req.onDone(tokensUsed) } catch { /* noop */ }
    }

    return { tokensUsed, fullText: cleanedText }
  }

  async complete(req: LlmCompletionRequest): Promise<{ text: string; tokensUsed: number }> {
    const result = await this.stream({
      systemPrompt: req.systemPrompt,
      messages: req.messages,
      onDelta: () => undefined,
    })
    return { text: result.fullText, tokensUsed: result.tokensUsed }
  }
}
