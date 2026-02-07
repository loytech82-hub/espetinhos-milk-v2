'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, LogIn, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      if (authError) {
        setError('credenciais_invalidas')
        return
      }

      router.push('/')
    } catch {
      setError('erro_ao_conectar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#212121] rounded-2xl p-10 space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <Flame className="w-8 h-8 text-[#FF6B35]" />
            <span className="font-[family-name:var(--font-oswald)] text-3xl font-bold text-white">
              ESPETINHOS
            </span>
          </div>
          <p className="font-mono text-sm text-[#777]">
            // sistema_de_comandas
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="font-mono text-xs text-[#777]">email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@espetinhos.com"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777] hover:text-white"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="font-mono text-xs text-red-500">[ERROR] {error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#FF6B35] hover:bg-[#E85A24] rounded-2xl font-mono text-sm font-semibold text-[#0D0D0D] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'entrando...' : 'entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
