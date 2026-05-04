'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'

interface CashflowItem { month: string; income: number; expense: number }

export function DashChart() {
  const [data, setData] = useState<CashflowItem[]>([])

  useEffect(() => {
    api.get<{ data: CashflowItem[] }>('/financial/cashflow?months=6')
      .then(r => setData(r.data))
      .catch(() => {})
  }, [])

  if (!data.length) return <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)' }}>Carregando gráfico...</div>

  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)))

  return (
    <div style={{ height: 160, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
      {data.map((d, i) => {
        const incomeH  = maxVal > 0 ? (d.income  / maxVal) * 130 : 0
        const expenseH = maxVal > 0 ? (d.expense / maxVal) * 130 : 0
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 140 }}>
              <div style={{ width: 10, height: incomeH,  background: '#11C76F', borderRadius: '3px 3px 0 0' }} title={`Receita: R$${(d.income/100).toLocaleString('pt-BR')}`} />
              <div style={{ width: 10, height: expenseH, background: '#FF4757', borderRadius: '3px 3px 0 0' }} title={`Despesa: R$${(d.expense/100).toLocaleString('pt-BR')}`} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--t3)', textAlign: 'center' }}>{d.month}</div>
          </div>
        )
      })}
      <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-end', paddingBottom: 18, marginLeft: 8, fontSize: 10 }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#11C76F', borderRadius: 2, marginRight: 4 }} />Receita</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#FF4757', borderRadius: 2, marginRight: 4 }} />Despesa</span>
      </div>
    </div>
  )
}
