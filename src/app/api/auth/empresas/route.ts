import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Lista empresas que possuem pelo menos um garcom ativo (para login de garcom)
export async function GET() {
  try {
    // Buscar empresa_ids que tem garcons ativos
    const { data: garconProfiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('empresa_id')
      .eq('role', 'garcom')
      .eq('ativo', true)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // IDs unicos de empresas com garcons
    const empresaIds = [...new Set((garconProfiles || []).map(p => p.empresa_id).filter(Boolean))]

    if (empresaIds.length === 0) {
      return NextResponse.json([])
    }

    const { data, error } = await supabaseAdmin
      .from('empresa')
      .select('id, nome')
      .in('id', empresaIds)
      .order('nome')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
