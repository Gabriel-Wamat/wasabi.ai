import { ITransactionRepository, TransactionFilters } from '../../../application/ports/outbound/transaction.repository'

export class ListTransactionsUseCase {
  constructor(private readonly transactions: ITransactionRepository) {}

  async execute(userId: string, filters: Partial<TransactionFilters> = {}) {
    const result = await this.transactions.findMany(userId, {
      ...filters,
      page:  filters.page  ?? 1,
      limit: filters.limit ?? 30,
    })
    return { ...result, data: result.data.map(t => t.toJSON()) }
  }
}
