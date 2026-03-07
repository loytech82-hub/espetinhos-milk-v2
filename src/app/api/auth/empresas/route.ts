import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Lista publica de empresas (apenas id e nome) para login de garcom
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('empresa')
      .select('id, nome')
      .order('nome')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
