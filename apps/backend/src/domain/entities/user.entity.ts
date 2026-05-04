export type Plan = 'FREE' | 'PRO'

export interface UserProps {
  id:           string
  name:         string
  email:        string
  passwordHash: string
  avatar:       string | null
  timezone:     string
  plan:         Plan
  createdAt:    Date
  updatedAt:    Date
}

export class User {
  constructor(private readonly props: UserProps) {}

  get id()           { return this.props.id }
  get name()         { return this.props.name }
  get email()        { return this.props.email }
  get passwordHash() { return this.props.passwordHash }
  get plan()         { return this.props.plan }
  get avatar()       { return this.props.avatar }

  isPro() { return this.props.plan === 'PRO' }

  toPublic() {
    const { passwordHash: _, ...rest } = this.props
    return rest
  }
}
