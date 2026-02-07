import { supabase } from './supabase'
import type { Comanda, ComandaItem, Produto, CaixaMovimento, Mesa, Cliente, CaixaTurno, EstoqueMovimento, Empresa } from './types'

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
  const novoEstoque = produto.estoque - quantidade
  await supabase
    .from('produtos')
    .update({ estoque: novoEstoque })
    .eq('id', produtoId)

  // Registrar movimentacao de estoque
  await registrarMovimentoEstoque({
    produto_id: produtoId,
    tipo: 'venda',
    quantidade,
    estoque_anterior: produto.estoque,
    estoque_posterior: novoEstoque,
    motivo: `Comanda #${comandaId}`,
    comanda_id: comandaId,
  })

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
    const novoEstoque = item.produto.estoque + item.quantidade
    await supabase
      .from('produtos')
      .update({ estoque: novoEstoque })
      .eq('id', item.produto_id)

    // Registrar movimentacao de estoque
    await registrarMovimentoEstoque({
      produto_id: item.produto_id,
      tipo: 'cancelamento',
      quantidade: item.quantidade,
      estoque_anterior: item.produto.estoque,
      estoque_posterior: novoEstoque,
      motivo: `Item removido da comanda #${comandaId}`,
      comanda_id: comandaId,
    })
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

  // Buscar turno aberto para vincular
  const turnoAberto = await getTurnoAberto()

  // Registrar entrada no caixa
  await supabase.from('caixa').insert({
    tipo: 'entrada',
    valor: comanda.total,
    descricao: `Comanda #${comanda.numero} (${comanda.tipo})`,
    forma_pagamento: formaPagamento,
    comanda_id: comandaId,
    turno_id: turnoAberto?.id || null,
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
        const novoEstoque = item.produto.estoque + item.quantidade
        await supabase
          .from('produtos')
          .update({ estoque: novoEstoque })
          .eq('id', item.produto_id)

        await registrarMovimentoEstoque({
          produto_id: item.produto_id,
          tipo: 'cancelamento',
          quantidade: item.quantidade,
          estoque_anterior: item.produto.estoque,
          estoque_posterior: novoEstoque,
          motivo: `Comanda #${comandaId} cancelada`,
          comanda_id: comandaId,
        })
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
  // Vincular ao turno aberto automaticamente
  const turno = await getTurnoAberto()

  const { data, error } = await supabase
    .from('caixa')
    .insert({
      ...movimento,
      turno_id: turno?.id || null,
    })
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

// ============================================
// TURNOS DO CAIXA
// ============================================

// Buscar turno aberto
export async function getTurnoAberto(): Promise<CaixaTurno | null> {
  const { data } = await supabase
    .from('caixa_turnos')
    .select('*')
    .eq('status', 'aberto')
    .order('aberto_em', { ascending: false })
    .limit(1)
    .single()

  return data as CaixaTurno | null
}

// Abrir turno do caixa
export async function abrirTurno(
  valorAbertura: number,
  observacao?: string
): Promise<CaixaTurno> {
  // Verificar se ja existe turno aberto
  const turnoExistente = await getTurnoAberto()
  if (turnoExistente) throw new Error('Ja existe um turno aberto. Feche-o antes de abrir outro.')

  const { data, error } = await supabase
    .from('caixa_turnos')
    .insert({
      valor_abertura: valorAbertura,
      observacao_abertura: observacao || null,
      status: 'aberto',
    })
    .select()
    .single()

  if (error) throw new Error(`Erro ao abrir turno: ${error.message}`)
  return data as CaixaTurno
}

// Fechar turno do caixa
export async function fecharTurno(
  turnoId: number,
  valorFechamento: number,
  observacao?: string
): Promise<void> {
  // Calcular totais do turno
  const { data: movimentos } = await supabase
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

  // Calcular vendas do turno
  const { data: turno } = await supabase
    .from('caixa_turnos')
    .select('*')
    .eq('id', turnoId)
    .single()

  const { error } = await supabase
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

  if (error) throw new Error(`Erro ao fechar turno: ${error.message}`)
}

// ============================================
// ESTOQUE - MOVIMENTACOES
// ============================================

// Registrar movimentacao de estoque
export async function registrarMovimentoEstoque(params: {
  produto_id: number
  tipo: 'entrada' | 'saida' | 'ajuste' | 'venda' | 'cancelamento'
  quantidade: number
  estoque_anterior: number
  estoque_posterior: number
  motivo?: string
  comanda_id?: number
}): Promise<void> {
  await supabase.from('estoque_movimentos').insert({
    produto_id: params.produto_id,
    tipo: params.tipo,
    quantidade: params.quantidade,
    estoque_anterior: params.estoque_anterior,
    estoque_posterior: params.estoque_posterior,
    motivo: params.motivo || null,
    comanda_id: params.comanda_id || null,
  })
}

// Entrada de estoque (compra de mercadoria)
export async function entradaEstoque(
  produtoId: number,
  quantidade: number,
  motivo?: string
): Promise<void> {
  // Buscar estoque atual
  const { data: produto } = await supabase
    .from('produtos')
    .select('estoque')
    .eq('id', produtoId)
    .single()

  if (!produto) throw new Error('Produto nao encontrado')

  const novoEstoque = produto.estoque + quantidade

  // Atualizar estoque
  await supabase
    .from('produtos')
    .update({ estoque: novoEstoque })
    .eq('id', produtoId)

  // Registrar movimentacao
  await registrarMovimentoEstoque({
    produto_id: produtoId,
    tipo: 'entrada',
    quantidade,
    estoque_anterior: produto.estoque,
    estoque_posterior: novoEstoque,
    motivo: motivo || 'Entrada de mercadoria',
  })
}

// Ajuste manual de estoque
export async function ajusteEstoque(
  produtoId: number,
  novaQuantidade: number,
  motivo: string
): Promise<void> {
  // Buscar estoque atual
  const { data: produto } = await supabase
    .from('produtos')
    .select('estoque')
    .eq('id', produtoId)
    .single()

  if (!produto) throw new Error('Produto nao encontrado')

  const diferenca = Math.abs(novaQuantidade - produto.estoque)

  // Atualizar estoque
  await supabase
    .from('produtos')
    .update({ estoque: novaQuantidade })
    .eq('id', produtoId)

  // Registrar movimentacao
  await registrarMovimentoEstoque({
    produto_id: produtoId,
    tipo: 'ajuste',
    quantidade: diferenca,
    estoque_anterior: produto.estoque,
    estoque_posterior: novaQuantidade,
    motivo,
  })
}

// Buscar movimentacoes de estoque
export async function getMovimentosEstoque(filtros?: {
  produto_id?: number
  tipo?: string
  data_inicio?: string
  data_fim?: string
}): Promise<EstoqueMovimento[]> {
  let query = supabase
    .from('estoque_movimentos')
    .select('*, produto:produtos(id, nome, categoria)')
    .order('created_at', { ascending: false })

  if (filtros?.produto_id) {
    query = query.eq('produto_id', filtros.produto_id)
  }
  if (filtros?.tipo) {
    query = query.eq('tipo', filtros.tipo)
  }
  if (filtros?.data_inicio) {
    query = query.gte('created_at', filtros.data_inicio)
  }
  if (filtros?.data_fim) {
    query = query.lte('created_at', filtros.data_fim)
  }

  const { data } = await query.limit(200)
  return (data || []) as EstoqueMovimento[]
}

// Buscar produtos com estoque baixo
export async function getProdutosEstoqueBaixo(): Promise<Produto[]> {
  const { data } = await supabase
    .from('produtos')
    .select('*')
    .eq('ativo', true)
    .filter('estoque', 'lte', 'estoque_minimo' as never)

  // Filtrar no cliente (Supabase nao suporta comparar 2 colunas diretamente)
  if (!data) return []
  return data.filter(p => p.estoque <= p.estoque_minimo) as Produto[]
}

// ============================================
// UPLOAD DE IMAGENS
// ============================================

// Upload de imagem para Supabase Storage
export async function uploadImage(bucket: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, { cacheControl: '3600', upsert: false })

  if (error) throw new Error(`Erro ao enviar imagem: ${error.message}`)

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
  return data.publicUrl
}

// Remover imagem do Supabase Storage
export async function deleteImage(bucket: string, url: string): Promise<void> {
  // Extrair nome do arquivo da URL publica
  const parts = url.split('/')
  const fileName = parts[parts.length - 1]
  if (!fileName) return

  await supabase.storage.from(bucket).remove([fileName])
}

// ============================================
// EMPRESA
// ============================================

// Buscar dados da empresa
export async function getEmpresa(): Promise<Empresa | null> {
  const { data } = await supabase
    .from('empresa')
    .select('*')
    .eq('id', 1)
    .single()

  return data as Empresa | null
}

// Atualizar dados da empresa
export async function updateEmpresa(updates: Partial<Empresa>): Promise<Empresa> {
  const { data, error } = await supabase
    .from('empresa')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single()

  if (error) throw new Error(`Erro ao salvar dados da empresa: ${error.message}`)
  return data as Empresa
}
