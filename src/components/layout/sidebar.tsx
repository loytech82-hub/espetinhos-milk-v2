'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen p-6 justify-between bg-[#1A1A1A]">
      {/* Logo + Navegação */}
      <div className="flex flex-col gap-8">
        <Link href="/" className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-[#FF6B35]" />
          <span className="font-['Oswald'] text-xl font-semibold text-white">
            ESPETINHOS
          </span>
        </Link>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 h-10 px-3 rounded-2xl transition-colors',
                  isActive
                    ? 'text-white'
                    : 'text-[#777] hover:text-white'
                )}
              >
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-sm',
                    isActive ? 'bg-[#FF6B35]' : 'bg-[#777]'
                  )}
                />
                <item.icon className="w-[18px] h-[18px]" />
                <span className="font-mono text-[13px]">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Conta do usuário */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-[#2D2D2D] flex items-center justify-center">
          <span className="font-mono text-[11px] text-[#777]">AD</span>
        </div>
        <span className="font-mono text-xs text-white">admin</span>
        <button className="ml-auto text-[#777] hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}
