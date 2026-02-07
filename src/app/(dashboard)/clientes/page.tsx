'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { EmptyState } from '@/components/ui/empty-state'
import { ClienteModal } from '@/components/clientes/cliente-modal'
import type { Cliente } from '@/lib/types'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<(Cliente & { total_pedidos?: number })[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCliente, setEditCliente] = useState<Cliente | null>(null)

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
      // Tabela pode nao existir ainda
    } finally {
      setLoading(false)
    }
  }

  const filtered = clientes.filter((c) =>
    busca ? c.nome.toLowerCase().includes(busca.toLowerCase()) : true
  )

  function handleEdit(cliente: Cliente) {
    setEditCliente(cliente)
    setModalOpen(true)
  }

  function handleNew() {
    setEditCliente(null)
    setModalOpen(true)
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold">CLIENTES</h1>
          <p className="text-sm text-text-muted">Seus clientes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 h-10 px-4 bg-bg-elevated rounded-2xl">
            <Search className="w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent text-xs text-text-white placeholder:text-text-muted outline-none w-32"
            />
          </div>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 h-10 px-5 bg-orange text-text-dark font-heading text-sm font-semibold rounded-2xl hover:bg-orange-hover transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-text-muted">carregando...</span>
        </div>
      ) : filtered.length > 0 ? (
        <div className="rounded-2xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-4 h-11 px-5 bg-bg-card items-center">
            <span className="text-xs text-text-muted">Nome</span>
            <span className="text-xs text-text-muted">Telefone</span>
            <span className="text-xs text-text-muted">Endereco</span>
            <span className="text-xs text-text-muted">Desde</span>
          </div>
          <div className="space-y-px">
            {filtered.map((cliente) => (
              <div
                key={cliente.id}
                onClick={() => handleEdit(cliente)}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-4 sm:h-14 bg-bg-card items-center hover:bg-bg-elevated transition-colors cursor-pointer"
              >
                <span className="text-[13px] text-text-white font-medium">
                  {cliente.nome}
                </span>
                <span className="text-[13px] text-text-muted">
                  {cliente.telefone || '—'}
                </span>
                <span className="hidden sm:block text-[13px] text-text-muted truncate">
                  {cliente.endereco || '—'}
                </span>
                <span className="text-[13px] text-text-muted">
                  {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Nenhum cliente cadastrado"
          description="Cadastre clientes para o delivery"
        />
      )}

      <ClienteModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditCliente(null) }}
        cliente={editCliente}
        onSaved={loadClientes}
      />
    </div>
  )
}
