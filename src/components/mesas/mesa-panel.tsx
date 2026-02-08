'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Plus, Minus, Trash2, CreditCard, Search, Package, XCircle, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { createComanda, addItemToComanda, removeItemFromComanda, closeComanda, cancelComanda, deleteMesa, updateMesaStatus } from '@/lib/supabase-helpers'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/lib/toast-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FecharComandaModal } from '@/components/comandas/fechar-comanda-modal'
import type { Mesa, Comanda, ComandaItem, Produto } from '@/lib/types'

interface MesaPanelProps {
  mesa: Mesa
  onClose: () => void
  onMesaUpdated: () => void
}

type PanelMode = 'novo' | 'pedido' | 'adicionar'

export function MesaPanel({ mesa, onClose, onMesaUpdated }: MesaPanelProps) {
  const { toast } = useToast()

  // Estado do painel
  const [mode, setMode] = useState<PanelMode>(mesa.status === 'livre' ? 'novo' : 'pedido')
  const [comanda, setComanda] = useState<Comanda | null>(null)
  const [itens, setItens] = useState<ComandaItem[]>([])
  const [loading, setLoading] = useState(false)

  // Modo "novo" - criar pedido
  const [clienteNome, setClienteNome] = useState('')
  const [criarLoading, setCriarLoading] = useState(false)

  // Modo "adicionar" - buscar/selecionar produtos
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [quantidade, setQuantidade] = useState(1)
  const [observacao, setObservacao] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Remover item
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Fechar/cancelar
  const [fecharOpen, setFecharOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  // Excluir mesa
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Mesa ocupada sem comanda
  const [semComanda, setSemComanda] = useState(false)

  // Carregar comanda se mesa ocupada
  useEffect(() => {
    if (mesa.status === 'ocupada') {
      loadComanda()
    }
  }, [mesa.id])

  // Carregar produtos quando entrar em modo adicionar
  useEffect(() => {
    if (mode === 'adicionar') {
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
  }, [mode])

  async function loadComanda() {
    setLoading(true)
    try {
      const { data: comandaData } = await supabase
        .from('comandas')
        .select('*')
        .eq('mesa_id', mesa.id)
        .eq('status', 'aberta')
        .limit(1)
        .single()

      if (comandaData) {
        setComanda(comandaData)
        setMode('pedido')

        const { data: itensData } = await supabase
          .from('comanda_itens')
          .select('*, produto:produtos(*)')
          .eq('comanda_id', comandaData.id)
          .order('created_at', { ascending: true })
        if (itensData) setItens(itensData)
      } else {
        // Mesa marcada como ocupada mas sem comanda aberta
        setSemComanda(true)
      }
    } catch (error) {
      // Nenhuma comanda encontrada — mesa travada
      setSemComanda(true)
      console.error('Erro ao carregar pedido:', error)
    } finally {
      setLoading(false)
    }
  }

  // Criar novo pedido
  async function handleCriarPedido() {
    setCriarLoading(true)
    try {
      const novaComanda = await createComanda('mesa', mesa.id, clienteNome || null)
      toast(`Pedido #${novaComanda.numero} aberto!`, 'success')
      setComanda(novaComanda)
      setItens([])
      setMode('adicionar') // Ja vai direto pra adicionar itens
      onMesaUpdated()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setCriarLoading(false)
    }
  }

  // Adicionar item ao pedido
  async function handleAddItem() {
    if (!produtoSelecionado || !comanda) return

    setAddLoading(true)
    try {
      await addItemToComanda(comanda.id, produtoSelecionado.id, quantidade, observacao || null)
      toast(`${produtoSelecionado.nome} adicionado!`, 'success')

      // Recarregar itens
      const { data: itensData } = await supabase
        .from('comanda_itens')
        .select('*, produto:produtos(*)')
        .eq('comanda_id', comanda.id)
        .order('created_at', { ascending: true })
      if (itensData) setItens(itensData)

      // Recarregar comanda para pegar total atualizado
      const { data: comandaData } = await supabase
        .from('comandas')
        .select('*')
        .eq('id', comanda.id)
        .single()
      if (comandaData) setComanda(comandaData)

      // Reset selecao
      setProdutoSelecionado(null)
      setQuantidade(1)
      setObservacao('')
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setAddLoading(false)
    }
  }

  // Remover item
  async function handleRemoveItem(itemId: string) {
    if (!comanda) return
    setRemovingId(itemId)
    try {
      await removeItemFromComanda(itemId, comanda.id)
      toast('Item removido', 'success')

      // Recarregar
      const { data: itensData } = await supabase
        .from('comanda_itens')
        .select('*, produto:produtos(*)')
        .eq('comanda_id', comanda.id)
        .order('created_at', { ascending: true })
      if (itensData) setItens(itensData)

      const { data: comandaData } = await supabase
        .from('comandas')
        .select('*')
        .eq('id', comanda.id)
        .single()
      if (comandaData) setComanda(comandaData)
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setRemovingId(null)
    }
  }

  // Cancelar pedido
  async function handleCancel() {
    if (!comanda) return
    setCancelLoading(true)
    try {
      await cancelComanda(comanda.id)
      toast('Pedido cancelado', 'warning')
      setCancelOpen(false)
      onMesaUpdated()
      onClose()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setCancelLoading(false)
    }
  }

  // Excluir mesa
  async function handleDeleteMesa() {
    setDeleteLoading(true)
    try {
      await deleteMesa(mesa.id)
      toast(`Mesa ${mesa.numero} excluida`, 'success')
      setDeleteOpen(false)
      onMesaUpdated()
      onClose()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Liberar mesa travada (ocupada sem comanda)
  async function handleLiberarMesa() {
    try {
      await updateMesaStatus(mesa.id, 'livre')
      toast(`Mesa ${mesa.numero} liberada`, 'success')
      onMesaUpdated()
      onClose()
    } catch (err: unknown) {
      toast((err as Error).message, 'error')
    }
  }

  // Filtrar produtos
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

  const total = itens.reduce((acc, i) => acc + i.subtotal, 0)

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Painel lateral */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-bg-page shadow-2xl flex flex-col animate-slide-in">
        {/* Header do painel */}
        <div className="flex items-center justify-between p-5 border-b border-bg-elevated">
          <div>
            <h2 className="font-heading text-2xl font-bold">
              Mesa {String(mesa.numero).padStart(2, '0')}
            </h2>
            <p className="text-xs text-text-muted">
              {mode === 'novo' ? 'Novo pedido' :
               mode === 'adicionar' ? 'Adicionar itens' :
               comanda ? `Pedido #${String(comanda.numero).padStart(3, '0')}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-bg-elevated rounded-xl hover:bg-bg-placeholder transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteudo scrollavel */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="text-text-muted">carregando...</span>
            </div>
          ) : semComanda ? (
            // ====== MESA OCUPADA SEM COMANDA: Liberar ou Excluir ======
            <div className="p-5 space-y-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto bg-warning/10 rounded-2xl flex items-center justify-center mb-3">
                  <XCircle className="w-8 h-8 text-warning" />
                </div>
                <h3 className="font-heading text-lg font-bold">Mesa Travada</h3>
                <p className="text-sm text-text-muted mt-1">Esta mesa esta marcada como ocupada mas nao tem pedido aberto.</p>
              </div>

              <Button onClick={handleLiberarMesa} variant="success" className="w-full h-14 text-lg">
                Liberar Mesa
              </Button>

              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="w-full text-center text-sm text-danger hover:underline cursor-pointer py-2"
              >
                <Trash2 size={14} className="inline mr-1" />
                Excluir Mesa
              </button>
            </div>
          ) : mode === 'novo' ? (
            // ====== MODO NOVO: Nome do cliente + Abrir Pedido ======
            <div className="p-5 space-y-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto bg-success/10 rounded-2xl flex items-center justify-center mb-3">
                  <User className="w-8 h-8 text-success" />
                </div>
                <h3 className="font-heading text-lg font-bold">Mesa Livre</h3>
                <p className="text-sm text-text-muted mt-1">Abra um pedido para esta mesa</p>
              </div>

              <Input
                label="Nome do Cliente (opcional)"
                value={clienteNome}
                onChange={e => setClienteNome(e.target.value)}
                placeholder="Ex: Joao, Maria..."
              />

              <Button onClick={handleCriarPedido} loading={criarLoading} variant="success" className="w-full h-14 text-lg">
                Abrir Pedido
              </Button>

              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="w-full text-center text-sm text-danger hover:underline cursor-pointer py-2"
              >
                <Trash2 size={14} className="inline mr-1" />
                Excluir Mesa
              </button>
            </div>
          ) : mode === 'adicionar' ? (
            // ====== MODO ADICIONAR: Buscar e selecionar produtos ======
            <div className="p-5 space-y-4">
              {!produtoSelecionado ? (
                // Lista de produtos
                <>
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

                  <div className="space-y-4 pb-40 sm:pb-0">
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
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg-elevated hover:bg-bg-placeholder transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-bg-placeholder flex items-center justify-center shrink-0">
                                  <Package size={16} className="text-text-muted" />
                                </div>
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

                  <Button variant="ghost" onClick={() => setMode('pedido')} className="w-full">
                    Voltar ao Pedido
                  </Button>
                </>
              ) : (
                // Detalhes do produto selecionado
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-bg-elevated rounded-xl">
                    <div className="flex-1">
                      <h3 className="font-heading text-lg font-bold text-text-white">{produtoSelecionado.nome}</h3>
                      <p className="text-sm text-text-muted">{produtoSelecionado.categoria}</p>
                    </div>
                    <span className="font-heading text-xl font-bold text-orange">
                      {formatCurrency(produtoSelecionado.preco)}
                    </span>
                  </div>

                  {/* Quantidade */}
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
                          const max = produtoSelecionado.controlar_estoque ? (produtoSelecionado.estoque_atual || 0) : 999
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

                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => { setProdutoSelecionado(null); setQuantidade(1); setObservacao('') }} className="flex-1">
                      Voltar
                    </Button>
                    <Button onClick={handleAddItem} loading={addLoading} className="flex-1">
                      Adicionar ({quantidade}x)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // ====== MODO PEDIDO: Itens + total + acoes ======
            <div className="p-5 space-y-4">
              {/* Itens do pedido */}
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-sm font-semibold text-text-muted">
                  ITENS ({itens.length})
                </h3>
                <button
                  onClick={() => { setBusca(''); setProdutoSelecionado(null); setMode('adicionar') }}
                  className="flex items-center gap-1.5 text-xs text-orange font-semibold hover:underline cursor-pointer"
                >
                  <Plus size={14} />
                  Adicionar
                </button>
              </div>

              {itens.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="w-10 h-10 text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">Nenhum item no pedido</p>
                  <Button
                    size="sm"
                    onClick={() => { setBusca(''); setProdutoSelecionado(null); setMode('adicionar') }}
                    className="mt-3"
                  >
                    <Plus size={14} /> Adicionar Primeiro Item
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden space-y-px">
                  {itens.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-bg-card">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-bg-placeholder flex items-center justify-center shrink-0">
                          <Package size={12} className="text-text-muted" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-text-white font-medium truncate">
                            {(item.produto as unknown as Produto)?.nome || 'Produto'}
                          </p>
                          <p className="text-xs text-text-muted">
                            {item.quantidade}x {formatCurrency(item.preco_unitario)}
                            {item.observacao && ` · ${item.observacao}`}
                          </p>
                        </div>
                      </div>
                      <span className="font-heading text-sm text-text-white font-bold shrink-0">
                        {formatCurrency(item.subtotal)}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={removingId === item.id}
                        className="text-text-muted hover:text-danger transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Cliente */}
              {comanda?.cliente_nome && (
                <div className="flex items-center gap-2 px-3 py-2 bg-bg-elevated rounded-xl">
                  <User size={14} className="text-text-muted" />
                  <span className="text-xs text-text-muted">Cliente:</span>
                  <span className="text-xs text-text-white font-medium">{comanda.cliente_nome}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer fixo (so no modo pedido com itens) */}
        {mode === 'pedido' && comanda && (
          <div className="border-t border-bg-elevated p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Total</span>
              <span className="font-heading text-3xl font-bold text-orange">
                {formatCurrency(total)}
              </span>
            </div>
            <div className="flex gap-3">
              <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)} className="flex-1">
                <XCircle size={16} />
                Cancelar
              </Button>
              <Button onClick={() => setFecharOpen(true)} disabled={itens.length === 0} className="flex-1">
                <CreditCard size={16} />
                Pagamento
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de pagamento */}
      {comanda && (
        <FecharComandaModal
          open={fecharOpen}
          onOpenChange={setFecharOpen}
          comandaId={comanda.id}
          subtotal={total}
          onClosed={() => {
            onMesaUpdated()
            onClose()
          }}
        />
      )}

      {/* Confirmacao de cancelamento */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar Pedido"
        description="Tem certeza? Os itens serao devolvidos ao estoque."
        onConfirm={handleCancel}
        loading={cancelLoading}
        confirmText="Sim, Cancelar"
        variant="danger"
      />

      {/* Confirmacao de exclusao de mesa */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir Mesa"
        description={`Tem certeza que deseja excluir a Mesa ${mesa.numero}? Esta acao nao pode ser desfeita.`}
        onConfirm={handleDeleteMesa}
        loading={deleteLoading}
        confirmText="Sim, Excluir"
        variant="danger"
      />
    </>
  )
}
