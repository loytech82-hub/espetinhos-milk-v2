'use client'

import { useEffect, useState } from 'react'
import { ArrowUpCircle, ArrowDownCircle, Plus, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { NovoMovimentoModal } from '@/components/caixa/novo-movimento-modal'
import type { CaixaMovimento } from '@/lib/types'

export default function CaixaPage() {
  const [movimentos, setMovimentos] = useState<CaixaMovimento[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

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

  const entradas = movimentos.filter((m) => m.tipo === 'entrada').reduce((acc, m) => acc + m.valor, 0)
  const saidas = movimentos.filter((m) => m.tipo === 'saida').reduce((acc, m) => acc + m.valor, 0)
  const saldo = entradas - saidas

  const pagamentoLabels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao_debito: 'Cartao',
    cartao_credito: 'Cartao',
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold">CAIXA</h1>
          <p className="text-sm text-text-muted">Seu caixa</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 h-10 px-5 bg-orange text-text-dark font-heading text-sm font-semibold rounded-2xl hover:bg-orange-hover transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Movimento
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-3 p-5 bg-bg-card rounded-2xl">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-success" />
            <span className="text-xs text-text-muted">Entradas</span>
          </div>
          <span className="font-heading text-3xl font-bold text-success">
            {formatCurrency(entradas)}
          </span>
        </div>
        <div className="flex flex-col gap-3 p-5 bg-bg-card rounded-2xl">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4 text-danger" />
            <span className="text-xs text-text-muted">Saidas</span>
          </div>
          <span className="font-heading text-3xl font-bold text-danger">
            {formatCurrency(saidas)}
          </span>
        </div>
        <div className="flex flex-col gap-3 p-5 bg-orange rounded-2xl">
          <span className="text-xs text-text-dark">Saldo</span>
          <span className="font-heading text-3xl font-bold text-text-dark">
            {formatCurrency(saldo)}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-text-muted">carregando...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-semibold">Movimentos de Hoje</h2>
          {movimentos.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Nenhum movimento hoje"
              description="Os movimentos do dia aparecem aqui"
            />
          ) : (
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
                      <ArrowDownCircle className="w-5 h-5 text-danger shrink-0" />
                    )}
                    <div>
                      <p className="text-[13px] text-text-white font-medium">
                        {mov.descricao}
                      </p>
                      <p className="text-xs text-text-muted">
                        {pagamentoLabels[mov.forma_pagamento || ''] || mov.forma_pagamento || 'caixa'} ·{' '}
                        {new Date(mov.created_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-heading text-[15px] font-bold ${
                      mov.tipo === 'entrada' ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {mov.tipo === 'entrada' ? '+' : '-'}
                    {formatCurrency(mov.valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <NovoMovimentoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={loadMovimentos}
      />
    </div>
  )
}
