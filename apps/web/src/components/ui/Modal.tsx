'use client'
import { ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: number | string
  hideHeader?: boolean
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 480, hideHeader = false }: ModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      return () => window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  if (!mounted || !isOpen) return null

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: 20, animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--s1)', borderRadius: 14,
          border: '1px solid var(--bd)', maxWidth,
          width: '100%', maxHeight: '90vh', overflow: 'auto',
          animation: 'slideUp 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {!hideHeader && (
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--bd)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, background: 'var(--s1)', zIndex: 1
          }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: 'var(--t2)',
                cursor: 'pointer', fontSize: 22, padding: 0, width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, transition: 'background 0.15s'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--s2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              ×
            </button>
          </div>
        )}
        <div style={{ padding: 20 }}>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  )
}
