import Redis from 'ioredis'
import { ICacheRepository } from '../../../../application/ports/outbound/cache.repository'

export class RedisAdapter implements ICacheRepository {
  private client: Redis

  constructor(url: string) {
    this.client = new Redis(url, {
      lazyConnect:       true,
      maxRetriesPerRequest: 3,
      enableReadyCheck:  true,
    })
    this.client.on('error', err => console.error('[Redis]', err.message))
  }

  async get<T>(key: string): Promise<T | null> {
    const val = await this.client.get(key)
    if (!val) return null
    try { return JSON.parse(val) as T }
    catch { return null }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key)
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    const keys = await this.client.keys(`${prefix}*`)
    if (keys.length > 0) await this.client.del(...keys)
  }

  async disconnect(): Promise<void> {
    await this.client.quit()
  }
}
