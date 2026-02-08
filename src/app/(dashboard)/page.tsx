'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowUpCircle, ClipboardList, Wallet, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, getGreeting } from '@/lib/utils'
import { getProdutosEstoqueBaixo } from '@/lib/supabase-helpers'
import { ChartBar } from '@/components/ui/chart-bar'
import { NovaComandaModal } from '@/components/comandas/nova-comanda-modal'
import { useAuth } from '@/lib/auth-context'
import type { Mesa, Comanda, Produto } from '@/lib/types'

export default function DashboardPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [vendasHoje, setVendasHoje] = useState(0)
  const [comandasAbertas, setComandasAbertas] = useState(0)
  const [saldoCaixa, setSaldoCaixa] = useState(0)
  const [produtosBaixo, setProdutosBaixo] = useState<Produto[]>([])
  const [vendasSemana, setVendasSemana] = useState<{ label: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [mesaSelecionada, setMesaSelecionada] = useState<number | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const hoje = new Date().toISOString().split('T')[0]
      const seteDiasAtras = new Date()
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 6)
      const dataInicio = seteDiasAtras.toISOString().split('T')[0]

      // Todas as queries em paralelo (era sequencial, ~4s → ~500ms)
      const [
        { data: mesasData },
        { data: abertasData },
        { data: comandasData },
        { data: vendasData },
        { data: caixaData },
        baixo,
        { data: vendasSemanaData },
      ] = await Promise.all([
        supabase.from('mesas').select('*').order('numero'),
        supabase.from('comandas').select('id').eq('status', 'aberta'),
        supabase.from('comandas').select('*').order('aberta_em', { ascending: false }).limit(3),
        supabase.from('comandas').select('total').eq('status', 'fechada').gte('aberta_em', hoje),
        supabase.from('caixa').select('tipo, valor').gte('created_at', hoje),
        getProdutosEstoqueBaixo(),
        supabase.from('comandas').select('total, aberta_em').eq('status', 'fechada').gte('aberta_em', dataInicio),
      ])

      if (mesasData) setMesas(mesasData)
      if (abertasData) setComandasAbertas(abertasData.length)
      if (comandasData) setComandas(comandasData)
      if (vendasData) setVendasHoje(vendasData.reduce((acc, v) => acc + (v.total || 0), 0))
      if (caixaData) {
        setSaldoCaixa(caixaData.reduce((acc, m) => m.tipo === 'entrada' ? acc + m.valor : acc - m.valor, 0))
      }
      setProdutosBaixo(baixo)

      // Agrupar vendas por dia
      const vendasPorDia = new Map<string, number>()
      vendasSemanaData?.forEach(v => {
        const dia = v.aberta_em.split('T')[0]
        vendasPorDia.set(dia, (vendasPorDia.get(dia) || 0) + (v.total || 0))
      })

      const dias: { label: string; value: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const diaStr = d.toISOString().split('T')[0]
        dias.push({
          label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3),
          value: vendasPorDia.get(diaStr) || 0,
        })
      }
      setVendasSemana(dias)
    } catch (error) {
      console.error('Erro ao carregar:', error)
    } finally {
      setLoading(false)
    }
  }

  // Clicar numa mesa
  async function handleMesaClick(mesa: Mesa) {
    if (mesa.status === 'livre') {
      // Abre modal com mesa pre-selecionada
      setMesaSelecionada(mesa.id)
      setModalOpen(true)
    } else if (mesa.status === 'ocupada') {
      // Navega pro pedido aberto dessa mesa
      const { data } = await supabase
        .from('comandas')
        .select('id')
        .eq('mesa_id', mesa.id)
        .eq('status', 'aberta')
        .limit(1)
        .single()
      if (data) {
        router.push(`/comandas/${data.id}`)
      }
    }
  }

  function handleComandaCriada(id: string) {
    router.push(`/comandas/${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted">carregando...</span>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Saudacao */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold">
            {getGreeting()}{profile?.nome ? `, ${profile.nome.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-sm text-text-muted">
            Veja como esta o movimento
          </p>
        </div>
        <button
          onClick={() => { setMesaSelecionada(null); setModalOpen(true) }}
          className="inline-flex items-center gap-2 h-12 px-6 bg-orange text-text-dark font-heading text-sm font-semibold rounded-2xl hover:bg-orange-hover transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Novo Pedido
        </button>
      </div>

      {/* 3 Cards com hierarquia visual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-3 p-5 bg-bg-card rounded-2xl border-l-4 border-success">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-success" />
            <span className="text-xs text-text-muted">Vendas de Hoje</span>
          </div>
          <span className="font-heading text-3xl font-bold text-success">
            {formatCurrency(vendasHoje)}
          </span>
        </div>
        <div className="flex flex-col gap-3 p-5 bg-bg-card rounded-2xl border-l-4 border-orange">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-orange" />
            <span className="text-xs text-text-muted">Pedidos Abertos</span>
          </div>
          <span className="font-heading text-3xl font-bold text-orange">
            {comandasAbertas}
          </span>
        </div>
        <div className="flex flex-col gap-3 p-5 bg-orange rounded-2xl">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-text-dark" />
            <span className="text-xs text-text-dark">Caixa do Dia</span>
          </div>
          <span className="font-heading text-3xl font-bold text-text-dark">
            {formatCurrency(saldoCaixa)}
          </span>
        </div>
      </div>

      {/* Grafico de vendas + Estoque baixo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico vendas ultimos 7 dias */}
        <div className="p-5 bg-bg-card rounded-2xl space-y-3">
          <h3 className="font-heading text-sm font-semibold text-text-muted">VENDAS DA SEMANA</h3>
          <ChartBar data={vendasSemana} height={140} />
        </div>

        {/* Estoque baixo */}
        <div className="p-5 bg-bg-card rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-semibold text-text-muted">ESTOQUE BAIXO</h3>
            {produtosBaixo.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-danger">
                <AlertTriangle className="w-3 h-3" />
                {produtosBaixo.length}
              </span>
            )}
          </div>
          {produtosBaixo.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">Tudo em ordem!</p>
          ) : (
            <div className="space-y-2 max-h-[120px] overflow-y-auto">
              {produtosBaixo.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-text-white">{p.nome}</span>
                  <span className="font-mono text-xs text-danger font-bold">{p.estoque_atual || 0}/{p.estoque_minimo}</span>
                </div>
              ))}
              {produtosBaixo.length > 5 && (
                <a href="/estoque" className="text-xs text-orange hover:underline">
                  ver todos ({produtosBaixo.length})
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mesas clicaveis */}
      {mesas.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-semibold">Suas Mesas</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {mesas.map((mesa) => (
              <button
                key={mesa.id}
                onClick={() => handleMesaClick(mesa)}
                className={`flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  mesa.status === 'ocupada'
                    ? 'bg-orange/10 border-orange/40 hover:border-orange'
                    : mesa.status === 'reservada'
                      ? 'bg-warning/10 border-warning/40 hover:border-warning'
                      : 'bg-bg-card border-success/40 hover:border-success'
                }`}
              >
                <span className="font-heading text-2xl font-bold text-text-white">
                  {String(mesa.numero).padStart(2, '0')}
                </span>
                <span className={`text-[11px] font-semibold ${
                  mesa.status === 'ocupada' ? 'text-orange'
                    : mesa.status === 'reservada' ? 'text-warning'
                      : 'text-success'
                }`}>
                  {mesa.status === 'ocupada' ? 'Ocupada' : mesa.status === 'reservada' ? 'Reservada' : 'Livre'}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted">
            Toque numa mesa livre para abrir um pedido, ou numa ocupada para ver o pedido
          </p>
        </div>
      )}

      {/* Ultimos pedidos */}
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold">Ultimos Pedidos</h2>
        {comandas.length === 0 ? (
          <div className="p-6 bg-bg-card rounded-2xl text-center">
            <span className="text-sm text-text-muted">Nenhum pedido ainda</span>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden space-y-px">
            {comandas.map((comanda) => (
              <div
                key={comanda.id}
                onClick={() => router.push(`/comandas/${comanda.id}`)}
                className="flex items-center justify-between gap-4 p-4 bg-bg-card hover:bg-bg-elevated transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-text-white font-medium truncate">
                    Pedido <span className="font-mono">#{String(comanda.numero).padStart(3, '0')}</span>
                    {' — '}
                    {comanda.tipo === 'mesa' ? 'Mesa' : comanda.tipo === 'balcao' ? 'Balcao' : 'Delivery'}
                    {comanda.cliente_nome ? ` · ${comanda.cliente_nome}` : ''}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatCurrency(comanda.total || 0)} · {new Date(comanda.aberta_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-2xl text-[11px] font-semibold ${
                  comanda.status === 'aberta'
                    ? 'bg-success/20 text-success'
                    : comanda.status === 'fechada'
                      ? 'bg-bg-elevated text-text-muted'
                      : 'bg-danger/20 text-danger'
                }`}>
                  {comanda.status === 'aberta' ? 'Aberto' : comanda.status === 'fechada' ? 'Pago' : 'Cancelado'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de novo pedido */}
      <NovaComandaModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setMesaSelecionada(null) }}
        onCreated={handleComandaCriada}
        defaultMesaId={mesaSelecionada}
      />
    </div>
  )
}
