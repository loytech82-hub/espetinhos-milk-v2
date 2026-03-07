import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getRequestContext } from '@/lib/supabase-server'

// API central para operacoes de escrita — usa service_role para bypassar RLS
// Todas as operacoes filtram por empresa_id do usuario logado
export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequestContext(request)
    const { action, params } = await request.json()
    const empresaId = ctx.empresaId

    switch (action) {
      case 'createComanda':
        return await handleCreateComanda(params, empresaId)
      case 'addItemToComanda':
        return await handleAddItemToComanda(params, empresaId)
      case 'createProduto':
        return await handleCreateProduto(params, empresaId)
      case 'updateProduto':
        return await handleUpdateProduto(params, empresaId)
      case 'toggleProdutoAtivo':
        return await handleToggleProdutoAtivo(params, empresaId)
      case 'deleteProduto':
        return await handleDeleteProduto(params, empresaId)
      case 'createCliente':
        return await handleCreateCliente(params, empresaId)
      case 'updateCliente':
        return await handleUpdateCliente(params, empresaId)
      case 'deleteCliente':
        return await handleDeleteCliente(params, empresaId)
      case 'createCaixaMovimento':
        return await handleCreateCaixaMovimento(params, empresaId)
      case 'createMesa':
        return await handleCreateMesa(params, empresaId)
      case 'updateMesaStatus':
        return await handleUpdateMesaStatus(params, empresaId)
      case 'deleteMesa':
        return await handleDeleteMesa(params, empresaId)
      case 'fecharTurno':
        return await handleFecharTurno(params, empresaId)
      case 'entradaEstoque':
        return await handleEntradaEstoque(params, empresaId)
      case 'ajusteEstoque':
        return await handleAjusteEstoque(params, empresaId)
      case 'updateEmpresa':
        return await handleUpdateEmpresa(params, empresaId)
      case 'updateItemQuantidade':
        return await handleUpdateItemQuantidade(params, empresaId)
      case 'receberFiado':
        return await handleReceberFiado(params, empresaId)
      case 'registrarMovimentoEstoque':
        return await handleRegistrarMovimentoEstoque(params, empresaId)
      case 'receberFiadoParcial':
        return await handleReceberFiadoParcial(params, empresaId)
      case 'addItemToClienteDebt':
        return await handleAddItemToClienteDebt(params, empresaId)
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
}, empresaId: number) {
  const { tipo, mesaId, clienteNome } = params

  // Proximo numero (dentro da empresa)
  const { data: lastComanda } = await supabaseAdmin
    .from('comandas')
    .select('numero')
    .eq('empresa_id', empresaId)
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
      empresa_id: empresaId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Atualizar mesa para ocupada
  if (tipo === 'mesa' && mesaId) {
    await supabaseAdmin.from('mesas').update({ status: 'ocupada' }).eq('id', mesaId).eq('empresa_id', empresaId)
  }

  return NextResponse.json({ result: data })
}

async function handleAddItemToComanda(params: {
  comandaId: string
  produtoId: string
  quantidade: number
  observacao?: string | null
}, empresaId: number) {
  const { comandaId, produtoId, quantidade, observacao } = params

  // Buscar produto da mesma empresa
  const { data: produto, error: prodErr } = await supabaseAdmin
    .from('produtos')
    .select('*')
    .eq('id', produtoId)
    .eq('empresa_id', empresaId)
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
      empresa_id: empresaId,
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
      .eq('empresa_id', empresaId)

    await supabaseAdmin.from('estoque_movimentos').insert({
      produto_id: produtoId,
      tipo: 'venda',
      quantidade,
      estoque_anterior: produto.estoque_atual || 0,
      estoque_posterior: novoEstoque,
      motivo: `Comanda #${comandaId}`,
      comanda_id: comandaId,
      empresa_id: empresaId,
    })
  }

  // Recalcular total
  await recalcularTotal(comandaId)

  return NextResponse.json({ result: item })
}

