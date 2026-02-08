import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Usa createBrowserClient do @supabase/ssr para sincronizar sessao via cookies
// Isso permite que o middleware (server-side) leia a sessao autenticada
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
