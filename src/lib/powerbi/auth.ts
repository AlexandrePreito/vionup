import { supabaseAdmin } from '@/lib/supabase';

export interface PowerBIToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface PowerBIConnection {
  id: string;
  tenant_id: string;
  client_id: string;
  client_secret: string;
  workspace_id: string;
  company_group_id: string;
}

// Cache de tokens em memória (em produção, usar Redis)
const tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

export async function getConnectionById(connectionId: string): Promise<PowerBIConnection | null> {
  const { data, error } = await supabaseAdmin
    .from('powerbi_connections')
    .select('id, tenant_id, client_id, client_secret, workspace_id, company_group_id')
    .eq('id', connectionId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getPowerBIToken(connection: PowerBIConnection): Promise<string | null> {
  // Verificar cache
  const cached = tokenCache.get(connection.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded' 
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: connection.client_id,
        client_secret: connection.client_secret,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      console.error('Erro ao obter token Power BI:', data.error_description);
      return null;
    }

    // Cachear token (expira 5 minutos antes para segurança)
    const expiresAt = Date.now() + (data.expires_in - 300) * 1000;
    tokenCache.set(connection.id, { token: data.access_token, expiresAt });

    return data.access_token;
  } catch (error) {
    console.error('Erro ao obter token Power BI:', error);
    return null;
  }
}

export async function executeDaxQuery(
  connection: PowerBIConnection,
  datasetId: string,
  query: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  const token = await getPowerBIToken(connection);
  
  if (!token) {
    return { success: false, error: 'Falha na autenticação' };
  }

  try {
    const url = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${datasetId}/executeQueries`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        queries: [{ query }],
        serializerSettings: {
          includeNulls: true
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error?.message || `Erro HTTP ${response.status}` 
      };
    }

    const result = await response.json();
    const rows = result.results?.[0]?.tables?.[0]?.rows || [];

    return { success: true, data: rows };
  } catch (error) {
    console.error('Erro ao executar DAX:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}
