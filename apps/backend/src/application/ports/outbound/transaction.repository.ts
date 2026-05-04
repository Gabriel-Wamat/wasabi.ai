import { Transaction, TransactionProps } from '../../../domain/entities/transaction.entity'
import { PaginatedResult } from '../../../shared/pagination/paginate'

export interface TransactionFilters {
  type?:       'INCOME' | 'EXPENSE' | 'TRANSFER'
  categoryId?: string
  dateFrom?:   Date
  dateTo?:     Date
  amountMin?:  number
  amountMax?:  number
  search?:     string
  page:        number
  limit:       number
}

export interface ITransactionRepository {
  findById(id: string, userId: string): Promise<Transaction | null>
  findMany(userId: string, filters: TransactionFilters): Promise<PaginatedResult<Transaction>>
  create(data: TransactionProps): Promise<Transaction>
  update(id: string, userId: string, data: Partial<Omit<TransactionProps, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Transaction>
  delete(id: string, userId: string): Promise<void>
  sumByPeriod(userId: string, dateFrom: Date, dateTo: Date): Promise<{ income: number; expense: number }>
  groupByCategory(userId: string, dateFrom: Date, dateTo: Date): Promise<Array<{ categoryId: string; name: string; color: string; icon: string; total: number }>>
  cashflow(userId: string, months: number): Promise<Array<{ month: string; income: number; expense: number }>>
  countByCategory(categoryId: string): Promise<number>
}
