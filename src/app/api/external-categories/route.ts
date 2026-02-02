import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar categorias externas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const unmappedOnly = searchParams.get('unmapped_only') === 'true';

    let allData: any[] = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
      let query = supabaseAdmin
        .from('external_categories')
        .select(`
          *,
          company_group:company_groups(id, name, slug)
        `)
        .order('layer_01', { ascending: true })
        .order('layer_02', { ascending: true })
        .order('layer_03', { ascending: true })
        .order('layer_04', { ascending: true })
        .range(offset, offset + limit - 1);

      if (groupId) {
        query = query.eq('company_group_id', groupId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar categorias externas:', error);
        return NextResponse.json(
          { error: 'Erro ao buscar categorias externas' },
          { status: 500 }
        );
      }

      if (!data || data.length === 0) {
        break;
      }

      allData = allData.concat(data);
      offset += limit;
    }

    // Se solicitado apenas não mapeadas
    if (unmappedOnly && allData) {
      const { data: mappings } = await supabaseAdmin
        .from('category_mappings')
        .select('external_category_id');

      const mappedIds = new Set(mappings?.map(m => m.external_category_id) || []);
      const unmapped = allData.filter(c => !mappedIds.has(c.id));
      return NextResponse.json({ externalCategories: unmapped });
    }

    return NextResponse.json({ externalCategories: allData });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
