'use client'

import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-bg-elevated border border-bg-placeholder rounded-lg px-3 py-2.5 text-text-white placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-orange/50 focus:border-orange transition-colors',
            error && 'border-danger focus:ring-danger/50',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
