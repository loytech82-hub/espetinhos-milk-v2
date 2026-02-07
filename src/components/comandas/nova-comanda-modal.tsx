'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { createComanda } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import type { Mesa } from '@/lib/types'
import { UtensilsCrossed, Store, Truck } from 'lucide-react'

interface NovaComandaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: number) => void
  defaultMesaId?: number | null
}

const tipos = [
  { value: 'mesa' as const, label: 'Mesa', icon: UtensilsCrossed, color: 'text-mesa' },
  { value: 'balcao' as const, label: 'Balcao', icon: Store, color: 'text-balcao' },
  { value: 'delivery' as const, label: 'Delivery', icon: Truck, color: 'text-delivery' },
]

export function NovaComandaModal({ open, onOpenChange, onCreated, defaultMesaId }: NovaComandaModalProps) {
  const { toast } = useToast()
  const [tipo, setTipo] = useState<'mesa' | 'balcao' | 'delivery'>('mesa')
  const [mesaId, setMesaId] = useState<number | null>(null)
  const [clienteNome, setClienteNome] = useState('')
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(false)

  // Carregar mesas livres
  useEffect(() => {
    if (open) {
      supabase
        .from('mesas')
        .select('*')
        .eq('status', 'livre')
        .order('numero')
        .then(({ data }) => {
          if (data) setMesas(data)
        })
    }
  }, [open])

  // Pre-selecionar mesa quando abrir via dashboard
  useEffect(() => {
    if (open && defaultMesaId) {
      setTipo('mesa')
      setMesaId(defaultMesaId)
    }
  }, [open, defaultMesaId])

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setTipo('mesa')
      setMesaId(null)
      setClienteNome('')
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (tipo === 'mesa' && !mesaId) {
      toast('Selecione uma mesa', 'error')
      return
    }
    if (tipo === 'delivery' && !clienteNome.trim()) {
      toast('Informe o nome do cliente', 'error')
      return
    }

    setLoading(true)
    try {
      const comanda = await createComanda(tipo, mesaId, clienteNome || null)
      toast(`Pedido #${comanda.numero} aberto!`, 'success')
      onOpenChange(false)
      onCreated(comanda.id)
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Novo Pedido" description="Como vai ser o pedido?">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Seletor de tipo */}
        <div className="grid grid-cols-3 gap-3">
          {tipos.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => { setTipo(t.value); setMesaId(null) }}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                tipo === t.value
                  ? 'border-orange bg-orange-soft'
                  : 'border-bg-placeholder bg-bg-elevated hover:border-bg-placeholder/80'
              }`}
            >
              <t.icon size={24} className={tipo === t.value ? 'text-orange' : t.color} />
              <span className="font-heading text-sm font-semibold">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Seletor de mesa */}
        {tipo === 'mesa' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-muted">Mesa</label>
            {mesas.length === 0 ? (
              <p className="text-sm text-warning">Nenhuma mesa livre disponivel</p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {mesas.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMesaId(m.id)}
                    className={`p-3 rounded-lg font-heading font-bold text-lg transition-all ${
                      mesaId === m.id
                        ? 'bg-orange text-text-dark'
                        : 'bg-bg-elevated text-text-white hover:bg-bg-placeholder'
                    }`}
                  >
                    {String(m.numero).padStart(2, '0')}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nome do cliente */}
        {(tipo === 'delivery' || tipo === 'balcao') && (
          <Input
            label={tipo === 'delivery' ? 'Nome do Cliente *' : 'Nome do Cliente (opcional)'}
            value={clienteNome}
            onChange={e => setClienteNome(e.target.value)}
            placeholder="Nome do cliente"
          />
        )}

        {/* Botoes */}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Abrir Pedido
          </Button>
        </div>
      </form>
    </Modal>
  )
}
