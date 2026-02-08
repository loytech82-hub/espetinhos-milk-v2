'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { addItemToComanda } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import { formatCurrency } from '@/lib/utils'
import type { Produto } from '@/lib/types'
import { Search, Minus, Plus, Package } from 'lucide-react'

interface AddItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comandaId: string
  onItemAdded: () => void
}

export function AddItemModal({ open, onOpenChange, comandaId, onItemAdded }: AddItemModalProps) {
  const { toast } = useToast()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [quantidade, setQuantidade] = useState(1)
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)

  // Carregar produtos ativos
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

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setBusca('')
      setProdutoSelecionado(null)
      setQuantidade(1)
      setObservacao('')
    }
  }, [open])

  // Filtrar produtos pela busca
  const filtered = useMemo(() => {
    if (!busca.trim()) return produtos
    const s = busca.toLowerCase()
    return produtos.filter(p =>
      p.nome.toLowerCase().includes(s) || p.categoria.toLowerCase().includes(s)
    )
  }, [produtos, busca])

  // Agrupar por categoria
  const grouped = useMemo(() => {
    const map = new Map<string, Produto[]>()
    filtered.forEach(p => {
      const cat = p.categoria || 'Outros'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(p)
    })
    return map
  }, [filtered])

  async function handleAdd() {
    if (!produtoSelecionado) return

    setLoading(true)
    try {
      await addItemToComanda(comandaId, produtoSelecionado.id, quantidade, observacao || null)
      toast(`${produtoSelecionado.nome} adicionado!`, 'success')
      // Permitir adicionar outro item sem fechar
      setProdutoSelecionado(null)
      setQuantidade(1)
      setObservacao('')
      onItemAdded()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="O que vai no pedido?" maxWidth="max-w-2xl">
      {!produtoSelecionado ? (
        // Tela de busca de produtos
        <div className="space-y-4">
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

          <div className="space-y-3 -mx-1 px-1 pb-40 lg:pb-0">
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
                      onClick={() => setProdutoSelecionado(p)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-bg-elevated hover:bg-bg-placeholder transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {p.foto_url ? (
                          <img src={p.foto_url} alt={p.nome} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-bg-placeholder flex items-center justify-center shrink-0">
                            <Package size={16} className="text-text-muted" />
                          </div>
                        )}
                        <div>
                          <span className="text-sm text-text-white font-medium">{p.nome}</span>
                          <span className="text-xs text-text-muted block">Estoque: {p.estoque_atual || 0}</span>
                        </div>
                      </div>
                      <span className="font-heading font-bold text-orange">{formatCurrency(p.preco)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-8 text-text-muted text-sm">
                Nenhum produto encontrado
              </div>
            )}
          </div>

          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Fechar
          </Button>
        </div>
      ) : (
        // Tela de quantidade/observacao
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-4 bg-bg-elevated rounded-xl">
            <div className="flex-1">
              <h3 className="font-heading text-lg font-bold text-text-white">{produtoSelecionado.nome}</h3>
              <p className="text-sm text-text-muted">{produtoSelecionado.categoria} · Estoque: {produtoSelecionado.estoque_atual || 0}</p>
            </div>
            <span className="font-heading text-xl font-bold text-orange">
              {formatCurrency(produtoSelecionado.preco)}
            </span>
          </div>

          {/* Controle de quantidade */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-muted">Quantidade</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-elevated hover:bg-bg-placeholder transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="font-heading text-2xl font-bold w-12 text-center">{quantidade}</span>
              <button
                type="button"
                onClick={() => {
                  const max = produtoSelecionado.controlar_estoque ? (produtoSelecionado.estoque_atual ?? 0) : 999
                  setQuantidade(Math.min(max, quantidade + 1))
                }}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-elevated hover:bg-bg-placeholder transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <Input
            label="Alguma obs?"
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            placeholder="Ex: sem cebola, bem passado..."
          />

          {/* Subtotal */}
          <div className="flex items-center justify-between p-4 bg-bg-elevated rounded-xl">
            <span className="text-sm text-text-muted">Subtotal</span>
            <span className="font-heading text-2xl font-bold text-orange">
              {formatCurrency(produtoSelecionado.preco * quantidade)}
            </span>
          </div>

          {/* Botoes */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setProdutoSelecionado(null)}>
              Voltar
            </Button>
            <Button onClick={handleAdd} loading={loading}>
              Adicionar ({quantidade}x)
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
