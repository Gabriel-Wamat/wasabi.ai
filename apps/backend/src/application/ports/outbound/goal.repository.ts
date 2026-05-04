import { FinancialGoal } from '../../../domain/entities/financial-goal.entity'

export interface IGoalRepository {
  findById(id: string, userId: string): Promise<FinancialGoal | null>
  findByUser(userId: string): Promise<FinancialGoal[]>
  create(data: Omit<ReturnType<FinancialGoal['toJSON']>, 'id' | 'createdAt' | 'updatedAt' | 'progressPercent' | 'remaining'>): Promise<FinancialGoal>
  update(id: string, userId: string, data: Partial<Omit<ReturnType<FinancialGoal['toJSON']>, 'id' | 'userId' | 'createdAt' | 'progressPercent' | 'remaining'>>): Promise<FinancialGoal>
  delete(id: string, userId: string): Promise<void>
}
