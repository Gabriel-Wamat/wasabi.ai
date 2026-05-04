'use client'
import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted && toasts.length > 0 && createPortal(
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 10000,
          display: 'flex', flexDirection: 'column', gap: 10,
          maxWidth: 400
        }}>
          {toasts.map(toast => (
            <div
              key={toast.id}
              style={{
                background: 'var(--s1)', border: '1px solid var(--bd)',
                borderRadius: 10, padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', gap: 10,
                animation: 'slideIn 0.3s ease-out',
                borderLeft: `3px solid ${
                  toast.type === 'success' ? 'var(--gr)' :
                  toast.type === 'error' ? 'var(--rd)' : 'var(--bl)'
                }`
              }}
            >
              <span style={{ fontSize: 18 }}>
                {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
              </span>
              <div style={{ flex: 1, fontSize: 13, color: 'var(--tx)' }}>
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none', border: 'none', color: 'var(--t2)',
                  cursor: 'pointer', fontSize: 18, padding: 0, width: 24, height: 24,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
          ))}
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
