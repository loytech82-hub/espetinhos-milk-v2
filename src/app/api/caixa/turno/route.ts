import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-server'

// Extrair usuario logado dos cookies
async function getAuthUserId(request: NextRequest): Promise<string | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

// POST /api/caixa/turno — Abrir turno do caixa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { valor_abertura, observacao } = body

    // Buscar usuario logado
    const userId = await getAuthUserId(request)

    // Verificar se ja existe turno aberto
    const { data: turnoExistente } = await supabaseAdmin
      .from('caixa_turnos')
      .select('id')
      .eq('status', 'aberto')
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
        usuario_id: userId,
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
