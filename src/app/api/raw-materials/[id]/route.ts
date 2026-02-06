import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Obter matéria-prima por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('raw_materials')
      .select(`
        *,
        raw_material_products (
          id,
          external_product_id,
          quantity_per_unit
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar matéria-prima:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rawMaterial: data });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar matéria-prima
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      name, 
      unit, 
      loss_factor, 
      min_stock, 
      current_stock,
      category,
      is_resale,
      is_active,
      company_id,
      parent_id,
      gramatura
    } = body;

    // Buscar dados atuais
    const { data: current, error: currentError } = await supabaseAdmin
      .from('raw_materials')
      .select('level, parent_id')
      .eq('id', id)
      .single();

    if (currentError || !current) {
      return NextResponse.json(
        { error: 'Matéria-prima não encontrada' },
        { status: 404 }
      );
    }

    let level = current.level || 1;

    // Se parent_id está sendo atualizado, recalcular o level
    if (parent_id !== undefined) {
      if (parent_id) {
        // Verificar se não está tentando ser pai de si mesmo
        if (parent_id === id) {
          return NextResponse.json(
            { error: 'Uma matéria-prima não pode ser pai de si mesma' },
            { status: 400 }
          );
        }

        // Buscar informações do pai
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
      } else {
        // Se parent_id é null, é nível 1
        level = 1;
      }
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    updateData.unit = 'kg'; // Sempre kg
    if (loss_factor !== undefined) {
      updateData.loss_factor = level === 2 ? loss_factor : 0;
    } else if (level !== 2) {
      // Se não é nível 2 e não está atualizando loss_factor, garantir que seja 0
      updateData.loss_factor = 0;
    }
    updateData.min_stock = 0; // Não usado
    if (current_stock !== undefined) updateData.current_stock = current_stock;
    if (category !== undefined) updateData.category = (category && category.trim() !== '') ? category : null;
    if (is_resale !== undefined) updateData.is_resale = is_resale;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (company_id !== undefined) updateData.company_id = (company_id && company_id.trim() !== '') ? company_id : null;
    if (parent_id !== undefined) {
      updateData.parent_id = (parent_id && parent_id.trim() !== '') ? parent_id : null;
    }
    if (gramatura !== undefined) {
      updateData.gramatura = level === 3 ? (gramatura || null) : null;
    } else if (level !== 3) {
      // Se não é nível 3 e não está atualizando gramatura, garantir que seja null
      updateData.gramatura = null;
    }
    updateData.level = level;

    const { data, error } = await supabaseAdmin
      .from('raw_materials')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar matéria-prima:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rawMaterial: data });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir matéria-prima
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('raw_materials')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir matéria-prima:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
