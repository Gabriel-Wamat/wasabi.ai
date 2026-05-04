export interface FinancialGoalProps {
  id:            string
  userId:        string
  title:         string
  targetAmount:  number  // centavos
  currentAmount: number  // centavos
  deadline:      Date
  icon:          string
  createdAt:     Date
  updatedAt:     Date
}

export class FinancialGoal {
  constructor(private readonly props: FinancialGoalProps) {}

  get id()            { return this.props.id }
  get userId()        { return this.props.userId }
  get title()         { return this.props.title }
  get targetAmount()  { return this.props.targetAmount }
  get currentAmount() { return this.props.currentAmount }
  get deadline()      { return this.props.deadline }

  get progressPercent(): number {
    if (this.props.targetAmount === 0) return 0
    return Math.min(100, Math.round((this.props.currentAmount / this.props.targetAmount) * 100))
  }

  get remaining(): number {
    return Math.max(0, this.props.targetAmount - this.props.currentAmount)
  }

  isCompleted() { return this.props.currentAmount >= this.props.targetAmount }
  isOverdue()   { return !this.isCompleted() && this.props.deadline < new Date() }

  toJSON() {
    return { ...this.props, progressPercent: this.progressPercent, remaining: this.remaining }
  }
}
