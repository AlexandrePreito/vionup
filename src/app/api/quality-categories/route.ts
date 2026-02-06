import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Listar categorias
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const activeOnly = searchParams.get('active_only') !== 'false';

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    let query = supabase
      .from('quality_categories')
      .select('*')
      .eq('company_group_id', groupId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ categories: data });
  } catch (error: any) {
    console.error('Erro ao buscar categorias:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar categoria
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, name, display_order } = body;

    if (!company_group_id || !name) {
      return NextResponse.json(
        { error: 'company_group_id e name são obrigatórios' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('quality_categories')
      .insert({
        company_group_id,
        name: name.trim(),
        display_order: display_order || 0,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma categoria com este nome' },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar categoria:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
