import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar mapeamentos de empresas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const companyId = searchParams.get('company_id');

    let query = supabaseAdmin
      .from('company_mappings')
      .select(`
        *,
        external_company:external_companies(*)
      `);

    if (companyId) {
      // Buscar mapeamentos de uma empresa específica
      query = query.eq('company_id', companyId);
    } else if (groupId) {
      // Buscar mapeamentos de um grupo
      query = query.eq('company_group_id', groupId);
    } else {
      return NextResponse.json({ error: 'group_id ou company_id é obrigatório' }, { status: 400 });
    }

    const { data: mappings, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar mapeamentos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ mappings: mappings || [] });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar mapeamento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, company_id, external_company_id } = body;

    if (!company_group_id || !company_id || !external_company_id) {
      return NextResponse.json(
        { error: 'company_group_id, company_id e external_company_id são obrigatórios' },
        { status: 400 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from('company_mappings')
      .select('id')
      .eq('company_group_id', company_group_id)
      .eq('external_company_id', external_company_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Esta empresa externa já está mapeada' },
        { status: 400 }
      );
    }

    const { data: mapping, error } = await supabaseAdmin
      .from('company_mappings')
      .insert({
        company_group_id,
        company_id,
        external_company_id
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar mapeamento:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ mapping }, { status: 201 });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Remover mapeamento
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('id');

    if (!mappingId) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('company_mappings')
      .delete()
      .eq('id', mappingId);

    if (error) {
      console.error('Erro ao excluir mapeamento:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
