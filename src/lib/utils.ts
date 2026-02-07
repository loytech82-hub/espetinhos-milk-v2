import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'bom_dia'
  if (hour < 18) return 'boa_tarde'
  return 'boa_noite'
}
