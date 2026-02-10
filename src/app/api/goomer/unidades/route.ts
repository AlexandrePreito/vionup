import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    // Obter usuário logado (obrigatório só quando usa group_id)
    const user = await getAuthenticatedUser(request);
    console.log('API /goomer/unidades - group_id na query:', groupId);

    // Sem group_id: listar empresas das tabelas goomer (tela NPS) — não exige usuário para não bloquear o dropdown
    if (!groupId || groupId === '') {
      const { data: todasUnidades, error: errUnidades } = await supabaseAdmin
        .from('goomer_unidades')
        .select('*')
        .order('nome_goomer');
      if (errUnidades) {
        console.error('API /goomer/unidades - Erro ao buscar goomer_unidades:', errUnidades);
        throw errUnidades;
      }
      if (todasUnidades && todasUnidades.length > 0) {
        return NextResponse.json({ unidades: todasUnidades });
      }
      // Fallback: goomer_unidades vazia — buscar unidade_id distintos de goomer_nps_mensal e montar lista
      const { data: npsRows, error: errNps } = await supabaseAdmin
        .from('goomer_nps_mensal')
        .select('unidade_id');
      if (errNps || !npsRows?.length) {
        return NextResponse.json({ unidades: [] });
      }
      const idsUnicos = [...new Set((npsRows as { unidade_id: string }[]).map((r) => r.unidade_id).filter(Boolean))];
      const { data: unidadesPorId } = await supabaseAdmin
        .from('goomer_unidades')
        .select('id, id_empresa_goomer, nome_goomer')
        .in('id', idsUnicos);
      const mapUnidades = new Map((unidadesPorId || []).map((u: any) => [u.id, u]));
      const unidadesFallback = idsUnicos.map((id) => {
        const u = mapUnidades.get(id);
        return u || { id, id_empresa_goomer: id, nome_goomer: `Empresa ${id}` };
      });
      return NextResponse.json({ unidades: unidadesFallback });
    }

    // Com group_id: exige usuário e usa cadeia companies / mapeamentos
    if (!user) {
      console.warn('API /goomer/unidades - Nenhum usuário identificado (group_id informado), retornando vazio');
      return NextResponse.json({ unidades: [] });
    }
    let effectiveGroupId = groupId;
    if (user.role !== 'master') {
      effectiveGroupId = user.company_group_id;
      if (groupId !== user.company_group_id) {
        console.warn('API /goomer/unidades - SEGURANÇA: group_id da query ignorado para usuário não-master');
      }
    }

    if (!effectiveGroupId) {
      return NextResponse.json({ unidades: [] });
    }

    // Helper: buscar unidades Goomer a partir de códigos externos
    const fetchUnidadesByExternalCodes = async (externalCodes: Set<string>) => {
      if (externalCodes.size === 0) return [];
      const { data: unidades, error } = await supabaseAdmin
        .from('goomer_unidades')
        .select('*')
        .in('id_empresa_goomer', Array.from(externalCodes))
        .order('nome_goomer');
      if (error) throw error;
      return (unidades || []).filter((u: any) => externalCodes.has(String(u.id_empresa_goomer)));
    };

    // 1) Tentar via companies + company_mappings
    let externalCodes = new Set<string>();
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('company_group_id', effectiveGroupId)
      .eq('is_active', true);

    if (companiesError) {
      console.error('API /goomer/unidades - Erro ao buscar empresas:', companiesError);
      throw companiesError;
    }

    if (companies && companies.length > 0) {
      const companyIds = companies.map((c: any) => c.id);
      const { data: mappings, error: mappingsError } = await supabaseAdmin
        .from('company_mappings')
        .select('external_company_id, company_id')
        .eq('company_group_id', effectiveGroupId)
        .in('company_id', companyIds);

      if (!mappingsError && mappings && mappings.length > 0) {
        const externalCompanyIds = [...new Set(mappings.map((m: any) => m.external_company_id))];
        const { data: externalCompanies, error: extError } = await supabaseAdmin
          .from('external_companies')
          .select('id, external_id, external_code, company_group_id')
          .in('id', externalCompanyIds)
          .eq('company_group_id', effectiveGroupId);

        if (!extError && externalCompanies?.length) {
          externalCompanies.forEach((ec: any) => {
            if (ec.external_id) externalCodes.add(String(ec.external_id));
            if (ec.external_code) externalCodes.add(String(ec.external_code));
          });
        }
      }
    }

    let filteredUnidades = await fetchUnidadesByExternalCodes(externalCodes);

    // 2) Fallback: se não encontrou nada, buscar direto por external_companies do grupo
    if (filteredUnidades.length === 0) {
      console.log('API /goomer/unidades - Fallback: buscando external_companies direto pelo grupo');
      const { data: externalByGroup, error: extErr } = await supabaseAdmin
        .from('external_companies')
        .select('external_id, external_code')
        .eq('company_group_id', effectiveGroupId);

      if (!extErr && externalByGroup?.length) {
        const fallbackCodes = new Set<string>();
        externalByGroup.forEach((ec: any) => {
          if (ec.external_id) fallbackCodes.add(String(ec.external_id));
          if (ec.external_code) fallbackCodes.add(String(ec.external_code));
        });
        filteredUnidades = await fetchUnidadesByExternalCodes(fallbackCodes);
        if (filteredUnidades.length > 0) {
          console.log('API /goomer/unidades - Fallback retornou', filteredUnidades.length, 'unidades');
        }
      }
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
