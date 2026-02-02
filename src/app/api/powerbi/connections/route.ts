import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar conexões Power BI
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    // Buscar conexões sem relacionamento para evitar timeouts
    // Os dados do grupo serão buscados separadamente se necessário
    let query = supabaseAdmin
      .from('powerbi_connections')
      .select(`
        id,
        company_group_id,
        name,
        tenant_id,
        client_id,
        workspace_id,
        is_active,
        last_sync_at,
        sync_status,
        sync_error,
        created_at,
        updated_at
      `)
      .order('name');

    if (groupId) {
      query = query.eq('company_group_id', groupId);
    }

    const { data: connections, error } = await query;

    if (error) {
      console.error('Erro ao buscar conexões:', error);
      console.error('Código do erro:', error.code);
      console.error('Mensagem:', error.message);
      return NextResponse.json({ 
        error: error.message || 'Erro ao buscar conexões',
        code: error.code
      }, { status: 500 });
    }

    // Se não houver conexões, retornar array vazio
    if (!connections || connections.length === 0) {
      return NextResponse.json({ connections: [] });
    }

    // Buscar dados dos grupos separadamente (apenas se houver conexões)
    // Se der timeout ou erro, continua sem os dados dos grupos
    const groupIds = [...new Set(connections.map(c => c.company_group_id).filter(Boolean))];
    let groupsMap: Record<string, { id: string; name: string }> = {};

    if (groupIds.length > 0) {
      try {
        const { data: groups, error: groupsError } = await supabaseAdmin
          .from('company_groups')
          .select('id, name')
          .in('id', groupIds);

        if (!groupsError && groups) {
          for (const group of groups) {
            groupsMap[group.id] = group;
          }
        } else if (groupsError) {
          // Log do erro mas continua sem os grupos
          console.warn('Erro ao buscar grupos (continuando sem eles):', groupsError.message || groupsError);
        }
      } catch (groupsErr: any) {
        // Timeout ou outro erro - continua sem os dados dos grupos
        console.warn('Erro ao buscar grupos (continuando sem eles):', groupsErr?.message || groupsErr);
        // Continua sem os dados dos grupos, mas não falha a requisição
      }
    }

    // Adicionar dados do grupo a cada conexão
    const connectionsWithGroups = connections.map(conn => ({
      ...conn,
      company_group: groupsMap[conn.company_group_id] || null
    }));

    // Não retornar client_secret na listagem
    return NextResponse.json({ connections: connectionsWithGroups });
  } catch (error: any) {
    console.error('Erro ao buscar conexões:', error);
    console.error('Stack trace:', error?.stack);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      message: error?.message || 'Erro desconhecido'
    }, { status: 500 });
  }
}

// POST - Criar conexão Power BI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      company_group_id, 
      name, 
      tenant_id, 
      client_id, 
      client_secret, 
      workspace_id,
      is_active = true 
    } = body;

    // Validações
    if (!company_group_id || !name || !tenant_id || !client_id || !client_secret || !workspace_id) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: company_group_id, name, tenant_id, client_id, client_secret, workspace_id' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('powerbi_connections')
      .insert({
        company_group_id,
        name,
        tenant_id,
        client_id,
        client_secret,
        workspace_id,
        is_active,
        sync_status: 'pending'
      })
      .select(`
        id,
        company_group_id,
        name,
        tenant_id,
        client_id,
        workspace_id,
        is_active,
        sync_status,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Erro ao criar conexão:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe uma conexão com este nome neste grupo' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connection: data }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar conexão:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
