'use client'
import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { api } from '@/lib/api/client'

interface CreateDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  type: 'PERSONAL' | 'WORK'
}

export function CreateDocumentModal({ isOpen, onClose, onSuccess, type }: CreateDocumentModalProps) {
  const { showToast } = useToast()
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [number, setNumber] = useState('')
  const [issuerName, setIssuerName] = useState('')
  const [issuedAt, setIssuedAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const personalCategories = ['RG', 'CPF', 'CNH', 'Passaporte', 'Título de Eleitor', 'Carteira de Trabalho', 'Outro']
  const workCategories = ['Contrato', 'Holerite', 'Certificado', 'Diploma', 'Atestado', 'Outro']
  
  const categories = type === 'PERSONAL' ? personalCategories : workCategories

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/documents', {
        type,
        category,
        title,
        number: number || undefined,
        issuerName: issuerName || undefined,
        issuedAt: issuedAt ? new Date(issuedAt).toISOString() : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        company: type === 'WORK' && company ? company : undefined,
        tags: [],
        metadata: {},
      })
      onSuccess()
      onClose()
      showToast('Documento criado com sucesso!', 'success')
      // Reset form
      setCategory('')
      setTitle('')
      setNumber('')
      setIssuerName('')
      setIssuedAt('')
      setExpiresAt('')
      setCompany('')
    } catch (err: any) {
      setError(err.message ?? 'Erro ao criar documento')
      showToast(err.message ?? 'Erro ao criar documento', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Novo Documento ${type === 'PERSONAL' ? 'Pessoal' : 'de Trabalho'}`}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Categoria *</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            required
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
              fontSize: 14, outline: 'none'
            }}
          >
            <option value="">Selecione...</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Título *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: RG, Contrato CLT..."
            required
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
              fontSize: 14, outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Número</label>
          <input
            type="text"
            value={number}
            onChange={e => setNumber(e.target.value)}
            placeholder="Ex: 12.345.678-9"
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
              fontSize: 14, outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Órgão Emissor</label>
          <input
            type="text"
            value={issuerName}
            onChange={e => setIssuerName(e.target.value)}
            placeholder="Ex: SSP-PE, Receita Federal..."
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
              fontSize: 14, outline: 'none'
            }}
          />
        </div>

        {type === 'WORK' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Empresa</label>
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="Nome da empresa"
              style={{
                width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
                borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
                fontSize: 14, outline: 'none'
              }}
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Data de Emissão</label>
            <input
              type="date"
              value={issuedAt}
              onChange={e => setIssuedAt(e.target.value)}
              style={{
                width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
                borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
                fontSize: 14, outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Data de Vencimento</label>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              style={{
                width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
                borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
                fontSize: 14, outline: 'none'
              }}
            />
          </div>
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
            {loading ? 'Criando...' : 'Criar Documento'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
