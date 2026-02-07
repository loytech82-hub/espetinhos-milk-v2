'use client'

import { cn } from '@/lib/utils'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'mesa' | 'balcao' | 'delivery' | 'muted'

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  info: 'bg-info/15 text-info border-info/30',
  mesa: 'bg-mesa/15 text-mesa border-mesa/30',
  balcao: 'bg-balcao/15 text-balcao border-balcao/30',
  delivery: 'bg-delivery/15 text-delivery border-delivery/30',
  muted: 'bg-bg-placeholder/50 text-text-muted border-bg-placeholder',
}

interface StatusBadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

export function StatusBadge({ variant, children, className, dot = false }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border',
      variantStyles[variant],
      className
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
