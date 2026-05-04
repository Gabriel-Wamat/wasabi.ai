import { describe, it, expect } from 'vitest'
import { buildPaginatedResult, paginationToSkipTake } from './paginate'

describe('buildPaginatedResult', () => {
  it('builds correct meta', () => {
    const result = buildPaginatedResult(['a', 'b'], 10, { page: 1, limit: 2 })
    expect(result.meta.total).toBe(10)
    expect(result.meta.totalPages).toBe(5)
    expect(result.meta.hasNext).toBe(true)
    expect(result.meta.hasPrev).toBe(false)
    expect(result.data).toHaveLength(2)
  })

  it('detects last page', () => {
    const result = buildPaginatedResult(['a'], 5, { page: 3, limit: 2 })
    expect(result.meta.hasNext).toBe(false)
    expect(result.meta.hasPrev).toBe(true)
  })
})

describe('paginationToSkipTake', () => {
  it('calculates skip and take', () => {
    expect(paginationToSkipTake({ page: 1, limit: 20 })).toEqual({ skip: 0,  take: 20 })
    expect(paginationToSkipTake({ page: 2, limit: 20 })).toEqual({ skip: 20, take: 20 })
    expect(paginationToSkipTake({ page: 3, limit: 10 })).toEqual({ skip: 20, take: 10 })
  })
})
