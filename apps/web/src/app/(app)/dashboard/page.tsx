'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'
import { DashboardOverview } from '@/types'
import { Header } from '@/components/layout/Header'
import { StatCard } from '@/components/ui/Card'
import { statusBadge } from '@/components/ui/Badge'
import { DashChart } from '@/components/charts/DashChart'

function fmt(cents: number) {
  return 'R$' + (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function DashboardPage() {
  const [data, setData]  = useState<DashboardOverview | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<{ data: DashboardOverview }>('/dashboard/overview')
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
  }, [])

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

  return (
    <div>
      <Header title="Dashboard" />
      <div style={{ padding: 20 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard label="Documentos"      value={stats.totalDocuments} sub={`${stats.expiringSoon} vencendo em breve`} />
          <StatCard label="Projetos Ativos" value={stats.activeProjects} color="var(--bl)" sub="em andamento" />
          <StatCard label="Saldo Atual"     value={fmt(stats.currentBalance)} color="var(--gr)" sub="este mês" />
          <StatCard label="Gastos do Mês"   value={fmt(stats.monthlyExpenses)} color="var(--rd)" sub={`Receita: ${fmt(stats.monthlyIncome)}`} />
        </div>

        {/* Cashflow chart */}
        <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 600 }}>Fluxo de Caixa — 6 meses</div>
        <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <DashChart />
        </div>

        {/* Attention docs */}
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Documentos com Atenção</div>
        <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Documento', 'Tipo', 'Vencimento', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, color: 'var(--t2)', fontWeight: 500, padding: '8px 12px', borderBottom: '1px solid var(--bd)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.attentionDocuments.map(doc => (
                <tr key={doc.id} style={{ borderBottom: '1px solid #1c1c1c' }}>
                  <td style={{ padding: '9px 12px', fontWeight: 600, fontSize: 12 }}>{doc.title}</td>
                  <td style={{ padding: '9px 12px' }}>{statusBadge(doc.type)}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--t2)' }}>{fmtDate(doc.expiresAt)}</td>
                  <td style={{ padding: '9px 12px' }}>{statusBadge(doc.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Active projects */}
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Projetos Ativos</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {data.activeProjects.map(p => (
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
        </div>
      </div>
    </div>
  )
}
