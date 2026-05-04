'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'
import { Transaction, PaginatedResponse } from '@/types'
import { Header } from '@/components/layout/Header'
import { StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CreateTransactionModal } from '@/components/financial/CreateTransactionModal'
import { EditTransactionModal } from '@/components/financial/EditTransactionModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { FilterBar, Filter, SearchFilter, DateFilter } from '@/components/ui/Filters'

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

export default function FinancialPage() {
  const { showToast } = useToast()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [allTxs, setAllTxs] = useState<Transaction[]>([])
  const [period, setPeriod] = useState('THIS_MONTH')
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadData = () => {
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
  }

  useEffect(() => {
    loadData()
  }, [period])

  useEffect(() => {
    let filtered = [...allTxs]
    if (searchTerm) {
      filtered = filtered.filter(tx => tx.description.toLowerCase().includes(searchTerm.toLowerCase()))
    }
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

  const hasActiveFilters = searchTerm || typeFilter !== 'ALL' || paymentFilter !== 'ALL' || dateFrom || dateTo
  const totalExpenses = summary?.byCategory.reduce((sum, category) => sum + category.total, 0) || 1

  return (
    <div>
      <Header title="Financeiro" />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Financeiro</div>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 7, padding: '5px 10px', color: 'var(--tx)', fontSize: 12, outline: 'none' }}
          >
            <option value="THIS_MONTH">Este mês</option>
            <option value="LAST_MONTH">Mês anterior</option>
            <option value="THIS_YEAR">Este ano</option>
          </select>
        </div>

        {loading ? (
          <div style={{ color: 'var(--t2)', padding: 20 }}>Carregando...</div>
        ) : summary ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 20 }}>
              <StatCard label="Saldo" value={fmt(summary.balance)} color={summary.balance >= 0 ? 'var(--gr)' : 'var(--rd)'} sub="acumulado" />
              <StatCard label="Receita" value={fmt(summary.income)} color="var(--bl)" sub="total recebido" />
              <StatCard label="Despesas" value={fmt(summary.expenses)} color="var(--rd)" sub="total gasto" />
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Gastos por Categoria</div>
            <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              {summary.byCategory.map(category => {
                const pct = Math.round((category.total / totalExpenses) * 100)
                return (
                  <div key={category.categoryId} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                      <span>{category.icon} {category.name}</span>
                      <span style={{ color: 'var(--t2)' }}>{fmt(category.total)} ({pct}%)</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--s3)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: category.color, borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })}
              {!summary.byCategory.length && <div style={{ color: 'var(--t3)', fontSize: 12 }}>Sem despesas no período</div>}
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Transações</div>
            <FilterBar onClear={hasActiveFilters ? clearFilters : undefined}>
              <SearchFilter placeholder="Buscar por descrição..." value={searchTerm} onChange={setSearchTerm} />
              <Filter
                label="Tipo"
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'ALL', label: 'Todos' },
                  { value: 'INCOME', label: 'Receitas' },
                  { value: 'EXPENSE', label: 'Despesas' },
                  { value: 'TRANSFER', label: 'Transferências' },
                ]}
              />
              <Filter
                label="Pagamento"
                value={paymentFilter}
                onChange={setPaymentFilter}
                options={[
                  { value: 'ALL', label: 'Todos' },
                  { value: 'PIX', label: 'PIX' },
                  { value: 'CREDIT_CARD', label: 'Cartão Crédito' },
                  { value: 'DEBIT_CARD', label: 'Cartão Débito' },
                  { value: 'CASH', label: 'Dinheiro' },
                  { value: 'BANK_TRANSFER', label: 'Transferência' },
                ]}
              />
              <DateFilter label="De" value={dateFrom} onChange={setDateFrom} />
              <DateFilter label="Até" value={dateTo} onChange={setDateTo} />
            </FilterBar>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>
                {txs.length} {txs.length === 1 ? 'transação' : 'transações'} {hasActiveFilters && '(filtradas)'}
              </div>
              <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>+ Nova</Button>
            </div>

            <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden' }}>
              {txs.map(tx => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #1a1a1a' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: tx.type === 'INCOME' ? '#0a2318' : '#2a0808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {tx.type === 'INCOME' ? '💼' : '💸'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{tx.description}</div>
                    <div style={{ fontSize: 11, color: 'var(--t2)' }}>{new Date(tx.date).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: tx.type === 'INCOME' ? 'var(--gr)' : 'var(--rd)' }}>
                      {tx.type === 'INCOME' ? '+' : ''}{tx.amountBRL}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{tx.paymentMethod}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => { setSelectedTx(tx); setIsEditModalOpen(true) }} style={{ background: 'var(--s3)', border: '1px solid var(--bd)', borderRadius: 6, padding: '6px 10px', color: 'var(--tx)', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>Editar</button>
                    <button onClick={() => { setSelectedTx(tx); setIsDeleteDialogOpen(true) }} style={{ background: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)', borderRadius: 6, padding: '6px 10px', color: 'var(--rd)', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>Excluir</button>
                  </div>
                </div>
              ))}
              {!txs.length && (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>
                  {hasActiveFilters ? 'Nenhuma transação encontrada com os filtros aplicados' : 'Sem transações'}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      <CreateTransactionModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={loadData} />
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
