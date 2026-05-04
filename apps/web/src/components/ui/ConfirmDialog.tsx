'use client'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.6 }}>
          {message}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <Button type="button" variant="secondary" onClick={onClose} style={{ flex: 1 }}>
          {cancelText}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleConfirm}
          style={{
            flex: 1,
            ...(danger && {
              background: 'var(--rd)',
              borderColor: 'var(--rd)',
            }),
          }}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}
