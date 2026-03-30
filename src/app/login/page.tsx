'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, LogIn, Eye, EyeOff, Users, ShieldCheck, UserPlus, ArrowLeft, User, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface GarcomItem {
  id: string
  nome: string
}

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'admin' | 'garcom'>('admin')
  const [mode, setMode] = useState<'login' | 'cadastro' | 'esqueci'>('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [empresas, setEmpresas] = useState<{ id: number; nome: string }[]>([])
  const [empresaId, setEmpresaId] = useState<number | null>(null)
  const [garcons, setGarcons] = useState<GarcomItem[]>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)
  const [loadingGarcons, setLoadingGarcons] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  // Recuperar senha
  async function handleEsqueciSenha(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Informe o email cadastrado'); return }
    setLoading(true)
    setError('')
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      })
      if (resetError) {
        setError('Erro ao enviar email. Verifique o endereco e tente novamente.')
        return
      }
      setSuccess(`Link enviado para ${email}! Verifique sua caixa de entrada.`)
    } catch {
      setError('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Cadastro de admin via API
  async function handleAdminCadastro(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setError('Informe seu nome'); return }
    if (senha.length < 6) { setError('Senha deve ter pelo menos 6 caracteres'); return }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), email, senha }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Erro ao criar conta')
        return
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      if (authError) {
        setSuccess('Conta criada! Faca login para continuar.')
        setMode('login')
        return
      }

      router.push('/')
      router.refresh()
    } catch (err) {
      console.error('Erro cadastro:', err)
      setError(err instanceof Error ? err.message : 'Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Carregar empresas (apenas as que tem garcons ativos)
  async function loadEmpresas() {
    if (empresas.length > 0) return
    setLoadingEmpresas(true)
    try {
      const res = await fetch('/api/auth/empresas')
      const data = await res.json()
      if (Array.isArray(data)) {
        setEmpresas(data)
        // Se so tem uma empresa, pula direto para lista de garcons
        if (data.length === 1) {
          handleSelectEmpresa(data[0].id)
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingEmpresas(false)
    }
  }

  // Carregar garcons de uma empresa
  async function loadGarcons(empId: number) {
    setLoadingGarcons(true)
    setGarcons([])
    try {
      const res = await fetch(`/api/auth/garcons?empresaId=${empId}`)
      const data = await res.json()
      if (Array.isArray(data)) setGarcons(data)
    } catch {
      // ignore
    } finally {
      setLoadingGarcons(false)
    }
  }

  // Selecionar empresa
  function handleSelectEmpresa(empId: number) {
    setEmpresaId(empId)
    setError('')
    loadGarcons(empId)
  }

  // Login garcom individual
  async function handleGarcomLogin(garcom: GarcomItem) {
    if (!empresaId) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/garcom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, garcomId: garcom.id, garcomNome: garcom.nome }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Erro ao entrar')
        return
      }

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
    setMode('login')
    setError('')
    setSuccess('')
    setEmpresaId(null)
    setGarcons([])
    if (newTab === 'garcom') loadEmpresas()
  }

  // Voltar para lista de empresas
  function voltarEmpresas() {
    setEmpresaId(null)
    setGarcons([])
    setError('')
  }

  const empresaSelecionada = empresas.find(e => e.id === empresaId)

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#212121] rounded-2xl p-8 sm:p-10 space-y-7">
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

        {/* Mensagens */}
        {error && (
          <p className="font-mono text-xs text-red-500 text-center">[ERRO] {error}</p>
        )}
        {success && (
          <p className="font-mono text-xs text-green-400 text-center">{success}</p>
        )}

        {/* Tab: Admin — Login */}
        {tab === 'admin' && mode === 'login' && (
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
              {loading ? 'entrando...' : 'Entrar'}
            </button>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => { setMode('esqueci'); setError(''); setSuccess('') }}
                className="w-full text-center font-mono text-xs text-[#777] hover:text-[#FF6B35] transition-colors cursor-pointer"
              >
                Esqueci minha senha
              </button>
              <button
                type="button"
                onClick={() => { setMode('cadastro'); setError(''); setSuccess('') }}
                className="w-full text-center font-mono text-xs text-[#777] hover:text-[#FF6B35] transition-colors cursor-pointer"
              >
                Ainda nao tem conta? <span className="text-[#FF6B35] font-semibold">Cadastre-se</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab: Admin — Cadastro */}
        {tab === 'admin' && mode === 'cadastro' && (
          <form onSubmit={handleAdminCadastro} className="space-y-5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              className="flex items-center gap-1 font-mono text-xs text-[#777] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar ao login
            </button>

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

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#FF6B35] hover:bg-[#E85A24] rounded-2xl font-mono text-sm font-semibold text-[#0D0D0D] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'criando conta...' : 'Criar Conta Admin'}
            </button>

            <p className="font-mono text-[11px] text-[#555] text-center">
              A conta sera criada com acesso total ao sistema.
            </p>
          </form>
        )}

        {/* Tab: Admin — Esqueci a senha */}
        {tab === 'admin' && mode === 'esqueci' && (
          <form onSubmit={handleEsqueciSenha} className="space-y-5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              className="flex items-center gap-1 font-mono text-xs text-[#777] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar ao login
            </button>

            <div className="text-center space-y-1 py-2">
              <p className="font-mono text-sm text-white font-semibold">Redefinir Senha</p>
              <p className="font-mono text-xs text-[#777]">
                Informe seu email. Vamos enviar um link para redefinir sua senha.
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-xs text-[#777]">email cadastrado</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full h-11 px-4 bg-[#2D2D2D] rounded-2xl font-mono text-sm text-white placeholder:text-[#777] outline-none focus:ring-2 focus:ring-[#FF6B35] transition-all"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full h-11 bg-[#FF6B35] hover:bg-[#E85A24] rounded-2xl font-mono text-sm font-semibold text-[#0D0D0D] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'enviando...' : success ? 'Email enviado!' : 'Enviar link de redefinicao'}
            </button>

            {success && (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                className="w-full text-center font-mono text-xs text-[#FF6B35] hover:underline cursor-pointer"
              >
                Voltar para o login
              </button>
            )}
          </form>
        )}

        {/* Tab: Garcom — Passo 1: Selecionar empresa */}
        {tab === 'garcom' && !empresaId && (
          <div className="space-y-5">
            <div className="text-center space-y-2 py-2">
              <div className="w-14 h-14 bg-[#2D2D2D] rounded-2xl flex items-center justify-center mx-auto">
                <Users className="w-7 h-7 text-[#FF6B35]" />
              </div>
              <p className="font-mono text-sm text-[#999]">
                Selecione sua empresa
              </p>
            </div>

            {loadingEmpresas ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-[#2D2D2D] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : empresas.length > 0 ? (
              <div className="space-y-2">
                {empresas.map(emp => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelectEmpresa(emp.id)}
                    className="w-full flex items-center justify-between px-4 py-4 bg-[#2D2D2D] rounded-xl hover:bg-[#333] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#FF6B35]/15 rounded-lg flex items-center justify-center">
                        <span className="font-[family-name:var(--font-oswald)] text-lg font-bold text-[#FF6B35]">
                          {emp.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-[family-name:var(--font-oswald)] text-base font-semibold text-white">
                        {emp.nome}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#555] group-hover:text-[#FF6B35] transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="font-mono text-xs text-[#555] text-center py-4">
                Nenhuma empresa cadastrada
              </p>
            )}
          </div>
        )}

        {/* Tab: Garcom — Passo 2: Selecionar garcom */}
        {tab === 'garcom' && empresaId && (
          <div className="space-y-5">
            {/* Header com voltar e nome da empresa */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={voltarEmpresas}
                className="w-9 h-9 bg-[#2D2D2D] rounded-lg flex items-center justify-center text-[#777] hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <p className="font-[family-name:var(--font-oswald)] text-lg font-bold text-white">
                  {empresaSelecionada?.nome}
                </p>
                <p className="font-mono text-[11px] text-[#777]">Toque no seu nome para entrar</p>
              </div>
            </div>

            {loadingGarcons ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-[#2D2D2D] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : garcons.length > 0 ? (
              <div className="space-y-2">
                {garcons.map(garcom => (
                  <button
                    key={garcom.id}
                    type="button"
                    onClick={() => handleGarcomLogin(garcom)}
                    disabled={loading}
                    className="w-full flex items-center gap-4 px-4 py-4 bg-[#2D2D2D] rounded-xl hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-50 group"
                  >
                    <div className="w-12 h-12 bg-[#FF6B35]/15 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-[#FF6B35]" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-[family-name:var(--font-oswald)] text-lg font-bold text-white group-hover:text-[#FF6B35] transition-colors">
                        {garcom.nome}
                      </p>
                      <p className="font-mono text-[11px] text-[#555]">
                        Toque para entrar
                      </p>
                    </div>
                    <LogIn className="w-5 h-5 text-[#555] group-hover:text-[#FF6B35] transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 bg-[#2D2D2D] rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-7 h-7 text-[#555]" />
                </div>
                <div>
                  <p className="font-mono text-sm text-[#999]">
                    Nenhum garcom cadastrado
                  </p>
                  <p className="font-mono text-[11px] text-[#555] mt-1">
                    Peca ao administrador para cadastrar os garcons nas Configuracoes
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
