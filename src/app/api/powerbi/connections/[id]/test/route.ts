import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Testar conexão Power BI
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar conexão com client_secret
    const { data: connection, error } = await supabaseAdmin
      .from('powerbi_connections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !connection) {
      return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
    }

    // Tentar obter token do Azure AD
    const tokenUrl = `https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`;
    
    const tokenResponse = await fetch(tokenUrl, {
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

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      // Atualizar status de erro na conexão
      await supabaseAdmin
        .from('powerbi_connections')
        .update({ 
          sync_status: 'error',
          sync_error: tokenData.error_description || 'Falha na autenticação'
        })
        .eq('id', id);

      return NextResponse.json({ 
        success: false, 
        error: 'Falha na autenticação',
        details: tokenData.error_description || tokenData.error
      }, { status: 401 });
    }

    // Testar acesso ao workspace
    const workspaceUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}`;
    
    const workspaceResponse = await fetch(workspaceUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!workspaceResponse.ok) {
      const workspaceError = await workspaceResponse.json().catch(() => ({}));
      
      await supabaseAdmin
        .from('powerbi_connections')
        .update({ 
          sync_status: 'error',
          sync_error: 'Sem acesso ao workspace'
        })
        .eq('id', id);

      return NextResponse.json({ 
        success: false, 
        error: 'Sem acesso ao workspace',
        details: workspaceError.error?.message || 'Verifique se o Service Principal tem acesso ao workspace'
      }, { status: 403 });
    }

    const workspaceData = await workspaceResponse.json();

    // Buscar datasets do workspace
    const datasetsUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets`;
    
    const datasetsResponse = await fetch(datasetsUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    let datasets: any[] = [];
    if (datasetsResponse.ok) {
      const datasetsData = await datasetsResponse.json();
      datasets = datasetsData.value || [];
    }

    // Atualizar conexão como sucesso
    await supabaseAdmin
      .from('powerbi_connections')
      .update({ 
        sync_status: 'success',
        sync_error: null
      })
      .eq('id', id);

    return NextResponse.json({ 
      success: true, 
      message: 'Conexão testada com sucesso!',
      workspace: {
        id: workspaceData.id,
        name: workspaceData.name
      },
      datasets: datasets.map((d: any) => ({
        id: d.id,
        name: d.name,
        configuredBy: d.configuredBy
      }))
    });

  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
