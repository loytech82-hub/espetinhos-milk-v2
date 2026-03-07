import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

// Senha deterministica baseada no email do garcom
function getPasswordFromEmail(email: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return createHash('sha256').update(`garcom-pwd-${url}-${email}`).digest('hex').slice(0, 20)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const empresaId = body.empresaId as number | undefined
    const garcomId = body.garcomId as string | undefined

    if (!empresaId) {
      return NextResponse.json({ error: 'Selecione a empresa' }, { status: 400 })
    }

    // Verificar se empresa existe
    const { data: empresa, error: empError } = await supabaseAdmin
      .from('empresa')
      .select('id')
      .eq('id', empresaId)
      .single()

    if (empError || !empresa) {
      return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 })
    }

    if (!garcomId) {
      return NextResponse.json({ error: 'Selecione o garcom' }, { status: 400 })
    }

    // Buscar garcom no profile
    const { data: garcomProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, nome, email')
      .eq('id', garcomId)
      .eq('empresa_id', empresaId)
      .eq('role', 'garcom')
      .eq('ativo', true)
      .single()

    if (!garcomProfile) {
      return NextResponse.json({ error: 'Garcom nao encontrado' }, { status: 404 })
    }

    // O garcom ja tem email armazenado no profile (criado pelo admin)
    const email = garcomProfile.email
    const senha = getPasswordFromEmail(email)

    // Atualizar a senha do auth user para garantir sincronia
    await supabaseAdmin.auth.admin.updateUserById(garcomProfile.id, {
      password: senha,
    })

    return NextResponse.json({ email, password: senha })
  } catch (error) {
    console.error('Erro na API garcom:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
