import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// OPTIONS - Para CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// GET - Buscar logs de sincronização
export async function GET(request: NextRequest) {
  console.log('📥 GET /api/powerbi/sync chamado');
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connection_id');
    const configId = searchParams.get('config_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    console.log('📋 Parâmetros:', { connectionId, configId, limit });

    let query = supabaseAdmin
      .from('powerbi_sync_logs')
      .select(`*, connection:powerbi_connections(id, name)`)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    if (configId) {
      query = query.eq('sync_config_id', configId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data || [] });
  } catch (error: any) {
    console.error('Erro ao buscar logs:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
