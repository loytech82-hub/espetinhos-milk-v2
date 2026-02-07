// Tipos das tabelas do Supabase
export interface Mesa {
  id: number
  numero: number
  status: 'livre' | 'ocupada' | 'reservada'
  created_at: string
}

export interface Comanda {
  id: number
  numero: number
  tipo: 'mesa' | 'balcao' | 'delivery'
  mesa_id: number | null
  status: 'aberta' | 'fechada' | 'cancelada'
  total: number
  forma_pagamento: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | null
  cliente_nome: string | null
  created_at: string
  closed_at: string | null
}

export interface ComandaItem {
  id: number
  comanda_id: number
  produto_id: number
  quantidade: number
  preco_unitario: number
  subtotal: number
  observacao: string | null
  created_at: string
  produto?: Produto
}

export interface Produto {
  id: number
  nome: string
  preco: number
  categoria: string
  estoque: number
  estoque_minimo: number
  imagem_url: string | null
  ativo: boolean
  created_at: string
}

export interface CaixaMovimento {
  id: number
  tipo: 'entrada' | 'saida'
  valor: number
  descricao: string
  forma_pagamento: string | null
  comanda_id: number | null
  created_at: string
}

export interface Cliente {
  id: number
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
  produto_id: number
  tipo: 'entrada' | 'saida' | 'ajuste' | 'venda' | 'cancelamento'
  quantidade: number
  estoque_anterior: number
  estoque_posterior: number
  motivo: string | null
  usuario_id: string | null
  comanda_id: number | null
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
