import { IDocumentRepository } from '../../../application/ports/outbound/document.repository'
import { AppError } from '../../../shared/errors/app-error'

export class GetDocumentUseCase {
  constructor(private readonly docs: IDocumentRepository) {}

  async execute(id: string, userId: string) {
    const doc = await this.docs.findById(id, userId)
    if (!doc) throw AppError.notFound('Documento')
    return doc.toJSON()
  }
}
