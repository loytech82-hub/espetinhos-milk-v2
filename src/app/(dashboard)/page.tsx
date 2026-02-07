'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, getGreeting } from '@/lib/utils'
import type { Mesa, Comanda } from '@/lib/types'

export default function DashboardPage() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [vendasHoje, setVendasHoje] = useState(0)
  const [saldoCaixa, setSaldoCaixa] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      // Carrega mesas
      const { data: mesasData } = await supabase
        .from('mesas')
        .select('*')
        .order('numero')
      if (mesasData) setMesas(mesasData)

      // Carrega comandas recentes
      const { data: comandasData } = await supabase
        .from('comandas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      if (comandasData) setComandas(comandasData)

      // Vendas de hoje
      const hoje = new Date().toISOString().split('T')[0]
      const { data: vendasData } = await supabase
        .from('comandas')
        .select('total')
        .eq('status', 'fechada')
        .gte('created_at', hoje)
      if (vendasData) {
        setVendasHoje(vendasData.reduce((acc, v) => acc + (v.total || 0), 0))
      }

      // Saldo do caixa
      const { data: caixaData } = await supabase
        .from('caixa')
        .select('tipo, valor')
        .gte('created_at', hoje)
      if (caixaData) {
        const saldo = caixaData.reduce((acc, m) => {
          return m.tipo === 'entrada' ? acc + m.valor : acc - m.valor
        }, 0)
        setSaldoCaixa(saldo)
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const comandasAbertas = comandas.filter((c) => c.status === 'aberta').length
  const ticketMedio = comandas.length > 0
    ? comandas.reduce((acc, c) => acc + (c.total || 0), 0) / comandas.length
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="font-mono text-text-muted">carregando...</span>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-oswald)] text-3xl lg:text-4xl font-bold">
            DASHBOARD
          </h1>
          <p className="font-mono text-sm text-text-muted">
            // {getGreeting()}, admin
          </p>
        </div>
        <a
          href="/comandas"
          className="inline-flex items-center gap-2 h-10 px-5 bg-orange text-text-dark font-mono text-xs font-semibold rounded-2xl hover:bg-orange-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          nova_comanda
        </a>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="VENDAS_HOJE" value={formatCurrency(vendasHoje)} change="+12.4%" period="vs_ontem" />
        <MetricCard label="TICKET_MEDIO" value={formatCurrency(ticketMedio)} change="+8.2%" period="vs_ontem" />
        <MetricCard label="COMANDAS_ABERTAS" value={String(comandasAbertas)} change={`+${comandasAbertas}`} period="ultima_hora" accent />
        <MetricCard label="SALDO_CAIXA" value={formatCurrency(saldoCaixa)} change="aberto" period="desde_08h" highlighted />
      </div>

      {/* Mesas + Atividade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grid de Mesas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-oswald)] text-xl font-semibold">MESAS</h2>
            <span className="font-mono text-[11px] text-orange">ver_todas</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {mesas.map((mesa) => (
              <div
                key={mesa.id}
                className="flex flex-col items-center justify-center gap-2 p-3 bg-bg-card rounded-2xl"
              >
                <span className="font-[family-name:var(--font-oswald)] text-2xl font-bold">
                  {String(mesa.numero).padStart(2, '0')}
                </span>
                <span
                  className={`font-mono text-[11px] ${
                    mesa.status === 'ocupada' ? 'text-orange' : 'text-success'
                  }`}
                >
                  {mesa.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Atividade Recente */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-oswald)] text-xl font-semibold">
              ATIVIDADE_RECENTE
            </h2>
            <span className="font-mono text-[11px] text-orange">ver_todas</span>
          </div>
          <div className="rounded-2xl overflow-hidden space-y-px">
            {comandas.map((comanda) => (
              <div
                key={comanda.id}
                className="flex items-center justify-between gap-4 p-4 bg-bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[13px] text-white truncate">
                    comanda #{String(comanda.numero).padStart(3, '0')} —{' '}
                    {comanda.tipo === 'mesa'
                      ? `mesa ${String(comanda.mesa_id).padStart(2, '0')}`
                      : comanda.tipo}
                  </p>
                  <p className="font-mono text-xs text-text-muted">
                    {formatCurrency(comanda.total || 0)} ·{' '}
                    {new Date(comanda.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <StatusBadge status={comanda.status} />
              </div>
            ))}
            {comandas.length === 0 && (
              <div className="p-6 bg-bg-card text-center">
                <span className="font-mono text-sm text-text-muted">
                  nenhuma_comanda_hoje
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente de card de métrica
function MetricCard({
  label,
  value,
  change,
  period,
  highlighted,
  accent,
}: {
  label: string
  value: string
  change: string
  period: string
  highlighted?: boolean
  accent?: boolean
}) {
  return (
    <div
      className={`flex flex-col gap-3 p-5 rounded-2xl ${
        highlighted ? 'bg-orange' : 'bg-bg-card'
      }`}
    >
      <span
        className={`font-mono text-xs ${
          highlighted ? 'text-text-dark' : 'text-text-muted'
        }`}
      >
        {label}
      </span>
      <span
        className={`font-[family-name:var(--font-oswald)] text-3xl font-bold ${
          highlighted ? 'text-text-dark' : 'text-white'
        }`}
      >
        {value}
      </span>
      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-xs ${
            highlighted
              ? 'text-text-dark'
              : accent
                ? 'text-orange'
                : 'text-success'
          }`}
        >
          {change}
        </span>
        <span
          className={`font-mono text-xs ${
            highlighted ? 'text-text-dark' : 'text-text-muted'
          }`}
        >
          {period}
        </span>
      </div>
    </div>
  )
}

// Badge de status da comanda
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    aberta: 'bg-success text-text-dark',
    fechada: 'bg-bg-placeholder text-text-muted border border-[#3D3D3D]',
    cancelada: 'bg-red-600 text-white',
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-2xl font-mono text-[11px] ${
        styles[status] || styles.aberta
      }`}
    >
      {status.toUpperCase()}
    </span>
  )
}
