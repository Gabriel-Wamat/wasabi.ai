import { ITransactionRepository } from '../../../application/ports/outbound/transaction.repository'
import { ICacheRepository } from '../../../application/ports/outbound/cache.repository'

export type Period = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM'

interface Input {
  userId:   string
  period:   Period
  dateFrom?: Date
  dateTo?:   Date
}

function resolvePeriod(input: Input): { dateFrom: Date; dateTo: Date } {
  const now = new Date()
  switch (input.period) {
    case 'THIS_MONTH':
      return {
        dateFrom: new Date(now.getFullYear(), now.getMonth(), 1),
        dateTo:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      }
    case 'LAST_MONTH':
      return {
        dateFrom: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        dateTo:   new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      }
    case 'THIS_YEAR':
      return {
        dateFrom: new Date(now.getFullYear(), 0, 1),
        dateTo:   new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      }
    default:
      return { dateFrom: input.dateFrom!, dateTo: input.dateTo! }
  }
}

export class GetFinancialSummaryUseCase {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly cache: ICacheRepository,
  ) {}

  async execute(input: Input) {
    const cacheKey = `financial:summary:${input.userId}:${input.period}`
    const cached   = await this.cache.get<unknown>(cacheKey)
    if (cached) return cached

    const { dateFrom, dateTo } = resolvePeriod(input)
    const [sums, byCategory, cashflow] = await Promise.all([
      this.transactions.sumByPeriod(input.userId, dateFrom, dateTo),
      this.transactions.groupByCategory(input.userId, dateFrom, dateTo),
      this.transactions.cashflow(input.userId, 6),
    ])

    const summary = {
      income:     sums.income,
      expenses:   sums.expense,
      balance:    sums.income - sums.expense,
      byCategory,
      cashflow,
      dateFrom,
      dateTo,
    }

    await this.cache.set(cacheKey, summary, 300)
    return summary
  }
}
