'use client'

import { useEffect, useState } from 'react'
import { ArrowUpCircle, ArrowDownCircle, Plus, Wallet, Lock, Unlock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { getTurnoAberto } from '@/lib/supabase-helpers'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { NovoMovimentoModal } from '@/components/caixa/novo-movimento-modal'
import { AbrirTurnoModal } from '@/components/caixa/abrir-turno-modal'
import { FecharTurnoModal } from '@/components/caixa/fechar-turno-modal'
import { useAuth } from '@/lib/auth-context'
import { AccessDenied } from '@/components/ui/access-denied'
import type { CaixaMovimento, CaixaTurno } from '@/lib/types'

export default function CaixaPage() {
  const { role } = useAuth()
  const [movimentos, setMovimentos] = useState<CaixaMovimento[]>([])
  const [turno, setTurno] = useState<CaixaTurno | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [abrirTurnoOpen, setAbrirTurnoOpen] = useState(false)
  const [fecharTurnoOpen, setFecharTurnoOpen] = useState(false)

  useEffect(() => {
    loadCaixa()
  }, [])

  async function loadCaixa() {
    try {
      // Buscar turno aberto
      const turnoAberto = await getTurnoAberto()
      setTurno(turnoAberto)

      if (turnoAberto) {
        // Movimentos do turno atual
        const { data } = await supabase
          .from('caixa')
          .select('*')
          .eq('turno_id', turnoAberto.id)
          .order('created_at', { ascending: false })
        if (data) setMovimentos(data)
      } else {
        // Sem turno aberto, mostrar movimentos de hoje
        const hoje = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('caixa')
          .select('*')
          .gte('created_at', hoje)
          .order('created_at', { ascending: false })
        if (data) setMovimentos(data)
      }
    } catch (error) {
      console.error('Erro ao carregar caixa:', error)
    } finally {
      setLoading(false)
    }
  }

  const entradas = movimentos.filter((m) => m.tipo === 'entrada').reduce((acc, m) => acc + m.valor, 0)
  const saidas = movimentos.filter((m) => m.tipo === 'saida').reduce((acc, m) => acc + m.valor, 0)
  const saldo = (turno?.valor_abertura || 0) + entradas - saidas

  const horaAbertura = turno
    ? new Date(turno.aberto_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  // Admin e caixa podem acessar
  if (role === 'garcom') return <AccessDenied message="Garcons nao tem acesso ao caixa" />

  return (
    <div className="p-6 lg:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold">CAIXA</h1>
          <p className="text-sm text-text-muted">
            {turno ? `Aberto desde ${horaAbertura}` : 'Caixa fechado'}
          </p>
        </div>
        <div className="flex gap-3">
          {turno ? (
            <>
              <Button onClick={() => setModalOpen(true)} variant="primary">
                <Plus className="w-4 h-4" />
                Novo Movimento
              </Button>
              <Button onClick={() => setFecharTurnoOpen(true)} variant="danger">
                <Lock className="w-4 h-4" />
                Fechar Caixa
              </Button>
            </>
          ) : (
            <Button onClick={() => setAbrirTurnoOpen(true)} variant="success" size="lg">
              <Unlock className="w-4 h-4" />
              Abrir Caixa
            </Button>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {turno && (
          <div className="flex flex-col gap-3 p-5 bg-bg-card rounded-2xl">
            <span className="text-xs text-text-muted">ABERTURA</span>
            <span className="font-heading text-2xl font-bold text-text-white">
              {formatCurrency(turno.valor_abertura)}
            </span>
          </div>
        )}
        <div className="flex flex-col gap-3 p-5 bg-bg-card rounded-2xl">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-success" />
            <span className="text-xs text-text-muted">ENTRADAS</span>
          </div>
          <span className="font-heading text-2xl font-bold text-success">
            {formatCurrency(entradas)}
          </span>
        </div>
        <div className="flex flex-col gap-3 p-5 bg-bg-card rounded-2xl">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4 text-danger" />
            <span className="text-xs text-text-muted">SAIDAS</span>
          </div>
          <span className="font-heading text-2xl font-bold text-danger">
            {formatCurrency(saidas)}
          </span>
        </div>
        <div className="flex flex-col gap-3 p-5 bg-orange rounded-2xl">
          <span className="text-xs text-text-dark">SALDO</span>
          <span className="font-heading text-2xl font-bold text-text-dark">
            {formatCurrency(saldo)}
          </span>
        </div>
      </div>

      {/* Aviso de caixa fechado */}
      {!turno && !loading && (
        <div className="flex flex-col items-center gap-4 py-10 px-6 bg-bg-card rounded-2xl text-center">
          <Lock className="w-10 h-10 text-text-muted" />
          <div>
            <p className="font-heading text-lg font-semibold text-text-white">Caixa Fechado</p>
            <p className="text-sm text-text-muted mt-1">Abra o caixa para registrar movimentos e vendas</p>
          </div>
          <Button onClick={() => setAbrirTurnoOpen(true)} variant="success" size="lg">
            <Unlock className="w-4 h-4" />
            Abrir Caixa
          </Button>
        </div>
      )}

      {/* Lista de movimentos */}
      {turno && (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-text-muted">carregando...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-semibold">Movimentos do Turno</h2>
            {movimentos.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Nenhum movimento"
                description="Os movimentos deste turno aparecerao aqui"
              />
            ) : (
              <div className="rounded-2xl overflow-hidden space-y-px">
                {movimentos.map((mov) => (
                  <div
                    key={mov.id}
                    className="flex items-center justify-between gap-4 px-5 py-4 bg-bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {mov.tipo === 'entrada' ? (
                        <ArrowUpCircle className="w-5 h-5 text-success shrink-0" />
                      ) : (
                        <ArrowDownCircle className="w-5 h-5 text-danger shrink-0" />
                      )}
                      <div>
                        <p className="text-[13px] text-text-white font-medium">
                          {mov.descricao}
                        </p>
                        <p className="text-xs text-text-muted">
                          {mov.forma_pagamento || 'caixa'} ·{' '}
                          {new Date(mov.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-heading text-[15px] font-bold ${
                        mov.tipo === 'entrada' ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {mov.tipo === 'entrada' ? '+' : '-'}
                      {formatCurrency(mov.valor)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* Modais */}
      <NovoMovimentoModal open={modalOpen} onOpenChange={setModalOpen} onCreated={loadCaixa} />
      <AbrirTurnoModal open={abrirTurnoOpen} onOpenChange={setAbrirTurnoOpen} onCreated={loadCaixa} />
      <FecharTurnoModal open={fecharTurnoOpen} onOpenChange={setFecharTurnoOpen} turno={turno} entradas={entradas} saidas={saidas} onClosed={loadCaixa} />
    </div>
  )
}
