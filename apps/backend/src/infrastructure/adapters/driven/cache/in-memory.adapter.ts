import { ICacheRepository } from '../../../../application/ports/outbound/cache.repository'

interface Entry {
  value:     unknown
  expiresAt: number
}

/**
 * Cache em memória para o modo local.
 * - TTL respeitado por `expiresAt` (ms epoch).
 * - GC preguiçoso: remove entradas expiradas no `get`.
 * - Sweep periódico opcional a cada 60s.
 */
export class InMemoryCacheAdapter implements ICacheRepository {
  private readonly store = new Map<string, Entry>()
  private sweepTimer: NodeJS.Timeout | null = null

  constructor(opts?: { sweepEverySeconds?: number }) {
    const sweepEvery = (opts?.sweepEverySeconds ?? 60) * 1000
    if (sweepEvery > 0) {
      this.sweepTimer = setInterval(() => this.sweep(), sweepEvery)
      this.sweepTimer.unref?.()
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key)
    }
  }

  async disconnect(): Promise<void> {
    if (this.sweepTimer) clearInterval(this.sweepTimer)
    this.store.clear()
  }

  private sweep(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key)
    }
  }
}
