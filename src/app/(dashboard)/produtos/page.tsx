'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, AlertTriangle, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { toggleProdutoAtivo } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ProdutoModal } from '@/components/produtos/produto-modal'
import type { Produto } from '@/lib/types'

export default function ProdutosPage() {
  const { toast } = useToast()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduto, setEditProduto] = useState<Produto | null>(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas')

  useEffect(() => {
    loadProdutos()
  }, [])

  async function loadProdutos() {
    try {
      const { data } = await supabase
        .from('produtos')
        .select('*')
        .order('categoria')
        .order('nome')
      if (data) setProdutos(data)
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const categorias = ['todas', ...Array.from(new Set(produtos.map(p => p.categoria)))]

  const filtered = produtos.filter((p) => {
    if (categoriaFiltro !== 'todas' && p.categoria !== categoriaFiltro) return false
    if (busca) {
      const s = busca.toLowerCase()
      return p.nome.toLowerCase().includes(s) || p.categoria.toLowerCase().includes(s)
    }
    return true
  })

  const estoqueBaixo = produtos.filter((p) => (p.estoque_atual || 0) <= p.estoque_minimo && p.ativo)

  async function handleToggleAtivo(produto: Produto) {
    try {
      await toggleProdutoAtivo(produto.id, !produto.ativo)
      toast(produto.ativo ? 'Produto desativado' : 'Produto ativado', 'success')
      loadProdutos()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    }
  }

  function handleEdit(produto: Produto) {
    setEditProduto(produto)
    setModalOpen(true)
  }

  function handleNew() {
    setEditProduto(null)
    setModalOpen(true)
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold">CARDAPIO</h1>
          <p className="text-sm text-text-muted">Seu cardapio</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 h-10 px-4 bg-bg-elevated rounded-2xl">
            <Search className="w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent text-xs text-text-white placeholder:text-text-muted outline-none w-32"
            />
          </div>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 h-10 px-5 bg-orange text-text-dark font-heading text-sm font-semibold rounded-2xl hover:bg-orange-hover transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>
      </div>

      {estoqueBaixo.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-2xl border border-warning/30">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span className="text-sm text-text-white">
            <strong>{estoqueBaixo.length}</strong> produto(s) com estoque baixo
          </span>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoriaFiltro(cat)}
            className={`h-9 px-4 rounded-2xl font-heading text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              categoriaFiltro === cat
                ? 'bg-orange text-text-dark'
                : 'bg-bg-elevated text-text-white hover:bg-bg-placeholder'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-text-muted">carregando...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto encontrado"
          description="Adicione produtos ao cardapio"
        />
      ) : (
        <div className="rounded-2xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-5 h-11 px-5 bg-bg-card items-center">
            <span className="text-xs text-text-muted">Produto</span>
            <span className="text-xs text-text-muted">Categoria</span>
            <span className="text-xs text-text-muted">Preco</span>
            <span className="text-xs text-text-muted">Estoque</span>
            <span className="text-xs text-text-muted">Status</span>
          </div>

          <div className="space-y-px">
            {filtered.map((produto) => (
              <div
                key={produto.id}
                onClick={() => handleEdit(produto)}
                className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-5 py-4 sm:h-14 bg-bg-card items-center hover:bg-bg-elevated transition-colors cursor-pointer"
              >
                <span className="text-[13px] text-text-white font-medium">
                  {produto.nome}
                </span>
                <span className="text-[13px] text-text-muted">
                  {produto.categoria}
                </span>
                <span className="font-heading text-[13px] text-text-white font-bold">
                  {formatCurrency(produto.preco)}
                </span>
                <div>
                  <StatusBadge
                    variant={(produto.estoque_atual || 0) <= produto.estoque_minimo ? 'warning' : 'success'}
                    dot
                  >
                    {produto.estoque_atual || 0} un.
                  </StatusBadge>
                </div>
                <div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleAtivo(produto) }}
                    className="cursor-pointer"
                  >
                    <StatusBadge variant={produto.ativo ? 'success' : 'muted'}>
                      {produto.ativo ? 'Ativo' : 'Inativo'}
                    </StatusBadge>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProdutoModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditProduto(null) }}
        produto={editProduto}
        onSaved={loadProdutos}
      />
    </div>
  )
}
