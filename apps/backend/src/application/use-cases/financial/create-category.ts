import { uuidv7 } from 'uuidv7'
import { FinancialCategory } from '../../../domain/entities/financial-category.entity'
import { TransactionType } from '@prisma/client'

interface CreateCategoryInput {
  userId: string
  name: string
  type: TransactionType
  color?: string
  icon?: string
}

export class CreateCategoryUseCase {
  constructor(
    private readonly categoryRepo: any
  ) {}

  async execute(input: CreateCategoryInput): Promise<FinancialCategory> {
    const category = new FinancialCategory({
      id: uuidv7(),
      userId: input.userId,
      name: input.name,
      type: input.type,
      color: input.color ?? '#888888',
      icon: input.icon ?? '💰',
      isDefault: false,
    })

    return await this.categoryRepo.create(category)
  }
}
