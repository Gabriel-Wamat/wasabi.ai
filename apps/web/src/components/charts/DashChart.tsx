'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'

interface CashflowItem { month: string; income: number; expense: number }

export interface CashflowSummary {
  period: string
  income: number
  expense: number
  net: number
}

interface DashChartProps {
  months?: number
  onSummaryChange?: (summary: CashflowSummary | null) => void
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

function summarizeCashflow(data: CashflowItem[]): CashflowSummary | null {
  if (!data.length) return null

  const first = data[0]
  const last = data[data.length - 1]
  const income = data.reduce((total, item) => total + item.income, 0)
  const expense = data.reduce((total, item) => total + item.expense, 0)

  return {
    period: first.month === last.month ? first.month : `${first.month} a ${last.month}`,
    income,
    expense,
    net: income - expense,
  }
}

export function DashChart({ months = 6, onSummaryChange }: DashChartProps) {
  const [data, setData] = useState<CashflowItem[]>([])

  useEffect(() => {
    api.get<{ data: CashflowItem[] }>(`/financial/cashflow?months=${months}`)
      .then(r => {
        setData(r.data)
        onSummaryChange?.(summarizeCashflow(r.data))
      })
      .catch(() => {
        setData([])
        onSummaryChange?.(null)
      })
  }, [months, onSummaryChange])

  if (!data.length) return <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)' }}>Carregando gráfico...</div>

  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)))
  const plotHeight = 140
  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const ratio = (4 - index) / 4
    return {
      value: Math.round(maxVal * ratio),
      top: `${index * 25}%`,
    }
  })

  return (
    <div style={{ height: 178, display: 'grid', gridTemplateColumns: '58px minmax(0, 1fr) auto', alignItems: 'end', gap: 10 }}>
      <div style={{ height: plotHeight, position: 'relative', alignSelf: 'start', marginTop: 2 }}>
        {gridLines.map(line => (
          <div
            key={line.top}
            style={{
              position: 'absolute',
              right: 0,
              top: line.top,
              transform: 'translateY(-50%)',
              color: 'var(--t3)',
              fontSize: 9,
              fontWeight: 600,
              lineHeight: 1,
              opacity: 0.72,
              whiteSpace: 'nowrap',
            }}
          >
            {currency.format(line.value / 100)}
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', minWidth: 0, height: 166 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 2, height: plotHeight, pointerEvents: 'none' }}>
          {gridLines.map(line => (
            <div
              key={line.top}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: line.top,
                borderTop: line.value === 0 ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(255,255,255,.045)',
              }}
            />
          ))}
        </div>

        <div style={{ position: 'relative', zIndex: 1, height: 166, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          {data.map((d, i) => {
            const incomeH  = maxVal > 0 ? (d.income  / maxVal) * 130 : 0
            const expenseH = maxVal > 0 ? (d.expense / maxVal) * 130 : 0
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: plotHeight }}>
                  <div style={{ width: 10, height: incomeH,  background: 'var(--gr)', borderRadius: '3px 3px 0 0' }} title={`Receita: ${currency.format(d.income / 100)}`} />
                  <div style={{ width: 10, height: expenseH, background: 'var(--rd)', borderRadius: '3px 3px 0 0' }} title={`Despesa: ${currency.format(d.expense / 100)}`} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--t3)', textAlign: 'center' }}>{d.month}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-end', paddingBottom: 18, marginLeft: 8, fontSize: 10 }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--gr)', borderRadius: 2, marginRight: 4 }} />Receita</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--rd)', borderRadius: 2, marginRight: 4 }} />Despesa</span>
      </div>
    </div>
  )
}
