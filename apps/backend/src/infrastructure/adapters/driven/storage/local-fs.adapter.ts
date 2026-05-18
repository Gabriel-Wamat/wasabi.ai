import { promises as fs } from 'node:fs'
import { join, dirname } from 'node:path'
import { createHmac } from 'node:crypto'
import { IStorageRepository } from '../../../../application/ports/outbound/storage.repository'

/**
 * Storage local em disco (modo Wasabi local).
 *
 * - upload(): grava em `<filesDir>/<key>`. Retorna a key.
 * - getPresignedUrl(): emite token HMAC com expiração e devolve URL relativa
 *   `/api/files/<key>?token=...&exp=...`. O backend serve essa rota com
 *   verificação de token (rota é registrada em outro lugar).
 * - delete(): remove o arquivo, ignora se não existir.
 *
 * Não há "bucket" — tudo é uma árvore de arquivos.
 */
export class LocalFsStorageAdapter implements IStorageRepository {
  constructor(
    private readonly filesDir: string,
    private readonly signingSecret: string,
    private readonly publicBaseUrl: string = '/api/files',
  ) {}

  async upload(key: string, buffer: Buffer, _mimetype: string): Promise<string> {
    const safeKey = this.sanitize(key)
    const fullPath = join(this.filesDir, safeKey)
    await fs.mkdir(dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, buffer)
    return safeKey
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const exp = Math.floor(Date.now() / 1000) + expiresIn
    const token = signToken(this.signingSecret, key, exp)
    const path = `${this.publicBaseUrl}/${encodeURIComponent(key)}?exp=${exp}&token=${token}`
    return path
  }

  async delete(key: string): Promise<void> {
    const safeKey = this.sanitize(key)
    const fullPath = join(this.filesDir, safeKey)
    try {
      await fs.unlink(fullPath)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
  }

  /** Resolve um key (validado) para path absoluto. Usado pela rota /files. */
  resolvePath(key: string): string | null {
    const safeKey = this.sanitize(key)
    const fullPath = join(this.filesDir, safeKey)
    // garante que o path resolvido continua dentro de filesDir (anti path-traversal)
    if (!fullPath.startsWith(this.filesDir)) return null
    return fullPath
  }

  /** Verifica token HMAC + expiração. */
  verifyToken(key: string, exp: number, token: string): boolean {
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false
    const expected = signToken(this.signingSecret, key, exp)
    return timingSafeEq(token, expected)
  }

  private sanitize(key: string): string {
    return key
      .replace(/^\/+/, '')
      .replace(/\.\.+/g, '_')
      .replace(/\\/g, '/')
  }
}

function signToken(secret: string, key: string, exp: number): string {
  return createHmac('sha256', secret)
    .update(`${key}|${exp}`)
    .digest('hex')
    .slice(0, 32)
}

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
