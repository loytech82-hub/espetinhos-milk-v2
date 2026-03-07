'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

interface AccessDeniedProps {
  message?: string
}

export function AccessDenied({ message: _message }: AccessDeniedProps) {
  const router = useRouter()
  const { profile } = useAuth()

  useEffect(() => {
    // Se o profile ja carregou e realmente nao tem permissao, redireciona
    // Se profile ainda nao carregou, espera
    if (profile) {
      router.replace('/')
    }
  }, [profile, router])

  // Enquanto carrega ou redireciona, nao mostra nada
  return null
}
