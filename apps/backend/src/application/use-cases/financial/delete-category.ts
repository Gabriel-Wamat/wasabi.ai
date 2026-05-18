import { AppError } from '../../../shared/errors/app-error'
import { ICategoryRepository } from '../../ports/outbound/category.repository'
import { ITransactionRepository } from '../../ports/outbound/transaction.repository'

interface DeleteCategoryInput {
  id: string
  userId: string
}

export class DeleteCategoryUseCase {
  constructor(
    private readonly categoryRepo: ICategoryRepository,
    private readonly transactionRepo: ITransactionRepository,
  ) {}

  async execute(input: DeleteCategoryInput): Promise<void> {
    const category = await this.categoryRepo.findById(input.id, input.userId)
    if (!category) throw AppError.notFound('Categoria')

    if (category.isDefault) {
      throw AppError.validation('Categorias padrão não podem ser removidas')
    }

    const transactionCount = await this.transactionRepo.countByCategory(input.id)
    if (transactionCount > 0) {
      throw AppError.conflict(
        `Categoria possui ${transactionCount} transação(ões) vinculada(s). Reatribua-as antes de remover.`,
      )
    }

    await this.categoryRepo.delete(input.id, input.userId)
  }
}
