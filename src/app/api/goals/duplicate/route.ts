import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      group_id,
      from_year,
      from_month,
      to_year,
      to_month
    } = body;

    if (!group_id || !from_year || !from_month || !to_year || !to_month) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: group_id, from_year, from_month, to_year, to_month' 
      }, { status: 400 });
    }

    // Buscar metas do mês de origem
    const { data: sourceGoals, error: fetchError } = await supabaseAdmin
      .from('sales_goals')
      .select('*')
      .eq('company_group_id', group_id)
      .eq('year', from_year)
      .eq('month', from_month)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Erro ao buscar metas de origem:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!sourceGoals || sourceGoals.length === 0) {
      return NextResponse.json({ error: 'Nenhuma meta encontrada no mês de origem' }, { status: 400 });
    }

    // Verificar se já existem metas no mês de destino
    const { data: existingGoals } = await supabaseAdmin
      .from('sales_goals')
      .select('id')
      .eq('company_group_id', group_id)
      .eq('year', to_year)
      .eq('month', to_month)
      .eq('is_active', true)
      .limit(1);

    if (existingGoals && existingGoals.length > 0) {
      return NextResponse.json({ 
        error: 'Já existem metas no mês de destino. Exclua-as primeiro ou escolha outro mês.' 
      }, { status: 400 });
    }

    // Criar novas metas para o mês de destino
    const newGoals = sourceGoals.map(goal => ({
      company_group_id: goal.company_group_id,
      goal_type: goal.goal_type,
      year: to_year,
      month: to_month,
      company_id: goal.company_id,
      employee_id: goal.employee_id,
      external_product_id: goal.external_product_id,
      shift_id: goal.shift_id,
      sale_mode_id: goal.sale_mode_id,
      custom_name: goal.custom_name,
      custom_description: goal.custom_description,
      goal_value: goal.goal_value,
      goal_unit: goal.goal_unit,
      is_active: true
    }));

    const { data: insertedGoals, error: insertError } = await supabaseAdmin
      .from('sales_goals')
      .insert(newGoals)
      .select();

    if (insertError) {
      console.error('Erro ao duplicar metas:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: insertedGoals?.length || 0,
      message: `${insertedGoals?.length || 0} metas duplicadas com sucesso`
    });
  } catch (error) {
    console.error('Erro na API de duplicar metas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
