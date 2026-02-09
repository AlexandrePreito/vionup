import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    // Obter usuário logado
    const user = await getAuthenticatedUser(request);
    
    console.log('API /goomer/unidades - Usuário identificado:', user ? { id: user.id, role: user.role, company_group_id: user.company_group_id } : 'null');
    console.log('API /goomer/unidades - group_id na query:', groupId);

    if (!user) {
      console.warn('API /goomer/unidades - Nenhum usuário identificado, retornando vazio');
      return NextResponse.json({ unidades: [] });
    }

    // Determinar o grupo efetivo (master pode escolher, outros usam o do usuário)
    let effectiveGroupId = groupId;
    if (user.role !== 'master') {
      effectiveGroupId = user.company_group_id;
      if (groupId && groupId !== user.company_group_id) {
        console.warn('API /goomer/unidades - SEGURANÇA: group_id da query ignorado para usuário não-master');
      }
    }

    if (!effectiveGroupId) {
      console.warn('API /goomer/unidades - Nenhum group_id disponível, retornando vazio');
      return NextResponse.json({ unidades: [] });
    }

    // Buscar empresas do grupo
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('company_group_id', effectiveGroupId)
      .eq('is_active', true);

    if (companiesError) {
      console.error('API /goomer/unidades - Erro ao buscar empresas:', companiesError);
      throw companiesError;
    }

    if (!companies || companies.length === 0) {
      console.log('API /goomer/unidades - Nenhuma empresa encontrada para o grupo:', effectiveGroupId);
      return NextResponse.json({ unidades: [] });
    }

    const companyIds = companies.map((c: any) => c.id);

    // Buscar mapeamentos de empresas do grupo
    const { data: mappings, error: mappingsError } = await supabaseAdmin
      .from('company_mappings')
      .select('external_company_id, company_id')
      .eq('company_group_id', effectiveGroupId)
      .in('company_id', companyIds);

    if (mappingsError) {
      console.error('API /goomer/unidades - Erro ao buscar mapeamentos:', mappingsError);
      throw mappingsError;
    }

    // Se não houver mapeamentos, retornar vazio
    if (!mappings || mappings.length === 0) {
      console.log('API /goomer/unidades - Nenhum mapeamento encontrado para o grupo:', effectiveGroupId);
      return NextResponse.json({ unidades: [] });
    }

    // Buscar empresas externas dos mapeamentos
    const externalCompanyIds = [...new Set(mappings.map((m: any) => m.external_company_id))];
    console.log('API /goomer/unidades - External company IDs dos mapeamentos:', externalCompanyIds.length);
    
    const { data: externalCompanies, error: extError } = await supabaseAdmin
      .from('external_companies')
      .select('id, external_id, external_code, company_group_id')
      .in('id', externalCompanyIds)
      .eq('company_group_id', effectiveGroupId);

    if (extError) {
      console.error('API /goomer/unidades - Erro ao buscar empresas externas:', extError);
      throw extError;
    }

    console.log('API /goomer/unidades - Empresas externas encontradas:', externalCompanies?.length || 0);

    // Extrair códigos externos (external_id ou external_code)
    const externalCodes = new Set<string>();
    externalCompanies?.forEach((ec: any) => {
      if (ec.external_id) {
        externalCodes.add(String(ec.external_id));
        console.log('API /goomer/unidades - Adicionado external_id:', ec.external_id);
      }
      if (ec.external_code) {
        externalCodes.add(String(ec.external_code));
        console.log('API /goomer/unidades - Adicionado external_code:', ec.external_code);
      }
    });

    if (externalCodes.size === 0) {
      console.log('API /goomer/unidades - Nenhum código externo encontrado para o grupo:', effectiveGroupId);
      return NextResponse.json({ unidades: [] });
    }

    console.log('API /goomer/unidades - Códigos externos para buscar:', Array.from(externalCodes));

    // Buscar unidades do Goomer que correspondem aos códigos externos
    // goomer_unidades tem id_empresa_goomer que pode corresponder ao external_id ou external_code
    const { data: unidades, error: unidadesError } = await supabaseAdmin
      .from('goomer_unidades')
      .select('*')
      .in('id_empresa_goomer', Array.from(externalCodes))
      .order('nome_goomer');

    if (unidadesError) {
      console.error('API /goomer/unidades - Erro ao buscar unidades:', unidadesError);
      throw unidadesError;
    }

    console.log('API /goomer/unidades - Unidades encontradas no Goomer:', unidades?.length || 0);
    if (unidades && unidades.length > 0) {
      console.log('API /goomer/unidades - Primeiras unidades:', unidades.slice(0, 3).map((u: any) => ({ 
        id: u.id, 
        nome: u.nome_goomer, 
        id_empresa_goomer: u.id_empresa_goomer 
      })));
    }

    // Filtro de segurança adicional: garantir que apenas unidades mapeadas sejam retornadas
    const filteredUnidades = unidades?.filter((u: any) => {
      const matches = externalCodes.has(String(u.id_empresa_goomer));
      if (!matches) {
        console.log('API /goomer/unidades - Unidade filtrada:', u.nome_goomer, 'id_empresa_goomer:', u.id_empresa_goomer);
      }
      return matches;
    }) || [];

    if (filteredUnidades.length !== unidades?.length) {
      console.warn('API /goomer/unidades - ATENÇÃO: Algumas unidades foram filtradas por não terem mapeamento válido!');
      console.warn('API /goomer/unidades - Total encontrado:', unidades?.length, 'Total filtrado:', filteredUnidades.length);
    }

    console.log('API /goomer/unidades - Unidades finais retornadas:', filteredUnidades.length, 'para o grupo:', effectiveGroupId);

    return NextResponse.json({ unidades: filteredUnidades });
  } catch (error: any) {
    console.error('Erro ao buscar unidades:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar unidades' },
      { status: 500 }
    );
  }
}
