import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

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
