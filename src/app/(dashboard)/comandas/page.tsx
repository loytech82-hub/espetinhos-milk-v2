'use client'

import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import type { Comanda } from '@/lib/types'

const filtros = ['todas', 'abertas', 'fechadas', 'delivery'] as const
type Filtro = (typeof filtros)[number]

export default function ComandasPage() {
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadComandas()
  }, [])

  async function loadComandas() {
    try {
      const { data } = await supabase
        .from('comandas')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setComandas(data)
    } catch (error) {
      console.error('Erro ao carregar comandas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtragem
  const filtered = comandas.filter((c) => {
    if (filtro === 'abertas' && c.status !== 'aberta') return false
    if (filtro === 'fechadas' && c.status !== 'fechada') return false
    if (filtro === 'delivery' && c.tipo !== 'delivery') return false
    if (busca) {
      const search = busca.toLowerCase()
      return (
        String(c.numero).includes(search) ||
        c.tipo.includes(search) ||
        (c.cliente_nome && c.cliente_nome.toLowerCase().includes(search))
      )
    }
    return true
  })

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-oswald)] text-3xl lg:text-4xl font-bold">
            COMANDAS
          </h1>
          <p className="font-mono text-sm text-text-muted">
            // gestao_de_pedidos
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
            nova_comanda
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filtros.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`h-9 px-4 rounded-2xl font-mono text-xs font-semibold transition-colors whitespace-nowrap ${
              filtro === f
                ? 'bg-orange text-text-dark'
                : 'bg-bg-elevated text-white hover:bg-bg-placeholder'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="font-mono text-text-muted">carregando...</span>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden">
          {/* Header da tabela */}
          <div className="hidden sm:grid grid-cols-5 h-11 px-5 bg-bg-card items-center">
            <span className="font-mono text-xs text-text-muted">comanda</span>
            <span className="font-mono text-xs text-text-muted">tipo</span>
            <span className="font-mono text-xs text-text-muted">itens</span>
            <span className="font-mono text-xs text-text-muted">valor</span>
            <span className="font-mono text-xs text-text-muted">status</span>
          </div>

          {/* Linhas */}
          <div className="space-y-px">
            {filtered.map((comanda) => (
              <a
                key={comanda.id}
                href={`/comandas/${comanda.id}`}
                className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-5 py-4 sm:h-14 bg-bg-card items-center hover:bg-bg-elevated transition-colors cursor-pointer"
              >
                <span className="font-mono text-[13px] text-white font-semibold">
                  #{String(comanda.numero).padStart(3, '0')}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 ${
                      comanda.tipo === 'mesa'
                        ? 'bg-orange'
                        : comanda.tipo === 'balcao'
                          ? 'bg-success'
                          : 'bg-purple-500'
                    }`}
                  />
                  <span className="font-mono text-[13px] text-white">
                    {comanda.tipo === 'mesa'
                      ? `mesa ${String(comanda.mesa_id).padStart(2, '0')}`
                      : comanda.tipo}
                  </span>
                </div>
                <span className="hidden sm:block font-mono text-[13px] text-white">
                  —
                </span>
                <span className="font-mono text-[13px] text-white">
                  {formatCurrency(comanda.total || 0)}
                </span>
                <div>
                  <span
                    className={`inline-flex px-3 py-1 rounded-2xl font-mono text-[11px] ${
                      comanda.status === 'aberta'
                        ? 'bg-success text-text-dark'
                        : comanda.status === 'fechada'
                          ? 'bg-bg-placeholder text-text-muted border border-[#3D3D3D]'
                          : 'bg-red-600 text-white'
                    }`}
                  >
                    {comanda.status.toUpperCase()}
                  </span>
                </div>
              </a>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="p-10 bg-bg-card text-center">
              <span className="font-mono text-sm text-text-muted">
                nenhuma_comanda_encontrada
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
