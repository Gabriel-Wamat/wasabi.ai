'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'
import { Document, PaginatedResponse } from '@/types'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { statusBadge } from '@/components/ui/Badge'
import { CreateDocumentModal } from '@/components/documents/CreateDocumentModal'
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal'
import { useToast } from '@/components/ui/Toast'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function PersonalDocsPage() {
  const { showToast } = useToast()
  const [docs, setDocs]     = useState<Document[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null)

  const load = (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    const params = new URLSearchParams({ type: 'PERSONAL', limit: '50' })
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    api.get<PaginatedResponse<Document>>(`/documents?${params}`)
      .then(r => setDocs(r.data))
      .catch(() => {})
      .finally(() => {
        if (silent) setRefreshing(false)
        else setLoading(false)
      })
  }

  useEffect(() => {
    if (loading) load()
    else load(true)
  }, [search, status])

  const openDocument = async (doc: Document) => {
    if (doc.status === 'EXPIRED' || doc.status === 'EXPIRING_SOON') {
      setIsCreateOpen(true)
      return
    }

    if (!doc.fileUrl) {
      showToast('Este documento ainda não possui arquivo anexado.', 'info')
      return
    }

    setOpeningId(doc.id)
    try {
      const result = await api.get<{ data: { url: string } }>(`/documents/${doc.id}/file`)
      setPreview({ title: doc.title, url: result.data.url })
    } catch (err: any) {
      showToast(err.message ?? 'Não foi possível abrir o arquivo.', 'error')
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <div>
      <Header title="Documentos Pessoais" />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Documentos Pessoais</div>
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>+ Adicionar</Button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar documento..."
            style={{ flex: 1, minWidth: 120, background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 7, padding: '5px 10px', color: 'var(--tx)', fontSize: 12, outline: 'none' }}
          />
          <select
            value={status} onChange={e => setStatus(e.target.value)}
            style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 7, padding: '5px 10px', color: 'var(--tx)', fontSize: 12, outline: 'none' }}
          >
            <option value="">Todos</option>
            <option value="VALID">Válido</option>
            <option value="EXPIRING_SOON">Vencendo</option>
            <option value="EXPIRED">Vencido</option>
          </select>
        </div>

        {loading ? (
          <div style={{ color: 'var(--t2)', padding: 20 }}>Carregando...</div>
        ) : (
          <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden', opacity: refreshing ? 0.72 : 1, transition: 'opacity 160ms ease' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Documento', 'Número', 'Emissor', 'Emissão', 'Vencimento', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, color: 'var(--t2)', fontWeight: 500, padding: '8px 12px', borderBottom: '1px solid var(--bd)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #1c1c1c' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600, fontSize: 12 }}>{doc.title}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--t2)' }}>{doc.number ?? '—'}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--t2)' }}>{doc.issuerName ?? '—'}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--t2)' }}>{fmtDate(doc.issuedAt)}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--t2)' }}>{fmtDate(doc.expiresAt)}</td>
                    <td style={{ padding: '9px 12px' }}>{statusBadge(doc.status)}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <Button
                        size="sm"
                        variant={doc.status === 'EXPIRED' || doc.status === 'EXPIRING_SOON' ? 'primary' : 'secondary'}
                        onClick={() => openDocument(doc)}
                      >
                        {openingId === doc.id ? 'Abrindo...' : doc.status === 'EXPIRED' || doc.status === 'EXPIRING_SOON' ? 'Renovar' : 'Abrir'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {!docs.length && (
                  <tr><td colSpan={7} style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--t3)' }}>Nenhum documento encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateDocumentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={load}
        type="PERSONAL"
      />
      <DocumentPreviewModal
        isOpen={!!preview}
        title={preview?.title ?? ''}
        url={preview?.url ?? null}
        onClose={() => setPreview(null)}
      />
    </div>
  )
}