// ============================================
// PRODUTOS
// ============================================

async function handleCreateProduto(params: { produto: Record<string, unknown> }, empresaId: number) {
  const { data, error } = await supabaseAdmin
    .from('produtos')
    .insert({ ...params.produto, empresa_id: empresaId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: data })
}

async function handleUpdateProduto(params: { id: string; updates: Record<string, unknown> }, empresaId: number) {
  const { data, error } = await supabaseAdmin
    .from('produtos')
    .update(params.updates)
    .eq('id', params.id)
    .eq('empresa_id', empresaId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: data })
}

async function handleToggleProdutoAtivo(params: { id: string; ativo: boolean }, empresaId: number) {
  const { error } = await supabaseAdmin
    .from('produtos')
    .update({ ativo: params.ativo })
    .eq('id', params.id)
    .eq('empresa_id', empresaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: true })
}

async function handleDeleteProduto(params: { id: string }, empresaId: number) {
  // Verificar se produto esta sendo usado em algum pedido
  const { count } = await supabaseAdmin
    .from('comanda_itens')
    .select('id', { count: 'exact', head: true })
    .eq('produto_id', params.id)
    .eq('empresa_id', empresaId)

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
    .eq('empresa_id', empresaId)
    .single()

  // Deletar produto primeiro (antes da foto, para evitar perda de dados)
  const { error } = await supabaseAdmin
    .from('produtos')
    .delete()
    .eq('id', params.id)
    .eq('empresa_id', empresaId)

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

async function handleCreateCliente(params: { cliente: Record<string, unknown> }, empresaId: number) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .insert({ ...params.cliente, empresa_id: empresaId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: data })
}

async function handleUpdateCliente(params: { id: string; updates: Record<string, unknown> }, empresaId: number) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .update(params.updates)
    .eq('id', params.id)
    .eq('empresa_id', empresaId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: data })
}

async function handleDeleteCliente(params: { id: string }, empresaId: number) {
  // Verificar se cliente tem fiado aberto (nao pago)
  const { count } = await supabaseAdmin
    .from('comandas')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', params.id)
    .eq('empresa_id', empresaId)
    .eq('fiado', true)
    .eq('fiado_pago', false)

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'Este cliente possui pagamentos a prazo pendentes e nao pode ser excluido.' },
      { status: 400 }
    )
  }

  // Desvincular comandas antigas deste cliente (manter historico das comandas)
  await supabaseAdmin
    .from('comandas')
    .update({ cliente_id: null })
    .eq('cliente_id', params.id)
    .eq('empresa_id', empresaId)

  const { error } = await supabaseAdmin
    .from('clientes')
    .delete()
    .eq('id', params.id)
    .eq('empresa_id', empresaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: true })
}

// ============================================
// CAIXA
// ============================================

async function handleCreateCaixaMovimento(params: {
  tipo: string
  valor: number
  descricao: string
  forma_pagamento?: string
}, empresaId: number) {
  // Vincular ao turno aberto da empresa
  const { data: turno } = await supabaseAdmin
    .from('caixa_turnos')
    .select('id')
    .eq('status', 'aberto')
    .eq('empresa_id', empresaId)
    .order('aberto_em', { ascending: false })
    .limit(1)
    .single()

  const { data, error } = await supabaseAdmin
    .from('caixa')
    .insert({
      ...params,
      turno_id: turno?.id || null,
      empresa_id: empresaId,
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
}, empresaId: number) {
  const { turnoId, valorFechamento, observacao } = params

  // Calcular totais
  const { data: movimentos } = await supabaseAdmin
    .from('caixa')
    .select('tipo, valor')
    .eq('turno_id', turnoId)
    .eq('empresa_id', empresaId)

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
    .eq('empresa_id', empresaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: true })
}

// ============================================
// MESAS
// ============================================

async function handleCreateMesa(params: { numero: number }, empresaId: number) {
  const { data, error } = await supabaseAdmin
    .from('mesas')
    .insert({ numero: params.numero, status: 'livre', empresa_id: empresaId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: data })
}

