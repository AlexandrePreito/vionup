import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Buscar permissões do usuário
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    const { data, error } = await supabaseAdmin
      .from('user_module_permissions')
      .select('module_id, can_view, can_edit')
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao buscar permissões:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ permissions: data || [] });
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
    const { permissions } = await request.json();

    console.log('Atualizando permissões para usuário:', userId);
    console.log('Permissões recebidas:', permissions);

    // Remover permissões antigas
    const { error: deleteError } = await supabaseAdmin
      .from('user_module_permissions')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Erro ao deletar permissões antigas:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Inserir novas permissões
    if (permissions && permissions.length > 0) {
      const inserts = permissions
        .filter((p: any) => p.can_view || p.can_edit)
        .map((p: any) => ({
          user_id: userId,
          module_id: p.module_id,
          can_view: p.can_view || false,
          can_edit: p.can_edit || false
        }));

      console.log('Inserindo permissões:', inserts);

      if (inserts.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('user_module_permissions')
          .insert(inserts);

        if (insertError) {
          console.error('Erro ao inserir permissões:', insertError);
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro geral:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
