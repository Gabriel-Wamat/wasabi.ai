export interface PaginationParams {
  page:  number
  limit: number
}

export interface PaginatedResult<T> {
  data:       T[]
  meta: {
    total:      number
    page:       number
    limit:      number
    totalPages: number
    hasNext:    boolean
    hasPrev:    boolean
  }
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  { page, limit }: PaginationParams,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit)
  return {
    data,
    meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  }
}

export function paginationToSkipTake({ page, limit }: PaginationParams) {
  return { skip: (page - 1) * limit, take: limit }
}
