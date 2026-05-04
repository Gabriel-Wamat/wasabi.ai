import { Document, DocumentProps } from '../../../domain/entities/document.entity'
import { PaginatedResult } from '../../../shared/pagination/paginate'

export interface DocumentFilters {
  type?:          'PERSONAL' | 'WORK'
  category?:      string
  status?:        'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY'
  search?:        string
  tags?:          string[]
  expiresBefore?: Date
  page:           number
  limit:          number
  sort?:          'expiresAt' | 'createdAt' | 'title'
  order?:         'asc' | 'desc'
}

export interface IDocumentRepository {
  findById(id: string, userId: string): Promise<Document | null>
  findMany(userId: string, filters: DocumentFilters): Promise<PaginatedResult<Document>>
  create(data: DocumentProps): Promise<Document>
  update(id: string, userId: string, data: Partial<Omit<DocumentProps, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Document>
  delete(id: string, userId: string): Promise<void>
  findExpiringSoon(userId: string, daysAhead?: number): Promise<Document[]>
  countByUser(userId: string): Promise<number>
}
