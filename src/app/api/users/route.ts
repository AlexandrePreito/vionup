import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET - Listar usuários
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const companyId = searchParams.get('company_id');
    const role = searchParams.get('role');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    // Obter usuário logado
    const user = await getAuthenticatedUser(request);
    
    // Debug: verificar se usuário foi identificado
    console.log('API /users - Usuário identificado:', user ? { id: user.id, role: user.role, company_group_id: user.company_group_id } : 'null');
    console.log('API /users - Headers x-user-id:', request.headers.get('x-user-id'));

    let query = supabaseAdmin
      .from('users')
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .order('name', { ascending: true });

    // Aplicar filtros de permissão baseados no role
    if (user) {
      console.log('API /users - Aplicando filtros para usuário:', { 
        id: user.id, 
        role: user.role, 
        company_group_id: user.company_group_id 
      });
      
      if (user.role === 'master') {
        // Master vê tudo - usar group_id se informado
        if (groupId) {
          console.log('API /users - Master filtrando por group_id:', groupId);
          query = query.eq('company_group_id', groupId);
        } else {
          console.log('API /users - Master sem filtro de grupo, retornando todos');
        }
      } else if (user.role === 'group_admin' || user.role === 'admin') {
        // Admin (group_admin) vê apenas usuários do seu grupo
        if (user.company_group_id) {
          console.log('API /users - group_admin filtrando por company_group_id:', user.company_group_id);
          query = query.eq('company_group_id', user.company_group_id);
        } else {
          // Se não tem grupo, não retorna nada
          console.log('API /users - group_admin sem company_group_id, retornando vazio');
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      } else if (user.role === 'company_admin') {
        // Company Admin vê apenas usuários do seu grupo (por enquanto)
        if (user.company_group_id) {
          console.log('API /users - company_admin filtrando por company_group_id:', user.company_group_id);
          query = query.eq('company_group_id', user.company_group_id);
        } else {
          console.log('API /users - company_admin sem company_group_id, retornando vazio');
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      } else if (user.role === 'user') {
        // User comum só vê a si mesmo
        console.log('API /users - user comum, retornando apenas o próprio usuário');
        query = query.eq('id', user.id);
      }
    } else {
      // Se não tem usuário identificado, retornar vazio
      console.warn('API /users - Nenhum usuário identificado, retornando vazio.');
      console.warn('API /users - Headers recebidos:', {
        'x-user-id': request.headers.get('x-user-id'),
        'authorization': request.headers.get('authorization') ? 'present' : 'missing',
        'cookie': request.headers.get('cookie') ? 'present' : 'missing'
      });
      query = query.eq('id', '00000000-0000-0000-0000-000000000000');
    }

    // Filtros adicionais (após aplicar permissões)
    if (role) {
      query = query.eq('role', role);
    }

    // Filtrar por is_active apenas se includeInactive não for true
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar usuários' },
        { status: 500 }
      );
    }

    console.log('API /users - Query executada. Usuários retornados:', users?.length || 0);
    if (error) {
      console.error('API /users - Erro na query:', error);
      console.error('API /users - Detalhes do erro:', JSON.stringify(error, null, 2));
    }
    if (users && users.length > 0) {
      console.log('API /users - Primeiros usuários:', users.slice(0, 3).map((u: any) => ({ 
        name: u.name, 
        email: u.email, 
        role: u.role, 
        company_group_id: u.company_group_id 
      })));
    } else {
      console.warn('API /users - Nenhum usuário retornado.');
      console.warn('API /users - Verificando se há usuários no banco sem filtros...');
      // Teste: buscar todos os usuários sem filtros para debug
      const { data: allUsers, error: allError } = await supabaseAdmin
        .from('users')
        .select('id, name, email, role, company_group_id, is_active')
        .limit(5);
      console.log('API /users - Teste sem filtros:', { 
        count: allUsers?.length || 0, 
        error: allError,
        users: allUsers 
      });
    }

    // Adicionar contagem de empresas para cada usuário
    const usersWithCount = await Promise.all((users || []).map(async (user: any) => {
      if (user.role === 'user') {
        const { count } = await supabaseAdmin
          .from('user_companies')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        return { ...user, companies_count: count || 0 };
      }
      return { ...user, companies_count: 0 };
    }));

    return NextResponse.json({ users: usersWithCount });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar usuário
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    const { 
      company_group_id, 
      company_ids,
      name, 
      email, 
      password, 
      role, 
      avatar_url 
    } = body;
    
    console.log('Campos extraídos:', { name, email, role, company_group_id, company_ids, hasPassword: !!password });

    // Validações básicas
    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Nome, email e role são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar role
    const validRoles = ['master', 'group_admin', 'company_admin', 'user'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Role inválido. Valores válidos: master, group_admin, company_admin, user' },
        { status: 400 }
      );
    }

    // Validações de hierarquia
    if (role !== 'master' && !company_group_id) {
      return NextResponse.json(
        { error: 'Grupo é obrigatório para usuários não-master' },
        { status: 400 }
      );
    }

    if (role === 'user' && (!body.company_ids || body.company_ids.length === 0)) {
      return NextResponse.json(
        { error: 'Usuário precisa ter pelo menos uma empresa vinculada' },
        { status: 400 }
      );
    }

    // Verificar se email já existe
    const { data: existingEmail } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Já existe um usuário com este email' },
        { status: 400 }
      );
    }

    // Verificar se grupo existe (se informado)
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

    // Verificar se empresas existem e pertencem ao grupo (se informadas)
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

      // Verificar se todas pertencem ao grupo
      if (company_group_id) {
        const invalidCompanies = companies.filter(c => c.company_group_id !== company_group_id);
        if (invalidCompanies.length > 0) {
          return NextResponse.json(
            { error: 'Uma ou mais empresas não pertencem ao grupo informado' },
            { status: 400 }
          );
        }
      }
    }

    // Criar usuário no Supabase Auth (se tiver senha)
    let authId = null;
    if (password) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (authError) {
        console.error('Erro ao criar usuário no Auth:', authError);
        return NextResponse.json(
          { error: 'Erro ao criar credenciais do usuário' },
          { status: 500 }
        );
      }

      authId = authUser.user.id;
    }

    // Criar usuário na tabela users
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: authId,
        company_group_id: company_group_id || null,
        company_id: null, // Removido - não usar mais
        name,
        email,
        role,
        avatar_url: avatar_url || null,
        is_active: true
      })
      .select(`
        *,
        company_group:company_groups(id, name, slug)
      `)
      .single();

    if (error) {
      console.error('Erro ao criar usuário:', error);
      
      // Se criou no Auth mas falhou na tabela, remover do Auth
      if (authId) {
        await supabaseAdmin.auth.admin.deleteUser(authId);
      }
      
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    // Salvar empresas vinculadas (se for user)
    if (role === 'user' && company_ids && company_ids.length > 0) {
      const userCompanies = company_ids.map((companyId: string) => ({
        user_id: newUser.id,
        company_id: companyId
      }));

      const { error: companiesError } = await supabaseAdmin
        .from('user_companies')
        .insert(userCompanies);

      if (companiesError) {
        console.error('Erro ao vincular empresas:', companiesError);
        // Não falhar a criação do usuário, apenas logar o erro
      }
    }

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}