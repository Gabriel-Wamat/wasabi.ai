import { IChatRepository } from '../../ports/outbound/chat.repository'
import { AppError } from '../../../shared/errors/app-error'

export class GetMessagesUseCase {
  constructor(private readonly chat: IChatRepository) {}

  async execute(input: { conversationId: string; userId: string }) {
    const conv = await this.chat.findConversationById(input.conversationId, input.userId)
    if (!conv) throw AppError.notFound('Conversa')
    const messages = await this.chat.listMessages(input.conversationId, 100)
    return messages.map(m => m.toJSON())
  }
}
