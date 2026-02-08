import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// Cadastro de administrador — cria conta + profile com role='admin'
export async function POST(request: Request) {
  try {
    const { nome, email, senha } = await request.json()

    if (!nome?.trim() || !email?.trim() || !senha) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 })
    }

    if (senha.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    }

    // Criar usuario no Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: senha,
      email_confirm: true,
      user_metadata: { nome: nome.trim() },
    })

    if (createError) {
      if (createError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Este email ja esta cadastrado' }, { status: 400 })
      }
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Atualizar profile para role='admin'
    // (o trigger do banco cria como 'garcom', entao precisamos corrigir)
    if (newUser?.user) {
      await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin', nome: nome.trim() })
        .eq('id', newUser.user.id)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao criar admin:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
