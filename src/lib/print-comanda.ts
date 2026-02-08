import type { Comanda, ComandaItem } from './types'
import { formatCurrency } from './utils'

/**
 * Gera HTML para impressao de comanda em impressora termica 80mm.
 * Abre em nova janela e imprime automaticamente.
 */
export function printComanda(
  comanda: Comanda,
  itens: ComandaItem[],
  empresaNome?: string
) {
  const subtotal = itens.reduce((acc, i) => acc + i.subtotal, 0)
  const desconto = comanda.desconto || 0
  const total = comanda.total || subtotal

  const tipoLabel = comanda.tipo === 'mesa' ? 'Mesa' : comanda.tipo === 'balcao' ? 'Balcao' : 'Delivery'
  const dataHora = new Date(comanda.aberta_em).toLocaleString('pt-BR')
  const numero = String(comanda.numero).padStart(3, '0')

  const itensHTML = itens.map(item => {
    const nome = (item.produto as { nome?: string })?.nome || 'Produto'
    const obs = item.observacao ? `<div class="obs">  * ${item.observacao}</div>` : ''
    return `
      <tr>
        <td>${item.quantidade}x</td>
        <td>${nome}</td>
        <td class="right">${formatCurrency(item.subtotal)}</td>
      </tr>
      ${obs ? `<tr><td colspan="3">${obs}</td></tr>` : ''}
    `
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comanda #${numero}</title>
  <style>
    /* Reset para impressora termica 80mm */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 80mm;
      max-width: 80mm;
      color: #000;
      background: #fff;
      padding: 4mm;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .big { font-size: 16px; }
    .small { font-size: 10px; }
    .line { border-top: 1px dashed #000; margin: 4px 0; }
    .double-line { border-top: 2px solid #000; margin: 4px 0; }

    h1 { font-size: 18px; font-weight: bold; }
    h2 { font-size: 14px; font-weight: bold; }

    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; vertical-align: top; }

    .obs { font-size: 10px; font-style: italic; color: #555; }
    .info { margin: 4px 0; }
    .total-row td { font-size: 14px; font-weight: bold; padding-top: 4px; }

    @media print {
      body { width: 80mm; }
      @page { size: 80mm auto; margin: 0; }
    }

    /* Botao imprimir (nao aparece na impressao) */
    .no-print { margin-top: 10px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="center">
    <h1>ESPETINHOS 1000K</h1>
    <div class="small">Sistema de Comandas</div>
  </div>

  <div class="line"></div>

  <div class="center">
    <h2>PEDIDO #${numero}</h2>
    <div class="small">${tipoLabel}${comanda.cliente_nome ? ' - ' + comanda.cliente_nome : ''}</div>
    <div class="small">${dataHora}</div>
  </div>

  <div class="double-line"></div>

  <table>
    <tr class="bold">
      <td>Qtd</td>
      <td>Item</td>
      <td class="right">Valor</td>
    </tr>
    <tr><td colspan="3"><div class="line"></div></td></tr>
    ${itensHTML}
  </table>

  <div class="double-line"></div>

  <table>
    <tr>
      <td>Subtotal</td>
      <td class="right">${formatCurrency(subtotal)}</td>
    </tr>
    ${desconto > 0 ? `<tr><td>Desconto</td><td class="right">-${formatCurrency(desconto)}</td></tr>` : ''}
    <tr><td colspan="2"><div class="line"></div></td></tr>
    <tr class="total-row">
      <td>TOTAL</td>
      <td class="right big bold">${formatCurrency(total)}</td>
    </tr>
    ${comanda.forma_pagamento ? `<tr><td class="small">Pago via</td><td class="right small">${
      comanda.forma_pagamento === 'cartao_debito' ? 'Cartao Debito'
        : comanda.forma_pagamento === 'cartao_credito' ? 'Cartao Credito'
          : comanda.forma_pagamento === 'pix' ? 'PIX'
            : comanda.forma_pagamento === 'dinheiro' ? 'Dinheiro'
              : comanda.forma_pagamento
    }</td></tr>` : ''}
  </table>

  <div class="line"></div>

  <div class="center small" style="margin-top: 8px;">
    Obrigado pela preferencia!<br>
    Volte sempre :)
  </div>

  <div class="center no-print">
    <button onclick="window.print()" style="padding: 8px 24px; font-size: 14px; margin-top: 8px; cursor: pointer;">
      Imprimir
    </button>
  </div>

  <script>
    // Auto-print ao abrir
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`

  // Abrir nova janela com o HTML
  const printWindow = window.open('', '_blank', 'width=320,height=600')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}
