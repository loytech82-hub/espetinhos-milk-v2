import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Lista garcons de uma empresa (para tela de login)
export async function GET(request: NextRequest) {
  const empresaId = request.nextUrl.searchParams.get('empresaId')

  if (!empresaId) {
    return NextResponse.json({ error: 'empresaId obrigatorio' }, { status: 400 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, nome')
      .eq('empresa_id', Number(empresaId))
      .eq('role', 'garcom')
      .eq('ativo', true)
      .order('nome')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
