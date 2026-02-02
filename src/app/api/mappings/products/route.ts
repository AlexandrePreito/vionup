import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar mapeamentos de produtos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const productId = searchParams.get('product_id');

    // Buscar todos os registros (Supabase tem limite de 1000 por padrão)
    const allData: any[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabaseAdmin
        .from('product_mappings')
        .select(`
          *,
          product:products(id, name, code),
          external_product:external_products(id, external_id, external_code, name, category, product_group)
        `)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (groupId) {
        query = query.eq('company_group_id', groupId);
      }

      if (productId) {
        query = query.eq('product_id', productId);
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

// POST - Criar mapeamento de produto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, product_id, external_product_id } = body;

    // Validações
    if (!company_group_id || !product_id || !external_product_id) {
      return NextResponse.json(
        { error: 'company_group_id, product_id e external_product_id são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se já existe esse mapeamento
    const { data: existing } = await supabaseAdmin
      .from('product_mappings')
      .select('id')
      .eq('product_id', product_id)
      .eq('external_product_id', external_product_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Este mapeamento já existe' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('product_mappings')
      .insert({
        company_group_id,
        product_id,
        external_product_id
      })
      .select(`
        *,
        product:products(id, name, code),
        external_product:external_products(id, external_id, external_code, name, category)
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

// DELETE - Remover mapeamento por ID ou por combinação
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const productId = searchParams.get('product_id');
    const externalProductId = searchParams.get('external_product_id');

    let query = supabaseAdmin.from('product_mappings').delete();

    if (id) {
      query = query.eq('id', id);
    } else if (productId && externalProductId) {
      query = query.eq('product_id', productId).eq('external_product_id', externalProductId);
    } else {
      return NextResponse.json(
        { error: 'Informe id ou product_id + external_product_id' },
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
