import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar tags
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    const { data: tags, error } = await supabaseAdmin
      .from('product_tags')
      .select('*')
      .eq('company_group_id', groupId)
      .order('name');

    if (error) {
      console.error('Erro ao buscar tags:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tags: tags || [] });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar tag ou atribuir tag a produtos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, company_group_id, name, color, tag_id, product_ids } = body;

    if (!company_group_id) {
      return NextResponse.json({ error: 'company_group_id é obrigatório' }, { status: 400 });
    }

    // Criar nova tag
    if (action === 'create') {
      if (!name) {
        return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 });
      }

      const { data: tag, error } = await supabaseAdmin
        .from('product_tags')
        .insert({
          company_group_id,
          name: name.trim(),
          color: color || 'blue'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: 'Já existe uma tag com esse nome' }, { status: 400 });
        }
        console.error('Erro ao criar tag:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ tag }, { status: 201 });
    }

    // Atribuir tag a produtos
    if (action === 'assign') {
      if (!tag_id || !product_ids || product_ids.length === 0) {
        return NextResponse.json({ error: 'tag_id e product_ids são obrigatórios' }, { status: 400 });
      }

      const assignments = product_ids.map((productId: string) => ({
        company_group_id,
        external_product_id: productId,
        tag_id
      }));

      const { error } = await supabaseAdmin
        .from('product_tag_assignments')
        .upsert(assignments, { onConflict: 'company_group_id,external_product_id,tag_id' });

      if (error) {
        console.error('Erro ao atribuir tags:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, count: product_ids.length });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Remover tag ou remover atribuição
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tag_id');
    const productId = searchParams.get('product_id');
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    // Remover atribuição específica
    if (tagId && productId) {
      const { error } = await supabaseAdmin
        .from('product_tag_assignments')
        .delete()
        .eq('company_group_id', groupId)
        .eq('tag_id', tagId)
        .eq('external_product_id', productId);

      if (error) {
        console.error('Erro ao remover atribuição:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Remover tag (e todas as atribuições via cascade)
    if (tagId) {
      const { error } = await supabaseAdmin
        .from('product_tags')
        .delete()
        .eq('id', tagId)
        .eq('company_group_id', groupId);

      if (error) {
        console.error('Erro ao remover tag:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'tag_id é obrigatório' }, { status: 400 });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
