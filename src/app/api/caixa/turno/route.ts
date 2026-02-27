import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getRequestContext } from '@/lib/supabase-server'

// POST /api/caixa/turno — Abrir turno do caixa
export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequestContext(request)
    const body = await request.json()
    const { valor_abertura, observacao } = body

    // Verificar se ja existe turno aberto na mesma empresa
    const { data: turnoExistente } = await supabaseAdmin
      .from('caixa_turnos')
      .select('id')
      .eq('status', 'aberto')
      .eq('empresa_id', ctx.empresaId)
      .limit(1)

    if (turnoExistente && turnoExistente.length > 0) {
      return NextResponse.json(
        { error: 'Ja existe um turno aberto. Feche-o antes de abrir outro.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('caixa_turnos')
      .insert({
        valor_abertura,
        observacao_abertura: observacao || null,
        status: 'aberto',
        usuario_id: ctx.userId,
        empresa_id: ctx.empresaId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
