import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar metas financeiras
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const companyId = searchParams.get('company_id');
    const categoryId = searchParams.get('category_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = supabaseAdmin
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
      .order('created_at', { ascending: false });

    if (groupId) {
      query = query.eq('company_group_id', groupId);
    }

    if (year) {
      query = query.eq('year', parseInt(year));
    }

    if (month) {
      query = query.eq('month', parseInt(month));
    }

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar metas financeiras:', error);
      return NextResponse.json({ error: 'Erro ao buscar metas financeiras' }, { status: 500 });
    }

    return NextResponse.json({ goals: data || [] });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar meta financeira
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company_group_id,
      category_id,
      company_id,
      year,
      month,
      goal_type,
      goal_value,
      description,
      responsible_ids
    } = body;

    if (!company_group_id || !category_id || !year || !month) {
      return NextResponse.json(
        { error: 'company_group_id, category_id, year e month são obrigatórios' },
        { status: 400 }
      );
    }

    if (goal_value === undefined || goal_value === null) {
      return NextResponse.json(
        { error: 'goal_value é obrigatório' },
        { status: 400 }
      );
    }

    const { data: goal, error: goalError } = await supabaseAdmin
      .from('financial_goals')
      .insert({
        company_group_id,
        category_id,
        company_id: company_id || null,
        year,
        month,
        goal_type: goal_type || 'value',
        goal_value,
        description: description || null,
      })
      .select(`
        *,
        category:categories(id, name, code, type, level, is_analytical, parent_id),
        company:companies(id, name)
      `)
      .single();

    if (goalError) {
      console.error('Erro ao criar meta financeira:', goalError);
      if (goalError.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma meta para esta categoria, empresa e período' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Erro ao criar meta financeira' }, { status: 500 });
    }

    if (responsible_ids && responsible_ids.length > 0) {
      const links = responsible_ids.map((rid: string) => ({
        financial_goal_id: goal.id,
        responsible_id: rid,
      }));

      const { error: linkError } = await supabaseAdmin
        .from('financial_goal_responsibles')
        .insert(links);

      if (linkError) {
        console.error('Erro ao vincular responsáveis:', linkError);
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
      .eq('id', goal.id)
      .single();

    return NextResponse.json({ goal: fullGoal ?? goal }, { status: 201 });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
