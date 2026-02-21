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
        parent:raw_materials!parent_id(id, name, level),
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
        parent:raw_materials!parent_id(id, name, level),
        raw_material_stock (
          *,
          external_stock (*)
        )
      `)
      .eq('company_group_id', groupId)
      .order('level', { ascending: true })
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
    const { gramatura: _gramatura, ...restBody } = body;
    const { 
      company_group_id, 
      company_id,
      name, 
      unit, 
      loss_factor, 
      min_stock, 
      current_stock,
      category,
      is_resale,
      parent_id
    } = restBody;

    if (!company_group_id || !name) {
      return NextResponse.json(
        { error: 'company_group_id e name são obrigatórios' },
        { status: 400 }
      );
    }

    let level = 1;

    // Se tem parent_id, buscar informações do pai para calcular level
    if (parent_id) {
      const { data: parentMaterial, error: parentError } = await supabaseAdmin
        .from('raw_materials')
        .select('level')
        .eq('id', parent_id)
        .single();

      if (parentError || !parentMaterial) {
        return NextResponse.json(
          { error: 'Matéria-prima pai não encontrada' },
          { status: 400 }
        );
      }

      level = (parentMaterial.level || 1) + 1;

      // Limite de 3 níveis
      if (level > 3) {
        return NextResponse.json(
          { error: 'Não é possível criar mais de 3 níveis de hierarquia' },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from('raw_materials')
      .insert({
        company_group_id,
        company_id: (company_id && company_id.trim() !== '') ? company_id : null,
        name,
        unit: 'kg', // Sempre kg
        loss_factor: level === 2 ? (loss_factor || 0) : 0,
        min_stock: min_stock ?? 0,
        current_stock: 0,
        category: (category && category.trim() !== '') ? category : null,
        is_resale: is_resale || false,
        parent_id: (parent_id && parent_id.trim() !== '') ? parent_id : null,
        level: level
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
