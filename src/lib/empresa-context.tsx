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
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await getEmpresa()
      setEmpresa(data)
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
