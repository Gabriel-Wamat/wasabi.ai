'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface SidebarContextType {
  isExpanded: boolean
  setSidebarHovered: (hovered: boolean) => void
  sidebarWidth: string
  contentOffset: string
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setSidebarHovered] = useState(false)
  const sidebarWidth = isExpanded ? '240px' : '72px'
  const contentOffset = isExpanded ? '272px' : '104px'

  return (
    <SidebarContext.Provider value={{ isExpanded, setSidebarHovered, sidebarWidth, contentOffset }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}
