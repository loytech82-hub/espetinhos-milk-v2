'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ajusteEstoque } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import type { Produto } from '@/lib/types'

interface AjusteEstoqueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  produtos: Produto[]
  onCreated: () => void
}

export function AjusteEstoqueModal({ open, onOpenChange, produtos, onCreated }: AjusteEstoqueModalProps) {
  const { toast } = useToast()
  const [produtoId, setProdutoId] = useState('')
  const [novaQuantidade, setNovaQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setProdutoId('')
      setNovaQuantidade('')
      setMotivo('')
    }
  }, [open])

  const produtoSelecionado = produtos.find(p => String(p.id) === produtoId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!produtoId) { toast('Selecione um produto', 'error'); return }
    const qtd = parseInt(novaQuantidade)
    if (isNaN(qtd) || qtd < 0) { toast('Informe uma quantidade valida', 'error'); return }
    if (!motivo.trim()) { toast('O motivo e obrigatorio para ajustes', 'error'); return }

    setLoading(true)
    try {
      await ajusteEstoque(produtoId, qtd, motivo.trim())
      toast('Estoque ajustado com sucesso!', 'success')
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
    <Modal open={open} onOpenChange={onOpenChange} title="Ajuste de Estoque" description="Corrija a quantidade de um produto">
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

        {produtoSelecionado && (
          <div className="p-3 bg-bg-elevated rounded-lg">
            <p className="text-xs text-text-muted">Estoque atual</p>
            <p className="font-heading font-bold text-text-white">{produtoSelecionado.estoque_atual || 0} unidades</p>
            <p className="text-xs text-text-muted mt-1">Minimo: {produtoSelecionado.estoque_minimo}</p>
          </div>
        )}

        <Input
          label="Nova Quantidade"
          type="number"
          min="0"
          value={novaQuantidade}
          onChange={e => setNovaQuantidade(e.target.value)}
          placeholder="Ex: 10"
          autoFocus
        />

        <Input
          label="Motivo (obrigatorio)"
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          placeholder="Ex: Contagem fisica, Quebra, Vencimento..."
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} variant="primary">
            Ajustar Estoque
          </Button>
        </div>
      </form>
    </Modal>
  )
}
