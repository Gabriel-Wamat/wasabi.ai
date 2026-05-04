export interface ICacheRepository {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>
  delete(key: string): Promise<void>
  invalidatePrefix(prefix: string): Promise<void>
}
