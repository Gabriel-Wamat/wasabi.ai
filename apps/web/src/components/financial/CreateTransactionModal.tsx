'use client'
import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { api } from '@/lib/api/client'

interface Category {
  id: string
  name: string
  type: string
  color: string
  icon: string
}

interface CreateTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateTransactionModal({ isOpen, onClose, onSuccess }: CreateTransactionModalProps) {
  const { showToast } = useToast()
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      api.get<{ data: Category[] }>(`/categories?type=${type}`)
        .then(r => {
          setCategories(r.data)
          if (r.data.length > 0 && !categoryId) {
            setCategoryId(r.data[0].id)
          }
        })
        .catch(() => {})
    }
  }, [isOpen, type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100)
      await api.post('/transactions', {
        type,
        amount: amountInCents,
        categoryId,
        description,
        date: new Date(date).toISOString(),
        paymentMethod,
        isRecurring: false,
        tags: [],
      })
      onSuccess()
      onClose()
      showToast('Transação criada com sucesso!', 'success')
      setAmount('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
    } catch (err: any) {
      setError(err.message ?? 'Erro ao criar transação')
      showToast(err.message ?? 'Erro ao criar transação', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Transação">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Tipo</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['INCOME', 'EXPENSE'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategoryId('') }}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8,
                  border: `1px solid ${type === t ? 'var(--gr)' : 'var(--bd)'}`,
                  background: type === t ? 'rgba(17, 199, 111, 0.1)' : 'var(--s2)',
                  color: type === t ? 'var(--gr)' : 'var(--tx)',
                  fontWeight: 500, fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {t === 'INCOME' ? '💼 Receita' : '💸 Despesa'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            required
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
              fontSize: 14, outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Categoria</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            required
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
              fontSize: 14, outline: 'none'
            }}
          >
            <option value="">Selecione...</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Descrição</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ex: Supermercado, Salário..."
            required
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
              fontSize: 14, outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Data</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
              fontSize: 14, outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Forma de Pagamento</label>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
              fontSize: 14, outline: 'none'
            }}
          >
            <option value="PIX">PIX</option>
            <option value="CREDIT_CARD">Cartão de Crédito</option>
            <option value="DEBIT_CARD">Cartão de Débito</option>
            <option value="CASH">Dinheiro</option>
            <option value="BANK_TRANSFER">Transferência</option>
            <option value="OTHER">Outro</option>
          </select>
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
            {loading ? 'Salvando...' : 'Criar Transação'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
