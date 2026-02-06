import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Buscar resultado com itens
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar resultado
    const { data: result, error: resultError } = await supabase
      .from('quality_results_summary')
      .select('*')
      .eq('id', id)
      .single();

    if (resultError) throw resultError;

    // Buscar itens
    const { data: items, error: itemsError } = await supabase
      .from('quality_result_items')
      .select(`
        *,
        category:quality_categories(id, name)
      `)
      .eq('quality_result_id', id)
      .order('created_at', { ascending: true });

    if (itemsError) throw itemsError;

    return NextResponse.json({ result, items });
  } catch (error: any) {
    console.error('Erro ao buscar resultado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar resultado e itens
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { evaluation_date, notes, items } = body;

    // Atualizar resultado principal
    const updateData: any = { updated_at: new Date().toISOString() };
    if (evaluation_date) updateData.evaluation_date = evaluation_date;
    if (notes !== undefined) updateData.notes = notes;

    const { error: resultError } = await supabase
      .from('quality_results')
      .update(updateData)
      .eq('id', id);

    if (resultError) throw resultError;

    // Se tem itens, atualizar
    if (items?.length) {
      // Deletar itens antigos
      await supabase
        .from('quality_result_items')
        .delete()
        .eq('quality_result_id', id);

      // Inserir novos itens
      const itemsToInsert = items.map((item: any) => ({
        quality_result_id: id,
        category_id: item.category_id,
        achieved: item.achieved,
        total: item.total
      }));

      const { error: itemsError } = await supabase
        .from('quality_result_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // Buscar resultado atualizado
    const { data: fullResult, error: fetchError } = await supabase
      .from('quality_results_summary')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({ result: fullResult });
  } catch (error: any) {
    console.error('Erro ao atualizar resultado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir resultado
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Os itens serão deletados automaticamente pelo ON DELETE CASCADE
    const { error } = await supabase
      .from('quality_results')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir resultado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
