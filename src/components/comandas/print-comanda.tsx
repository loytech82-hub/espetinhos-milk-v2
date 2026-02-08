'use client'

import { formatCurrency } from '@/lib/utils'
import type { Comanda, ComandaItem, Produto } from '@/lib/types'

interface PrintComandaProps {
  comanda: Comanda
  itens: ComandaItem[]
  empresaNome?: string
}

// Componente de impressao para impressora termica 80mm
// Usa window.print() com CSS @media print
export function printComanda(comanda: Comanda, itens: ComandaItem[], empresaNome = 'Espetinhos 1000K') {
  const subtotal = itens.reduce((acc, i) => acc + i.subtotal, 0)
  const taxa = comanda.taxa_servico || 0
  const desconto = comanda.desconto || 0
  const total = comanda.status === 'fechada' ? (comanda.total || 0) : subtotal

  const tipoLabel: Record<string, string> = {
    mesa: 'Mesa',
    balcao: 'Balcao',
    delivery: 'Delivery',
  }

  const fpLabel: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao_debito: 'Cartao Debito',
    cartao_credito: 'Cartao Credito',
  }

  const dataHora = new Date(comanda.aberta_em).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })

  // Monta HTML otimizado para 80mm (largura ~48 colunas de texto)
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Comanda #${String(comanda.numero).padStart(3, '0')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    width: 80mm;
    max-width: 80mm;
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .big { font-size: 16px; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .item-obs { font-size: 10px; color: #555; padding-left: 8px; }
  .header { padding: 8px 4px; }
  .body { padding: 4px; }
  .footer { padding: 8px 4px; }
  @media print {
    @page {
      size: 80mm auto;
      margin: 0;
    }
    body { width: 80mm; }
  }
</style>
</head>
<body>
  <div class="header center">
    <div class="bold big">${empresaNome}</div>
    <div style="margin-top:4px">Pedido #${String(comanda.numero).padStart(3, '0')}</div>
    <div>${tipoLabel[comanda.tipo] || comanda.tipo}${comanda.mesa_id ? ' ' + comanda.mesa_id : ''}${comanda.cliente_nome ? ' - ' + comanda.cliente_nome : ''}</div>
    <div>${dataHora}</div>
  </div>

  <div class="line"></div>

  <div class="body">
    <div class="row bold">
      <span>ITEM</span>
      <span>TOTAL</span>
    </div>
    <div class="line"></div>

    ${itens.map(item => {
      const nome = (item.produto as unknown as Produto)?.nome || 'Produto'
      return `
    <div class="row">
      <span>${item.quantidade}x ${nome}</span>
      <span>${formatCurrency(item.subtotal)}</span>
    </div>
    <div class="row" style="font-size:10px;color:#666">
      <span style="padding-left:16px">un: ${formatCurrency(item.preco_unitario)}</span>
      <span></span>
    </div>
    ${item.observacao ? `<div class="item-obs">* ${item.observacao}</div>` : ''}
      `
    }).join('')}

    <div class="line"></div>

    <div class="row">
      <span>Subtotal</span>
      <span>${formatCurrency(subtotal)}</span>
    </div>
    ${taxa > 0 ? `
    <div class="row">
      <span>Taxa 10%</span>
      <span>+${formatCurrency(taxa)}</span>
    </div>
    ` : ''}
    ${desconto > 0 ? `
    <div class="row">
      <span>Desconto</span>
      <span>-${formatCurrency(desconto)}</span>
    </div>
    ` : ''}

    <div class="line"></div>
    <div class="row bold big">
      <span>TOTAL</span>
      <span>${formatCurrency(total)}</span>
    </div>

    ${comanda.status === 'fechada' && comanda.forma_pagamento ? `
    <div class="line"></div>
    <div class="row">
      <span>Pago via</span>
      <span class="bold">${fpLabel[comanda.forma_pagamento] || comanda.forma_pagamento}</span>
    </div>
    ` : ''}
  </div>

  <div class="line"></div>

  <div class="footer center">
    <div>Obrigado pela preferencia!</div>
    <div style="margin-top:4px;font-size:10px">
      ${new Date().toLocaleString('pt-BR')}
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    }
  </script>
</body>
</html>
  `.trim()

  // Abrir janela de impressao
  const printWindow = window.open('', '_blank', 'width=350,height=600')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}

// Componente visual (para preview se necessario)
export function PrintComandaPreview({ comanda, itens, empresaNome = 'Espetinhos 1000K' }: PrintComandaProps) {
  return (
    <button
      type="button"
      onClick={() => printComanda(comanda, itens, empresaNome)}
      className="inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold text-text-muted bg-bg-elevated rounded-lg hover:bg-bg-placeholder transition-colors cursor-pointer"
    >
      Imprimir
    </button>
  )
}
