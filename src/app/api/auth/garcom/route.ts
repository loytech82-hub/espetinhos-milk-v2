import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

// Email deterministico por garcom individual
function getGarcomEmail(empresaId: number, garcomId: string): string {
  return `garcom-${empresaId}-${garcomId}@espetinhos.local`
}

// Senha deterministica
function getGarcomPassword(empresaId: number, garcomId: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return createHash('sha256').update(`garcom-${url}-${empresaId}-${garcomId}`).digest('hex').slice(0, 20)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const empresaId = body.empresaId as number | undefined
    const garcomId = body.garcomId as string | undefined
    const garcomNome = body.garcomNome as string | undefined

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

    // Se garcomId foi passado, login individual
    if (garcomId) {
      // Verificar se o garcom existe no profile
      const { data: garcomProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, nome, email')
        .eq('id', garcomId)
        .eq('empresa_id', empresaId)
        .eq('role', 'garcom')
        .single()

      if (!garcomProfile) {
        return NextResponse.json({ error: 'Garcom nao encontrado' }, { status: 404 })
      }

      // O garcom ja tem conta auth — gerar credenciais baseadas no id
      const email = getGarcomEmail(empresaId, garcomId)
      const senha = getGarcomPassword(empresaId, garcomId)

      // Verificar se ja existe auth user para esse garcom
      // Checamos pelo email no profile
      if (garcomProfile.email === email) {
        // Ja existe — retornar credenciais
        return NextResponse.json({ email, password: senha })
      }

      // Criar auth user para esse garcom
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome: garcomProfile.nome, empresa_id: empresaId },
      })

      if (createError) {
        // Se ja existe (email duplicado), atualizar senha e retornar
        if (createError.message?.includes('already') || createError.message?.includes('duplicate')) {
          // Buscar user existente
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single()

          if (existingProfile) {
            await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, { password: senha })
            return NextResponse.json({ email, password: senha })
          }
        }
        console.error('Erro ao criar auth garcom:', createError)
        return NextResponse.json({ error: 'Erro ao criar acesso do garcom' }, { status: 500 })
      }

      if (newUser?.user) {
        // Aguardar trigger criar profile
        for (let i = 0; i < 3; i++) {
          const { data } = await supabaseAdmin.from('profiles').select('id').eq('id', newUser.user.id).single()
          if (data) break
          await new Promise(r => setTimeout(r, 200))
        }

        // Atualizar profile com dados corretos
        await supabaseAdmin.from('profiles').upsert({
          id: newUser.user.id,
          nome: garcomProfile.nome,
          email,
          role: 'garcom',
          empresa_id: empresaId,
        })

        // Remover o profile antigo (que foi criado manualmente pelo admin)
        // Apenas se o id antigo for diferente
        if (garcomProfile.id !== newUser.user.id) {
          await supabaseAdmin.from('profiles').delete().eq('id', garcomProfile.id)
        }
      }

      return NextResponse.json({ email, password: senha })
    }

    // Fallback: login generico (compatibilidade) — cria/reutiliza conta compartilhada
    const email = getGarcomEmail(empresaId, 'shared')
    const senha = getGarcomPassword(empresaId, 'shared')

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingProfile) {
      return NextResponse.json({ email, password: senha })
    }

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

    if (newUser?.user) {
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
