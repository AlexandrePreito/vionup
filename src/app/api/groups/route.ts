import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET - Listar grupos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';
    
    // Obter usuário logado
    const user = await getAuthenticatedUser(request);
    
    console.log('API /groups - Usuário identificado:', user ? { id: user.id, role: user.role, company_group_id: user.company_group_id } : 'null');
    console.log('API /groups - Headers x-user-id:', request.headers.get('x-user-id'));

    // Primeiro, verificar se há grupos no banco (debug)
    const { data: allGroupsDebug, error: debugError } = await supabaseAdmin
      .from('company_groups')
      .select('id, name, is_active')
      .limit(10);
    
    console.log('API /groups - DEBUG: Total de grupos no banco (sem filtros):', allGroupsDebug?.length || 0);
    if (allGroupsDebug && allGroupsDebug.length > 0) {
      console.log('API /groups - DEBUG: Grupos encontrados:', allGroupsDebug.map((g: any) => ({ 
        id: g.id, 
        name: g.name, 
        is_active: g.is_active 
      })));
    }
    if (debugError) {
      console.error('API /groups - DEBUG: Erro ao buscar grupos:', debugError);
    }

    let query = supabaseAdmin
      .from('company_groups')
      .select('*')
      .order('name', { ascending: true });

    // Aplicar filtros de permissão
    // Master vê todos os grupos
    // Admin (group_admin) vê apenas o seu grupo
    // User não deve ver grupos diretamente (mas pode ver via empresas)
    if (user) {
      console.log('API /groups - Aplicando filtros para role:', user.role);
      if (user.role === 'master') {
        // Master vê tudo (sem filtro adicional)
        console.log('API /groups - Master: retornando todos os grupos');
      } else if (user.role === 'group_admin') {
        // Group Admin só vê o próprio grupo
        if (user.company_group_id) {
          console.log('API /groups - group_admin: filtrando por company_group_id:', user.company_group_id);
          query = query.eq('id', user.company_group_id);
        } else {
          console.log('API /groups - group_admin sem company_group_id, retornando vazio');
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      } else if (user.role === 'company_admin' && user.company_group_id) {
        // Company Admin também vê apenas o seu grupo
        console.log('API /groups - company_admin: filtrando por company_group_id:', user.company_group_id);
        query = query.eq('id', user.company_group_id);
      } else if (user.role === 'user') {
        // User não deve ver grupos diretamente
        console.log('API /groups - user: retornando vazio');
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    } else {
      // Se não tem usuário, mas includeInactive=true, retornar todos os grupos
      if (includeInactive) {
        console.warn('API /groups - Nenhum usuário identificado, mas includeInactive=true, retornando todos os grupos');
        // Não aplicar filtro de usuário, apenas continuar com a query
      } else {
        // Se não tem usuário e não é includeInactive, não retorna nada
        console.warn('API /groups - Nenhum usuário identificado, retornando vazio');
        console.warn('API /groups - Headers recebidos:', {
          'x-user-id': request.headers.get('x-user-id'),
          'X-User-Id': request.headers.get('X-User-Id'),
          'authorization': request.headers.get('authorization') ? 'present' : 'missing',
          'cookie': request.headers.get('cookie') ? 'present' : 'missing'
        });
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    // Filtrar por is_active apenas se includeInactive não for true
    // Por padrão, mostrar apenas grupos ativos
    if (includeInactive !== true) {
      query = query.eq('is_active', true);
      console.log('API /groups - Filtrando apenas grupos ativos');
    } else {
      console.log('API /groups - includeInactive=true, retornando todos os grupos (ativos e inativos)');
      // Não aplicar filtro de is_active quando includeInactive=true
    }

    // Debug: verificar query antes de executar
    console.log('API /groups - Executando query...');
    
    const { data, error } = await query;

    if (error) {
      console.error('API /groups - Erro na query:', error);
      console.error('API /groups - Detalhes do erro:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Erro ao buscar grupos', details: error.message },
        { status: 500 }
      );
    }

    console.log('API /groups - Query executada com sucesso');
    console.log('API /groups - Grupos retornados:', data?.length || 0);
    
    // Debug: verificar se há grupos no banco (sem filtro de is_active)
    if (!data || data.length === 0) {
      console.log('API /groups - Nenhum grupo encontrado, verificando se há grupos no banco...');
      const { data: allGroups, error: allGroupsError } = await supabaseAdmin
        .from('company_groups')
        .select('id, name, is_active')
        .order('name', { ascending: true });
      
      if (allGroupsError) {
        console.error('API /groups - Erro ao buscar todos os grupos:', allGroupsError);
      } else {
        console.log('API /groups - Total de grupos no banco (sem filtro):', allGroups?.length || 0);
        if (allGroups && allGroups.length > 0) {
          console.log('API /groups - Grupos encontrados:', allGroups.map((g: any) => ({ 
            id: g.id, 
            name: g.name, 
            is_active: g.is_active 
          })));
        }
      }
    }
    
    if (data && data.length > 0) {
      console.log('API /groups - Primeiros grupos:', data.slice(0, 3).map((g: any) => ({ id: g.id, name: g.name })));
    }

    // Se não há grupos, retornar informações de debug
    if (!data || data.length === 0) {
      const { data: allGroupsCheck, error: checkError } = await supabaseAdmin
        .from('company_groups')
        .select('id, name, is_active')
        .limit(5);
      
      console.log('API /groups - Verificação final: Total de grupos no banco:', allGroupsCheck?.length || 0);
      
      // Se há grupos no banco mas não foram retornados, e includeInactive=true, retornar todos
      if (allGroupsCheck && allGroupsCheck.length > 0 && includeInactive) {
        console.log('API /groups - Retornando todos os grupos do banco (includeInactive=true)');
        const { data: allGroupsData, error: allGroupsError } = await supabaseAdmin
          .from('company_groups')
          .select('*')
          .order('name', { ascending: true });
        
        if (!allGroupsError && allGroupsData) {
          return NextResponse.json({ groups: allGroupsData });
        }
      }
      
      return NextResponse.json({ 
        groups: [],
        debug: {
          userRole: user?.role || 'undefined',
          includeInactive,
          totalGroupsInDb: allGroupsCheck?.length || 0,
          groupsInDb: allGroupsCheck || [],
          error: checkError ? checkError.message : null
        }
      });
    }

    return NextResponse.json({ groups: data || [] });
  } catch (error: any) {
    console.error('Erro interno na API /groups GET:', error);
    console.error('Stack trace:', error?.stack);
    return NextResponse.json(
      { 
        error: error?.message || 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Criar grupo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, description, logo_url } = body;

    // Validações
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Nome e slug são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se slug já existe
    const { data: existingSlug } = await supabaseAdmin
      .from('company_groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Já existe um grupo com este slug' },
        { status: 400 }
      );
    }

    // Criar grupo
    const { data, error } = await supabaseAdmin
      .from('company_groups')
      .insert({
        name,
        slug,
        description: description || null,
        logo_url: logo_url || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar grupo:', error);
      return NextResponse.json(
        { error: 'Erro ao criar grupo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ group: data }, { status: 201 });
  } catch (error: any) {
    console.error('Erro interno na API /groups POST:', error);
    console.error('Stack trace:', error?.stack);
    return NextResponse.json(
      { 
        error: error?.message || 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}