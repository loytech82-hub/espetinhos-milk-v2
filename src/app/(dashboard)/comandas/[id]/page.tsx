'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, CreditCard } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import type { Comanda, ComandaItem, Produto } from '@/lib/types'

export default function ComandaDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const [comanda, setComanda] = useState<Comanda | null>(null)
  const [itens, setItens] = useState<ComandaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) loadComanda(params.id as string)
  }, [params.id])

  async function loadComanda(id: string) {
    try {
      const { data: comandaData } = await supabase
        .from('comandas')
        .select('*')
        .eq('id', id)
        .single()
      if (comandaData) setComanda(comandaData)

      const { data: itensData } = await supabase
        .from('comanda_itens')
        .select('*, produto:produtos(*)')
        .eq('comanda_id', id)
      if (itensData) setItens(itensData)
    } catch (error) {
      console.error('Erro ao carregar comanda:', error)
    } finally {
      setLoading(false)
    }
  }

  async function removeItem(itemId: number) {
    await supabase.from('comanda_itens').delete().eq('id', itemId)
    setItens(itens.filter((i) => i.id !== itemId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="font-mono text-text-muted">carregando...</span>
      </div>
    )
  }

  if (!comanda) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="font-mono text-text-muted">comanda_nao_encontrada</span>
      </div>
    )
  }

  const total = itens.reduce((acc, i) => acc + i.subtotal, 0)

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center bg-bg-elevated rounded-2xl hover:bg-bg-placeholder transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="font-[family-name:var(--font-oswald)] text-3xl font-bold">
            COMANDA #{String(comanda.numero).padStart(3, '0')}
          </h1>
          <p className="font-mono text-sm text-text-muted">
            {comanda.tipo === 'mesa'
              ? `mesa ${String(comanda.mesa_id).padStart(2, '0')}`
              : comanda.tipo}{' '}
            · {new Date(comanda.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-2xl font-mono text-[11px] ${
            comanda.status === 'aberta'
              ? 'bg-success text-text-dark'
              : 'bg-bg-placeholder text-text-muted border border-[#3D3D3D]'
          }`}
        >
          {comanda.status.toUpperCase()}
        </span>
      </div>

      {/* Itens */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-oswald)] text-xl font-semibold">
            ITENS
          </h2>
          {comanda.status === 'aberta' && (
            <button className="inline-flex items-center gap-2 h-9 px-4 bg-orange text-text-dark font-mono text-xs font-semibold rounded-2xl hover:bg-orange-hover transition-colors">
              <Plus className="w-3.5 h-3.5" />
              adicionar
            </button>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden space-y-px">
          {itens.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 px-5 py-4 bg-bg-card"
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[13px] text-white">
                  {(item.produto as unknown as Produto)?.nome || `produto_${item.produto_id}`}
                </p>
                <p className="font-mono text-xs text-text-muted">
                  {item.quantidade}x {formatCurrency(item.preco_unitario)}
                  {item.observacao && ` · ${item.observacao}`}
                </p>
              </div>
              <span className="font-mono text-[13px] text-white font-semibold">
                {formatCurrency(item.subtotal)}
              </span>
              {comanda.status === 'aberta' && (
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-text-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {itens.length === 0 && (
            <div className="p-10 bg-bg-card text-center">
              <span className="font-mono text-sm text-text-muted">
                nenhum_item_adicionado
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Total + Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-bg-card rounded-2xl">
        <div>
          <span className="font-mono text-xs text-text-muted">TOTAL</span>
          <p className="font-[family-name:var(--font-oswald)] text-3xl font-bold text-orange">
            {formatCurrency(total)}
          </p>
        </div>
        {comanda.status === 'aberta' && (
          <button className="inline-flex items-center gap-2 h-10 px-6 bg-orange text-text-dark font-mono text-xs font-semibold rounded-2xl hover:bg-orange-hover transition-colors">
            <CreditCard className="w-4 h-4" />
            fechar_comanda
          </button>
        )}
      </div>
    </div>
  )
}
