import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente admin para uso em API routes (server-side)
// Bypassa RLS — NUNCA importar no client-side
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Contexto da request: userId + empresaId do usuario logado
export interface RequestContext {
  userId: string
  empresaId: number
}

// Extrair userId e empresaId do usuario logado via cookies
export async function getRequestContext(request: NextRequest): Promise<RequestContext> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {},
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Usuario nao autenticado')
  }

  // Buscar empresa_id do profile via supabaseAdmin (bypass RLS)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.empresa_id) {
    throw new Error('Perfil ou empresa nao encontrados')
  }

  return {
    userId: user.id,
    empresaId: profile.empresa_id,
  }
}
