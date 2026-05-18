'use client'
import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api/client'
import { Transaction, PaginatedResponse } from '@/types'
import { Header } from '@/components/layout/Header'
import { StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { CreateTransactionModal } from '@/components/financial/CreateTransactionModal'
import { EditTransactionModal } from '@/components/financial/EditTransactionModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { FilterBar, Filter, SearchFilter, DateFilter } from '@/components/ui/Filters'
import { IpcaComparisonChart } from '@/components/financial/IpcaComparisonChart'

function fmt(cents: number) {
  return 'R$' + (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
}

interface Summary {
  income: number
  expenses: number
  balance: number
  byCategory: Array<{ categoryId: string; name: string; color: string; icon: string; total: number }>
  cashflow: Array<{ month: string; income: number; expense: number }>
}

interface Category {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
}

const manualFields = [
  { key: 'salary',        label: 'Salário',           type: 'INCOME' as const,  category: 'Salário',      description: 'Salário' },
  { key: 'housing',       label: 'Moradia / aluguel', type: 'EXPENSE' as const, category: 'Moradia',      description: 'Moradia' },
  { key: 'food',          label: 'Alimentação',       type: 'EXPENSE' as const, category: 'Alimentação',  description: 'Alimentação' },
  { key: 'transport',     label: 'Transporte',        type: 'EXPENSE' as const, category: 'Transporte',   description: 'Transporte' },
  { key: 'subscriptions', label: 'Assinaturas',       type: 'EXPENSE' as const, category: 'Assinaturas',  description: 'Assinaturas' },
]

function brlToCents(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.')
  const amount = Number.parseFloat(normalized)
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0
}

export default function FinancialPage() {
  const { showToast } = useToast()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [allTxs, setAllTxs] = useState<Transaction[]>([])
  const [period, setPeriod] = useState('THIS_MONTH')
  const [loading, setLoading] = useState(true)
  const [summaryRefreshing, setSummaryRefreshing] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [manualValues, setManualValues] = useState<Record<string, string>>({})
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0])
  const [manualSaving, setManualSaving] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadSummary = useCallback((selectedPeriod = period, silent = false) => {
    if (silent) setSummaryRefreshing(true)
    return api.get<{ data: Summary }>(`/financial/summary?period=${selectedPeriod}`)
      .then(summaryRes => setSummary(summaryRes.data))
      .catch((err: Error) => showToast(err.message || 'Erro ao carregar resumo financeiro', 'error'))
      .finally(() => { if (silent) setSummaryRefreshing(false) })
  }, [period, showToast])

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get<{ data: Summary }>(`/financial/summary?period=${period}`),
      api.get<PaginatedResponse<Transaction>>('/transactions?limit=100'),
    ])
      .then(([summaryRes, txRes]) => {
        setSummary(summaryRes.data)
        setAllTxs(txRes.data)
      })
      .catch((err: Error) => showToast(err.message || 'Erro ao carregar financeiro', 'error'))
      .finally(() => setLoading(false))
  }, [period, showToast])

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (!loading) loadSummary(period, true) }, [period])

  useEffect(() => {
    let filtered = [...allTxs]
    if (searchTerm) filtered = filtered.filter(tx => tx.description.toLowerCase().includes(searchTerm.toLowerCase()))
    if (typeFilter !== 'ALL') filtered = filtered.filter(tx => tx.type === typeFilter)
    if (paymentFilter !== 'ALL') filtered = filtered.filter(tx => tx.paymentMethod === paymentFilter)
    if (dateFrom) filtered = filtered.filter(tx => new Date(tx.date) >= new Date(dateFrom))
    if (dateTo) filtered = filtered.filter(tx => new Date(tx.date) <= new Date(dateTo))
    setTxs(filtered)
  }, [searchTerm, typeFilter, paymentFilter, dateFrom, dateTo, allTxs])

  const clearFilters = () => {
    setSearchTerm('')
    setTypeFilter('ALL')
    setPaymentFilter('ALL')
    setDateFrom('')
    setDateTo('')
  }

  const handleDeleteConfirm = async () => {
    if (!selectedTx) return
    try {
      await api.delete(`/transactions/${selectedTx.id}`)
      showToast('Transação excluída com sucesso!', 'success')
      loadData()
    } catch (err: any) {
      showToast(err.message ?? 'Erro ao excluir transação', 'error')
    }
  }

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setManualSaving(true)
    try {
      const [incomeRes, expenseRes] = await Promise.all([
        api.get<{ data: Category[] }>('/categories?type=INCOME'),
        api.get<{ data: Category[] }>('/categories?type=EXPENSE'),
      ])
      const categories = [...incomeRes.data, ...expenseRes.data]
      const entries = manualFields
        .map(field => {
          const amount = brlToCents(manualValues[field.key] ?? '')
          const category = categories.find(item => item.type === field.type && item.name.toLowerCase() === field.category.toLowerCase())
          return { field, amount, categoryId: category?.id }
        })
        .filter(entry => entry.amount > 0)

      if (!entries.length) { showToast('Preencha pelo menos um valor para cadastrar.', 'info'); return }
      const missing = entries.find(entry => !entry.categoryId)
      if (missing) { showToast(`Categoria não encontrada: ${missing.field.category}`, 'error'); return }

      await Promise.all(entries.map(entry => api.post('/transactions', {
        type: entry.field.type,
        amount: entry.amount,
        categoryId: entry.categoryId,
        description: entry.field.description,
        date: new Date(`${manualDate}T12:00:00`).toISOString(),
        paymentMethod: entry.field.type === 'INCOME' ? 'BANK_TRANSFER' : 'PIX',
        isRecurring: false,
        tags: ['cadastro-manual'],
      })))

      showToast('Dados financeiros cadastrados.', 'success')
      setManualValues({})
      setIsManualModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message ?? 'Erro ao cadastrar dados financeiros', 'error')
    } finally {
      setManualSaving(false)
    }
  }

  const hasActiveFilters = searchTerm || typeFilter !== 'ALL' || paymentFilter !== 'ALL' || dateFrom || dateTo
  const totalExpenses = summary?.byCategory.reduce((sum, category) => sum + category.total, 0) || 1

  return (
    <div>
      <Header title="Finanças Pessoais" eyebrow="Pessoal" />
      <div className="page-pad">
        <div className="row between" style={{ marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Financeiro</div>
            <div className="dim" style={{ fontSize: 12, marginTop: 3 }}>Cadastre ou acompanhe sua base mensal.</div>
          </div>
          <div className="row">
            <Button variant="primary" size="sm" onClick={() => setIsManualModalOpen(true)}>+ Cadastrar dados</Button>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--r-sm)', padding: '7px 30px 7px 10px', color: 'var(--tx)', fontSize: 12, outline: 'none' }}
            >
              <option value="THIS_MONTH">Este mês</option>
              <option value="LAST_MONTH">Mês anterior</option>
              <option value="THIS_YEAR">Este ano</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: 20 }}>Carregando...</div>
        ) : summary ? (
          <>
            <div className="grid-stats" style={{ opacity: summaryRefreshing ? 0.72 : 1, transition: 'opacity 160ms ease', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              <StatCard label="Saldo" value={fmt(summary.balance)} color={summary.balance >= 0 ? 'var(--gr)' : 'var(--rd)'} sub="acumulado" />
              <StatCard label="Receita" value={fmt(summary.income)} color="var(--bl)" sub="total recebido" />
              <StatCard label="Despesas" value={fmt(summary.expenses)} color="var(--rd)" sub="total gasto" />
            </div>

            <div className="section-head"><h2>Gastos por Categoria</h2></div>
            <div className="card" style={{ marginBottom: 22 }}>
              {summary.byCategory.map(category => {
                const pct = Math.round((category.total / totalExpenses) * 100)
                return (
                  <div key={category.categoryId} style={{ marginBottom: 12 }}>
                    <div className="row between" style={{ marginBottom: 5, fontSize: 13 }}>
                      <span>{category.icon} {category.name}</span>
                      <span className="muted">{fmt(category.total)} ({pct}%)</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: category.color }} />
                    </div>
                  </div>
                )
              })}
              {!summary.byCategory.length && <div className="dim" style={{ fontSize: 13 }}>Sem despesas no período</div>}
            </div>

            <IpcaComparisonChart />

            <div className="section-head">
              <h2>Transações</h2>
              <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>+ Nova</Button>
            </div>

            <FilterBar onClear={hasActiveFilters ? clearFilters : undefined}>
              <SearchFilter placeholder="Buscar por descrição..." value={searchTerm} onChange={setSearchTerm} />
              <Filter label="Tipo" value={typeFilter} onChange={setTypeFilter} options={[
                { value: 'ALL', label: 'Todos' },
                { value: 'INCOME', label: 'Receitas' },
                { value: 'EXPENSE', label: 'Despesas' },
                { value: 'TRANSFER', label: 'Transferências' },
              ]} />
              <Filter label="Pagamento" value={paymentFilter} onChange={setPaymentFilter} options={[
                { value: 'ALL', label: 'Todos' },
                { value: 'PIX', label: 'PIX' },
                { value: 'CREDIT_CARD', label: 'Cartão Crédito' },
                { value: 'DEBIT_CARD', label: 'Cartão Débito' },
                { value: 'CASH', label: 'Dinheiro' },
                { value: 'BANK_TRANSFER', label: 'Transferência' },
              ]} />
              <DateFilter label="De" value={dateFrom} onChange={setDateFrom} />
              <DateFilter label="Até" value={dateTo} onChange={setDateTo} />
              <div className="filter-meta">{txs.length} {txs.length === 1 ? 'transação' : 'transações'}</div>
            </FilterBar>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {txs.map((tx, i) => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < txs.length - 1 ? '1px solid var(--bd)' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: tx.type === 'INCOME' ? 'var(--gd)' : 'rgba(240,85,108,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'none', stroke: tx.type === 'INCOME' ? 'var(--gr)' : 'var(--rd)', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                      {tx.type === 'INCOME'
                        ? <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></>
                        : <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></>
                      }
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{tx.description}</div>
                    <div className="dim" style={{ fontSize: 11 }}>{new Date(tx.date).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: tx.type === 'INCOME' ? 'var(--gr)' : 'var(--rd)' }}>
                      {tx.type === 'INCOME' ? '+' : ''}{tx.amountBRL}
                    </div>
                    <div className="dim" style={{ fontSize: 11 }}>{tx.paymentMethod}</div>
                  </div>
                  <div className="row" style={{ flexShrink: 0, gap: 6 }}>
                    <button onClick={() => { setSelectedTx(tx); setIsEditModalOpen(true) }} className="btn btn-secondary btn-sm">Editar</button>
                    <button onClick={() => { setSelectedTx(tx); setIsDeleteDialogOpen(true) }} className="btn btn-danger btn-sm">Excluir</button>
                  </div>
                </div>
              ))}
              {!txs.length && (
                <div className="tbl-empty">
                  {hasActiveFilters ? 'Nenhuma transação encontrada com os filtros aplicados' : 'Sem transações'}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      <CreateTransactionModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={loadData} />
      <Modal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} title="Cadastrar dados financeiros">
        <form onSubmit={handleManualSubmit}>
          <p style={{ margin: '0 0 16px', color: 'var(--t2)', fontSize: 13, lineHeight: 1.45 }}>
            Preencha sua base mensal. Os valores informados serão salvos como transações e entram nos gráficos imediatamente.
          </p>
          <label style={{ display: 'block', marginBottom: 14 }}>
            <span className="field-label">Data de referência</span>
            <input type="date" value={manualDate} onChange={event => setManualDate(event.target.value)}
              style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--r-sm)', padding: '10px 12px', color: 'var(--tx)', fontSize: 13, outline: 'none' }} />
          </label>
          <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
            {manualFields.map(field => (
              <label key={field.key} style={{ display: 'grid', gridTemplateColumns: '1fr 170px', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--bd)', borderRadius: 'var(--r-md)', background: 'var(--s2)' }}>
                <span>
                  <strong style={{ display: 'block', fontSize: 13 }}>{field.label}</strong>
                  <small className="dim" style={{ fontSize: 11 }}>{field.type === 'INCOME' ? 'Receita' : 'Despesa'} · {field.category}</small>
                </span>
                <input inputMode="decimal" value={manualValues[field.key] ?? ''} onChange={event => setManualValues(current => ({ ...current, [field.key]: event.target.value }))} placeholder="R$ 0,00"
                  style={{ width: '100%', background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 'var(--r-sm)', padding: '9px 10px', color: 'var(--tx)', fontSize: 13, outline: 'none' }} />
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button type="button" variant="secondary" onClick={() => setIsManualModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={manualSaving}>{manualSaving ? 'Salvando...' : 'Salvar dados'}</Button>
          </div>
        </form>
      </Modal>
      {selectedTx && (
        <EditTransactionModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSuccess={loadData} transaction={selectedTx} />
      )}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Transação"
        message="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        danger
      />
    </div>
  )
}
