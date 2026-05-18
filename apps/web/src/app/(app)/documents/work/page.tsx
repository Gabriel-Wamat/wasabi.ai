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
  const [status, setStatus] = useState('')
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

  const valid    = docs.filter(d => d.status === 'VALID').length
  const expiring = docs.filter(d => d.status === 'EXPIRING_SOON').length
  const expired  = docs.filter(d => d.status === 'EXPIRED').length

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
      <Header title="Documentos de Trabalho" eyebrow="Cofre digital" />
      <div className="page-pad">
        <div className="grid-stats">
          <div className="stat-card">
            <div className="stat-label">Total</div>
            <div className="stat-value">{docs.length}</div>
            <div className="stat-sub">documentos</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Válidos</div>
            <div className="stat-value" style={{ color: 'var(--gr)' }}>{valid}</div>
            <div className="stat-sub">em dia</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Vencendo</div>
            <div className="stat-value" style={{ color: 'var(--yw)' }}>{expiring}</div>
            <div className="stat-sub">em 30 dias</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Vencidos</div>
            <div className="stat-value" style={{ color: 'var(--rd)' }}>{expired}</div>
            <div className="stat-sub">expirados</div>
          </div>
        </div>

        <div className="filter-bar">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar documento..."
            style={{ flex: 1, minWidth: 160, background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--r-sm)', padding: '0 12px', height: 36, color: 'var(--tx)', fontSize: 13, outline: 'none' }}
          />
          <div className="filter-pill">
            <span className="pill-label">Status</span>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ background: 'transparent', border: 0, color: 'var(--tx)', fontSize: 13, outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}>
              <option value="">Todos</option>
              <option value="VALID">Válido</option>
              <option value="EXPIRING_SOON">Vencendo</option>
              <option value="EXPIRED">Vencido</option>
            </select>
          </div>
          <div className="filter-meta">{docs.length} documento{docs.length !== 1 ? 's' : ''}</div>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>+ Adicionar</Button>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: 20 }}>Carregando...</div>
        ) : (
          <div style={{ overflowX: 'auto', opacity: refreshing ? 0.72 : 1, transition: 'opacity 160ms ease' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Número</th>
                  <th>Emissor</th>
                  <th>Empresa</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 600 }}>{doc.title}</td>
                    <td className="muted mono" style={{ fontSize: 12 }}>{doc.number ?? '—'}</td>
                    <td className="muted">{doc.issuerName ?? '—'}</td>
                    <td className="muted">{doc.company ?? '—'}</td>
                    <td className="muted">{fmtDate(doc.expiresAt)}</td>
                    <td>{statusBadge(doc.status)}</td>
                    <td>
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
                  <tr><td colSpan={7} className="tbl-empty">Nenhum documento encontrado</td></tr>
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
