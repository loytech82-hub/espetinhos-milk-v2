import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// API central para operacoes de escrita — usa service_role para bypassar RLS
export async function POST(request: NextRequest) {
  try {
    const { action, params } = await request.json()

    switch (action) {
      case 'createComanda':
        return await handleCreateComanda(params)
      case 'addItemToComanda':
        return await handleAddItemToComanda(params)
      case 'createProduto':
        return await handleCreateProduto(params)
      case 'updateProduto':
        return await handleUpdateProduto(params)
      case 'toggleProdutoAtivo':
        return await handleToggleProdutoAtivo(params)
      case 'deleteProduto':
        return await handleDeleteProduto(params)
      case 'createCliente':
        return await handleCreateCliente(params)
      case 'updateCliente':
        return await handleUpdateCliente(params)
      case 'createCaixaMovimento':
        return await handleCreateCaixaMovimento(params)
      case 'createMesa':
        return await handleCreateMesa(params)
      case 'updateMesaStatus':
        return await handleUpdateMesaStatus(params)
      case 'deleteMesa':
        return await handleDeleteMesa(params)
      case 'fecharTurno':
        return await handleFecharTurno(params)
      case 'entradaEstoque':
        return await handleEntradaEstoque(params)
      case 'ajusteEstoque':
        return await handleAjusteEstoque(params)
      case 'updateEmpresa':
        return await handleUpdateEmpresa(params)
      case 'updateItemQuantidade':
        return await handleUpdateItemQuantidade(params)
      case 'receberFiado':
        return await handleReceberFiado(params)
      case 'registrarMovimentoEstoque':
        return await handleRegistrarMovimentoEstoque(params)
      default:
        return NextResponse.json({ error: `Acao desconhecida: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('Erro API /db:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// ============================================
// COMANDAS
// ============================================

async function handleCreateComanda(params: {
  tipo: string
  mesaId?: number | null
  clienteNome?: string | null
}) {
  const { tipo, mesaId, clienteNome } = params

  // Proximo numero
  const { data: lastComanda } = await supabaseAdmin
    .from('comandas')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(1)
  const numero = (lastComanda?.[0]?.numero || 0) + 1

  const { data, error } = await supabaseAdmin
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Atualizar mesa para ocupada
  if (tipo === 'mesa' && mesaId) {
    await supabaseAdmin.from('mesas').update({ status: 'ocupada' }).eq('id', mesaId)
  }

  return NextResponse.json({ result: data })
}

async function handleAddItemToComanda(params: {
  comandaId: string
  produtoId: string
  quantidade: number
  observacao?: string | null
}) {
  const { comandaId, produtoId, quantidade, observacao } = params

  // Buscar produto
  const { data: produto, error: prodErr } = await supabaseAdmin
    .from('produtos')
    .select('*')
    .eq('id', produtoId)
    .single()

  if (prodErr || !produto) {
    return NextResponse.json({ error: 'Produto nao encontrado' }, { status: 404 })
  }

  // Validar estoque
  if (produto.controlar_estoque && (produto.estoque_atual || 0) < quantidade) {
    return NextResponse.json(
      { error: `Estoque insuficiente (disponivel: ${produto.estoque_atual || 0})` },
      { status: 400 }
    )
  }

  const subtotal = produto.preco * quantidade

  // Inserir item
  const { data: item, error } = await supabaseAdmin
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Decrementar estoque
  if (produto.controlar_estoque) {
    const novoEstoque = (produto.estoque_atual || 0) - quantidade
    await supabaseAdmin
      .from('produtos')
      .update({ estoque_atual: novoEstoque })
      .eq('id', produtoId)

    await supabaseAdmin.from('estoque_movimentos').insert({
      produto_id: produtoId,
      tipo: 'venda',
      quantidade,
      estoque_anterior: produto.estoque_atual || 0,
      estoque_posterior: novoEstoque,
      motivo: `Comanda #${comandaId}`,
      comanda_id: comandaId,
    })
  }

  // Recalcular total
  await recalcularTotal(comandaId)

  return NextResponse.json({ result: item })
}

// ============================================
// PRODUTOS
// ============================================

async function handleCreateProduto(params: { produto: Record<string, unknown> }) {
  const { data, error } = await supabaseAdmin
    .from('produtos')
    .insert(params.produto)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: data })
}

