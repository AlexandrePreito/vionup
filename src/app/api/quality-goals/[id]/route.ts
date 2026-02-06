import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT - Atualizar meta
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { target_percentage, is_active } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (target_percentage !== undefined) updateData.target_percentage = target_percentage;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('quality_goals')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        company:companies(id, name)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ goal: data });
  } catch (error: any) {
    console.error('Erro ao atualizar meta:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir meta
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('quality_goals')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir meta:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
