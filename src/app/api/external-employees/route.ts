import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar funcionários externos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const unmappedOnly = searchParams.get('unmapped_only') === 'true';

    // Buscar todos os registros (Supabase tem limite de 1000 por padrão)
    const allData: any[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabaseAdmin
        .from('external_employees')
        .select(`
          *,
          company_group:company_groups(id, name, slug)
        `)
        .order('name', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (groupId) {
        query = query.eq('company_group_id', groupId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar funcionários externos:', error);
        return NextResponse.json(
          { error: 'Erro ao buscar funcionários externos' },
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

    // Se solicitado apenas não mapeados
    if (unmappedOnly && allData.length > 0) {
      const { data: mappings } = await supabaseAdmin
        .from('employee_mappings')
        .select('external_employee_id');

      const mappedIds = new Set(mappings?.map(m => m.external_employee_id) || []);
      const unmapped = allData.filter(e => !mappedIds.has(e.id));
      return NextResponse.json({ externalEmployees: unmapped });
    }

    return NextResponse.json({ externalEmployees: allData });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar funcionário externo (ou bulk insert)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Suporta array para bulk insert
    const items = Array.isArray(body) ? body : [body];

    const insertData = items.map(item => ({
      company_group_id: item.company_group_id,
      external_id: item.external_id,
      external_code: item.external_code || null,
      name: item.name,
      email: item.email || null,
      department: item.department || null,
      position: item.position || null,
      raw_data: item.raw_data || null
    }));

    // Validações
    for (const item of insertData) {
      if (!item.company_group_id || !item.external_id || !item.name) {
        return NextResponse.json(
          { error: 'company_group_id, external_id e name são obrigatórios' },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from('external_employees')
      .upsert(insertData, { 
        onConflict: 'company_group_id,external_id',
        ignoreDuplicates: false 
      })
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `);

    if (error) {
      console.error('Erro ao criar funcionários externos:', error);
      return NextResponse.json(
        { error: 'Erro ao criar funcionários externos' },
        { status: 500 }
      );
    }

    return NextResponse.json({ externalEmployees: data }, { status: 201 });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Limpar todos funcionários externos de um grupo
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json(
        { error: 'group_id é obrigatório' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('external_employees')
      .delete()
      .eq('company_group_id', groupId);

    if (error) {
      console.error('Erro ao limpar funcionários externos:', error);
      return NextResponse.json(
        { error: 'Erro ao limpar funcionários externos' },
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
