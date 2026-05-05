'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'

type Regime = 'cash' | 'accrual'
type DateRange = 'today' | '7d' | '30d' | 'custom'
type Aggregation = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'fiveYears' | 'max'
type FlowKind = 'incoming' | 'outgoing'
type FlowStatus = 'paid' | 'pending' | 'overdue'
type MetricKey = 'revenue' | 'expenses' | 'profit' | 'cashBalance' | 'investmentCapital' | null

interface SeriesPoint {
  date: string
  revenue: number
  expenses: number
}

interface FlowItem {
  id: string
  kind: FlowKind
  name: string
  amount: number
  dueDate: string
  status: FlowStatus
}

interface Obligation {
  id: string
  name: string
  amount: number
  dueDate: string
  tooltip: string
  priority: 'normal' | 'warning' | 'critical'
}

const TODAY = new Date('2026-05-04T12:00:00-03:00')

const companies = [
  'Wasabi Studio LTDA',
  'Mercado Verde ME',
  'Consultoria Norte',
]

const rangeOptions: Array<{ value: DateRange; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'custom', label: 'Personalizado' },
]

const flowSeed: FlowItem[] = [
  { id: 'rec-1', kind: 'incoming', name: 'Cliente Aurora', amount: 18400, dueDate: '2026-05-05', status: 'pending' },
  { id: 'rec-2', kind: 'incoming', name: 'Plano recorrente B2B', amount: 9600, dueDate: '2026-05-07', status: 'pending' },
  { id: 'rec-3', kind: 'incoming', name: 'Nota fiscal 0821', amount: 14200, dueDate: '2026-05-02', status: 'overdue' },
  { id: 'rec-4', kind: 'incoming', name: 'Assinaturas ativas', amount: 6900, dueDate: '2026-05-10', status: 'paid' },
  { id: 'pay-1', kind: 'outgoing', name: 'Fornecedor cloud', amount: 4300, dueDate: '2026-05-04', status: 'pending' },
  { id: 'pay-2', kind: 'outgoing', name: 'Folha e benefícios', amount: 21200, dueDate: '2026-05-06', status: 'pending' },
  { id: 'pay-3', kind: 'outgoing', name: 'Aluguel escritório', amount: 5200, dueDate: '2026-05-01', status: 'overdue' },
  { id: 'pay-4', kind: 'outgoing', name: 'Licenças SaaS', amount: 3100, dueDate: '2026-05-11', status: 'paid' },
]

const obligations: Obligation[] = [
  {
    id: 'das',
    name: 'DAS',
    amount: 3850,
    dueDate: '2026-05-20',
    priority: 'warning',
    tooltip: 'Documento de Arrecadação do Simples Nacional, consolidando impostos federais e municipais do período.',
  },
  {
    id: 'icms',
    name: 'ICMS',
    amount: 2140,
    dueDate: '2026-05-15',
    priority: 'critical',
    tooltip: 'Imposto estadual sobre circulação de mercadorias e serviços. Acompanhe vencimento e apuração.',
  },
  {
    id: 'iss',
    name: 'ISS',
    amount: 1260,
    dueDate: '2026-05-12',
    priority: 'normal',
    tooltip: 'Imposto municipal sobre serviços emitidos no período.',
  },
]

const insightSeed = [
  { id: 'uncategorized', text: 'R$ 4.820 em despesas sem categoria', detail: 'Classifique para melhorar a leitura da DRE.', metric: 'expenses' as MetricKey },
  { id: 'expense-rise', text: 'Despesas subiram 18% na semana', detail: 'O maior impacto veio de cloud e fornecedores.', metric: 'expenses' as MetricKey },
  { id: 'overdue', text: '2 pagamentos vencidos pedem ação', detail: 'Priorize cobranças e contas críticas hoje.', metric: 'cashBalance' as MetricKey },
]

function panel(extra?: CSSProperties): CSSProperties {
  return {
    background: 'rgba(20,20,20,0.92)',
    border: '1px solid var(--bd)',
    borderRadius: 14,
    boxShadow: '0 18px 42px rgba(0,0,0,0.16)',
    ...extra,
  }
}

