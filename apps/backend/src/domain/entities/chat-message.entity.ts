export type ChatRole = 'USER' | 'ASSISTANT'

export interface ChatMessageProps {
  id:             string
  conversationId: string
  role:           ChatRole
  content:        string
  tokensUsed:     number | null
  createdAt:      Date
}

export class ChatMessage {
  constructor(private readonly props: ChatMessageProps) {}

  get id()             { return this.props.id }
  get conversationId() { return this.props.conversationId }
  get role()           { return this.props.role }
  get content()        { return this.props.content }
  get tokensUsed()     { return this.props.tokensUsed }
  get createdAt()      { return this.props.createdAt }

  toJSON() {
    return {
      id:             this.id,
      conversationId: this.conversationId,
      role:           this.role,
      content:        this.content,
      tokensUsed:     this.tokensUsed,
      createdAt:      this.createdAt.toISOString(),
    }
  }
}
