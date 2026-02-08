'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { abrirTurno } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'

interface AbrirTurnoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function AbrirTurnoModal({ open, onOpenChange, onCreated }: AbrirTurnoModalProps) {
  const { toast } = useToast()
  const [valorAbertura, setValorAbertura] = useState('')
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setValorAbertura('')
      setObservacao('')
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const valor = parseFloat(valorAbertura)
    if (isNaN(valor) || valor < 0) {
      toast('Informe o valor de abertura', 'error')
      return
    }

    setLoading(true)
    try {
      await abrirTurno(valor, observacao || undefined)
      toast('Caixa aberto com sucesso!', 'success')
      onOpenChange(false)
      onCreated()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Abrir Caixa" description="Informe o valor inicial do caixa">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Valor de Abertura (R$)"
          type="number"
          step="0.01"
          min="0"
          value={valorAbertura}
          onChange={e => setValorAbertura(e.target.value)}
          placeholder="0.00"
          autoFocus
        />

        <Input
          label="Observacao (opcional)"
          value={observacao}
          onChange={e => setObservacao(e.target.value)}
          placeholder="Ex: Troco inicial..."
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} variant="success">
            Abrir Caixa
          </Button>
        </div>
      </form>
    </Modal>
  )
}
