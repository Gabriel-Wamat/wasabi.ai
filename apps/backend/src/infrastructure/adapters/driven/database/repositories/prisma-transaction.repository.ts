import { PrismaClient, Prisma } from '@prisma/client'
import { ITransactionRepository, TransactionFilters } from '../../../../../application/ports/outbound/transaction.repository'
import { Transaction, TransactionProps } from '../../../../../domain/entities/transaction.entity'
import { PaginatedResult, paginationToSkipTake } from '../../../../../shared/pagination/paginate'

function toDomain(row: any): Transaction {
  return new Transaction({
    id: row.id, userId: row.userId, type: row.type,
    amount: row.amount, categoryId: row.categoryId,
    description: row.description, date: row.date,
    paymentMethod: row.paymentMethod, isRecurring: row.isRecurring,
    tags: row.tags, attachmentUrl: row.attachmentUrl,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  })
}

export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, userId: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findFirst({ where: { id, userId } })
    return row ? toDomain(row) : null
  }

  async findMany(userId: string, filters: TransactionFilters): Promise<PaginatedResult<Transaction>> {
    const where: Prisma.TransactionWhereInput = { userId }
    if (filters.type)       where.type       = filters.type
    if (filters.categoryId) where.categoryId = filters.categoryId
    if (filters.dateFrom || filters.dateTo)
      where.date = { gte: filters.dateFrom, lte: filters.dateTo }
    if (filters.amountMin || filters.amountMax)
      where.amount = { gte: filters.amountMin, lte: filters.amountMax }

    const [rows, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where, orderBy: { date: 'desc' },
        ...paginationToSkipTake({ page: filters.page, limit: filters.limit }),
      }),
      this.prisma.transaction.count({ where }),
    ])
    const totalPages = Math.ceil(total / filters.limit)
    return {
      data: rows.map(toDomain),
      meta: { total, page: filters.page, limit: filters.limit, totalPages, hasNext: filters.page < totalPages, hasPrev: filters.page > 1 },
    }
  }

  async create(data: TransactionProps): Promise<Transaction> {
    const row = await this.prisma.transaction.create({
      data: {
        id: data.id, userId: data.userId, type: data.type,
        amount: data.amount, categoryId: data.categoryId,
        description: data.description, date: data.date,
        paymentMethod: data.paymentMethod, isRecurring: data.isRecurring,
        tags: data.tags, attachmentUrl: data.attachmentUrl,
      },
    })
    return toDomain(row)
  }

  async update(id: string, userId: string, data: Partial<Omit<TransactionProps, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Transaction> {
    const result = await this.prisma.transaction.updateMany({
      where: { id, userId },
      data: { ...data, updatedAt: new Date() },
    })
    if (result.count === 0) throw new Error('Transaction not found')
    const row = await this.prisma.transaction.findFirstOrThrow({ where: { id, userId } })
    return toDomain(row)
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.prisma.transaction.deleteMany({ where: { id, userId } })
  }

  async sumByPeriod(userId: string, dateFrom: Date, dateTo: Date) {
    const [income, expense] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: 'INCOME', date: { gte: dateFrom, lte: dateTo } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE', date: { gte: dateFrom, lte: dateTo } },
        _sum: { amount: true },
      }),
    ])
    return { income: income._sum.amount ?? 0, expense: expense._sum.amount ?? 0 }
  }

  async groupByCategory(userId: string, dateFrom: Date, dateTo: Date) {
    const rows = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'EXPENSE', date: { gte: dateFrom, lte: dateTo } },
      _sum: { amount: true },
    })
    const cats = await this.prisma.financialCategory.findMany({
      where: { id: { in: rows.map(r => r.categoryId) } },
    })
    return rows.map(r => {
      const cat = cats.find(c => c.id === r.categoryId)
      return {
        categoryId: r.categoryId,
        name:  cat?.name  ?? 'Outros',
        color: cat?.color ?? '#888',
        icon:  cat?.icon  ?? '💰',
        total: r._sum.amount ?? 0,
      }
    })
  }

  async cashflow(userId: string, months: number) {
    const results: Array<{ month: string; income: number; expense: number }> = []
    for (let i = months - 1; i >= 0; i--) {
      const d    = new Date()
      const from = new Date(d.getFullYear(), d.getMonth() - i, 1)
      const to   = new Date(d.getFullYear(), d.getMonth() - i + 1, 0, 23, 59, 59)
      const sums = await this.sumByPeriod(userId, from, to)
      results.push({
        month:   from.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        income:  sums.income,
        expense: sums.expense,
      })
    }
    return results
  }

  async countByCategory(categoryId: string): Promise<number> {
    return await this.prisma.transaction.count({
      where: { categoryId },
    })
  }
}
