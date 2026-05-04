import { FinancialCategory } from '../../../domain/entities/financial-category.entity'
import { TransactionType } from '@prisma/client'

interface ListCategoriesInput {
  userId: string
  type?: TransactionType
}

export class ListCategoriesUseCase {
  constructor(
    private readonly categoryRepo: any
  ) {}

  async execute(input: ListCategoriesInput): Promise<FinancialCategory[]> {
    return await this.categoryRepo.findByUser(input.userId, input.type)
  }
}
