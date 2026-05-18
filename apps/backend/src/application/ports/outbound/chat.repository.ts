import { ChatConversation } from '../../../domain/entities/chat-conversation.entity'
import { ChatMessage, ChatRole } from '../../../domain/entities/chat-message.entity'

export interface IChatRepository {
  /* Conversations */
  createConversation(input: { id: string; userId: string; title?: string }): Promise<ChatConversation>
  findConversationById(id: string, userId: string): Promise<ChatConversation | null>
  listConversations(userId: string, page: number, limit: number): Promise<{ data: ChatConversation[]; total: number }>
  updateConversationTitle(id: string, userId: string, title: string): Promise<ChatConversation>
  archiveConversation(id: string, userId: string): Promise<void>
  touchConversation(id: string, userId: string): Promise<void>
  deleteConversation(id: string, userId: string): Promise<void>

  /* Messages */
  createMessage(input: {
    id:             string
    conversationId: string
    role:           ChatRole
    content:        string
    tokensUsed?:    number | null
  }): Promise<ChatMessage>

  listMessages(conversationId: string, limit?: number): Promise<ChatMessage[]>
}
