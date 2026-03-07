'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { addItemToClienteDebt } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import { formatCurrency } from '@/lib/utils'
import type { Produto } from '@/lib/types'
import { Search, Minus, Plus, Package, Trash2 } from 'lucide-react'

interface AddProdutoFiadoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clienteId: string
  clienteNome: string
  onAdded: () => void
}

interface ItemCarrinho {
  produto: Produto
  quantidade: number
}

export function AddProdutoFiadoModal({ open, onOpenChange, clienteId, clienteNome, onAdded }: AddProdutoFiadoModalProps) {
  const { toast } = useToast()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('categoria')
        .order('nome')
        .then(({ data }) => {
          if (data) setProdutos(data)
        })
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setBusca('')
      setCarrinho([])
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!busca.trim()) return produtos
    const s = busca.toLowerCase()
    return produtos.filter(p =>
      p.nome.toLowerCase().includes(s) || p.categoria.toLowerCase().includes(s)
    )
  }, [produtos, busca])

  const grouped = useMemo(() => {
    const map = new Map<string, Produto[]>()
    filtered.forEach(p => {
      const cat = p.categoria || 'Outros'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(p)
    })
    return map
  }, [filtered])

  const totalCarrinho = useMemo(() =>
    carrinho.reduce((acc, item) => acc + item.produto.preco * item.quantidade, 0),
    [carrinho]
  )

  function addToCarrinho(produto: Produto) {
    setCarrinho(prev => {
      const existing = prev.find(i => i.produto.id === produto.id)
      if (existing) {
        return prev.map(i =>
          i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
        )
      }
      return [...prev, { produto, quantidade: 1 }]
    })
  }

  function updateQty(produtoId: string, delta: number) {
    setCarrinho(prev =>
      prev.map(i => {
        if (i.produto.id !== produtoId) return i
        const novaQty = i.quantidade + delta
        return novaQty > 0 ? { ...i, quantidade: novaQty } : i
      })
    )
  }

  function removeFromCarrinho(produtoId: string) {
    setCarrinho(prev => prev.filter(i => i.produto.id !== produtoId))
  }

  async function handleConfirm() {
    if (carrinho.length === 0) {
      toast('Adicione pelo menos um produto', 'error')
      return
    }

    setLoading(true)
    try {
      await addItemToClienteDebt(
        clienteId,
        clienteNome,
        carrinho.map(i => ({ produtoId: i.produto.id, quantidade: i.quantidade }))
      )
      toast('Produtos adicionados a divida!', 'success')
      onOpenChange(false)
      onAdded()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Adicionar a divida de ${clienteNome}`} maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Carrinho */}
        {carrinho.length > 0 && (
          <div className="p-4 bg-bg-elevated rounded-xl space-y-2">
            <span className="text-xs text-text-muted font-semibold">CARRINHO</span>
            {carrinho.map(item => (
              <div key={item.produto.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => updateQty(item.produto.id, -1)} className="w-6 h-6 flex items-center justify-center rounded bg-bg-card hover:bg-bg-placeholder transition-colors cursor-pointer">
                      <Minus size={12} />
                    </button>
                    <span className="font-heading text-sm font-bold w-6 text-center">{item.quantidade}</span>
                    <button type="button" onClick={() => updateQty(item.produto.id, 1)} className="w-6 h-6 flex items-center justify-center rounded bg-bg-card hover:bg-bg-placeholder transition-colors cursor-pointer">
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="text-sm text-text-white">{item.produto.nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-bold text-orange">{formatCurrency(item.produto.preco * item.quantidade)}</span>
                  <button type="button" onClick={() => removeFromCarrinho(item.produto.id)} className="text-text-muted hover:text-danger transition-colors cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-sm font-semibold text-text-white">Total</span>
              <span className="font-heading text-lg font-bold text-danger">{formatCurrency(totalCarrinho)}</span>
            </div>
          </div>
        )}

        {/* Busca */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full bg-bg-elevated border border-bg-placeholder rounded-lg pl-10 pr-4 py-2.5 text-text-white placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-orange/50"
          />
        </div>

        {/* Lista de produtos */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto -mx-1 px-1">
          {Array.from(grouped.entries()).map(([categoria, prods]) => (
            <div key={categoria}>
              <h3 className="font-heading text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">
                {categoria}
              </h3>
              <div className="space-y-1">
                {prods.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCarrinho(p)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-bg-elevated hover:bg-bg-placeholder transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {p.foto_url ? (
                        <img src={p.foto_url} alt={p.nome} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-bg-placeholder flex items-center justify-center shrink-0">
                          <Package size={14} className="text-text-muted" />
                        </div>
                      )}
                      <span className="text-sm text-text-white font-medium">{p.nome}</span>
                    </div>
                    <span className="font-heading font-bold text-orange text-sm">{formatCurrency(p.preco)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-text-muted text-sm">Nenhum produto encontrado</div>
          )}
        </div>

        {/* Botoes */}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} loading={loading} disabled={carrinho.length === 0}>
            Confirmar ({formatCurrency(totalCarrinho)})
          </Button>
        </div>
      </div>
    </Modal>
  )
}
