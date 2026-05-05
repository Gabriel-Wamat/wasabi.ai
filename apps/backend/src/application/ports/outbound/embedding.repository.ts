export interface IEmbeddingRepository {
  embed(text: string): Promise<number[]>
  isAvailable(): boolean
}