async function handleUpdateMesaStatus(params: { id: number; status: string }, empresaId: number) {
  const { error } = await supabaseAdmin
    .from('mesas')
    .update({ status: params.status })
    .eq('id', params.id)
    .eq('empresa_id', empresaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ result: true })
}

async function handleDeleteMesa(params: { id: number }, empresaId: number) {
  const { error } = await supabaseAdmin
    .from('mesas')
    .delete()
    .eq('id', params.id)
    .eq('empresa_id', empresaId)

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
}, empresaId: number) {
  const { produtoId, quantidade, motivo } = params

  const { data: produto } = await supabaseAdmin
    .from('produtos')
    .select('estoque_atual')
    .eq('id', produtoId)
    .eq('empresa_id', empresaId)
    .single()

  if (!produto) return NextResponse.json({ error: 'Produto nao encontrado' }, { status: 404 })

  const novoEstoque = (produto.estoque_atual || 0) + quantidade

  await supabaseAdmin
    .from('produtos')
    .update({ estoque_atual: novoEstoque })
    .eq('id', produtoId)
    .eq('empresa_id', empresaId)

  await supabaseAdmin.from('estoque_movimentos').insert({
    produto_id: produtoId,
    tipo: 'entrada',
    quantidade,
    estoque_anterior: produto.estoque_atual || 0,
    estoque_posterior: novoEstoque,
    motivo: motivo || 'Entrada de mercadoria',
    empresa_id: empresaId,
  })

  return NextResponse.json({ result: true })
}

async function handleAjusteEstoque(params: {
  produtoId: string
  novaQuantidade: number
  motivo: string
}, empresaId: number) {
  const { produtoId, novaQuantidade, motivo } = params

  const { data: produto } = await supabaseAdmin
    .from('produtos')
    .select('estoque_atual')
    .eq('id', produtoId)
    .eq('empresa_id', empresaId)
    .single()

  if (!produto) return NextResponse.json({ error: 'Produto nao encontrado' }, { status: 404 })

  const diferenca = Math.abs(novaQuantidade - (produto.estoque_atual || 0))

  await supabaseAdmin
    .from('produtos')
    .update({ estoque_atual: novaQuantidade })
    .eq('id', produtoId)
    .eq('empresa_id', empresaId)

  await supabaseAdmin.from('estoque_movimentos').insert({
    produto_id: produtoId,
    tipo: 'ajuste',
    quantidade: diferenca,
    estoque_anterior: produto.estoque_atual || 0,
    estoque_posterior: novaQuantidade,
    motivo,
    empresa_id: empresaId,
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
}, empresaId: number) {
  await supabaseAdmin.from('estoque_movimentos').insert({
    produto_id: params.produto_id,
    tipo: params.tipo,
    quantidade: params.quantidade,
    estoque_anterior: params.estoque_anterior,
    estoque_posterior: params.estoque_posterior,
    motivo: params.motivo || null,
    comanda_id: params.comanda_id || null,
    usuario_id: params.usuario_id || null,
    empresa_id: empresaId,
  })

  return NextResponse.json({ result: true })
}

// ============================================
// EMPRESA
// ============================================

async function handleUpdateEmpresa(params: { updates: Record<string, unknown> }, empresaId: number) {
  const { data, error } = await supabaseAdmin
    .from('empresa')
    .update({ ...params.updates, updated_at: new Date().toISOString() })
    .eq('id', empresaId)
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
}, empresaId: number) {
  const { comandaId, formaPagamentoRecebimento } = params

  // Buscar comanda da mesma empresa
  const { data: comanda, error: fetchErr } = await supabaseAdmin
    .from('comandas')
    .select('*')
    .eq('id', comandaId)
    .eq('empresa_id', empresaId)
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
    .eq('empresa_id', empresaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Registrar entrada no caixa
  const { data: turno } = await supabaseAdmin
    .from('caixa_turnos')
    .select('id')
    .eq('status', 'aberto')
    .eq('empresa_id', empresaId)
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
    empresa_id: empresaId,
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
}, empresaId: number) {
  const { itemId, novaQuantidade, comandaId } = params

  if (novaQuantidade < 1) {
    return NextResponse.json({ error: 'Quantidade deve ser maior que zero' }, { status: 400 })
  }

  // Buscar item atual com produto
  const { data: item, error: itemErr } = await supabaseAdmin
    .from('comanda_itens')
    .select('*, produto:produtos(*)')
    .eq('id', itemId)
    .eq('empresa_id', empresaId)
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
    .eq('empresa_id', empresaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ajustar estoque se necessario
  if (produto?.controlar_estoque && diferenca !== 0) {
    const estoqueAtual = produto.estoque_atual || 0
    const novoEstoque = estoqueAtual - diferenca

    await supabaseAdmin
      .from('produtos')
      .update({ estoque_atual: novoEstoque })
      .eq('id', item.produto_id)
      .eq('empresa_id', empresaId)

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
      empresa_id: empresaId,
    })
  }

  // Recalcular total da comanda
  await recalcularTotal(comandaId)

  return NextResponse.json({ result: true })
}

