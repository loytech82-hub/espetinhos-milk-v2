'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/lib/toast-context'
import { formatCurrency } from '@/lib/utils'
import { Banknote, QrCode, CreditCard, Percent } from 'lucide-react'

interface FecharComandaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comandaId: string
  subtotal: number
  onClosed: () => void
}

const formasPagamento = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'pix', label: 'PIX', icon: QrCode },
  { value: 'cartao_debito', label: 'Debito', icon: CreditCard },
  { value: 'cartao_credito', label: 'Credito', icon: CreditCard },
]

export function FecharComandaModal({ open, onOpenChange, comandaId, subtotal, onClosed }: FecharComandaModalProps) {
  const { toast } = useToast()
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [valorRecebido, setValorRecebido] = useState('')
  const [loading, setLoading] = useState(false)
  const [descontoStr, setDescontoStr] = useState('')

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setFormaPagamento('pix')
      setValorRecebido('')
      setDescontoStr('')
    }
  }, [open])

  const desconto = parseFloat(descontoStr) || 0
  const totalFinal = subtotal - desconto

  const troco = formaPagamento === 'dinheiro' && valorRecebido
    ? Math.max(0, parseFloat(valorRecebido) - totalFinal)
    : 0

  async function handleFechar() {
    if (totalFinal <= 0) {
      toast('Total deve ser maior que zero', 'error')
      return
    }

    if (formaPagamento === 'dinheiro') {
      const recebido = parseFloat(valorRecebido)
      if (!recebido || recebido < totalFinal) {
        toast('Valor recebido insuficiente', 'error')
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/comandas/${comandaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formaPagamento, desconto }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        toast(data.error || 'Erro ao fechar comanda', 'error')
        return
      }

      toast('Pagamento recebido!', 'success')
      onOpenChange(false)
      onClosed()
    } catch (err: unknown) {
      toast((err as Error).message || 'Erro ao processar pagamento', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Receber Pagamento" description="Como o cliente vai pagar?">
      <div className="space-y-5">
        {/* Resumo de valores */}
        <div className="p-5 bg-bg-elevated rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Subtotal</span>
            <span className="text-sm text-text-white">{formatCurrency(subtotal)}</span>
          </div>

          {/* Desconto */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Percent size={14} className="text-text-muted" />
              <span className="text-sm text-text-muted">Desconto</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              max={subtotal}
              value={descontoStr}
              onChange={e => setDescontoStr(e.target.value)}
              placeholder="0,00"
              className="w-24 text-right text-sm bg-bg-page border border-bg-placeholder rounded-lg px-2 py-1.5 text-danger placeholder:text-text-muted/40 focus:outline-none focus:ring-1 focus:ring-orange/40"
            />
          </div>

          <div className="h-px bg-bg-placeholder" />

          {/* Total final */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-white">Total a pagar</span>
            <span className="font-heading text-2xl font-bold text-orange">
              {formatCurrency(totalFinal)}
            </span>
          </div>
        </div>

        {/* Forma de pagamento */}
        <div className="grid grid-cols-2 gap-3">
          {formasPagamento.map(fp => (
            <button
              key={fp.value}
              type="button"
              onClick={() => setFormaPagamento(fp.value)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
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
              min={totalFinal}
              value={valorRecebido}
              onChange={e => setValorRecebido(e.target.value)}
              placeholder={formatCurrency(totalFinal)}
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
