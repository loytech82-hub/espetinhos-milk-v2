'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, ClipboardList, Trash2, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { cancelComanda } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { NovaComandaModal } from '@/components/comandas/nova-comanda-modal'
import type { Comanda } from '@/lib/types'

const filtros = ['todos', 'abertos', 'pagos', 'delivery'] as const
type Filtro = (typeof filtros)[number]

export default function ComandasPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Comanda | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadComandas()
  }, [])

  async function loadComandas() {
    try {
      const { data } = await supabase
        .from('comandas')
        .select('*')
        .order('aberta_em', { ascending: false })
      if (data) setComandas(data)
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = comandas.filter((c) => {
    if (filtro === 'abertos' && c.status !== 'aberta') return false
    if (filtro === 'pagos' && c.status !== 'fechada') return false
    if (filtro === 'delivery' && c.tipo !== 'delivery') return false
    if (busca) {
      const search = busca.toLowerCase()
      return (
        String(c.numero).includes(search) ||
        c.tipo.includes(search) ||
        (c.cliente_nome && c.cliente_nome.toLowerCase().includes(search))
      )
    }
    return true
  })

  function tipoBadgeVariant(tipo: string) {
    if (tipo === 'mesa') return 'mesa' as const
    if (tipo === 'balcao') return 'balcao' as const
    return 'delivery' as const
  }

  function statusBadgeVariant(status: string) {
    if (status === 'aberta') return 'success' as const
    if (status === 'fechada') return 'muted' as const
    return 'danger' as const
  }

  // Excluir pedido (cancelado/pago pode ser removido; aberto cancela primeiro)
  async function handleDeleteComanda() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      if (deleteTarget.status === 'aberta') {
        await cancelComanda(deleteTarget.id)
        toast(`Pedido #${deleteTarget.numero} cancelado`, 'warning')
      } else {
        // Deletar itens e depois a comanda
        await supabase.from('caixa').delete().eq('comanda_id', deleteTarget.id)
        await supabase.from('estoque_movimentos').delete().eq('comanda_id', deleteTarget.id)
        await supabase.from('comanda_itens').delete().eq('comanda_id', deleteTarget.id)
        await supabase.from('comandas').delete().eq('id', deleteTarget.id)
        toast(`Pedido #${deleteTarget.numero} excluido`, 'success')
      }
      setDeleteTarget(null)
      loadComandas()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const statusLabels: Record<string, string> = {
    aberta: 'Aberto',
    fechada: 'Pago',
    cancelada: 'Cancelado',
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold">PEDIDOS</h1>
          <p className="text-sm text-text-muted">Seus pedidos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 h-10 px-4 bg-bg-elevated rounded-2xl">
            <Search className="w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent text-xs text-text-white placeholder:text-text-muted outline-none w-32"
            />
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-5 bg-orange text-text-dark font-heading text-sm font-semibold rounded-2xl hover:bg-orange-hover transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Pedido
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filtros.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`h-9 px-4 rounded-2xl font-heading text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              filtro === f
                ? 'bg-orange text-text-dark'
                : 'bg-bg-elevated text-text-white hover:bg-bg-placeholder'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-text-muted">carregando...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum pedido encontrado"
          description={busca ? 'Tente outra busca' : 'Crie o primeiro pedido clicando no botao acima'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((comanda) => (
            <div
              key={comanda.id}
              onClick={() => router.push(`/comandas/${comanda.id}`)}
              className="flex items-center gap-3 px-4 py-3 bg-bg-card rounded-2xl hover:bg-bg-elevated transition-colors cursor-pointer"
            >
              {/* Numero */}
              <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center shrink-0">
                <span className="font-mono text-sm font-bold text-text-white">
                  {String(comanda.numero).padStart(3, '0')}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge variant={tipoBadgeVariant(comanda.tipo)} dot>
                    {comanda.tipo === 'mesa' ? 'Mesa' : comanda.tipo === 'balcao' ? 'Balcao' : 'Delivery'}
                  </StatusBadge>
                  <StatusBadge variant={statusBadgeVariant(comanda.status)}>
                    {statusLabels[comanda.status] || comanda.status}
                  </StatusBadge>
                </div>
                <p className="text-xs text-text-muted mt-1 truncate">
                  {comanda.cliente_nome || 'Sem cliente'}
                  {' · '}
                  {new Date(comanda.aberta_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Valor + acoes */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-heading text-sm font-bold text-orange">
                  {formatCurrency(comanda.total || 0)}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(comanda) }}
                  title={comanda.status === 'aberta' ? 'Cancelar pedido' : 'Excluir pedido'}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={16} className="text-text-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      <NovaComandaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={(id) => router.push(`/comandas/${id}`)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title={deleteTarget?.status === 'aberta' ? 'Cancelar Pedido' : 'Excluir Pedido'}
        description={
          deleteTarget?.status === 'aberta'
            ? `Cancelar pedido #${deleteTarget?.numero}? Os itens serao devolvidos ao estoque.`
            : `Excluir pedido #${deleteTarget?.numero}? Esta acao nao pode ser desfeita.`
        }
        onConfirm={handleDeleteComanda}
        loading={deleteLoading}
        confirmText={deleteTarget?.status === 'aberta' ? 'Sim, Cancelar' : 'Sim, Excluir'}
        variant="danger"
      />
    </div>
  )
}
