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
  return (value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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
        doc.title,
        doc.category,
        doc.issuerName,
        doc.company,
        doc.number,
        doc.type,
        doc.status,
        ...doc.tags,
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
        project.title,
        project.description,
        project.status,
        project.priority,
        ...project.tags,
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
      <Header title="Dashboard" />
      <div style={{ padding: 20, color: 'var(--rd)' }}>{error}</div>
    </div>
  )

  if (!data) return (
    <div>
      <Header title="Dashboard" />
      <div style={{ padding: 20, color: 'var(--t2)' }}>Carregando...</div>
    </div>
  )

  const { stats } = data
  const cashflowNetLabel = cashflowSummary
    ? `${cashflowSummary.net >= 0 ? '+' : '-'}${fmt(Math.abs(cashflowSummary.net))}`
    : null
  const cashflowState = cashflowSummary
    ? cashflowSummary.net > 0
      ? 'superávit'
      : cashflowSummary.net < 0
        ? 'déficit'
        : 'equilíbrio'
    : null

  return (
    <div>
      <Header title="Dashboard" />
      <div style={{ padding: 20 }}>
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
          <div style={{ color: 'var(--t2)', fontSize: 12, marginLeft: activeFilterCount ? 0 : 'auto', paddingBottom: 9 }}>
            {activeFilterCount ? `${totalFiltered} resultado${totalFiltered === 1 ? '' : 's'}` : 'Visão geral'}
          </div>
        </FilterBar>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard label="Documentos"      value={stats.totalDocuments} sub={`${stats.expiringSoon} vencendo em breve`} />
          <StatCard label="Projetos Ativos" value={stats.activeProjects} color="var(--bl)" sub="em andamento" />
          <StatCard label="Saldo Atual"     value={fmt(stats.currentBalance)} color="var(--gr)" sub="este mês" />
          <StatCard label="Gastos do Mês"   value={fmt(stats.monthlyExpenses)} color="var(--rd)" sub={`Receita: ${fmt(stats.monthlyIncome)}`} />
        </div>

        {/* Cashflow chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
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
              background: cashflowSummary.net >= 0 ? 'var(--gd)' : 'rgba(255, 71, 87, 0.12)',
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
        <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <DashChart months={6} onSummaryChange={setCashflowSummary} />
        </div>

        {/* Attention docs */}
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Documentos com Atenção</div>
        <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
          {filteredDocuments.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Documento', 'Tipo', 'Vencimento', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, color: 'var(--t2)', fontWeight: 500, padding: '8px 12px', borderBottom: '1px solid var(--bd)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #1c1c1c' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600, fontSize: 12 }}>{doc.title}</td>
                    <td style={{ padding: '9px 12px' }}>{statusBadge(doc.type)}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--t2)' }}>{fmtDate(doc.expiresAt)}</td>
                    <td style={{ padding: '9px 12px' }}>{statusBadge(doc.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 18, color: 'var(--t2)', fontSize: 12 }}>Nenhum documento encontrado para os filtros atuais.</div>
          )}
        </div>

        {/* Active projects */}
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Projetos Ativos</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {filteredProjects.map(p => (
            <div key={p.id} style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 10, lineHeight: 1.4 }}>{p.description}</div>
              <div style={{ height: 4, background: 'var(--s3)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: `${p.progress}%`, background: p.color, borderRadius: 2 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--t2)' }}>Progresso</span>
                <span style={{ color: p.color, fontWeight: 600 }}>{p.progress}%</span>
              </div>
            </div>
          ))}
          {!filteredProjects.length && (
            <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, padding: 18, color: 'var(--t2)', fontSize: 12 }}>
              Nenhum projeto encontrado para os filtros atuais.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
