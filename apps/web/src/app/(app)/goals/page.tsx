'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'
import { FinancialGoal } from '@/types'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { CreateGoalModal } from '@/components/goals/CreateGoalModal'
import { EditGoalModal } from '@/components/goals/EditGoalModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { FilterBar, SearchFilter } from '@/components/ui/Filters'

function fmt(cents: number) {
  return 'R$' + (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

export default function GoalsPage() {
  const { showToast } = useToast()
  const [goals, setGoals] = useState<FinancialGoal[]>([])
  const [allGoals, setAllGoals] = useState<FinancialGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null)

  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadGoals()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [searchTerm, allGoals])

  const loadGoals = () => {
    setLoading(true)
    api.get<{ data: FinancialGoal[] }>('/financial/goals')
      .then(r => setAllGoals(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const applyFilters = () => {
    let filtered = [...allGoals]

    if (searchTerm) {
      filtered = filtered.filter(g =>
        g.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setGoals(filtered)
  }

  const clearFilters = () => {
    setSearchTerm('')
  }

  const hasActiveFilters = searchTerm

  const handleEdit = (goal: FinancialGoal) => {
    setSelectedGoal(goal)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (goal: FinancialGoal) => {
    setSelectedGoal(goal)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedGoal) return
    try {
      await api.delete(`/financial/goals/${selectedGoal.id}`)
      showToast('Meta excluída com sucesso!', 'success')
      loadGoals()
    } catch (err: any) {
      showToast(err.message ?? 'Erro ao excluir meta', 'error')
    }
  }

  return (
    <div>
      <Header title="Metas Financeiras" />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Metas Financeiras</div>
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>+ Nova Meta</Button>
        </div>

        <FilterBar onClear={hasActiveFilters ? clearFilters : undefined}>
          <SearchFilter
            placeholder="Buscar metas..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </FilterBar>

        <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 12 }}>
          {goals.length} {goals.length === 1 ? 'meta' : 'metas'} {hasActiveFilters && '(filtradas)'}
        </div>

        {loading ? (
          <div style={{ color: 'var(--t2)', padding: 20 }}>Carregando...</div>
        ) : (
          <div>
            {goals.map(g => (
              <div key={g.id} style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{g.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{g.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--t2)' }}>Meta: {fmtDate(g.deadline)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gr)' }}>{g.progressPercent}%</div>
                    <div style={{ fontSize: 11, color: 'var(--t2)' }}>{fmt(g.currentAmount)} / {fmt(g.targetAmount)}</div>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--s3)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${g.progressPercent}%`, background: 'var(--gr)', borderRadius: 3, transition: 'width .3s' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                  Faltam {fmt(g.remaining)} para a meta
                  {g.progressPercent >= 100 && <span style={{ color: 'var(--gr)', marginLeft: 8, fontWeight: 600 }}>✓ Concluída!</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => handleEdit(g)}
                    style={{
                      flex: 1, background: 'var(--s3)', border: '1px solid var(--bd)',
                      borderRadius: 6, padding: '6px', color: 'var(--tx)',
                      fontSize: 11, cursor: 'pointer', fontWeight: 500,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bd)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--s3)')}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteClick(g)}
                    style={{
                      flex: 1, background: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)',
                      borderRadius: 6, padding: '6px', color: 'var(--rd)',
                      fontSize: 11, cursor: 'pointer', fontWeight: 500,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(244, 67, 54, 0.1)')}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
            {!goals.length && <div style={{ color: 'var(--t3)', padding: 20 }}>Nenhuma meta cadastrada</div>}
          </div>
        )}
      </div>

      <CreateGoalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadGoals}
      />

      {selectedGoal && (
        <EditGoalModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={loadGoals}
          goal={selectedGoal}
        />
      )}

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Meta"
        message="Tem certeza que deseja excluir esta meta financeira? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        danger={true}
      />
    </div>
  )
}
