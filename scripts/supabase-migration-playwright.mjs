/**
 * Script Playwright para executar migration SQL no Supabase Dashboard
 * Abre o SQL Editor do Supabase, cola o SQL e executa
 */
import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// SQL da migration a ser executado
const SQL_MIGRATION = `ALTER TABLE public.comandas
  ADD COLUMN IF NOT EXISTS fiado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fiado_pago BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fiado_pago_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fiado_prazo_dias INTEGER;

CREATE INDEX IF NOT EXISTS idx_comandas_fiado_pendente
  ON public.comandas(fiado, fiado_pago) WHERE fiado = true AND fiado_pago = false;`

const DASHBOARD_URL = 'https://supabase.com/dashboard/project/sbreugwfhuprtduxmjdv/sql/new'
const PROJECT_REF = 'sbreugwfhuprtduxmjdv'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function tirarScreenshot(page, nome) {
  const caminho = join(__dirname, `screenshot-${nome}.png`)
  await page.screenshot({ path: caminho, fullPage: false })
  console.log(`Screenshot salvo: ${caminho}`)
}

async function main() {
  console.log('=== Migration Supabase via Playwright ===')
  console.log(`URL alvo: ${DASHBOARD_URL}`)
  
  // Abrir browser em modo visível para ver o que acontece
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  })
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  })
  
  const page = await context.newPage()
  
  try {
    // 1. Navegar para o dashboard
    console.log('\n[1] Abrindo Supabase Dashboard...')
    await page.goto('https://supabase.com/dashboard', { waitUntil: 'networkidle', timeout: 30000 })
    await sleep(2000)
    await tirarScreenshot(page, '01-dashboard-inicial')
    
    // 2. Verificar se está logado
    const url = page.url()
    console.log(`URL atual: ${url}`)
    
    if (url.includes('/sign-in') || url.includes('/login') || url.includes('auth')) {
      console.log('\n[!] Precisa fazer login - aguardando ação do usuário...')
      console.log('Por favor, faça login manualmente no browser que abriu.')
      console.log('Aguardando até você estar logado (timeout: 120 segundos)...')
      
      // Aguardar até estar no dashboard
      await page.waitForURL('**/dashboard/**', { timeout: 120000 })
      await sleep(2000)
      console.log('[OK] Login detectado!')
    }
    
    await tirarScreenshot(page, '02-apos-login')
    
    // 3. Ir direto para o SQL Editor do projeto
    console.log('\n[2] Navegando para o SQL Editor...')
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 30000 })
    await sleep(3000)
    await tirarScreenshot(page, '03-sql-editor')
    
    console.log(`URL atual: ${page.url()}`)
    
    // 4. Localizar o editor de SQL (CodeMirror ou Monaco)
    console.log('\n[3] Localizando o editor SQL...')
    
    // Aguardar o editor carregar
    await sleep(2000)
    
    // Tentar diferentes seletores do editor SQL do Supabase
    let editorEncontrado = false
    
    // O Supabase usa CodeMirror - o seletor principal é .cm-content ou .view-lines
    const seletoresEditor = [
      '.cm-content',
      '.cm-editor .cm-scroller',
      '[role="textbox"]',
      '.view-lines',
      'textarea.npm__react-simple-code-editor__textarea',
      '.ace_editor',
    ]
    
    for (const seletor of seletoresEditor) {
      const el = await page.$(seletor)
      if (el) {
        console.log(`Editor encontrado com seletor: ${seletor}`)
        editorEncontrado = true
        
        // Clicar no editor para focar
        await el.click()
        await sleep(500)
        
        // Selecionar tudo e substituir com o SQL
        await page.keyboard.press('Control+a')
        await sleep(300)
        await page.keyboard.type(SQL_MIGRATION, { delay: 0 })
        await sleep(1000)
        break
      }
    }
    
    if (!editorEncontrado) {
      console.log('[!] Editor não encontrado pelos seletores padrão')
      console.log('Tentando via JavaScript...')
      
      // Tentar via JavaScript injetado
      await page.evaluate((sql) => {
        // Tentar CodeMirror
        const cmView = document.querySelector('.cm-editor')
        if (cmView) {
          const event = new CustomEvent('paste', { bubbles: true })
          Object.defineProperty(event, 'clipboardData', {
            value: { getData: () => sql, files: [] }
          })
          cmView.dispatchEvent(event)
        }
      }, SQL_MIGRATION)
    }
    
    await tirarScreenshot(page, '04-sql-digitado')
    
    // 5. Executar o SQL (botão Run ou Ctrl+Enter)
    console.log('\n[4] Executando o SQL...')
    
    // Tentar botão Run primeiro
    const botoesRun = [
      'button:has-text("Run")',
      'button:has-text("Execute")',
      '[data-testid="run-sql-button"]',
      'button.run-query-btn',
    ]
    
    let botaoClicado = false
    for (const seletorBotao of botoesRun) {
      const botao = await page.$(seletorBotao)
      if (botao) {
        console.log(`Clicando botão: ${seletorBotao}`)
        await botao.click()
        botaoClicado = true
        break
      }
    }
    
    if (!botaoClicado) {
      console.log('Botão Run não encontrado, usando Ctrl+Enter...')
      await page.keyboard.press('Control+Enter')
    }
    
    // Aguardar resultado
    await sleep(4000)
    await tirarScreenshot(page, '05-resultado')
    
    // 6. Verificar resultado
    console.log('\n[5] Verificando resultado...')
    const conteudoPagina = await page.textContent('body')
    
    if (conteudoPagina.includes('Success') || 
        conteudoPagina.includes('success') ||
        conteudoPagina.includes('ALTER TABLE') ||
        conteudoPagina.includes('1 row') ||
        conteudoPagina.includes('0 rows')) {
      console.log('[OK] Migration executada com sucesso!')
    } else if (conteudoPagina.includes('error') || conteudoPagina.includes('Error')) {
      console.log('[!] Possível erro detectado - verifique o screenshot')
    } else {
      console.log('[?] Resultado incerto - verifique o screenshot')
    }
    
    console.log('\nPressione Ctrl+C para fechar o browser, ou aguarde 60 segundos...')
    await sleep(60000)
    
  } catch (err) {
    console.error('Erro durante a automação:', err.message)
    await tirarScreenshot(page, '99-erro')
  } finally {
    await browser.close()
    console.log('Browser fechado.')
  }
}

main().catch(console.error)
