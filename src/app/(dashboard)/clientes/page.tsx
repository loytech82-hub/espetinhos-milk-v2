'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Cliente {
  id: number
  nome: string
  telefone: string | null
  endereco: string | null
  total_pedidos: number
  created_at: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClientes()
  }, [])

  async function loadClientes() {
    try {
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .order('nome')
      if (data) setClientes(data)
    } catch {
      // Tabela pode não existir ainda
    } finally {
      setLoading(false)
    }
  }

  const filtered = clientes.filter((c) =>
    busca ? c.nome.toLowerCase().includes(busca.toLowerCase()) : true
  )

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-oswald)] text-3xl lg:text-4xl font-bold">
            CLIENTES
          </h1>
          <p className="font-mono text-sm text-text-muted">
            // base_de_clientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 h-10 px-4 bg-bg-elevated rounded-2xl">
            <Search className="w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent font-mono text-xs text-white placeholder:text-text-muted outline-none w-32"
            />
          </div>
          <button className="inline-flex items-center gap-2 h-10 px-5 bg-orange text-text-dark font-mono text-xs font-semibold rounded-2xl hover:bg-orange-hover transition-colors">
            <Plus className="w-4 h-4" />
            novo_cliente
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="font-mono text-text-muted">carregando...</span>
        </div>
      ) : filtered.length > 0 ? (
        <div className="rounded-2xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-4 h-11 px-5 bg-bg-card items-center">
            <span className="font-mono text-xs text-text-muted">nome</span>
            <span className="font-mono text-xs text-text-muted">telefone</span>
            <span className="font-mono text-xs text-text-muted">endereco</span>
            <span className="font-mono text-xs text-text-muted">pedidos</span>
          </div>
          <div className="space-y-px">
            {filtered.map((cliente) => (
              <div
                key={cliente.id}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-4 sm:h-14 bg-bg-card items-center hover:bg-bg-elevated transition-colors"
              >
                <span className="font-mono text-[13px] text-white">
                  {cliente.nome}
                </span>
                <span className="font-mono text-[13px] text-text-muted">
                  {cliente.telefone || '—'}
                </span>
                <span className="hidden sm:block font-mono text-[13px] text-text-muted truncate">
                  {cliente.endereco || '—'}
                </span>
                <span className="font-mono text-[13px] text-white">
                  {cliente.total_pedidos || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Users className="w-12 h-12 text-text-muted" />
          <span className="font-mono text-sm text-text-muted">
            nenhum_cliente_cadastrado
          </span>
        </div>
      )}
    </div>
  )
}