async function handleUpdateProduto(params: { id: string; updates: Record<string, unknown> }) {
  const { data, error } = await supabaseAdmin
    .from('produtos')
    .update(params.updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: data })
}

async function handleToggleProdutoAtivo(params: { id: string; ativo: boolean }) {
  const { error } = await supabaseAdmin
    .from('produtos')
    .update({ ativo: params.ativo })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: true })
}

async function handleDeleteProduto(params: { id: string }) {
  // Verificar se produto esta sendo usado em algum pedido
  const { count } = await supabaseAdmin
    .from('comanda_itens')
    .select('id', { count: 'exact', head: true })
    .eq('produto_id', params.id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'Este produto ja foi usado em pedidos e nao pode ser excluido. Desative-o em vez de excluir.' },
      { status: 400 }
    )
  }

  // Buscar produto para deletar foto do storage se houver
  const { data: produto } = await supabaseAdmin
    .from('produtos')
    .select('foto_url')
    .eq('id', params.id)
    .single()

  // Deletar produto primeiro (antes da foto, para evitar perda de dados)
  const { error } = await supabaseAdmin
    .from('produtos')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Deletar foto do storage depois do produto (so se exclusao deu certo)
  if (produto?.foto_url) {
    const parts = produto.foto_url.split('/')
    const fileName = parts[parts.length - 1]
    if (fileName) {
      await supabaseAdmin.storage.from('produtos').remove([fileName])
    }
  }

  return NextResponse.json({ result: true })
}

// ============================================
// CLIENTES
// ============================================

async function handleCreateCliente(params: { cliente: Record<string, unknown> }) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .insert(params.cliente)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: data })
}

async function handleUpdateCliente(params: { id: string; updates: Record<string, unknown> }) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .update(params.updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: data })
}

// ============================================
// CAIXA
// ============================================

async function handleCreateCaixaMovimento(params: {
  tipo: string
  valor: number
  descricao: string
  forma_pagamento?: string
}) {
  // Vincular ao turno aberto
  const { data: turno } = await supabaseAdmin
    .from('caixa_turnos')
    .select('id')
    .eq('status', 'aberto')
    .order('aberto_em', { ascending: false })
    .limit(1)
    .single()

  const { data, error } = await supabaseAdmin
    .from('caixa')
    .insert({
      ...params,
      turno_id: turno?.id || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: data })
}

async function handleFecharTurno(params: {
  turnoId: number
  valorFechamento: number
  observacao?: string
}) {
  const { turnoId, valorFechamento, observacao } = params

  // Calcular totais
  const { data: movimentos } = await supabaseAdmin
    .from('caixa')
    .select('tipo, valor')
    .eq('turno_id', turnoId)

  let totalEntradas = 0
  let totalSaidas = 0
  if (movimentos) {
    for (const m of movimentos) {
      if (m.tipo === 'entrada') totalEntradas += m.valor
      else totalSaidas += m.valor
    }
  }

  const { error } = await supabaseAdmin
    .from('caixa_turnos')
    .update({
      status: 'fechado',
      valor_fechamento: valorFechamento,
      total_entradas: totalEntradas,
      total_saidas: totalSaidas,
      total_vendas: totalEntradas,
      observacao_fechamento: observacao || null,
      fechado_em: new Date().toISOString(),
    })
    .eq('id', turnoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: true })
}

// ============================================
// MESAS
// ============================================

async function handleCreateMesa(params: { numero: number }) {
  const { data, error } = await supabaseAdmin
    .from('mesas')
    .insert({ numero: params.numero, status: 'livre' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: data })
}

