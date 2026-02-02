import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const type = searchParams.get('type');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    // Primeiro, tentar buscar sem relacionamentos para verificar se a tabela existe
    let query = supabaseAdmin
      .from('sales_goals')
      .select('*')
      .eq('company_group_id', groupId)
      .eq('is_active', true)
      .order('year', { ascending: false })
      .order('month', { ascending: true })
      .order('goal_type', { ascending: true });

    if (year) {
      query = query.eq('year', parseInt(year));
    }
    if (month) {
      query = query.eq('month', parseInt(month));
    }
    if (type) {
      query = query.eq('goal_type', type);
    }

    const { data: goals, error } = await query;

    if (error) {
      console.error('Erro ao buscar metas:', error);
      console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: error.message || 'Erro ao buscar metas',
        details: error.details || error.hint || null
      }, { status: 500 });
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

        // Buscar turno
        if (goal.shift_id) {
          try {
            const { data: shift } = await supabaseAdmin
              .from('shifts')
              .select('id, name')
              .eq('id', goal.shift_id)
              .single();
            if (shift) relations.shift = shift;
          } catch (e) {
            // Ignorar erro
          }
        }

        // Buscar modo de venda
        if (goal.sale_mode_id) {
          try {
            const { data: saleMode } = await supabaseAdmin
              .from('sale_modes')
              .select('id, name')
              .eq('id', goal.sale_mode_id)
              .single();
            if (saleMode) relations.sale_mode = saleMode;
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

        // Buscar meta pai (para hierarquia)
        if (goal.parent_goal_id) {
          try {
            const { data: parentGoal } = await supabaseAdmin
              .from('sales_goals')
              .select('id, goal_type, goal_value, custom_name, company_id, shift_id, sale_mode_id')
              .eq('id', goal.parent_goal_id)
              .single();
            if (parentGoal) {
              // Buscar nome descritivo da meta pai
              let parentName = '';
              if (parentGoal.goal_type === 'company_revenue' && parentGoal.company_id) {
                const { data: company } = await supabaseAdmin
                  .from('companies')
                  .select('name')
                  .eq('id', parentGoal.company_id)
                  .single();
                parentName = company?.name || 'Empresa';
              } else if (parentGoal.goal_type === 'shift' && parentGoal.shift_id) {
                const { data: shift } = await supabaseAdmin
                  .from('shifts')
                  .select('name')
                  .eq('id', parentGoal.shift_id)
                  .single();
                parentName = shift?.name || 'Turno';
              } else if (parentGoal.goal_type === 'sale_mode' && parentGoal.sale_mode_id) {
                const { data: saleMode } = await supabaseAdmin
                  .from('sale_modes')
                  .select('name')
                  .eq('id', parentGoal.sale_mode_id)
                  .single();
                parentName = saleMode?.name || 'Modo';
              }
              relations.parent_goal = { ...parentGoal, name: parentName };
            }
          } catch (e) {
            // Ignorar erro
          }
        }

        return { ...goal, ...relations };
      })
    );

    return NextResponse.json({ goals: goalsWithRelations });
  } catch (error) {
    console.error('Erro na API de metas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

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
      external_product_id,
      product_id,
      shift_id,
      sale_mode_id,
      custom_name,
      custom_description,
      goal_value,
      goal_unit,
      derived_from_goal_id,
      parent_goal_id
    } = body;

    if (!company_group_id || !goal_type || !year || !month || !goal_value) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: company_group_id, goal_type, year, month, goal_value' 
      }, { status: 400 });
    }

    // Validar campos específicos por tipo
    if (goal_type === 'company_revenue' && !company_id) {
      return NextResponse.json({ error: 'Empresa é obrigatória para meta de faturamento empresa' }, { status: 400 });
    }
    if ((goal_type === 'employee_revenue' || goal_type === 'employee_product') && !employee_id) {
      return NextResponse.json({ error: 'Funcionário é obrigatório para meta de faturamento/produto por funcionário' }, { status: 400 });
    }
    if (goal_type === 'employee_product' && !external_product_id && !product_id) {
      return NextResponse.json({ error: 'Produto é obrigatório para meta de produto por funcionário' }, { status: 400 });
    }
    if (goal_type === 'shift' && !shift_id) {
      return NextResponse.json({ error: 'Turno é obrigatório para meta por turno' }, { status: 400 });
    }
    if (goal_type === 'sale_mode' && !sale_mode_id) {
      return NextResponse.json({ error: 'Modo de venda é obrigatório para meta por modo de venda' }, { status: 400 });
    }
    if (goal_type === 'custom' && !custom_name) {
      return NextResponse.json({ error: 'Nome é obrigatório para meta personalizada' }, { status: 400 });
    }

    const insertData: any = {
      company_group_id,
      goal_type,
      year,
      month,
      goal_value,
      goal_unit: goal_unit || 'currency',
      is_active: true
    };

    // Adicionar campos específicos
    if (company_id) insertData.company_id = company_id;
    if (employee_id) insertData.employee_id = employee_id;
    if (external_product_id) insertData.external_product_id = external_product_id;
    if (product_id) insertData.product_id = product_id;
    if (shift_id) insertData.shift_id = shift_id;
    if (sale_mode_id) insertData.sale_mode_id = sale_mode_id;
    if (custom_name) insertData.custom_name = custom_name;
    if (custom_description) insertData.custom_description = custom_description;
    if (derived_from_goal_id) insertData.derived_from_goal_id = derived_from_goal_id;
    if (parent_goal_id) insertData.parent_goal_id = parent_goal_id;

    const { data: goal, error } = await supabaseAdmin
      .from('sales_goals')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar meta:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe uma meta com essas características para este período' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error('Erro na API de metas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
