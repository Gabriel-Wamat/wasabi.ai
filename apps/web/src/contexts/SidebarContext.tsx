'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface SidebarContextType {
  isExpanded: boolean
  setSidebarHovered: (hovered: boolean) => void
  toggleSidebar: () => void
  sidebarWidth: string
  contentOffset: string
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isHovered, setIsHovered] = useState(false)

  const setSidebarHovered = (hovered: boolean) => setIsHovered(hovered)
  const toggleSidebar = () => setIsHovered(prev => !prev)
  const isExpanded = isHovered

  const sidebarWidth = isExpanded ? '220px' : '64px'
  // sidebar fica em left:16px — o main precisa começar após: 16 (left) + width + 16 (gap) = width + 32px
  const contentOffset = isExpanded ? '268px' : '112px'

  return (
    <SidebarContext.Provider value={{ isExpanded, setSidebarHovered, toggleSidebar, sidebarWidth, contentOffset }}>
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
