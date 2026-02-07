'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import type { Produto } from '@/lib/types'

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProdutos()
  }, [])

  async function loadProdutos() {
    try {
      const { data } = await supabase
        .from('produtos')
        .select('*')
        .order('nome')
      if (data) setProdutos(data)
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = produtos.filter((p) =>
    busca
      ? p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.categoria.toLowerCase().includes(busca.toLowerCase())
      : true
  )

  const estoqueBaixo = produtos.filter((p) => p.estoque <= p.estoque_minimo)

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-oswald)] text-3xl lg:text-4xl font-bold">
            PRODUTOS
          </h1>
          <p className="font-mono text-sm text-text-muted">
            // controle_de_estoque
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 h-10 px-4 bg-bg-elevated rounded-2xl">
            <Search className="w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent font-mono text-xs text-white placeholder:text-text-muted outline-none w-32"
            />
          </div>
          <button className="inline-flex items-center gap-2 h-10 px-5 bg-orange text-text-dark font-mono text-xs font-semibold rounded-2xl hover:bg-orange-hover transition-colors">
            <Plus className="w-4 h-4" />
            novo_produto
          </button>
        </div>
      </div>

      {/* Alerta estoque baixo */}
      {estoqueBaixo.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-bg-card rounded-2xl border-l-4 border-orange">
          <AlertTriangle className="w-4 h-4 text-orange shrink-0" />
          <span className="font-mono text-[13px] text-white">
            [WARNING] {estoqueBaixo.length} produto(s) com estoque_baixo
          </span>
        </div>
      )}

      {/* Tabela de produtos */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="font-mono text-text-muted">carregando...</span>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-5 h-11 px-5 bg-bg-card items-center">
            <span className="font-mono text-xs text-text-muted">produto</span>
            <span className="font-mono text-xs text-text-muted">categoria</span>
            <span className="font-mono text-xs text-text-muted">preco</span>
            <span className="font-mono text-xs text-text-muted">estoque</span>
            <span className="font-mono text-xs text-text-muted">status</span>
          </div>

          <div className="space-y-px">
            {filtered.map((produto) => (
              <div
                key={produto.id}
                className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-5 py-4 sm:h-14 bg-bg-card items-center hover:bg-bg-elevated transition-colors"
              >
                <span className="font-mono text-[13px] text-white">
                  {produto.nome}
                </span>
                <span className="font-mono text-[13px] text-text-muted">
                  {produto.categoria}
                </span>
                <span className="font-mono text-[13px] text-white">
                  {formatCurrency(produto.preco)}
                </span>
                <span
                  className={`font-mono text-[13px] ${
                    produto.estoque <= produto.estoque_minimo
                      ? 'text-orange'
                      : 'text-success'
                  }`}
                >
                  {produto.estoque} un.
                </span>
                <span
                  className={`inline-flex w-fit px-3 py-1 rounded-2xl font-mono text-[11px] ${
                    produto.ativo
                      ? 'bg-success text-text-dark'
                      : 'bg-bg-placeholder text-text-muted'
                  }`}
                >
                  {produto.ativo ? 'ATIVO' : 'INATIVO'}
                </span>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="p-10 bg-bg-card text-center">
              <span className="font-mono text-sm text-text-muted">
                nenhum_produto_encontrado
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
