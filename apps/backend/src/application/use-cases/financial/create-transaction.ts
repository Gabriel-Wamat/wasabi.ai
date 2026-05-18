import { uuidv7 } from 'uuidv7'
import { AppError } from '../../../shared/errors/app-error'
import { ITransactionRepository } from '../../../application/ports/outbound/transaction.repository'
import { ICacheRepository } from '../../../application/ports/outbound/cache.repository'
import { ICategoryRepository } from '../../../application/ports/outbound/category.repository'
import { TransactionType, PaymentMethod } from '../../../domain/entities/transaction.entity'

interface Input {
  userId:        string
  type:          TransactionType
  amount:        number
  categoryId:    string
  description:   string
  date:          Date
  paymentMethod?: PaymentMethod
  isRecurring?:  boolean
  tags?:         string[]
}

export class CreateTransactionUseCase {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly cache: ICacheRepository,
    private readonly categories: ICategoryRepository,
  ) {}

  async execute(input: Input) {
    const category = await this.categories.findById(input.categoryId, input.userId)
    if (!category) throw AppError.notFound('Categoria')

    const tx = await this.transactions.create({
      id:            uuidv7(),
      userId:        input.userId,
      type:          input.type,
      amount:        input.amount,
      categoryId:    input.categoryId,
      description:   input.description,
      date:          input.date,
      paymentMethod: input.paymentMethod ?? 'PIX',
      isRecurring:   input.isRecurring   ?? false,
      tags:          input.tags          ?? [],
      attachmentUrl: null,
      createdAt:     new Date(),
      updatedAt:     new Date(),
    })
    await this.cache.invalidatePrefix(`financial:summary:${input.userId}`)
    await this.cache.invalidatePrefix(`dashboard:overview:${input.userId}`)
    return tx.toJSON()
  }
}
