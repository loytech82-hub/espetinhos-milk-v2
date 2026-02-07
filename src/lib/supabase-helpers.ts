import { supabase } from './supabase'
import type { Comanda, ComandaItem, Produto, CaixaMovimento, Mesa, Cliente } from './types'

// ============================================
// COMANDAS
// ============================================

// Busca o próximo número de comanda
async function getNextComandaNumber(): Promise<number> {
  const { data } = await supabase
    .from('comandas')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(1)
  return (data?.[0]?.numero || 0) + 1
}

// Criar nova comanda
export async function createComanda(
  tipo: 'mesa' | 'balcao' | 'delivery',
  mesaId?: number | null,
  clienteNome?: string | null
): Promise<Comanda> {
  const numero = await getNextComandaNumber()

  const { data, error } = await supabase
    .from('comandas')
    .insert({
      numero,
      tipo,
      mesa_id: mesaId || null,
      cliente_nome: clienteNome || null,
      status: 'aberta',
      total: 0,
    })
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar comanda: ${error.message}`)

  // Se for mesa, atualizar status para 'ocupada'
  if (tipo === 'mesa' && mesaId) {
    await supabase.from('mesas').update({ status: 'ocupada' }).eq('id', mesaId)
  }

  return data
}

// Adicionar item à comanda
export async function addItemToComanda(
  comandaId: number,
  produtoId: number,
  quantidade: number,
  observacao?: string | null
): Promise<ComandaItem> {
  // Buscar produto para pegar preço
  const { data: produto, error: prodError } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', produtoId)
    .single()

  if (prodError || !produto) throw new Error('Produto não encontrado')
  if (produto.estoque < quantidade) throw new Error(`Estoque insuficiente (disponível: ${produto.estoque})`)

  const subtotal = produto.preco * quantidade

  // Inserir item
  const { data: item, error } = await supabase
    .from('comanda_itens')
    .insert({
      comanda_id: comandaId,
      produto_id: produtoId,
      quantidade,
      preco_unitario: produto.preco,
      subtotal,
      observacao: observacao || null,
    })
    .select('*, produto:produtos(*)')
    .single()

  if (error) throw new Error(`Erro ao adicionar item: ${error.message}`)

  // Decrementar estoque
  await supabase
    .from('produtos')
    .update({ estoque: produto.estoque - quantidade })
    .eq('id', produtoId)

  // Recalcular total da comanda
  await recalcularTotalComanda(comandaId)

  return item
}

// Remover item da comanda
export async function removeItemFromComanda(
  itemId: number,
  comandaId: number
): Promise<void> {
  // Buscar item para restaurar estoque
  const { data: item } = await supabase
    .from('comanda_itens')
    .select('*, produto:produtos(*)')
    .eq('id', itemId)
    .single()

  if (!item) throw new Error('Item não encontrado')

  // Deletar item
  const { error } = await supabase.from('comanda_itens').delete().eq('id', itemId)
  if (error) throw new Error(`Erro ao remover item: ${error.message}`)

  // Restaurar estoque
  if (item.produto) {
    await supabase
      .from('produtos')
      .update({ estoque: item.produto.estoque + item.quantidade })
      .eq('id', item.produto_id)
  }

  // Recalcular total
  await recalcularTotalComanda(comandaId)
}

// Recalcular total da comanda
async function recalcularTotalComanda(comandaId: number): Promise<void> {
  const { data: itens } = await supabase
    .from('comanda_itens')
    .select('subtotal')
    .eq('comanda_id', comandaId)

  const total = itens?.reduce((sum, i) => sum + i.subtotal, 0) || 0

  await supabase.from('comandas').update({ total }).eq('id', comandaId)
}

// Fechar comanda
export async function closeComanda(
  comandaId: number,
  formaPagamento: string
): Promise<void> {
  // Buscar comanda
  const { data: comanda } = await supabase
    .from('comandas')
    .select('*')
    .eq('id', comandaId)
    .single()

  if (!comanda) throw new Error('Comanda não encontrada')
  if (comanda.status !== 'aberta') throw new Error('Comanda já está fechada')

  // Fechar comanda
  const { error } = await supabase
    .from('comandas')
    .update({
      status: 'fechada',
      forma_pagamento: formaPagamento,
      closed_at: new Date().toISOString(),
    })
    .eq('id', comandaId)

  if (error) throw new Error(`Erro ao fechar comanda: ${error.message}`)

  // Registrar entrada no caixa
  await supabase.from('caixa').insert({
    tipo: 'entrada',
    valor: comanda.total,
    descricao: `Comanda #${comanda.numero} (${comanda.tipo})`,
    forma_pagamento: formaPagamento,
    comanda_id: comandaId,
  })

  // Liberar mesa se for comanda de mesa
  if (comanda.tipo === 'mesa' && comanda.mesa_id) {
    await supabase.from('mesas').update({ status: 'livre' }).eq('id', comanda.mesa_id)
  }
}

