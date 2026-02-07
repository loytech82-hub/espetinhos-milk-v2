'use client'

import { useEffect, useState } from 'react'
import { ArrowUpCircle, ArrowDownCircle, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import type { CaixaMovimento } from '@/lib/types'

export default function CaixaPage() {
  const [movimentos, setMovimentos] = useState<CaixaMovimento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMovimentos()
  }, [])

  async function loadMovimentos() {
    try {
      const hoje = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('caixa')
        .select('*')
        .gte('created_at', hoje)
        .order('created_at', { ascending: false })
      if (data) setMovimentos(data)
    } catch (error) {
      console.error('Erro ao carregar caixa:', error)
    } finally {
      setLoading(false)
    }
  }

  const entradas = movimentos
    .filter((m) => m.tipo === 'entrada')
    .reduce((acc, m) => acc + m.valor, 0)
  const saidas = movimentos
    .filter((m) => m.tipo === 'saida')
    .reduce((acc, m) => acc + m.valor, 0)
  const saldo = entradas - saidas

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-oswald)] text-3xl lg:text-4xl font-bold">
            CAIXA
          </h1>
          <p className="font-mono text-sm text-text-muted">
            // controle_financeiro
          </p>
        </div>
        <button className="inline-flex items-center gap-2 h-10 px-5 bg-orange text-text-dark font-mono text-xs font-semibold rounded-2xl hover:bg-orange-hover transition-colors">
          <Plus className="w-4 h-4" />
          novo_movimento
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-3 p-5 bg-bg-card rounded-2xl">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-success" />
            <span className="font-mono text-xs text-text-muted">ENTRADAS</span>
          </div>
          <span className="font-[family-name:var(--font-oswald)] text-3xl font-bold text-success">
            {formatCurrency(entradas)}
          </span>
        </div>
        <div className="flex flex-col gap-3 p-5 bg-bg-card rounded-2xl">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4 text-red-500" />
            <span className="font-mono text-xs text-text-muted">SAIDAS</span>
          </div>
          <span className="font-[family-name:var(--font-oswald)] text-3xl font-bold text-red-500">
            {formatCurrency(saidas)}
          </span>
        </div>
        <div className="flex flex-col gap-3 p-5 bg-orange rounded-2xl">
          <span className="font-mono text-xs text-text-dark">SALDO</span>
          <span className="font-[family-name:var(--font-oswald)] text-3xl font-bold text-text-dark">
            {formatCurrency(saldo)}
          </span>
        </div>
      </div>

      {/* Lista de movimentos */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="font-mono text-text-muted">carregando...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-[family-name:var(--font-oswald)] text-xl font-semibold">
            MOVIMENTOS_HOJE
          </h2>
          <div className="rounded-2xl overflow-hidden space-y-px">
            {movimentos.map((mov) => (
              <div
                key={mov.id}
                className="flex items-center justify-between gap-4 px-5 py-4 bg-bg-card"
              >
                <div className="flex items-center gap-3">
                  {mov.tipo === 'entrada' ? (
                    <ArrowUpCircle className="w-5 h-5 text-success shrink-0" />
                  ) : (
                    <ArrowDownCircle className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                  <div>
                    <p className="font-mono text-[13px] text-white">
                      {mov.descricao}
                    </p>
                    <p className="font-mono text-xs text-text-muted">
                      {mov.forma_pagamento || 'caixa'} ·{' '}
                      {new Date(mov.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-mono text-[13px] font-semibold ${
                    mov.tipo === 'entrada' ? 'text-success' : 'text-red-500'
                  }`}
                >
                  {mov.tipo === 'entrada' ? '+' : '-'}
                  {formatCurrency(mov.valor)}
                </span>
              </div>
            ))}

            {movimentos.length === 0 && (
              <div className="p-10 bg-bg-card text-center">
                <span className="font-mono text-sm text-text-muted">
                  nenhum_movimento_hoje
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
