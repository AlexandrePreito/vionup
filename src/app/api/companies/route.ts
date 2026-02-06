import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET - Listar empresas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    // Obter usuário logado
    const user = await getAuthenticatedUser(request);
    
    console.log('API /companies - Usuário:', user ? { id: user.id, role: user.role, company_group_id: user.company_group_id } : 'null');
    console.log('API /companies - group_id na query:', groupId);

    let query = supabaseAdmin
      .from('companies')
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .order('name', { ascending: true });

    // Aplicar filtros de permissão baseados no role
    if (user) {
      if (user.role === 'master') {
        // Master vê tudo - usar group_id se informado
        if (groupId) {
          console.log('API /companies - Master: filtrando por group_id informado:', groupId);
          query = query.eq('company_group_id', groupId);
        } else {
          console.log('API /companies - Master: sem group_id, retornando todas as empresas');
        }
      } else {
        // Usuários não-master: IGNORAR group_id da query e usar sempre o do usuário
        if (groupId && groupId !== user.company_group_id) {
          console.warn('API /companies - SEGURANÇA: group_id da query ignorado para usuário não-master');
          console.warn('API /companies - group_id da query:', groupId, 'vs company_group_id do usuário:', user.company_group_id);
        }
        
        if (user.role === 'group_admin') {
          // Group Admin vê apenas empresas do seu grupo
          if (user.company_group_id) {
            console.log('API /companies - group_admin: filtrando por company_group_id do usuário:', user.company_group_id);
            query = query.eq('company_group_id', user.company_group_id);
          } else {
            console.log('API /companies - Usuário admin sem company_group_id');
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        } else if (user.role === 'company_admin') {
          // Company Admin vê apenas empresas do seu grupo (por enquanto)
          if (user.company_group_id) {
            console.log('API /companies - company_admin: filtrando por company_group_id do usuário:', user.company_group_id);
            query = query.eq('company_group_id', user.company_group_id);
          } else {
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        } else if (user.role === 'user') {
          // User vê apenas empresas vinculadas a ele
          if (user.company_ids && user.company_ids.length > 0) {
            console.log('API /companies - user: filtrando por company_ids:', user.company_ids);
            query = query.in('id', user.company_ids);
          } else {
            console.log('API /companies - user sem company_ids');
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        }
      }
    } else {
      // Se não tem usuário identificado, não retorna nada
      console.warn('API /companies - Nenhum usuário identificado, retornando vazio');
      query = query.eq('id', '00000000-0000-0000-0000-000000000000');
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar empresas:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar empresas' },
        { status: 500 }
      );
    }

    console.log('API /companies - Empresas retornadas:', data?.length || 0);
    
    // Filtro de segurança adicional: garantir que usuários não-master vejam apenas empresas do seu grupo
    let filteredData = data || [];
    if (user && user.role !== 'master' && user.company_group_id) {
      const beforeFilter = filteredData.length;
      filteredData = filteredData.filter((c: any) => c.company_group_id === user.company_group_id);
      const afterFilter = filteredData.length;
      
      if (beforeFilter !== afterFilter) {
        console.error('API /companies - ERRO DE SEGURANÇA: Empresas filtradas!', {
          antes: beforeFilter,
          depois: afterFilter,
          grupoEsperado: user.company_group_id
        });
      }
    }
    
    if (filteredData.length > 0) {
      // Log de segurança: verificar se todas as empresas pertencem ao grupo correto
      const gruposEncontrados = [...new Set(filteredData.map((c: any) => c.company_group_id))];
      console.log('API /companies - Grupos encontrados nas empresas retornadas:', gruposEncontrados);
      if (user && user.role !== 'master' && user.company_group_id) {
        const gruposInvalidos = gruposEncontrados.filter((gid: string) => gid !== user.company_group_id);
        if (gruposInvalidos.length > 0) {
          console.error('API /companies - ERRO DE SEGURANÇA: Empresas de grupos diferentes encontradas!', gruposInvalidos);
          // Remover empresas de grupos inválidos
          filteredData = filteredData.filter((c: any) => c.company_group_id === user.company_group_id);
        }
      }
    }
    
    console.log('API /companies - Empresas finais retornadas:', filteredData.length);
    return NextResponse.json({ companies: filteredData });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar empresa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, name, slug, cnpj, logo_url } = body;

    // Validações
    if (!company_group_id || !name || !slug) {
      return NextResponse.json(
        { error: 'Grupo, nome e slug são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se grupo existe
    const { data: group } = await supabaseAdmin
      .from('company_groups')
      .select('id')
      .eq('id', company_group_id)
      .single();

    if (!group) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 400 }
      );
    }

    // Verificar se slug já existe no mesmo grupo
    const { data: existingSlug } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('company_group_id', company_group_id)
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Já existe uma empresa com este slug neste grupo' },
        { status: 400 }
      );
    }

    // Criar empresa
    const { data, error } = await supabaseAdmin
      .from('companies')
      .insert({
        company_group_id,
        name,
        slug,
        cnpj: cnpj || null,
        logo_url: logo_url || null,
        is_active: true
      })
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .single();

    if (error) {
      console.error('Erro ao criar empresa:', error);
      return NextResponse.json(
        { error: 'Erro ao criar empresa' },
        { status: 500 }
      );
    }

    return NextResponse.json({ company: data }, { status: 201 });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}