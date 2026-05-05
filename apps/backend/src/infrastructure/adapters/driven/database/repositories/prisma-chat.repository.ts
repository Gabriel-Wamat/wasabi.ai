import { PrismaClient } from '@prisma/client'
import { IChatRepository } from '../../../../../application/ports/outbound/chat.repository'
import { ChatConversation } from '../../../../../domain/entities/chat-conversation.entity'
import { ChatMessage, ChatRole } from '../../../../../domain/entities/chat-message.entity'

function toConv(row: any): ChatConversation {
  return new ChatConversation({
    id:         row.id,
    userId:     row.userId,
    title:      row.title,
    createdAt:  row.createdAt,
    updatedAt:  row.updatedAt,
    archivedAt: row.archivedAt,
  })
}

function toMsg(row: any): ChatMessage {
  return new ChatMessage({
    id:             row.id,
    conversationId: row.conversationId,
    role:           row.role,
    content:        row.content,
    tokensUsed:     row.tokensUsed,
    createdAt:      row.createdAt,
  })
}

export class PrismaChatRepository implements IChatRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createConversation(input: { id: string; userId: string; title?: string }): Promise<ChatConversation> {
    const row = await this.prisma.chatConversation.create({
      data: { id: input.id, userId: input.userId, title: input.title ?? 'Nova conversa' },
    })
    return toConv(row)
  }

  async findConversationById(id: string, userId: string): Promise<ChatConversation | null> {
    const row = await this.prisma.chatConversation.findFirst({ where: { id, userId, archivedAt: null } })
    return row ? toConv(row) : null
  }

  async listConversations(userId: string): Promise<ChatConversation[]> {
    const rows = await this.prisma.chatConversation.findMany({
      where: { userId, archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })
    return rows.map(toConv)
  }

  async updateConversationTitle(id: string, userId: string, title: string): Promise<ChatConversation> {
    const result = await this.prisma.chatConversation.updateMany({
      where: { id, userId, archivedAt: null },
      data:  { title, updatedAt: new Date() },
    })
    if (result.count === 0) throw new Error('Conversation not found')
    const row = await this.prisma.chatConversation.findFirstOrThrow({ where: { id, userId } })
    return toConv(row)
  }

  async touchConversation(id: string, userId: string): Promise<void> {
    await this.prisma.chatConversation.updateMany({
      where: { id, userId, archivedAt: null },
      data:  { updatedAt: new Date() },
    })
  }

  async archiveConversation(id: string, userId: string): Promise<void> {
    await this.prisma.chatConversation.updateMany({
      where: { id, userId, archivedAt: null },
      data:  { archivedAt: new Date() },
    })
  }

  async deleteConversation(id: string, userId: string): Promise<void> {
    await this.prisma.chatConversation.deleteMany({ where: { id, userId } })
  }

  async createMessage(input: {
    id:             string
    conversationId: string
    role:           ChatRole
    content:        string
    tokensUsed?:    number | null
  }): Promise<ChatMessage> {
    const row = await this.prisma.chatMessage.create({
      data: {
        id:             input.id,
        conversationId: input.conversationId,
        role:           input.role,
        content:        input.content,
        tokensUsed:     input.tokensUsed ?? null,
      },
    })
    return toMsg(row)
  }

  async listMessages(conversationId: string, limit: number = 50): Promise<ChatMessage[]> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.reverse().map(toMsg)
  }
}
