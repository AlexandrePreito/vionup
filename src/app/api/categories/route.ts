import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar categorias
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const parentId = searchParams.get('parent_id');
    const level = searchParams.get('level');
    const analyticalOnly = searchParams.get('analytical_only') === 'true';
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = supabaseAdmin
      .from('categories')
      .select(`
        *,
        company_group:company_groups(id, name, slug),
        parent:categories!parent_id(id, name, level, type)
      `)
      .order('type', { ascending: true })
      .order('level', { ascending: true })
      .order('name', { ascending: true });

    if (groupId) {
      query = query.eq('company_group_id', groupId);
    }

    // Só filtra por parent_id se foi explicitamente passado na URL
    const hasParentIdParam = searchParams.has('parent_id');
    if (hasParentIdParam) {
      const parentIdValue = searchParams.get('parent_id');
      if (parentIdValue === 'null' || parentIdValue === '') {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentIdValue);
      }
    }
    // Se não passou parent_id, retorna TODAS as categorias (para montar a árvore)

    if (level) {
      query = query.eq('level', parseInt(level));
    }

    if (analyticalOnly) {
      query = query.eq('is_analytical', true);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: categories, error } = await query;

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar categorias' },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar categoria
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, parent_id, name, code, description } = body;

    // Validações
    if (!company_group_id || !name) {
      return NextResponse.json(
        { error: 'company_group_id e name são obrigatórios' },
        { status: 400 }
      );
    }

    let level = 1;
    let type: 'entrada' | 'saida' = 'entrada';

    // Se tem parent_id, buscar informações do pai para calcular level e type
    if (parent_id) {
      const { data: parentCategory, error: parentError } = await supabaseAdmin
        .from('categories')
        .select('level, type')
        .eq('id', parent_id)
        .single();

      if (parentError || !parentCategory) {
        return NextResponse.json(
          { error: 'Categoria pai não encontrada' },
          { status: 400 }
        );
      }

      level = parentCategory.level + 1;
      type = parentCategory.type;

      // Limite de 4 níveis
      if (level > 4) {
        return NextResponse.json(
          { error: 'Não é possível criar mais de 4 níveis de categoria' },
          { status: 400 }
        );
      }

      // Atualizar pai para não ser mais analítica (pois agora tem filho)
      await supabaseAdmin
        .from('categories')
        .update({ is_analytical: false })
        .eq('id', parent_id);
    } else {
      // Categoria raiz: determinar type pelo nome
      const normalizedName = name.toLowerCase().trim();
      if (normalizedName.includes('entrada') || normalizedName.includes('receita')) {
        type = 'entrada';
      } else if (normalizedName.includes('saída') || normalizedName.includes('saida') || 
                 normalizedName.includes('despesa') || normalizedName.includes('custo')) {
        type = 'saida';
      }
    }

    const { data: category, error } = await supabaseAdmin
      .from('categories')
      .insert({
        company_group_id,
        parent_id: parent_id || null,
        name,
        code: code || null,
        description: description || null,
        level,
        type,
        is_analytical: true, // Nova categoria sempre começa como analítica
        is_active: true
      })
      .select(`
        *,
        company_group:company_groups(id, name, slug),
        parent:categories!parent_id(id, name, level, type)
      `)
      .single();

    if (error) {
      console.error('Erro ao criar categoria:', error);
      return NextResponse.json(
        { error: 'Erro ao criar categoria' },
        { status: 500 }
      );
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
