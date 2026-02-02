import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Buscar usuário por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        company_group:company_groups(id, name, slug),
        company:companies(id, name, slug)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar usuário
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      company_group_id, 
      company_ids,
      name, 
      email, 
      password, 
      role, 
      avatar_url, 
      is_active 
    } = body;

    // Verificar se usuário existe
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, auth_id, email, company_group_id, role')
      .eq('id', id)
      .single();

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Se está alterando email, verificar duplicidade
    if (email && email !== existingUser.email) {
      const { data: emailExists } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .single();

      if (emailExists) {
        return NextResponse.json(
          { error: 'Já existe outro usuário com este email' },
          { status: 400 }
        );
      }

      // Atualizar email no Auth também
      if (existingUser.auth_id) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.auth_id,
          { email }
        );

        if (authError) {
          console.error('Erro ao atualizar email no Auth:', authError);
          return NextResponse.json(
            { error: 'Erro ao atualizar email' },
            { status: 500 }
          );
        }
      }
    }

    // Se está alterando senha
    if (password && existingUser.auth_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.auth_id,
        { password }
      );

      if (authError) {
        console.error('Erro ao atualizar senha no Auth:', authError);
        return NextResponse.json(
          { error: 'Erro ao atualizar senha' },
          { status: 500 }
        );
      }
    }

    // Validações de hierarquia se role está sendo alterado
    if (role) {
      const validRoles = ['master', 'admin', 'user'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Role inválido' },
          { status: 400 }
        );
      }
    }

    // Verificar grupo (se informado)
    if (company_group_id) {
      const { data: group } = await supabaseAdmin
        .from('company_groups')
        .select('id')
        .eq('id', company_group_id)
        .single();

      if (!group) {
        return NextResponse.json(
          { error: 'Grupo não encontrado' },
          { status: 400 }
        );
      }
    }

    // Verificar empresas (se informadas)
    if (company_ids && company_ids.length > 0) {
      const { data: companies } = await supabaseAdmin
        .from('companies')
        .select('id, company_group_id')
        .in('id', company_ids);

      if (!companies || companies.length !== company_ids.length) {
        return NextResponse.json(
          { error: 'Uma ou mais empresas não foram encontradas' },
          { status: 400 }
        );
      }

      // Verificar se todas pertencem ao grupo (se informado)
      const finalGroupId = company_group_id !== undefined ? company_group_id : existingUser.company_group_id;
      if (finalGroupId) {
        const invalidCompanies = companies.filter(c => c.company_group_id !== finalGroupId);
        if (invalidCompanies.length > 0) {
          return NextResponse.json(
            { error: 'Uma ou mais empresas não pertencem ao grupo do usuário' },
            { status: 400 }
          );
        }
      }
    }

    // Montar objeto de atualização
    const updateData: Record<string, any> = {};
    if (company_group_id !== undefined) updateData.company_group_id = company_group_id;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (is_active !== undefined) updateData.is_active = is_active;
    // Remover company_id se existir (não usar mais)
    if (role === 'master' || (role !== undefined && role !== 'master')) {
      updateData.company_id = null;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar usuário:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar usuário' },
        { status: 500 }
      );
    }

    // Atualizar empresas vinculadas (se for user)
    if (company_ids !== undefined) {
      // Remover vínculos antigos
      await supabaseAdmin
        .from('user_companies')
        .delete()
        .eq('user_id', id);

      // Adicionar novos vínculos
      const finalRole = role !== undefined ? role : data.role;
      if (finalRole === 'user' && company_ids.length > 0) {
        const userCompanies = company_ids.map((companyId: string) => ({
          user_id: id,
          company_id: companyId
        }));

        const { error: companiesError } = await supabaseAdmin
          .from('user_companies')
          .insert(userCompanies);

        if (companiesError) {
          console.error('Erro ao vincular empresas:', companiesError);
          // Não falhar a atualização do usuário, apenas logar o erro
        }
      }
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir usuário
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verificar se usuário existe
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, auth_id')
      .eq('id', id)
      .single();

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Excluir do Auth (se tiver auth_id)
    if (existingUser.auth_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
        existingUser.auth_id
      );

      if (authError) {
        console.error('Erro ao excluir usuário do Auth:', authError);
        // Continua mesmo com erro no Auth
      }
    }

    // Excluir da tabela users
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir usuário:', error);
      return NextResponse.json(
        { error: 'Erro ao excluir usuário' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
