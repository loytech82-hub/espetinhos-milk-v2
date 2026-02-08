'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { createProduto, updateProduto } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import type { Produto } from '@/lib/types'

interface ProdutoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  produto?: Produto | null
  onSaved: () => void
}

const categorias = [
  { value: 'espetinhos', label: 'Espetinhos' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'acompanhamentos', label: 'Acompanhamentos' },
  { value: 'sobremesas', label: 'Sobremesas' },
  { value: 'combos', label: 'Combos' },
  { value: 'outros', label: 'Outros' },
]

export function ProdutoModal({ open, onOpenChange, produto, onSaved }: ProdutoModalProps) {
  const { toast } = useToast()
  const isEdit = !!produto
  const [loading, setLoading] = useState(false)

  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')
  const [categoria, setCategoria] = useState('espetinhos')
  const [estoque, setEstoque] = useState('')
  const [estoqueMinimo, setEstoqueMinimo] = useState('5')

  // Preencher com dados do produto ao editar
  useEffect(() => {
    if (produto) {
      setNome(produto.nome)
      setPreco(String(produto.preco))
      setCategoria(produto.categoria)
      setEstoque(String(produto.estoque_atual || 0))
      setEstoqueMinimo(String(produto.estoque_minimo))
    } else {
      setNome('')
      setPreco('')
      setCategoria('espetinhos')
      setEstoque('')
      setEstoqueMinimo('5')
    }
  }, [produto, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!nome.trim()) { toast('Informe o nome do produto', 'error'); return }
    if (!preco || parseFloat(preco) <= 0) { toast('Informe um preco valido', 'error'); return }
    if (!estoque || parseInt(estoque) < 0) { toast('Informe o estoque', 'error'); return }

    setLoading(true)
    try {
      const data = {
        nome: nome.trim(),
        preco: parseFloat(preco),
        categoria,
        estoque_atual: parseInt(estoque),
        estoque_minimo: parseInt(estoqueMinimo) || 5,
        controlar_estoque: true,
        ativo: true,
      }

      if (isEdit && produto) {
        await updateProduto(produto.id, data)
        toast('Produto atualizado!', 'success')
      } else {
        await createProduto(data)
        toast('Produto criado!', 'success')
      }
      onOpenChange(false)
      onSaved()
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
      title={isEdit ? 'Editar Produto' : 'Novo Produto'}
      description={isEdit ? 'Atualize as informacoes do produto' : 'Preencha os dados do novo produto'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome do Produto"
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Ex: Espetinho de Picanha"
          autoFocus
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Preco (R$)"
            type="number"
            step="0.01"
            min="0.01"
            value={preco}
            onChange={e => setPreco(e.target.value)}
            placeholder="0.00"
          />
          <Select
            label="Categoria"
            options={categorias}
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Estoque"
            type="number"
            min="0"
            value={estoque}
            onChange={e => setEstoque(e.target.value)}
            placeholder="0"
          />
          <Input
            label="Estoque Minimo"
            type="number"
            min="0"
            value={estoqueMinimo}
            onChange={e => setEstoqueMinimo(e.target.value)}
            placeholder="5"
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Salvar' : 'Criar Produto'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
