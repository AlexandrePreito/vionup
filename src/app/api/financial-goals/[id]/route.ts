import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Buscar meta por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('financial_goals')
      .select(`
        *,
        category:categories(id, name, code, type, level, is_analytical, parent_id),
        company:companies(id, name),
        responsibles:financial_goal_responsibles(
          id,
          responsible:financial_responsibles(id, name, email, role)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ goal: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar meta financeira
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      category_id,
      company_id,
      year,
      month,
      goal_type,
      goal_value,
      description,
      is_active,
      responsible_ids
    } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (category_id !== undefined) updateData.category_id = category_id;
    if (company_id !== undefined) updateData.company_id = company_id || null;
    if (year !== undefined) updateData.year = year;
    if (month !== undefined) updateData.month = month;
    if (goal_type !== undefined) updateData.goal_type = goal_type;
    if (goal_value !== undefined) updateData.goal_value = goal_value;
    if (description !== undefined) updateData.description = description || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: goal, error } = await supabaseAdmin
      .from('financial_goals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar meta:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma meta para esta categoria, empresa e período' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Erro ao atualizar meta' }, { status: 500 });
    }

    if (responsible_ids !== undefined) {
      await supabaseAdmin
        .from('financial_goal_responsibles')
        .delete()
        .eq('financial_goal_id', id);

      if (Array.isArray(responsible_ids) && responsible_ids.length > 0) {
        const links = responsible_ids.map((rid: string) => ({
          financial_goal_id: id,
          responsible_id: rid,
        }));

        await supabaseAdmin
          .from('financial_goal_responsibles')
          .insert(links);
      }
    }

    const { data: fullGoal } = await supabaseAdmin
      .from('financial_goals')
      .select(`
        *,
        category:categories(id, name, code, type, level, is_analytical, parent_id),
        company:companies(id, name),
        responsibles:financial_goal_responsibles(
          id,
          responsible:financial_responsibles(id, name, email, role)
        )
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({ goal: fullGoal ?? goal });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir meta financeira
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('financial_goals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir meta:', error);
      return NextResponse.json({ error: 'Erro ao excluir meta' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
