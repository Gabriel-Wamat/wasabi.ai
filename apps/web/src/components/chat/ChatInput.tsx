'use client'
import { useEffect, useRef, useState } from 'react'

interface ChatInputProps {
  disabled?:    boolean
  placeholder?: string
  variant?:     'default' | 'centered'
  onSend:       (text: string) => void
}

const MAX_HEIGHT = 160

export function ChatInput({ disabled, placeholder = 'Pergunte sobre seus dados...', variant = 'default', onSend }: ChatInputProps) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const centered = variant === 'centered'

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(MAX_HEIGHT, el.scrollHeight) + 'px'
  }, [value])

  const submit = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
  }

  return (
    <div style={{
      background: centered ? 'rgba(28, 28, 28, .96)' : 'rgba(28,28,28,.96)',
      border: centered ? '1px solid rgba(255,255,255,.12)' : '1px solid var(--bd)',
      borderRadius: centered ? 28 : 18,
      padding: centered ? '12px 14px 12px 18px' : 10,
      display: 'flex',
      alignItems: 'flex-end',
      gap: centered ? 12 : 8,
      minHeight: centered ? 96 : undefined,
      boxShadow: centered ? '0 18px 44px rgba(0,0,0,.22)' : undefined,
      transition: 'border-color .2s, box-shadow .2s, background .2s',
    }}>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={disabled ? 'Wasabi está respondendo...' : placeholder}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        style={{
          flex: 1,
          minHeight: centered ? 54 : 28,
          maxHeight: MAX_HEIGHT,
          resize: 'none',
          background: 'transparent',
          border: 0,
          color: 'var(--tx)',
          fontSize: centered ? 15 : 13,
          lineHeight: 1.5,
          padding: centered ? '7px 0' : '8px 8px',
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Enviar"
        style={{
          width: centered ? 42 : 36,
          height: centered ? 42 : 36,
          borderRadius: centered ? 999 : 9,
          background: !value.trim() || disabled ? 'var(--s3)' : 'var(--gr)',
          color: !value.trim() || disabled ? 'var(--t3)' : '#000',
          border: 'none',
          cursor: !value.trim() || disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'background .15s',
        }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  )
}
