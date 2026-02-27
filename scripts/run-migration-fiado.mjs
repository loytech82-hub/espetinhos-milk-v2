import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://sbreugwfhuprtduxmjdv.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicmV1Z3dmaHVwcnRkdXhtamR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDMyNzMzMSwiZXhwIjoyMDg1OTAzMzMxfQ.ed-cu3rc786Y9yUQ5f0rZWT1cZVzr8qP7F639AOCsqE'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function checkMigration() {
  console.log('Verificando estado atual da tabela comandas...')
  
  // Verificar se a coluna fiado já existe
  const { data, error } = await supabase
    .from('comandas')
    .select('fiado')
    .limit(1)
  
  if (error) {
    if (error.message.includes('column "fiado" does not exist') || 
        error.message.includes('fiado')) {
      console.log('STATUS: Coluna "fiado" NAO existe - migration precisa ser aplicada')
    } else {
      console.log('STATUS: Erro ao verificar:', error.message, error.code)
    }
    return false
  } else {
    console.log('STATUS: Coluna "fiado" JA EXISTE - migration ja foi aplicada!')
    return true
  }
}

checkMigration().catch(console.error)
