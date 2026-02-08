import { formatCurrency } from './utils'

interface ResumoVendas {
  totalVendas: number
  totalComandas: number
  valorMedio: number
  formaPagamento: Record<string, number>
  topProdutos: { nome: string; qtd: number; total: number }[]
}

const fpLabels: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao: 'Cartao',
  nao_informado: 'Outros',
}

const periodoLabels: Record<string, string> = {
  hoje: 'Hoje',
  semana: 'Ultimos 7 dias',
  mes: 'Ultimos 30 dias',
  tudo: 'Todo o periodo',
}

/**
 * Gera HTML formatado para impressao/exportacao em PDF do relatorio de vendas.
 * Abre em nova janela e dispara window.print() automaticamente.
 * O usuario pode salvar como PDF pelo dialogo do navegador.
 */
export function exportRelatorioPDF(
  resumo: ResumoVendas,
  periodo: string,
  empresaNome?: string
) {
  const dataGeracao = new Date().toLocaleString('pt-BR')

  // Barras de forma de pagamento
  const maxFP = Math.max(...Object.values(resumo.formaPagamento), 1)
  const fpRows = Object.entries(resumo.formaPagamento)
    .map(([key, value]) => {
      const pct = ((value / maxFP) * 100).toFixed(0)
      const pctTotal = resumo.totalVendas > 0
        ? ((value / resumo.totalVendas) * 100).toFixed(0)
        : '0'
      return `
        <tr>
          <td style="padding:6px 0">${fpLabels[key] || key}</td>
          <td style="padding:6px 0;text-align:right">${pctTotal}%</td>
          <td style="padding:6px 0;text-align:right;font-weight:bold">${formatCurrency(value)}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:0 0 8px 0">
            <div style="background:#eee;border-radius:4px;height:8px;overflow:hidden">
              <div style="background:#FF6B35;height:100%;width:${pct}%;border-radius:4px"></div>
            </div>
          </td>
        </tr>
      `
    })
    .join('')

  // Top produtos
  const prodRows = resumo.topProdutos
    .map((prod, i) => `
      <tr>
        <td style="padding:6px 0;font-weight:bold;color:${i < 3 ? '#FF6B35' : '#666'};width:30px">${i + 1}</td>
        <td style="padding:6px 0">${prod.nome}</td>
        <td style="padding:6px 0;text-align:center;color:#666">${prod.qtd}x</td>
        <td style="padding:6px 0;text-align:right;font-weight:bold">${formatCurrency(prod.total)}</td>
      </tr>
    `)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatorio de Vendas - ${periodoLabels[periodo] || periodo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #222;
      background: #fff;
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin-bottom: 12px; color: #333; border-bottom: 2px solid #FF6B35; padding-bottom: 6px; }
    .subtitle { font-size: 13px; color: #666; margin-bottom: 20px; }
    .stats { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat-card {
      flex: 1;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #eee;
    }
    .stat-card.highlight {
      background: #FF6B35;
      color: #fff;
      border-color: #FF6B35;
    }
    .stat-card .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-card.highlight .label { color: rgba(255,255,255,0.8); }
    .stat-card .value { font-size: 24px; font-weight: bold; margin-top: 4px; }
    .stat-card.highlight .value { color: #fff; }
    .section { margin-bottom: 24px; }
    .columns { display: flex; gap: 24px; }
    .columns > div { flex: 1; }
    table { width: 100%; border-collapse: collapse; }
    .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
    .no-print { text-align: center; margin-top: 16px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
      @page { margin: 16mm; }
    }
  </style>
</head>
<body>
  <h1>${empresaNome || 'ESPETINHOS 1000K'}</h1>
  <div class="subtitle">
    Relatorio de Vendas &mdash; ${periodoLabels[periodo] || periodo}<br>
    Gerado em ${dataGeracao}
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="label">Total em Vendas</div>
      <div class="value" style="color:#16a34a">${formatCurrency(resumo.totalVendas)}</div>
    </div>
    <div class="stat-card">
      <div class="label">Pedidos Fechados</div>
      <div class="value">${resumo.totalComandas}</div>
    </div>
    <div class="stat-card highlight">
      <div class="label">Valor Medio</div>
      <div class="value">${formatCurrency(resumo.valorMedio)}</div>
    </div>
  </div>

  <div class="columns">
    <div class="section">
      <h2>Por Forma de Pagamento</h2>
      ${Object.keys(resumo.formaPagamento).length > 0
        ? `<table>${fpRows}</table>`
        : '<p style="color:#999;text-align:center;padding:16px">Sem dados no periodo</p>'
      }
    </div>

    <div class="section">
      <h2>Mais Vendidos</h2>
      ${resumo.topProdutos.length > 0
        ? `<table>${prodRows}</table>`
        : '<p style="color:#999;text-align:center;padding:16px">Sem dados no periodo</p>'
      }
    </div>
  </div>

  <div class="footer">
    ${empresaNome || 'Espetinhos 1000K'} &mdash; Sistema de Gestao<br>
    Relatorio gerado automaticamente
  </div>

  <div class="no-print">
    <button onclick="window.print()" style="padding:10px 32px;font-size:14px;background:#FF6B35;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold">
      Salvar como PDF / Imprimir
    </button>
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=850,height=700')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}