function control(extra?: CSSProperties): CSSProperties {
  return {
    background: 'var(--s2)',
    border: '1px solid var(--bd)',
    borderRadius: 10,
    color: 'var(--tx)',
    fontSize: 12,
    fontWeight: 600,
    outline: 'none',
    minHeight: 40,
    padding: '0 12px',
    ...extra,
  }
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function parseDate(date: string) {
  return new Date(`${date}T12:00:00-03:00`)
}

function shortDate(date: string) {
  return parseDate(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

function daysUntil(date: string) {
  const ms = parseDate(date).getTime() - TODAY.getTime()
  return Math.ceil(ms / 86_400_000)
}

function statusLabel(status: FlowStatus) {
  if (status === 'paid') return 'Pago'
  if (status === 'overdue') return 'Vencido'
  return 'Pendente'
}

function makeSeries(company: string, range: DateRange, regime: Regime, aggregation: Aggregation): SeriesPoint[] {
  const length = aggregation === 'yearly' ? 12 : aggregation === 'fiveYears' ? 60 : aggregation === 'max' ? 96 : range === 'today' ? 1 : range === '7d' ? 7 : range === 'custom' ? 14 : 30
  const dayStep = aggregation === 'yearly' || aggregation === 'fiveYears' || aggregation === 'max' ? 30 : 1
  const companyOffset = companies.indexOf(company) * 700
  const regimeOffset = regime === 'cash' ? 0 : 1150

  return Array.from({ length }).map((_, index) => {
    const dayOffset = length - 1 - index
    const date = new Date(TODAY)
    date.setDate(TODAY.getDate() - dayOffset * dayStep)
    const wave = Math.sin((index + 1) * 0.85) * 1250
    const revenue = 5200 + companyOffset + regimeOffset + index * 185 + wave + (index % 5 === 0 ? 2600 : 0)
    const expenses = 3150 + companyOffset * 0.38 + regimeOffset * 0.42 + index * 92 + Math.cos(index * 0.9) * 820 + (index % 6 === 2 ? 1900 : 0)
    return {
      date: date.toISOString().slice(0, 10),
      revenue: Math.max(1800, Math.round(revenue)),
      expenses: Math.max(1200, Math.round(expenses)),
    }
  })
}

function aggregateSeries(series: SeriesPoint[], aggregation: Aggregation): SeriesPoint[] {
  if (aggregation === 'daily' || aggregation === 'yearly' || aggregation === 'fiveYears' || aggregation === 'max' || series.length <= 7) return series
  const bucketSize = aggregation === 'weekly' ? 7 : 30
  const buckets: SeriesPoint[] = []

  for (let index = 0; index < series.length; index += bucketSize) {
    const group = series.slice(index, index + bucketSize)
    buckets.push({
      date: group[group.length - 1].date,
      revenue: Math.round(group.reduce((sum, item) => sum + item.revenue, 0) / group.length),
      expenses: Math.round(group.reduce((sum, item) => sum + item.expenses, 0) / group.length),
    })
  }

  return buckets
}

function usePersistentDashboardState() {
  const [company, setCompany] = useState(companies[0])
  const [range, setRange] = useState<DateRange>('30d')
  const [regime, setRegime] = useState<Regime>('cash')
  const [aggregation, setAggregation] = useState<Aggregation>('weekly')
  const [activeMetric, setActiveMetric] = useState<MetricKey>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raw = window.localStorage.getItem('wasabi-business-dashboard')
    if (raw) {
      const saved = JSON.parse(raw) as Partial<{
        company: string
        range: DateRange
        regime: Regime
        aggregation: Aggregation
        activeMetric: MetricKey
      }>
      if (saved.company && companies.includes(saved.company)) setCompany(saved.company)
      if (saved.range) setRange(saved.range)
      if (saved.regime) setRegime(saved.regime)
      if (saved.aggregation) setAggregation(saved.aggregation)
      if (saved.activeMetric !== undefined) setActiveMetric(saved.activeMetric)
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    window.localStorage.setItem('wasabi-business-dashboard', JSON.stringify({ company, range, regime, aggregation, activeMetric }))
  }, [activeMetric, aggregation, company, range, ready, regime])

  return { company, setCompany, range, setRange, regime, setRegime, aggregation, setAggregation, activeMetric, setActiveMetric }
}

function Skeleton({ height = 120 }: { height?: number }) {
  return (
    <div style={{ ...panel({ height, overflow: 'hidden', position: 'relative' }) }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
        animation: 'business-skeleton 1.2s ease-in-out infinite',
      }} />
    </div>
  )
}

function Trend({ change }: { change: number }) {
  const positive = change >= 0
  return (
    <span style={{
      color: positive ? 'var(--gr)' : 'var(--rd)',
      fontSize: 11,
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      minWidth: 46,
      flexShrink: 0,
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      {positive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
    </span>
  )
}

function MetricCard({
  icon,
  label,
  value,
  change,
  sub,
  tooltip,
  active,
  onClick,
}: {
  icon: string
  label: string
  value: number
  change: number
  sub: string
  tooltip: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={tooltip}
      onClick={onClick}
      style={{
        ...panel({
          textAlign: 'left',
          padding: 14,
          minHeight: 112,
          height: '100%',
          display: 'grid',
          alignContent: 'space-between',
          outline: 'none',
          borderColor: active ? 'rgba(17,199,111,0.55)' : 'var(--bd)',
          background: active ? 'linear-gradient(180deg, rgba(10,35,24,0.88), rgba(20,20,20,0.94))' : 'rgba(20,20,20,0.92)',
          transition: 'transform .18s ease, border-color .18s ease, background .18s ease',
        }),
      }}
      onMouseEnter={event => { event.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={event => { event.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 12, minHeight: 28 }}>
        <span style={{ color: 'var(--t2)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--s3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: active ? 'var(--gr)' : 'var(--t2)', fontSize: 13 }}>{icon}</span>
          <span style={{ lineHeight: 1.1 }}>{label}</span>
        </span>
        <Trend change={change} />
      </div>
      <div>
        <div style={{ color: 'var(--tx)', fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing: 0 }}>{fmt(value)}</div>
        <div style={{ color: 'var(--t3)', fontSize: 11, marginTop: 10 }}>{sub}</div>
      </div>
    </button>
  )
}

function FinancialChart({
  data,
  aggregation,
  onAggregationChange,
}: {
  data: SeriesPoint[]
  aggregation: Aggregation
  onAggregationChange: (value: Aggregation) => void
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const width = 900
  const height = 190
  const chartLeft = 38
  const chartRight = 8
  const chartTop = 12
  const chartBottom = 28
  const maxValue = Math.max(...data.flatMap(point => [point.revenue, point.expenses]), 1) * 1.18
  const xStep = data.length > 1 ? (width - chartLeft - chartRight) / (data.length - 1) : 0
  const y = (value: number) => chartTop + (1 - value / maxValue) * (height - chartTop - chartBottom)
  const points = data.map((point, index) => ({
    ...point,
    x: chartLeft + index * xStep,
    revenueY: y(point.revenue),
    expensesY: y(point.expenses),
  }))
  const revenuePath = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.revenueY}`).join(' ')
  const expensesPath = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.expensesY}`).join(' ')
  const areaPath = `${revenuePath} L ${points[points.length - 1]?.x ?? chartLeft} ${height - chartBottom} L ${chartLeft} ${height - chartBottom} Z`
  const active = hovered === null ? null : points[hovered]

  return (
    <section style={panel({ padding: 14, minHeight: 212 })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 4, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0 }}>Evolução financeira</h2>
          <p style={{ color: 'var(--t2)', fontSize: 11, marginTop: 3 }}>Receita vs despesa.</p>
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, padding: 3 }}>
          {[
            ['daily', 'Dia'],
            ['weekly', 'Semana'],
            ['monthly', 'Mês'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onAggregationChange(value as Aggregation)}
              style={{
                border: 'none',
                borderRadius: 8,
                padding: '6px 9px',
                background: aggregation === value ? 'var(--gd)' : 'transparent',
                color: aggregation === value ? 'var(--gr)' : 'var(--t2)',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {label}
            </button>
          ))}
          </div>
          <select
            aria-label="Mais períodos"
            value={['yearly', 'fiveYears', 'max'].includes(aggregation) ? aggregation : ''}
            onChange={event => {
              if (event.target.value) onAggregationChange(event.target.value as Aggregation)
            }}
            style={{
              ...control({
                minHeight: 34,
                height: 34,
                width: ['yearly', 'fiveYears', 'max'].includes(aggregation) ? 86 : 70,
                padding: '0 9px',
                fontSize: 11,
                fontWeight: 800,
              }),
              background: ['yearly', 'fiveYears', 'max'].includes(aggregation) ? 'var(--gd)' : 'var(--s2)',
              color: ['yearly', 'fiveYears', 'max'].includes(aggregation) ? 'var(--gr)' : 'var(--t2)',
            }}
          >
            <option value="">Mais</option>
            <option value="yearly">Ano</option>
            <option value="fiveYears">5 anos</option>
            <option value="max">Máx</option>
          </select>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 166, display: 'block', overflow: 'visible' }}>
          {[0, 0.5, 1].map(step => {
            const lineY = chartTop + step * (height - chartTop - chartBottom)
            const value = Math.round(maxValue * (1 - step))
            return (
              <g key={step}>
                <line x1={chartLeft} x2={width - chartRight} y1={lineY} y2={lineY} stroke="rgba(255,255,255,0.05)" />
                <text x={0} y={lineY + 4} fill="var(--t3)" fontSize="9">{fmt(value)}</text>
              </g>
            )
          })}
          <path d={areaPath} fill="rgba(17,199,111,0.08)" />
          <path d={revenuePath} fill="none" stroke="var(--gr)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d={expensesPath} fill="none" stroke="var(--rd)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <g key={point.date} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'crosshair' }}>
              <rect x={point.x - Math.max(12, xStep / 2)} y={chartTop} width={Math.max(24, xStep)} height={height - chartTop - chartBottom} fill="transparent" />
              <circle cx={point.x} cy={point.revenueY} r={hovered === index ? 4 : 2.5} fill="var(--gr)" />
              <circle cx={point.x} cy={point.expensesY} r={hovered === index ? 4 : 2.5} fill="var(--rd)" />
              {(index === 0 || index === points.length - 1 || data.length <= 8 || index % 4 === 0) && (
                <text x={point.x} y={height - 7} textAnchor="middle" fill="var(--t3)" fontSize="9">{shortDate(point.date)}</text>
              )}
            </g>
          ))}
        </svg>

        {active && (
          <div style={{
            position: 'absolute',
            right: 10,
            top: 4,
            background: 'rgba(13,13,13,0.88)',
            border: '1px solid var(--bd)',
            borderRadius: 10,
            padding: '10px 12px',
            minWidth: 160,
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 8 }}>{shortDate(active.date)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, marginBottom: 5 }}>
              <span style={{ color: 'var(--gr)' }}>Receita</span>
              <strong>{fmt(active.revenue)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11 }}>
              <span style={{ color: 'var(--rd)' }}>Despesa</span>
              <strong>{fmt(active.expenses)}</strong>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function FlowColumn({
  title,
  items,
  onPaid,
  onSelect,
}: {
  title: string
  items: FlowItem[]
  onPaid: (id: string) => void
  onSelect: (item: FlowItem) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
        <h3 style={{ fontSize: 12, fontWeight: 800 }}>{title}</h3>
        <span style={{ color: 'var(--t3)', fontSize: 10, fontWeight: 700 }}>{items.length} itens</span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.slice(0, 3).map(item => {
          const overdue = item.status === 'overdue'
          const amountColor = item.kind === 'incoming' ? 'var(--gr)' : 'var(--tx)'
          const actionLabel = item.kind === 'incoming' ? 'Receber' : 'Pagar'
          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              style={{
                border: `1px solid ${overdue ? 'rgba(255,65,85,0.24)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 11,
                background: overdue ? 'rgba(255,65,85,0.045)' : 'rgba(255,255,255,0.018)',
                padding: 10,
                cursor: 'pointer',
                minHeight: 74,
                display: 'grid',
                gap: 9,
                transition: 'border-color .16s ease, background .16s ease, transform .16s ease',
              }}
              onMouseEnter={event => {
                event.currentTarget.style.borderColor = overdue ? 'rgba(255,65,85,0.38)' : 'rgba(255,255,255,0.12)'
                event.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={event => {
                event.currentTarget.style.borderColor = overdue ? 'rgba(255,65,85,0.24)' : 'rgba(255,255,255,0.06)'
                event.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ color: 'var(--t2)', fontSize: 10, marginTop: 5 }}>{shortDate(item.dueDate)} · {daysUntil(item.dueDate) < 0 ? 'atrasado' : `${daysUntil(item.dueDate)} dias`}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: amountColor }}>{fmt(item.amount)}</div>
                  <div style={{ color: overdue ? 'var(--rd)' : item.status === 'paid' ? 'var(--gr)' : 'var(--t2)', fontSize: 10, fontWeight: 700, marginTop: 5 }}>{statusLabel(item.status)}</div>
                </div>
              </div>
              {item.status !== 'paid' && (
                <button
                  type="button"
                  aria-label={`${actionLabel} ${item.name}`}
                  onClick={event => {
                    event.stopPropagation()
                    onPaid(item.id)
                  }}
                  style={{
                    justifySelf: 'start',
                    border: '1px solid rgba(17,199,111,0.25)',
                    borderRadius: 999,
                    background: 'rgba(17,199,111,0.09)',
                    color: 'var(--gr)',
                    padding: '6px 10px',
                    fontSize: 10,
                    fontWeight: 800,
                    lineHeight: 1,
                    transition: 'background .16s ease, border-color .16s ease',
                  }}
                  onMouseEnter={event => {
                    event.currentTarget.style.background = 'rgba(17,199,111,0.16)'
                    event.currentTarget.style.borderColor = 'rgba(17,199,111,0.45)'
                  }}
                  onMouseLeave={event => {
                    event.currentTarget.style.background = 'rgba(17,199,111,0.09)'
                    event.currentTarget.style.borderColor = 'rgba(17,199,111,0.25)'
                  }}
                >
                  {actionLabel}
                </button>
              )}
            </div>
          )
        })}
        {items.length > 3 && (
          <button type="button" style={{ marginTop: 8, background: 'transparent', border: 'none', color: 'var(--t2)', fontSize: 11, textAlign: 'left', fontWeight: 700 }}>
            + {items.length - 3} próximos
          </button>
        )}
        {!items.length && (
          <div style={{ color: 'var(--t2)', fontSize: 12, padding: 14, border: '1px dashed var(--bd)', borderRadius: 10 }}>
            Nada previsto para este período.
          </div>
        )}
      </div>
    </div>
  )
}

function DetailPanel({ item, onClose }: { item: FlowItem | null; onClose: () => void }) {
  if (!item) return null
  return (
    <aside style={panel({ padding: 14, marginTop: 12, background: 'rgba(10,35,24,0.55)' })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ color: 'var(--t2)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>Detalhe rápido</div>
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 5 }}>{item.name}</div>
        </div>
        <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--t2)', fontSize: 20 }}>×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 12 }}>
        <MiniFact label="Valor" value={fmt(item.amount)} />
        <MiniFact label="Vencimento" value={shortDate(item.dueDate)} />
        <MiniFact label="Status" value={statusLabel(item.status)} />
      </div>
    </aside>
  )
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(20,20,20,0.62)', border: '1px solid var(--bd)', borderRadius: 10, padding: 10 }}>
      <div style={{ color: 'var(--t3)', fontSize: 10, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 800 }}>{value}</div>
    </div>
  )
}

function BusinessDashboard() {
  const { company, setCompany, range, setRange, regime, setRegime, aggregation, setAggregation, activeMetric, setActiveMetric } = usePersistentDashboardState()
  const [flowItems, setFlowItems] = useState(flowSeed)
  const [selectedFlow, setSelectedFlow] = useState<FlowItem | null>(null)
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 420)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    setLoading(true)
    const timer = window.setTimeout(() => setLoading(false), 220)
    return () => window.clearTimeout(timer)
  }, [activeMetric, aggregation, company, range, regime])

  const series = useMemo(() => makeSeries(company, range, regime, aggregation), [aggregation, company, range, regime])
  const chartData = useMemo(() => aggregateSeries(series, aggregation), [aggregation, series])
  const revenue = series.reduce((sum, item) => sum + item.revenue, 0)
  const expenses = series.reduce((sum, item) => sum + item.expenses, 0)
  const profit = revenue - expenses
  const investmentCapital = 68000 + companies.indexOf(company) * 12000 + (regime === 'accrual' ? 7500 : 0)
  const incomingOpen = flowItems.filter(item => item.kind === 'incoming' && item.status !== 'paid').reduce((sum, item) => sum + item.amount, 0)
  const outgoingOpen = flowItems.filter(item => item.kind === 'outgoing' && item.status !== 'paid').reduce((sum, item) => sum + item.amount, 0)
  const cashBalance = 74200 + profit + incomingOpen - outgoingOpen
  const totalTaxes = obligations.reduce((sum, item) => sum + item.amount, 0)

  const visibleInsights = insightSeed.filter(item => !dismissedInsights.includes(item.id))
  const sortedFlow = [...flowItems].sort((a, b) => {
    const statusWeight = (item: FlowItem) => item.status === 'overdue' ? -10 : item.status === 'pending' ? 0 : 10
    return statusWeight(a) - statusWeight(b) || parseDate(a.dueDate).getTime() - parseDate(b.dueDate).getTime()
  })
  const incoming = sortedFlow.filter(item => item.kind === 'incoming')
  const outgoing = sortedFlow.filter(item => item.kind === 'outgoing')

  function markAsPaid(id: string) {
    setFlowItems(items => items.map(item => item.id === id ? { ...item, status: 'paid' } : item))
    setSelectedFlow(item => item?.id === id ? { ...item, status: 'paid' } : item)
  }

  return (
    <div>
      <style>{`
        @keyframes business-skeleton {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .business-header-grid {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) 178px 128px 154px auto;
          gap: 10px;
          align-items: center;
        }
        @media (max-width: 1180px) {
          .business-kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 920px) {
          .business-kpi-grid,
          .business-dashboard-grid,
          .business-cashflow-grid {
            grid-template-columns: 1fr !important;
          }
          .business-header-grid {
            grid-template-columns: minmax(150px, 1fr) 112px 136px auto !important;
          }
          .business-header-title {
            grid-column: 1 / -1 !important;
          }
          .business-header-cta {
            grid-column: auto !important;
          }
          .business-sticky-header {
            position: sticky !important;
            top: 10px !important;
          }
          .business-chart-row {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 680px) {
          .business-header-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .business-header-cta {
            grid-column: 1 / -1 !important;
          }
        }
      `}</style>

      <header
        className="business-sticky-header"
        style={panel({
          margin: '16px 16px 0 0',
          padding: 12,
          position: 'sticky',
          top: 16,
          zIndex: 30,
          backdropFilter: 'blur(12px)',
        })}
      >
        <div className="business-header-grid">
          <div className="business-header-title" style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>Gestão Empresarial</h1>
            <p style={{ color: 'var(--t2)', fontSize: 11, marginTop: 5 }}>Resumo financeiro, caixa e obrigações.</p>
          </div>
          <select value={company} onChange={event => setCompany(event.target.value)} style={control({ width: '100%' })}>
            {companies.map(item => <option key={item}>{item}</option>)}
          </select>
          <select value={range} onChange={event => setRange(event.target.value as DateRange)} style={control({ width: '100%' })}>
            {rangeOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setRegime(regime === 'cash' ? 'accrual' : 'cash')}
            title="Alterna entre leitura por caixa e competência"
            style={{
              ...control({ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', width: '100%' }),
              background: regime === 'cash' ? 'var(--gd)' : 'var(--s2)',
              color: regime === 'cash' ? 'var(--gr)' : 'var(--tx)',
            }}
          >
            <span>{regime === 'cash' ? 'Caixa' : 'Competência'}</span>
            <span style={{
              width: 32,
              height: 18,
              borderRadius: 20,
              background: regime === 'cash' ? 'var(--gr)' : 'var(--bd)',
              position: 'relative',
              transition: 'background .18s ease',
            }}>
              <span style={{
                position: 'absolute',
                top: 3,
                left: regime === 'cash' ? 16 : 3,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#0D0D0D',
                transition: 'left .18s ease',
              }} />
            </span>
          </button>
          <button type="button" className="business-header-cta" style={{
            border: 'none',
            borderRadius: 10,
            minHeight: 36,
            padding: '0 12px',
            background: 'var(--gd)',
            color: 'var(--gr)',
            borderColor: 'rgba(17,199,111,0.28)',
            fontWeight: 800,
            fontSize: 11,
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            + Nova transação
          </button>
        </div>
      </header>

      <main style={{ padding: 20, display: 'grid', gap: 16 }}>
        {loading ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <Skeleton height={132} />
              <Skeleton height={132} />
              <Skeleton height={132} />
              <Skeleton height={132} />
            </div>
            <Skeleton height={330} />
            <Skeleton height={240} />
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            <section className="business-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, alignItems: 'stretch' }}>
              <MetricCard
                icon="∑"
                label="Lucro líquido"
                value={profit}
                change={8.9}
                sub={activeMetric === 'profit' ? 'dados filtrados' : 'receita menos despesas'}
                tooltip="Resultado líquido simplificado antes de detalhamentos contábeis avançados."
                active={activeMetric === 'profit'}
                onClick={() => setActiveMetric(activeMetric === 'profit' ? null : 'profit')}
              />
              <MetricCard
                icon="↗"
                label="Receita"
                value={revenue}
                change={12.4}
                sub={activeMetric === 'revenue' ? 'dados filtrados' : 'período anterior'}
                tooltip="Total de entradas reconhecidas no regime e período selecionados."
                active={activeMetric === 'revenue'}
                onClick={() => setActiveMetric(activeMetric === 'revenue' ? null : 'revenue')}
              />
              <MetricCard
                icon="↘"
                label="Despesas"
                value={expenses}
                change={-7.2}
                sub={activeMetric === 'expenses' ? 'dados filtrados' : 'custos e gastos'}
                tooltip="Soma das saídas operacionais e administrativas do período."
                active={activeMetric === 'expenses'}
                onClick={() => setActiveMetric(activeMetric === 'expenses' ? null : 'expenses')}
              />
              <MetricCard
                icon="$"
                label="Caixa"
                value={cashBalance}
                change={4.1}
                sub={activeMetric === 'cashBalance' ? 'dados filtrados' : 'posição atual'}
                tooltip="Saldo estimado considerando caixa atual, contas a receber e contas a pagar."
                active={activeMetric === 'cashBalance'}
                onClick={() => setActiveMetric(activeMetric === 'cashBalance' ? null : 'cashBalance')}
              />
              <MetricCard
                icon="▦"
                label="Capital investido"
                value={investmentCapital}
                change={3.6}
                sub={activeMetric === 'investmentCapital' ? 'dados filtrados' : 'base operacional'}
                tooltip="Capital aplicado no negócio para sustentar operação, crescimento e caixa mínimo."
                active={activeMetric === 'investmentCapital'}
                onClick={() => setActiveMetric(activeMetric === 'investmentCapital' ? null : 'investmentCapital')}
              />
            </section>

            <section className="business-chart-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.15fr) minmax(280px, 1fr)', gap: 12, alignItems: 'stretch' }}>
              <FinancialChart data={chartData} aggregation={aggregation} onAggregationChange={setAggregation} />
              <div style={panel({ padding: 16, minHeight: 212, display: 'grid', alignContent: 'center', gap: 12 })}>
                <div>
                  <div style={{ color: 'var(--t2)', fontSize: 11, fontWeight: 700 }}>Margem líquida</div>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{Math.round((profit / revenue) * 100)}%</div>
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
                <div>
                  <div style={{ color: 'var(--t2)', fontSize: 11, fontWeight: 700 }}>Capital investido</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{fmt(investmentCapital)}</div>
                </div>
                <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.45 }}>
                  O gráfico mostra tendência. Use os detalhes abaixo para decidir cobrança, pagamento e impostos.
                </div>
              </div>
            </section>

            <section className="business-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.15fr) minmax(280px, 1fr)', gap: 12, alignItems: 'start' }}>
              <div style={panel({ padding: 14, minHeight: 266 })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div>
                    <h2 style={{ fontSize: 14, fontWeight: 800 }}>Fluxo de caixa próximo</h2>
                    <p style={{ color: 'var(--t2)', fontSize: 11, marginTop: 4 }}>Pendências essenciais por urgência.</p>
                  </div>
                  <span style={{ color: 'var(--gr)', fontSize: 11, fontWeight: 800, background: 'transparent', borderRadius: 999, alignSelf: 'start' }}>
                    {fmt(incomingOpen - outgoingOpen)}
                  </span>
                </div>
                <div className="business-cashflow-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FlowColumn title="A receber" items={incoming} onPaid={markAsPaid} onSelect={setSelectedFlow} />
                  <FlowColumn title="A pagar" items={outgoing} onPaid={markAsPaid} onSelect={setSelectedFlow} />
                </div>
                <DetailPanel item={selectedFlow} onClose={() => setSelectedFlow(null)} />
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <section style={panel({ padding: 16, minHeight: 266 })}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <div>
                      <h2 style={{ fontSize: 15, fontWeight: 800 }}>Impostos e obrigações</h2>
                      <p style={{ color: 'var(--t2)', fontSize: 11, marginTop: 4 }}>{fmt(totalTaxes)} previstos</p>
                    </div>
                    <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--gr)', fontSize: 11, fontWeight: 800 }}>Ver detalhes</button>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {obligations.map(item => {
                      const days = daysUntil(item.dueDate)
                      const color = item.priority === 'critical' ? 'var(--rd)' : item.priority === 'warning' ? 'var(--yw)' : 'var(--gr)'
                      return (
                        <div key={item.id} title={item.tooltip} style={{ border: '1px solid var(--bd)', background: 'var(--s2)', borderRadius: 10, padding: 11 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <strong style={{ fontSize: 12 }}>{item.name}</strong>
                            <span style={{ color, fontSize: 10, fontWeight: 800 }}>{days <= 0 ? 'vence hoje' : `${days} dias`}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--t2)', fontSize: 11, marginTop: 7 }}>
                            <span>{shortDate(item.dueDate)}</span>
                            <span>{fmt(item.amount)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section style={panel({ padding: 16, minHeight: 266 })}>
                  <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>DRE resumida</h2>
                  {[
                    ['Receita bruta', revenue, 0],
                    ['Custos', -Math.round(expenses * 0.38), 1],
                    ['Despesas', -Math.round(expenses * 0.62), 1],
                    ['Lucro líquido', profit, 0],
                  ].map(([label, value, indent]) => (
                    <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: label === 'Lucro líquido' ? 'none' : '1px solid rgba(255,255,255,0.06)', paddingLeft: Number(indent) * 14 }}>
                      <span style={{ color: label === 'Lucro líquido' ? 'var(--tx)' : 'var(--t2)', fontSize: 12 }}>{label as string}</span>
                      <strong style={{ fontSize: 12, color: Number(value) < 0 ? 'var(--rd)' : 'var(--tx)' }}>{fmt(Number(value))}</strong>
                    </div>
                  ))}
                  <button type="button" style={{ marginTop: 12, width: '100%', ...control({ color: 'var(--gr)', background: 'var(--gd)' }) }}>Expandir DRE</button>
                </section>
              </div>
            </section>

            <section style={panel({ padding: 18 })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800 }}>Graph Intelligence</h2>
                  <p style={{ color: 'var(--t2)', fontSize: 11, marginTop: 4 }}>Sinais automáticos para investigar antes do fechamento.</p>
                </div>
                <span style={{ color: 'var(--t3)', fontSize: 11 }}>{visibleInsights.length} ativos</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {visibleInsights.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveMetric(item.metric)}
                    style={{
                      border: '1px solid var(--bd)',
                      borderRadius: 12,
                      background: 'var(--s2)',
                      padding: 14,
                      textAlign: 'left',
                      color: 'var(--tx)',
                      position: 'relative',
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Dispensar insight"
                      onClick={event => {
                        event.stopPropagation()
                        setDismissedInsights(ids => [...ids, item.id])
                      }}
                      style={{ position: 'absolute', top: 9, right: 9, background: 'transparent', border: 'none', color: 'var(--t2)', fontSize: 16 }}
                    >
                      ×
                    </button>
                    <div style={{ color: 'var(--gr)', fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 9 }}>Insight</div>
                    <div style={{ fontSize: 13, fontWeight: 800, paddingRight: 20 }}>{item.text}</div>
                    <div style={{ color: 'var(--t2)', fontSize: 11, marginTop: 7, lineHeight: 1.4 }}>{item.detail}</div>
                  </button>
                ))}
                {!visibleInsights.length && (
                  <div style={{ color: 'var(--t2)', fontSize: 12, border: '1px dashed var(--bd)', borderRadius: 12, padding: 18 }}>
                    Sem novos alertas. Adicione transações para receber recomendações.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default BusinessDashboard
