import { Container } from '../container'

type DigestStatus = 'green' | 'yellow' | 'red'

export interface DigestSection {
  title: string
  status: DigestStatus
  lines: string[]
  fallback?: string
}

export interface DailyDigest {
  date: Date
  userName: string
  sections: DigestSection[]
}

export interface SlackDigestConfig {
  webhookUrl?: string
  enabled?: boolean
  timezone: string
}

export interface SchedulerHandle {
  stop(): void
}

const formatterBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function formatBRL(cents: number): string {
  return formatterBRL.format(cents / 100)
}

function section(title: string, lines: string[], emptyFallback: string, status: DigestStatus = 'green'): DigestSection {
  return lines.length > 0
    ? { title, status, lines }
    : { title, status: 'yellow', lines: [], fallback: emptyFallback }
}

function statusLabel(status: DigestStatus): string {
  if (status === 'green') return 'Verde'
  if (status === 'yellow') return 'Amarelo'
  return 'Vermelho'
}

function formatCalendarDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function getClockParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const value = (type: string) => parts.find(part => part.type === type)?.value ?? ''

  return {
    dateKey: `${value('year')}-${value('month')}-${value('day')}`,
    hour: value('hour'),
    minute: value('minute'),
  }
}

export async function buildDailyDigest(container: Container, userId: string, date = new Date()): Promise<DailyDigest> {
  const [user, overview] = await Promise.all([
    container.userRepo.findById(userId),
    container.getDashboardOverview.execute(userId),
  ])

  const data = overview as {
    stats?: {
      expiringSoon?: number
      activeProjects?: number
      monthlyIncome?: number
      monthlyExpenses?: number
      currentBalance?: number
    }
    attentionDocuments?: Array<{ title?: string; status?: string; expiresAt?: Date | string | null }>
    activeProjects?: Array<{ title?: string; progress?: number; priority?: string }>
    recentTransactions?: Array<{ description?: string; type?: string; amount?: number; amountBRL?: string }>
    goals?: Array<{ title?: string; currentAmount?: number; targetAmount?: number }>
  }

  const docs = data.attentionDocuments ?? []
  const projects = data.activeProjects ?? []
  const txs = data.recentTransactions ?? []
  const goals = data.goals ?? []
  const stats = data.stats ?? {}

  const financialLines = [
    `Saldo mensal: ${formatBRL(stats.currentBalance ?? 0)}`,
    `Receitas: ${formatBRL(stats.monthlyIncome ?? 0)} | Despesas: ${formatBRL(stats.monthlyExpenses ?? 0)}`,
    ...txs.slice(0, 3).map(tx => {
      const amount = tx.amountBRL ?? formatBRL(tx.amount ?? 0)
      return `${tx.type === 'INCOME' ? '+' : '-'} ${amount} - ${tx.description ?? 'Transacao sem descricao'}`
    }),
  ]

  const documentLines = docs.slice(0, 4).map(doc => {
    const expiresAt = doc.expiresAt ? formatCalendarDate(new Date(doc.expiresAt), user?.toPublic().timezone ?? 'America/Sao_Paulo') : 'sem vencimento'
    return `${doc.title ?? 'Documento sem titulo'} - ${doc.status ?? 'sem status'} (${expiresAt})`
  })

  const projectLines = projects.slice(0, 4).map(project =>
    `${project.title ?? 'Projeto sem titulo'} - ${project.progress ?? 0}% (${project.priority ?? 'sem prioridade'})`,
  )

  const goalLines = goals.slice(0, 4).map(goal => {
    const current = formatBRL(goal.currentAmount ?? 0)
    const target = formatBRL(goal.targetAmount ?? 0)
    return `${goal.title ?? 'Meta sem titulo'} - ${current} / ${target}`
  })

  return {
    date,
    userName: user?.toPublic().name ?? 'Usuario',
    sections: [
      section('Financeiro', financialLines, 'Sem transacoes ou resumo financeiro disponivel hoje.', (stats.currentBalance ?? 0) < 0 ? 'red' : 'green'),
      section('Documentos', documentLines, 'Sem documentos com vencimento ou fonte indisponivel.', (stats.expiringSoon ?? 0) > 0 ? 'yellow' : 'green'),
      section('Projetos', projectLines, 'Sem projetos ativos cadastrados ou fonte indisponivel.', (stats.activeProjects ?? 0) > 0 ? 'green' : 'yellow'),
      section('Metas', goalLines, 'Sem metas cadastradas ou fonte indisponivel.'),
    ],
  }
}

export function renderSlackDigest(digest: DailyDigest, timezone = 'America/Sao_Paulo') {
  const dateLabel = formatCalendarDate(digest.date, timezone)

  return {
    text: `Digest diario de ${digest.userName} - ${dateLabel}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `Digest diario - ${dateLabel}`, emoji: false },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `Resumo R/Y/G para *${digest.userName}*.` },
      },
      ...digest.sections.flatMap(sectionData => [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${sectionData.title}* (${statusLabel(sectionData.status)})\n${sectionData.lines.length > 0 ? sectionData.lines.map(line => `• ${line}`).join('\n') : sectionData.fallback}`,
          },
        },
      ]),
    ],
  }
}

export async function postSlackDigest(webhookUrl: string, payload: ReturnType<typeof renderSlackDigest>): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Slack digest post failed: ${response.status} ${body}`.trim())
  }
}

export async function sendDailySlackDigest(container: Container, config: SlackDigestConfig, date = new Date()): Promise<number> {
  if (!config.webhookUrl) return 0

  const users = await container.prisma.user.findMany({ select: { id: true } })
  for (const user of users) {
    const digest = await buildDailyDigest(container, user.id, date)
    await postSlackDigest(config.webhookUrl, renderSlackDigest(digest, config.timezone))
  }

  return users.length
}

export function startSlackDigestScheduler(
  container: Container,
  config: SlackDigestConfig,
  logger: Pick<Console, 'info' | 'warn' | 'error'> = console,
): SchedulerHandle {
  if (!config.enabled || !config.webhookUrl) {
    logger.info('[slack-digest] scheduler disabled')
    return { stop: () => undefined }
  }

  let lastRunDateKey: string | null = null
  let running = false

  const tick = async () => {
    const now = new Date()
    const clock = getClockParts(now, config.timezone)
    if (clock.hour !== '09' || clock.minute !== '30' || lastRunDateKey === clock.dateKey || running) return

    running = true
    try {
      const posted = await sendDailySlackDigest(container, config, now)
      lastRunDateKey = clock.dateKey
      logger.info(`[slack-digest] posted ${posted} digest(s) for ${clock.dateKey}`)
    } catch (err) {
      logger.error({ err }, '[slack-digest] failed to post digest')
    } finally {
      running = false
    }
  }

  const interval = setInterval(() => { void tick() }, 60_000)
  void tick()

  return {
    stop: () => clearInterval(interval),
  }
}
