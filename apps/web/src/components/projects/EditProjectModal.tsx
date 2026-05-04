'use client'
import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { api } from '@/lib/api/client'
import { Project } from '@/types'

interface EditProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  project: Project
}

export function EditProjectModal({ isOpen, onClose, onSuccess, project }: EditProjectModalProps) {
  const { showToast } = useToast()
  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description || '')
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'>(project.status as any)
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(project.priority as any)
  const [progress, setProgress] = useState(project.progress.toString())
  const [color, setColor] = useState(project.color)
  const [tags, setTags] = useState(project.tags.join(', '))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const colors = [
    { name: 'Verde', value: '#11C76F' },
    { name: 'Azul', value: '#4A90D9' },
    { name: 'Roxo', value: '#A78BFA' },
    { name: 'Laranja', value: '#FB923C' },
    { name: 'Amarelo', value: '#FFC107' },
    { name: 'Cyan', value: '#34D399' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.put(`/projects/${project.id}`, {
        title,
        description,
        status,
        priority,
        progress: parseInt(progress),
        color,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      onSuccess()
      onClose()
      showToast('Projeto atualizado com sucesso!', 'success')
    } catch (err: any) {
      setError(err.message ?? 'Erro ao atualizar projeto')
      showToast(err.message ?? 'Erro ao atualizar projeto', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Projeto">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Título *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
              fontSize: 14, outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Descrição</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
              fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              style={{
                width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
                borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
                fontSize: 14, outline: 'none'
              }}
            >
              <option value="ACTIVE">Ativo</option>
              <option value="PAUSED">Pausado</option>
              <option value="COMPLETED">Concluído</option>
              <option value="ARCHIVED">Arquivado</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Prioridade</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as any)}
              style={{
                width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)',
                borderRadius: 8, padding: '10px 12px', color: 'var(--tx)',
                fontSize: 14, outline: 'none'
              }}
            >
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>
            Progresso: {progress}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={e => setProgress(e.target.value)}
            style={{ width: '100%', height: 6, cursor: 'pointer' }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Cor</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {colors.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                style={{
                  width: '100%', aspectRatio: '1', borderRadius: 8,
                  background: c.value, border: `2px solid ${color === c.value ? '#fff' : 'transparent'}`,
                  cursor: 'pointer', transition: 'transform 0.15s',
                  boxShadow: color === c.value ? '0 0 0 2px var(--bd)' : 'none'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Tags</label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
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
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
