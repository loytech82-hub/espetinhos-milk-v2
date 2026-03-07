'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, AlertCircle, Phone, ChevronDown, ChevronUp, Plus, Banknote, ArrowLeft, ShoppingBag, Calendar, CircleDollarSign, Trash2, QrCode, CreditCard } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { excluirPagamentoFiado } from '@/lib/supabase-helpers'
import { EmptyState } from '@/components/ui/empty-state'
import { AccessDenied } from '@/components/ui/access-denied'
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { ReceberPagamentoModal } from '@/components/devedores/receber-pagamento-modal'
import { AddProdutoFiadoModal } from '@/components/devedores/add-produto-fiado-modal'
import type { Comanda, ComandaItem } from '@/lib/types'

interface PagamentoFiado {
  id: string
  comanda_id: string
  valor: number
  forma_pagamento: string
  created_at: string
}

interface ClienteDevedor {
  id: string
  nome: string
  telefone: string | null
  total_divida: number
  comandas: (Comanda & { itens?: ComandaItem[] })[]
}

const formaLabels: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Debito',
  cartao_credito: 'Credito',
}

const formaIcons: Record<string, typeof Banknote> = {
  dinheiro: Banknote,
  pix: QrCode,
  cartao_debito: CreditCard,
  cartao_credito: CreditCard,
}

