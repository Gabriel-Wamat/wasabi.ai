import { IEmbeddingRepository } from '../../../../application/ports/outbound/embedding.repository'

/**
 * Adapter de embeddings 100% local usando @xenova/transformers.
 * Modelo padrão: Xenova/all-MiniLM-L6-v2 (384 dim, ~25 MB, BERT-like).
 *
 * - Lazy load: pipeline só é carregado na 1ª chamada (a tela de chat
 *   pode demorar uns segundos da 1ª vez; depois fica em memória).
 * - Sem rede após download inicial. Cache em `<modelsDir>` (configurável).
 */
export class TransformersEmbeddingAdapter implements IEmbeddingRepository {
  private pipelinePromise: Promise<EmbedFn> | null = null
  private readonly model: string
  private readonly modelsDir: string

  constructor(opts: { modelsDir: string; model?: string }) {
    this.model = opts.model ?? 'Xenova/all-MiniLM-L6-v2'
    this.modelsDir = opts.modelsDir
  }

  isAvailable(): boolean {
    return true
  }

  async embed(text: string): Promise<number[]> {
    const pipeline = await this.ensurePipeline()
    const truncated = text.slice(0, 8000)
    const output = await pipeline(truncated, { pooling: 'mean', normalize: true })
    return Array.from(output.data as Float32Array)
  }

  private ensurePipeline(): Promise<EmbedFn> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = (async () => {
        const transformers = await import('@xenova/transformers')
        // configura cache local; sem download em prod além da 1ª vez
        ;(transformers.env as { cacheDir?: string; localModelPath?: string }).cacheDir = this.modelsDir
        const pipe = await transformers.pipeline('feature-extraction', this.model)
        return pipe as unknown as EmbedFn
      })().catch(err => {
        this.pipelinePromise = null
        throw err
      })
    }
    return this.pipelinePromise
  }
}

type EmbedFn = (
  text: string,
  opts: { pooling: 'mean' | 'cls'; normalize: boolean },
) => Promise<{ data: Float32Array }>
