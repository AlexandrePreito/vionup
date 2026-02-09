import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Buscar permissões do usuário
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Buscar permissões de módulos
    const { data: modulePerms, error: moduleError } = await supabaseAdmin
      .from('user_module_permissions')
      .select('module_id, can_view, can_edit')
      .eq('user_id', userId);

    if (moduleError) {
      console.error('Erro ao buscar permissões de módulos:', moduleError);
      return NextResponse.json({ error: moduleError.message }, { status: 500 });
    }

    // Buscar permissões de páginas
    const { data: pagePerms, error: pageError } = await supabaseAdmin
      .from('user_page_permissions')
      .select('page_id, can_view, can_edit')
      .eq('user_id', userId);

    if (pageError) {
      console.error('Erro ao buscar permissões de páginas:', pageError);
      return NextResponse.json({ error: pageError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      permissions: modulePerms || [],
      pagePermissions: pagePerms || []
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar permissões do usuário
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { permissions, pagePermissions } = await request.json();

    console.log('Atualizando permissões para usuário:', userId);
    console.log('Permissões de módulos recebidas:', permissions);
    console.log('Permissões de páginas recebidas:', pagePermissions);

    // Remover permissões antigas de módulos
    const { error: deleteModuleError } = await supabaseAdmin
      .from('user_module_permissions')
      .delete()
      .eq('user_id', userId);

    if (deleteModuleError) {
      console.error('Erro ao deletar permissões antigas de módulos:', deleteModuleError);
      return NextResponse.json({ error: deleteModuleError.message }, { status: 500 });
    }

    // Inserir novas permissões de módulos
    if (permissions && permissions.length > 0) {
      const moduleInserts = permissions
        .filter((p: any) => p.can_view || p.can_edit)
        .map((p: any) => ({
          user_id: userId,
          module_id: p.module_id,
          can_view: p.can_view || false,
          can_edit: p.can_edit || false
        }));

      console.log('Inserindo permissões de módulos:', moduleInserts);

      if (moduleInserts.length > 0) {
        const { error: insertModuleError } = await supabaseAdmin
          .from('user_module_permissions')
          .insert(moduleInserts);

        if (insertModuleError) {
          console.error('Erro ao inserir permissões de módulos:', insertModuleError);
          return NextResponse.json({ error: insertModuleError.message }, { status: 500 });
        }
      }
    }

    // Remover permissões antigas de páginas
    const { error: deletePageError } = await supabaseAdmin
      .from('user_page_permissions')
      .delete()
      .eq('user_id', userId);

    if (deletePageError) {
      console.error('Erro ao deletar permissões antigas de páginas:', deletePageError);
      return NextResponse.json({ error: deletePageError.message }, { status: 500 });
    }

    // Inserir novas permissões de páginas
    if (pagePermissions && pagePermissions.length > 0) {
      const pageInserts = pagePermissions
        .filter((p: any) => p.can_view || p.can_edit)
        .map((p: any) => ({
          user_id: userId,
          page_id: p.page_id,
          can_view: p.can_view || false,
          can_edit: p.can_edit || false
        }));

      console.log('Inserindo permissões de páginas:', pageInserts);

      if (pageInserts.length > 0) {
        const { error: insertPageError } = await supabaseAdmin
          .from('user_page_permissions')
          .insert(pageInserts);

        if (insertPageError) {
          console.error('Erro ao inserir permissões de páginas:', insertPageError);
          return NextResponse.json({ error: insertPageError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro geral:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
