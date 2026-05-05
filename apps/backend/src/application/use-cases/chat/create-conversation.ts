import { uuidv7 } from 'uuidv7'
import { IChatRepository } from '../../ports/outbound/chat.repository'

export class CreateConversationUseCase {
  constructor(private readonly chat: IChatRepository) {}

  async execute(input: { userId: string; title?: string }) {
    const conv = await this.chat.createConversation({
      id:     uuidv7(),
      userId: input.userId,
      title:  input.title,
    })
    return conv.toJSON()
  }
}
