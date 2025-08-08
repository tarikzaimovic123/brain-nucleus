"use client"

import { redirect } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppSidebar from '@/components/layout/app-sidebar'
import AppHeader from '@/components/layout/app-header'
import { User } from '@supabase/supabase-js'
import { Toaster } from '@/components/ui/toaster'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  useEffect(() => {
    const supabase = createClient()
    
    // Check current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        redirect('/auth/login')
      }
      setUser(user)
      setLoading(false)
    })
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Use window.location for logout to avoid NEXT_REDIRECT error
        window.location.href = '/auth/login'
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const handleMenuToggle = () => {
    const isMobile = window.innerWidth < 768
    if (isMobile) {
      setSidebarOpen(!sidebarOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar 
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader onMenuToggle={handleMenuToggle} user={user || undefined} />
        <main className="flex-1 overflow-y-auto bg-main-content-background p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  )
}