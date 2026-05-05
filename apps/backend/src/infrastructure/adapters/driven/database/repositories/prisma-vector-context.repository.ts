import { PrismaClient } from '@prisma/client'
import { uuidv7 } from 'uuidv7'
import {
  IVectorContextRepository,
  VectorContextMatch,
  VectorContextRecord,
} from '../../../../../application/ports/outbound/vector-context.repository'

export class PrismaVectorContextRepository implements IVectorContextRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(input: VectorContextRecord & { userId: string; embedding: number[] }): Promise<void> {
    const vector = toPgVector(input.embedding)
    await this.prisma.$executeRaw`
      INSERT INTO "DataEmbedding" ("id", "userId", "sourceType", "sourceId", "content", "metadata", "embedding", "updatedAt")
      VALUES (${uuidv7()}::uuid, ${input.userId}::uuid, ${input.sourceType}, ${input.sourceId}, ${input.content}, ${input.metadata}, ${vector}::vector, NOW())
      ON CONFLICT ("userId", "sourceType", "sourceId")
      DO UPDATE SET
        "content" = EXCLUDED."content",
        "metadata" = EXCLUDED."metadata",
        "embedding" = EXCLUDED."embedding",
        "updatedAt" = NOW()
    `
  }

  async search(input: { userId: string; embedding: number[]; limit: number }): Promise<VectorContextMatch[]> {
    const vector = toPgVector(input.embedding)
    const rows = await this.prisma.$queryRaw<Array<{
      sourceType: string
      sourceId:   string
      content:    string
      metadata:   Record<string, unknown>
      similarity: number
    }>>`
      SELECT
        "sourceType",
        "sourceId",
        "content",
        "metadata",
        1 - ("embedding" <=> ${vector}::vector) AS "similarity"
      FROM "DataEmbedding"
      WHERE "userId" = ${input.userId}::uuid
        AND "embedding" IS NOT NULL
      ORDER BY "embedding" <=> ${vector}::vector
      LIMIT ${input.limit}
    `

    return rows.map(row => ({
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      content: row.content,
      metadata: row.metadata ?? {},
      similarity: Number(row.similarity),
    }))
  }
}

function toPgVector(values: number[]): string {
  return `[${values.map(value => Number.isFinite(value) ? value : 0).join(',')}]`
}
