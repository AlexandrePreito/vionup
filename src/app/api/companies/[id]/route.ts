import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Buscar empresa por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('companies')
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ company: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar empresa
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { company_group_id, name, slug, cnpj, logo_url, is_active } = body;

    // Verificar se empresa existe
    const { data: existingCompany } = await supabaseAdmin
      .from('companies')
      .select('id, company_group_id')
      .eq('id', id)
      .single();

    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    // Se está alterando slug, verificar duplicidade no grupo
    if (slug) {
      const groupToCheck = company_group_id || existingCompany.company_group_id;
      
      const { data: slugExists } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('company_group_id', groupToCheck)
        .eq('slug', slug)
        .neq('id', id)
        .single();

      if (slugExists) {
        return NextResponse.json(
          { error: 'Já existe outra empresa com este slug neste grupo' },
          { status: 400 }
        );
      }
    }

    // Se está alterando grupo, verificar se novo grupo existe
    if (company_group_id && company_group_id !== existingCompany.company_group_id) {
      const { data: newGroup } = await supabaseAdmin
        .from('company_groups')
        .select('id')
        .eq('id', company_group_id)
        .single();

      if (!newGroup) {
        return NextResponse.json(
          { error: 'Novo grupo não encontrado' },
          { status: 400 }
        );
      }
    }

    // Montar objeto de atualização
    const updateData: Record<string, any> = {};
    if (company_group_id !== undefined) updateData.company_group_id = company_group_id;
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (cnpj !== undefined) updateData.cnpj = cnpj;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('companies')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar empresa:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar empresa' },
        { status: 500 }
      );
    }

    return NextResponse.json({ company: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir empresa
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verificar se empresa existe
    const { data: existingCompany } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se há usuários vinculados
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('company_id', id)
      .limit(1);

    if (users && users.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir empresa com usuários vinculados' },
        { status: 400 }
      );
    }

    // Excluir empresa
    const { error } = await supabaseAdmin
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir empresa:', error);
      return NextResponse.json(
        { error: 'Erro ao excluir empresa' },
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
