import { PrismaClient, Prisma } from '@prisma/client'
import { IDocumentRepository, DocumentFilters } from '../../../../../application/ports/outbound/document.repository'
import { Document, DocumentProps } from '../../../../../domain/entities/document.entity'
import { PaginatedResult, paginationToSkipTake } from '../../../../../shared/pagination/paginate'

function toDomain(row: any): Document {
  return new Document({
    id:         row.id,
    userId:     row.userId,
    type:       row.type,
    category:   row.category,
    title:      row.title,
    number:     row.number,
    issuerName: row.issuerName,
    issuedAt:   row.issuedAt,
    expiresAt:  row.expiresAt,
    fileUrl:    row.fileUrl,
    tags:       row.tags,
    metadata:   row.metadata as Record<string, unknown>,
    company:    row.company,
    createdAt:  row.createdAt,
    updatedAt:  row.updatedAt,
  })
}

export class PrismaDocumentRepository implements IDocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, userId: string): Promise<Document | null> {
    const row = await this.prisma.document.findFirst({ where: { id, userId } })
    return row ? toDomain(row) : null
  }

  async findMany(userId: string, filters: DocumentFilters): Promise<PaginatedResult<Document>> {
    const where: Prisma.DocumentWhereInput = { userId }

    if (filters.type)     where.type     = filters.type
    if (filters.category) where.category = filters.category
    if (filters.search)   where.title    = { contains: filters.search, mode: 'insensitive' }
    if (filters.tags?.length) where.tags = { hasEvery: filters.tags }
    if (filters.expiresBefore) where.expiresAt = { lte: filters.expiresBefore }

    const sort  = filters.sort  ?? 'createdAt'
    const order = filters.order ?? 'desc'

    const [rows, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { [sort]: order },
        ...paginationToSkipTake({ page: filters.page, limit: filters.limit }),
      }),
      this.prisma.document.count({ where }),
    ])

    const totalPages = Math.ceil(total / filters.limit)
    return {
      data: rows.map(toDomain),
      meta: { total, page: filters.page, limit: filters.limit, totalPages, hasNext: filters.page < totalPages, hasPrev: filters.page > 1 },
    }
  }

  async create(data: DocumentProps): Promise<Document> {
    const row = await this.prisma.document.create({
      data: {
        id:         data.id,
        userId:     data.userId,
        type:       data.type,
        category:   data.category,
        title:      data.title,
        number:     data.number,
        issuerName: data.issuerName,
        issuedAt:   data.issuedAt,
        expiresAt:  data.expiresAt,
        fileUrl:    data.fileUrl,
        tags:       data.tags,
        metadata:   data.metadata as Prisma.InputJsonValue,
        company:    data.company,
      },
    })
    return toDomain(row)
  }

  async update(id: string, userId: string, data: Partial<Omit<DocumentProps, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Document> {
    const updateData: Prisma.DocumentUpdateManyMutationInput = {
      ...data,
      metadata: data.metadata as Prisma.InputJsonValue | undefined,
      updatedAt: new Date(),
    }
    const result = await this.prisma.document.updateMany({
      where: { id, userId },
      data: updateData,
    })
    if (result.count === 0) throw new Error('Document not found')
    const row = await this.prisma.document.findFirstOrThrow({ where: { id, userId } })
    return toDomain(row)
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.prisma.document.deleteMany({ where: { id, userId } })
  }

  async findExpiringSoon(userId: string, daysAhead = 30): Promise<Document[]> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + daysAhead)
    const rows = await this.prisma.document.findMany({
      where: { userId, expiresAt: { gte: new Date(), lte: cutoff } },
      orderBy: { expiresAt: 'asc' },
    })
    return rows.map(toDomain)
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.document.count({ where: { userId } })
  }
}
