export interface ChatConversationProps {
  id:         string
  userId:     string
  title:      string
  createdAt:  Date
  updatedAt:  Date
  archivedAt: Date | null
}

export class ChatConversation {
  constructor(private readonly props: ChatConversationProps) {}

  get id()         { return this.props.id }
  get userId()     { return this.props.userId }
  get title()      { return this.props.title }
  get createdAt()  { return this.props.createdAt }
  get updatedAt()  { return this.props.updatedAt }
  get archivedAt() { return this.props.archivedAt }

  toJSON() {
    return {
      id:         this.id,
      userId:     this.userId,
      title:      this.title,
      createdAt:  this.createdAt.toISOString(),
      updatedAt:  this.updatedAt.toISOString(),
      archivedAt: this.archivedAt ? this.archivedAt.toISOString() : null,
    }
  }
}
