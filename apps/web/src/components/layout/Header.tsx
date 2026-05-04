'use client'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header style={{
      minHeight: 64,
      padding: '0 24px',
      margin: '16px 16px 0 0',
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
      <input
        placeholder="Buscar em tudo..."
        style={{
          background: 'var(--s2)',
          border: '1px solid var(--bd)',
          borderRadius: 10,
          padding: '10px 14px',
          color: 'var(--tx)',
          fontSize: 12,
          width: 'clamp(140px, 28vw, 320px)',
          minWidth: 0,
          outline: 'none',
        }}
      />
    </header>
  )
}
