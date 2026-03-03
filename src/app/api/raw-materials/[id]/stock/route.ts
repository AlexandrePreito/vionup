import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar estoques vinculados a uma matéria-prima
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('raw_material_stock')
      .select(`
        *,
        external_stock:external_stock(*)
      `)
      .eq('raw_material_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar vínculos de estoque:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stockLinks: data || [] });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Vincular estoque a uma matéria-prima
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { external_stock_id, peso_unitario } = body;

    if (!external_stock_id) {
      return NextResponse.json({ error: 'external_stock_id é obrigatório' }, { status: 400 });
    }

    // Verificar se a matéria-prima existe
    const { data: mp, error: mpError } = await supabaseAdmin
      .from('raw_materials')
      .select('id')
      .eq('id', id)
      .single();

    if (mpError || !mp) {
      return NextResponse.json({ error: 'Matéria-prima não encontrada' }, { status: 404 });
    }

    // Verificar se o estoque existe
    const { data: stock, error: stockError } = await supabaseAdmin
      .from('external_stock')
      .select('id')
      .eq('id', external_stock_id)
      .single();

    if (stockError || !stock) {
      return NextResponse.json({ error: 'Estoque não encontrado' }, { status: 404 });
    }

    // Inserir vínculo com peso unitário
    const pesoUnit = peso_unitario ?? 1;

    const { data, error } = await supabaseAdmin
      .from('raw_material_stock')
      .insert({
        raw_material_id: id,
        external_stock_id,
        peso_unitario: pesoUnit
      })
      .select(`
        *,
        external_stock:external_stock(*)
      `)
      .single();

    if (error) {
      // Se for erro de duplicação, retornar mensagem amigável
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Este estoque já está vinculado a esta matéria-prima' }, { status: 409 });
      }
      console.error('Erro ao vincular estoque:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stockLink: data });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar peso unitário do vínculo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { link_id, peso_unitario } = body;

    if (!link_id) {
      return NextResponse.json({ error: 'link_id é obrigatório' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('raw_material_stock')
      .update({ peso_unitario: peso_unitario ?? 1 })
      .eq('id', link_id)
      .eq('raw_material_id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar peso unitário:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stockLink: data });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Desvincular estoque de uma matéria-prima
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('link_id');

    if (!linkId) {
      return NextResponse.json({ error: 'link_id é obrigatório' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('raw_material_stock')
      .delete()
      .eq('id', linkId)
      .eq('raw_material_id', id);

    if (error) {
      console.error('Erro ao desvincular estoque:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