export default function DevedoresPage() {
  const router = useRouter()
  const { role } = useAuth()
  const { toast } = useToast()
  const [devedores, setDevedores] = useState<ClienteDevedor[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoFiado[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)

  // Excluir pagamento
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [pgtoToDelete, setPgtoToDelete] = useState<PagamentoFiado | null>(null)

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
          .select('id, comanda_id, valor, forma_pagamento, created_at')
          .order('created_at', { ascending: false }),
      ])

      if (!comandasData) {
        setDevedores([])
        setLoading(false)
        return
      }

      // Guardar pagamentos para mostrar historico
      setPagamentos((pagamentosData || []) as PagamentoFiado[])

      const pagoPorComanda = new Map<string, number>()
      ;(pagamentosData || []).forEach(p => {
        pagoPorComanda.set(p.comanda_id, (pagoPorComanda.get(p.comanda_id) || 0) + Number(p.valor))
      })

      const clienteIds = [...new Set(comandasData.map(c => c.cliente_id).filter(Boolean))]
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, telefone')
        .in('id', clienteIds)

      const clientesMap = new Map((clientesData || []).map(c => [c.id, c]))

      const devedoresMap = new Map<string, ClienteDevedor>()
      for (const comanda of comandasData) {
        const clienteId = comanda.cliente_id!
        const cliente = clientesMap.get(clienteId)
        if (!cliente) continue

        const valorPago = pagoPorComanda.get(comanda.id) || 0
        const saldoDevedor = comanda.total - valorPago
        if (saldoDevedor <= 0.01) continue

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

      const lista = Array.from(devedoresMap.values()).sort((a, b) => b.total_divida - a.total_divida)
      setDevedores(lista)
    } catch (err) {
      console.error('Erro ao carregar devedores:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeletePagamento() {
    if (!pgtoToDelete) return

    setDeleteLoading(true)
    try {
      await excluirPagamentoFiado(pgtoToDelete.id, pgtoToDelete.comanda_id)
      toast(`Lancamento de ${formatCurrency(pgtoToDelete.valor)} excluido!`, 'success')
      setDeleteOpen(false)
      setPgtoToDelete(null)
      loadDevedores()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setDeleteLoading(false)
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

  // Pagamentos de uma comanda especifica
  function getPagamentosComanda(comandaId: string) {
    return pagamentos.filter(p => p.comanda_id === comandaId)
  }

  if (role === 'garcom') return <AccessDenied />

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-5">
      {/* Header com botao voltar */}
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-muted hover:text-text-white transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Voltar</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Vendas a Prazo
            </h1>
            <p className="text-sm text-text-muted mt-0.5">Clientes com pagamentos pendentes</p>
          </div>
          <div className="flex items-center gap-2 h-10 px-4 bg-bg-elevated rounded-2xl w-full sm:w-auto">
            <Search className="w-4 h-4 text-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent text-sm text-text-white placeholder:text-text-muted outline-none w-full sm:w-48"
            />
          </div>
        </div>
      </div>

      {/* Cards resumo */}
      {devedores.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 sm:p-5 bg-bg-card rounded-2xl border-l-4 border-danger">
            <span className="text-xs text-text-muted uppercase tracking-wider">Total a Receber</span>
            <p className="font-heading text-2xl sm:text-3xl font-bold text-danger mt-1">{formatCurrency(totalGeral)}</p>
          </div>
          <div className="p-4 sm:p-5 bg-bg-card rounded-2xl">
            <span className="text-xs text-text-muted uppercase tracking-wider">Clientes a Prazo</span>
            <p className="font-heading text-2xl sm:text-3xl font-bold text-text-white mt-1">{devedores.length}</p>
          </div>
          <div className="p-4 sm:p-5 bg-bg-card rounded-2xl">
            <span className="text-xs text-text-muted uppercase tracking-wider">Comandas Pendentes</span>
            <p className="font-heading text-2xl sm:text-3xl font-bold text-text-white mt-1">
              {devedores.reduce((acc, d) => acc + d.comandas.length, 0)}
            </p>
          </div>
        </div>
      )}

      {/* Lista de devedores */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
          <SkeletonTable rows={4} />
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
                  className="w-full flex items-center justify-between px-4 sm:px-5 py-4 hover:bg-bg-elevated transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Avatar com inicial */}
                    <div className="w-11 h-11 bg-danger/15 rounded-full flex items-center justify-center shrink-0">
                      <span className="font-heading text-lg font-bold text-danger">
                        {devedor.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-base sm:text-lg text-text-white font-bold truncate">
                        {devedor.nome}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {devedor.telefone && (
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {devedor.telefone}
                          </span>
                        )}
                        <span className="text-xs text-text-muted">
                          {devedor.comandas.length} comanda{devedor.comandas.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-heading text-lg sm:text-xl font-bold text-danger">
                        {formatCurrency(devedor.total_divida)}
                      </p>
                    </div>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-orange/20' : 'bg-bg-elevated'}`}>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-orange" />
                        : <ChevronDown className="w-4 h-4 text-text-muted" />
                      }
                    </div>
                  </div>
                </button>

                {/* Detalhes expandidos */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-bg-elevated">
                    {/* Acoes rapidas */}
                    <div className="flex flex-wrap gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => setPgtoModal({
                          open: true,
                          comanda: devedor.comandas[0],
                          clienteId: devedor.id,
                          clienteNome: devedor.nome,
                        })}
                        className="flex items-center gap-2 h-10 px-5 bg-success text-text-dark font-heading text-sm font-bold rounded-xl hover:opacity-90 transition-colors cursor-pointer"
                      >
                        <CircleDollarSign className="w-4 h-4" />
                        Receber Pagamento
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddProdModal({ open: true, clienteId: devedor.id, clienteNome: devedor.nome })}
                        className="flex items-center gap-2 h-10 px-5 bg-orange text-text-dark font-heading text-sm font-bold rounded-xl hover:bg-orange-hover transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Produtos
                      </button>
                    </div>

                    {/* Lista de comandas */}
                    <div className="space-y-3">
                      {devedor.comandas.map(comanda => {
                        const valorPago = ((comanda as unknown as Record<string, unknown>)._valor_pago as number) || 0
                        const saldo = comanda.total - valorPago
                        const percentPago = comanda.total > 0 ? (valorPago / comanda.total) * 100 : 0
                        const pgtos = getPagamentosComanda(comanda.id)

                        return (
                          <div key={comanda.id} className="bg-bg-elevated rounded-xl overflow-hidden">
                            {/* Header da comanda */}
                            <div className="px-4 py-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <ShoppingBag className="w-4 h-4 text-orange" />
                                  <span className="font-heading text-base font-bold text-text-white">
                                    Comanda #{comanda.numero}
                                  </span>
                                </div>
                                {comanda.fechada_em && (
                                  <span className="flex items-center gap-1.5 text-xs text-text-muted bg-bg-card px-2.5 py-1 rounded-lg">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(comanda.fechada_em).toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                              </div>

                              {/* Barra de progresso do pagamento */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-text-muted">
                                    Total: <span className="text-text-white font-semibold">{formatCurrency(comanda.total)}</span>
                                  </span>
                                  {valorPago > 0 ? (
                                    <span className="text-success font-semibold">
                                      Pago: {formatCurrency(valorPago)} ({percentPago.toFixed(0)}%)
                                    </span>
                                  ) : (
                                    <span className="text-danger font-semibold">
                                      Nenhum pagamento
                                    </span>
                                  )}
                                </div>
                                <div className="h-2 bg-bg-card rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${valorPago > 0 ? 'bg-success' : 'bg-danger/30'}`}
                                    style={{ width: `${Math.min(percentPago, 100)}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-text-muted">Resta pagar:</span>
                                  <span className="font-heading text-lg font-bold text-danger">
                                    {formatCurrency(saldo)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Historico de pagamentos (lancamentos) */}
                            {pgtos.length > 0 && (
                              <div className="border-t border-bg-card">
                                <div className="px-4 py-2">
                                  <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">
                                    Lancamentos ({pgtos.length})
                                  </span>
                                </div>
                                <div className="px-4 pb-3 space-y-1.5">
                                  {pgtos.map(pgto => {
                                    const FormaIcon = formaIcons[pgto.forma_pagamento] || Banknote
                                    return (
                                      <div key={pgto.id} className="flex items-center justify-between py-2 px-3 bg-bg-card/50 rounded-lg group">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <FormaIcon className="w-4 h-4 text-success shrink-0" />
                                          <div className="min-w-0">
                                            <span className="text-sm text-success font-bold">
                                              +{formatCurrency(pgto.valor)}
                                            </span>
                                            <span className="text-xs text-text-muted ml-2">
                                              {formaLabels[pgto.forma_pagamento] || pgto.forma_pagamento}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-[11px] text-text-muted">
                                            {new Date(pgto.created_at).toLocaleDateString('pt-BR')} {new Date(pgto.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPgtoToDelete(pgto)
                                              setDeleteOpen(true)
                                            }}
                                            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-danger hover:bg-danger/10 transition-colors cursor-pointer opacity-60 hover:opacity-100"
                                            title="Excluir lancamento"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Itens da comanda */}
                            {comanda.itens && comanda.itens.length > 0 && (
                              <div className="border-t border-bg-card">
                                <div className="px-4 py-2">
                                  <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">
                                    Itens do pedido
                                  </span>
                                </div>
                                <div className="px-4 pb-3 space-y-1.5">
                                  {comanda.itens.map((item: ComandaItem) => (
                                    <div key={item.id} className="flex items-center justify-between py-1.5 px-3 bg-bg-card/50 rounded-lg">
                                      <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 bg-orange/15 text-orange rounded-md flex items-center justify-center text-xs font-bold shrink-0">
                                          {item.quantidade}x
                                        </span>
                                        <span className="text-sm text-text-white font-medium">
                                          {(item.produto as { nome: string } | undefined)?.nome || 'Produto'}
                                        </span>
                                      </div>
                                      <span className="text-sm font-heading font-bold text-text-white">
                                        {formatCurrency(item.subtotal)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Botao receber individual */}
                            {devedor.comandas.length > 1 && (
                              <div className="px-4 pb-3">
                                <button
                                  type="button"
                                  onClick={() => setPgtoModal({
                                    open: true,
                                    comanda,
                                    clienteId: devedor.id,
                                    clienteNome: devedor.nome,
                                  })}
                                  className="flex items-center justify-center gap-2 w-full h-9 bg-success/15 text-success font-heading text-sm font-bold rounded-lg hover:bg-success/25 transition-colors cursor-pointer"
                                >
                                  <Banknote className="w-4 h-4" />
                                  Pagar esta comanda
                                </button>
                              </div>
                            )}
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

      {/* Dialog: Excluir Lancamento */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir Lancamento"
        description={pgtoToDelete ? `Tem certeza que deseja excluir o lancamento de ${formatCurrency(pgtoToDelete.valor)} (${formaLabels[pgtoToDelete.forma_pagamento] || pgtoToDelete.forma_pagamento})? O valor sera removido dos pagamentos e o saldo devedor sera atualizado.` : ''}
        onConfirm={handleDeletePagamento}
        loading={deleteLoading}
        confirmText="Sim, Excluir"
        variant="danger"
      />

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
