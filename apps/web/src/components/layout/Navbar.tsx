'use client'
import { usePathname } from 'next/navigation'

interface NavbarProps {
  title?: string
}

export function Navbar({ title }: NavbarProps) {
  const pathname = usePathname() ?? ''

  const getBreadcrumb = () => {
    const paths = pathname.split('/').filter(Boolean)
    const breadcrumbMap: Record<string, string> = {
      dashboard: 'Dashboard',
      documents: 'Documentos',
      personal: 'Pessoais',
      work: 'Trabalho',
      projects: 'Projetos',
      financial: 'Financeiro',
      goals: 'Metas',
      calendar: 'Agenda',
      profile: 'Perfil',
    }

    return paths.map(p => breadcrumbMap[p] || p).join(' / ')
  }

  return (
    <div style={{
      minHeight: '72px',
      background: 'rgba(20, 20, 20, 0.94)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '0 24px',
      borderBottom: '1px solid var(--bd)',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      minWidth: 0,
    }}>
      <div style={{
        color: 'var(--tx)',
        fontSize: '20px',
        fontWeight: 700,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {title || getBreadcrumb()}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          style={{
            background: 'var(--s2)',
            border: '1px solid var(--bd)',
            color: 'var(--tx)',
            padding: '9px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--gr)'
            e.currentTarget.style.color = 'var(--gr)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--bd)'
            e.currentTarget.style.color = 'var(--tx)'
          }}
        >
          Configurações
        </button>
      </div>
    </div>
  )
}
