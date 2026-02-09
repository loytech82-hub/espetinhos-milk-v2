'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, AlertTriangle, Package, ArrowUpCircle, Sliders } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { toggleProdutoAtivo } from '@/lib/supabase-helpers'
import { useToast } from '@/lib/toast-context'
import { useAuth } from '@/lib/auth-context'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { AccessDenied } from '@/components/ui/access-denied'
import { Button } from '@/components/ui/button'
import { ProdutoModal } from '@/components/produtos/produto-modal'
import { EntradaEstoqueModal } from '@/components/estoque/entrada-estoque-modal'
import { AjusteEstoqueModal } from '@/components/estoque/ajuste-estoque-modal'
import type { Produto } from '@/lib/types'

export default function ProdutosPage() {
  const { toast } = useToast()
  const { role } = useAuth()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduto, setEditProduto] = useState<Produto | null>(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas')
  const [entradaOpen, setEntradaOpen] = useState(false)
  const [ajusteOpen, setAjusteOpen] = useState(false)

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
  const totalItens = produtos.reduce((acc, p) => acc + (p.estoque_atual || 0), 0)
  const valorEstoque = produtos.reduce((acc, p) => acc + (p.preco * (p.estoque_atual || 0)), 0)

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

  if (role !== 'admin') return <AccessDenied />

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold">PRODUTOS</h1>
          <p className="text-sm text-text-muted">Cadastro e estoque dos seus produtos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <Button onClick={() => setEntradaOpen(true)} variant="success" className="h-10 text-sm">
            <ArrowUpCircle className="w-4 h-4" />
            Entrada
          </Button>
          <Button onClick={() => setAjusteOpen(true)} variant="secondary" className="h-10 text-sm">
            <Sliders className="w-4 h-4" />
            Ajuste
          </Button>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 h-10 px-5 bg-orange text-text-dark font-heading text-sm font-semibold rounded-2xl hover:bg-orange-hover transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Resumo rapido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1 p-4 bg-bg-card rounded-2xl">
          <span className="text-[10px] text-text-muted uppercase tracking-wider">Produtos</span>
          <span className="font-heading text-2xl font-bold">{produtos.length}</span>
        </div>
        <div className="flex flex-col gap-1 p-4 bg-bg-card rounded-2xl">
          <span className="text-[10px] text-text-muted uppercase tracking-wider">Estoque Baixo</span>
          <span className="font-heading text-2xl font-bold text-danger">{estoqueBaixo.length}</span>
        </div>
        <div className="flex flex-col gap-1 p-4 bg-bg-card rounded-2xl">
          <span className="text-[10px] text-text-muted uppercase tracking-wider">Itens Totais</span>
          <span className="font-heading text-2xl font-bold">{totalItens}</span>
        </div>
        <div className="flex flex-col gap-1 p-4 bg-bg-card rounded-2xl">
          <span className="text-[10px] text-text-muted uppercase tracking-wider">Valor Estoque</span>
          <span className="font-heading text-2xl font-bold text-orange">{formatCurrency(valorEstoque)}</span>
        </div>
      </div>

      {/* Alerta de estoque baixo */}
      {estoqueBaixo.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-2xl border border-warning/30">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div>
            <span className="text-sm text-text-white font-medium">Estoque baixo: </span>
            <span className="text-sm text-text-muted">
              {estoqueBaixo.map(p => `${p.nome} (${p.estoque_atual || 0})`).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Filtro de categorias */}
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

      {/* Lista de produtos */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-text-muted">carregando...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto cadastrado"
          description="Clique em 'Novo Produto' para comecar a cadastrar"
        />
      ) : (
        <div className="rounded-2xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-6 h-11 px-5 bg-bg-card items-center">
            <span className="text-xs text-text-muted col-span-2">Produto</span>
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
                className="grid grid-cols-2 sm:grid-cols-6 gap-2 px-5 py-4 sm:h-14 bg-bg-card items-center hover:bg-bg-elevated transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 col-span-2">
                  {produto.foto_url ? (
                    <img src={produto.foto_url} alt={produto.nome} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
                      <Package size={16} className="text-text-muted" />
                    </div>
                  )}
                  <span className="text-[13px] text-text-white font-medium">
                    {produto.nome}
                  </span>
                </div>
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

      {/* Modais */}
      <ProdutoModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditProduto(null) }}
        produto={editProduto}
        onSaved={loadProdutos}
      />
      <EntradaEstoqueModal open={entradaOpen} onOpenChange={setEntradaOpen} produtos={produtos} onCreated={loadProdutos} />
      <AjusteEstoqueModal open={ajusteOpen} onOpenChange={setAjusteOpen} produtos={produtos} onCreated={loadProdutos} />
    </div>
  )
}
