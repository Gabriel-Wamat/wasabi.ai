import { describe, it, expect } from 'vitest'
import { FinancialGoal } from './financial-goal.entity'

const base = {
  id: 'g1', userId: 'u1', title: 'Reserva',
  targetAmount: 100000, currentAmount: 50000,
  deadline: new Date('2025-12-31'), icon: '🛡️',
  createdAt: new Date(), updatedAt: new Date(),
}

describe('FinancialGoal entity', () => {
  it('calculates progressPercent correctly', () => {
    const g = new FinancialGoal(base)
    expect(g.progressPercent).toBe(50)
  })

  it('caps progressPercent at 100', () => {
    const g = new FinancialGoal({ ...base, currentAmount: 150000 })
    expect(g.progressPercent).toBe(100)
  })

  it('calculates remaining correctly', () => {
    const g = new FinancialGoal(base)
    expect(g.remaining).toBe(50000)
  })

  it('remaining is 0 when goal met', () => {
    const g = new FinancialGoal({ ...base, currentAmount: 120000 })
    expect(g.remaining).toBe(0)
  })

  it('isCompleted is true when currentAmount >= targetAmount', () => {
    const g = new FinancialGoal({ ...base, currentAmount: 100000 })
    expect(g.isCompleted()).toBe(true)
  })

  it('isOverdue is true when deadline passed and not completed', () => {
    const past = new Date('2020-01-01')
    const g = new FinancialGoal({ ...base, deadline: past })
    expect(g.isOverdue()).toBe(true)
  })
})
