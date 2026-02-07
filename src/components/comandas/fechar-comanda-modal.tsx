'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { closeComanda } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import { formatCurrency } from '@/lib/utils'
import { Banknote, QrCode, CreditCard } from 'lucide-react'

interface FecharComandaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comandaId: number
  total: number
  onClosed: () => void
}

const formasPagamento = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'pix', label: 'PIX', icon: QrCode },
  { value: 'cartao_debito', label: 'Debito', icon: CreditCard },
  { value: 'cartao_credito', label: 'Credito', icon: CreditCard },
]

export function FecharComandaModal({ open, onOpenChange, comandaId, total, onClosed }: FecharComandaModalProps) {
  const { toast } = useToast()
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [valorRecebido, setValorRecebido] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset
  useEffect(() => {
    if (!open) {
      setFormaPagamento('pix')
      setValorRecebido('')
    }
  }, [open])

  const troco = formaPagamento === 'dinheiro' && valorRecebido
    ? Math.max(0, parseFloat(valorRecebido) - total)
    : 0

  async function handleFechar() {
    if (formaPagamento === 'dinheiro') {
      const recebido = parseFloat(valorRecebido)
      if (!recebido || recebido < total) {
        toast('Valor recebido insuficiente', 'error')
        return
      }
    }

    setLoading(true)
    try {
      await closeComanda(comandaId, formaPagamento)
      toast('Pagamento recebido!', 'success')
      onOpenChange(false)
      onClosed()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Receber Pagamento" description="Como o cliente vai pagar?">
      <div className="space-y-5">
        {/* Total */}
        <div className="text-center p-6 bg-bg-elevated rounded-xl">
          <span className="text-sm text-text-muted">Total a pagar</span>
          <p className="font-heading text-4xl font-bold text-orange mt-1">
            {formatCurrency(total)}
          </p>
        </div>

        {/* Forma de pagamento */}
        <div className="grid grid-cols-2 gap-3">
          {formasPagamento.map(fp => (
            <button
              key={fp.value}
              type="button"
              onClick={() => setFormaPagamento(fp.value)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                formaPagamento === fp.value
                  ? 'border-orange bg-orange-soft'
                  : 'border-bg-placeholder bg-bg-elevated hover:border-bg-placeholder/80'
              }`}
            >
              <fp.icon size={20} className={formaPagamento === fp.value ? 'text-orange' : 'text-text-muted'} />
              <span className="font-heading text-sm font-semibold">{fp.label}</span>
            </button>
          ))}
        </div>

        {/* Valor recebido (somente dinheiro) */}
        {formaPagamento === 'dinheiro' && (
          <div className="space-y-3">
            <Input
              label="Valor Recebido"
              type="number"
              step="0.01"
              min={total}
              value={valorRecebido}
              onChange={e => setValorRecebido(e.target.value)}
              placeholder={formatCurrency(total)}
            />
            {troco > 0 && (
              <div className="flex items-center justify-between p-4 bg-success/10 border border-success/30 rounded-xl">
                <span className="text-sm text-success font-medium">Troco</span>
                <span className="font-heading text-xl font-bold text-success">
                  {formatCurrency(troco)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Botoes */}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleFechar} loading={loading} variant="success">
            Confirmar Pagamento
          </Button>
        </div>
      </div>
    </Modal>
  )
}
