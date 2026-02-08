'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fecharTurno } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import { formatCurrency } from '@/lib/utils'
import type { CaixaTurno } from '@/lib/types'

interface FecharTurnoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turno: CaixaTurno | null
  entradas: number
  saidas: number
  onClosed: () => void
}

export function FecharTurnoModal({ open, onOpenChange, turno, entradas, saidas, onClosed }: FecharTurnoModalProps) {
  const { toast } = useToast()
  const [valorFechamento, setValorFechamento] = useState('')
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)

  const saldoEsperado = (turno?.valor_abertura || 0) + entradas - saidas

  useEffect(() => {
    if (!open) {
      setValorFechamento('')
      setObservacao('')
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!turno) return

    const valor = parseFloat(valorFechamento)
    if (isNaN(valor) || valor < 0) {
      toast('Informe o valor de fechamento', 'error')
      return
    }

    setLoading(true)
    try {
      await fecharTurno(turno.id, valor, observacao || undefined)
      toast('Caixa fechado com sucesso!', 'success')
      onOpenChange(false)
      onClosed()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const diferenca = parseFloat(valorFechamento || '0') - saldoEsperado

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Fechar Caixa" description="Confira os valores e informe o valor em caixa">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Resumo do turno */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-bg-elevated rounded-lg">
            <p className="text-xs text-text-muted">Abertura</p>
            <p className="font-heading font-bold text-text-white">{formatCurrency(turno?.valor_abertura || 0)}</p>
          </div>
          <div className="p-3 bg-bg-elevated rounded-lg">
            <p className="text-xs text-text-muted">Saldo Esperado</p>
            <p className="font-heading font-bold text-orange">{formatCurrency(saldoEsperado)}</p>
          </div>
          <div className="p-3 bg-bg-elevated rounded-lg">
            <p className="text-xs text-success text-text-muted">Entradas</p>
            <p className="font-heading font-bold text-success">{formatCurrency(entradas)}</p>
          </div>
          <div className="p-3 bg-bg-elevated rounded-lg">
            <p className="text-xs text-danger text-text-muted">Saidas</p>
            <p className="font-heading font-bold text-danger">{formatCurrency(saidas)}</p>
          </div>
        </div>

        <Input
          label="Valor em Caixa (R$)"
          type="number"
          step="0.01"
          min="0"
          value={valorFechamento}
          onChange={e => setValorFechamento(e.target.value)}
          placeholder="Conte o dinheiro e informe..."
          autoFocus
        />

        {valorFechamento && (
          <div className={`p-3 rounded-lg text-sm font-mono ${diferenca === 0 ? 'bg-success/10 text-success' : diferenca > 0 ? 'bg-orange/10 text-orange' : 'bg-danger/10 text-danger'}`}>
            {diferenca === 0
              ? 'Caixa conferido - sem diferenca'
              : diferenca > 0
                ? `Sobra de ${formatCurrency(diferenca)}`
                : `Falta de ${formatCurrency(Math.abs(diferenca))}`
            }
          </div>
        )}

        <Input
          label="Observacao (opcional)"
          value={observacao}
          onChange={e => setObservacao(e.target.value)}
          placeholder="Ex: Turno tranquilo..."
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} variant="danger">
            Fechar Caixa
          </Button>
        </div>
      </form>
    </Modal>
  )
}
