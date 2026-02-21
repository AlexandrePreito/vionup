import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const { raw_material_id, external_product_id, raw_material_name, parent_name, unit, projected_quantity, adjusted_quantity, current_stock, min_stock, loss_factor, notes } = body;

  // UUID válido = item de MP; senão = item de revenda (código em external_product_id)
  const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  const fromRevenda = external_product_id != null && external_product_id !== '' || (raw_material_id != null && raw_material_id !== '' && !isUuid(String(raw_material_id)));
  const productId = fromRevenda ? (external_product_id || raw_material_id) : null; // código revenda
  const materialId = fromRevenda ? null : raw_material_id || null;

  const insertPayload: Record<string, unknown> = {
    purchase_list_id: id,
    raw_material_id: materialId,
    external_product_id: productId || null,
    raw_material_name: raw_material_name ?? '',
    parent_name: parent_name || null,
    unit: unit || 'kg',
    projected_quantity: projected_quantity || 0,
    adjusted_quantity: adjusted_quantity || projected_quantity || 0,
    current_stock: current_stock || 0,
    min_stock: min_stock || 0,
    loss_factor: loss_factor || 0,
    notes: notes || null
  };

  const { data, error } = await supabaseAdmin
    .from('purchase_list_items')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const { item_id, adjusted_quantity, notes } = body;

  if (!item_id) {
    return NextResponse.json({ error: 'item_id é obrigatório' }, { status: 400 });
  }

  const updateData: any = {};
  if (adjusted_quantity !== undefined) updateData.adjusted_quantity = adjusted_quantity;
  if (notes !== undefined) updateData.notes = notes;

  const { data, error } = await supabaseAdmin
    .from('purchase_list_items')
    .update(updateData)
    .eq('id', item_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const item_id = searchParams.get('item_id');

  if (!item_id) {
    return NextResponse.json({ error: 'item_id é obrigatório' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('purchase_list_items')
    .delete()
    .eq('id', item_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
