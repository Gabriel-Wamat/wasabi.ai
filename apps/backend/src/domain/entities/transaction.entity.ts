export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER'
export type PaymentMethod   = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'BANK_TRANSFER' | 'OTHER'

export interface TransactionProps {
  id:            string
  userId:        string
  type:          TransactionType
  amount:        number   // centavos
  categoryId:    string
  description:   string
  date:          Date
  paymentMethod: PaymentMethod
  isRecurring:   boolean
  tags:          string[]
  attachmentUrl: string | null
  createdAt:     Date
  updatedAt:     Date
}

export class Transaction {
  constructor(private readonly props: TransactionProps) {}

  get id()          { return this.props.id }
  get userId()      { return this.props.userId }
  get type()        { return this.props.type }
  get amount()      { return this.props.amount }
  get categoryId()  { return this.props.categoryId }
  get date()        { return this.props.date }

  get amountBRL(): string {
    return (this.props.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  isIncome()   { return this.props.type === 'INCOME' }
  isExpense()  { return this.props.type === 'EXPENSE' }

  toJSON() { return { ...this.props, amountBRL: this.amountBRL } }
}
