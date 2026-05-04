import { describe, it, expect } from 'vitest'
import { Document } from './document.entity'

const base = {
  id: '1', userId: 'u1', type: 'PERSONAL' as const,
  category: 'CNH', title: 'CNH', number: '123',
  issuerName: 'DETRAN', issuedAt: new Date('2020-01-01'),
  fileUrl: null, tags: [], metadata: {}, company: null,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('Document entity', () => {
  it('returns NO_EXPIRY when expiresAt is null', () => {
    const doc = new Document({ ...base, expiresAt: null })
    expect(doc.status).toBe('NO_EXPIRY')
  })

  it('returns VALID when expiresAt > 30 days from now', () => {
    const future = new Date()
    future.setDate(future.getDate() + 60)
    const doc = new Document({ ...base, expiresAt: future })
    expect(doc.status).toBe('VALID')
    expect(doc.isExpired()).toBe(false)
    expect(doc.isExpiringSoon()).toBe(false)
  })

  it('returns EXPIRING_SOON when expiresAt <= 30 days from now', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 15)
    const doc = new Document({ ...base, expiresAt: soon })
    expect(doc.status).toBe('EXPIRING_SOON')
    expect(doc.isExpiringSoon()).toBe(true)
  })

  it('returns EXPIRED when expiresAt is in the past', () => {
    const past = new Date()
    past.setFullYear(past.getFullYear() - 1)
    const doc = new Document({ ...base, expiresAt: past })
    expect(doc.status).toBe('EXPIRED')
    expect(doc.isExpired()).toBe(true)
  })

  it('toJSON includes computed status field', () => {
    const doc = new Document({ ...base, expiresAt: null })
    const json = doc.toJSON()
    expect(json).toHaveProperty('status', 'NO_EXPIRY')
    expect(json).toHaveProperty('id', '1')
  })
})
