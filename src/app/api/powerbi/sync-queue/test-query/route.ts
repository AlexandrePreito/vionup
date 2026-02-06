import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Cache global de tokens do Power BI (reutilizar do process/route.ts)
const tokenCache = new Map<string, { token: string; expires: number }>();

async function getPowerBIToken(connection: any): Promise<string> {
  const cacheKey = connection.client_id;
  const cached = tokenCache.get(cacheKey);
  
  // Se tem cache válido, usar
  if (cached && cached.expires > Date.now()) {
    return cached.token;
  }
  
  // Buscar novo token
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: connection.client_id,
        client_secret: connection.client_secret,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
        grant_type: 'client_credentials',
      }),
    }
  );

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Erro ao obter token do Power BI: ${errorText}`);
  }

  const { access_token, expires_in } = await tokenResponse.json();
  
  if (!access_token) {
    throw new Error('Token não retornado na resposta do Power BI');
  }
  
  // Cachear por 50 minutos (expires_in geralmente é 3600s = 1h)
  tokenCache.set(cacheKey, {
    token: access_token,
    expires: Date.now() + ((expires_in || 3600) - 600) * 1000 // 10min de margem
  });
  
  return access_token;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connection_id, dataset_id, dax_query } = body;

    if (!connection_id || !dataset_id || !dax_query) {
      return NextResponse.json({ 
        error: 'Parâmetros obrigatórios: connection_id, dataset_id, dax_query' 
      }, { status: 400 });
    }

    // Buscar conexão
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('powerbi_connections')
      .select('*')
      .eq('id', connection_id)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
    }

    // Obter token Power BI
    let accessToken: string;
    try {
      accessToken = await getPowerBIToken(connection);
    } catch (tokenError: any) {
      return NextResponse.json({ 
        error: `Falha ao obter token Power BI: ${tokenError.message}` 
      }, { status: 500 });
    }

    // Adicionar TOPN para limitar resultado do teste
    let testQuery = dax_query.trim();
    if (!testQuery.toUpperCase().includes('TOPN')) {
      const queryWithoutEvaluate = testQuery.replace(/^EVALUATE\s*\n?\s*/i, '');
      testQuery = `EVALUATE\nTOPN(5,\n  ${queryWithoutEvaluate}\n)`;
    }

    // Executar query no Power BI
    const workspaceId = connection.workspace_id;
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID não encontrado na conexão' }, { status: 400 });
    }
    
    const queryRes = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${dataset_id}/executeQueries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queries: [{ query: testQuery }],
          serializerSettings: { includeNulls: true },
        }),
      }
    );

    if (!queryRes.ok) {
      const errorText = await queryRes.text();
      let errorDetail = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.error?.message
          || errorJson.error?.pbi?.error?.details?.[0]?.detail?.value
          || errorJson.error?.pbiError?.details?.[0]?.detail?.value
          || errorText;
      } catch {}

      return NextResponse.json({
        success: false,
        error: `Erro Power BI: ${errorDetail}`,
        query_sent: testQuery,
      }, { status: 400 });
    }

    const result = await queryRes.json();
    const rows = result.results?.[0]?.tables?.[0]?.rows || [];
    
    // Extrair colunas do primeiro registro ou do schema
    let columns: string[] = [];
    if (rows.length > 0) {
      columns = Object.keys(rows[0]);
    } else if (result.results?.[0]?.tables?.[0]?.columns) {
      columns = result.results[0].tables[0].columns.map((col: any) => col.name);
    }

    return NextResponse.json({
      success: true,
      rows,
      columns,
      total_rows: rows.length,
      query_sent: testQuery,
    });
  } catch (error: any) {
    console.error('Erro ao testar query DAX:', error);
    return NextResponse.json({ 
      error: error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
