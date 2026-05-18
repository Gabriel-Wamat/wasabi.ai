'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { ToastProvider } from '@/components/ui/Toast'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '')

async function tryLocalHandshake(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/local/handshake`)
    if (!res.ok) return false
    const json = await res.json() as { data?: { accessToken?: string; refreshToken?: string } }
    if (!json.data?.accessToken) return false
    localStorage.setItem('ph_access',  json.data.accessToken)
    localStorage.setItem('ph_refresh', json.data.refreshToken ?? json.data.accessToken)
    return true
  } catch {
    return false
  }
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { contentOffset } = useSidebar()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'transparent', overflowX: 'hidden' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: contentOffset,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        minWidth: 0,
        transition: 'margin-left .28s cubic-bezier(.2,.8,.2,1)',
      }}>
        {/* Container com padding simétrico — header E conteúdo usam os mesmos limites */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    if (!localStorage.getItem('ph_access')) {
      tryLocalHandshake().then(ok => {
        if (!ok) router.replace('/auth/login')
      })
    }
  }, [router])

  return (
    <SidebarProvider>
      <ToastProvider>
        <AppContent>{children}</AppContent>
      </ToastProvider>
    </SidebarProvider>
  )
}
