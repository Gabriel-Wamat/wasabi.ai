'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useSidebar } from '@/contexts/SidebarContext'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',  icon: 'grid' },
  { href: '/documents/personal', label: 'Pessoais',   icon: 'file', badge: 2 },
  { href: '/documents/work',     label: 'Trabalho',   icon: 'briefcase' },
  { href: '/projects',  label: 'Projetos',   icon: 'activity' },
  { href: '/financial', label: 'Financeiro', icon: 'dollar' },
  { href: '/goals',     label: 'Metas',      icon: 'target' },
  { href: '/calendar',  label: 'Agenda',     icon: 'calendar' },
  { href: '/profile',   label: 'Perfil',     icon: 'user' },
]

function Icon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>,
    activity: <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>,
    dollar: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  }
  return (
    <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
      {icons[name]}
    </svg>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { isExpanded, setSidebarHovered, sidebarWidth } = useSidebar()

  const groups = [
    { label: 'Geral', items: NAV.slice(0, 1) },
    { label: 'Documentos', items: NAV.slice(1, 3) },
    { label: 'Gestão', items: NAV.slice(3, 5) },
    { label: 'Outros', items: NAV.slice(5, 8) },
  ]

  return (
    <aside 
      onMouseEnter={() => setSidebarHovered(true)}
      onMouseLeave={() => setSidebarHovered(false)}
      style={{ 
        width: sidebarWidth, 
        minWidth: sidebarWidth, 
        background: 'var(--s1)', 
        border: '1px solid var(--bd)',
        borderRadius: '14px',
        display: 'flex', 
        flexDirection: 'column', 
        height: 'calc(100vh - 32px)',
        position: 'fixed', 
        top: 16, 
        left: 16,
        transition: 'width .28s cubic-bezier(.2,.8,.2,1), min-width .28s cubic-bezier(.2,.8,.2,1), box-shadow .22s ease',
        overflow: 'hidden',
        zIndex: 100,
        boxShadow: isExpanded ? '0 20px 52px rgba(0,0,0,0.28)' : '0 16px 40px rgba(0,0,0,0.22)',
      }}>
      {/* Logo */}
      <div style={{ padding: isExpanded ? '18px 16px' : '18px 12px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: isExpanded ? 'flex-start' : 'center', minHeight: 76 }}>
        <img 
          src="/wasabi-v-icon.svg" 
          alt="Wasabi" 
          style={{ width: 32, height: 32, flexShrink: 0 }}
        />
        {isExpanded && (
          <div style={{ opacity: isExpanded ? 1 : 0, transition: 'opacity 0.2s' }}>
            <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #7FB069 0%, #56AB91 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Wasabi</div>
            <div style={{ fontSize: 10, color: 'var(--t2)', whiteSpace: 'nowrap' }}>Gestão Inteligente</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '14px 8px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
        {groups.map(g => (
          <div key={g.label}>
            {isExpanded && (
              <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '10px 8px 4px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: isExpanded ? 1 : 0, transition: 'opacity .18s ease .08s' }}>{g.label}</div>
            )}
            {g.items.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <div
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  title={!isExpanded ? item.label : ''}
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 9, 
                    padding: isExpanded ? '8px 10px' : '10px',
                    borderRadius: 8, 
                    cursor: 'pointer', 
                    marginBottom: 1, 
                    fontSize: 13,
                    background: active ? 'var(--gd)' : 'transparent',
                    color: active ? 'var(--gr)' : 'var(--t2)',
                    fontWeight: active ? 500 : 400,
                    transition: 'background .1s, color .1s',
                    justifyContent: isExpanded ? 'flex-start' : 'center',
                    position: 'relative',
                  }}
                >
                  <Icon name={item.icon} />
                  {isExpanded && (
                    <>
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: isExpanded ? 1 : 0, transition: 'opacity .18s ease .08s' }}>{item.label}</span>
                      {item.badge && (
                        <span style={{ background: 'var(--rd)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8 }}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {!isExpanded && item.badge && (
                    <div style={{ 
                      position: 'absolute', 
                      top: 6, 
                      right: 6, 
                      width: 6, 
                      height: 6, 
                      borderRadius: '50%', 
                      background: 'var(--rd)' 
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User area */}
      <div style={{ padding: 10, borderTop: '1px solid var(--bd)' }}>
        <div
          onClick={() => router.push('/profile')}
          title={!isExpanded ? 'Perfil' : ''}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 9, 
            padding: '8px 10px', 
            borderRadius: 8, 
            background: 'var(--s3)', 
            cursor: 'pointer', 
            transition: 'background 0.15s',
            justifyContent: isExpanded ? 'flex-start' : 'center',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bd)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--s3)')}
        >
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--gr)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0 }}>VC</div>
          {isExpanded && (
            <div style={{ flex: 1, overflow: 'hidden', opacity: isExpanded ? 1 : 0, transition: 'opacity .18s ease .08s' }}>
              <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Você</div>
              <div style={{ fontSize: 10, color: 'var(--t2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ver perfil</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
