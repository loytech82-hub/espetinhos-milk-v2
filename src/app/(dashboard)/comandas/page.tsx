'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { NovaComandaModal } from '@/components/comandas/nova-comanda-modal'
import type { Comanda } from '@/lib/types'

const filtros = ['todos', 'abertos', 'pagos', 'delivery'] as const
type Filtro = (typeof filtros)[number]

export default function ComandasPage() {
  const router = useRouter()
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

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
        <div className="rounded-2xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-5 h-11 px-5 bg-bg-card items-center">
            <span className="text-xs text-text-muted">Pedido</span>
            <span className="text-xs text-text-muted">Tipo</span>
            <span className="text-xs text-text-muted">Cliente</span>
            <span className="text-xs text-text-muted">Valor</span>
            <span className="text-xs text-text-muted">Status</span>
          </div>

          <div className="space-y-px">
            {filtered.map((comanda) => (
              <a
                key={comanda.id}
                href={`/comandas/${comanda.id}`}
                className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-5 py-4 sm:h-14 bg-bg-card items-center hover:bg-bg-elevated transition-colors cursor-pointer"
              >
                <span className="font-mono text-[13px] text-text-white font-semibold">
                  #{String(comanda.numero).padStart(3, '0')}
                </span>
                <div>
                  <StatusBadge variant={tipoBadgeVariant(comanda.tipo)} dot>
                    {comanda.tipo === 'mesa' ? 'Mesa' : comanda.tipo === 'balcao' ? 'Balcao' : 'Delivery'}
                  </StatusBadge>
                </div>
                <span className="hidden sm:block text-[13px] text-text-white truncate">
                  {comanda.cliente_nome || '—'}
                </span>
                <span className="font-heading text-[13px] text-text-white font-bold">
                  {formatCurrency(comanda.total || 0)}
                </span>
                <div>
                  <StatusBadge variant={statusBadgeVariant(comanda.status)}>
                    {statusLabels[comanda.status] || comanda.status}
                  </StatusBadge>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <NovaComandaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={(id) => router.push(`/comandas/${id}`)}
      />
    </div>
  )
}
