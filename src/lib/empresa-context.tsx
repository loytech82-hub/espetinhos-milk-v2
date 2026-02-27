'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { Empresa } from '@/lib/types'

interface EmpresaContextType {
  empresa: Empresa | null
  loading: boolean
  refresh: () => Promise<void>
}

const EmpresaContext = createContext<EmpresaContextType>({
  empresa: null,
  loading: true,
  refresh: async () => {},
})

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
  const { empresaId } = useAuth()
  const [empresa, setEmpresa] = useState<Empresa | null>(() => {
    // Carregar do cache local para render instantaneo
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('empresa')
      if (cached) return JSON.parse(cached) as Empresa
    }
    return null
  })
  const [loading, setLoading] = useState(!empresa)

  const refresh = useCallback(async () => {
    if (!empresaId) return
    try {
      // Buscar empresa pelo empresaId do usuario logado (RLS filtra automaticamente)
      const { data } = await supabase
        .from('empresa')
        .select('*')
        .eq('id', empresaId)
        .single()

      setEmpresa(data as Empresa | null)
      if (data) sessionStorage.setItem('empresa', JSON.stringify(data))
    } catch (error) {
      console.error('Erro ao carregar empresa:', error)
    } finally {
      setLoading(false)
    }
  }, [empresaId])

  useEffect(() => {
    if (empresaId) {
      refresh()
    }
  }, [empresaId, refresh])

  return (
    <EmpresaContext.Provider value={{ empresa, loading, refresh }}>
      {children}
    </EmpresaContext.Provider>
  )
}

export function useEmpresa() {
  return useContext(EmpresaContext)
}
