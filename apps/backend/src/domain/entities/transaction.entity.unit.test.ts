import { describe, it, expect } from 'vitest'
import { Transaction } from './transaction.entity'

const base = {
  id: 't1', userId: 'u1', type: 'INCOME' as const,
  amount: 820000, categoryId: 'c1',
  description: 'Salário', date: new Date(),
  paymentMethod: 'BANK_TRANSFER' as const,
  isRecurring: false, tags: [], attachmentUrl: null,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('Transaction entity', () => {
  it('isIncome returns true for INCOME type', () => {
    const t = new Transaction(base)
    expect(t.isIncome()).toBe(true)
    expect(t.isExpense()).toBe(false)
  })

  it('isExpense returns true for EXPENSE type', () => {
    const t = new Transaction({ ...base, type: 'EXPENSE', amount: 5000 })
    expect(t.isExpense()).toBe(true)
    expect(t.isIncome()).toBe(false)
  })

  it('amountBRL converts centavos to BRL string', () => {
    const t = new Transaction(base)
    expect(t.amountBRL).toContain('8.200')
  })

  it('toJSON includes amountBRL field', () => {
    const t = new Transaction(base)
    const json = t.toJSON()
    expect(json).toHaveProperty('amountBRL')
    expect(json).toHaveProperty('amount', 820000)
  })
})
