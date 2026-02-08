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

    // Garantir profile com role='admin' via upsert
    // (o trigger do banco pode ou nao ter criado o profile ainda)
    if (newUser?.user) {
      // Aguardar um pouco para o trigger criar o profile
      await new Promise(resolve => setTimeout(resolve, 500))

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: newUser.user.id,
          nome: nome.trim(),
          email: email.trim(),
          role: 'admin',
        })

      if (profileError) {
        console.error('Erro ao criar profile:', profileError)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao criar admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
