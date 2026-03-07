import { chromium } from 'playwright'
import { join } from 'path'

const SQL = 'ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS fiado_valor_pago NUMERIC(10,2) NOT NULL DEFAULT 0;'
const URL = 'https://supabase.com/dashboard/project/sbreugwfhuprtduxmjdv/sql/new'

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  console.log('Abrindo Chrome com perfil do usuario...')

  // Usar um diretorio temporario com copia do perfil
  const tempDir = join(process.env.TEMP || '/tmp', 'chrome-playwright-supabase')

  const context = await chromium.launchPersistentContext(tempDir, {
    headless: false,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: [
      '--disable-blink-features=AutomationControlled',
    ],
    timeout: 30000,
    viewport: { width: 1280, height: 800 },
  })

  const page = context.pages()[0] || await context.newPage()

  try {
    console.log('Navegando para Supabase SQL Editor...')
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await sleep(5000)

    const currentUrl = page.url()
    console.log('URL:', currentUrl)

    if (currentUrl.includes('sign-in')) {
      console.log('\n=============================================')
      console.log('FACA LOGIN NO CHROME QUE ABRIU!')
      console.log('Aguardando voce logar (maximo 2 minutos)...')
      console.log('=============================================\n')

      // Aguardar ate a URL mudar (indicando login feito)
      for (let i = 0; i < 24; i++) {
        await sleep(5000)
        const nowUrl = page.url()
        if (!nowUrl.includes('sign-in')) {
          console.log('Login detectado! URL:', nowUrl)
          break
        }
        if (i === 23) {
          console.log('Timeout de login. Abortando.')
          await context.close()
          return
        }
        console.log(`Aguardando login... (${(i + 1) * 5}s)`)
      }

      // Navegar para o SQL editor apos login
      await sleep(2000)
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await sleep(5000)
    }

    console.log('Pagina carregada. Procurando editor...')
    await sleep(3000)

    // Tentar encontrar e clicar no editor Monaco
    // O Supabase usa Monaco Editor para SQL
    const monacoSelector = '.monaco-editor .view-lines'
    const cmSelector = '.cm-editor .cm-content'

    let editorClicked = false

    // Tentar Monaco
    try {
      const monaco = page.locator(monacoSelector)
      if (await monaco.count() > 0) {
        await monaco.first().click()
        editorClicked = true
        console.log('Editor Monaco encontrado!')
      }
    } catch (e) {}

    // Tentar CodeMirror
    if (!editorClicked) {
      try {
        const cm = page.locator(cmSelector)
        if (await cm.count() > 0) {
          await cm.first().click()
          editorClicked = true
          console.log('Editor CodeMirror encontrado!')
        }
      } catch (e) {}
    }

    // Tentar qualquer textarea
    if (!editorClicked) {
      try {
        const textarea = page.locator('textarea')
        if (await textarea.count() > 0) {
          await textarea.first().click()
          editorClicked = true
          console.log('Textarea encontrado!')
        }
      } catch (e) {}
    }

    if (!editorClicked) {
      console.log('Editor nao encontrado automaticamente.')
      console.log('CLIQUE NO EDITOR SQL NO CHROME e aguarde...')
      await sleep(10000)
    }

    // Selecionar tudo e digitar o SQL
    console.log('Digitando SQL...')
    await page.keyboard.press('Control+a')
    await sleep(300)
    await page.keyboard.press('Backspace')
    await sleep(300)

    // Usar clipboard para colar (mais confiavel que type)
    await page.evaluate((sql) => {
      navigator.clipboard.writeText(sql)
    }, SQL).catch(() => {})

    await page.keyboard.press('Control+v')
    await sleep(500)

    // Se colar nao funcionou, digitar
    await page.keyboard.press('Control+a')
    await sleep(200)
    const selectedText = await page.evaluate(() => window.getSelection()?.toString() || '').catch(() => '')
    if (!selectedText.includes('ALTER')) {
      console.log('Clipboard nao funcionou, digitando...')
      await page.keyboard.press('Control+a')
      await page.keyboard.press('Backspace')
      await page.keyboard.type(SQL, { delay: 5 })
    }

    console.log('SQL inserido! Executando com Ctrl+Enter...')
    await sleep(1000)

    // Executar com Ctrl+Enter
    await page.keyboard.press('Control+Enter')
    await sleep(5000)

    // Verificar resultado
    const bodyText = await page.textContent('body').catch(() => '')
    if (bodyText.includes('Success') || bodyText.includes('success') || bodyText.includes('completed')) {
      console.log('\nSQL EXECUTADO COM SUCESSO!')
    } else {
      console.log('\nSQL enviado. Verificando...')
    }

    // Screenshot
    await page.screenshot({ path: 'scripts/screenshot-migration-result.png', fullPage: false })
    console.log('Screenshot salvo em scripts/screenshot-migration-result.png')

    await sleep(3000)
  } catch (err) {
    console.error('Erro:', err.message)
    await page.screenshot({ path: 'scripts/screenshot-error.png' }).catch(() => {})
  } finally {
    await context.close()
  }
}

run().catch(console.error)
