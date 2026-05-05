import { IChatRepository } from '../../ports/outbound/chat.repository'
import { AppError } from '../../../shared/errors/app-error'

export class RenameConversationUseCase {
  constructor(private readonly chat: IChatRepository) {}

  async execute(input: { id: string; userId: string; title: string }) {
    const title = input.title.trim().replace(/\s+/g, ' ')
    if (!title) throw AppError.validation('Título vazio.')
    if (title.length > 100) throw AppError.validation('Título muito longo.')

    const conv = await this.chat.findConversationById(input.id, input.userId)
    if (!conv) throw AppError.notFound('Conversa')

    return await this.chat.updateConversationTitle(input.id, input.userId, title)
  }
}
