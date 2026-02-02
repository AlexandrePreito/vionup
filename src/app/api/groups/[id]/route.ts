import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Buscar grupo por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('company_groups')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ group: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar grupo
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, slug, description, logo_url, is_active } = body;

    // Verificar se grupo existe
    const { data: existingGroup } = await supabaseAdmin
      .from('company_groups')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      );
    }

    // Se está alterando slug, verificar duplicidade
    if (slug) {
      const { data: slugExists } = await supabaseAdmin
        .from('company_groups')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .single();

      if (slugExists) {
        return NextResponse.json(
          { error: 'Já existe outro grupo com este slug' },
          { status: 400 }
        );
      }
    }

    // Montar objeto de atualização
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('company_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar grupo:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar grupo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ group: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir grupo
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verificar se grupo existe
    const { data: existingGroup } = await supabaseAdmin
      .from('company_groups')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se há empresas vinculadas
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('company_group_id', id)
      .limit(1);

    if (companies && companies.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir grupo com empresas vinculadas' },
        { status: 400 }
      );
    }

    // Excluir grupo
    const { error } = await supabaseAdmin
      .from('company_groups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir grupo:', error);
      return NextResponse.json(
        { error: 'Erro ao excluir grupo' },
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
