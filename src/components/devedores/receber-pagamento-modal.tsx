'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast-context'
import { formatCurrency } from '@/lib/utils'
import { receberFiadoParcial } from '@/lib/supabase-helpers'
import { Banknote, QrCode, CreditCard } from 'lucide-react'
import type { Comanda } from '@/lib/types'

interface ReceberPagamentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comanda: Comanda | null
  clienteId: string
  clienteNome: string
  onRecebido: () => void
}

const formasRecebimento = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'pix', label: 'PIX', icon: QrCode },
  { value: 'cartao_debito', label: 'Debito', icon: CreditCard },
  { value: 'cartao_credito', label: 'Credito', icon: CreditCard },
]

export function ReceberPagamentoModal({ open, onOpenChange, comanda, clienteId, clienteNome, onRecebido }: ReceberPagamentoModalProps) {
  const { toast } = useToast()
  const [forma, setForma] = useState('pix')
  const [valor, setValor] = useState('')
  const [loading, setLoading] = useState(false)
  const [saldoDevedor, setSaldoDevedor] = useState(0)

  useEffect(() => {
    if (open && comanda) {
      setForma('pix')
      // Calcular saldo devedor a partir de fiado_pagamentos
      supabase
        .from('fiado_pagamentos')
        .select('valor')
        .eq('comanda_id', comanda.id)
        .then(({ data }) => {
          const totalPago = (data || []).reduce((acc, p) => acc + Number(p.valor), 0)
          const saldo = comanda.total - totalPago
          setSaldoDevedor(saldo)
          setValor(saldo.toFixed(2))
        })
    }
  }, [open, comanda])

  async function handleReceber() {
    if (!comanda) return

    const valorNum = parseFloat(valor)
    if (isNaN(valorNum) || valorNum <= 0) {
      toast('Informe um valor valido', 'error')
      return
    }
    if (valorNum > saldoDevedor + 0.01) {
      toast(`Valor excede o saldo devedor (${formatCurrency(saldoDevedor)})`, 'error')
      return
    }

    setLoading(true)
    try {
      const result = await receberFiadoParcial(comanda.id, valorNum, forma, clienteId)
      toast(result.quitado ? 'Divida quitada!' : 'Pagamento parcial registrado!', 'success')
      onOpenChange(false)
      onRecebido()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Receber Pagamento"
      description={clienteNome ? `Cliente: ${clienteNome}` : undefined}
    >
      <div className="space-y-5">
        {/* Info da comanda */}
        {comanda && (
          <div className="p-4 bg-bg-elevated rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-text-muted">Comanda #{comanda.numero}</span>
              <span className="text-xs text-text-muted">Total: {formatCurrency(comanda.total)}</span>
            </div>
            {comanda.total - saldoDevedor > 0.01 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-success">Ja pago</span>
                <span className="text-xs text-success">{formatCurrency(comanda.total - saldoDevedor)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-text-white">Saldo devedor</span>
              <span className="font-heading text-xl font-bold text-danger">{formatCurrency(saldoDevedor)}</span>
            </div>
          </div>
        )}

        {/* Valor */}
        <div className="space-y-2">
          <label className="block text-xs text-text-muted">Valor do pagamento</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={saldoDevedor}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full h-12 px-4 bg-bg-elevated border border-bg-placeholder rounded-xl text-center font-heading text-2xl font-bold text-orange outline-none focus:ring-2 focus:ring-orange/50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setValor(saldoDevedor.toFixed(2))}
              className="flex-1 h-8 bg-bg-elevated rounded-lg text-xs text-text-muted hover:text-text-white transition-colors cursor-pointer"
            >
              Valor total
            </button>
            <button
              type="button"
              onClick={() => setValor((saldoDevedor / 2).toFixed(2))}
              className="flex-1 h-8 bg-bg-elevated rounded-lg text-xs text-text-muted hover:text-text-white transition-colors cursor-pointer"
            >
              Metade
            </button>
          </div>
        </div>

        {/* Forma de pagamento */}
        <div>
          <label className="block text-xs text-text-muted mb-2">Forma de pagamento</label>
          <div className="grid grid-cols-2 gap-3">
            {formasRecebimento.map(fp => (
              <button
                key={fp.value}
                type="button"
                onClick={() => setForma(fp.value)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  forma === fp.value
                    ? 'border-orange bg-orange-soft'
                    : 'border-bg-placeholder bg-bg-elevated hover:border-bg-placeholder/80'
                }`}
              >
                <fp.icon size={18} className={forma === fp.value ? 'text-orange' : 'text-text-muted'} />
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
