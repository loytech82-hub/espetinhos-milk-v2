'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getEmpresa } from '@/lib/supabase-helpers'
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
    try {
      const data = await getEmpresa()
      setEmpresa(data)
      if (data) sessionStorage.setItem('empresa', JSON.stringify(data))
    } catch (error) {
      console.error('Erro ao carregar empresa:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <EmpresaContext.Provider value={{ empresa, loading, refresh }}>
      {children}
    </EmpresaContext.Provider>
  )
}

export function useEmpresa() {
  return useContext(EmpresaContext)
}
