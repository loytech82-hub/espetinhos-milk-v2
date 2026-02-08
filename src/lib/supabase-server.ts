import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente admin para uso em API routes (server-side)
// Bypassa RLS — NUNCA importar no client-side
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
