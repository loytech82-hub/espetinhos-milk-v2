'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, FileDown, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { printRelatorio } from '@/lib/print-relatorio'
import { useEmpresa } from '@/lib/empresa-context'
import { useAuth } from '@/lib/auth-context'
import { AccessDenied } from '@/components/ui/access-denied'
import { ChartBar } from '@/components/ui/chart-bar'
import { SkeletonCard } from '@/components/ui/skeleton'
import type { CaixaTurno } from '@/lib/types'

type Periodo = 'hoje' | 'ontem' | '7dias' | '30dias' | '90dias' | '1ano' | 'tudo' | 'custom'

interface ResumoVendas {
  totalVendas: number
  totalComandas: number
  valorMedio: number
  formaPagamento: Record<string, number>
  topProdutos: { nome: string; qtd: number; total: number }[]
  fiadosPendentes: number
}

interface DadosComparacao {
  atual: ResumoVendas
  anterior: ResumoVendas
}

interface VendaDiaria {
  data: string
  valor: number
}

// Calcula range de datas [inicio, fim) para o periodo atual e o anterior (para comparacao)
function calcRanges(periodo: Periodo, customInicio?: string, customFim?: string) {
  const now = new Date()
  const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let atualInicio: Date
  let atualFim: Date
  let anteriorInicio: Date
  let anteriorFim: Date

  switch (periodo) {
    case 'hoje':
      atualInicio = hoje
      atualFim = new Date(hoje.getTime() + 86400000)
      anteriorInicio = new Date(hoje.getTime() - 86400000)
      anteriorFim = hoje
      break
    case 'ontem': {
      atualInicio = new Date(hoje.getTime() - 86400000)
      atualFim = hoje
      anteriorInicio = new Date(hoje.getTime() - 2 * 86400000)
      anteriorFim = atualInicio
      break
    }
    case '7dias': {
      atualInicio = new Date(hoje.getTime() - 7 * 86400000)
      atualFim = new Date(hoje.getTime() + 86400000)
      anteriorInicio = new Date(hoje.getTime() - 14 * 86400000)
      anteriorFim = atualInicio
      break
    }
    case '30dias': {
      atualInicio = new Date(hoje.getTime() - 30 * 86400000)
      atualFim = new Date(hoje.getTime() + 86400000)
      anteriorInicio = new Date(hoje.getTime() - 60 * 86400000)
      anteriorFim = atualInicio
      break
    }
    case '90dias': {
      atualInicio = new Date(hoje.getTime() - 90 * 86400000)
      atualFim = new Date(hoje.getTime() + 86400000)
      anteriorInicio = new Date(hoje.getTime() - 180 * 86400000)
      anteriorFim = atualInicio
      break
    }
    case '1ano': {
      atualInicio = new Date(hoje.getTime() - 365 * 86400000)
      atualFim = new Date(hoje.getTime() + 86400000)
      anteriorInicio = new Date(hoje.getTime() - 730 * 86400000)
      anteriorFim = atualInicio
      break
    }
    case 'custom': {
      if (customInicio && customFim) {
        atualInicio = new Date(customInicio)
        atualFim = new Date(new Date(customFim).getTime() + 86400000)
        const diff = atualFim.getTime() - atualInicio.getTime()
        anteriorInicio = new Date(atualInicio.getTime() - diff)
        anteriorFim = atualInicio
      } else {
        atualInicio = hoje
        atualFim = new Date(hoje.getTime() + 86400000)
        anteriorInicio = new Date(hoje.getTime() - 86400000)
        anteriorFim = hoje
      }
      break
    }
    default: // tudo
      atualInicio = new Date(2020, 0, 1)
      atualFim = new Date(hoje.getTime() + 86400000)
      anteriorInicio = new Date(2020, 0, 1)
      anteriorFim = new Date(2020, 0, 1)
  }

  return {
    atual: { inicio: atualInicio.toISOString(), fim: atualFim.toISOString() },
    anterior: { inicio: anteriorInicio.toISOString(), fim: anteriorFim.toISOString() },
  }
}

function calcVariacao(atual: number, anterior: number): { pct: string; positivo: boolean } {
  if (anterior === 0) return { pct: atual > 0 ? '+100' : '0', positivo: atual >= 0 }
  const diff = ((atual - anterior) / anterior) * 100
  return { pct: (diff >= 0 ? '+' : '') + diff.toFixed(0), positivo: diff >= 0 }
}

