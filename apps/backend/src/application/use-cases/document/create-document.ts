import { uuidv7 } from 'uuidv7'
import { IDocumentRepository } from '../../../application/ports/outbound/document.repository'
import { DocumentType } from '../../../domain/entities/document.entity'

interface Input {
  userId:     string
  type:       DocumentType
  category:   string
  title:      string
  number?:    string
  issuerName?: string
  issuedAt?:  Date
  expiresAt?: Date
  company?:   string
  tags?:      string[]
  metadata?:  Record<string, unknown>
}

export class CreateDocumentUseCase {
  constructor(private readonly docs: IDocumentRepository) {}

  async execute(input: Input) {
    const doc = await this.docs.create({
      id:         uuidv7(),
      userId:     input.userId,
      type:       input.type,
      category:   input.category,
      title:      input.title,
      number:     input.number ?? null,
      issuerName: input.issuerName ?? null,
      issuedAt:   input.issuedAt ?? null,
      expiresAt:  input.expiresAt ?? null,
      fileUrl:    null,
      tags:       input.tags ?? [],
      metadata:   input.metadata ?? {},
      company:    input.company ?? null,
      createdAt:  new Date(),
      updatedAt:  new Date(),
    })
    return doc.toJSON()
  }
}
