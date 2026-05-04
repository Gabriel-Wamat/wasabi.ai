import { IDocumentRepository } from '../../../application/ports/outbound/document.repository'
import { AppError } from '../../../shared/errors/app-error'

export class UpdateDocumentUseCase {
  constructor(private readonly docs: IDocumentRepository) {}

  async execute(id: string, userId: string, data: Record<string, unknown>) {
    const existing = await this.docs.findById(id, userId)
    if (!existing) throw AppError.notFound('Documento')
    const updated = await this.docs.update(id, userId, data as any)
    return updated.toJSON()
  }
}
