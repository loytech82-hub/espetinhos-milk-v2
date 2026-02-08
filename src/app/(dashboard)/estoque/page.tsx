'use client'

import { useEffect, useState } from 'react'
import { Plus, AlertTriangle, ArrowUpCircle, ArrowDownCircle, RotateCcw, Package, Sliders } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { getMovimentosEstoque, getProdutosEstoqueBaixo } from '@/lib/supabase-helpers'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { EntradaEstoqueModal } from '@/components/estoque/entrada-estoque-modal'
import { AjusteEstoqueModal } from '@/components/estoque/ajuste-estoque-modal'
import { useAuth } from '@/lib/auth-context'
import { AccessDenied } from '@/components/ui/access-denied'
import type { Produto, EstoqueMovimento } from '@/lib/types'

// Cores e icones por tipo de movimentacao
const tipoConfig: Record<string, { cor: string; icone: typeof ArrowUpCircle; label: string }> = {
  entrada: { cor: 'text-success', icone: ArrowUpCircle, label: 'Entrada' },
  saida: { cor: 'text-danger', icone: ArrowDownCircle, label: 'Saida' },
  venda: { cor: 'text-orange', icone: ArrowDownCircle, label: 'Venda' },
  cancelamento: { cor: 'text-info', icone: RotateCcw, label: 'Cancelamento' },
  ajuste: { cor: 'text-warning', icone: Sliders, label: 'Ajuste' },
}

export default function EstoquePage() {
  const { role } = useAuth()
  const [movimentos, setMovimentos] = useState<EstoqueMovimento[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtosBaixo, setProdutosBaixo] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [entradaOpen, setEntradaOpen] = useState(false)
  const [ajusteOpen, setAjusteOpen] = useState(false)

  useEffect(() => {
    loadEstoque()
  }, [filtroTipo])

  async function loadEstoque() {
    try {
      // Carregar movimentacoes
      const filtros: { tipo?: string } = {}
      if (filtroTipo) filtros.tipo = filtroTipo
      const movs = await getMovimentosEstoque(filtros)
      setMovimentos(movs)

      // Carregar produtos e estoque baixo
      const { data: prods } = await supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (prods) setProdutos(prods as Produto[])

      const baixo = await getProdutosEstoqueBaixo()
      setProdutosBaixo(baixo)
    } catch (error) {
      console.error('Erro ao carregar estoque:', error)
    } finally {
      setLoading(false)
    }
  }

  // Admin e caixa podem acessar
  if (role === 'garcom') return <AccessDenied message="Garcons nao tem acesso ao estoque" />

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold">ESTOQUE</h1>
          <p className="font-mono text-sm text-text-muted">// controle_de_estoque</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setEntradaOpen(true)} variant="success">
            <Plus className="w-4 h-4" />
            Entrada
          </Button>
          <Button onClick={() => setAjusteOpen(true)} variant="secondary">
            <Sliders className="w-4 h-4" />
            Ajuste
          </Button>
        </div>
      </div>

      {/* Alerta de estoque baixo */}
      {produtosBaixo.length > 0 && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-danger" />
            <span className="font-heading font-semibold text-danger">
              {produtosBaixo.length} produto{produtosBaixo.length > 1 ? 's' : ''} com estoque baixo
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {produtosBaixo.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2 p-3 bg-bg-card rounded-xl">
                <div>
                  <p className="text-sm font-medium text-text-white">{p.nome}</p>
                  <p className="text-xs text-text-muted">{p.categoria}</p>
                </div>
                <div className="text-right">
                  <p className="font-heading font-bold text-danger">{p.estoque_atual || 0}</p>
                  <p className="text-[10px] text-text-muted">min: {p.estoque_minimo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo rapido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex flex-col gap-2 p-4 bg-bg-card rounded-2xl">
          <span className="font-mono text-xs text-text-muted">PRODUTOS_ATIVOS</span>
          <span className="font-heading text-2xl font-bold">{produtos.length}</span>
        </div>
        <div className="flex flex-col gap-2 p-4 bg-bg-card rounded-2xl">
          <span className="font-mono text-xs text-text-muted">ESTOQUE_BAIXO</span>
          <span className="font-heading text-2xl font-bold text-danger">{produtosBaixo.length}</span>
        </div>
        <div className="flex flex-col gap-2 p-4 bg-bg-card rounded-2xl">
          <span className="font-mono text-xs text-text-muted">ITENS_TOTAIS</span>
          <span className="font-heading text-2xl font-bold">
            {produtos.reduce((acc, p) => acc + (p.estoque_atual || 0), 0)}
          </span>
        </div>
        <div className="flex flex-col gap-2 p-4 bg-bg-card rounded-2xl">
          <span className="font-mono text-xs text-text-muted">VALOR_ESTOQUE</span>
          <span className="font-heading text-2xl font-bold text-orange">
            {formatCurrency(produtos.reduce((acc, p) => acc + (p.preco * (p.estoque_atual || 0)), 0))}
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <h2 className="font-heading text-xl font-semibold flex-1">MOVIMENTACOES</h2>
        <div className="w-48">
          <Select
            options={[
              { value: '', label: 'Todos' },
              { value: 'entrada', label: 'Entradas' },
              { value: 'saida', label: 'Saidas' },
              { value: 'venda', label: 'Vendas' },
              { value: 'ajuste', label: 'Ajustes' },
              { value: 'cancelamento', label: 'Cancelamentos' },
            ]}
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de movimentacoes */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="font-mono text-text-muted">carregando...</span>
        </div>
      ) : movimentos.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhuma movimentacao"
          description="As movimentacoes de estoque aparecerao aqui"
        />
      ) : (
        <div className="rounded-2xl overflow-hidden space-y-px">
          {movimentos.map(mov => {
            const config = tipoConfig[mov.tipo] || tipoConfig.entrada
            const Icon = config.icone
            return (
              <div key={mov.id} className="flex items-center justify-between gap-4 px-5 py-4 bg-bg-card">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${config.cor} shrink-0`} />
                  <div>
                    <p className="text-[13px] text-text-white font-medium">
                      {mov.produto?.nome || `Produto #${mov.produto_id}`}
                    </p>
                    <p className="font-mono text-xs text-text-muted">
                      {config.label} · {mov.motivo || '-'} ·{' '}
                      {new Date(mov.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-heading text-sm font-bold ${config.cor}`}>
                    {mov.tipo === 'entrada' || mov.tipo === 'cancelamento' ? '+' : '-'}
                    {mov.quantidade}
                  </p>
                  <p className="font-mono text-[10px] text-text-muted">
                    {mov.estoque_anterior} → {mov.estoque_posterior}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modais */}
      <EntradaEstoqueModal open={entradaOpen} onOpenChange={setEntradaOpen} produtos={produtos} onCreated={loadEstoque} />
      <AjusteEstoqueModal open={ajusteOpen} onOpenChange={setAjusteOpen} produtos={produtos} onCreated={loadEstoque} />
    </div>
  )
}
