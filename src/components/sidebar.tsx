'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  DollarSign,
  UtensilsCrossed,
  Package,
  Users,
  BarChart3,
  Flame,
  LogOut,
  MoreHorizontal,
  Warehouse,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useEmpresa } from '@/lib/empresa-context'
import type { UserRole } from '@/lib/types'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[] // Se vazio, todos podem ver
}

const mainNav: NavItem[] = [
  { href: '/', label: 'Inicio', icon: LayoutDashboard },
  { href: '/comandas', label: 'Pedidos', icon: ClipboardList },
  { href: '/mesas', label: 'Mesas', icon: UtensilsCrossed },
  { href: '/caixa', label: 'Caixa', icon: DollarSign, roles: ['admin', 'caixa'] },
]

const moreNav: NavItem[] = [
  { href: '/produtos', label: 'Cardapio', icon: Package, roles: ['admin'] },
  { href: '/estoque', label: 'Estoque', icon: Warehouse, roles: ['admin', 'caixa'] },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/relatorios', label: 'Relatorios', icon: BarChart3, roles: ['admin'] },
  { href: '/configuracoes', label: 'Config', icon: Settings, roles: ['admin'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile, role, signOut } = useAuth()
  const { empresa } = useEmpresa()

  // Filtrar itens de navegacao por role
  function filterByRole(items: NavItem[]) {
    return items.filter(item => !item.roles || item.roles.includes(role))
  }

  // Iniciais do usuario
  const iniciais = profile?.nome
    ? profile.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  const nomeExibicao = profile?.nome || 'Usuario'

  function NavLink({ href, label, icon: Icon }: NavItem) {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 h-10 px-3 rounded-lg transition-colors',
          isActive
            ? 'text-orange bg-orange/10 border-l-3 border-orange'
            : 'text-text-muted hover:text-text-white hover:bg-bg-card border-l-3 border-transparent'
        )}
      >
        <Icon className="w-5 h-5" />
        <span className="text-sm">{label}</span>
      </Link>
    )
  }

  return (
    <aside className="hidden lg:flex flex-col w-[240px] min-h-screen p-6 justify-between bg-bg-page">
      <div className="flex flex-col gap-8">
        <Link href="/" className="flex items-center gap-3">
          {empresa?.logo_url ? (
            <img src={empresa.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <Flame className="w-6 h-6 text-orange" />
          )}
          <span className="font-heading text-xl font-semibold text-text-white">
            {empresa?.nome || 'ESPETINHOS 1000K'}
          </span>
        </Link>

        <nav className="flex flex-col gap-1">
          {filterByRole(mainNav).map(item => <NavLink key={item.href} {...item} />)}

          {/* Separador */}
          <div className="flex items-center gap-2 mt-5 mb-2 px-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-text-muted uppercase tracking-widest">Mais</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {filterByRole(moreNav).map(item => <NavLink key={item.href} {...item} />)}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-bg-elevated rounded-2xl flex items-center justify-center">
          <span className="text-[11px] text-text-muted">{iniciais}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-text-white leading-tight">{nomeExibicao}</span>
          <span className="text-[10px] text-text-muted leading-tight">{role}</span>
        </div>
        <button type="button" title="Sair" onClick={signOut} className="ml-auto text-text-muted hover:text-orange transition-colors cursor-pointer">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}
