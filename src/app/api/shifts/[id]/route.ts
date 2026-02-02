import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Buscar turno por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('shifts')
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Turno não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ shift: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar turno
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { company_group_id, name, code, start_time, end_time, description, is_active } = body;

    // Verificar se turno existe
    const { data: existingShift } = await supabaseAdmin
      .from('shifts')
      .select('id, company_group_id')
      .eq('id', id)
      .single();

    if (!existingShift) {
      return NextResponse.json(
        { error: 'Turno não encontrado' },
        { status: 404 }
      );
    }

    // Se está alterando código, verificar duplicidade no grupo
    if (code) {
      const groupToCheck = company_group_id || existingShift.company_group_id;
      
      const { data: codeExists } = await supabaseAdmin
        .from('shifts')
        .select('id')
        .eq('company_group_id', groupToCheck)
        .eq('code', code)
        .neq('id', id)
        .single();

      if (codeExists) {
        return NextResponse.json(
          { error: 'Já existe outro turno com este código neste grupo' },
          { status: 400 }
        );
      }
    }

    // Montar objeto de atualização
    const updateData: Record<string, any> = {};
    if (company_group_id !== undefined) updateData.company_group_id = company_group_id;
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('shifts')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar turno:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar turno' },
        { status: 500 }
      );
    }

    return NextResponse.json({ shift: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir turno
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verificar se turno existe
    const { data: existingShift } = await supabaseAdmin
      .from('shifts')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingShift) {
      return NextResponse.json(
        { error: 'Turno não encontrado' },
        { status: 404 }
      );
    }

    // Excluir turno
    const { error } = await supabaseAdmin
      .from('shifts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir turno:', error);
      return NextResponse.json(
        { error: 'Erro ao excluir turno' },
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
