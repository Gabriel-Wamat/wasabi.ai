'use client'
import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { api } from '@/lib/api/client'

interface CreateGoalModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateGoalModal({ isOpen, onClose, onSuccess }: CreateGoalModalProps) {
  const [title, setTitle] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('0')
  const [deadline, setDeadline] = useState('')
  const [icon, setIcon] = useState('🎯')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const icons = ['🎯', '💰', '🏠', '✈️', '🚗', '💻', '🎓', '🛡️', '📈', '💳', '🎁', '⚡']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const targetInCents = Math.round(parseFloat(targetAmount) * 100)
      const currentInCents = Math.round(parseFloat(currentAmount) * 100)
      
      await api.post('/financial/goals', {
        title,
        targetAmount: targetInCents,
        currentAmount: currentInCents,
        deadline: new Date(deadline).toISOString(),
        icon,
      })
      onSuccess()
      onClose()
      setTitle('')
      setTargetAmount('')
      setCurrentAmount('0')
      setDeadline('')
      setIcon('🎯')
    } catch (err: any) {
      setError(err.message ?? 'Erro ao criar meta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Meta Financeira">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Ícone</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {icons.map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                style={{
                  width: '100%', aspectRatio: '1', borderRadius: 8,
                  background: icon === i ? 'var(--s3)' : 'var(--s2)',
                  border: `1px solid ${icon === i ? 'var(--gr)' : 'var(--bd)'}`,
                  fontSize: 20, cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Título *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Reserva de Emergência, Viagem..."
            required
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
              fontSize: 14, outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Valor Alvo (R$) *</label>
            <input
              type="number"
              step="0.01"
              value={targetAmount}
              onChange={e => setTargetAmount(e.target.value)}
              placeholder="10000.00"
              required
              style={{
                width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
                borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
                fontSize: 14, outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Valor Atual (R$)</label>
            <input
              type="number"
              step="0.01"
              value={currentAmount}
              onChange={e => setCurrentAmount(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
                borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
                fontSize: 14, outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Data Alvo *</label>
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            required
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
              fontSize: 14, outline: 'none'
            }}
          />
        </div>

        {error && (
          <div style={{
            background: '#2a0808', border: '1px solid var(--rd)',
            borderRadius: 8, padding: '10px 12px', fontSize: 12,
            color: 'var(--rd)', marginBottom: 16
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <Button type="button" variant="secondary" onClick={onClose} style={{ flex: 1 }}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Criando...' : 'Criar Meta'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
