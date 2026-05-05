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

export default function WorkDocsPage() {
  const { showToast } = useToast()
  const [docs, setDocs]     = useState<Document[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null)

  const load = (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    const params = new URLSearchParams({ type: 'WORK', limit: '50' })
    if (search) params.set('search', search)
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
  }, [search])

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
      <Header title="Documentos de Trabalho" />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Documentos de Trabalho</div>
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>+ Adicionar</Button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar documento..."
            style={{ flex: 1, background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 7, padding: '5px 10px', color: 'var(--tx)', fontSize: 12, outline: 'none' }}
          />
        </div>

        {loading ? (
          <div style={{ color: 'var(--t2)', padding: 20 }}>Carregando...</div>
        ) : (
          <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden', opacity: refreshing ? 0.72 : 1, transition: 'opacity 160ms ease' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Documento', 'Categoria', 'Empresa', 'Data', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, color: 'var(--t2)', fontWeight: 500, padding: '8px 12px', borderBottom: '1px solid var(--bd)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #1c1c1c' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600, fontSize: 12 }}>{doc.title}</td>
                    <td style={{ padding: '9px 12px' }}>{statusBadge('WORK')}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--t2)' }}>{doc.company ?? '—'}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--t2)' }}>{fmtDate(doc.issuedAt)}</td>
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
                  <tr><td colSpan={6} style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--t3)' }}>Nenhum documento encontrado</td></tr>
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
        type="WORK"
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
