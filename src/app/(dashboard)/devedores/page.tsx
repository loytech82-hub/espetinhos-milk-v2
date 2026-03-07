'use client'

import { useEffect, useState, useMemo } from 'react'
import { Search, AlertCircle, Phone, ChevronDown, ChevronUp, Plus, Banknote } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { ReceberPagamentoModal } from '@/components/devedores/receber-pagamento-modal'
import { AddProdutoFiadoModal } from '@/components/devedores/add-produto-fiado-modal'
import type { Comanda, ComandaItem } from '@/lib/types'

interface ClienteDevedor {
  id: string
  nome: string
  telefone: string | null
  total_divida: number
  comandas: (Comanda & { itens?: ComandaItem[] })[]
}

export default function DevedoresPage() {
  const [devedores, setDevedores] = useState<ClienteDevedor[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)

  // Modais
  const [pgtoModal, setPgtoModal] = useState<{ open: boolean; comanda: Comanda | null; clienteId: string; clienteNome: string }>({
    open: false, comanda: null, clienteId: '', clienteNome: ''
  })
  const [addProdModal, setAddProdModal] = useState<{ open: boolean; clienteId: string; clienteNome: string }>({
    open: false, clienteId: '', clienteNome: ''
  })

  useEffect(() => {
    loadDevedores()
  }, [])

  async function loadDevedores() {
    try {
      // Buscar todas as comandas fiado nao pagas com itens
      const [{ data: comandasData }, { data: pagamentosData }] = await Promise.all([
        supabase
          .from('comandas')
          .select('*, itens:comanda_itens(*, produto:produtos(nome, preco))')
          .eq('fiado', true)
          .eq('fiado_pago', false)
          .not('cliente_id', 'is', null)
          .order('fechada_em', { ascending: false }),
        supabase
          .from('fiado_pagamentos')
          .select('comanda_id, valor'),
      ])

      if (!comandasData) {
        setDevedores([])
        setLoading(false)
        return
      }

      // Calcular total pago por comanda
      const pagoPorComanda = new Map<string, number>()
      ;(pagamentosData || []).forEach(p => {
        pagoPorComanda.set(p.comanda_id, (pagoPorComanda.get(p.comanda_id) || 0) + Number(p.valor))
      })

      // Buscar clientes
      const clienteIds = [...new Set(comandasData.map(c => c.cliente_id).filter(Boolean))]
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, telefone')
        .in('id', clienteIds)

      const clientesMap = new Map((clientesData || []).map(c => [c.id, c]))

      // Agrupar por cliente
      const devedoresMap = new Map<string, ClienteDevedor>()
      for (const comanda of comandasData) {
        const clienteId = comanda.cliente_id!
        const cliente = clientesMap.get(clienteId)
        if (!cliente) continue

        const valorPago = pagoPorComanda.get(comanda.id) || 0
        const saldoDevedor = comanda.total - valorPago
        if (saldoDevedor <= 0.01) continue

        // Anotar valor pago na comanda para uso no UI
        ;(comanda as unknown as Record<string, unknown>)._valor_pago = valorPago

        if (!devedoresMap.has(clienteId)) {
          devedoresMap.set(clienteId, {
            id: clienteId,
            nome: cliente.nome,
            telefone: cliente.telefone,
            total_divida: 0,
            comandas: [],
          })
        }
        const dev = devedoresMap.get(clienteId)!
        dev.total_divida += saldoDevedor
        dev.comandas.push(comanda)
      }

      // Ordenar por divida (maior primeiro)
      const lista = Array.from(devedoresMap.values()).sort((a, b) => b.total_divida - a.total_divida)
      setDevedores(lista)
    } catch (err) {
      console.error('Erro ao carregar devedores:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!busca.trim()) return devedores
    const s = busca.toLowerCase()
    return devedores.filter(d =>
      d.nome.toLowerCase().includes(s) ||
      (d.telefone && d.telefone.includes(s))
    )
  }, [devedores, busca])

  const totalGeral = useMemo(() => devedores.reduce((acc, d) => acc + d.total_divida, 0), [devedores])

  function toggleExpand(id: string) {
    setExpandido(prev => prev === id ? null : id)
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold">DEVEDORES</h1>
          <p className="text-sm text-text-muted">Clientes com pagamentos pendentes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 h-10 px-4 bg-bg-elevated rounded-2xl">
            <Search className="w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="buscar cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent text-xs text-text-white placeholder:text-text-muted outline-none w-40"
            />
          </div>
        </div>
      </div>

      {/* Card Total */}
      {devedores.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-bg-card rounded-2xl border-l-4 border-danger">
            <span className="text-xs text-text-muted">Total a Receber</span>
            <p className="font-heading text-3xl font-bold text-danger mt-1">{formatCurrency(totalGeral)}</p>
          </div>
          <div className="p-5 bg-bg-card rounded-2xl">
            <span className="text-xs text-text-muted">Clientes Devedores</span>
            <p className="font-heading text-3xl font-bold text-text-white mt-1">{devedores.length}</p>
          </div>
          <div className="p-5 bg-bg-card rounded-2xl">
            <span className="text-xs text-text-muted">Comandas Pendentes</span>
            <p className="font-heading text-3xl font-bold text-text-white mt-1">
              {devedores.reduce((acc, d) => acc + d.comandas.length, 0)}
            </p>
          </div>
        </div>
      )}

      {/* Lista de devedores */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-text-muted">carregando...</span>
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(devedor => {
            const isExpanded = expandido === devedor.id
            return (
              <div key={devedor.id} className="bg-bg-card rounded-2xl overflow-hidden">
                {/* Header do devedor */}
                <button
                  type="button"
                  onClick={() => toggleExpand(devedor.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-elevated transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-danger/20 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-danger" />
                    </div>
                    <div className="text-left">
                      <p className="text-[15px] text-text-white font-semibold">{devedor.nome}</p>
                      {devedor.telefone && (
                        <p className="text-xs text-text-muted flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {devedor.telefone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-heading text-xl font-bold text-danger">{formatCurrency(devedor.total_divida)}</p>
                      <p className="text-[11px] text-text-muted">{devedor.comandas.length} comanda{devedor.comandas.length > 1 ? 's' : ''}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
                  </div>
                </button>

                {/* Detalhes expandidos */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4">
                    {/* Acoes rapidas */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setAddProdModal({ open: true, clienteId: devedor.id, clienteNome: devedor.nome })}
                        className="flex items-center gap-2 h-9 px-4 bg-orange text-text-dark font-heading text-xs font-semibold rounded-xl hover:bg-orange-hover transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Produtos
                      </button>
                    </div>

                    {/* Lista de comandas */}
                    <div className="space-y-2">
                      {devedor.comandas.map(comanda => {
                        const valorPago = ((comanda as unknown as Record<string, unknown>)._valor_pago as number) || 0
                        const saldo = comanda.total - valorPago
                        return (
                          <div key={comanda.id} className="p-4 bg-bg-elevated rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-heading text-sm font-semibold text-text-white">
                                  Comanda #{comanda.numero}
                                </span>
                                <span className="text-xs text-text-muted ml-2">
                                  {comanda.fechada_em ? new Date(comanda.fechada_em).toLocaleDateString('pt-BR') : ''}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="font-heading text-sm font-bold text-danger">{formatCurrency(saldo)}</p>
                                {valorPago > 0 && (
                                  <p className="text-[11px] text-success">
                                    Pago: {formatCurrency(valorPago)} de {formatCurrency(comanda.total)}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Itens da comanda */}
                            {comanda.itens && comanda.itens.length > 0 && (
                              <div className="space-y-1">
                                {comanda.itens.map((item: ComandaItem) => (
                                  <div key={item.id} className="flex justify-between text-xs text-text-muted">
                                    <span>{item.quantidade}x {(item.produto as { nome: string } | undefined)?.nome || 'Produto'}</span>
                                    <span>{formatCurrency(item.subtotal)}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Botao receber */}
                            <button
                              type="button"
                              onClick={() => setPgtoModal({
                                open: true,
                                comanda,
                                clienteId: devedor.id,
                                clienteNome: devedor.nome,
                              })}
                              className="flex items-center gap-2 h-8 px-3 bg-success/20 text-success font-heading text-xs font-semibold rounded-lg hover:bg-success/30 transition-colors cursor-pointer"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              Receber Pagamento
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={AlertCircle}
          title="Nenhum cliente devedor"
          description="Todos os pagamentos estao em dia!"
        />
      )}

      {/* Modais */}
      <ReceberPagamentoModal
        open={pgtoModal.open}
        onOpenChange={(open) => setPgtoModal(prev => ({ ...prev, open }))}
        comanda={pgtoModal.comanda}
        clienteId={pgtoModal.clienteId}
        clienteNome={pgtoModal.clienteNome}
        onRecebido={loadDevedores}
      />

      <AddProdutoFiadoModal
        open={addProdModal.open}
        onOpenChange={(open) => setAddProdModal(prev => ({ ...prev, open }))}
        clienteId={addProdModal.clienteId}
        clienteNome={addProdModal.clienteNome}
        onAdded={loadDevedores}
      />
    </div>
  )
}
