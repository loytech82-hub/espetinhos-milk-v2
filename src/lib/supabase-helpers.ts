import { supabase } from './supabase'
import type { Comanda, ComandaItem, Produto, CaixaMovimento, Mesa, Cliente, CaixaTurno, EstoqueMovimento, Empresa } from './types'

// Helper para chamar API de escrita (bypassa RLS via service_role)
async function apiCall<T = unknown>(action: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Erro na operacao')
  }
  return data.result as T
}

// ============================================
// COMANDAS
// ============================================

// Criar nova comanda (via API)
export async function createComanda(
  tipo: 'mesa' | 'balcao' | 'delivery',
  mesaId?: number | null,
  clienteNome?: string | null
): Promise<Comanda> {
  return apiCall<Comanda>('createComanda', { tipo, mesaId, clienteNome })
}

// Adicionar item a comanda (via API)
export async function addItemToComanda(
  comandaId: string,
  produtoId: string,
  quantidade: number,
  observacao?: string | null
): Promise<ComandaItem> {
  return apiCall<ComandaItem>('addItemToComanda', { comandaId, produtoId, quantidade, observacao })
}

// Remover item da comanda (via API dedicada)
export async function removeItemFromComanda(
  itemId: string,
  comandaId: string
): Promise<void> {
  const res = await fetch(`/api/comandas/${comandaId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Erro ao remover item')
}

// Fechar comanda (via API dedicada)
export async function closeComanda(
  comandaId: string,
  formaPagamento: string,
  desconto?: number
): Promise<void> {
  const res = await fetch(`/api/comandas/${comandaId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formaPagamento, desconto }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Erro ao fechar comanda')
}

// Cancelar comanda (via API dedicada)
export async function cancelComanda(comandaId: string): Promise<void> {
  const res = await fetch(`/api/comandas/${comandaId}`, { method: 'PATCH' })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Erro ao cancelar comanda')
}

// ============================================
// PRODUTOS
// ============================================

export async function createProduto(produto: Omit<Produto, 'id' | 'created_at'>): Promise<Produto> {
  return apiCall<Produto>('createProduto', { produto })
}

export async function updateProduto(id: string, updates: Partial<Produto>): Promise<Produto> {
  return apiCall<Produto>('updateProduto', { id, updates })
}

export async function toggleProdutoAtivo(id: string, ativo: boolean): Promise<void> {
  await apiCall('toggleProdutoAtivo', { id, ativo })
}

// ============================================
// CLIENTES
// ============================================

export async function createCliente(cliente: { nome: string; telefone?: string; endereco?: string }): Promise<Cliente> {
  return apiCall<Cliente>('createCliente', { cliente })
}

export async function updateCliente(id: string, updates: Partial<Cliente>): Promise<Cliente> {
  return apiCall<Cliente>('updateCliente', { id, updates })
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
  return apiCall<CaixaMovimento>('createCaixaMovimento', movimento)
}

// ============================================
// MESAS
// ============================================

export async function createMesa(numero: number): Promise<Mesa> {
  return apiCall<Mesa>('createMesa', { numero })
}

export async function updateMesaStatus(id: number, status: Mesa['status']): Promise<void> {
  await apiCall('updateMesaStatus', { id, status })
}

export async function deleteMesa(id: number): Promise<void> {
  await apiCall('deleteMesa', { id })
}

// ============================================
// TURNOS DO CAIXA
// ============================================

// Buscar turno aberto (leitura — usa supabase client direto)
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

// Abrir turno do caixa (via API dedicada)
export async function abrirTurno(
  valorAbertura: number,
  observacao?: string
): Promise<CaixaTurno> {
  const res = await fetch('/api/caixa/turno', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valor_abertura: valorAbertura, observacao }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Erro ao abrir turno')
  return data as CaixaTurno
}

// Fechar turno do caixa (via API)
export async function fecharTurno(
  turnoId: number,
  valorFechamento: number,
  observacao?: string
): Promise<void> {
  await apiCall('fecharTurno', { turnoId, valorFechamento, observacao })
}

// ============================================
// ESTOQUE - MOVIMENTACOES
// ============================================

// Registrar movimentacao de estoque (via API)
export async function registrarMovimentoEstoque(params: {
  produto_id: string
  tipo: 'entrada' | 'saida' | 'ajuste' | 'venda' | 'cancelamento'
  quantidade: number
  estoque_anterior: number
  estoque_posterior: number
  motivo?: string
  comanda_id?: string
}): Promise<void> {
  await apiCall('registrarMovimentoEstoque', params)
}

// Entrada de estoque (via API)
export async function entradaEstoque(
  produtoId: string,
  quantidade: number,
  motivo?: string
): Promise<void> {
  await apiCall('entradaEstoque', { produtoId, quantidade, motivo })
}

// Ajuste manual de estoque (via API)
export async function ajusteEstoque(
  produtoId: string,
  novaQuantidade: number,
  motivo: string
): Promise<void> {
  await apiCall('ajusteEstoque', { produtoId, novaQuantidade, motivo })
}

// Buscar movimentacoes de estoque (leitura — usa supabase client)
export async function getMovimentosEstoque(filtros?: {
  produto_id?: string
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

// Buscar produtos com estoque baixo (leitura — usa supabase client)
export async function getProdutosEstoqueBaixo(): Promise<Produto[]> {
  const { data } = await supabase
    .from('produtos')
    .select('*')
    .eq('ativo', true)
    .eq('controlar_estoque', true)

  if (!data) return []
  return data.filter(p => (p.estoque_atual || 0) <= p.estoque_minimo) as Produto[]
}

// ============================================
// UPLOAD DE IMAGENS (usa storage direto)
// ============================================

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

export async function deleteImage(bucket: string, url: string): Promise<void> {
  const parts = url.split('/')
  const fileName = parts[parts.length - 1]
  if (!fileName) return

  await supabase.storage.from(bucket).remove([fileName])
}

// ============================================
// EMPRESA
// ============================================

// Buscar dados da empresa (leitura — usa supabase client)
export async function getEmpresa(): Promise<Empresa | null> {
  const { data } = await supabase
    .from('empresa')
    .select('*')
    .eq('id', 1)
    .single()

  return data as Empresa | null
}

// Atualizar dados da empresa (via API)
export async function updateEmpresa(updates: Partial<Empresa>): Promise<Empresa> {
  return apiCall<Empresa>('updateEmpresa', { updates })
}
