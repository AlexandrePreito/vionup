import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Buscar projeções salvas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const companyId = searchParams.get('company_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!groupId || !companyId || !year || !month) {
      return NextResponse.json(
        { error: 'group_id, company_id, year e month são obrigatórios' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('saved_projections')
      .select('*')
      .eq('company_group_id', groupId)
      .eq('company_id', companyId)
      .eq('year', parseInt(year))
      .eq('month', parseInt(month))
      .eq('is_active', true)
      .order('saved_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ projections: data || [] });
  } catch (error: unknown) {
    console.error('Erro ao buscar projeções:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Salvar nova projeção
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company_group_id,
      company_id,
      year,
      month,
      cenario_otimista,
      cenario_realista,
      cenario_pessimista,
      meta_empresa,
      realizado_no_save,
      dias_passados_no_save,
      projecao_diaria,
      saved_by,
      description
    } = body;

    if (!company_group_id || !company_id || year === undefined || year === null || month === undefined || month === null) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: company_group_id, company_id, year, month' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('saved_projections')
      .insert({
        company_group_id,
        company_id,
        year: Number(year),
        month: Number(month),
        cenario_otimista: cenario_otimista ?? 0,
        cenario_realista: cenario_realista ?? 0,
        cenario_pessimista: cenario_pessimista ?? 0,
        meta_empresa: meta_empresa ?? 0,
        realizado_no_save: realizado_no_save ?? 0,
        dias_passados_no_save: dias_passados_no_save ?? 0,
        projecao_diaria: projecao_diaria ?? [],
        saved_by: saved_by || null,
        description: description || null
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ projection: data });
  } catch (error: unknown) {
    console.error('Erro ao salvar projeção:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
