import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Alterar senha de usuário (admin pode alterar de qualquer usuário)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Buscar usuário
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, auth_id')
      .eq('id', id)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Gerar hash da nova senha
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Atualizar senha na tabela users
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', id);

    if (updateError) {
      console.error('Erro ao atualizar senha:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar senha' },
        { status: 500 }
      );
    }

    // Se tiver auth_id, atualizar também no Supabase Auth
    if (user.auth_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        user.auth_id,
        { password: newPassword }
      );

      if (authError) {
        console.error('Erro ao atualizar senha no Auth:', authError);
        // Não falhar, apenas logar o erro
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Senha alterada com sucesso' 
    });
  } catch (error: any) {
    console.error('Erro ao alterar senha:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
