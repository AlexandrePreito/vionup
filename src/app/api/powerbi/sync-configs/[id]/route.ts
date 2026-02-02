import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Buscar configuração específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('powerbi_sync_configs')
      .select(`
        *,
        connection:powerbi_connections(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar config:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ config: data });
  } catch (error) {
    console.error('Erro ao buscar config:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar configuração
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      dataset_id,
      dax_query,
      field_mapping,
      is_active,
      sync_interval_minutes,
      // Campos incrementais
      date_field,
      initial_date,
      incremental_days,
      is_incremental
    } = body;

    const updateData: Record<string, any> = {};

    if (dataset_id !== undefined) updateData.dataset_id = dataset_id;
    if (dax_query !== undefined) updateData.dax_query = dax_query;
    if (field_mapping !== undefined) updateData.field_mapping = field_mapping;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (sync_interval_minutes !== undefined) updateData.sync_interval_minutes = sync_interval_minutes;
    if (date_field !== undefined) updateData.date_field = date_field;
    if (initial_date !== undefined) updateData.initial_date = initial_date;
    if (incremental_days !== undefined) updateData.incremental_days = incremental_days;
    if (is_incremental !== undefined) updateData.is_incremental = is_incremental;

    const { data, error } = await supabaseAdmin
      .from('powerbi_sync_configs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar config:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ config: data });
  } catch (error) {
    console.error('Erro ao atualizar config:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir configuração
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('powerbi_sync_configs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir config:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir config:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
