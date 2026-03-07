import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getRequestContext } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Excluir garcom (desativa profile e remove auth user)
export async function POST(request: NextRequest) {
  try {
    const { empresaId } = await getRequestContext(request)
    const body = await request.json().catch(() => ({}))
    const garcomId = body.garcomId as string | undefined

    if (!garcomId) {
      return NextResponse.json({ error: 'garcomId obrigatorio' }, { status: 400 })
    }

    // Verificar se o garcom pertence a mesma empresa
    const { data: garcom } = await supabaseAdmin
      .from('profiles')
      .select('id, nome, email')
      .eq('id', garcomId)
      .eq('empresa_id', empresaId)
      .eq('role', 'garcom')
      .single()

    if (!garcom) {
      return NextResponse.json({ error: 'Garcom nao encontrado' }, { status: 404 })
    }

    // Desativar o profile
    await supabaseAdmin
      .from('profiles')
      .update({ ativo: false })
      .eq('id', garcomId)

    // Tentar remover o auth user (se existir)
    try {
      await supabaseAdmin.auth.admin.deleteUser(garcomId)
    } catch {
      // Se falhar, tudo bem - o profile ja foi desativado
    }

    return NextResponse.json({ success: true, nome: garcom.nome })
  } catch (error) {
    console.error('Erro ao excluir garcom:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
