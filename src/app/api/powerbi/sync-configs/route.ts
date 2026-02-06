import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar configurações de sincronização
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connection_id');
    const groupId = searchParams.get('group_id');

    let query = supabaseAdmin
      .from('powerbi_sync_configs')
      .select(`
        *,
        connection:powerbi_connections(
          id,
          name,
          company_group_id,
          company_group:company_groups(id, name)
        )
      `)
      .order('entity_type');

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    if (groupId) {
      query = query.eq('connection.company_group_id', groupId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar configs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ configs: data });
  } catch (error) {
    console.error('Erro ao buscar configs:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar configuração de sincronização
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      connection_id,
      entity_type,
      dataset_id,
      dax_query,
      field_mapping,
      is_active = true,
      sync_interval_minutes = 60,
      // Campos incrementais
      date_field,
      initial_date,
      incremental_days = 7,
      is_incremental = false,
      days_per_batch = 7
    } = body;

    // Validação básica
    if (!connection_id || !entity_type || !dataset_id || !dax_query || !field_mapping) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: connection_id, entity_type, dataset_id, dax_query, field_mapping' },
        { status: 400 }
      );
    }

    // Validar entity_type
    const validEntityTypes = ['products', 'employees', 'companies', 'sales', 'cash_flow', 'cash_flow_statement', 'categories', 'stock'];
    if (!validEntityTypes.includes(entity_type)) {
      return NextResponse.json(
        { error: `entity_type deve ser: ${validEntityTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verificar se já existe config para este tipo nesta conexão
    const { data: existing } = await supabaseAdmin
      .from('powerbi_sync_configs')
      .select('id')
      .eq('connection_id', connection_id)
      .eq('entity_type', entity_type)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `Já existe uma configuração de ${entity_type} para esta conexão` },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('powerbi_sync_configs')
      .insert({
        connection_id,
        entity_type,
        dataset_id,
        dax_query,
        field_mapping,
        is_active,
        sync_interval_minutes,
        date_field,
        initial_date,
        incremental_days,
        is_incremental,
        days_per_batch
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar config:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ config: data }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar config:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
