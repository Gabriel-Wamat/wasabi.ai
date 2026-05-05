'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface DocumentPreviewModalProps {
  isOpen: boolean
  title: string
  url: string | null
  onClose: () => void
}

export function DocumentPreviewModal({ isOpen, title, url, onClose }: DocumentPreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Documento'} maxWidth="min(1180px, calc(100vw - 32px))">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          height: 'min(72vh, 760px)',
          minHeight: 420,
          border: '1px solid var(--bd)',
          borderRadius: 10,
          overflow: 'hidden',
          background: 'var(--s2)',
        }}>
          {url ? (
            <iframe
              src={url}
              title={title || 'Visualização do documento'}
              style={{ width: '100%', height: '100%', border: 0, background: 'var(--s2)' }}
            />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)', fontSize: 13 }}>
              Carregando documento...
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {url && (
            <Button variant="secondary" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
              Abrir em nova aba
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
