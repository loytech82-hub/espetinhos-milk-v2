'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { createCaixaMovimento } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

interface NovoMovimentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function NovoMovimentoModal({ open, onOpenChange, onCreated }: NovoMovimentoModalProps) {
  const { toast } = useToast()
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('dinheiro')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setTipo('entrada')
      setValor('')
      setDescricao('')
      setFormaPagamento('dinheiro')
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!valor || parseFloat(valor) <= 0) { toast('Informe um valor valido', 'error'); return }
    if (!descricao.trim()) { toast('Informe a descricao', 'error'); return }

    setLoading(true)
    try {
      await createCaixaMovimento({
        tipo,
        valor: parseFloat(valor),
        descricao: descricao.trim(),
        forma_pagamento: formaPagamento,
      })
      toast(`${tipo === 'entrada' ? 'Entrada' : 'Saida'} registrada!`, 'success')
      onOpenChange(false)
      onCreated()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Novo Movimento" description="Registre uma entrada ou saida no caixa">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTipo('entrada')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              tipo === 'entrada'
                ? 'border-success bg-success/10'
                : 'border-bg-placeholder bg-bg-elevated'
            }`}
          >
            <ArrowUpCircle size={20} className={tipo === 'entrada' ? 'text-success' : 'text-text-muted'} />
            <span className="font-heading text-sm font-semibold">Entrada</span>
          </button>
          <button
            type="button"
            onClick={() => setTipo('saida')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              tipo === 'saida'
                ? 'border-danger bg-danger/10'
                : 'border-bg-placeholder bg-bg-elevated'
            }`}
          >
            <ArrowDownCircle size={20} className={tipo === 'saida' ? 'text-danger' : 'text-text-muted'} />
            <span className="font-heading text-sm font-semibold">Saida</span>
          </button>
        </div>

        <Input
          label="Valor (R$)"
          type="number"
          step="0.01"
          min="0.01"
          value={valor}
          onChange={e => setValor(e.target.value)}
          placeholder="0.00"
          autoFocus
        />

        <Input
          label="Descricao"
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          placeholder="Ex: Compra de carvao, Pagamento fornecedor..."
        />

        <Select
          label="Forma de Pagamento"
          options={[
            { value: 'dinheiro', label: 'Dinheiro' },
            { value: 'pix', label: 'PIX' },
            { value: 'cartao_debito', label: 'Cartao Debito' },
            { value: 'cartao_credito', label: 'Cartao Credito' },
          ]}
          value={formaPagamento}
          onChange={e => setFormaPagamento(e.target.value)}
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} variant={tipo === 'entrada' ? 'success' : 'danger'}>
            Registrar {tipo === 'entrada' ? 'Entrada' : 'Saida'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
