import { IChatRepository } from '../../ports/outbound/chat.repository'

export class ListConversationsUseCase {
  constructor(private readonly chat: IChatRepository) {}

  async execute(userId: string) {
    const conversations = await this.chat.listConversations(userId)
    return conversations.map(c => c.toJSON())
  }
}
