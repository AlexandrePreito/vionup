import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar atribuições de tags
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const tagId = searchParams.get('tag_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('product_tag_assignments')
      .select(`
        *,
        tag:product_tags(*)
      `)
      .eq('company_group_id', groupId);

    if (tagId) {
      query = query.eq('tag_id', tagId);
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error('Erro ao buscar atribuições:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ assignments: assignments || [] });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
