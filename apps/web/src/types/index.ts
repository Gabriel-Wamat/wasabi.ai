export type DocumentStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY'
export type DocumentType   = 'PERSONAL' | 'WORK'
export type ProjectStatus  = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'
export type Priority       = 'LOW' | 'MEDIUM' | 'HIGH'
export type TxType         = 'INCOME' | 'EXPENSE' | 'TRANSFER'

export interface Document {
  id: string; userId: string; type: DocumentType; category: string
  title: string; number: string | null; issuerName: string | null
  issuedAt: string | null; expiresAt: string | null; fileUrl: string | null
  tags: string[]; company: string | null; status: DocumentStatus
  createdAt: string; updatedAt: string
}

export interface Project {
  id: string; userId: string; title: string; description: string | null
  status: ProjectStatus; priority: Priority; progress: number
  tags: string[]; color: string; startDate: string | null; endDate: string | null
  createdAt: string; updatedAt: string
}

export interface Transaction {
  id: string; userId: string; type: TxType; amount: number; amountBRL: string
  categoryId: string; description: string; date: string
  paymentMethod: string; isRecurring: boolean; tags: string[]
  createdAt: string; updatedAt: string
}

export interface FinancialGoal {
  id: string; userId: string; title: string; targetAmount: number
  currentAmount: number; deadline: string; icon: string
  progressPercent: number; remaining: number
  createdAt: string; updatedAt: string
}

export interface DashboardOverview {
  stats: {
    totalDocuments: number; expiringSoon: number; activeProjects: number
    monthlyIncome: number; monthlyExpenses: number; currentBalance: number
  }
  attentionDocuments: Document[]
  recentTransactions: Transaction[]
  activeProjects: Project[]
  goals: FinancialGoal[]
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean }
}

export type IpcaCategoryStatus = 'ABOVE' | 'BELOW' | 'ALIGNED' | 'INSUFFICIENT_DATA'

export interface IpcaCategoryComparison {
  categoryId:       string
  name:             string
  color:            string
  icon:             string
  ipcaGroup:        string | null
  currentAvgCents:  number
  previousAvgCents: number
  userChange:       number | null
  ipcaChange:       number | null
  delta:            number | null
  status:           IpcaCategoryStatus
}

export interface IpcaComparison {
  period:          string
  year:            number
  monthsCovered:   number
  ipcaAccumulated: number | null
  categories:      IpcaCategoryComparison[]
  fetchedAt:       string
}

export interface ChatConversation {
  id:         string
  title:      string
  createdAt:  string
  updatedAt:  string
  archivedAt: string | null
  lastMessageAt?: string | null
}

export type ChatRole = 'USER' | 'ASSISTANT'

export interface ChatMessage {
  id:        string
  role:      ChatRole
  content:   string
  createdAt: string
}

export type LlmProvider = 'openai' | 'anthropic' | 'ollama'

export interface UserLlmSettings {
  provider:  LlmProvider
  model:     string
  baseUrl?:  string
  hasApiKey: boolean
  updatedAt?: string
}

export interface OllamaModel {
  name:              string
  model:             string
  modifiedAt:        string | null
  size:              number | null
  family:            string | null
  parameterSize:     string | null
  quantizationLevel: string | null
}

export interface OllamaModelsResponse {
  available: boolean
  baseUrl:   string | null
  models:    OllamaModel[]
}
