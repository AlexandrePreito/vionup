import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Listar resultados
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
      .from('quality_results_summary')
      .select('*')
      .eq('company_group_id', groupId)
      .order('evaluation_date', { ascending: false });

    if (year) query = query.eq('year', parseInt(year));
    if (month) query = query.eq('month', parseInt(month));
    if (companyId) query = query.eq('company_id', companyId);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ results: data });
  } catch (error: any) {
    console.error('Erro ao buscar resultados:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar resultado com itens
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, company_id, year, month, evaluation_date, notes, items } = body;

    if (!company_group_id || !company_id || !year || !month || !evaluation_date || !items?.length) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Criar o resultado principal
    const { data: result, error: resultError } = await supabase
      .from('quality_results')
      .insert({
        company_group_id,
        company_id,
        year,
        month,
        evaluation_date,
        notes
      })
      .select()
      .single();

    if (resultError) {
      if (resultError.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe um resultado para esta empresa/data' },
          { status: 400 }
        );
      }
      throw resultError;
    }

    // Criar os itens
    const itemsToInsert = items.map((item: any) => ({
      quality_result_id: result.id,
      category_id: item.category_id,
      achieved: item.achieved,
      total: item.total
    }));

    const { error: itemsError } = await supabase
      .from('quality_result_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // Buscar resultado completo
    const { data: fullResult, error: fetchError } = await supabase
      .from('quality_results_summary')
      .select('*')
      .eq('id', result.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({ result: fullResult }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar resultado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
