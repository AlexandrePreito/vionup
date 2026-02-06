import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ============================================================
// GET - Listar fila
// ============================================================
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    let query = supabaseAdmin
      .from('sync_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (groupId) {
      query = query.eq('company_group_id', groupId);
    }

    const { data: queue, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar fila:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ queue: queue || [] });

  } catch (error: any) {
    console.error('❌ Erro ao listar fila:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao listar fila' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST - Adicionar à fila
// ============================================================
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { config_id, sync_type = 'full' } = body;

    if (!config_id) {
      return NextResponse.json({ error: 'config_id obrigatório' }, { status: 400 });
    }

    // Buscar configuração
    const { data: config, error: configError } = await supabaseAdmin
      .from('powerbi_sync_configs')
      .select(`
        *,
        connection:powerbi_connections(
          id,
          name,
          company_group_id,
          tenant_id,
          client_id,
          client_secret,
          workspace_id
        )
      `)
      .eq('id', config_id)
      .single();

    if (configError || !config) {
      console.error('❌ Erro ao buscar config:', configError);
      return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 });
    }

    // Calcular período
    const today = new Date();
    let startDate: Date;
    let endDate = today;  // Declarado antes de qualquer uso

    if (sync_type === 'incremental' && config.is_incremental) {
      const daysBack = config.incremental_days || 7;
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - daysBack);
    } else {
      startDate = config.initial_date ? new Date(config.initial_date) : new Date('2024-01-01');
    }

    // Calcular total de dias
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (86400000)) + 1;

    // Pegar company_group_id da conexão ou da config
    const companyGroupId = config.company_group_id || config.connection?.company_group_id;

    if (!companyGroupId) {
      console.error('❌ company_group_id não encontrado na config:', config);
      return NextResponse.json({ 
        error: 'company_group_id não encontrado na configuração' 
      }, { status: 400 });
    }

    // Verificar se já existe item pendente ou em processamento para esta config
    const { data: existingItem } = await supabaseAdmin
      .from('sync_queue')
      .select('id, status')
      .eq('config_id', config_id)
      .in('status', ['pending', 'processing'])
      .limit(1)
      .maybeSingle();

    if (existingItem) {
      return NextResponse.json({ 
        error: `Já existe uma sincronização ${existingItem.status === 'pending' ? 'pendente' : 'em andamento'} para esta configuração`,
        existing_queue_id: existingItem.id 
      }, { status: 409 });
    }

    // Nota: end_date é fixado no momento do POST. Dados inseridos entre
    // o POST e o processamento serão capturados na próxima sincronização.

    // Inserir na fila
    const { data: queueItem, error: insertError } = await supabaseAdmin
      .from('sync_queue')
      .insert({
        connection_id: config.connection_id,
        config_id: config.id,
        company_group_id: companyGroupId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        sync_type,
        total_days: totalDays,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir na fila:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      queue_item: queueItem 
    });

  } catch (error: any) {
    console.error('❌ Erro ao adicionar à fila:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao adicionar à fila' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE - Cancelar item da fila ou limpar itens antigos
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const queueId = searchParams.get('id');
    const action = searchParams.get('action'); // 'cleanup' para limpar itens antigos

    // Limpar itens antigos (completed/failed/cancelled com mais de 30 dias)
    if (action === 'cleanup') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabaseAdmin
        .from('sync_queue')
        .delete()
        .in('status', ['completed', 'failed', 'cancelled'])
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('❌ Erro ao limpar itens antigos:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Itens antigos removidos com sucesso' 
      });
    }

    // Cancelar item específico
    if (!queueId) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    // Verificar status atual antes de cancelar
    const { data: currentItem, error: fetchError } = await supabaseAdmin
      .from('sync_queue')
      .select('status')
      .eq('id', queueId)
      .single();

    if (fetchError || !currentItem) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    // Não permitir cancelar itens já finalizados
    if (['completed', 'failed', 'cancelled'].includes(currentItem.status)) {
      return NextResponse.json({ 
        error: `Item já está com status '${currentItem.status}' e não pode ser cancelado` 
      }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('sync_queue')
      .update({ 
        status: 'cancelled', 
        finished_at: new Date().toISOString() 
      })
      .eq('id', queueId)
      .in('status', ['pending', 'processing']); // Safety: só cancela se ainda ativo

    if (error) {
      console.error('❌ Erro ao cancelar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Erro ao cancelar item:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao cancelar item' },
      { status: 500 }
    );
  }
}