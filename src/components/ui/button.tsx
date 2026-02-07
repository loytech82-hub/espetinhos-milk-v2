'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-heading font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-orange text-white hover:bg-orange-hover shadow-lg shadow-orange/20',
        secondary: 'bg-bg-elevated text-text-white hover:bg-bg-placeholder border border-bg-placeholder',
        danger: 'bg-danger text-white hover:bg-red-600',
        ghost: 'text-text-muted hover:text-text-white hover:bg-bg-elevated',
        success: 'bg-success text-white hover:bg-green-600',
      },
      size: {
        sm: 'text-sm px-3 py-1.5',
        md: 'text-sm px-4 py-2.5',
        lg: 'text-base px-6 py-3',
        icon: 'p-2',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
