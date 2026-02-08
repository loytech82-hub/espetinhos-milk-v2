import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createHash } from 'crypto'

// Credenciais da conta compartilhada de garcom
const GARCOM_EMAIL = 'garcom@espetinhos.local'

// Senha deterministica baseada no SUPABASE_URL (unica por projeto)
function getGarcomPassword(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return createHash('sha256').update(`garcom-${url}-espetinhos`).digest('hex').slice(0, 20)
}

export async function POST() {
  try {
    const senha = getGarcomPassword()

    // Verificar se a conta garcom ja existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const garcomUser = existingUsers?.users?.find(u => u.email === GARCOM_EMAIL)

    if (garcomUser) {
      // Conta existe — retornar credenciais para login no client
      return NextResponse.json({
        email: GARCOM_EMAIL,
        password: senha,
      })
    }

    // Criar conta garcom compartilhada
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: GARCOM_EMAIL,
      password: senha,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: { nome: 'Garcom' },
    })

    if (createError) {
      console.error('Erro ao criar conta garcom:', createError)
      return NextResponse.json({ error: 'Erro ao criar conta de garcom' }, { status: 500 })
    }

    // Garantir que o profile existe com role='garcom'
    // (o trigger do banco pode ja ter criado, mas vamos garantir)
    if (newUser?.user) {
      await supabaseAdmin.from('profiles').upsert({
        id: newUser.user.id,
        nome: 'Garcom',
        email: GARCOM_EMAIL,
        role: 'garcom',
      })
    }

    // Tambem: se so existe 1 profile no sistema (alem do garcom recem-criado),
    // promover esse profile para admin automaticamente
    const { data: allProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email')
      .neq('email', GARCOM_EMAIL)

    if (allProfiles && allProfiles.length === 1 && allProfiles[0].role !== 'admin') {
      await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', allProfiles[0].id)
    }

    return NextResponse.json({
      email: GARCOM_EMAIL,
      password: senha,
    })
  } catch (error) {
    console.error('Erro na API garcom:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
