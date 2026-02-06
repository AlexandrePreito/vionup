import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar produtos externos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const unmappedOnly = searchParams.get('unmapped_only') === 'true';

    // Buscar registros com limite máximo para evitar timeout
    // Limite máximo de 10.000 registros (10 páginas de 1000)
    const allData: any[] = [];
    const pageSize = 1000;
    const maxPages = 10; // Limite máximo de 10.000 registros
    let page = 0;
    let hasMore = true;

    while (hasMore && page < maxPages) {
      let query = supabaseAdmin
        .from('external_products')
        .select('id, external_id, external_code, name, category, product_group, type, company_group_id, created_at')
        .order('name', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (groupId) {
        query = query.eq('company_group_id', groupId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar produtos externos:', error);
        return NextResponse.json(
          { 
            error: 'Erro ao buscar produtos externos',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
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

    // Avisar se atingiu o limite
    if (page >= maxPages && hasMore) {
      console.warn(`API /external-products - Limite de ${maxPages * pageSize} registros atingido`);
    }

    // Se solicitado apenas não mapeados
    if (unmappedOnly && allData.length > 0) {
      const { data: mappings } = await supabaseAdmin
        .from('product_mappings')
        .select('external_product_id');

      const mappedIds = new Set(mappings?.map(m => m.external_product_id) || []);
      const unmapped = allData.filter(p => !mappedIds.has(p.id));
      return NextResponse.json({ externalProducts: unmapped });
    }

    return NextResponse.json({ externalProducts: allData });
  } catch (error: any) {
    console.error('Erro interno na API /external-products:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Criar produto externo (ou bulk insert)
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
      description: item.description || null,
      category: item.category || null,
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
      .from('external_products')
      .upsert(insertData, { 
        onConflict: 'company_group_id,external_id',
        ignoreDuplicates: false 
      })
      .select('*');

    if (error) {
      console.error('Erro ao criar produtos externos:', error);
      return NextResponse.json(
        { error: 'Erro ao criar produtos externos' },
        { status: 500 }
      );
    }

    return NextResponse.json({ externalProducts: data }, { status: 201 });
  } catch (error: any) {
    console.error('Erro interno na API /external-products:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Limpar todos produtos externos de um grupo
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
      .from('external_products')
      .delete()
      .eq('company_group_id', groupId);

    if (error) {
      console.error('Erro ao limpar produtos externos:', error);
      return NextResponse.json(
        { error: 'Erro ao limpar produtos externos' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro interno na API /external-products:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
