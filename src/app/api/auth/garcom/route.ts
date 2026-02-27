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
    const codigoEmpresa = body.codigoEmpresa as string | undefined

    if (!codigoEmpresa?.trim()) {
      return NextResponse.json({ error: 'Informe o codigo da empresa' }, { status: 400 })
    }

    // Buscar empresa pelo codigo de acesso
    const { data: empresa, error: empError } = await supabaseAdmin
      .from('empresa')
      .select('id')
      .eq('codigo_acesso', codigoEmpresa.trim().toUpperCase())
      .single()

    if (empError || !empresa) {
      return NextResponse.json({ error: 'Codigo de empresa invalido' }, { status: 404 })
    }

    const empresaId = empresa.id
    const email = getGarcomEmail(empresaId)
    const senha = getGarcomPassword(empresaId)

    // Verificar se a conta garcom desta empresa ja existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const garcomUser = existingUsers?.users?.find(u => u.email === email)

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
      await new Promise(resolve => setTimeout(resolve, 500))

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
