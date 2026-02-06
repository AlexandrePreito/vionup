import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export interface AuthenticatedUser {
  id: string;
  role: 'master' | 'admin' | 'group_admin' | 'company_admin' | 'user';
  company_group_id?: string | null;
  company_ids?: string[];
}

/**
 * Obtém o usuário autenticado da requisição
 * Tenta obter do header 'x-user-id', query param 'user_id', ou cookie
 * TODO: Implementar autenticação via token JWT
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Tentar obter user_id do header, query param ou cookie
    const userId = request.headers.get('x-user-id') || 
                   request.headers.get('X-User-Id') || // Case insensitive
                   new URL(request.url).searchParams.get('user_id') ||
                   request.cookies.get('user_id')?.value;

    console.log('getAuthenticatedUser - userId encontrado:', userId);
    console.log('getAuthenticatedUser - Todos os headers:', Array.from(request.headers.entries()).map(([key, value]) => ({ key, value: key.toLowerCase().includes('user') ? value : '...' })));

    if (!userId) {
      console.log('getAuthenticatedUser - Nenhum userId encontrado');
      return null;
    }

    // Buscar usuário no banco (sem filtrar por is_active para permitir usuários inativos também)
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        role,
        company_group_id
      `)
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.log('getAuthenticatedUser - Erro ao buscar usuário:', error);
      return null;
    }
    
    console.log('getAuthenticatedUser - Usuário encontrado:', { id: user.id, role: user.role, company_group_id: user.company_group_id });

    // Se for user, buscar empresas vinculadas
    let companyIds: string[] = [];
    if (user.role === 'user') {
      const { data: userCompanies } = await supabaseAdmin
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id);
      
      companyIds = userCompanies?.map((uc: any) => uc.company_id) || [];
    }

    return {
      id: user.id,
      role: user.role as 'master' | 'admin' | 'group_admin' | 'company_admin' | 'user',
      company_group_id: user.company_group_id,
      company_ids: companyIds
    };
  } catch (error) {
    console.error('Erro ao obter usuário autenticado:', error);
    return null;
  }
}

/**
 * Aplica filtros de permissão baseados no role do usuário
 */
export function applyPermissionFilters(
  query: any,
  user: AuthenticatedUser | null,
  tableName: string
): any {
  if (!user) {
    // Se não tem usuário, não retorna nada (ou lança erro)
    return query.eq('id', '00000000-0000-0000-0000-000000000000'); // Filtro que não retorna nada
  }

  // Master vê tudo
  if (user.role === 'master') {
    return query;
  }

  // Admin (group_admin ou admin) vê apenas dados do seu grupo
  if (user.role === 'group_admin' || user.role === 'admin') {
    if (user.company_group_id) {
      return query.eq('company_group_id', user.company_group_id);
    }
    // Se não tem grupo, não retorna nada
    return query.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  // Company Admin vê apenas dados da sua empresa (se tiver company_id)
  // Por enquanto, tratar como user até implementar company_id no helper
  if (user.role === 'company_admin') {
    // TODO: Implementar filtro por company_id quando disponível
    // Por enquanto, tratar como group_admin
    if (user.company_group_id) {
      return query.eq('company_group_id', user.company_group_id);
    }
    return query.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  // User vê apenas dados das suas empresas
  if (user.role === 'user') {
    if (user.company_ids && user.company_ids.length > 0) {
      return query.in('company_id', user.company_ids);
    }
    // Se não tem empresas, não retorna nada
    return query.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  return query;
}