async function handleUpdateMesaStatus(params: { id: number; status: string }) {
  const { error } = await supabaseAdmin
    .from('mesas')
    .update({ status: params.status })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: true })
}

async function handleDeleteMesa(params: { id: number }) {
  const { error } = await supabaseAdmin
    .from('mesas')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: true })
}

// ============================================
// ESTOQUE
// ============================================

async function handleEntradaEstoque(params: {
  produtoId: string
  quantidade: number
  motivo?: string
}) {
  const { produtoId, quantidade, motivo } = params

  const { data: produto } = await supabaseAdmin
    .from('produtos')
    .select('estoque_atual')
    .eq('id', produtoId)
    .single()

  if (!produto) return NextResponse.json({ error: 'Produto nao encontrado' }, { status: 404 })

  const novoEstoque = (produto.estoque_atual || 0) + quantidade

  await supabaseAdmin
    .from('produtos')
    .update({ estoque_atual: novoEstoque })
    .eq('id', produtoId)

  await supabaseAdmin.from('estoque_movimentos').insert({
    produto_id: produtoId,
    tipo: 'entrada',
    quantidade,
    estoque_anterior: produto.estoque_atual || 0,
    estoque_posterior: novoEstoque,
    motivo: motivo || 'Entrada de mercadoria',
  })

  return NextResponse.json({ result: true })
}

async function handleAjusteEstoque(params: {
  produtoId: string
  novaQuantidade: number
  motivo: string
}) {
  const { produtoId, novaQuantidade, motivo } = params

  const { data: produto } = await supabaseAdmin
    .from('produtos')
    .select('estoque_atual')
    .eq('id', produtoId)
    .single()

  if (!produto) return NextResponse.json({ error: 'Produto nao encontrado' }, { status: 404 })

  const diferenca = Math.abs(novaQuantidade - (produto.estoque_atual || 0))

  await supabaseAdmin
    .from('produtos')
    .update({ estoque_atual: novaQuantidade })
    .eq('id', produtoId)

  await supabaseAdmin.from('estoque_movimentos').insert({
    produto_id: produtoId,
    tipo: 'ajuste',
    quantidade: diferenca,
    estoque_anterior: produto.estoque_atual || 0,
    estoque_posterior: novaQuantidade,
    motivo,
  })

  return NextResponse.json({ result: true })
}

async function handleRegistrarMovimentoEstoque(params: {
  produto_id: string
  tipo: string
  quantidade: number
  estoque_anterior: number
  estoque_posterior: number
  motivo?: string
  comanda_id?: string
  usuario_id?: string
}) {
  await supabaseAdmin.from('estoque_movimentos').insert({
    produto_id: params.produto_id,
    tipo: params.tipo,
    quantidade: params.quantidade,
    estoque_anterior: params.estoque_anterior,
    estoque_posterior: params.estoque_posterior,
    motivo: params.motivo || null,
    comanda_id: params.comanda_id || null,
    usuario_id: params.usuario_id || null,
  })

  return NextResponse.json({ result: true })
}

// ============================================
// EMPRESA
// ============================================

async function handleUpdateEmpresa(params: { updates: Record<string, unknown> }) {
  const { data, error } = await supabaseAdmin
    .from('empresa')
    .update({ ...params.updates, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: data })
}

// ============================================
// RECEBER PAGAMENTO DE FIADO
// ============================================

