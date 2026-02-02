import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Buscar modo de venda por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('sale_modes')
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Modo de venda não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ saleMode: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar modo de venda
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { company_group_id, name, code, description, is_active } = body;

    // Verificar se modo de venda existe
    const { data: existingSaleMode } = await supabaseAdmin
      .from('sale_modes')
      .select('id, company_group_id')
      .eq('id', id)
      .single();

    if (!existingSaleMode) {
      return NextResponse.json(
        { error: 'Modo de venda não encontrado' },
        { status: 404 }
      );
    }

    // Se está alterando código, verificar duplicidade no grupo
    if (code) {
      const groupToCheck = company_group_id || existingSaleMode.company_group_id;
      
      const { data: codeExists } = await supabaseAdmin
        .from('sale_modes')
        .select('id')
        .eq('company_group_id', groupToCheck)
        .eq('code', code)
        .neq('id', id)
        .single();

      if (codeExists) {
        return NextResponse.json(
          { error: 'Já existe outro modo de venda com este código neste grupo' },
          { status: 400 }
        );
      }
    }

    // Montar objeto de atualização
    const updateData: Record<string, any> = {};
    if (company_group_id !== undefined) updateData.company_group_id = company_group_id;
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('sale_modes')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar modo de venda:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar modo de venda' },
        { status: 500 }
      );
    }

    return NextResponse.json({ saleMode: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir modo de venda
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verificar se modo de venda existe
    const { data: existingSaleMode } = await supabaseAdmin
      .from('sale_modes')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingSaleMode) {
      return NextResponse.json(
        { error: 'Modo de venda não encontrado' },
        { status: 404 }
      );
    }

    // Excluir modo de venda
    const { error } = await supabaseAdmin
      .from('sale_modes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir modo de venda:', error);
      return NextResponse.json(
        { error: 'Erro ao excluir modo de venda' },
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
