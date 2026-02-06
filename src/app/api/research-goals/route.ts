import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar metas de pesquisas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const type = searchParams.get('type');
    const companyId = searchParams.get('company_id');
    const employeeId = searchParams.get('employee_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('research_goals')
      .select(`
        *,
        company:companies(id, name),
        employee:employees(id, name)
      `)
      .eq('company_group_id', groupId)
      .eq('is_active', true)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (year) {
      query = query.eq('year', parseInt(year));
    }

    if (month) {
      query = query.eq('month', parseInt(month));
    }

    if (type) {
      query = query.eq('goal_type', type);
    }

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar metas de pesquisas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ goals: data || [] });
  } catch (error) {
    console.error('Erro ao buscar metas de pesquisas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar nova meta de pesquisa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company_group_id,
      goal_type,
      year,
      month,
      company_id,
      employee_id,
      goal_value,
      goal_unit
    } = body;

    // Validações
    if (!company_group_id) {
      return NextResponse.json({ error: 'company_group_id é obrigatório' }, { status: 400 });
    }

    if (!goal_type) {
      return NextResponse.json({ error: 'goal_type é obrigatório' }, { status: 400 });
    }

    const validTypes = ['research_note_company', 'research_note_employee', 'research_quantity_company', 'research_quantity_employee'];
    if (!validTypes.includes(goal_type)) {
      return NextResponse.json({ error: 'Tipo de meta inválido' }, { status: 400 });
    }

    if (!year || !month) {
      return NextResponse.json({ error: 'Ano e mês são obrigatórios' }, { status: 400 });
    }

    if (goal_value === undefined || goal_value === null) {
      return NextResponse.json({ error: 'Valor da meta é obrigatório' }, { status: 400 });
    }

    // Validar valor da nota (0-5)
    if (goal_unit === 'note' && (goal_value < 0 || goal_value > 5)) {
      return NextResponse.json({ error: 'Nota deve estar entre 0 e 5' }, { status: 400 });
    }

    // Validar quantidade (> 0)
    if (goal_unit === 'quantity' && goal_value < 0) {
      return NextResponse.json({ error: 'Quantidade deve ser maior ou igual a 0' }, { status: 400 });
    }

    // Validar empresa para tipos "company"
    if (goal_type.includes('_company') && !company_id) {
      return NextResponse.json({ error: 'Empresa é obrigatória para este tipo de meta' }, { status: 400 });
    }

    // Validar funcionário para tipos "employee"
    if (goal_type.includes('_employee') && !employee_id) {
      return NextResponse.json({ error: 'Funcionário é obrigatório para este tipo de meta' }, { status: 400 });
    }

    // Verificar duplicidade
    let duplicateQuery = supabaseAdmin
      .from('research_goals')
      .select('id')
      .eq('company_group_id', company_group_id)
      .eq('goal_type', goal_type)
      .eq('year', year)
      .eq('month', month)
      .eq('is_active', true);

    if (company_id) {
      duplicateQuery = duplicateQuery.eq('company_id', company_id);
    }
    if (employee_id) {
      duplicateQuery = duplicateQuery.eq('employee_id', employee_id);
    }

    const { data: existing } = await duplicateQuery.single();

    if (existing) {
      return NextResponse.json({ 
        error: 'Já existe uma meta deste tipo para este período e empresa/funcionário' 
      }, { status: 409 });
    }

    // Inserir meta
    const { data, error } = await supabaseAdmin
      .from('research_goals')
      .insert({
        company_group_id,
        goal_type,
        year,
        month,
        company_id: company_id || null,
        employee_id: employee_id || null,
        goal_value,
        goal_unit
      })
      .select(`
        *,
        company:companies(id, name),
        employee:employees(id, name)
      `)
      .single();

    if (error) {
      console.error('Erro ao criar meta de pesquisa:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ goal: data }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar meta de pesquisa:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
