'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileSearch,
  Users,
  BookOpen,
  Settings,
  LogOut,
  GraduationCap,
  TrendingUp,
  UserCog,
} from 'lucide-react'
import { logout } from '@/actions/auth'
import { Button } from '@/components/ui/button'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const adminItems: NavItem[] = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/analyse', label: 'Analyses IA', icon: FileSearch },
  { href: '/eleves', label: 'Élèves', icon: Users },
  { href: '/rentabilite', label: 'Rentabilité', icon: TrendingUp },
  { href: '/users', label: 'Utilisateurs', icon: UserCog },
  { href: '/catalog', label: 'Catalogue', icon: BookOpen },
  { href: '/settings', label: 'Paramètres', icon: Settings },
]

const collaborateurItems: NavItem[] = [
  { href: '/collaborateur', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/analyse', label: 'Analyses', icon: FileSearch },
  { href: '/eleves', label: 'Élèves', icon: Users },
  { href: '/rentabilite', label: 'Rentabilité', icon: TrendingUp },
]

interface SidebarProps {
  role?: string
  userEmail?: string
}

export function Sidebar({ role = 'user', userEmail }: SidebarProps) {
  const pathname = usePathname()
  const items = role === 'admin' ? adminItems : collaborateurItems

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-white px-3 py-4">
      <div className="mb-6 px-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold text-slate-900">AI Gestion AE</span>
        </div>
        {userEmail && (
          <p className="mt-1 truncate text-xs text-slate-500">{userEmail}</p>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <form action={logout}>
        <Button
          type="submit"
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-600 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </form>
    </aside>
  )
}
