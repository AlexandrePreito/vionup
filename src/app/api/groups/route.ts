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
      } else if (user.role === 'group_admin' || user.role === 'admin') {
        // Admin só vê o próprio grupo
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
      // Se não tem usuário, não retorna nada
      console.warn('API /groups - Nenhum usuário identificado, retornando vazio');
      console.warn('API /groups - Headers recebidos:', {
        'x-user-id': request.headers.get('x-user-id'),
        'X-User-Id': request.headers.get('X-User-Id'),
        'authorization': request.headers.get('authorization') ? 'present' : 'missing',
        'cookie': request.headers.get('cookie') ? 'present' : 'missing'
      });
      query = query.eq('id', '00000000-0000-0000-0000-000000000000');
    }

    // Filtrar por is_active apenas se includeInactive não for true
    // Por padrão, mostrar apenas grupos ativos
    if (includeInactive !== true) {
      query = query.eq('is_active', true);
    } else {
      console.log('API /groups - includeInactive=true, retornando todos os grupos (ativos e inativos)');
    }

    const { data, error } = await query;

    if (error) {
      console.error('API /groups - Erro na query:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar grupos' },
        { status: 500 }
      );
    }

    console.log('API /groups - Grupos retornados:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('API /groups - Primeiros grupos:', data.slice(0, 3).map((g: any) => ({ id: g.id, name: g.name })));
    }

    return NextResponse.json({ groups: data || [] });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
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
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}