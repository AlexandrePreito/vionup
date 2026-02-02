import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar empresas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = supabaseAdmin
      .from('companies')
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .order('name', { ascending: true });

    // Filtrar por grupo se informado
    if (groupId) {
      query = query.eq('company_group_id', groupId);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar empresas:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar empresas' },
        { status: 500 }
      );
    }

    return NextResponse.json({ companies: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar empresa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, name, slug, cnpj, logo_url } = body;

    // Validações
    if (!company_group_id || !name || !slug) {
      return NextResponse.json(
        { error: 'Grupo, nome e slug são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se grupo existe
    const { data: group } = await supabaseAdmin
      .from('company_groups')
      .select('id')
      .eq('id', company_group_id)
      .single();

    if (!group) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 400 }
      );
    }

    // Verificar se slug já existe no mesmo grupo
    const { data: existingSlug } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('company_group_id', company_group_id)
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Já existe uma empresa com este slug neste grupo' },
        { status: 400 }
      );
    }

    // Criar empresa
    const { data, error } = await supabaseAdmin
      .from('companies')
      .insert({
        company_group_id,
        name,
        slug,
        cnpj: cnpj || null,
        logo_url: logo_url || null,
        is_active: true
      })
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .single();

    if (error) {
      console.error('Erro ao criar empresa:', error);
      return NextResponse.json(
        { error: 'Erro ao criar empresa' },
        { status: 500 }
      );
    }

    return NextResponse.json({ company: data }, { status: 201 });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}