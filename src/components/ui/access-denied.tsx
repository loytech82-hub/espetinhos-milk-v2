'use client'

import { ShieldAlert } from 'lucide-react'
import { Button } from './button'
import { useRouter } from 'next/navigation'

interface AccessDeniedProps {
  message?: string
}

export function AccessDenied({ message = 'Somente administradores podem acessar esta pagina' }: AccessDeniedProps) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-danger mx-auto" />
        <p className="font-heading text-lg font-bold">Acesso Negado</p>
        <p className="text-sm text-text-muted">{message}</p>
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          Voltar ao Inicio
        </Button>
      </div>
    </div>
  )
}
