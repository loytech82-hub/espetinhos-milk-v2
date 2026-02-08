'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { entradaEstoque } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import type { Produto } from '@/lib/types'

interface EntradaEstoqueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  produtos: Produto[]
  onCreated: () => void
}

export function EntradaEstoqueModal({ open, onOpenChange, produtos, onCreated }: EntradaEstoqueModalProps) {
  const { toast } = useToast()
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setProdutoId('')
      setQuantidade('')
      setMotivo('')
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!produtoId) { toast('Selecione um produto', 'error'); return }
    const qtd = parseInt(quantidade)
    if (isNaN(qtd) || qtd <= 0) { toast('Informe uma quantidade valida', 'error'); return }

    setLoading(true)
    try {
      await entradaEstoque(produtoId, qtd, motivo || undefined)
      toast('Entrada de estoque registrada!', 'success')
      onOpenChange(false)
      onCreated()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const produtosAtivos = produtos.filter(p => p.ativo)

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Entrada de Estoque" description="Registre a entrada de mercadoria">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Produto"
          placeholder="Selecione o produto..."
          options={produtosAtivos.map(p => ({
            value: String(p.id),
            label: `${p.nome} (atual: ${p.estoque_atual || 0})`,
          }))}
          value={produtoId}
          onChange={e => setProdutoId(e.target.value)}
        />

        <Input
          label="Quantidade"
          type="number"
          min="1"
          value={quantidade}
          onChange={e => setQuantidade(e.target.value)}
          placeholder="Ex: 24"
          autoFocus
        />

        <Input
          label="Motivo (opcional)"
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          placeholder="Ex: Compra fornecedor, Reposicao..."
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} variant="success">
            Registrar Entrada
          </Button>
        </div>
      </form>
    </Modal>
  )
}
