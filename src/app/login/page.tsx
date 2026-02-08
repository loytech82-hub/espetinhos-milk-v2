'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, LogIn, UserPlus, Eye, EyeOff, Mail, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Login com email e senha
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          setError('Confirme seu email antes de entrar. Verifique sua caixa de entrada.')
        } else {
          setError('Email ou senha incorretos')
        }
        return
      }

      // Redirecionar para o dashboard
      router.push('/')
      router.refresh()
    } catch {
      setError('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Cadastro de novo usuario
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      setError('Informe seu nome')
      return
    }
    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: { nome: nome.trim() }
        }
      })

      if (authError) {
        if (authError.message.includes('rate_limit') || authError.message.includes('Rate limit')) {
          setError('Muitas tentativas. Aguarde alguns minutos.')
        } else if (authError.message.includes('already registered')) {
          setError('Este email ja esta cadastrado. Faca login.')
        } else {
          setError(authError.message)
        }
        return
      }

      // Se a sessao ja veio, entra direto
      if (signUpData?.session) {
        router.push('/')
        router.refresh()
        return
      }

      // Sessao nao veio — faz login automatico apos cadastro
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })
      if (!loginError) {
        router.push('/')
        router.refresh()
        return
      }

      // Se nem assim funcionou, mostra sucesso generico
      setSuccess('Conta criada! Faca login para continuar.')
      setSenha('')
    } catch {
      setError('Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Trocar entre login e cadastro
  function switchMode(newMode: 'login' | 'signup') {
    setMode(newMode)
    setError('')
    setSuccess('')
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

        {/* Tabs login / cadastro */}
        <div className="flex gap-2 bg-[#1A1A1A] rounded-xl p-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-sm font-medium transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-[#FF6B35] text-[#0D0D0D]'
                : 'text-[#777] hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Entrar
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-sm font-medium transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#FF6B35] text-[#0D0D0D]'
                : 'text-[#777] hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Cadastre-se
          </button>
        </div>

        {/* Mensagem de sucesso */}
        {success && (
          <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
            <p className="font-mono text-xs text-green-400">{success}</p>
          </div>
        )}

        {/* Formulario de LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5">
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

            {error && (
              <p className="font-mono text-xs text-red-500">[ERRO] {error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#FF6B35] hover:bg-[#E85A24] rounded-2xl font-mono text-sm font-semibold text-[#0D0D0D] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'entrando...' : 'entrar'}
            </button>
          </form>
        )}

        {/* Formulario de CADASTRO */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <label className="font-mono text-xs text-[#777]">nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full h-11 px-4 bg-[#2D2D2D] rounded-2xl font-mono text-sm text-white placeholder:text-[#777] outline-none focus:ring-2 focus:ring-[#FF6B35] transition-all"
                required
              />
            </div>

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
                  placeholder="minimo 6 caracteres"
                  className="w-full h-11 px-4 pr-10 bg-[#2D2D2D] rounded-2xl font-mono text-sm text-white placeholder:text-[#777] outline-none focus:ring-2 focus:ring-[#FF6B35] transition-all"
                  required
                  minLength={6}
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

            {error && (
              <p className="font-mono text-xs text-red-500">[ERRO] {error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#FF6B35] hover:bg-[#E85A24] rounded-2xl font-mono text-sm font-semibold text-[#0D0D0D] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              {loading ? 'criando conta...' : 'criar conta'}
            </button>

            <p className="font-mono text-[11px] text-[#555] text-center">
              Ao criar sua conta, voce ja entra no sistema.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
