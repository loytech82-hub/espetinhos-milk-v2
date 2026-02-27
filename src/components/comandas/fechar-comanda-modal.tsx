'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/lib/toast-context'
import { formatCurrency } from '@/lib/utils'
import { Banknote, QrCode, CreditCard, Percent, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Cliente } from '@/lib/types'

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
  { value: 'fiado', label: 'A Prazo', icon: Clock },
]

const prazosOpcoes = [
  { value: 7, label: '7 dias' },
  { value: 15, label: '15 dias' },
  { value: 30, label: '30 dias' },
]

export function FecharComandaModal({ open, onOpenChange, comandaId, subtotal, onClosed }: FecharComandaModalProps) {
  const { toast } = useToast()
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [valorRecebido, setValorRecebido] = useState('')
  const [loading, setLoading] = useState(false)
  const [descontoStr, setDescontoStr] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteId, setClienteId] = useState('')
  const [prazoDias, setPrazoDias] = useState<number | null>(null)

  // Carregar clientes ao abrir (para fiado)
  useEffect(() => {
    if (open) {
      supabase.from('clientes').select('*').order('nome').then(({ data }) => {
        if (data) setClientes(data)
      })
    }
  }, [open])

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setFormaPagamento('pix')
      setValorRecebido('')
      setDescontoStr('')
      setClienteId('')
      setPrazoDias(null)
    }
  }, [open])

  const desconto = parseFloat(descontoStr) || 0
  const totalFinal = subtotal - desconto

  const troco = formaPagamento === 'dinheiro' && valorRecebido
    ? Math.max(0, parseFloat(valorRecebido) - totalFinal)
    : 0

  const isFiado = formaPagamento === 'fiado'

  async function handleFechar() {
    if (totalFinal <= 0) {
      toast('Total deve ser maior que zero', 'error')
      return
    }

    if (isFiado && !clienteId) {
      toast('Selecione um cliente para venda a prazo', 'error')
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
      const body: Record<string, unknown> = { formaPagamento, desconto }
      if (isFiado) {
        body.clienteId = clienteId
        body.prazoDias = prazoDias
      }

      const res = await fetch(`/api/comandas/${comandaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        toast(data.error || 'Erro ao fechar comanda', 'error')
        return
      }

      toast(isFiado ? 'Venda a prazo registrada!' : 'Pagamento recebido!', 'success')
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

        {/* Opcoes de fiado */}
        {isFiado && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Cliente (obrigatorio)</label>
              <select
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
                className="w-full h-10 px-3 bg-bg-elevated border border-bg-placeholder rounded-xl text-sm text-text-white focus:outline-none focus:ring-1 focus:ring-orange/40"
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Prazo (opcional)</label>
              <div className="flex gap-2">
                {prazosOpcoes.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPrazoDias(prazoDias === p.value ? null : p.value)}
                    className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      prazoDias === p.value
                        ? 'bg-orange text-text-dark'
                        : 'bg-bg-elevated text-text-muted hover:bg-bg-placeholder'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

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
          <Button onClick={handleFechar} loading={loading} variant={isFiado ? 'primary' : 'success'}>
            {isFiado ? 'Registrar Venda a Prazo' : 'Confirmar Pagamento'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
