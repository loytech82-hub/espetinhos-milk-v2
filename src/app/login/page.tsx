'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, LogIn, Eye, EyeOff, Users, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'admin' | 'garcom'>('admin')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Login admin com email e senha
  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          setError('Confirme seu email antes de entrar.')
        } else {
          setError('Email ou senha incorretos')
        }
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Login garcom — conta compartilhada via API
  async function handleGarcomLogin() {
    setLoading(true)
    setError('')

    try {
      // Buscar/criar credenciais da conta garcom
      const res = await fetch('/api/auth/garcom', { method: 'POST' })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Erro ao entrar como garcom')
        return
      }

      // Fazer login com as credenciais retornadas
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        setError('Erro ao entrar. Tente novamente.')
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Trocar aba
  function switchTab(newTab: 'admin' | 'garcom') {
    setTab(newTab)
    setError('')
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#212121] rounded-2xl p-10 space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <Flame className="w-8 h-8 text-[#FF6B35]" />
            <span className="font-[family-name:var(--font-oswald)] text-3xl font-bold text-white">
              ESPETINHOS 1000K
            </span>
          </div>
          <p className="font-mono text-sm text-[#777]">
            // sistema_de_comandas
          </p>
        </div>

        {/* Tabs: Admin / Garcom */}
        <div className="flex gap-2 bg-[#1A1A1A] rounded-xl p-1">
          <button
            type="button"
            onClick={() => switchTab('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-sm font-medium transition-colors cursor-pointer ${
              tab === 'admin'
                ? 'bg-[#FF6B35] text-[#0D0D0D]'
                : 'text-[#777] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Administrador
          </button>
          <button
            type="button"
            onClick={() => switchTab('garcom')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-sm font-medium transition-colors cursor-pointer ${
              tab === 'garcom'
                ? 'bg-[#FF6B35] text-[#0D0D0D]'
                : 'text-[#777] hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Garcom
          </button>
        </div>

        {/* Erro */}
        {error && (
          <p className="font-mono text-xs text-red-500 text-center">[ERRO] {error}</p>
        )}

        {/* Tab: Admin — email + senha */}
        {tab === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="font-mono text-xs text-[#777]">email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full h-11 px-4 bg-[#2D2D2D] rounded-2xl font-mono text-sm text-white placeholder:text-[#777] outline-none focus:ring-2 focus:ring-[#FF6B35] transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="font-mono text-xs text-[#777]">senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-4 pr-10 bg-[#2D2D2D] rounded-2xl font-mono text-sm text-white placeholder:text-[#777] outline-none focus:ring-2 focus:ring-[#FF6B35] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777] hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#FF6B35] hover:bg-[#E85A24] rounded-2xl font-mono text-sm font-semibold text-[#0D0D0D] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'entrando...' : 'entrar como admin'}
            </button>

            <p className="font-mono text-[11px] text-[#555] text-center">
              Acesso total: caixa, estoque, cardapio, relatorios e mais
            </p>
          </form>
        )}

        {/* Tab: Garcom — botao unico */}
        {tab === 'garcom' && (
          <div className="space-y-6">
            <div className="text-center space-y-3 py-4">
              <div className="w-16 h-16 bg-[#2D2D2D] rounded-2xl flex items-center justify-center mx-auto">
                <Users className="w-8 h-8 text-[#FF6B35]" />
              </div>
              <p className="font-mono text-sm text-[#999]">
                Acesso rapido para garcons e atendentes
              </p>
              <p className="font-mono text-[11px] text-[#555]">
                Pedidos, mesas e clientes
              </p>
            </div>

            <button
              type="button"
              onClick={handleGarcomLogin}
              disabled={loading}
              className="w-full h-14 bg-[#FF6B35] hover:bg-[#E85A24] rounded-2xl font-mono text-base font-bold text-[#0D0D0D] flex items-center justify-center gap-3 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Users className="w-5 h-5" />
              {loading ? 'entrando...' : 'Entrar como Garcom'}
            </button>

            <p className="font-mono text-[11px] text-[#555] text-center">
              Nao precisa de email ou senha
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
