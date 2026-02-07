'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { createMesa, deleteMesa, updateMesaStatus } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import type { Mesa } from '@/lib/types'

export default function MesasPage() {
  const { toast } = useToast()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)
  const [novaModalOpen, setNovaModalOpen] = useState(false)
  const [novoNumero, setNovoNumero] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Mesa | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadMesas()
  }, [])

  async function loadMesas() {
    try {
      const { data } = await supabase
        .from('mesas')
        .select('*')
        .order('numero')
      if (data) setMesas(data)
    } catch (error) {
      console.error('Erro ao carregar mesas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateMesa(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(novoNumero)
    if (!num || num <= 0) {
      toast('Informe um numero valido', 'error')
      return
    }
    if (mesas.some(m => m.numero === num)) {
      toast('Ja existe uma mesa com esse numero', 'error')
      return
    }

    setCreateLoading(true)
    try {
      await createMesa(num)
      toast(`Mesa ${num} criada!`, 'success')
      setNovaModalOpen(false)
      setNovoNumero('')
      loadMesas()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteMesa(deleteTarget.id)
      toast(`Mesa ${deleteTarget.numero} removida`, 'success')
      setDeleteTarget(null)
      loadMesas()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleToggleStatus(mesa: Mesa) {
    const newStatus = mesa.status === 'livre' ? 'reservada' : 'livre'
    try {
      await updateMesaStatus(mesa.id, newStatus)
      toast(`Mesa ${mesa.numero} ${newStatus === 'livre' ? 'liberada' : 'reservada'}`, 'success')
      loadMesas()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    }
  }

  const statusColors: Record<string, string> = {
    livre: 'bg-bg-elevated border-success/40 hover:border-success',
    ocupada: 'bg-orange/10 border-orange/40',
    reservada: 'bg-warning/10 border-warning/40 hover:border-warning',
  }

  const statusTextColors: Record<string, string> = {
    livre: 'text-success',
    ocupada: 'text-orange',
    reservada: 'text-warning',
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold">MESAS</h1>
          <p className="font-mono text-sm text-text-muted">// gerenciamento_de_mesas</p>
        </div>
        <button
          onClick={() => setNovaModalOpen(true)}
          className="inline-flex items-center gap-2 h-10 px-5 bg-orange text-text-dark font-heading text-sm font-semibold rounded-2xl hover:bg-orange-hover transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Mesa
        </button>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-success" />
          <span className="text-sm text-text-muted">Livre ({mesas.filter(m => m.status === 'livre').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange" />
          <span className="text-sm text-text-muted">Ocupada ({mesas.filter(m => m.status === 'ocupada').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-warning" />
          <span className="text-sm text-text-muted">Reservada ({mesas.filter(m => m.status === 'reservada').length})</span>
        </div>
      </div>

      {/* Grid de mesas */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="font-mono text-text-muted">carregando...</span>
        </div>
      ) : mesas.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Nenhuma mesa cadastrada"
          description="Adicione mesas ao seu estabelecimento"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {mesas.map(mesa => (
            <div
              key={mesa.id}
              className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${statusColors[mesa.status]}`}
            >
              {/* Numero da mesa */}
              <span className="font-heading text-3xl font-bold text-text-white">
                {String(mesa.numero).padStart(2, '0')}
              </span>
              <span className={`text-xs font-semibold uppercase mt-1 ${statusTextColors[mesa.status]}`}>
                {mesa.status}
              </span>

              {/* Acoes */}
              <div className="flex gap-2 mt-3">
                {mesa.status !== 'ocupada' && (
                  <button
                    onClick={() => handleToggleStatus(mesa)}
                    className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      mesa.status === 'livre'
                        ? 'bg-warning/20 text-warning hover:bg-warning/30'
                        : 'bg-success/20 text-success hover:bg-success/30'
                    }`}
                  >
                    {mesa.status === 'livre' ? 'Reservar' : 'Liberar'}
                  </button>
                )}
                {mesa.status === 'livre' && (
                  <button
                    onClick={() => setDeleteTarget(mesa)}
                    className="text-text-muted hover:text-danger transition-colors cursor-pointer p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nova mesa */}
      <Modal open={novaModalOpen} onOpenChange={setNovaModalOpen} title="Nova Mesa" maxWidth="max-w-sm">
        <form onSubmit={handleCreateMesa} className="space-y-4">
          <Input
            label="Numero da Mesa"
            type="number"
            min="1"
            value={novoNumero}
            onChange={e => setNovoNumero(e.target.value)}
            placeholder="Ex: 1, 2, 3..."
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setNovaModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createLoading}>
              Criar Mesa
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmar delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="Remover Mesa"
        description={`Tem certeza que deseja remover a Mesa ${deleteTarget?.numero}? Esta acao nao pode ser desfeita.`}
        onConfirm={handleDelete}
        loading={deleteLoading}
        confirmText="Sim, Remover"
        variant="danger"
      />
    </div>
  )
}
