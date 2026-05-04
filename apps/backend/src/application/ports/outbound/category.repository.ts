import { FinancialCategory } from '../../../domain/entities/financial-category.entity'
import { TransactionType } from '@prisma/client'

export interface ICategoryRepository {
  findById(id: string, userId: string): Promise<FinancialCategory | null>
  findByUser(userId: string, type?: TransactionType): Promise<FinancialCategory[]>
  create(category: FinancialCategory): Promise<FinancialCategory>
  update(id: string, userId: string, data: Partial<{ name: string; color: string; icon: string }>): Promise<FinancialCategory>
  delete(id: string, userId: string): Promise<void>
}
