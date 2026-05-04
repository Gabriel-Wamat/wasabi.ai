import { FinancialCategory } from '../../../domain/entities/financial-category.entity'
import { AppError } from '../../../shared/errors/app-error'

interface UpdateCategoryInput {
  id: string
  userId: string
  name?: string
  color?: string
  icon?: string
}

export class UpdateCategoryUseCase {
  constructor(
    private readonly categoryRepo: any
  ) {}

  async execute(input: UpdateCategoryInput): Promise<FinancialCategory> {
    const category = await this.categoryRepo.findById(input.id, input.userId)
    if (!category) {
      throw AppError.notFound('Categoria')
    }

    if (category.isDefault) {
      throw AppError.validation('Não é possível editar categorias padrão')
    }

    const updates: any = {}
    if (input.name !== undefined) updates.name = input.name
    if (input.color !== undefined) updates.color = input.color
    if (input.icon !== undefined) updates.icon = input.icon

    return await this.categoryRepo.update(input.id, input.userId, updates)
  }
}
