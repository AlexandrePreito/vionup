import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    // Obter usuário logado
    const user = await getAuthenticatedUser(request);
    
    console.log('API /goomer/unidades - Usuário identificado:', user ? { id: user.id, role: user.role, company_group_id: user.company_group_id } : 'null');
    console.log('API /goomer/unidades - group_id na query:', groupId);

    // Por enquanto, goomer_unidades não tem relação direta com companies
    // Retornar todas as unidades (filtro será aplicado no frontend ou quando houver mapeamento)
    // TODO: Implementar mapeamento entre goomer_unidades e companies quando necessário
    
    let query = supabaseAdmin
      .from('goomer_unidades')
      .select('*')
      .order('nome_goomer');

    // Aplicar filtros de permissão baseados no role
    // Por enquanto, todos os usuários autenticados podem ver todas as unidades
    // Quando houver mapeamento, aplicar filtros aqui
    if (!user) {
      // Se não tem usuário, não retorna nada
      console.warn('API /goomer/unidades - Nenhum usuário identificado, retornando vazio');
      query = query.eq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { data: unidades, error } = await query;

    if (error) {
      console.error('API /goomer/unidades - Erro na query:', error);
      throw error;
    }

    console.log('API /goomer/unidades - Unidades retornadas:', unidades?.length || 0);

    return NextResponse.json({ unidades: unidades || [] });
  } catch (error: any) {
    console.error('Erro ao buscar unidades:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar unidades' },
      { status: 500 }
    );
  }
}
