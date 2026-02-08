import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// POST /api/comandas/[id] — Fechar comanda (receber pagamento)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { formaPagamento, desconto } = await request.json()

    // Buscar comanda
    const { data: comanda, error: fetchErr } = await supabaseAdmin
      .from('comandas')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !comanda) {
      return NextResponse.json({ error: 'Comanda nao encontrada' }, { status: 404 })
    }

    if (comanda.status !== 'aberta') {
      return NextResponse.json({ error: 'Comanda nao esta aberta' }, { status: 400 })
    }

    const desc = desconto ?? 0
    const totalFinal = comanda.total - desc

    // Fechar comanda
    const { error } = await supabaseAdmin
      .from('comandas')
      .update({
        status: 'fechada',
        forma_pagamento: formaPagamento,
        taxa_servico: 0,
        desconto: desc,
        total: totalFinal,
        fechada_em: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Buscar turno aberto
    const { data: turno } = await supabaseAdmin
      .from('caixa_turnos')
      .select('id')
      .eq('status', 'aberto')
      .order('aberto_em', { ascending: false })
      .limit(1)
      .single()

    // Registrar entrada no caixa
    await supabaseAdmin.from('caixa').insert({
      tipo: 'entrada',
      valor: totalFinal,
      descricao: `Comanda #${comanda.numero} (${comanda.tipo})`,
      forma_pagamento: formaPagamento,
      comanda_id: id,
      turno_id: turno?.id || null,
    })

    // Liberar mesa
    if (comanda.tipo === 'mesa' && comanda.mesa_id) {
      await supabaseAdmin.from('mesas').update({ status: 'livre' }).eq('id', comanda.mesa_id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// PUT /api/comandas/[id] — Remover item da comanda
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: comandaId } = await params

  try {
    const { itemId } = await request.json()

    // Buscar item para restaurar estoque
    const { data: item } = await supabaseAdmin
      .from('comanda_itens')
      .select('*, produto:produtos(*)')
      .eq('id', itemId)
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Item nao encontrado' }, { status: 404 })
    }

    // Deletar item
    const { error } = await supabaseAdmin.from('comanda_itens').delete().eq('id', itemId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Restaurar estoque se necessario
    if (item.produto?.controlar_estoque) {
      const novoEstoque = (item.produto.estoque_atual || 0) + item.quantidade
      await supabaseAdmin
        .from('produtos')
        .update({ estoque_atual: novoEstoque })
        .eq('id', item.produto_id)

      // Registrar movimentacao
      await supabaseAdmin.from('estoque_movimentos').insert({
        produto_id: item.produto_id,
        tipo: 'cancelamento',
        quantidade: item.quantidade,
        estoque_anterior: item.produto.estoque_atual || 0,
        estoque_posterior: novoEstoque,
        motivo: `Item removido da comanda`,
        comanda_id: comandaId,
      })
    }

    // Recalcular total da comanda
    const { data: itens } = await supabaseAdmin
      .from('comanda_itens')
      .select('subtotal')
      .eq('comanda_id', comandaId)

    const total = itens?.reduce((sum, i) => sum + i.subtotal, 0) || 0
    await supabaseAdmin.from('comandas').update({ total }).eq('id', comandaId)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// DELETE /api/comandas/[id] — Excluir comanda e registros relacionados
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Buscar comanda
    const { data: comanda, error: fetchErr } = await supabaseAdmin
      .from('comandas')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !comanda) {
      return NextResponse.json({ error: 'Comanda nao encontrada' }, { status: 404 })
    }

    // Se aberta, restaurar estoque e liberar mesa antes de excluir
    if (comanda.status === 'aberta') {
      const { data: itens } = await supabaseAdmin
        .from('comanda_itens')
        .select('*, produto:produtos(*)')
        .eq('comanda_id', id)

      if (itens) {
        for (const item of itens) {
          if (item.produto?.controlar_estoque) {
            const novoEstoque = (item.produto.estoque_atual || 0) + item.quantidade
            await supabaseAdmin
              .from('produtos')
              .update({ estoque_atual: novoEstoque })
              .eq('id', item.produto_id)
          }
        }
      }

      // Liberar mesa
      if (comanda.mesa_id) {
        await supabaseAdmin.from('mesas').update({ status: 'livre' }).eq('id', comanda.mesa_id)
      }
    }

    // Deletar registros relacionados (ordem: dependentes primeiro)
    await supabaseAdmin.from('caixa').delete().eq('comanda_id', id)
    await supabaseAdmin.from('estoque_movimentos').delete().eq('comanda_id', id)
    await supabaseAdmin.from('comanda_itens').delete().eq('comanda_id', id)

    // Deletar a comanda
    const { error } = await supabaseAdmin.from('comandas').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// PATCH /api/comandas/[id] — Cancelar comanda (restaura estoque, libera mesa)
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Buscar comanda
    const { data: comanda, error: fetchErr } = await supabaseAdmin
      .from('comandas')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !comanda) {
      return NextResponse.json({ error: 'Comanda nao encontrada' }, { status: 404 })
    }

    if (comanda.status !== 'aberta') {
      return NextResponse.json({ error: 'Comanda nao esta aberta' }, { status: 400 })
    }

    // Restaurar estoque dos itens
    const { data: itens } = await supabaseAdmin
      .from('comanda_itens')
      .select('*, produto:produtos(*)')
      .eq('comanda_id', id)

    if (itens) {
      for (const item of itens) {
        if (item.produto?.controlar_estoque) {
          const novoEstoque = (item.produto.estoque_atual || 0) + item.quantidade
          await supabaseAdmin
            .from('produtos')
            .update({ estoque_atual: novoEstoque })
            .eq('id', item.produto_id)
        }
      }
    }

    // Atualizar status para cancelada
    const { error } = await supabaseAdmin
      .from('comandas')
      .update({ status: 'cancelada', fechada_em: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Liberar mesa
    if (comanda.mesa_id) {
      await supabaseAdmin.from('mesas').update({ status: 'livre' }).eq('id', comanda.mesa_id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
