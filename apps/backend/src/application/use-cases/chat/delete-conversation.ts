import { IChatRepository } from '../../ports/outbound/chat.repository'
import { AppError } from '../../../shared/errors/app-error'

export class DeleteConversationUseCase {
  constructor(private readonly chat: IChatRepository) {}

  async execute(input: { id: string; userId: string }) {
    const conv = await this.chat.findConversationById(input.id, input.userId)
    if (!conv) throw AppError.notFound('Conversa')
    await this.chat.archiveConversation(input.id, input.userId)
  }
}
