'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, DollarSign, ListTodo, Compass, LogOut, ChevronRight, FileText, UsersRound, FolderKanban, Calculator, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import type { UserRole } from '@/types'

const NAV_ITEMS = {
  founder:   [
    { href: '/dashboard', key: 'dashboard',   icon: LayoutDashboard },
    { href: '/clients',   key: 'clients',     icon: Users },
    { href: '/financial', key: 'financial',   icon: DollarSign },
    { href: '/contador',  key: 'contador',    icon: Calculator },
    { href: '/demands',   key: 'demands',     icon: ListTodo },
    { href: '/projects',  key: 'projects',    icon: FolderKanban },
    { href: '/founder',   key: 'founderBoard',icon: Compass },
    { href: '/docs',      key: 'docs',        icon: FileText },
    { href: '/team',      key: 'team',        icon: UsersRound },
    { href: '/settings',  key: 'settings',    icon: Settings },
  ],
  manager:   [
    { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
    { href: '/clients',   key: 'clients',   icon: Users },
    { href: '/demands',   key: 'demands',   icon: ListTodo },
    { href: '/projects',  key: 'projects',  icon: FolderKanban },
  ],
  financial: [
    { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
    { href: '/clients',   key: 'clients',   icon: Users },
    { href: '/financial', key: 'financial', icon: DollarSign },
    { href: '/contador',  key: 'contador',  icon: Calculator },
  ],
  developer: [
    { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
    { href: '/demands',   key: 'demands',   icon: ListTodo },
    { href: '/projects',  key: 'projects',  icon: FolderKanban },
    { href: '/docs',      key: 'docs',      icon: FileText },
  ],
  employee:  [
    { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
    { href: '/demands',   key: 'demands',   icon: ListTodo },
    { href: '/projects',  key: 'projects',  icon: FolderKanban },
  ],
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const t        = useTranslations()
  const [role, setRole] = useState<UserRole>('founder')

  useEffect(() => {
    async function fetchRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (data?.role) setRole(data.role as UserRole)
    }
    fetchRole()
  }, [])

  const navItems = NAV_ITEMS[role] ?? NAV_ITEMS.employee

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out',
        'md:relative md:z-auto md:translate-x-0 md:w-60',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">L</span>
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">L Board</p>
          <p className="text-xs text-muted-foreground capitalize">
            {t(`roleSubtitle.${role}`)}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {t('nav.menu')}
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{t(`nav.${item.key}`)}</span>
              {isActive && <ChevronRight className="h-3 w-3" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  )
}
