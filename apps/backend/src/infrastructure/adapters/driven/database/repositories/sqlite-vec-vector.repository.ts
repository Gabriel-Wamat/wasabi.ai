import Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
import { uuidv7 } from 'uuidv7'
import {
  IVectorContextRepository,
  VectorContextMatch,
  VectorContextRecord,
} from '../../../../../application/ports/outbound/vector-context.repository'

/**
 * Vector store local usando sqlite-vec.
 *
 * Estratégia: conexão paralela ao mesmo arquivo SQLite que o Prisma usa.
 * O Prisma cuida das tabelas regulares; aqui mantemos APENAS uma tabela
 * virtual `vec_embeddings` (vec0) que indexa o embedding por id.
 *
 * O metadado (sourceType, sourceId, content, etc.) já vive na tabela
 * Prisma `DataEmbedding`. Aqui guardamos só o vetor + o id da linha lá.
 *
 * Default dimension: 384 (compatível com all-MiniLM-L6-v2 do
 * @xenova/transformers).
 */
export class SqliteVecVectorRepository implements IVectorContextRepository {
  private db: Database.Database | null = null
  private dimension: number
  private dbFile: string

  constructor(opts: { dbFile: string; dimension?: number }) {
    this.dimension = opts.dimension ?? 384
    this.dbFile = opts.dbFile
  }

  private getDb(): Database.Database {
    if (this.db) return this.db

    const db = new Database(this.dbFile)
    this.db = db
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')

    // carrega extensão sqlite-vec
    sqliteVec.load(this.db)

    // tabela virtual de vetores; recriada se dimensão mudar
    const existing = this.db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='vec_embeddings'`)
      .get() as { name?: string } | undefined

    if (!existing?.name) {
      this.db.exec(`
        CREATE VIRTUAL TABLE vec_embeddings USING vec0(
          id TEXT PRIMARY KEY,
          embedding FLOAT[${this.dimension}]
        )
      `)
    }

    return this.db
  }

  async upsert(input: VectorContextRecord & { userId: string; embedding: number[] }): Promise<void> {
    if (input.embedding.length !== this.dimension) {
      throw new Error(`Embedding dimension mismatch: expected ${this.dimension}, got ${input.embedding.length}`)
    }

    // 1) upsert metadados na tabela Prisma DataEmbedding (via prepared SQL — sem cliente Prisma aqui).
    // Usa tabela quotada do Prisma SQLite (case-sensitive, sem aspas duplas no SQLite default).
    const db = this.getDb()
    const id = this.findOrCreateMetadataRow(input)

    // 2) substitui vetor (DELETE + INSERT é o padrão recomendado pelo sqlite-vec)
    const buf = floatsToBuffer(input.embedding)
    const tx = db.transaction(() => {
      db.prepare(`DELETE FROM vec_embeddings WHERE id = ?`).run(id)
      db.prepare(`INSERT INTO vec_embeddings(id, embedding) VALUES (?, ?)`).run(id, buf)
    })
    tx()
  }

  async search(input: { userId: string; embedding: number[]; limit: number }): Promise<VectorContextMatch[]> {
    if (input.embedding.length !== this.dimension) {
      throw new Error(`Query dimension mismatch: expected ${this.dimension}, got ${input.embedding.length}`)
    }
    const db = this.getDb()
    const buf = floatsToBuffer(input.embedding)

    // Top N por distância L2; depois filtra por userId + traz metadados.
    const candidates = db.prepare(`
      SELECT v.id, v.distance
      FROM vec_embeddings v
      WHERE v.embedding MATCH ?
        AND k = ?
      ORDER BY v.distance ASC
    `).all(buf, input.limit * 4) as Array<{ id: string; distance: number }>

    if (!candidates.length) return []

    const placeholders = candidates.map(() => '?').join(',')
    const rows = db.prepare(`
      SELECT id, sourceType, sourceId, content, metadata
      FROM DataEmbedding
      WHERE userId = ? AND id IN (${placeholders})
    `).all(input.userId, ...candidates.map(c => c.id)) as Array<{
      id:         string
      sourceType: string
      sourceId:   string
      content:    string
      metadata:   string
    }>

    const rowById = new Map(rows.map(r => [r.id, r]))
    const matches: VectorContextMatch[] = []

    for (const c of candidates) {
      const row = rowById.get(c.id)
      if (!row) continue
      const similarity = 1 / (1 + c.distance)        // mapeia distância L2 para [0,1]
      let metadata: Record<string, unknown> = {}
      try { metadata = row.metadata ? JSON.parse(row.metadata) : {} } catch { metadata = {} }
      matches.push({
        sourceType: row.sourceType,
        sourceId:   row.sourceId,
        content:    row.content,
        metadata,
        similarity,
      })
      if (matches.length >= input.limit) break
    }

    return matches
  }

  close(): void {
    try { this.db?.close() } catch { /* swallow */ }
  }

  /**
   * Insere ou atualiza a linha em DataEmbedding (gerenciada pelo Prisma)
   * via SQL direto. Retorna o id.
   */
  private findOrCreateMetadataRow(input: VectorContextRecord & { userId: string }): string {
    const db = this.getDb()
    const existing = db.prepare(`
      SELECT id FROM DataEmbedding
      WHERE userId = ? AND sourceType = ? AND sourceId = ?
    `).get(input.userId, input.sourceType, input.sourceId) as { id?: string } | undefined

    const now = new Date().toISOString()
    const metadata = JSON.stringify(input.metadata ?? {})

    if (existing?.id) {
      db.prepare(`
        UPDATE DataEmbedding
        SET content = ?, metadata = ?, updatedAt = ?
        WHERE id = ?
      `).run(input.content, metadata, now, existing.id)
      return existing.id
    }

    const id = uuidv7()
    db.prepare(`
      INSERT INTO DataEmbedding (id, userId, sourceType, sourceId, content, metadata, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.userId, input.sourceType, input.sourceId, input.content, metadata, now, now)
    return id
  }
}

function floatsToBuffer(values: number[]): Buffer {
  const buf = Buffer.alloc(values.length * 4)
  for (let i = 0; i < values.length; i++) {
    buf.writeFloatLE(values[i] ?? 0, i * 4)
  }
  return buf
}
