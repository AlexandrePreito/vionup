import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar produtos vinculados
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('raw_material_products')
      .select('*')
      .eq('raw_material_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar produtos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data || [] });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Vincular produto
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { external_product_id, quantity_per_unit } = body;

    if (!external_product_id || !quantity_per_unit) {
      return NextResponse.json(
        { error: 'external_product_id e quantity_per_unit são obrigatórios' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('raw_material_products')
      .upsert({
        raw_material_id: id,
        external_product_id,
        quantity_per_unit
      }, {
        onConflict: 'raw_material_id,external_product_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao vincular produto:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product: data }, { status: 201 });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar quantidade do produto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { product_id, quantity_per_unit } = body;

    if (!product_id || !quantity_per_unit) {
      return NextResponse.json(
        { error: 'product_id e quantity_per_unit são obrigatórios' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('raw_material_products')
      .update({ quantity_per_unit })
      .eq('id', product_id)
      .eq('raw_material_id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar quantidade:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product: data });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Desvincular produto
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json({ error: 'product_id é obrigatório' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('raw_material_products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Erro ao desvincular produto:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
