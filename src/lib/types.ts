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
