import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createHash } from 'crypto'

// Email do garcom e determinístico por empresa
function getGarcomEmail(empresaId: number): string {
  return `garcom-${empresaId}@espetinhos.local`
}

// Senha deterministica baseada no SUPABASE_URL + empresaId
function getGarcomPassword(empresaId: number): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return createHash('sha256').update(`garcom-${url}-${empresaId}`).digest('hex').slice(0, 20)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const empresaId = body.empresaId as number | undefined

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
    const email = getGarcomEmail(empresaId)
    const senha = getGarcomPassword(empresaId)

    // Verificar se a conta garcom desta empresa ja existe (via profile, mais eficiente)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()
    const garcomUser = existingProfile

    if (garcomUser) {
      // Conta existe — retornar credenciais para login no client
      return NextResponse.json({ email, password: senha })
    }

    // Criar conta garcom para esta empresa
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: 'Garcom', empresa_id: empresaId },
    })

    if (createError) {
      console.error('Erro ao criar conta garcom:', createError)
      return NextResponse.json({ error: 'Erro ao criar conta de garcom' }, { status: 500 })
    }

    // Garantir profile com role='garcom' e empresa_id
    if (newUser?.user) {
      // Aguardar trigger criar profile (retry ate 3x)
      for (let i = 0; i < 3; i++) {
        const { data } = await supabaseAdmin.from('profiles').select('id').eq('id', newUser.user.id).single()
        if (data) break
        await new Promise(r => setTimeout(r, 200))
      }

      await supabaseAdmin.from('profiles').upsert({
        id: newUser.user.id,
        nome: 'Garcom',
        email,
        role: 'garcom',
        empresa_id: empresaId,
      })
    }

    return NextResponse.json({ email, password: senha })
  } catch (error) {
    console.error('Erro na API garcom:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
