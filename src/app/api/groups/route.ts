import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar grupos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = supabaseAdmin
      .from('company_groups')
      .select('*')
      .order('name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar grupos:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar grupos' },
        { status: 500 }
      );
    }

    return NextResponse.json({ groups: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar grupo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, description, logo_url } = body;

    // Validações
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Nome e slug são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se slug já existe
    const { data: existingSlug } = await supabaseAdmin
      .from('company_groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Já existe um grupo com este slug' },
        { status: 400 }
      );
    }

    // Criar grupo
    const { data, error } = await supabaseAdmin
      .from('company_groups')
      .insert({
        name,
        slug,
        description: description || null,
        logo_url: logo_url || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar grupo:', error);
      return NextResponse.json(
        { error: 'Erro ao criar grupo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ group: data }, { status: 201 });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}