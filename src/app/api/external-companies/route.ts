import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar empresas externas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    const { data: externalCompanies, error } = await supabaseAdmin
      .from('external_companies')
      .select('*')
      .eq('company_group_id', groupId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao buscar empresas externas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ externalCompanies: externalCompanies || [] });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Importar empresas externas (bulk)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const companies = Array.isArray(body) ? body : [body];

    if (companies.length === 0) {
      return NextResponse.json({ error: 'Nenhuma empresa para importar' }, { status: 400 });
    }

    for (const company of companies) {
      if (!company.company_group_id || !company.external_id) {
        return NextResponse.json(
          { error: 'company_group_id e external_id são obrigatórios' },
          { status: 400 }
        );
      }
    }

    const { data: externalCompanies, error } = await supabaseAdmin
      .from('external_companies')
      .upsert(companies, {
        onConflict: 'company_group_id,external_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Erro ao importar empresas externas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ externalCompanies }, { status: 201 });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
