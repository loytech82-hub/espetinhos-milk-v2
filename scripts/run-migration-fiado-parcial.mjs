import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://sbreugwfhuprtduxmjdv.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicmV1Z3dmaHVwcnRkdXhtamR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDMyNzMzMSwiZXhwIjoyMDg1OTAzMzMxfQ.ed-cu3rc786Y9yUQ5f0rZWT1cZVzr8qP7F639AOCsqE'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function run() {
  console.log('Testando conexao...')
  const { data, error } = await supabase.from('empresa').select('id, nome').limit(1)
  if (error) {
    console.error('Erro de conexao:', error.message)
    process.exit(1)
  }
  console.log('Conectado! Empresa:', data?.[0]?.nome)

  // Step 1: Adicionar coluna fiado_valor_pago na tabela comandas
  console.log('\n1. Adicionando coluna fiado_valor_pago em comandas...')
  const { error: err1 } = await supabase.rpc('exec_sql', {
    query: 'ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS fiado_valor_pago NUMERIC(10,2) NOT NULL DEFAULT 0;'
  })
  if (err1) {
    console.log('RPC nao disponivel, tentando via pg...')
    // Tentar via REST query endpoint
    const pgUrl = `${SUPABASE_URL}/pg`
    console.log('Tentando outra abordagem...')
  }

  // Step 2: Verificar se coluna existe
  const { data: testData, error: testErr } = await supabase
    .from('comandas')
    .select('fiado_valor_pago')
    .limit(1)

  if (testErr && testErr.message.includes('fiado_valor_pago')) {
    console.log('Coluna fiado_valor_pago NAO existe. Executando via pg...')

    // Usar pg diretamente
    const pg = await import('pg')
    const connectionString = `postgresql://postgres.sbreugwfhuprtduxmjdv:${SERVICE_ROLE_KEY}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`

    const client = new pg.default.Client({ connectionString, ssl: { rejectUnauthorized: false } })
    try {
      await client.connect()
      console.log('Conectado via pg!')

      // Adicionar coluna
      await client.query('ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS fiado_valor_pago NUMERIC(10,2) NOT NULL DEFAULT 0;')
      console.log('Coluna fiado_valor_pago adicionada!')

      // Criar tabela fiado_pagamentos
      await client.query(`
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
      `)
      console.log('Tabela fiado_pagamentos criada!')

      // Criar indices
      await client.query('CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_comanda ON public.fiado_pagamentos(comanda_id);')
      await client.query('CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_cliente ON public.fiado_pagamentos(cliente_id);')
      await client.query('CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_empresa ON public.fiado_pagamentos(empresa_id);')
      console.log('Indices criados!')

      // Habilitar RLS
      await client.query('ALTER TABLE public.fiado_pagamentos ENABLE ROW LEVEL SECURITY;')
      console.log('RLS habilitado!')

      await client.end()
      console.log('\nMigration concluida com sucesso!')
    } catch (pgErr) {
      console.error('Erro pg:', pgErr.message)
      await client.end().catch(() => {})
    }
  } else if (testErr) {
    console.log('Erro inesperado:', testErr.message)
  } else {
    console.log('Coluna fiado_valor_pago JA EXISTE!')

    // Verificar tabela fiado_pagamentos
    const { error: fpErr } = await supabase.from('fiado_pagamentos').select('id').limit(1)
    if (fpErr && fpErr.message.includes('does not exist')) {
      console.log('Tabela fiado_pagamentos NAO existe. Criando via pg...')

      const pg = await import('pg')
      // Tentar connection string padrao do Supabase pooler
      const connectionString = `postgresql://postgres.sbreugwfhuprtduxmjdv:espetinhos100k2024@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`

      const client = new pg.default.Client({ connectionString, ssl: { rejectUnauthorized: false } })
      try {
        await client.connect()
        console.log('Conectado via pg!')

        await client.query(`
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
        `)
        await client.query('CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_comanda ON public.fiado_pagamentos(comanda_id);')
        await client.query('CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_cliente ON public.fiado_pagamentos(cliente_id);')
        await client.query('CREATE INDEX IF NOT EXISTS idx_fiado_pagamentos_empresa ON public.fiado_pagamentos(empresa_id);')
        await client.query('ALTER TABLE public.fiado_pagamentos ENABLE ROW LEVEL SECURITY;')

        await client.end()
        console.log('Tabela fiado_pagamentos criada com sucesso!')
      } catch (pgErr) {
        console.error('Erro pg:', pgErr.message)
        console.log('\nVoce precisa executar o SQL manualmente no Supabase Dashboard.')
        console.log('Va em: https://supabase.com/dashboard/project/sbreugwfhuprtduxmjdv/sql/new')
        await client.end().catch(() => {})
      }
    } else if (fpErr) {
      console.log('Erro ao verificar fiado_pagamentos:', fpErr.message)
    } else {
      console.log('Tabela fiado_pagamentos JA EXISTE!')
      console.log('\nTodas as migrations ja foram aplicadas!')
    }
  }
}

run().catch(console.error)
