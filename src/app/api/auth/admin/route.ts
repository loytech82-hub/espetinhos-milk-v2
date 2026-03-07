import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createHash } from 'crypto'

// Gerar codigo de acesso unico (6 caracteres alfanumericos)
function gerarCodigoAcesso(): string {
  return createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 6)
    .toUpperCase()
}

// Categorias padrao para nova empresa
const CATEGORIAS_PADRAO = [
  { nome: 'Espetinhos', ordem: 1 },
  { nome: 'Cervejas', ordem: 2 },
  { nome: 'Bebidas', ordem: 3 },
  { nome: 'Cigarros', ordem: 4 },
  { nome: 'Acompanhamentos', ordem: 5 },
  { nome: 'Outros', ordem: 99 },
]

// Cadastro de administrador — cria empresa + conta + profile + categorias padrao
export async function POST(request: Request) {
  try {
    const { nome, email, senha } = await request.json()

    if (!nome?.trim() || !email?.trim() || !senha) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 })
    }

    if (senha.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    }

    // 1. Criar empresa com codigo de acesso
    const codigoAcesso = gerarCodigoAcesso()
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresa')
      .insert({
        nome: `Empresa de ${nome.trim()}`,
        codigo_acesso: codigoAcesso,
      })
      .select()
      .single()

    if (empresaError) {
      console.error('Erro ao criar empresa:', empresaError.message, empresaError.details, empresaError.code)
      return NextResponse.json({ error: `Erro ao criar empresa: ${empresaError.message}` }, { status: 500 })
    }

    // 2. Criar usuario no Supabase Auth com empresa_id no metadata
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: senha,
      email_confirm: true,
      user_metadata: { nome: nome.trim(), empresa_id: empresa.id },
    })

    if (createError) {
      // Rollback: deletar empresa criada
      await supabaseAdmin.from('empresa').delete().eq('id', empresa.id)

      if (createError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Este email ja esta cadastrado' }, { status: 400 })
      }
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // 3. Garantir profile com role='admin' e empresa_id via upsert
    if (newUser?.user) {
      // Aguardar trigger criar profile (retry ate 3x)
      for (let i = 0; i < 3; i++) {
        const { data } = await supabaseAdmin.from('profiles').select('id').eq('id', newUser.user.id).single()
        if (data) break
        await new Promise(r => setTimeout(r, 200))
      }

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: newUser.user.id,
          nome: nome.trim(),
          email: email.trim(),
          role: 'admin',
          empresa_id: empresa.id,
        })

      if (profileError) {
        console.error('Erro ao criar profile:', profileError)
      }
    }

    // 4. Criar categorias padrao para a empresa
    const categoriasComEmpresa = CATEGORIAS_PADRAO.map(cat => ({
      ...cat,
      empresa_id: empresa.id,
    }))

    const { error: catError } = await supabaseAdmin
      .from('categorias')
      .insert(categoriasComEmpresa)

    if (catError) {
      console.error('Erro ao criar categorias padrao:', catError)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao criar admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
