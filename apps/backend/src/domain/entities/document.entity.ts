export type DocumentType   = 'PERSONAL' | 'WORK'
export type DocumentStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY'

export interface DocumentProps {
  id:         string
  userId:     string
  type:       DocumentType
  category:   string
  title:      string
  number:     string | null
  issuerName: string | null
  issuedAt:   Date | null
  expiresAt:  Date | null
  fileUrl:    string | null
  tags:       string[]
  metadata:   Record<string, unknown>
  company:    string | null
  createdAt:  Date
  updatedAt:  Date
}

export class Document {
  constructor(private readonly props: DocumentProps) {}

  get id()        { return this.props.id }
  get userId()    { return this.props.userId }
  get type()      { return this.props.type }
  get category()  { return this.props.category }
  get title()     { return this.props.title }
  get expiresAt() { return this.props.expiresAt }
  get fileUrl()   { return this.props.fileUrl }
  get tags()      { return this.props.tags }

  get status(): DocumentStatus {
    if (!this.props.expiresAt) return 'NO_EXPIRY'
    const diffDays = (this.props.expiresAt.getTime() - Date.now()) / 86_400_000
    if (diffDays < 0)   return 'EXPIRED'
    if (diffDays <= 30) return 'EXPIRING_SOON'
    return 'VALID'
  }

  isExpired()      { return this.status === 'EXPIRED' }
  isExpiringSoon() { return this.status === 'EXPIRING_SOON' }

  toJSON() { return { ...this.props, status: this.status } }
}