// ============================================
// HELPERS INTERNOS
// ============================================

// ============================================
// FIADO - PAGAMENTO PARCIAL
// ============================================

async function handleReceberFiadoParcial(params: {
  comandaId: string
  valor: number
  formaPagamento: string
  clienteId: string
}, empresaId: number) {
  const { comandaId, valor, formaPagamento, clienteId } = params

  if (valor <= 0) {
    return NextResponse.json({ error: 'Valor deve ser maior que zero' }, { status: 400 })
  }

  // Buscar comanda
  const { data: comanda, error: fetchErr } = await supabaseAdmin
    .from('comandas')
    .select('*')
    .eq('id', comandaId)
    .eq('empresa_id', empresaId)
    .single()

  if (fetchErr || !comanda) {
    return NextResponse.json({ error: 'Comanda nao encontrada' }, { status: 404 })
  }

  if (!comanda.fiado || comanda.fiado_pago) {
    return NextResponse.json({ error: 'Esta comanda nao tem pagamento pendente' }, { status: 400 })
  }

  // Calcular valor ja pago a partir de fiado_pagamentos
  const { data: pagamentos } = await supabaseAdmin
    .from('fiado_pagamentos')
    .select('valor')
    .eq('comanda_id', comandaId)
    .eq('empresa_id', empresaId)

  const totalJaPago = (pagamentos || []).reduce((acc, p) => acc + Number(p.valor), 0)
  const saldoRestante = comanda.total - totalJaPago

  if (valor > saldoRestante + 0.01) {
    return NextResponse.json({ error: `Valor excede o saldo devedor (${saldoRestante.toFixed(2)})` }, { status: 400 })
  }

  // Registrar pagamento
  await supabaseAdmin.from('fiado_pagamentos').insert({
    comanda_id: comandaId,
    cliente_id: clienteId,
    valor,
    forma_pagamento: formaPagamento,
    empresa_id: empresaId,
  })

  // Verificar se quitou
  const novoTotalPago = totalJaPago + valor
  const quitado = novoTotalPago >= comanda.total - 0.01

  if (quitado) {
    await supabaseAdmin
      .from('comandas')
      .update({
        fiado_pago: true,
        fiado_pago_em: new Date().toISOString(),
      })
      .eq('id', comandaId)
      .eq('empresa_id', empresaId)
  }

  // Registrar entrada no caixa
  const { data: turno } = await supabaseAdmin
    .from('caixa_turnos')
    .select('id')
    .eq('status', 'aberto')
    .eq('empresa_id', empresaId)
    .order('aberto_em', { ascending: false })
    .limit(1)
    .single()

  await supabaseAdmin.from('caixa').insert({
    tipo: 'entrada',
    valor,
    descricao: `Pgto fiado - Comanda #${comanda.numero}${quitado ? ' (quitado)' : ' (parcial)'}`,
    forma_pagamento: formaPagamento,
    comanda_id: comandaId,
    turno_id: turno?.id || null,
    empresa_id: empresaId,
  })

  return NextResponse.json({ result: { quitado } })
}

