import { PrismaClient } from '@prisma/client'
import { IGoalRepository } from '../../../../../application/ports/outbound/goal.repository'
import { FinancialGoal, FinancialGoalProps } from '../../../../../domain/entities/financial-goal.entity'

function toDomain(row: any): FinancialGoal {
  return new FinancialGoal({
    id: row.id, userId: row.userId, title: row.title,
    targetAmount: row.targetAmount, currentAmount: row.currentAmount,
    deadline: row.deadline, icon: row.icon,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  })
}

export class PrismaGoalRepository implements IGoalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, userId: string): Promise<FinancialGoal | null> {
    const row = await this.prisma.financialGoal.findFirst({ where: { id, userId } })
    return row ? toDomain(row) : null
  }

  async findByUser(userId: string): Promise<FinancialGoal[]> {
    const rows = await this.prisma.financialGoal.findMany({
      where: { userId }, orderBy: { deadline: 'asc' },
    })
    return rows.map(toDomain)
  }

  async create(data: Omit<FinancialGoalProps, 'progressPercent' | 'remaining'>): Promise<FinancialGoal> {
    const row = await this.prisma.financialGoal.create({
      data: {
        id: data.id, userId: data.userId, title: data.title,
        targetAmount: data.targetAmount, currentAmount: data.currentAmount,
        deadline: data.deadline, icon: data.icon,
      },
    })
    return toDomain(row)
  }

  async update(id: string, userId: string, data: Partial<FinancialGoalProps>): Promise<FinancialGoal> {
    const result = await this.prisma.financialGoal.updateMany({
      where: { id, userId },
      data: { ...data, updatedAt: new Date() },
    })
    if (result.count === 0) throw new Error('Financial goal not found')
    const row = await this.prisma.financialGoal.findFirstOrThrow({ where: { id, userId } })
    return toDomain(row)
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.prisma.financialGoal.deleteMany({ where: { id, userId } })
  }
}
