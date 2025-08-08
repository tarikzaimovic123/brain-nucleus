"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, Search, Settings, LogOut, User, HelpCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { User as SupabaseUser } from "@supabase/supabase-js"
import { NotificationBell } from "@/components/notifications/notification-bell"

interface HeaderProps {
  onMenuToggle: () => void
  user?: SupabaseUser
}

export default function AppHeader({ onMenuToggle, user }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // Don't use router.push to avoid conflicts with auth state change
    // The auth state change listener will handle the redirect
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm)}`)
    }
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return "BM"
  }

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="hidden md:flex">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Pretraži..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 w-64 lg:w-96"
            />
          </div>
        </form>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Mobile Search */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => {
            // You could implement a mobile search modal here
            console.log("Open mobile search")
          }}
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Brain Media</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || "admin@brainmedia.me"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Podešavanja
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/help")}>
              <HelpCircle className="mr-2 h-4 w-4" />
              Pomoć
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Odjavi se
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}