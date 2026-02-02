import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Obter matéria-prima por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('raw_materials')
      .select(`
        *,
        raw_material_products (
          id,
          external_product_id,
          quantity_per_unit
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar matéria-prima:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rawMaterial: data });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar matéria-prima
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      name, 
      unit, 
      loss_factor, 
      min_stock, 
      current_stock,
      category,
      is_resale,
      is_active,
      company_id
    } = body;

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (unit !== undefined) updateData.unit = unit;
    if (loss_factor !== undefined) updateData.loss_factor = loss_factor;
    if (min_stock !== undefined) updateData.min_stock = min_stock;
    if (current_stock !== undefined) updateData.current_stock = current_stock;
    if (category !== undefined) updateData.category = category;
    if (is_resale !== undefined) updateData.is_resale = is_resale;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (company_id !== undefined) updateData.company_id = company_id;

    const { data, error } = await supabaseAdmin
      .from('raw_materials')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar matéria-prima:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rawMaterial: data });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir matéria-prima
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('raw_materials')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir matéria-prima:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
