"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Package,
  FileText,
  Calculator,
  ClipboardList,
  Receipt,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  LogOut,
  User,
  Users,
  Zap,
  Shield,
  ScrollText
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SidebarProps {
  isOpen?: boolean
  setIsOpen?: (isOpen: boolean) => void
  isCollapsed?: boolean
  setIsCollapsed?: (isCollapsed: boolean) => void
}

const mainItems = [
  { href: "/dash", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/companies", icon: Building2, label: "Firme" },
  { href: "/contacts", icon: Users, label: "Kontakti" },
  { href: "/products", icon: Package, label: "Artikli" },
  { href: "/workflow", icon: Zap, label: "Workflow" },
]

const documentItems = [
  { href: "/invoices", icon: FileText, label: "Fakture" },
  { href: "/quotes", icon: ClipboardList, label: "Ponude" },
  { href: "/work-orders", icon: Receipt, label: "Radni nalozi" },
  { href: "/calculations", icon: Calculator, label: "Kalkulacije" },
]

const systemItems = [
  { href: "/users", icon: Shield, label: "Korisnici" },
  { href: "/audit-log", icon: ScrollText, label: "Audit Log" },
  { href: "/settings", icon: Settings, label: "Podešavanja" },
]

export default function AppSidebar({ 
  isOpen = true, 
  setIsOpen = () => {}, 
  isCollapsed = false, 
  setIsCollapsed = () => {} 
}: SidebarProps) {
  const pathname = usePathname()
  const [documentsOpen, setDocumentsOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar_collapsed", String(!isCollapsed))
    }
  }

  // Load collapsed state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const collapsed = localStorage.getItem("sidebar_collapsed")
      if (collapsed !== null) {
        setIsCollapsed(collapsed === "true")
      }
    }
  }, [setIsCollapsed])

  const sidebarWidth = isCollapsed ? "w-16" : "w-64"
  const sidebarDisplay = !isOpen && isMobile ? "hidden" : "flex"

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:relative h-full bg-sidebar-background border-r border-sidebar-border z-50 md:z-0 transition-all duration-300",
        sidebarWidth,
        sidebarDisplay,
        "flex-col"
      )}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">P</span>
              </div>
              <span className="font-semibold text-sidebar-foreground">PrintPrice</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleCollapse}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* Main Items */}
          <div className="space-y-1 mb-4">
            {mainItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                    isCollapsed && "justify-center"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </div>

          {/* Documents Section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <button
                onClick={() => setDocumentsOpen(!documentsOpen)}
                className="flex items-center gap-2 px-3 py-2 w-full text-left text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground"
              >
                {documentsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Dokumenti
              </button>
            )}
            {(documentsOpen || isCollapsed) && (
              <div className={cn("space-y-1", !isCollapsed && "ml-2")}>
                {documentItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        isActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                        isCollapsed && "justify-center"
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* System Items */}
          <div className="pt-4 mt-4 border-t border-sidebar-border space-y-1">
            {systemItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                    isCollapsed && "justify-center"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Footer with User Menu */}
        <div className="p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <User className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Brain Media</div>
                    <div className="text-xs text-sidebar-foreground/70">Administracija</div>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isCollapsed ? "center" : "end"} className="w-56">
              <DropdownMenuLabel>Moj nalog</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Podešavanja
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Odjavi se
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  )
}