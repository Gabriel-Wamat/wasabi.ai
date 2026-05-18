'use client'

import type { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface HeaderProps {
  title: string
  eyebrow?: string
  actions?: ReactNode
  showSearch?: boolean
}

function HeaderIcon({ name }: { name: 'settings' | 'profile' }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      {name === 'settings' ? (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </>
      ) : (
        <>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </>
      )}
    </svg>
  )
}

export function Header({ title, actions }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const navActions = [
    { href: '/settings', label: 'Configurações', icon: 'settings' as const },
    { href: '/profile', label: 'Perfil', icon: 'profile' as const },
  ]

  return (
    <header style={{
      minHeight: 64,
      padding: '0 24px',
      margin: '16px 0 0',
      border: '1px solid var(--bd)',
      borderRadius: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      background: 'rgba(20, 20, 20, 0.94)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 16,
      zIndex: 30,
      minWidth: 0,
      boxShadow: '0 16px 40px rgba(0,0,0,0.16)',
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          lineHeight: 1.1,
          color: 'var(--tx)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{title}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {actions}
        {navActions.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              title={item.label}
              style={{
                minHeight: 38,
                padding: '0 12px',
                borderRadius: 10,
                border: `1px solid ${active ? 'rgba(18, 199, 118, .45)' : 'var(--bd)'}`,
                background: active ? 'var(--gd)' : 'var(--s2)',
                color: active ? 'var(--gr)' : 'var(--t2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                transition: 'background .16s ease, color .16s ease, border-color .16s ease',
              }}
            >
              <HeaderIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </header>
  )
}
