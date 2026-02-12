import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: goal, error } = await supabaseAdmin
      .from('sales_goals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar meta:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!goal) {
      return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });
    }

    // Buscar relacionamentos separadamente
    const relations: any = {};

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

    return NextResponse.json({ goal: { ...goal, ...relations } });
  } catch (error) {
    console.error('Erro na API de meta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
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
      parent_goal_id
    } = body;

    // Buscar meta atual para validação de duplicidade (metas de pesquisa)
    const { data: currentGoal, error: fetchError } = await supabaseAdmin
      .from('sales_goals')
      .select('goal_type, company_group_id, year, month, company_id, employee_id')
      .eq('id', id)
      .single();

    if (fetchError || !currentGoal) {
      return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });
    }

    const isResearchGoal = typeof currentGoal.goal_type === 'string' && currentGoal.goal_type.startsWith('research_');
    if (isResearchGoal) {
      const checkYear = year !== undefined ? year : currentGoal.year;
      const checkMonth = month !== undefined ? month : currentGoal.month;
      const checkCompanyId = company_id !== undefined ? (company_id || null) : currentGoal.company_id;
      const checkEmployeeId = employee_id !== undefined ? (employee_id || null) : currentGoal.employee_id;

      let dupQuery = supabaseAdmin
        .from('sales_goals')
        .select('id')
        .eq('company_group_id', currentGoal.company_group_id)
        .eq('goal_type', currentGoal.goal_type)
        .eq('year', checkYear)
        .eq('month', checkMonth)
        .eq('is_active', true)
        .neq('id', id);
      if (currentGoal.goal_type.includes('_employee')) {
        dupQuery = checkCompanyId ? dupQuery.eq('company_id', checkCompanyId) : dupQuery.is('company_id', null);
        dupQuery = checkEmployeeId ? dupQuery.eq('employee_id', checkEmployeeId) : dupQuery.is('employee_id', null);
      } else {
        dupQuery = checkCompanyId ? dupQuery.eq('company_id', checkCompanyId) : dupQuery.is('company_id', null);
      }
      const { data: existingRows } = await dupQuery.limit(1);
      if (existingRows && existingRows.length > 0) {
        return NextResponse.json({
          error: 'Já existe outra meta deste tipo para o mesmo mês, ano e ' + (currentGoal.goal_type.includes('_employee') ? 'empresa/funcionário' : 'empresa') + '.'
        }, { status: 409 });
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (year !== undefined) updateData.year = year;
    if (month !== undefined) updateData.month = month;
    if (goal_value !== undefined) updateData.goal_value = goal_value;
    if (goal_unit !== undefined) updateData.goal_unit = goal_unit;
    if (company_id !== undefined) updateData.company_id = company_id || null;
    if (employee_id !== undefined) updateData.employee_id = employee_id || null;
    if (external_product_id !== undefined) updateData.external_product_id = external_product_id || null;
    if (product_id !== undefined) updateData.product_id = product_id || null;
    if (shift_id !== undefined) updateData.shift_id = shift_id || null;
    if (sale_mode_id !== undefined) updateData.sale_mode_id = sale_mode_id || null;
    if (custom_name !== undefined) updateData.custom_name = custom_name || null;
    if (custom_description !== undefined) updateData.custom_description = custom_description || null;
    if (parent_goal_id !== undefined) updateData.parent_goal_id = parent_goal_id || null;

    const { data: goal, error } = await supabaseAdmin
      .from('sales_goals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar meta:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ goal });
  } catch (error) {
    console.error('Erro na API de meta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('sales_goals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir meta:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API de meta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
