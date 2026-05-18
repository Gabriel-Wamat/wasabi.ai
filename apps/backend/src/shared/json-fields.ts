/**
 * Helpers para campos que no PostgreSQL eram String[] / Json e no SQLite
 * viraram String contendo JSON.
 *
 * Centralizamos a serialização aqui pra evitar repetição nos repos.
 */

export function parseJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string')
  if (typeof raw !== 'string' || !raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

export function parseJsonObject<T extends Record<string, unknown> = Record<string, unknown>>(raw: unknown): T {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as T
  if (typeof raw !== 'string' || !raw) return {} as T
  try {
    const parsed = JSON.parse(raw)
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? (parsed as T) : ({} as T)
  } catch {
    return {} as T
  }
}

export function parseJsonAny<T = unknown>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw) return raw === undefined || raw === null ? fallback : (raw as T)
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function serializeJson(value: unknown): string {
  return JSON.stringify(value ?? null)
}
