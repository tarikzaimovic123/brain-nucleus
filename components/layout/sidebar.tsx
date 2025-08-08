'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Building2, 
  Package, 
  Calculator,
  FileText,
  ClipboardList,
  FileSearch,
  Receipt,
  FileBarChart,
  Settings,
  Users,
  Brain
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dash', icon: LayoutDashboard },
  { name: 'Kompanije', href: '/companies', icon: Building2 },
  { name: 'Proizvodi', href: '/products', icon: Package },
  { name: 'Ponude', href: '/quotes', icon: FileSearch },
  { name: 'Radni nalozi', href: '/work-orders', icon: ClipboardList },
  { name: 'Kalkulacije', href: '/calculations', icon: Calculator },
  { name: 'Fakture', href: '/invoices', icon: FileText },
  { name: 'Fiskalizacija', href: '/fiscal', icon: Receipt },
  { name: 'Izveštaji', href: '/reports', icon: FileBarChart },
  { name: 'Zaposleni', href: '/employees', icon: Users },
  { name: 'Podešavanja', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <Brain className="h-8 w-8 text-blue-400" />
        <span className="ml-2 text-xl font-bold text-white">Brain Nucleus</span>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors'
              )}
            >
              <item.icon
                className={cn(
                  isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-300',
                  'mr-3 h-5 w-5 flex-shrink-0'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}