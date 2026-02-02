import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar matérias-primas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const companyId = searchParams.get('company_id');
    const includeProducts = searchParams.get('include_products') === 'true';

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('raw_materials')
      .select(includeProducts ? `
        *,
        raw_material_products (
          id,
          external_product_id,
          quantity_per_unit
        ),
        raw_material_stock (
          *,
          external_stock (*)
        )
      ` : `
        *,
        raw_material_stock (
          *,
          external_stock (*)
        )
      `)
      .eq('company_group_id', groupId)
      .order('name', { ascending: true });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar matérias-primas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rawMaterials: data || [] });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar matéria-prima
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      company_group_id, 
      company_id,
      name, 
      unit, 
      loss_factor, 
      min_stock, 
      current_stock,
      category,
      is_resale 
    } = body;

    if (!company_group_id || !name) {
      return NextResponse.json(
        { error: 'company_group_id e name são obrigatórios' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('raw_materials')
      .insert({
        company_group_id,
        company_id: company_id || null,
        name,
        unit: unit || 'kg',
        loss_factor: loss_factor || 0,
        min_stock: min_stock || 0,
        current_stock: current_stock || 0,
        category: category || null,
        is_resale: is_resale || false
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar matéria-prima:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rawMaterial: data }, { status: 201 });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
