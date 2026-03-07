import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://sbreugwfhuprtduxmjdv.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicmV1Z3dmaHVwcnRkdXhtamR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDMyNzMzMSwiZXhwIjoyMDg1OTAzMzMxfQ.ed-cu3rc786Y9yUQ5f0rZWT1cZVzr8qP7F639AOCsqE'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const PROJECT_REF = 'sbreugwfhuprtduxmjdv'

async function executeSql(sql) {
  // Usar a Supabase Management API para executar SQL
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!res.ok) {
    // Fallback: tentar via edge function ou direct pg
    console.log(`Management API retornou ${res.status}, tentando abordagem alternativa...`)

    // Tentar via o endpoint SQL do Supabase pg_net
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_migration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql_text: sql }),
    })

    if (!res2.ok) {
      const txt = await res2.text()
      return { error: `Status ${res2.status}: ${txt}` }
    }
    return { data: await res2.json() }
  }

  return { data: await res.json() }
}

async function run() {
  console.log('=== Migration: Fiado Pagamentos Parciais ===\n')

  // 1. Verificar estado atual
  console.log('Verificando estado atual...')

  const { data: cmdTest, error: cmdErr } = await supabase
    .from('comandas')
    .select('id, fiado_valor_pago')
    .limit(1)

  const colunaExiste = !cmdErr || !cmdErr.message.includes('fiado_valor_pago')
  console.log(`Coluna fiado_valor_pago: ${colunaExiste ? 'JA EXISTE' : 'NAO EXISTE'}`)

  const { error: fpErr } = await supabase.from('fiado_pagamentos').select('id').limit(1)
  const tabelaExiste = !fpErr || !fpErr.message.includes('does not exist')
  console.log(`Tabela fiado_pagamentos: ${tabelaExiste ? 'JA EXISTE' : 'NAO EXISTE'}`)

  if (colunaExiste && tabelaExiste) {
    console.log('\nTodas as migrations ja estao aplicadas!')
    return
  }

  // Precisamos executar DDL - tentar criar uma funcao temporaria
  console.log('\nCriando funcao helper para DDL...')

  // Primeira tentativa: ver se existe a funcao exec_sql
  const { error: rpcErr } = await supabase.rpc('exec_sql', { query: 'SELECT 1' })

  if (!rpcErr) {
    console.log('Funcao exec_sql disponivel!')

    if (!colunaExiste) {
      console.log('Adicionando coluna fiado_valor_pago...')
      await supabase.rpc('exec_sql', {
        query: 'ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS fiado_valor_pago NUMERIC(10,2) NOT NULL DEFAULT 0;'
      })
      console.log('Coluna adicionada!')
    }

    if (!tabelaExiste) {
      console.log('Criando tabela fiado_pagamentos...')
      await supabase.rpc('exec_sql', {
        query: `CREATE TABLE IF NOT EXISTS public.fiado_pagamentos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          comanda_id UUID NOT NULL REFERENCES public.comandas(id) ON DELETE CASCADE,
          cliente_id UUID NOT NULL REFERENCES public.clientes(id),
          valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
          forma_pagamento TEXT NOT NULL,
          observacao TEXT,
          empresa_id INTEGER NOT NULL REFERENCES public.empresa(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_comanda ON public.fiado_pagamentos(comanda_id);
        CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_cliente ON public.fiado_pagamentos(cliente_id);
        CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_empresa ON public.fiado_pagamentos(empresa_id);
        ALTER TABLE public.fiado_pagamentos ENABLE ROW LEVEL SECURITY;`
      })
      console.log('Tabela criada!')
    }

    console.log('\nMigration concluida!')
  } else {
    console.log('Funcao exec_sql nao disponivel:', rpcErr.message)
    console.log('\n========================================')
    console.log('EXECUTE O SQL MANUALMENTE NO SUPABASE:')
    console.log('========================================')
    console.log('URL: https://supabase.com/dashboard/project/sbreugwfhuprtduxmjdv/sql/new')
    console.log('\nSQL a executar:')
    console.log('---')
    if (!colunaExiste) {
      console.log('ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS fiado_valor_pago NUMERIC(10,2) NOT NULL DEFAULT 0;')
    }
    if (!tabelaExiste) {
      console.log(`
CREATE TABLE IF NOT EXISTS public.fiado_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id UUID NOT NULL REFERENCES public.comandas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  forma_pagamento TEXT NOT NULL,
  observacao TEXT,
  empresa_id INTEGER NOT NULL REFERENCES public.empresa(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_comanda ON public.fiado_pagamentos(comanda_id);
CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_cliente ON public.fiado_pagamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_empresa ON public.fiado_pagamentos(empresa_id);
ALTER TABLE public.fiado_pagamentos ENABLE ROW LEVEL SECURITY;`)
    }
    console.log('---')
  }
}

run().catch(console.error)
