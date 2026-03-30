'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase envia o token no hash da URL (#access_token=...&type=recovery)
    // O cliente supabase processa automaticamente ao detectar o hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Verificar se ja tem sessao ativa de recovery
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleRedefinir(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (novaSenha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (novaSenha !== confirmarSenha) {
      setError('As senhas nao coincidem')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: novaSenha })
      if (updateError) {
        setError('Erro ao redefinir senha. O link pode ter expirado — solicite um novo.')
        return
      }
      setSucesso(true)
      setTimeout(() => router.push('/'), 2500)
    } catch {
      setError('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

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
            // redefinir_senha
          </p>
        </div>

        {sucesso ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <p className="font-mono text-sm text-white font-semibold">Senha redefinida!</p>
              <p className="font-mono text-xs text-[#777] mt-1">Redirecionando para o sistema...</p>
            </div>
          </div>
        ) : !sessionReady ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 bg-[#2D2D2D] rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Lock className="w-5 h-5 text-[#555]" />
            </div>
            <div>
              <p className="font-mono text-sm text-[#999]">Verificando link...</p>
              <p className="font-mono text-xs text-[#555] mt-1">
                Se demorar muito, o link pode ter expirado.{' '}
                <a href="/login" className="text-[#FF6B35] hover:underline">
                  Solicite um novo
                </a>
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRedefinir} className="space-y-5">
            <div className="text-center">
              <p className="font-mono text-sm text-white font-semibold">Nova Senha</p>
              <p className="font-mono text-xs text-[#777] mt-1">Escolha uma senha segura para sua conta</p>
            </div>

            {error && (
              <p className="font-mono text-xs text-red-500 text-center">[ERRO] {error}</p>
            )}

            <div className="space-y-2">
              <label className="font-mono text-xs text-[#777]">nova senha</label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="minimo 6 caracteres"
                  className="w-full h-11 px-4 pr-10 bg-[#2D2D2D] rounded-2xl font-mono text-sm text-white placeholder:text-[#777] outline-none focus:ring-2 focus:ring-[#FF6B35] transition-all"
                  required
                  minLength={6}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777] hover:text-white cursor-pointer"
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-xs text-[#777]">confirmar senha</label>
              <input
                type={showSenha ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="repita a nova senha"
                className="w-full h-11 px-4 bg-[#2D2D2D] rounded-2xl font-mono text-sm text-white placeholder:text-[#777] outline-none focus:ring-2 focus:ring-[#FF6B35] transition-all"
                required
              />
            </div>

            {/* Indicador de forca */}
            {novaSenha.length > 0 && (
              <div className="space-y-1">
                <div className="h-1.5 bg-[#2D2D2D] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      novaSenha.length < 6 ? 'w-1/4 bg-red-500' :
                      novaSenha.length < 10 ? 'w-2/4 bg-yellow-500' :
                      'w-full bg-green-500'
                    }`}
                  />
                </div>
                <p className={`font-mono text-[11px] ${
                  novaSenha.length < 6 ? 'text-red-500' :
                  novaSenha.length < 10 ? 'text-yellow-500' :
                  'text-green-400'
                }`}>
                  {novaSenha.length < 6 ? 'fraca' : novaSenha.length < 10 ? 'boa' : 'forte'}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#FF6B35] hover:bg-[#E85A24] rounded-2xl font-mono text-sm font-semibold text-[#0D0D0D] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              {loading ? 'salvando...' : 'Salvar Nova Senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
