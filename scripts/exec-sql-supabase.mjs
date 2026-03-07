import { chromium } from 'playwright'

const SQL = `ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS fiado_valor_pago NUMERIC(10,2) NOT NULL DEFAULT 0;`
const URL = 'https://supabase.com/dashboard/project/sbreugwfhuprtduxmjdv/sql/new'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  console.log('Abrindo browser...')

  // Usar perfil do usuario para reaproveitar sessao logada
  const userDataDir = process.env.LOCALAPPDATA + '/Google/Chrome/User Data'

  let browser
  let context
  let page

  try {
    // Tentar usar contexto persistente do Chrome (sessao ja logada)
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome',
      args: ['--no-first-run'],
      timeout: 15000,
    })
    page = await context.newPage()
  } catch (e) {
    console.log('Chrome em uso ou nao disponivel, abrindo Chromium standalone...')
    browser = await chromium.launch({ headless: false, timeout: 15000 })
    context = await browser.newContext()
    page = await context.newPage()
  }

  try {
    console.log('Navegando para SQL Editor...')
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })
    await sleep(3000)

    // Verificar se estamos logados
    const currentUrl = page.url()
    console.log('URL atual:', currentUrl)

    if (currentUrl.includes('/sign-in') || currentUrl.includes('/login')) {
      console.log('NAO LOGADO - Voce precisa fazer login manualmente.')
      console.log('Aguardando 60s para voce logar...')
      await sleep(60000)
      await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })
      await sleep(3000)
    }

    // Procurar o editor SQL (Monaco editor)
    console.log('Procurando editor SQL...')
    await sleep(2000)

    // Tentar clicar no editor
    const editor = page.locator('.monaco-editor textarea, [role="textbox"], .cm-content')
    const editorFound = await editor.count()
    console.log('Editores encontrados:', editorFound)

    if (editorFound > 0) {
      await editor.first().click()
      await sleep(500)

      // Limpar e colar SQL
      await page.keyboard.press('Control+a')
      await sleep(200)
      await page.keyboard.type(SQL, { delay: 10 })
      console.log('SQL digitado!')

      await sleep(1000)

      // Clicar no botao Run (Ctrl+Enter ou botao)
      console.log('Executando SQL...')
      await page.keyboard.press('Control+Enter')

      await sleep(5000)

      // Verificar resultado
      const pageContent = await page.textContent('body')
      if (pageContent.includes('Success') || pageContent.includes('success')) {
        console.log('SQL EXECUTADO COM SUCESSO!')
      } else if (pageContent.includes('error') || pageContent.includes('ERROR')) {
        console.log('Possivel erro na execucao. Verifique o dashboard.')
      } else {
        console.log('SQL enviado. Verifique o resultado no dashboard.')
      }

      // Screenshot para confirmar
      await page.screenshot({ path: 'scripts/screenshot-migration-result.png' })
      console.log('Screenshot salvo em scripts/screenshot-migration-result.png')

    } else {
      console.log('Editor nao encontrado. Tentando abordagem alternativa...')
      // Tentar via clipboard
      await page.screenshot({ path: 'scripts/screenshot-sql-page.png' })
      console.log('Screenshot salvo. Verifique o estado da pagina.')
    }

  } catch (err) {
    console.error('Erro:', err.message)
    await page.screenshot({ path: 'scripts/screenshot-error.png' }).catch(() => {})
  } finally {
    await sleep(3000)
    if (browser) await browser.close()
    else await context.close()
  }
}

run().catch(console.error)
