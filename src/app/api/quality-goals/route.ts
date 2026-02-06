import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Listar metas de qualidade
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const companyId = searchParams.get('company_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    let query = supabase
      .from('quality_goals')
      .select(`
        *,
        company:companies(id, name)
      `)
      .eq('company_group_id', groupId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (year) query = query.eq('year', parseInt(year));
    if (month) query = query.eq('month', parseInt(month));
    if (companyId) query = query.eq('company_id', companyId);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ goals: data });
  } catch (error: any) {
    console.error('Erro ao buscar metas de qualidade:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar meta de qualidade
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, company_id, year, month, target_percentage } = body;

    if (!company_group_id || !company_id || !year || !month || target_percentage === undefined) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('quality_goals')
      .insert({
        company_group_id,
        company_id,
        year,
        month,
        target_percentage,
        is_active: true
      })
      .select(`
        *,
        company:companies(id, name)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma meta para esta empresa/período' },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ goal: data }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar meta de qualidade:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
