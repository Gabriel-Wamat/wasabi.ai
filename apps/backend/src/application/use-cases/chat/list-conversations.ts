import { IChatRepository } from '../../ports/outbound/chat.repository'

export class ListConversationsUseCase {
  constructor(private readonly chat: IChatRepository) {}

  async execute(userId: string, page = 1, limit = 20) {
    const { data, total } = await this.chat.listConversations(userId, page, limit)
    const totalPages = Math.ceil(total / limit)
    return {
      data: data.map(c => c.toJSON()),
      meta: { total, page, limit, totalPages },
    }
  }
}
