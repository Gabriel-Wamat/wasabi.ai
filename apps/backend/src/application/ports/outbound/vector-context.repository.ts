export interface VectorContextRecord {
  sourceType: string
  sourceId:   string
  content:    string
  metadata:   Record<string, unknown>
}

export interface VectorContextMatch extends VectorContextRecord {
  similarity: number
}

export interface IVectorContextRepository {
  upsert(input: VectorContextRecord & { userId: string; embedding: number[] }): Promise<void>
  search(input: { userId: string; embedding: number[]; limit: number }): Promise<VectorContextMatch[]>
}
