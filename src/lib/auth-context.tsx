'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'
import type { Profile, UserRole } from './types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  role: UserRole
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Buscar perfil do usuario na tabela profiles
  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setProfile(data as Profile)
    }
  }, [])

  // Atualizar perfil manualmente
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user?.id, fetchProfile])

  // Logout
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  useEffect(() => {
    // Buscar sessao inicial
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser)
      if (currentUser) {
        fetchProfile(currentUser.id)
      }
      setLoading(false)
    })

    // Escutar mudancas de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const newUser = session?.user ?? null
        setUser(newUser)
        if (newUser) {
          fetchProfile(newUser.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  // Role padrao: admin se nao tiver profile ainda
  const role: UserRole = profile?.role || 'admin'

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
