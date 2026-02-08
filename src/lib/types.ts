// Tipos das tabelas do Supabase
// IDs: mesas=number, demais=string (UUID)
export interface Mesa {
  id: number
  numero: number
  status: 'livre' | 'ocupada' | 'reservada'
  created_at: string
}

export interface Comanda {
  id: string
  numero: number
  tipo: 'mesa' | 'balcao' | 'delivery'
  mesa_id: number | null
  status: 'aberta' | 'fechada' | 'cancelada'
  total: number
  desconto: number
  taxa_servico: number
  forma_pagamento: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | null
  cliente_nome: string | null
  cliente_id: string | null
  usuario_id: string | null
  aberta_em: string
  fechada_em: string | null
}

export interface ComandaItem {
  id: string
  comanda_id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
  subtotal: number
  observacao: string | null
  created_at: string
  produto?: Produto
}

export interface Produto {
  id: string
  nome: string
  preco: number
  categoria: string
  estoque_atual: number | null
  estoque_minimo: number
  controlar_estoque: boolean
  ativo: boolean
  created_at: string
}

export interface CaixaMovimento {
  id: string
  tipo: 'entrada' | 'saida'
  valor: number
  descricao: string
  forma_pagamento: string | null
  comanda_id: string | null
  turno_id: number | null
  created_at: string
}

export interface Cliente {
  id: string
  nome: string
  telefone: string | null
  endereco: string | null
  created_at: string
}

export type UserRole = 'admin' | 'caixa' | 'garcom'

export interface Profile {
  id: string
  nome: string
  email: string
  role: UserRole
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface CaixaTurno {
  id: number
  usuario_id: string
  valor_abertura: number
  valor_fechamento: number | null
  total_entradas: number
  total_saidas: number
  total_vendas: number
  status: 'aberto' | 'fechado'
  observacao_abertura: string | null
  observacao_fechamento: string | null
  aberto_em: string
  fechado_em: string | null
}

export interface EstoqueMovimento {
  id: number
  produto_id: string
  tipo: 'entrada' | 'saida' | 'ajuste' | 'venda' | 'cancelamento'
  quantidade: number
  estoque_anterior: number
  estoque_posterior: number
  motivo: string | null
  usuario_id: string | null
  comanda_id: string | null
  created_at: string
  produto?: Produto
}

export interface Categoria {
  id: number
  nome: string
  cor: string
  icone: string
  ordem: number
  ativo: boolean
  created_at: string
}

export interface Empresa {
  id: number
  nome: string
  endereco: string | null
  telefone: string | null
  cnpj: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}