async function handleReceberFiado(params: {
  comandaId: string
  formaPagamentoRecebimento: string
}) {
  const { comandaId, formaPagamentoRecebimento } = params

  // Buscar comanda
  const { data: comanda, error: fetchErr } = await supabaseAdmin
    .from('comandas')
    .select('*')
    .eq('id', comandaId)
    .single()

  if (fetchErr || !comanda) {
    return NextResponse.json({ error: 'Comanda nao encontrada' }, { status: 404 })
  }

  if (!comanda.fiado || comanda.fiado_pago) {
    return NextResponse.json({ error: 'Esta comanda nao tem pagamento pendente' }, { status: 400 })
  }

  // Marcar fiado como pago
  const { error } = await supabaseAdmin
    .from('comandas')
    .update({
      fiado_pago: true,
      fiado_pago_em: new Date().toISOString(),
    })
    .eq('id', comandaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Agora sim registrar entrada no caixa
  const { data: turno } = await supabaseAdmin
    .from('caixa_turnos')
    .select('id')
    .eq('status', 'aberto')
    .order('aberto_em', { ascending: false })
    .limit(1)
    .single()

  await supabaseAdmin.from('caixa').insert({
    tipo: 'entrada',
    valor: comanda.total,
    descricao: `Prazo recebido - Comanda #${comanda.numero}`,
    forma_pagamento: formaPagamentoRecebimento,
    comanda_id: comandaId,
    turno_id: turno?.id || null,
  })

  return NextResponse.json({ result: true })
}

// ============================================
// ATUALIZAR QUANTIDADE DE ITEM NA COMANDA
// ============================================

async function handleUpdateItemQuantidade(params: {
  itemId: string
  novaQuantidade: number
  comandaId: string
}) {
  const { itemId, novaQuantidade, comandaId } = params

  if (novaQuantidade < 1) {
    return NextResponse.json({ error: 'Quantidade deve ser maior que zero' }, { status: 400 })
  }

  // Buscar item atual com produto
  const { data: item, error: itemErr } = await supabaseAdmin
    .from('comanda_itens')
    .select('*, produto:produtos(*)')
    .eq('id', itemId)
    .single()

  if (itemErr || !item) {
    return NextResponse.json({ error: 'Item nao encontrado' }, { status: 404 })
  }

  const produto = item.produto
  const quantidadeAnterior = item.quantidade
  const diferenca = novaQuantidade - quantidadeAnterior

  // Se incrementando, validar estoque
  if (diferenca > 0 && produto?.controlar_estoque) {
    if ((produto.estoque_atual || 0) < diferenca) {
      return NextResponse.json(
        { error: `Estoque insuficiente (disponivel: ${produto.estoque_atual || 0})` },
        { status: 400 }
      )
    }
  }

  const novoSubtotal = item.preco_unitario * novaQuantidade

  // Atualizar item
  const { error } = await supabaseAdmin
    .from('comanda_itens')
    .update({ quantidade: novaQuantidade, subtotal: novoSubtotal })
    .eq('id', itemId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ajustar estoque se necessario
  if (produto?.controlar_estoque && diferenca !== 0) {
    const estoqueAtual = produto.estoque_atual || 0
    const novoEstoque = estoqueAtual - diferenca // incrementou qty → decrementa estoque

    await supabaseAdmin
      .from('produtos')
      .update({ estoque_atual: novoEstoque })
      .eq('id', item.produto_id)

    await supabaseAdmin.from('estoque_movimentos').insert({
      produto_id: item.produto_id,
      tipo: diferenca > 0 ? 'venda' : 'cancelamento',
      quantidade: Math.abs(diferenca),
      estoque_anterior: estoqueAtual,
      estoque_posterior: novoEstoque,
      motivo: diferenca > 0
        ? `Incremento qty comanda #${comandaId}`
        : `Decremento qty comanda #${comandaId}`,
      comanda_id: comandaId,
    })
  }

  // Recalcular total da comanda
  await recalcularTotal(comandaId)

  return NextResponse.json({ result: true })
}

// ============================================
// HELPERS INTERNOS
// ============================================

async function recalcularTotal(comandaId: string) {
  const { data: itens } = await supabaseAdmin
    .from('comanda_itens')
    .select('subtotal')
    .eq('comanda_id', comandaId)

  const total = itens?.reduce((sum, i) => sum + i.subtotal, 0) || 0
  await supabaseAdmin.from('comandas').update({ total }).eq('id', comandaId)
}
