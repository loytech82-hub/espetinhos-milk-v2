import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getRequestContext } from '@/lib/supabase-server'
import { createHash, randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

function getGarcomEmail(empresaId: number, garcomId: string): string {
  return `garcom-${empresaId}-${garcomId}@espetinhos.local`
}

function getPasswordFromEmail(email: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return createHash('sha256').update(`garcom-pwd-${url}-${email}`).digest('hex').slice(0, 20)
}

// Admin cadastra um novo garcom
export async function POST(request: NextRequest) {
  try {
    const ctx = await getRequestContext(request)

    // Verificar se e admin
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', ctx.userId)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem cadastrar garcons' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const nome = (body.nome as string || '').trim()

    if (!nome) {
      return NextResponse.json({ error: 'Informe o nome do garcom' }, { status: 400 })
    }

    // Criar email unico para o garcom
    const garcomUniqueId = randomUUID()
    const email = getGarcomEmail(ctx.empresaId, garcomUniqueId)
    const senha = getPasswordFromEmail(email)

    // Criar auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, empresa_id: ctx.empresaId },
    })

    if (createError) {
      console.error('Erro ao criar garcom:', createError)
      return NextResponse.json({ error: 'Erro ao criar garcom' }, { status: 500 })
    }

    if (newUser?.user) {
      // Aguardar trigger criar profile
      for (let i = 0; i < 3; i++) {
        const { data } = await supabaseAdmin.from('profiles').select('id').eq('id', newUser.user.id).single()
        if (data) break
        await new Promise(r => setTimeout(r, 200))
      }

      await supabaseAdmin.from('profiles').upsert({
        id: newUser.user.id,
        nome,
        email,
        role: 'garcom',
        empresa_id: ctx.empresaId,
        ativo: true,
      })
    }

    return NextResponse.json({ ok: true, id: newUser?.user?.id, nome })
  } catch (error) {
    console.error('Erro ao cadastrar garcom:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
