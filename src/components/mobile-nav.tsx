'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Inicio', icon: LayoutDashboard },
  { href: '/comandas', label: 'Pedidos', icon: ClipboardList },
  { href: '/mesas', label: 'Mesas', icon: UtensilsCrossed },
  { href: '/caixa', label: 'Caixa', icon: DollarSign },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-bg-elevated">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors',
                isActive ? 'text-orange' : 'text-text-muted'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
