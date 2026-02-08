'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, CreditCard, XCircle, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/lib/toast-context'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { AddItemModal } from '@/components/comandas/add-item-modal'
import { FecharComandaModal } from '@/components/comandas/fechar-comanda-modal'
import { printComanda } from '@/lib/print-comanda'
import { useEmpresa } from '@/lib/empresa-context'
import type { Comanda, ComandaItem, Produto } from '@/lib/types'

export default function ComandaDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { empresa } = useEmpresa()
  const [comanda, setComanda] = useState<Comanda | null>(null)
  const [itens, setItens] = useState<ComandaItem[]>([])
  const [loading, setLoading] = useState(true)

  const [addItemOpen, setAddItemOpen] = useState(false)
  const [fecharOpen, setFecharOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) loadComanda(params.id as string)
  }, [params.id])

  async function loadComanda(id: string) {
    try {
      const { data: comandaData } = await supabase
        .from('comandas')
        .select('*')
        .eq('id', id)
        .single()
      if (comandaData) setComanda(comandaData)

      const { data: itensData } = await supabase
        .from('comanda_itens')
        .select('*, produto:produtos(*)')
        .eq('comanda_id', id)
        .order('created_at', { ascending: true })
      if (itensData) setItens(itensData)
    } catch (error) {
      console.error('Erro ao carregar pedido:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!comanda) return
    setRemovingId(itemId)
    try {
      const res = await fetch(`/api/comandas/${comanda.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao remover item')
      toast('Item removido', 'success')
      await loadComanda(comanda.id)
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setRemovingId(null)
    }
  }

  // Cancelar pedido via API route (server-side com service_role key)
  async function handleCancel() {
    if (!comanda) return
    setCancelLoading(true)
    try {
      const res = await fetch(`/api/comandas/${comanda.id}`, { method: 'PATCH' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao cancelar pedido')
      toast('Pedido cancelado', 'warning')
      setCancelOpen(false)
      router.push('/comandas')
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setCancelLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted">carregando...</span>
      </div>
    )
  }

  if (!comanda) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted">Pedido nao encontrado</span>
      </div>
    )
  }

  const subtotalItens = itens.reduce((acc, i) => acc + i.subtotal, 0)
  const isAberta = comanda.status === 'aberta'
  // Se fechada, usa total salvo (ja inclui desconto). Se aberta, usa subtotal dos itens.
  const totalExibicao = isAberta ? subtotalItens : (comanda.total || 0)

  const statusLabels: Record<string, string> = {
    aberta: 'Aberto',
    fechada: 'Pago',
    cancelada: 'Cancelado',
  }

  const tipoLabels: Record<string, string> = {
    mesa: 'Mesa',
    balcao: 'Balcao',
    delivery: 'Delivery',
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/comandas')}
          className="w-10 h-10 flex items-center justify-center bg-bg-elevated rounded-2xl hover:bg-bg-placeholder transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="font-heading text-3xl font-bold">
            Pedido <span className="font-mono">#{String(comanda.numero).padStart(3, '0')}</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge variant={comanda.tipo === 'mesa' ? 'mesa' : comanda.tipo === 'balcao' ? 'balcao' : 'delivery'} dot>
              {tipoLabels[comanda.tipo] || comanda.tipo}
            </StatusBadge>
            <span className="text-sm text-text-muted">
              {new Date(comanda.aberta_em).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Imprimir comanda"
            onClick={() => printComanda(comanda, itens, empresa?.nome)}
            className="w-10 h-10 flex items-center justify-center bg-bg-elevated rounded-2xl hover:bg-bg-placeholder transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>
          <StatusBadge
            variant={comanda.status === 'aberta' ? 'success' : comanda.status === 'fechada' ? 'muted' : 'danger'}
          >
            {statusLabels[comanda.status] || comanda.status}
          </StatusBadge>
        </div>
      </div>

      {/* Itens */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold">
            Itens ({itens.length})
          </h2>
          {isAberta && (
            <Button onClick={() => setAddItemOpen(true)} size="sm">
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </Button>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden space-y-px">
          {itens.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 px-5 py-4 bg-bg-card"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-text-white font-medium">
                  {(item.produto as unknown as Produto)?.nome || 'Produto'}
                </p>
                <p className="text-xs text-text-muted">
                  {item.quantidade}x {formatCurrency(item.preco_unitario)}
                  {item.observacao && ` · ${item.observacao}`}
                </p>
              </div>
              <span className="font-heading text-[15px] text-text-white font-bold">
                {formatCurrency(item.subtotal)}
              </span>
              {isAberta && (
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={removingId === item.id}
                  className="text-text-muted hover:text-danger transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {itens.length === 0 && (
            <div className="p-10 bg-bg-card text-center">
              <span className="text-sm text-text-muted">
                Nenhum item adicionado
              </span>
              {isAberta && (
                <div className="mt-3">
                  <Button size="sm" onClick={() => setAddItemOpen(true)}>
                    <Plus size={14} /> Adicionar Primeiro Item
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Total + Acoes */}
      <div className="p-5 bg-bg-card rounded-2xl space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Subtotal</span>
            <span className="text-sm text-text-white">{formatCurrency(subtotalItens)}</span>
          </div>
          {(comanda.desconto ?? 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Desconto</span>
              <span className="text-sm text-danger">-{formatCurrency(comanda.desconto)}</span>
            </div>
          )}
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-white">Total</span>
            <span className="font-heading text-3xl font-bold text-orange">
              {formatCurrency(totalExibicao)}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {isAberta && (
            <div className="flex gap-3">
              <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
                <XCircle size={16} />
                Cancelar
              </Button>
              <Button onClick={() => setFecharOpen(true)} disabled={itens.length === 0}>
                <CreditCard size={16} />
                Receber Pagamento
              </Button>
            </div>
          )}
          {comanda.status === 'fechada' && comanda.forma_pagamento && (
            <div className="text-right">
              <span className="text-xs text-text-muted">Pago via</span>
              <p className="font-heading text-lg font-semibold text-success capitalize">
                {comanda.forma_pagamento === 'cartao_debito' ? 'Cartao Debito'
                  : comanda.forma_pagamento === 'cartao_credito' ? 'Cartao Credito'
                    : comanda.forma_pagamento === 'pix' ? 'PIX'
                      : comanda.forma_pagamento === 'dinheiro' ? 'Dinheiro'
                        : comanda.forma_pagamento}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      <AddItemModal
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        comandaId={comanda.id}
        onItemAdded={() => loadComanda(comanda.id)}
      />

      <FecharComandaModal
        open={fecharOpen}
        onOpenChange={setFecharOpen}
        comandaId={comanda.id}
        subtotal={subtotalItens}
        onClosed={() => loadComanda(comanda.id)}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar Pedido"
        description="Tem certeza que deseja cancelar este pedido? Os itens serao devolvidos ao estoque."
        onConfirm={handleCancel}
        loading={cancelLoading}
        confirmText="Sim, Cancelar"
        variant="danger"
      />
    </div>
  )
}
