import { IDocumentRepository } from '../../../application/ports/outbound/document.repository'
import { IProjectRepository } from '../../../application/ports/outbound/project.repository'
import { ITransactionRepository } from '../../../application/ports/outbound/transaction.repository'
import { IGoalRepository } from '../../../application/ports/outbound/goal.repository'
import { ICacheRepository } from '../../../application/ports/outbound/cache.repository'

export class GetDashboardOverviewUseCase {
  constructor(
    private readonly docs:         IDocumentRepository,
    private readonly projects:     IProjectRepository,
    private readonly transactions: ITransactionRepository,
    private readonly goals:        IGoalRepository,
    private readonly cache:        ICacheRepository,
  ) {}

  async execute(userId: string) {
    const cacheKey = `dashboard:overview:${userId}`
    const cached   = await this.cache.get<unknown>(cacheKey)
    if (cached) return cached

    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const [expiringSoon, totalDocs, activeProjects, sums, allGoals] = await Promise.all([
      this.docs.findExpiringSoon(userId, 30),
      this.docs.countByUser(userId),
      this.projects.countActive(userId),
      this.transactions.sumByPeriod(userId, start, end),
      this.goals.findByUser(userId),
    ])

    const allDocs      = await this.docs.findMany(userId, { page: 1, limit: 4, sort: 'expiresAt', order: 'asc' })
    const recentTx     = await this.transactions.findMany(userId, { page: 1, limit: 5 })
    const projectsList = await this.projects.findMany(userId, { page: 1, limit: 4, status: 'ACTIVE' })

    const overview = {
      stats: {
        totalDocuments:   totalDocs,
        expiringSoon:     expiringSoon.length,
        activeProjects,
        monthlyIncome:    sums.income,
        monthlyExpenses:  sums.expense,
        currentBalance:   sums.income - sums.expense,
      },
      attentionDocuments: allDocs.data.map(d => d.toJSON()),
      recentTransactions: recentTx.data.map(t => t.toJSON()),
      activeProjects:     projectsList.data.map(p => p.toJSON()),
      goals:              allGoals.map(g => g.toJSON()),
    }

    await this.cache.set(cacheKey, overview, 300)
    return overview
  }
}