const periodos: { value: Periodo; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: '7dias', label: '7 dias' },
  { value: '30dias', label: '30 dias' },
  { value: '90dias', label: '90 dias' },
  { value: '1ano', label: '1 ano' },
  { value: 'tudo', label: 'Tudo' },
  { value: 'custom', label: 'Personalizado' },
]

const formaPagamentoLabels: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao: 'Cartao',
  fiado: 'A Prazo',
  nao_informado: 'Outros',
}

export default function RelatoriosPage() {
  const { role } = useAuth()
  const { empresa } = useEmpresa()
  const [periodo, setPeriodo] = useState<Periodo>('hoje')
  const [customInicio, setCustomInicio] = useState('')
  const [customFim, setCustomFim] = useState('')
  const [dados, setDados] = useState<DadosComparacao>({
    atual: { totalVendas: 0, totalComandas: 0, valorMedio: 0, formaPagamento: {}, topProdutos: [], fiadosPendentes: 0 },
    anterior: { totalVendas: 0, totalComandas: 0, valorMedio: 0, formaPagamento: {}, topProdutos: [], fiadosPendentes: 0 },
  })
  const [vendasDiarias, setVendasDiarias] = useState<VendaDiaria[]>([])
  const [turnos, setTurnos] = useState<CaixaTurno[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('resumo')

  useEffect(() => {
    if (periodo === 'custom' && (!customInicio || !customFim)) return
    loadRelatorio()
  }, [periodo, customInicio, customFim])

  async function loadRelatorio() {
    setLoading(true)
    try {
      const ranges = calcRanges(periodo, customInicio, customFim)

      // Buscar dados dos dois periodos em paralelo
      const [atualData, anteriorData, turnosData] = await Promise.all([
        fetchPeriodoData(ranges.atual.inicio, ranges.atual.fim),
        periodo !== 'tudo' ? fetchPeriodoData(ranges.anterior.inicio, ranges.anterior.fim) : null,
        fetchTurnos(ranges.atual.inicio, ranges.atual.fim),
      ])

      setDados({
        atual: atualData.resumo,
        anterior: anteriorData?.resumo || { totalVendas: 0, totalComandas: 0, valorMedio: 0, formaPagamento: {}, topProdutos: [], fiadosPendentes: 0 },
      })
      setVendasDiarias(atualData.vendasDiarias)
      setTurnos(turnosData)
    } catch (error) {
      console.error('Erro ao carregar relatorio:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPeriodoData(inicio: string, fim: string) {
    // Comandas fechadas no periodo
    const { data: comandas } = await supabase
      .from('comandas')
      .select('total, forma_pagamento, fiado, fiado_pago, fechada_em')
      .eq('status', 'fechada')
      .gte('fechada_em', inicio)
      .lt('fechada_em', fim)

    // Itens das comandas no periodo (para ranking de produtos)
    const { data: itensData } = await supabase
      .from('comanda_itens')
      .select('quantidade, subtotal, produto:produtos(nome), comanda:comandas(status, fechada_em)')

    const itensFiltrados = (itensData || []).filter((item: Record<string, unknown>) => {
      const comanda = item.comanda as Record<string, unknown> | null
      if (!comanda || comanda.status !== 'fechada') return false
      const fechadaEm = String(comanda.fechada_em || '')
      return fechadaEm >= inicio && fechadaEm < fim
    })

    // Ranking de produtos (sem limite de 5)
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

    const rows = comandas || []
    const totalVendas = rows.reduce((acc, c) => acc + (c.total || 0), 0)
    const fiadosPendentes = rows.filter(c => c.fiado && !c.fiado_pago).reduce((acc, c) => acc + (c.total || 0), 0)

    const formaPagamento: Record<string, number> = {}
    rows.forEach((c) => {
      let fp = c.forma_pagamento || 'nao_informado'
      if (fp === 'cartao_debito' || fp === 'cartao_credito') fp = 'cartao'
      formaPagamento[fp] = (formaPagamento[fp] || 0) + (c.total || 0)
    })

    // Vendas diarias para grafico
    const vendasPorDia = new Map<string, number>()
    rows.forEach(c => {
      if (c.fechada_em) {
        const dia = c.fechada_em.split('T')[0]
        vendasPorDia.set(dia, (vendasPorDia.get(dia) || 0) + (c.total || 0))
      }
    })
    const vendasDiarias = Array.from(vendasPorDia.entries())
      .map(([data, valor]) => ({ data, valor }))
      .sort((a, b) => a.data.localeCompare(b.data))

    return {
      resumo: {
        totalVendas,
        totalComandas: rows.length,
        valorMedio: rows.length > 0 ? totalVendas / rows.length : 0,
        formaPagamento,
        topProdutos,
        fiadosPendentes,
      },
      vendasDiarias,
    }
  }

  async function fetchTurnos(inicio: string, fim: string): Promise<CaixaTurno[]> {
    const { data } = await supabase
      .from('caixa_turnos')
      .select('*')
      .gte('aberto_em', inicio)
      .lt('aberto_em', fim)
      .order('aberto_em', { ascending: false })
    return (data || []) as CaixaTurno[]
  }

  // Preparar dados do grafico de evolucao
  function getChartData(): { label: string; value: number }[] {
    if (vendasDiarias.length === 0) return []

    const numDias = vendasDiarias.length
    // Agregar por semana se > 30 dias, por mes se > 90 dias
    if (numDias > 90) {
      // Agregar por mes
      const mesesMap = new Map<string, number>()
      vendasDiarias.forEach(v => {
        const mesKey = v.data.substring(0, 7) // YYYY-MM
        mesesMap.set(mesKey, (mesesMap.get(mesKey) || 0) + v.valor)
      })
      return Array.from(mesesMap.entries()).map(([key, value]) => {
        const [ano, mes] = key.split('-')
        return { label: `${mes}/${ano.slice(2)}`, value }
      })
    } else if (numDias > 30) {
      // Agregar por semana
      const semanasMap = new Map<string, number>()
      vendasDiarias.forEach(v => {
        const d = new Date(v.data + 'T12:00:00')
        const inicioSemana = new Date(d)
        inicioSemana.setDate(d.getDate() - d.getDay())
        const key = inicioSemana.toISOString().split('T')[0]
        semanasMap.set(key, (semanasMap.get(key) || 0) + v.valor)
      })
      return Array.from(semanasMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => {
          const d = new Date(key + 'T12:00:00')
          return { label: `${d.getDate()}/${d.getMonth() + 1}`, value }
        })
    } else {
      // Dia a dia
      return vendasDiarias.map(v => {
        const d = new Date(v.data + 'T12:00:00')
        return {
          label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          value: v.valor,
        }
      })
    }
  }

  const periodoLabel = periodos.find(p => p.value === periodo)?.label || periodo

  // Somente admin pode acessar
  if (role !== 'admin') return <AccessDenied />

  const vVendas = calcVariacao(dados.atual.totalVendas, dados.anterior.totalVendas)
  const vPedidos = calcVariacao(dados.atual.totalComandas, dados.anterior.totalComandas)
  const vMedio = calcVariacao(dados.atual.valorMedio, dados.anterior.valorMedio)

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header + Filtros de periodo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold">RELATORIOS</h1>
          <p className="text-sm text-text-muted">Analise completa das vendas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={16} className="text-text-muted" />
          {periodos.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={`h-8 px-3 rounded-2xl font-heading text-xs font-semibold transition-colors cursor-pointer ${
                periodo === p.value
                  ? 'bg-orange text-text-dark'
                  : 'bg-bg-elevated text-text-white hover:bg-bg-placeholder'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => printRelatorio(dados.atual, periodoLabel, empresa?.nome)}
            disabled={loading}
            className="h-8 px-3 rounded-2xl bg-success text-text-dark font-heading text-xs font-semibold transition-colors cursor-pointer hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            <FileDown size={12} />
            PDF
          </button>
        </div>
      </div>

      {/* Inputs de data personalizada */}
      {periodo === 'custom' && (
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={customInicio}
            onChange={e => setCustomInicio(e.target.value)}
            className="h-9 px-3 rounded-xl bg-bg-elevated border border-bg-placeholder text-sm text-text-white focus:outline-none focus:ring-1 focus:ring-orange/40"
          />
          <span className="text-text-muted text-sm">ate</span>
          <input
            type="date"
            value={customFim}
            onChange={e => setCustomFim(e.target.value)}
            className="h-9 px-3 rounded-xl bg-bg-elevated border border-bg-placeholder text-sm text-text-white focus:outline-none focus:ring-1 focus:ring-orange/40"
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
          <div className="h-64 bg-bg-card rounded-2xl animate-pulse" />
        </div>
      ) : (
        <Tabs.Root value={tab} onValueChange={setTab}>
          {/* Tab triggers */}
          <Tabs.List className="flex gap-1 bg-bg-elevated rounded-2xl p-1 mb-6">
            {[
              { value: 'resumo', label: 'Resumo' },
              { value: 'produtos', label: 'Produtos' },
              { value: 'evolucao', label: 'Evolucao' },
              { value: 'turnos', label: 'Turnos' },
            ].map(t => (
              <Tabs.Trigger
                key={t.value}
                value={t.value}
                className="flex-1 h-9 rounded-xl font-heading text-sm font-semibold transition-colors cursor-pointer data-[state=active]:bg-orange data-[state=active]:text-text-dark data-[state=inactive]:text-text-muted data-[state=inactive]:hover:text-text-white"
              >
                {t.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* ABA RESUMO */}
          <Tabs.Content value="resumo" className="space-y-6">
            {/* 3 Cards de comparacao + fiados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <CardComparacao
                label="Total em Vendas"
                atual={formatCurrency(dados.atual.totalVendas)}
                anterior={formatCurrency(dados.anterior.totalVendas)}
                variacao={vVendas}
                corAtual="text-success"
                mostrarAnterior={periodo !== 'tudo'}
              />
              <CardComparacao
                label="Pedidos Fechados"
                atual={String(dados.atual.totalComandas)}
                anterior={String(dados.anterior.totalComandas)}
                variacao={vPedidos}
                mostrarAnterior={periodo !== 'tudo'}
              />
              <CardComparacao
                label="Ticket Medio"
                atual={formatCurrency(dados.atual.valorMedio)}
                anterior={formatCurrency(dados.anterior.valorMedio)}
                variacao={vMedio}
                corAtual="text-orange"
                mostrarAnterior={periodo !== 'tudo'}
              />
              <Link href="/devedores" className="flex flex-col gap-2 p-5 bg-bg-card rounded-2xl border-l-4 border-warning hover:bg-bg-elevated transition-colors">
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  <Clock size={12} /> Vendas a Prazo (pendentes)
                </span>
                <span className="font-heading text-2xl font-bold text-warning">
                  {formatCurrency(dados.atual.fiadosPendentes)}
                </span>
                <span className="text-[11px] text-orange">ver devedores →</span>
              </Link>
            </div>

            {/* Formas de pagamento */}
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">Por Forma de Pagamento</h2>
              <div className="bg-bg-card rounded-2xl p-6 space-y-4">
                {Object.entries(dados.atual.formaPagamento).map(([key, value]) => {
                  const max = Math.max(...Object.values(dados.atual.formaPagamento), 1)
                  const pct = (value / max) * 100
                  const percentTotal = dados.atual.totalVendas > 0 ? ((value / dados.atual.totalVendas) * 100).toFixed(0) : '0'
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
                {Object.keys(dados.atual.formaPagamento).length === 0 && (
                  <p className="text-sm text-text-muted text-center py-4">
                    Sem dados no periodo selecionado
                  </p>
                )}
              </div>
            </div>
          </Tabs.Content>

          {/* ABA PRODUTOS — Ranking completo */}
          <Tabs.Content value="produtos" className="space-y-4">
            <h2 className="font-heading text-xl font-semibold">Ranking de Produtos</h2>
            <div className="bg-bg-card rounded-2xl overflow-hidden">
              {/* Header da tabela */}
              <div className="hidden sm:grid grid-cols-[50px_1fr_100px_120px] gap-2 px-5 h-11 items-center bg-bg-elevated/50">
                <span className="text-xs text-text-muted">#</span>
                <span className="text-xs text-text-muted">Produto</span>
                <span className="text-xs text-text-muted text-right">Qtd</span>
                <span className="text-xs text-text-muted text-right">Faturamento</span>
              </div>
              {dados.atual.topProdutos.length > 0 ? (
                <div className="space-y-px">
                  {dados.atual.topProdutos.map((prod, i) => (
                    <div key={prod.nome} className="grid grid-cols-[50px_1fr_100px_120px] gap-2 px-5 py-3 items-center">
                      <span className={`font-heading text-lg font-bold ${i < 3 ? 'text-orange' : 'text-text-muted'}`}>
                        {i + 1}
                      </span>
                      <span className="text-sm text-text-white font-medium truncate">{prod.nome}</span>
                      <span className="font-mono text-sm text-text-muted text-right">{prod.qtd}</span>
                      <span className="font-heading text-sm font-bold text-text-white text-right">
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
          </Tabs.Content>

          {/* ABA EVOLUCAO — Grafico de barras */}
          <Tabs.Content value="evolucao" className="space-y-4">
            <h2 className="font-heading text-xl font-semibold">Evolucao de Vendas</h2>
            <div className="p-5 bg-bg-card rounded-2xl">
              {vendasDiarias.length > 0 ? (
                <ChartBar data={getChartData()} height={280} />
              ) : (
                <p className="text-sm text-text-muted text-center py-12">
                  Sem dados no periodo selecionado
                </p>
              )}
            </div>
            {vendasDiarias.length > 0 && (
              <p className="text-xs text-text-muted">
                {vendasDiarias.length > 90 ? 'Agregado por mes' : vendasDiarias.length > 30 ? 'Agregado por semana' : 'Vendas por dia'}
              </p>
            )}
          </Tabs.Content>

          {/* ABA TURNOS — Historico de caixa */}
          <Tabs.Content value="turnos" className="space-y-4">
            <h2 className="font-heading text-xl font-semibold">Historico de Turnos</h2>
            <div className="bg-bg-card rounded-2xl overflow-hidden">
              {/* Header da tabela */}
              <div className="hidden sm:grid grid-cols-[1fr_100px_100px_100px_100px_100px] gap-2 px-5 h-11 items-center bg-bg-elevated/50">
                <span className="text-xs text-text-muted">Periodo</span>
                <span className="text-xs text-text-muted text-right">Abertura</span>
                <span className="text-xs text-text-muted text-right">Entradas</span>
                <span className="text-xs text-text-muted text-right">Saidas</span>
                <span className="text-xs text-text-muted text-right">Fechamento</span>
                <span className="text-xs text-text-muted text-right">Diferenca</span>
              </div>
              {turnos.length > 0 ? (
                <div className="space-y-px">
                  {turnos.map(turno => {
                    const esperado = turno.valor_abertura + turno.total_entradas - turno.total_saidas
                    const diferenca = (turno.valor_fechamento ?? 0) - esperado
                    const diferencaPositiva = diferenca >= 0
                    return (
                      <div key={turno.id} className="grid grid-cols-2 sm:grid-cols-[1fr_100px_100px_100px_100px_100px] gap-2 px-5 py-3 items-center">
                        <div>
                          <p className="text-sm text-text-white font-medium">
                            {new Date(turno.aberto_em).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-text-muted">
                            {new Date(turno.aberto_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {turno.fechado_em ? ` — ${new Date(turno.fechado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ' (aberto)'}
                          </p>
                        </div>
                        <span className="text-sm text-text-muted text-right font-mono">{formatCurrency(turno.valor_abertura)}</span>
                        <span className="text-sm text-success text-right font-mono">{formatCurrency(turno.total_entradas)}</span>
                        <span className="text-sm text-danger text-right font-mono">{formatCurrency(turno.total_saidas)}</span>
                        <span className="text-sm text-text-white text-right font-mono">
                          {turno.valor_fechamento !== null ? formatCurrency(turno.valor_fechamento) : '—'}
                        </span>
                        <span className={`text-sm text-right font-mono font-bold ${turno.valor_fechamento !== null ? (diferencaPositiva ? 'text-success' : 'text-danger') : 'text-text-muted'}`}>
                          {turno.valor_fechamento !== null ? (diferenca >= 0 ? '+' : '') + formatCurrency(diferenca) : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-text-muted text-center py-8">
                  Nenhum turno no periodo selecionado
                </p>
              )}
            </div>
          </Tabs.Content>
        </Tabs.Root>
      )}
    </div>
  )
}

// Componente de card com comparacao
function CardComparacao({
  label,
  atual,
  anterior,
  variacao,
  corAtual,
  mostrarAnterior = true,
}: {
  label: string
  atual: string
  anterior: string
  variacao: { pct: string; positivo: boolean }
  corAtual?: string
  mostrarAnterior?: boolean
}) {
  return (
    <div className="flex flex-col gap-2 p-5 bg-bg-card rounded-2xl">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`font-heading text-2xl font-bold ${corAtual || 'text-text-white'}`}>
        {atual}
      </span>
      {mostrarAnterior && (
        <div className="flex items-center gap-2 mt-1">
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${variacao.positivo ? 'text-success' : 'text-danger'}`}>
            {variacao.positivo ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {variacao.pct}%
          </span>
          <span className="text-[11px] text-text-muted">vs anterior ({anterior})</span>
        </div>
      )}
    </div>
  )
}