// ============================================
// FIADO - ADICIONAR PRODUTOS A DIVIDA DO CLIENTE
// ============================================

async function handleAddItemToClienteDebt(params: {
  clienteId: string
  clienteNome: string
  itens: { produtoId: string; quantidade: number; observacao?: string }[]
}, empresaId: number) {
  const { clienteId, clienteNome, itens } = params

  if (!itens || itens.length === 0) {
    return NextResponse.json({ error: 'Adicione pelo menos um item' }, { status: 400 })
  }

  // Proximo numero de comanda
  const { data: lastComanda } = await supabaseAdmin
    .from('comandas')
    .select('numero')
    .eq('empresa_id', empresaId)
    .order('numero', { ascending: false })
    .limit(1)
  const numero = (lastComanda?.[0]?.numero || 0) + 1

  // Calcular total e validar produtos
  let total = 0
  const itensProcessados = []

  for (const item of itens) {
    const { data: produto } = await supabaseAdmin
      .from('produtos')
      .select('*')
      .eq('id', item.produtoId)
      .eq('empresa_id', empresaId)
      .single()

    if (!produto) {
      return NextResponse.json({ error: `Produto nao encontrado` }, { status: 404 })
    }

    // Validar estoque
    if (produto.controlar_estoque && (produto.estoque_atual || 0) < item.quantidade) {
      return NextResponse.json(
        { error: `Estoque insuficiente de ${produto.nome} (disponivel: ${produto.estoque_atual || 0})` },
        { status: 400 }
      )
    }

    const subtotal = produto.preco * item.quantidade
    total += subtotal
    itensProcessados.push({ ...item, produto, subtotal, precoUnitario: produto.preco })
  }

  // Criar comanda fechada como fiado
  const { data: comanda, error: cmdErr } = await supabaseAdmin
    .from('comandas')
    .insert({
      numero,
      tipo: 'balcao',
      status: 'fechada',
      total,
      desconto: 0,
      taxa_servico: 0,
      forma_pagamento: 'fiado',
      cliente_id: clienteId,
      cliente_nome: clienteNome,
      fiado: true,
      fiado_pago: false,
      aberta_em: new Date().toISOString(),
      fechada_em: new Date().toISOString(),
      empresa_id: empresaId,
    })
    .select()
    .single()

  if (cmdErr || !comanda) {
    return NextResponse.json({ error: 'Erro ao criar comanda' }, { status: 500 })
  }

  // Inserir itens e decrementar estoque
  for (const item of itensProcessados) {
    await supabaseAdmin.from('comanda_itens').insert({
      comanda_id: comanda.id,
      produto_id: item.produtoId,
      quantidade: item.quantidade,
      preco_unitario: item.precoUnitario,
      subtotal: item.subtotal,
      observacao: item.observacao || null,
      empresa_id: empresaId,
    })

    if (item.produto.controlar_estoque) {
      const novoEstoque = (item.produto.estoque_atual || 0) - item.quantidade
      await supabaseAdmin
        .from('produtos')
        .update({ estoque_atual: novoEstoque })
        .eq('id', item.produtoId)
        .eq('empresa_id', empresaId)

      await supabaseAdmin.from('estoque_movimentos').insert({
        produto_id: item.produtoId,
        tipo: 'venda',
        quantidade: item.quantidade,
        estoque_anterior: item.produto.estoque_atual || 0,
        estoque_posterior: novoEstoque,
        motivo: `Fiado - Comanda #${numero}`,
        comanda_id: comanda.id,
        empresa_id: empresaId,
      })
    }
  }

  return NextResponse.json({ result: comanda })
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
