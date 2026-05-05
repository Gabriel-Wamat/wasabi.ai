import { IEmbeddingRepository } from '../../../../application/ports/outbound/embedding.repository'

interface OpenAiEmbeddingResponse {
  data?: Array<{ embedding?: number[] }>
  error?: { message?: string }
}

export class OpenAiEmbeddingAdapter implements IEmbeddingRepository {
  private readonly apiKey?: string
  private readonly model: string
  private readonly baseUrl: string

  constructor(opts: { apiKey?: string; model?: string; baseUrl?: string }) {
    this.apiKey = opts.apiKey
    this.model = opts.model ?? 'text-embedding-3-small'
    this.baseUrl = opts.baseUrl ?? 'https://api.openai.com/v1'
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey)
  }

  async embed(text: string): Promise<number[]> {
    if (!this.apiKey) throw new Error('Embedding provider unavailable')

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: text.slice(0, 8000),
      }),
    })

    const body = await response.json() as OpenAiEmbeddingResponse
    if (!response.ok || body.error) {
      throw new Error(body.error?.message ?? `Embedding request failed with status ${response.status}`)
    }

    const embedding = body.data?.[0]?.embedding
    if (!embedding?.length) throw new Error('Embedding provider returned an empty vector')
    return embedding
  }
}
