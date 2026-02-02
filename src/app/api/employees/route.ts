import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar funcionários
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const groupId = searchParams.get('group_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = supabaseAdmin
      .from('employees')
      .select(`
        *,
        company:companies(id, name, slug, company_group_id, company_group:company_groups(id, name))
      `)
      .order('name', { ascending: true });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (groupId) {
      query = query.eq('company.company_group_id', groupId);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar funcionários:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar funcionários' },
        { status: 500 }
      );
    }

    // Filtrar por grupo se necessário (filtro adicional pós-query)
    let filteredData = data;
    if (groupId) {
      filteredData = data?.filter(emp => emp.company?.company_group_id === groupId) || [];
    }

    return NextResponse.json({ employees: filteredData });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar funcionário
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_id, name, code, email, phone, position, photo_url } = body;

    // Validações
    if (!company_id || !name) {
      return NextResponse.json(
        { error: 'Empresa e nome são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se empresa existe
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('id', company_id)
      .single();

    if (!company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 400 }
      );
    }

    // Verificar se código já existe na mesma empresa (se informado)
    if (code) {
      const { data: existingCode } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('company_id', company_id)
        .eq('code', code)
        .single();

      if (existingCode) {
        return NextResponse.json(
          { error: 'Já existe um funcionário com este código nesta empresa' },
          { status: 400 }
        );
      }
    }

    // Criar funcionário
    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert({
        company_id,
        name,
        code: code || null,
        email: email || null,
        phone: phone || null,
        position: position || null,
        photo_url: photo_url || null,
        is_active: true
      })
      .select(`
        *,
        company:companies(id, name, slug, company_group_id, company_group:company_groups(id, name))
      `)
      .single();

    if (error) {
      console.error('Erro ao criar funcionário:', error);
      return NextResponse.json(
        { error: 'Erro ao criar funcionário' },
        { status: 500 }
      );
    }

    return NextResponse.json({ employee: data }, { status: 201 });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
