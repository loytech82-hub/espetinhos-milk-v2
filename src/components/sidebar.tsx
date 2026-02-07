'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  DollarSign,
  Users,
  BarChart3,
  Flame,
  LogOut,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'dashboard', icon: LayoutDashboard },
  { href: '/comandas', label: 'comandas', icon: ClipboardList },
  { href: '/produtos', label: 'produtos', icon: Package },
  { href: '/caixa', label: 'caixa', icon: DollarSign },
  { href: '/clientes', label: 'clientes', icon: Users },
  { href: '/relatorios', label: 'relatorios', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col w-[240px] min-h-screen p-6 justify-between bg-bg-page">
      {/* Topo */}
      <div className="flex flex-col gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-orange" />
          <span className="font-[family-name:var(--font-oswald)] text-xl font-semibold text-text-white">
            ESPETINHOS
          </span>
        </Link>

        {/* Navegação */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 h-10 px-3 rounded-2xl transition-colors',
                  isActive
                    ? 'text-text-white bg-bg-elevated'
                    : 'text-text-muted hover:text-text-white hover:bg-bg-card'
                )}
              >
                <div className={cn('w-1.5 h-1.5 rounded-sm', isActive ? 'bg-orange' : 'bg-text-muted')} />
                <item.icon className="w-[18px] h-[18px]" />
                <span className="font-[family-name:var(--font-jetbrains)] text-[13px]">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Rodapé - Usuário */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-bg-elevated rounded-2xl flex items-center justify-center">
          <span className="font-[family-name:var(--font-jetbrains)] text-[11px] text-text-muted">AD</span>
        </div>
        <span className="font-[family-name:var(--font-jetbrains)] text-xs text-text-white">admin</span>
        <button onClick={handleLogout} className="ml-auto text-text-muted hover:text-orange transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}
