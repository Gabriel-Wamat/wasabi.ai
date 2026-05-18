import { TransactionType } from './transaction.entity'

export interface FinancialCategoryProps {
  id: string
  userId: string | null
  name: string
  type: TransactionType
  color: string
  icon: string
  isDefault: boolean
  ipcaGroup?: string | null
}

export class FinancialCategory {
  constructor(private readonly props: FinancialCategoryProps) {}

  get id() { return this.props.id }
  get userId() { return this.props.userId }
  get name() { return this.props.name }
  get type() { return this.props.type }
  get color() { return this.props.color }
  get icon() { return this.props.icon }
  get isDefault() { return this.props.isDefault }
  get ipcaGroup() { return this.props.ipcaGroup ?? null }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      type: this.type,
      color: this.color,
      icon: this.icon,
      isDefault: this.isDefault,
      ipcaGroup: this.ipcaGroup,
    }
  }
}
