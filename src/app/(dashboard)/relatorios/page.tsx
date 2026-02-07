'use client'

import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'

type Periodo = 'hoje' | 'semana' | 'mes' | 'tudo'

interface ResumoVendas {
  totalVendas: number
  totalComandas: number
  valorMedio: number
  formaPagamento: Record<string, number>
  topProdutos: { nome: string; qtd: number; total: number }[]
}

function getDateRange(periodo: Periodo): string | null {
  const now = new Date()
  if (periodo === 'tudo') return null
  if (periodo === 'hoje') return now.toISOString().split('T')[0]
  if (periodo === 'semana') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d.toISOString()
  }
  const d = new Date(now)
  d.setMonth(d.getMonth() - 1)
  return d.toISOString()
}

const periodos: { value: Periodo; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: '7 dias' },
  { value: 'mes', label: '30 dias' },
  { value: 'tudo', label: 'Tudo' },
]

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState<Periodo>('hoje')
  const [resumo, setResumo] = useState<ResumoVendas>({
    totalVendas: 0,
    totalComandas: 0,
    valorMedio: 0,
    formaPagamento: {},
    topProdutos: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRelatorio()
  }, [periodo])

  async function loadRelatorio() {
    setLoading(true)
    try {
      const dateFrom = getDateRange(periodo)

      let query = supabase
        .from('comandas')
        .select('total, forma_pagamento')
        .eq('status', 'fechada')
      if (dateFrom) query = query.gte('closed_at', dateFrom)

      const { data } = await query

      const itensQuery = supabase
        .from('comanda_itens')
        .select('quantidade, subtotal, produto:produtos(nome), comanda:comandas(status, closed_at)')
      const { data: itensData } = await itensQuery

      const itensFiltrados = (itensData || []).filter((item: Record<string, unknown>) => {
        const comanda = item.comanda as Record<string, unknown> | null
        if (!comanda || comanda.status !== 'fechada') return false
        if (dateFrom && comanda.closed_at && String(comanda.closed_at) < dateFrom) return false
        return true
      })

      const prodMap = new Map<string, { qtd: number; total: number }>()
      itensFiltrados.forEach((item: Record<string, unknown>) => {
        const produto = item.produto as Record<string, unknown> | null
        const nome = produto?.nome ? String(produto.nome) : 'Desconhecido'
        const current = prodMap.get(nome) || { qtd: 0, total: 0 }
        current.qtd += Number(item.quantidade) || 0
        current.total += Number(item.subtotal) || 0
        prodMap.set(nome, current)
      })

      const topProdutos = Array.from(prodMap.entries())
        .map(([nome, v]) => ({ nome, ...v }))
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 5)

      if (data) {
        const totalVendas = data.reduce((acc, c) => acc + (c.total || 0), 0)
        const formaPagamento: Record<string, number> = {}
        data.forEach((c) => {
          let fp = c.forma_pagamento || 'nao_informado'
          // Combinar cartao_debito e cartao_credito em "Cartao"
          if (fp === 'cartao_debito' || fp === 'cartao_credito') fp = 'cartao'
          formaPagamento[fp] = (formaPagamento[fp] || 0) + (c.total || 0)
        })

        setResumo({
          totalVendas,
          totalComandas: data.length,
          valorMedio: data.length > 0 ? totalVendas / data.length : 0,
          formaPagamento,
          topProdutos,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar relatorio:', error)
    } finally {
      setLoading(false)
    }
  }

  const formaPagamentoLabels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao: 'Cartao',
    nao_informado: 'Outros',
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold">COMO FOI O DIA</h1>
          <p className="text-sm text-text-muted">Resumo das suas vendas</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-text-muted" />
          {periodos.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={`h-9 px-4 rounded-2xl font-heading text-sm font-semibold transition-colors cursor-pointer ${
                periodo === p.value
                  ? 'bg-orange text-text-dark'
                  : 'bg-bg-elevated text-text-white hover:bg-bg-placeholder'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-text-muted">carregando...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-3 p-5 bg-bg-card rounded-2xl">
              <span className="text-xs text-text-muted">Total em Vendas</span>
              <span className="font-heading text-3xl font-bold text-success">
                {formatCurrency(resumo.totalVendas)}
              </span>
            </div>
            <div className="flex flex-col gap-3 p-5 bg-bg-card rounded-2xl">
              <span className="text-xs text-text-muted">Pedidos Fechados</span>
              <span className="font-heading text-3xl font-bold">
                {resumo.totalComandas}
              </span>
            </div>
            <div className="flex flex-col gap-3 p-5 bg-orange rounded-2xl">
              <span className="text-xs text-text-dark">Valor Medio</span>
              <span className="font-heading text-3xl font-bold text-text-dark">
                {formatCurrency(resumo.valorMedio)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">Por Forma de Pagamento</h2>
              <div className="bg-bg-card rounded-2xl p-6 space-y-4">
                {Object.entries(resumo.formaPagamento).map(([key, value]) => {
                  const max = Math.max(...Object.values(resumo.formaPagamento), 1)
                  const pct = (value / max) * 100
                  const percentTotal = resumo.totalVendas > 0 ? ((value / resumo.totalVendas) * 100).toFixed(0) : '0'
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-muted">
                          {formaPagamentoLabels[key] || key}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted">{percentTotal}%</span>
                          <span className="font-heading text-sm font-bold text-text-white">
                            {formatCurrency(value)}
                          </span>
                        </div>
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
                  <p className="text-sm text-text-muted text-center py-4">
                    Sem dados no periodo selecionado
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">Mais Vendidos</h2>
              <div className="bg-bg-card rounded-2xl overflow-hidden">
                {resumo.topProdutos.length > 0 ? (
                  <div className="space-y-px">
                    {resumo.topProdutos.map((prod, i) => (
                      <div key={prod.nome} className="flex items-center gap-4 px-5 py-3">
                        <span className={`font-heading text-lg font-bold w-8 ${i < 3 ? 'text-orange' : 'text-text-muted'}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-white font-medium truncate">{prod.nome}</p>
                          <p className="text-xs text-text-muted">{prod.qtd} vendidos</p>
                        </div>
                        <span className="font-heading text-sm font-bold text-text-white">
                          {formatCurrency(prod.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted text-center py-8">
                    Sem dados no periodo selecionado
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
