import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET - Listar produtos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    // Obter usuário logado
    const user = await getAuthenticatedUser(request);
    
    console.log('API /products - Headers x-user-id:', request.headers.get('x-user-id'));
    console.log('API /products - Usuário identificado:', user ? { id: user.id, role: user.role, company_group_id: user.company_group_id } : 'null');
    console.log('API /products - group_id na query:', groupId);

    // Determinar o group_id(s) a ser usado (baseado em permissões)
    let effectiveGroupId: string | null = null;
    let effectiveGroupIds: string[] | null = null;
    
    if (user) {
      if (user.role === 'master') {
        // Master vê tudo - usar group_id se informado
        effectiveGroupId = groupId || null;
      } else {
        // Usuários não-master: IGNORAR group_id da query e usar sempre o do usuário
        if (groupId && groupId !== user.company_group_id) {
          console.warn('API /products - SEGURANÇA: group_id da query ignorado para usuário não-master');
          console.warn('API /products - group_id da query:', groupId, 'vs company_group_id do usuário:', user.company_group_id);
        }
        
        if (user.role === 'group_admin' || user.role === 'admin') {
          // Group Admin ou Admin vê apenas produtos do seu grupo
          if (user.company_group_id) {
            console.log('API /products - Filtrando por company_group_id do usuário:', user.company_group_id);
            effectiveGroupId = user.company_group_id;
          }
        } else if (user.role === 'company_admin') {
          // Company Admin vê apenas produtos do seu grupo (por enquanto)
          effectiveGroupId = user.company_group_id || null;
        } else if (user.role === 'user') {
          // User vê apenas produtos de empresas vinculadas a ele
          // Como produtos não têm company_id direto, precisamos filtrar via company_group_id
          // Buscar os grupos das empresas do usuário
          if (user.company_ids && user.company_ids.length > 0) {
            const { data: userCompanies } = await supabaseAdmin
              .from('companies')
              .select('company_group_id')
              .in('id', user.company_ids);
            
            const groupIds = [...new Set(userCompanies?.map((c: any) => c.company_group_id).filter(Boolean) || [])] as string[];
            if (groupIds.length > 0) {
              if (groupIds.length === 1) {
                effectiveGroupId = groupIds[0];
              } else {
                effectiveGroupIds = groupIds;
              }
            }
          }
        }
      }
    } else {
      // Se não tem usuário identificado, não retornar nada (ou retornar erro)
      console.warn('API /products - Nenhum usuário identificado');
      // effectiveGroupId permanece null, o que fará retornar vazio
    }
    
    
    console.log('API /products - effectiveGroupId final:', effectiveGroupId);
    console.log('API /products - effectiveGroupIds final:', effectiveGroupIds);
    console.log('API /products - user.role:', user?.role);
    console.log('API /products - user.company_group_id:', user?.company_group_id);

    // Buscar todos os registros (Supabase tem limite de 1000 por padrão)
    const allData: any[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabaseAdmin
        .from('products')
        .select(`
          *,
          company_group:company_groups(id, name, slug)
        `)
        .order('name', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Aplicar filtro de grupo
      if (effectiveGroupId) {
        console.log('API /products - Aplicando filtro por effectiveGroupId:', effectiveGroupId);
        query = query.eq('company_group_id', effectiveGroupId);
      } else if (effectiveGroupIds && effectiveGroupIds.length > 0) {
        console.log('API /products - Aplicando filtro por effectiveGroupIds:', effectiveGroupIds);
        query = query.in('company_group_id', effectiveGroupIds);
      } else if (user && user.role !== 'master') {
        // Se não tem grupo efetivo e não é master, não retorna nada
        console.log('API /products - Sem grupo efetivo para usuário não-master, retornando vazio');
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      } else if (!user) {
        // Se não tem usuário, não retornar nada
        console.log('API /products - Sem usuário identificado, retornando vazio');
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      } else {
        console.log('API /products - Sem filtro de grupo aplicado (master)');
      }

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar produtos:', error);
        console.error('Erro detalhado:', JSON.stringify(error, null, 2));
        return NextResponse.json(
          { error: 'Erro ao buscar produtos' },
          { status: 500 }
        );
      }

      console.log(`API /products - Página ${page}: ${data?.length || 0} produtos encontrados`);

      if (data && data.length > 0) {
        allData.push(...data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    console.log('API /products - Produtos retornados:', allData.length);
    
    // Filtro de segurança adicional: garantir que usuários não-master vejam apenas produtos do seu grupo
    let filteredData = allData;
    if (user && user.role !== 'master' && user.company_group_id) {
      const beforeFilter = filteredData.length;
      filteredData = filteredData.filter((p: any) => p.company_group_id === user.company_group_id);
      const afterFilter = filteredData.length;
      
      if (beforeFilter !== afterFilter) {
        console.error('API /products - ERRO DE SEGURANÇA: Produtos filtrados!', {
          antes: beforeFilter,
          depois: afterFilter,
          grupoEsperado: user.company_group_id
        });
      }
    }
    
    console.log('API /products - Produtos finais retornados:', filteredData.length);
    return NextResponse.json({ products: filteredData });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar produto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, name, code, description } = body;

    // Validações
    if (!company_group_id || !name) {
      return NextResponse.json(
        { error: 'Grupo e nome são obrigatórios' },
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

    // Verificar se código já existe no mesmo grupo (se informado)
    if (code) {
      const { data: existingCode } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('company_group_id', company_group_id)
        .eq('code', code)
        .single();

      if (existingCode) {
        return NextResponse.json(
          { error: 'Já existe um produto com este código neste grupo' },
          { status: 400 }
        );
      }
    }

    // Criar produto
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        company_group_id,
        name,
        code: code || null,
        description: description || null,
        is_active: true
      })
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .single();

    if (error) {
      console.error('Erro ao criar produto:', error);
      return NextResponse.json(
        { error: 'Erro ao criar produto' },
        { status: 500 }
      );
    }

    return NextResponse.json({ product: data }, { status: 201 });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
