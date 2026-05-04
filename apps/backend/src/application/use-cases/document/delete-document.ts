import { IDocumentRepository } from '../../../application/ports/outbound/document.repository'
import { AppError } from '../../../shared/errors/app-error'

export class DeleteDocumentUseCase {
  constructor(private readonly docs: IDocumentRepository) {}

  async execute(id: string, userId: string) {
    const existing = await this.docs.findById(id, userId)
    if (!existing) throw AppError.notFound('Documento')
    await this.docs.delete(id, userId)
  }
}
