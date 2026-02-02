import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar mapeamentos de categorias
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const categoryId = searchParams.get('category_id');

    // Buscar todos os registros (Supabase tem limite de 1000 por padrão)
    const allData: any[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabaseAdmin
        .from('category_mappings')
        .select(`
          *,
          category:categories(id, name, code, level, type, is_analytical),
          external_category:external_categories(id, external_id, layer_01, layer_02, layer_03, layer_04)
        `)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (groupId) {
        query = query.eq('company_group_id', groupId);
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar mapeamentos:', error);
        return NextResponse.json(
          { error: 'Erro ao buscar mapeamentos' },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        allData.push(...data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    return NextResponse.json({ mappings: allData });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar mapeamento de categoria
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, category_id, external_category_id } = body;

    // Validações
    if (!company_group_id || !category_id || !external_category_id) {
      return NextResponse.json(
        { error: 'company_group_id, category_id e external_category_id são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se categoria interna é analítica
    const { data: category, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('is_analytical')
      .eq('id', category_id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 400 }
      );
    }

    if (!category.is_analytical) {
      return NextResponse.json(
        { error: 'Apenas categorias analíticas podem ser mapeadas' },
        { status: 400 }
      );
    }

    // Verificar se já existe esse mapeamento
    const { data: existing } = await supabaseAdmin
      .from('category_mappings')
      .select('id')
      .eq('category_id', category_id)
      .eq('external_category_id', external_category_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Este mapeamento já existe' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('category_mappings')
      .insert({
        company_group_id,
        category_id,
        external_category_id
      })
      .select(`
        *,
        category:categories(id, name, code, level, type, is_analytical),
        external_category:external_categories(id, external_id, layer_01, layer_02, layer_03, layer_04)
      `)
      .single();

    if (error) {
      console.error('Erro ao criar mapeamento:', error);
      return NextResponse.json(
        { error: 'Erro ao criar mapeamento' },
        { status: 500 }
      );
    }

    return NextResponse.json({ mapping: data }, { status: 201 });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Remover mapeamento
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const categoryId = searchParams.get('category_id');
    const externalCategoryId = searchParams.get('external_category_id');

    let query = supabaseAdmin.from('category_mappings').delete();

    if (id) {
      query = query.eq('id', id);
    } else if (categoryId && externalCategoryId) {
      query = query.eq('category_id', categoryId).eq('external_category_id', externalCategoryId);
    } else {
      return NextResponse.json(
        { error: 'Informe id ou category_id + external_category_id' },
        { status: 400 }
      );
    }

    const { error } = await query;

    if (error) {
      console.error('Erro ao remover mapeamento:', error);
      return NextResponse.json(
        { error: 'Erro ao remover mapeamento' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
