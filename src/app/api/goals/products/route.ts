import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

    let query = supabaseAdmin
      .from('sales_goals')
      .select('*')
      .eq('company_group_id', groupId)
      .eq('goal_type', 'employee_product')
      .eq('is_active', true)
      .order('year', { ascending: false })
      .order('month', { ascending: true });

    if (year) {
      query = query.eq('year', parseInt(year));
    }
    if (month) {
      query = query.eq('month', parseInt(month));
    }
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: goals, error } = await query;

    if (error) {
      console.error('Erro ao buscar metas de produtos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!goals || goals.length === 0) {
      return NextResponse.json({ goals: [] });
    }

    // Buscar relacionamentos separadamente
    const goalsWithRelations = await Promise.all(
      goals.map(async (goal: any) => {
        const relations: any = {};

        // Buscar empresa
        if (goal.company_id) {
          try {
            const { data: company } = await supabaseAdmin
              .from('companies')
              .select('id, name')
              .eq('id', goal.company_id)
              .single();
            if (company) relations.company = company;
          } catch (e) {
            // Ignorar erro
          }
        }

        // Buscar funcionário
        if (goal.employee_id) {
          try {
            const { data: employee } = await supabaseAdmin
              .from('employees')
              .select('id, name')
              .eq('id', goal.employee_id)
              .single();
            if (employee) relations.employee = employee;
          } catch (e) {
            // Ignorar erro
          }
        }

        // Buscar produto
        if (goal.product_id) {
          try {
            const { data: product } = await supabaseAdmin
              .from('products')
              .select('id, name')
              .eq('id', goal.product_id)
              .single();
            if (product) relations.product = product;
          } catch (e) {
            // Ignorar erro
          }
        }

        return { ...goal, ...relations };
      })
    );

    return NextResponse.json({ goals: goalsWithRelations });
  } catch (error) {
    console.error('Erro na API de metas de produtos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      company_group_id,
      year,
      month,
      company_id,
      employee_id,
      product_id,
      goal_value,
      goal_unit
    } = body;

    // Validações
    if (!company_group_id) {
      return NextResponse.json({ error: 'company_group_id é obrigatório' }, { status: 400 });
    }
    if (!year || !month) {
      return NextResponse.json({ error: 'year e month são obrigatórios' }, { status: 400 });
    }
    if (!company_id) {
      return NextResponse.json({ error: 'company_id é obrigatório' }, { status: 400 });
    }
    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id é obrigatório' }, { status: 400 });
    }
    if (!product_id) {
      return NextResponse.json({ error: 'product_id é obrigatório' }, { status: 400 });
    }
    if (!goal_value || goal_value <= 0) {
      return NextResponse.json({ error: 'goal_value deve ser maior que zero' }, { status: 400 });
    }

    const insertData = {
      company_group_id,
      goal_type: 'employee_product',
      year,
      month,
      company_id,
      employee_id,
      product_id,
      goal_value,
      goal_unit: goal_unit || 'quantity',
      is_active: true
    };

    const { data: goal, error } = await supabaseAdmin
      .from('sales_goals')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar meta de produto:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe uma meta para este funcionário/produto neste período' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error('Erro na API de metas de produtos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
