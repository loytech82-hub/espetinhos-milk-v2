'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  DollarSign,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'inicio', icon: LayoutDashboard },
  { href: '/comandas', label: 'comandas', icon: ClipboardList },
  { href: '/produtos', label: 'produtos', icon: Package },
  { href: '/caixa', label: 'caixa', icon: DollarSign },
  { href: '/relatorios', label: 'mais', icon: BarChart3 },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1A1A1A] border-t border-[#2D2D2D] z-50">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 transition-colors',
                isActive ? 'text-[#FF6B35]' : 'text-[#777]'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-mono text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
