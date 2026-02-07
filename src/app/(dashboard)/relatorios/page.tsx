'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

interface ResumoVendas {
  totalVendas: number
  totalComandas: number
  ticketMedio: number
  formaPagamento: Record<string, number>
}

export default function RelatoriosPage() {
  const [resumo, setResumo] = useState<ResumoVendas>({
    totalVendas: 0,
    totalComandas: 0,
    ticketMedio: 0,
    formaPagamento: {},
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRelatorio()
  }, [])

  async function loadRelatorio() {
    try {
      const { data } = await supabase
        .from('comandas')
        .select('total, forma_pagamento')
        .eq('status', 'fechada')

      if (data) {
        const totalVendas = data.reduce((acc, c) => acc + (c.total || 0), 0)
        const formaPagamento: Record<string, number> = {}
        data.forEach((c) => {
          const fp = c.forma_pagamento || 'nao_informado'
          formaPagamento[fp] = (formaPagamento[fp] || 0) + (c.total || 0)
        })

        setResumo({
          totalVendas,
          totalComandas: data.length,
          ticketMedio: data.length > 0 ? totalVendas / data.length : 0,
          formaPagamento,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar relatório:', error)
    } finally {
      setLoading(false)
    }
  }

  const formaPagamentoLabels: Record<string, string> = {
    dinheiro: 'DINHEIRO',
    pix: 'PIX',
    cartao_debito: 'CARTAO_DEBITO',
    cartao_credito: 'CARTAO_CREDITO',
    nao_informado: 'NAO_INFORMADO',
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-oswald)] text-3xl lg:text-4xl font-bold">
          RELATORIOS
        </h1>
        <p className="font-mono text-sm text-text-muted">
          // metricas_e_analises
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="font-mono text-text-muted">carregando...</span>
        </div>
      ) : (
        <>
          {/* Resumo geral */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-3 p-5 bg-bg-card rounded-2xl">
              <span className="font-mono text-xs text-text-muted">
                TOTAL_VENDAS
              </span>
              <span className="font-[family-name:var(--font-oswald)] text-3xl font-bold">
                {formatCurrency(resumo.totalVendas)}
              </span>
            </div>
            <div className="flex flex-col gap-3 p-5 bg-bg-card rounded-2xl">
              <span className="font-mono text-xs text-text-muted">
                TOTAL_COMANDAS
              </span>
              <span className="font-[family-name:var(--font-oswald)] text-3xl font-bold">
                {resumo.totalComandas}
              </span>
            </div>
            <div className="flex flex-col gap-3 p-5 bg-orange rounded-2xl">
              <span className="font-mono text-xs text-text-dark">
                TICKET_MEDIO
              </span>
              <span className="font-[family-name:var(--font-oswald)] text-3xl font-bold text-text-dark">
                {formatCurrency(resumo.ticketMedio)}
              </span>
            </div>
          </div>

          {/* Vendas por forma de pagamento */}
          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-oswald)] text-xl font-semibold">
              VENDAS_POR_PAGAMENTO
            </h2>
            <div className="bg-bg-card rounded-2xl p-6 space-y-4">
              {Object.entries(resumo.formaPagamento).map(([key, value]) => {
                const max = Math.max(
                  ...Object.values(resumo.formaPagamento),
                  1
                )
                const pct = (value / max) * 100
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-text-muted">
                        {formaPagamentoLabels[key] || key.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs text-white">
                        {formatCurrency(value)}
                      </span>
                    </div>
                    <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              {Object.keys(resumo.formaPagamento).length === 0 && (
                <p className="font-mono text-sm text-text-muted text-center py-4">
                  sem_dados_disponiveis
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
