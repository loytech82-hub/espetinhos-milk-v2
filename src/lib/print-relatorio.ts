import { formatCurrency } from './utils'

interface ResumoVendas {
  totalVendas: number
  totalComandas: number
  valorMedio: number
  formaPagamento: Record<string, number>
  topProdutos: { nome: string; qtd: number; total: number }[]
}

/**
 * Gera PDF de relatorio via window.print().
 * Compativel com Chrome, Firefox e Safari.
 */
export function printRelatorio(
  resumo: ResumoVendas,
  periodo: string,
  empresaNome?: string
) {
  const dataGeracao = new Date().toLocaleString('pt-BR')

  const formaPagamentoLabels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao: 'Cartao',
    nao_informado: 'Outros',
  }

  const formasHTML = Object.entries(resumo.formaPagamento).map(([key, value]) => {
    const pct = resumo.totalVendas > 0 ? ((value / resumo.totalVendas) * 100).toFixed(1) : '0'
    return `<tr>
      <td>${formaPagamentoLabels[key] || key}</td>
      <td class="right">${formatCurrency(value)}</td>
      <td class="right">${pct}%</td>
    </tr>`
  }).join('')

  const produtosHTML = resumo.topProdutos.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.nome}</td>
      <td class="right">${p.qtd}</td>
      <td class="right">${formatCurrency(p.total)}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatorio - ${empresaNome || 'Espetinhos 1000K'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 13px;
      color: #222;
      padding: 20mm;
      max-width: 210mm;
    }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 15px; margin: 16px 0 8px; color: #555; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid #333; padding-bottom: 12px; }
    .meta { color: #888; font-size: 11px; }
    .right { text-align: right; }

    .cards { display: flex; gap: 16px; margin: 16px 0; }
    .card { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
    .card-label { font-size: 11px; color: #888; }
    .card-value { font-size: 22px; font-weight: bold; margin-top: 4px; }
    .card-value.green { color: #16a34a; }
    .card-value.orange { color: #ea580c; }

    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f5f5f5; font-size: 11px; text-transform: uppercase; color: #666; }
    tr:last-child td { border-bottom: none; }

    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }

    @media print {
      body { padding: 10mm; }
      @page { size: A4; margin: 10mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${empresaNome || 'ESPETINHOS 1000K'}</h1>
      <div class="meta">Relatorio de Vendas — ${periodo}</div>
    </div>
    <div class="meta right">
      Gerado em: ${dataGeracao}
    </div>
  </div>

  <div class="cards">
    <div class="card">
      <div class="card-label">Total em Vendas</div>
      <div class="card-value green">${formatCurrency(resumo.totalVendas)}</div>
    </div>
    <div class="card">
      <div class="card-label">Pedidos Fechados</div>
      <div class="card-value">${resumo.totalComandas}</div>
    </div>
    <div class="card">
      <div class="card-label">Valor Medio</div>
      <div class="card-value orange">${formatCurrency(resumo.valorMedio)}</div>
    </div>
  </div>

  <h2>Por Forma de Pagamento</h2>
  <table>
    <tr>
      <th>Forma</th>
      <th class="right">Valor</th>
      <th class="right">%</th>
    </tr>
    ${formasHTML || '<tr><td colspan="3">Sem dados</td></tr>'}
  </table>

  <h2>Produtos Mais Vendidos</h2>
  <table>
    <tr>
      <th>#</th>
      <th>Produto</th>
      <th class="right">Qtd</th>
      <th class="right">Total</th>
    </tr>
    ${produtosHTML || '<tr><td colspan="4">Sem dados</td></tr>'}
  </table>

  <div class="footer">
    ${empresaNome || 'Espetinhos 1000K'} — Relatorio gerado automaticamente pelo sistema
  </div>

  <div class="no-print" style="text-align: center; margin-top: 16px;">
    <button onclick="window.print()" style="padding: 10px 32px; font-size: 14px; cursor: pointer;">
      Salvar como PDF / Imprimir
    </button>
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}
