import { PrismaClient } from '@prisma/client'
import { FinancialCategory } from '../../../../../domain/entities/financial-category.entity'
import { TransactionType } from '../../../../../domain/entities/transaction.entity'
import { ICategoryRepository } from '../../../../../application/ports/outbound/category.repository'

export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, userId: string): Promise<FinancialCategory | null> {
    const cat = await this.prisma.financialCategory.findFirst({
      where: { id, userId },
    })
    return cat ? this.toEntity(cat) : null
  }

  async findByUser(userId: string, type?: TransactionType): Promise<FinancialCategory[]> {
    const cats = await this.prisma.financialCategory.findMany({
      where: {
        OR: [
          { userId },
          { isDefault: true },
        ],
        ...(type && { type }),
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    })
    return cats.map(this.toEntity)
  }

  async create(category: FinancialCategory): Promise<FinancialCategory> {
    const cat = await this.prisma.financialCategory.create({
      data: {
        id: category.id,
        userId: category.userId,
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon,
        isDefault: category.isDefault,
      },
    })
    return this.toEntity(cat)
  }

  async update(id: string, userId: string, data: Partial<{ name: string; color: string; icon: string }>): Promise<FinancialCategory> {
    const result = await this.prisma.financialCategory.updateMany({
      where: { id, userId },
      data,
    })
    if (result.count === 0) throw new Error('Category not found')
    const cat = await this.prisma.financialCategory.findFirstOrThrow({ where: { id, userId } })
    return this.toEntity(cat)
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.prisma.financialCategory.deleteMany({
      where: { id, userId },
    })
  }

  private toEntity(raw: any): FinancialCategory {
    return new FinancialCategory({
      id: raw.id,
      userId: raw.userId,
      name: raw.name,
      type: raw.type,
      color: raw.color,
      icon: raw.icon,
      isDefault: raw.isDefault,
      ipcaGroup: raw.ipcaGroup,
    })
  }
}
