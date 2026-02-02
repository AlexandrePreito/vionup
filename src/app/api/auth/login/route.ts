import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar usuário pelo email
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        password_hash,
        company_group_id,
        is_active,
        avatar_url,
        company_group:company_groups(id, name)
      `)
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    // Verificar se usuário está ativo
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Usuário desativado. Entre em contato com o administrador.' },
        { status: 401 }
      );
    }

    // Verificar senha
    // Se não tem password_hash, usar senha padrão 123456
    let isValidPassword = false;
    
    if (user.password_hash) {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    } else {
      // Senha padrão para usuários sem hash
      isValidPassword = password === '123456';
    }

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    // Retornar usuário (sem a senha)
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({ 
      user: userWithoutPassword,
      message: 'Login realizado com sucesso'
    });
  } catch (error: any) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
