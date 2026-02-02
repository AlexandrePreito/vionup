import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar mapeamentos de funcionários
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const employeeId = searchParams.get('employee_id');

    // Buscar todos os registros (Supabase tem limite de 1000 por padrão)
    const allData: any[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabaseAdmin
        .from('employee_mappings')
        .select(`
          *,
          employee:employees(id, name, code, company_id),
          external_employee:external_employees(id, external_id, external_code, name, department, position)
        `)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (groupId) {
        query = query.eq('company_group_id', groupId);
      }

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
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

// POST - Criar mapeamento de funcionário
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, employee_id, external_employee_id } = body;

    // Validações
    if (!company_group_id || !employee_id || !external_employee_id) {
      return NextResponse.json(
        { error: 'company_group_id, employee_id e external_employee_id são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se já existe esse mapeamento
    const { data: existing } = await supabaseAdmin
      .from('employee_mappings')
      .select('id')
      .eq('employee_id', employee_id)
      .eq('external_employee_id', external_employee_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Este mapeamento já existe' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('employee_mappings')
      .insert({
        company_group_id,
        employee_id,
        external_employee_id
      })
      .select(`
        *,
        employee:employees(id, name, code, company_id),
        external_employee:external_employees(id, external_id, external_code, name, department)
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
    const employeeId = searchParams.get('employee_id');
    const externalEmployeeId = searchParams.get('external_employee_id');

    let query = supabaseAdmin.from('employee_mappings').delete();

    if (id) {
      query = query.eq('id', id);
    } else if (employeeId && externalEmployeeId) {
      query = query.eq('employee_id', employeeId).eq('external_employee_id', externalEmployeeId);
    } else {
      return NextResponse.json(
        { error: 'Informe id ou employee_id + external_employee_id' },
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
