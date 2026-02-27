'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/toast-context'
import { formatCurrency } from '@/lib/utils'
import { receberFiado } from '@/lib/supabase-helpers'
import { Banknote, QrCode, CreditCard } from 'lucide-react'

interface ReceberFiadoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comandaId: string
  total: number
  clienteNome: string | null
  onRecebido: () => void
}

const formasRecebimento = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'pix', label: 'PIX', icon: QrCode },
  { value: 'cartao_debito', label: 'Debito', icon: CreditCard },
  { value: 'cartao_credito', label: 'Credito', icon: CreditCard },
]

export function ReceberFiadoModal({ open, onOpenChange, comandaId, total, clienteNome, onRecebido }: ReceberFiadoModalProps) {
  const { toast } = useToast()
  const [forma, setForma] = useState('pix')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) setForma('pix')
  }, [open])

  async function handleReceber() {
    setLoading(true)
    try {
      await receberFiado(comandaId, forma)
      toast('Pagamento recebido!', 'success')
      onOpenChange(false)
      onRecebido()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Receber Pagamento" description={clienteNome ? `Cliente: ${clienteNome}` : undefined}>
      <div className="space-y-5">
        {/* Valor */}
        <div className="p-5 bg-bg-elevated rounded-xl text-center">
          <span className="text-xs text-text-muted">Valor a receber</span>
          <p className="font-heading text-3xl font-bold text-orange mt-1">
            {formatCurrency(total)}
          </p>
        </div>

        {/* Forma de pagamento real */}
        <div>
          <label className="block text-xs text-text-muted mb-2">Como o cliente vai pagar?</label>
          <div className="grid grid-cols-2 gap-3">
            {formasRecebimento.map(fp => (
              <button
                key={fp.value}
                type="button"
                onClick={() => setForma(fp.value)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  forma === fp.value
                    ? 'border-orange bg-orange-soft'
                    : 'border-bg-placeholder bg-bg-elevated hover:border-bg-placeholder/80'
                }`}
              >
                <fp.icon size={20} className={forma === fp.value ? 'text-orange' : 'text-text-muted'} />
                <span className="font-heading text-sm font-semibold">{fp.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Botoes */}
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleReceber} loading={loading} variant="success">
            Confirmar Recebimento
          </Button>
        </div>
      </div>
    </Modal>
  )
}
