import { IDocumentRepository } from '../ports/outbound/document.repository'
import { IProjectRepository } from '../ports/outbound/project.repository'
import { ITransactionRepository } from '../ports/outbound/transaction.repository'
import { IGoalRepository } from '../ports/outbound/goal.repository'
import { IUserRepository } from '../ports/outbound/user.repository'
import { IEmbeddingRepository } from '../ports/outbound/embedding.repository'
import {
  IVectorContextRepository,
  VectorContextMatch,
  VectorContextRecord,
} from '../ports/outbound/vector-context.repository'

/**
 * Monta o contexto que vai no system prompt do LLM.
 * Esse contexto é estável durante a conversa e específico do usuário.
 */
export class ChatContextBuilder {
  constructor(
    private readonly users:        IUserRepository,
    private readonly docs:         IDocumentRepository,
    private readonly projects:     IProjectRepository,
    private readonly transactions: ITransactionRepository,
    private readonly goals:        IGoalRepository,
    private readonly embeddings?:  IEmbeddingRepository,
    private readonly vectors?:     IVectorContextRepository,
  ) {}

  async build(userId: string, query?: string, opts?: { compact?: boolean }): Promise<string> {
    const compact = opts?.compact ?? false
    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const user = await this.users.findById(userId)
    const userName = user?.name ?? 'Usuário'

    const [expiringDocs, sums, byCategory, recentTx, activeProjects, allGoals] = await Promise.all([
      this.docs.findExpiringSoon(userId, 60),
      this.transactions.sumByPeriod(userId, start, end),
      this.transactions.groupByCategory(userId, start, end),
      this.transactions.findMany(userId, { page: 1, limit: compact ? 5 : 10 }),
      this.projects.findMany(userId, { page: 1, limit: compact ? 3 : 5, status: 'ACTIVE' }),
      this.goals.findByUser(userId),
    ])

    const monthLabel = start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    const expensesList = byCategory
      .sort((a, b) => b.total - a.total)
      .slice(0, compact ? 5 : 8)
      .map(c => `  - ${c.icon} ${c.name}: ${fmtBRL(c.total)}`)
      .join('\n') || '  (sem despesas no mês)'

    const docsList = expiringDocs
      .slice(0, compact ? 5 : 10)
      .map(d => {
        const days = d.expiresAt
          ? Math.ceil((d.expiresAt.getTime() - now.getTime()) / 86400000)
          : null
        const when = days === null ? 'sem validade'
                   : days < 0      ? `vencido há ${Math.abs(days)} dia(s)`
                                   : `vence em ${days} dia(s)`
        return `  - ${d.title} (${d.category}) — ${when}`
      })
      .join('\n') || '  (nenhum documento próximo de vencer)'

    const projectsList = activeProjects.data
      .map(p => {
        const data = p.toJSON()
        return `  - ${data.title} (${data.priority}, ${data.progress}% concluído)${data.description ? ` — ${data.description}` : ''}`
      })
      .join('\n') || '  (nenhum projeto ativo)'

    const goalsList = allGoals
      .slice(0, compact ? 5 : allGoals.length)
      .map(g => {
        const data = g.toJSON()
        return `  - ${data.icon} ${data.title}: ${fmtBRL(data.currentAmount)}/${fmtBRL(data.targetAmount)} (${data.progressPercent}%) — prazo ${new Date(data.deadline).toLocaleDateString('pt-BR')}`
      })
      .join('\n') || '  (nenhuma meta cadastrada)'

    const recentList = recentTx.data
      .slice(0, compact ? 5 : 8)
      .map(t => {
        const j = t.toJSON()
        const sign = j.type === 'INCOME' ? '+' : '-'
        return `  - ${new Date(j.date).toLocaleDateString('pt-BR')} | ${sign}${j.amountBRL} | ${j.description}`
      })
      .join('\n') || '  (sem movimentações recentes)'

    const semanticMatches = compact ? [] : await this.searchSemanticContext(userId, query, [
      ...recentTx.data.map(t => {
        const j = t.toJSON()
        const sign = j.type === 'INCOME' ? 'receita' : 'despesa'
        return {
          sourceType: 'transaction',
          sourceId: j.id,
          content: `${sign}: ${j.description}; valor ${j.amountBRL}; data ${new Date(j.date).toLocaleDateString('pt-BR')}; forma ${j.paymentMethod}; tags ${j.tags.join(', ') || 'nenhuma'}.`,
          metadata: { type: j.type, amount: j.amount, date: j.date },
        }
      }),
      ...expiringDocs.slice(0, 10).map(d => ({
        sourceType: 'document',
        sourceId: d.id,
        content: `documento: ${d.title}; categoria ${d.category}; vencimento ${d.expiresAt ? d.expiresAt.toLocaleDateString('pt-BR') : 'sem validade'}.`,
        metadata: { type: d.type, category: d.category, expiresAt: d.expiresAt },
      })),
      ...activeProjects.data.map(p => {
        const data = p.toJSON()
        return {
          sourceType: 'project',
          sourceId: data.id,
          content: `projeto: ${data.title}; prioridade ${data.priority}; status ${data.status}; progresso ${data.progress}%; ${data.description ?? ''}`,
          metadata: { priority: data.priority, status: data.status, progress: data.progress },
        }
      }),
      ...allGoals.map(g => {
        const data = g.toJSON()
        return {
          sourceType: 'goal',
          sourceId: data.id,
          content: `meta: ${data.title}; atual ${fmtBRL(data.currentAmount)}; alvo ${fmtBRL(data.targetAmount)}; progresso ${data.progressPercent}%; prazo ${new Date(data.deadline).toLocaleDateString('pt-BR')}.`,
          metadata: { progressPercent: data.progressPercent, deadline: data.deadline },
        }
      }),
    ])

    const semanticList = semanticMatches.length
      ? semanticMatches.map(item => `  - (${item.sourceType}, ${(item.similarity * 100).toFixed(0)}%) ${item.content}`).join('\n')
      : '  (consulta vetorial indisponível ou sem resultados relevantes)'

    return `Você é o Wasabi, assistente pessoal inteligente integrado ao app de gestão pessoal do usuário.

REGRAS:
- Responda sempre em português brasileiro, de forma direta, objetiva e calorosa.
- Use os dados reais do usuário abaixo. NUNCA invente valores ou informações.
- Se uma informação não estiver no contexto, diga que não encontrou e sugira onde o usuário pode adicionar.
- Você é READ-ONLY: nunca afirme que executou ações (não crie, edite, delete nada). Sugira que o usuário faça pelas telas do app.
- Para valores monetários use o formato R$ X.XXX,XX.
- Seja conciso: 2-4 parágrafos no máximo, listas curtas quando ajudar.
- Quando citar dados, deixe claro de qual período/categoria veio.

═══════════════════════════════════════════════════════
CONTEXTO DO USUÁRIO (snapshot — atualizado em ${now.toLocaleString('pt-BR')})
═══════════════════════════════════════════════════════

USUÁRIO: ${userName}

FINANÇAS — ${monthLabel}:
  Receita do mês:  ${fmtBRL(sums.income)}
  Despesas do mês: ${fmtBRL(sums.expense)}
  Saldo do mês:    ${fmtBRL(sums.income - sums.expense)}

DESPESAS POR CATEGORIA — ${monthLabel}:
${expensesList}

ÚLTIMAS TRANSAÇÕES:
${recentList}

DOCUMENTOS COM ATENÇÃO (próximos 60 dias):
${docsList}

PROJETOS ATIVOS:
${projectsList}

METAS FINANCEIRAS:
${goalsList}

CONTEXTO SEMÂNTICO MAIS RELEVANTE (pgvector):
${semanticList}

═══════════════════════════════════════════════════════
Agora responda à pergunta do usuário usando este contexto.`
  }

  private async searchSemanticContext(
    userId: string,
    query: string | undefined,
    records: VectorContextRecord[],
  ): Promise<VectorContextMatch[]> {
    if (!query?.trim() || !this.embeddings?.isAvailable() || !this.vectors) return []

    try {
      const limitedRecords = records.slice(0, 40)
      await Promise.all(limitedRecords.map(async record => {
        const embedding = await this.embeddings!.embed(record.content)
        await this.vectors!.upsert({ userId, ...record, embedding })
      }))

      const queryEmbedding = await this.embeddings.embed(query)
      return await this.vectors.search({ userId, embedding: queryEmbedding, limit: 6 })
    } catch {
      return []
    }
  }
}

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}
