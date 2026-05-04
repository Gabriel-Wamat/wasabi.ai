import { AppError } from '../../../shared/errors/app-error'
import { ICacheRepository } from '../../../application/ports/outbound/cache.repository'
import { ITransactionRepository } from '../../../application/ports/outbound/transaction.repository'

interface DeleteTransactionInput {
  id: string
  userId: string
}

export class DeleteTransactionUseCase {
  constructor(
    private readonly txRepo: ITransactionRepository,
    private readonly cache: ICacheRepository,
  ) {}

  async execute(input: DeleteTransactionInput): Promise<void> {
    const tx = await this.txRepo.findById(input.id, input.userId)
    if (!tx) {
      throw AppError.notFound('Transação')
    }

    await this.txRepo.delete(input.id, input.userId)

    await this.cache.invalidatePrefix(`financial:summary:${input.userId}`)
    await this.cache.invalidatePrefix(`dashboard:overview:${input.userId}`)
  }
}
