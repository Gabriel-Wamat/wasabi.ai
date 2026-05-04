import { AppError } from '../../../shared/errors/app-error'

interface DeleteCategoryInput {
  id: string
  userId: string
}

export class DeleteCategoryUseCase {
  constructor(
    private readonly categoryRepo: any,
    private readonly transactionRepo: any
  ) {}

  async execute(input: DeleteCategoryInput): Promise<void> {
    const category = await this.categoryRepo.findById(input.id, input.userId)
    if (!category) {
      throw AppError.notFound('Categoria')
    }

    if (category.isDefault) {
      throw AppError.validation('Não é possível deletar categorias padrão')
    }

    const hasTransactions = await this.transactionRepo.countByCategory(input.id)
    if (hasTransactions > 0) {
      throw AppError.validation('Não é possível deletar categoria com transações associadas')
    }

    await this.categoryRepo.delete(input.id, input.userId)
  }
}
