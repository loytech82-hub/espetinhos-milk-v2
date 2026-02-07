'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="w-16 h-16 rounded-2xl bg-bg-elevated flex items-center justify-center mb-4">
        <Icon size={28} className="text-text-muted" />
      </div>
      <h3 className="font-heading font-semibold text-text-white mb-1">{title}</h3>
      <p className="text-sm text-text-muted max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
