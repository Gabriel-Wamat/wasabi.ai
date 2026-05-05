'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'
import { IpcaCategoryComparison, IpcaCategoryStatus, IpcaComparison } from '@/types'

const statusMeta: Record<IpcaCategoryStatus, { label: string; color: string; icon: string }> = {
  ABOVE:             { label: 'acima da inflação',  color: 'var(--rd)', icon: '▲' },
  BELOW:             { label: 'abaixo da inflação', color: 'var(--gr)', icon: '▼' },
  ALIGNED:           { label: 'alinhado à inflação', color: 'var(--yw)', icon: '≈' },
  INSUFFICIENT_DATA: { label: 'dados insuficientes', color: 'var(--t3)', icon: '–' },
}

function fmtPct(value: number | null): string {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toFixed(1).replace('.', ',')}%`
}

function fmtPP(value: number | null): string {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toFixed(1).replace('.', ',')}pp`
}

function CategoryRow({ item, scale }: { item: IpcaCategoryComparison; scale: number }) {
  const meta = statusMeta[item.status]
  const userPct  = item.userChange ?? 0
  const ipcaPct  = item.ipcaChange ?? 0

  const userBarWidth = scale > 0 ? Math.min(100, Math.abs(userPct) / scale * 100) : 0
  const ipcaPos      = scale > 0 ? Math.min(100, Math.abs(ipcaPct) / scale * 100) : 0
  const isNegative   = userPct < 0

  return (
    <div style={{ padding: '12px 0', borderTop: '1px solid var(--bd)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 14 }}>{item.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--t2)', whiteSpace: 'nowrap' }}>
          <span>Você <span style={{ color: 'var(--tx)', fontWeight: 600 }}>{fmtPct(item.userChange)}</span></span>
          <span>IPCA <span style={{ color: 'var(--tx)', fontWeight: 600 }}>{fmtPct(item.ipcaChange)}</span></span>
        </div>
      </div>

      <div style={{ position: 'relative', height: 8, background: 'var(--s3)', borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: 0, bottom: 0,
            left: 0,
            width: `${userBarWidth}%`,
            background: isNegative ? 'var(--gr)' : item.color,
            borderRadius: 4,
            transition: 'width .35s ease',
          }}
        />
        {item.ipcaChange !== null && (
          <div
            style={{
              position: 'absolute',
              top: -2, bottom: -2,
              left: `calc(${ipcaPos}% - 1px)`,
              width: 2,
              background: 'var(--tx)',
              opacity: 0.85,
            }}
            title={`IPCA: ${fmtPct(item.ipcaChange)}`}
          />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <div style={{ fontSize: 11, color: meta.color, fontWeight: 600 }}>
          <span style={{ marginRight: 4 }}>{meta.icon}</span>
          {item.delta !== null ? `${fmtPP(item.delta)} ${meta.label}` : meta.label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--t3)' }}>
          média: {(item.currentAvgCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}/mês
        </div>
      </div>
    </div>
  )
}

export function IpcaComparisonChart() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState<IpcaComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.get<{ data: IpcaComparison }>(`/financial/ipca-comparison?year=${year}`)
      .then(r => { if (!cancelled) setData(r.data) })
      .catch((err: Error) => { if (!cancelled) setError(err.message ?? 'Erro ao carregar comparativo') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [year])

  const visibleCategories = (data?.categories ?? []).filter(c => c.userChange !== null || c.ipcaChange !== null)
  const scale = visibleCategories.reduce((max, item) => {
    const u = Math.abs(item.userChange ?? 0)
    const i = Math.abs(item.ipcaChange ?? 0)
    return Math.max(max, u, i)
  }, 5)

  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Gastos vs. Inflação (IPCA)</div>
          <div style={{ fontSize: 11, color: 'var(--t2)' }}>
            {data?.period ?? 'comparação anual com índice oficial do IBGE'}
          </div>
        </div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 7, padding: '5px 10px', color: 'var(--tx)', fontSize: 11, outline: 'none' }}
        >
          {[currentYear, currentYear - 1, currentYear - 2].map(y => (
            <option key={y} value={y}>{y - 1} → {y}</option>
          ))}
        </select>
      </div>

      {data?.ipcaAccumulated !== null && data?.ipcaAccumulated !== undefined && (
        <div style={{ display: 'inline-block', background: 'var(--gd)', border: '1px solid var(--bd)', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: 'var(--gr)', marginBottom: 12 }}>
          IPCA acumulado: {fmtPct(data.ipcaAccumulated)}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--t2)', padding: '12px 0', fontSize: 12 }}>Carregando comparativo...</div>
      ) : error ? (
        <div style={{ color: 'var(--rd)', padding: '12px 0', fontSize: 12 }}>{error}</div>
      ) : !visibleCategories.length ? (
        <div style={{ color: 'var(--t3)', padding: '12px 0', fontSize: 12 }}>
          Sem dados suficientes para comparar este período. Adicione transações em pelo menos 2 anos.
        </div>
      ) : (
        <div>
          {visibleCategories.map(item => (
            <CategoryRow key={item.categoryId} item={item} scale={scale} />
          ))}
        </div>
      )}

      {data && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--bd)', fontSize: 10, color: 'var(--t3)', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span>Fonte: IBGE / SIDRA — IPCA acumulado no ano</span>
          <span>Atualizado: {new Date(data.fetchedAt).toLocaleString('pt-BR')}</span>
        </div>
      )}
    </div>
  )
}
