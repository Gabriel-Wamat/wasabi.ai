'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { getStoredUser } from '@/lib/api/auth'
import { ToastProvider } from '@/components/ui/Toast'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'

function AppContent({ children }: { children: React.ReactNode }) {
  const { contentOffset } = useSidebar()
  
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'transparent', overflowX: 'hidden' }}>
      <Sidebar />
      <main style={{ 
        flex: 1, 
        width: `calc(100vw - ${contentOffset})`,
        marginLeft: contentOffset,
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        minWidth: 0,
        transition: 'margin-left .28s cubic-bezier(.2,.8,.2,1), width .28s cubic-bezier(.2,.8,.2,1)',
      }}>
        {children}
      </main>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    if (!getStoredUser()) router.replace('/auth/login')
  }, [router])

  return (
    <SidebarProvider>
      <ToastProvider>
        <AppContent>{children}</AppContent>
      </ToastProvider>
    </SidebarProvider>
  )
}
