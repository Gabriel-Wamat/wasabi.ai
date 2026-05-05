'use client'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { api } from '@/lib/api/client'
import { FinancialGoal } from '@/types'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { CreateGoalModal } from '@/components/goals/CreateGoalModal'
import { EditGoalModal } from '@/components/goals/EditGoalModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

function panel(extra: CSSProperties = {}): CSSProperties {
  return {
    background: 'rgba(20,20,20,0.92)',
    border: '1px solid var(--bd)',
    borderRadius: 14,
    boxShadow: '0 18px 50px rgba(0,0,0,0.18)',
    ...extra,
  }
}

function GoalStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={panel({ padding: 14, minHeight: 96 })}>
      <div style={{ color: 'var(--t2)', fontSize: 11, fontWeight: 800 }}>{label}</div>
      <div style={{ color: 'var(--tx)', fontSize: 24, fontWeight: 850, marginTop: 12, lineHeight: 1 }}>{value}</div>
      <div style={{ color: 'var(--t3)', fontSize: 11, marginTop: 9 }}>{sub}</div>
    </div>
  )
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

  const hasActiveFilters = Boolean(searchTerm)
  const totalCurrent = useMemo(() => allGoals.reduce((sum, goal) => sum + goal.currentAmount, 0), [allGoals])
  const totalTarget = useMemo(() => allGoals.reduce((sum, goal) => sum + goal.targetAmount, 0), [allGoals])
  const averageProgress = useMemo(() => {
    if (!allGoals.length) return 0
    return Math.round(allGoals.reduce((sum, goal) => sum + goal.progressPercent, 0) / allGoals.length)
  }, [allGoals])
  const nearestGoal = useMemo(() => {
    return [...allGoals].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0]
  }, [allGoals])

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
      <main style={{ padding: 20, display: 'grid', gap: 16 }}>
        <section style={panel({ padding: 16 })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 850, lineHeight: 1.15 }}>Metas Financeiras</h1>
              <p style={{ color: 'var(--t2)', fontSize: 12, marginTop: 6 }}>Acompanhe prioridades sem perder o foco no progresso real.</p>
            </div>
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>+ Nova Meta</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 16 }}>
            <GoalStat label="Guardado" value={fmt(totalCurrent)} sub={`${averageProgress}% do plano`} />
            <GoalStat label="Objetivo total" value={fmt(totalTarget)} sub={`${allGoals.length} metas ativas`} />
            <GoalStat label="Meta próxima" value={nearestGoal ? fmtDate(nearestGoal.deadline) : '—'} sub={nearestGoal?.title ?? 'sem prazo definido'} />
          </div>
        </section>

        <section style={panel({ padding: 14 })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ flex: '1 1 260px', display: 'grid', gap: 6 }}>
              <span style={{ color: 'var(--t2)', fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>Buscar</span>
              <input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Buscar metas..."
                style={{
                  minHeight: 42,
                  background: 'var(--s2)',
                  border: '1px solid var(--bd)',
                  borderRadius: 10,
                  color: 'var(--tx)',
                  padding: '0 13px',
                  outline: 'none',
                  fontSize: 13,
                }}
              />
            </label>
            <div style={{ color: 'var(--t2)', fontSize: 12, fontWeight: 700, marginLeft: 'auto' }}>
              {goals.length} {goals.length === 1 ? 'meta' : 'metas'}
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  minHeight: 38,
                  padding: '0 12px',
                  border: '1px solid var(--bd)',
                  borderRadius: 10,
                  background: 'transparent',
                  color: 'var(--t2)',
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                Limpar
              </button>
            )}
          </div>
        </section>

        {loading ? (
          <div style={panel({ color: 'var(--t2)', padding: 24 })}>Carregando...</div>
        ) : (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {goals.map(g => (
              <article key={g.id} style={panel({ padding: 14, minHeight: 172, display: 'grid', gap: 12 })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
                    <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--gd)', border: '1px solid rgba(17,199,111,0.24)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--gr)', boxShadow: '0 0 18px rgba(17,199,111,0.35)' }} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{ fontSize: 13, fontWeight: 850, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</h2>
                      <p style={{ color: 'var(--t2)', fontSize: 11, marginTop: 4 }}>Meta: {fmtDate(g.deadline)}</p>
                    </div>
                  </div>
                  <strong style={{ color: 'var(--gr)', fontSize: 16, lineHeight: 1 }}>{Math.min(100, g.progressPercent)}%</strong>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: 'var(--t2)', fontSize: 11, marginBottom: 8 }}>
                    <span>{fmt(g.currentAmount)}</span>
                    <span>{fmt(g.targetAmount)}</span>
                  </div>
                  <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, g.progressPercent)}%`, background: 'var(--gr)', borderRadius: 999, transition: 'width .25s ease' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ color: g.progressPercent >= 100 ? 'var(--gr)' : 'var(--t3)', fontSize: 11, fontWeight: 700 }}>
                    {g.progressPercent >= 100 ? 'Concluída' : `Faltam ${fmt(g.remaining)}`}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleEdit(g)}
                      style={{ border: '1px solid var(--bd)', borderRadius: 9, background: 'transparent', color: 'var(--tx)', padding: '7px 10px', fontSize: 11, fontWeight: 800 }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(g)}
                      style={{ border: '1px solid rgba(255,65,85,0.24)', borderRadius: 9, background: 'transparent', color: 'var(--rd)', padding: '7px 10px', fontSize: 11, fontWeight: 800 }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!goals.length && (
              <div style={panel({ color: 'var(--t2)', padding: 24, gridColumn: '1 / -1', textAlign: 'center' })}>
                Nenhuma meta encontrada.
              </div>
            )}
          </section>
        )}
      </main>

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
