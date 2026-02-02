import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar modos de venda
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = supabaseAdmin
      .from('sale_modes')
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .order('name', { ascending: true });

    if (groupId) {
      query = query.eq('company_group_id', groupId);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar modos de venda:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar modos de venda' },
        { status: 500 }
      );
    }

    return NextResponse.json({ saleModes: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar modo de venda
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, name, code, description } = body;

    // Validações
    if (!company_group_id || !name) {
      return NextResponse.json(
        { error: 'Grupo e nome são obrigatórios' },
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

    // Verificar se código já existe no mesmo grupo (se informado)
    if (code) {
      const { data: existingCode } = await supabaseAdmin
        .from('sale_modes')
        .select('id')
        .eq('company_group_id', company_group_id)
        .eq('code', code)
        .single();

      if (existingCode) {
        return NextResponse.json(
          { error: 'Já existe um modo de venda com este código neste grupo' },
          { status: 400 }
        );
      }
    }

    // Criar modo de venda
    const { data, error } = await supabaseAdmin
      .from('sale_modes')
      .insert({
        company_group_id,
        name,
        code: code || null,
        description: description || null,
        is_active: true
      })
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .single();

    if (error) {
      console.error('Erro ao criar modo de venda:', error);
      return NextResponse.json(
        { error: 'Erro ao criar modo de venda' },
        { status: 500 }
      );
    }

    return NextResponse.json({ saleMode: data }, { status: 201 });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
