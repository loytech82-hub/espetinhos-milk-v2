'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast-context'
import { formatCurrency } from '@/lib/utils'
import { receberFiadoParcial } from '@/lib/supabase-helpers'
import { Banknote, QrCode, CreditCard, CircleDollarSign, CheckCircle2 } from 'lucide-react'
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
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote, cor: 'text-success' },
  { value: 'pix', label: 'PIX', icon: QrCode, cor: 'text-[#00BDAE]' },
  { value: 'cartao_debito', label: 'Debito', icon: CreditCard, cor: 'text-blue-400' },
  { value: 'cartao_credito', label: 'Credito', icon: CreditCard, cor: 'text-purple-400' },
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

  const valorNum = parseFloat(valor) || 0
  const isParcial = valorNum > 0 && valorNum < saldoDevedor - 0.01
  const isTotal = valorNum >= saldoDevedor - 0.01

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Receber Pagamento"
      description={clienteNome ? `Cliente: ${clienteNome}` : undefined}
    >
      <div className="space-y-5">
        {/* Resumo visual da divida */}
        {comanda && (
          <div className="rounded-xl overflow-hidden">
            <div className="bg-danger/10 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="w-5 h-5 text-danger" />
                <span className="text-sm font-bold text-text-white">
                  Comanda #{comanda.numero}
                </span>
              </div>
              <span className="text-xs text-text-muted">
                Total: {formatCurrency(comanda.total)}
              </span>
            </div>

            {/* Barra de progresso */}
            {comanda.total - saldoDevedor > 0.01 && (
              <div className="bg-bg-elevated px-4 py-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-success font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ja pago: {formatCurrency(comanda.total - saldoDevedor)}
                  </span>
                  <span className="text-text-muted">
                    {((comanda.total - saldoDevedor) / comanda.total * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-bg-card rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full"
                    style={{ width: `${((comanda.total - saldoDevedor) / comanda.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="bg-bg-elevated px-4 py-3 flex items-center justify-between border-t border-bg-card">
              <span className="text-sm font-bold text-text-white">Saldo devedor</span>
              <span className="font-heading text-2xl font-bold text-danger">{formatCurrency(saldoDevedor)}</span>
            </div>
          </div>
        )}

        {/* Valor do pagamento */}
        <div className="space-y-3">
          <label className="block text-xs text-text-muted uppercase tracking-wider font-semibold">
            Valor do pagamento
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-lg">R$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={saldoDevedor}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-bg-elevated border-2 border-bg-placeholder rounded-xl text-left font-heading text-2xl font-bold text-orange outline-none focus:border-orange transition-colors"
            />
          </div>

          {/* Indicador parcial/total */}
          {valorNum > 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
              isTotal ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
            }`}>
              {isTotal ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Pagamento total — quita a divida
                </>
              ) : isParcial ? (
                <>
                  <CircleDollarSign className="w-4 h-4" />
                  Pagamento parcial — restara {formatCurrency(saldoDevedor - valorNum)}
                </>
              ) : null}
            </div>
          )}

          {/* Botoes de valor rapido */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setValor(saldoDevedor.toFixed(2))}
              className={`h-10 rounded-xl font-heading text-sm font-bold transition-colors cursor-pointer ${
                isTotal ? 'bg-success/20 text-success' : 'bg-bg-elevated text-text-muted hover:text-text-white'
              }`}
            >
              Total
            </button>
            <button
              type="button"
              onClick={() => setValor((saldoDevedor / 2).toFixed(2))}
              className="h-10 bg-bg-elevated rounded-xl font-heading text-sm font-bold text-text-muted hover:text-text-white transition-colors cursor-pointer"
            >
              Metade
            </button>
            <button
              type="button"
              onClick={() => setValor((saldoDevedor / 3).toFixed(2))}
              className="h-10 bg-bg-elevated rounded-xl font-heading text-sm font-bold text-text-muted hover:text-text-white transition-colors cursor-pointer"
            >
              1/3
            </button>
          </div>
        </div>

        {/* Forma de pagamento */}
        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">
            Forma de pagamento
          </label>
          <div className="grid grid-cols-2 gap-2">
            {formasRecebimento.map(fp => (
              <button
                key={fp.value}
                type="button"
                onClick={() => setForma(fp.value)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  forma === fp.value
                    ? 'border-orange bg-orange/10'
                    : 'border-bg-placeholder bg-bg-elevated hover:border-bg-placeholder/80'
                }`}
              >
                <fp.icon size={20} className={forma === fp.value ? 'text-orange' : fp.cor} />
                <span className={`font-heading text-sm font-bold ${forma === fp.value ? 'text-orange' : 'text-text-white'}`}>
                  {fp.label}
                </span>
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
