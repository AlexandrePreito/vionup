import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Buscar conexão por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('powerbi_connections')
      .select(`
        id,
        company_group_id,
        name,
        tenant_id,
        client_id,
        client_secret,
        workspace_id,
        is_active,
        last_sync_at,
        sync_status,
        sync_error,
        created_at,
        updated_at,
        company_group:company_groups(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connection: data });
  } catch (error) {
    console.error('Erro ao buscar conexão:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar conexão
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      name, 
      tenant_id, 
      client_id, 
      client_secret, 
      workspace_id,
      is_active 
    } = body;

    // Montar objeto de atualização (só inclui campos que foram enviados)
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (tenant_id !== undefined) updateData.tenant_id = tenant_id;
    if (client_id !== undefined) updateData.client_id = client_id;
    if (client_secret !== undefined) updateData.client_secret = client_secret;
    if (workspace_id !== undefined) updateData.workspace_id = workspace_id;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('powerbi_connections')
      .update(updateData)
      .eq('id', id)
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
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connection: data });
  } catch (error) {
    console.error('Erro ao atualizar conexão:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir conexão
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('powerbi_connections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir conexão:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir conexão:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
