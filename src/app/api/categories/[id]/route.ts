import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Buscar categoria por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: category, error } = await supabaseAdmin
      .from('categories')
      .select(`
        *,
        company_group:company_groups(id, name, slug),
        parent:categories!parent_id(id, name, level, type)
      `)
      .eq('id', id)
      .single();

    if (error || !category) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar categoria
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, code, description, is_active } = body;

    // Validações
    if (!name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se categoria existe
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('categories')
      .select('id, level, type, parent_id')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      );
    }

    // Se for categoria raiz (level 1), atualizar type baseado no nome
    let type = existing.type;
    if (existing.level === 1 && !existing.parent_id) {
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
      .update({
        name,
        code: code || null,
        description: description || null,
        type,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        company_group:company_groups(id, name, slug),
        parent:categories!parent_id(id, name, level, type)
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar categoria:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar categoria' },
        { status: 500 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir categoria
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar se categoria existe
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('categories')
      .select('id, parent_id')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se tem filhos
    const { data: children } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('parent_id', id)
      .limit(1);

    if (children && children.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir categoria com subcategorias. Exclua as subcategorias primeiro.' },
        { status: 400 }
      );
    }

    // Verificar se tem mapeamentos
    const { data: mappings } = await supabaseAdmin
      .from('category_mappings')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (mappings && mappings.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir categoria com mapeamentos. Remova os mapeamentos primeiro.' },
        { status: 400 }
      );
    }

    // Excluir categoria
    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir categoria:', error);
      return NextResponse.json(
        { error: 'Erro ao excluir categoria' },
        { status: 500 }
      );
    }

    // Se tinha pai, verificar se pai deve voltar a ser analítica
    if (existing.parent_id) {
      const { data: siblings } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('parent_id', existing.parent_id)
        .limit(1);

      // Se pai não tem mais filhos, voltar a ser analítica
      if (!siblings || siblings.length === 0) {
        await supabaseAdmin
          .from('categories')
          .update({ is_analytical: true })
          .eq('id', existing.parent_id);
      }
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