// Cancelar comanda
export async function cancelComanda(comandaId: number): Promise<void> {
  // Buscar itens para restaurar estoque
  const { data: itens } = await supabase
    .from('comanda_itens')
    .select('*, produto:produtos(*)')
    .eq('comanda_id', comandaId)

  // Restaurar estoque de cada item
  if (itens) {
    for (const item of itens) {
      if (item.produto) {
        await supabase
          .from('produtos')
          .update({ estoque: item.produto.estoque + item.quantidade })
          .eq('id', item.produto_id)
      }
    }
  }

  // Buscar comanda para liberar mesa
  const { data: comanda } = await supabase
    .from('comandas')
    .select('*')
    .eq('id', comandaId)
    .single()

  // Cancelar comanda
  await supabase
    .from('comandas')
    .update({ status: 'cancelada', closed_at: new Date().toISOString() })
    .eq('id', comandaId)

  // Liberar mesa
  if (comanda?.tipo === 'mesa' && comanda.mesa_id) {
    await supabase.from('mesas').update({ status: 'livre' }).eq('id', comanda.mesa_id)
  }
}

// ============================================
// PRODUTOS
// ============================================

export async function createProduto(produto: Omit<Produto, 'id' | 'created_at'>): Promise<Produto> {
  const { data, error } = await supabase
    .from('produtos')
    .insert(produto)
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar produto: ${error.message}`)
  return data
}

export async function updateProduto(id: number, updates: Partial<Produto>): Promise<Produto> {
  const { data, error } = await supabase
    .from('produtos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Erro ao atualizar produto: ${error.message}`)
  return data
}

export async function toggleProdutoAtivo(id: number, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('produtos').update({ ativo }).eq('id', id)
  if (error) throw new Error(`Erro ao alterar status: ${error.message}`)
}

// ============================================
// CLIENTES
// ============================================

export async function createCliente(cliente: { nome: string; telefone?: string; endereco?: string }): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .insert(cliente)
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar cliente: ${error.message}`)
  return data
}

export async function updateCliente(id: number, updates: Partial<Cliente>): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Erro ao atualizar cliente: ${error.message}`)
  return data
}

// ============================================
// CAIXA
// ============================================

export async function createCaixaMovimento(movimento: {
  tipo: 'entrada' | 'saida'
  valor: number
  descricao: string
  forma_pagamento?: string
}): Promise<CaixaMovimento> {
  const { data, error } = await supabase
    .from('caixa')
    .insert(movimento)
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar movimento: ${error.message}`)
  return data
}

// ============================================
// MESAS
// ============================================

export async function createMesa(numero: number): Promise<Mesa> {
  const { data, error } = await supabase
    .from('mesas')
    .insert({ numero, status: 'livre' })
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar mesa: ${error.message}`)
  return data
}

export async function updateMesaStatus(id: number, status: Mesa['status']): Promise<void> {
  const { error } = await supabase.from('mesas').update({ status }).eq('id', id)
  if (error) throw new Error(`Erro ao atualizar mesa: ${error.message}`)
}

export async function deleteMesa(id: number): Promise<void> {
  const { error } = await supabase.from('mesas').delete().eq('id', id)
  if (error) throw new Error(`Erro ao deletar mesa: ${error.message}`)
}
