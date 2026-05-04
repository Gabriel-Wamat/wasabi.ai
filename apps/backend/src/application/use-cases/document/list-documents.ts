import { IDocumentRepository, DocumentFilters } from '../../../application/ports/outbound/document.repository'

export class ListDocumentsUseCase {
  constructor(private readonly docs: IDocumentRepository) {}

  async execute(userId: string, filters: Omit<DocumentFilters, 'page' | 'limit'> & { page?: number; limit?: number }) {
    const result = await this.docs.findMany(userId, {
      ...filters,
      page:  filters.page  ?? 1,
      limit: filters.limit ?? 20,
    })

    if (filters.status) {
      const filtered = result.data.filter(d => d.status === filters.status)
      return { ...result, data: filtered.map(d => d.toJSON()) }
    }

    return { ...result, data: result.data.map(d => d.toJSON()) }
  }
}
