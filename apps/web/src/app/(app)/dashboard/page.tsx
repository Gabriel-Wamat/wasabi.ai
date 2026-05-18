'use client'
import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api/client'
import { DashboardOverview } from '@/types'
import { Header } from '@/components/layout/Header'
import { StatCard } from '@/components/ui/Card'
import { statusBadge } from '@/components/ui/Badge'
import { CashflowSummary, DashChart } from '@/components/charts/DashChart'
import { Filter, FilterBar, SearchFilter } from '@/components/ui/Filters'

function fmt(cents: number) {
  return 'R$' + (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function normalize(value: string | null | undefined) {
  return (value ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export default function DashboardPage() {
  const [data, setData]  = useState<DashboardOverview | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [itemType, setItemType] = useState('all')
  const [status, setStatus] = useState('all')
  const [cashflowSummary, setCashflowSummary] = useState<CashflowSummary | null>(null)

  useEffect(() => {
    api.get<{ data: DashboardOverview }>('/dashboard/overview')
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
  }, [])

  const normalizedSearch = normalize(search)
  const attentionDocuments = data?.attentionDocuments ?? []
  const activeProjects = data?.activeProjects ?? []

  const filteredDocuments = useMemo(() => {
    return attentionDocuments.filter(doc => {
      const text = normalize([
        doc.title, doc.category, doc.issuerName, doc.company,
        doc.number, doc.type, doc.status, ...doc.tags,
      ].filter(Boolean).join(' '))
      const matchesSearch = !normalizedSearch || text.includes(normalizedSearch)
      const matchesType = itemType === 'all' || itemType === 'documents'
      const matchesStatus = status === 'all' || doc.status === status
      return matchesSearch && matchesType && matchesStatus
    })
  }, [attentionDocuments, itemType, normalizedSearch, status])

  const filteredProjects = useMemo(() => {
    return activeProjects.filter(project => {
      const text = normalize([
        project.title, project.description, project.status,
        project.priority, ...project.tags,
      ].filter(Boolean).join(' '))
      const matchesSearch = !normalizedSearch || text.includes(normalizedSearch)
      const matchesType = itemType === 'all' || itemType === 'projects'
      const matchesStatus = status === 'all' || project.status === status
      return matchesSearch && matchesType && matchesStatus
    })
  }, [activeProjects, itemType, normalizedSearch, status])

  const activeFilterCount = [search.trim(), itemType !== 'all', status !== 'all'].filter(Boolean).length
  const totalFiltered = filteredDocuments.length + filteredProjects.length

  function clearFilters() {
    setSearch('')
    setItemType('all')
    setStatus('all')
  }

  if (error) return (
    <div>
      <Header title="Dashboard" eyebrow="Visão geral" />
      <div style={{ padding: 24, color: 'var(--rd)' }}>{error}</div>
    </div>
  )

  if (!data) return (
    <div>
      <Header title="Dashboard" eyebrow="Visão geral" />
      <div style={{ padding: 24, color: 'var(--t2)' }}>Carregando...</div>
    </div>
  )

  const { stats } = data
  const cashflowNetLabel = cashflowSummary
    ? `${cashflowSummary.net >= 0 ? '+' : '-'}${fmt(Math.abs(cashflowSummary.net))}`
    : null
  const cashflowState = cashflowSummary
    ? cashflowSummary.net > 0 ? 'superávit' : cashflowSummary.net < 0 ? 'déficit' : 'equilíbrio'
    : null

  return (
    <div>
      <Header title="Dashboard" eyebrow="Visão geral" showSearch />
      <div className="page-pad">
        <FilterBar onClear={activeFilterCount ? clearFilters : undefined}>
          <SearchFilter
            placeholder="Buscar documentos e projetos..."
            value={search}
            onChange={setSearch}
            fullWidth
          />
          <Filter
            label="Tipo"
            value={itemType}
            onChange={setItemType}
            options={[
              { value: 'all', label: 'Tudo' },
              { value: 'documents', label: 'Documentos' },
              { value: 'projects', label: 'Projetos' },
            ]}
          />
          <Filter
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'EXPIRED', label: 'Vencido' },
              { value: 'EXPIRING_SOON', label: 'Vencendo' },
              { value: 'NO_EXPIRY', label: 'Sem validade' },
              { value: 'ACTIVE', label: 'Ativo' },
            ]}
          />
          <div className="filter-meta">
            {activeFilterCount ? `${totalFiltered} resultado${totalFiltered === 1 ? '' : 's'}` : 'Visão geral'}
          </div>
        </FilterBar>

        {/* Stats */}
        <div className="grid-stats">
          <StatCard label="Documentos"      value={stats.totalDocuments} sub={`${stats.expiringSoon} vencendo em breve`} />
          <StatCard label="Projetos Ativos" value={stats.activeProjects} color="var(--bl)" sub="em andamento" />
          <StatCard label="Saldo Atual"     value={fmt(stats.currentBalance)} color="var(--gr)" sub="este mês" />
          <StatCard label="Gastos do Mês"   value={fmt(stats.monthlyExpenses)} color="var(--rd)" sub={`Receita: ${fmt(stats.monthlyIncome)}`} />
        </div>

        {/* Cashflow chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              Fluxo de Caixa{cashflowSummary ? ` — ${cashflowSummary.period}` : ''}
            </div>
            {cashflowSummary && (
              <div style={{ color: 'var(--t2)', fontSize: 11, marginTop: 3 }}>
                Estado atual: {cashflowState} de {cashflowNetLabel}
              </div>
            )}
          </div>
          {cashflowSummary && (
            <div style={{
              color: cashflowSummary.net >= 0 ? 'var(--gr)' : 'var(--rd)',
              background: cashflowSummary.net >= 0 ? 'var(--gd)' : 'rgba(240,85,108,.12)',
              border: '1px solid var(--bd)',
              borderRadius: 8,
              padding: '5px 9px',
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              {cashflowNetLabel}
            </div>
          )}
        </div>
        <div className="card" style={{ marginBottom: 22 }}>
          <DashChart months={6} onSummaryChange={setCashflowSummary} />
        </div>

        {/* Attention docs */}
        <div className="section-head">
          <h2>Documentos com Atenção</h2>
        </div>
        <div style={{ overflowX: 'auto', marginBottom: 22 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Categoria</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map(doc => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 600 }}>{doc.title}</td>
                  <td>{statusBadge(doc.type)}</td>
                  <td className="muted">{fmtDate(doc.expiresAt)}</td>
                  <td>{statusBadge(doc.status)}</td>
                  <td></td>
                </tr>
              ))}
              {!filteredDocuments.length && (
                <tr><td colSpan={5} className="tbl-empty">Nenhum documento encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Active projects */}
        <div className="section-head">
          <h2>Projetos Ativos</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {filteredProjects.map(p => (
            <div key={p.id} className="card">
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12, lineHeight: 1.45 }}>{p.description}</div>
              <div className="progress-track" style={{ marginBottom: 6 }}>
                <div className="progress-fill" style={{ width: `${p.progress}%`, background: p.color }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span className="dim">Progresso</span>
                <span style={{ color: p.color, fontWeight: 700 }}>{p.progress}%</span>
              </div>
            </div>
          ))}
          {!filteredProjects.length && (
            <div className="card" style={{ color: 'var(--t3)', fontSize: 13 }}>
              Nenhum projeto encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
