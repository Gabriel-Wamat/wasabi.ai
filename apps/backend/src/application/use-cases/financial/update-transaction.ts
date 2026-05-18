import { AppError } from '../../../shared/errors/app-error'
import { ICacheRepository } from '../../../application/ports/outbound/cache.repository'
import { ICategoryRepository } from '../../../application/ports/outbound/category.repository'
import { ITransactionRepository } from '../../../application/ports/outbound/transaction.repository'
import { PaymentMethod } from '../../../domain/entities/transaction.entity'

interface UpdateTransactionInput {
  id: string
  userId: string
  amount?: number
  categoryId?: string
  description?: string
  date?: Date
  paymentMethod?: PaymentMethod
  tags?: string[]
}

export class UpdateTransactionUseCase {
  constructor(
    private readonly txRepo: ITransactionRepository,
    private readonly categories: ICategoryRepository,
    private readonly cache: ICacheRepository,
  ) {}

  async execute(input: UpdateTransactionInput) {
    const tx = await this.txRepo.findById(input.id, input.userId)
    if (!tx) {
      throw AppError.notFound('Transação')
    }

    if (input.categoryId !== undefined) {
      const category = await this.categories.findById(input.categoryId, input.userId)
      if (!category) throw AppError.notFound('Categoria')
    }

    const updates: Omit<UpdateTransactionInput, 'id' | 'userId'> = {}
    if (input.amount !== undefined) updates.amount = input.amount
    if (input.categoryId !== undefined) updates.categoryId = input.categoryId
    if (input.description !== undefined) updates.description = input.description
    if (input.date !== undefined) updates.date = input.date
    if (input.paymentMethod !== undefined) updates.paymentMethod = input.paymentMethod
    if (input.tags !== undefined) updates.tags = input.tags

    const updated = await this.txRepo.update(input.id, input.userId, updates)

    await this.cache.invalidatePrefix(`financial:summary:${input.userId}`)
    await this.cache.invalidatePrefix(`dashboard:overview:${input.userId}`)

    return updated.toJSON()
  }
}
