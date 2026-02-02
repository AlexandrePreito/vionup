import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Buscar funcionário por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        company:companies(id, name, slug, company_group_id, company_group:company_groups(id, name))
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar funcionário
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { company_id, name, code, email, phone, position, photo_url, is_active } = body;

    // Verificar se funcionário existe
    const { data: existingEmployee } = await supabaseAdmin
      .from('employees')
      .select('id, company_id')
      .eq('id', id)
      .single();

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      );
    }

    // Se está alterando código, verificar duplicidade na empresa
    if (code) {
      const companyToCheck = company_id || existingEmployee.company_id;
      
      const { data: codeExists } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('company_id', companyToCheck)
        .eq('code', code)
        .neq('id', id)
        .single();

      if (codeExists) {
        return NextResponse.json(
          { error: 'Já existe outro funcionário com este código nesta empresa' },
          { status: 400 }
        );
      }
    }

    // Montar objeto de atualização
    const updateData: Record<string, any> = {};
    if (company_id !== undefined) updateData.company_id = company_id;
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (position !== undefined) updateData.position = position;
    if (photo_url !== undefined) updateData.photo_url = photo_url;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        company:companies(id, name, slug, company_group_id, company_group:company_groups(id, name))
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar funcionário:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar funcionário' },
        { status: 500 }
      );
    }

    return NextResponse.json({ employee: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir funcionário
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verificar se funcionário existe
    const { data: existingEmployee } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      );
    }

    // Excluir funcionário
    const { error } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir funcionário:', error);
      return NextResponse.json(
        { error: 'Erro ao excluir funcionário' },
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
