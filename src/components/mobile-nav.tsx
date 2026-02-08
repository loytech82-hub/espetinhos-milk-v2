'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  DollarSign,
  MoreHorizontal,
  Package,
  Warehouse,
  Users,
  BarChart3,
  Settings,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import type { UserRole } from '@/lib/types'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[]
}

const mainItems: NavItem[] = [
  { href: '/', label: 'Inicio', icon: LayoutDashboard },
  { href: '/comandas', label: 'Pedidos', icon: ClipboardList },
  { href: '/mesas', label: 'Mesas', icon: UtensilsCrossed },
  { href: '/caixa', label: 'Caixa', icon: DollarSign, roles: ['admin', 'caixa'] },
]

const moreItems: NavItem[] = [
  { href: '/produtos', label: 'Cardapio', icon: Package, roles: ['admin'] },
  { href: '/estoque', label: 'Estoque', icon: Warehouse, roles: ['admin', 'caixa'] },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/relatorios', label: 'Relatorios', icon: BarChart3, roles: ['admin'] },
  { href: '/configuracoes', label: 'Configuracoes', icon: Settings, roles: ['admin'] },
]

export function MobileNav() {
  const pathname = usePathname()
  const { role, signOut } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Filtrar itens por role do usuario
  function filterByRole(items: NavItem[]) {
    return items.filter(item => !item.roles || item.roles.includes(role))
  }

  const filteredMain = filterByRole(mainItems)
  const filteredMore = filterByRole(moreItems)

  // Verifica se alguma pagina do "Mais" esta ativa
  const moreActive = filteredMore.some(item =>
    pathname === item.href || pathname.startsWith(item.href)
  )

  return (
    <>
      {/* Bottom nav fixo */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border">
        <div className="flex justify-around items-center h-16 px-2">
          {filteredMain.map((item) => {
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

          {/* Botao Mais */}
          <button
            type="button"
            title="Mais opcoes"
            onClick={() => setDrawerOpen(true)}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors cursor-pointer',
              moreActive || drawerOpen ? 'text-orange' : 'text-text-muted'
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Sheet bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-bg-card rounded-t-2xl animate-slide-up">
            {/* Handle + fechar */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-sm font-semibold text-text-white">Mais opcoes</span>
              <button
                type="button"
                title="Fechar"
                onClick={() => setDrawerOpen(false)}
                className="text-text-muted hover:text-text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Itens do menu */}
            <div className="px-3 pb-3 space-y-1">
              {filteredMore.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      'flex items-center gap-3 h-12 px-4 rounded-xl transition-colors',
                      isActive
                        ? 'text-orange bg-orange/10'
                        : 'text-text-muted hover:text-text-white hover:bg-bg-elevated'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )
              })}

              {/* Separador + Sair */}
              <div className="h-px bg-border my-2" />
              <button
                type="button"
                onClick={() => { setDrawerOpen(false); signOut() }}
                className="flex items-center gap-3 h-12 px-4 rounded-xl text-danger hover:bg-danger/10 transition-colors w-full cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm">Sair</span>
              </button>
            </div>

            {/* Espaco para safe area do iOS */}
            <div className="h-6" />
          </div>
        </div>
      )}
    </>
  )
}
