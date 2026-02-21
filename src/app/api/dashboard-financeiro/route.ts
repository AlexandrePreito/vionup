import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const companyId = searchParams.get('company_id');

    if (!groupId || !year || !month) {
      return NextResponse.json(
        { error: 'group_id, year e month são obrigatórios' },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const currentDay = new Date().getDate();
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const isCurrentMonth = yearNum === new Date().getFullYear() && monthNum === new Date().getMonth() + 1;
    const isPastMonth = yearNum < new Date().getFullYear() || (yearNum === new Date().getFullYear() && monthNum < new Date().getMonth() + 1);

    // 1. Buscar metas financeiras
    let goalsQuery = supabaseAdmin
      .from('financial_goals')
      .select(`
        id,
        category_id,
        company_id,
        goal_type,
        goal_value,
        description,
        category:categories(id, name, code, type, level, parent_id),
        company:companies(id, name),
        responsibles:financial_goal_responsibles(
          responsible:financial_responsibles(id, name, role)
        )
      `)
      .eq('company_group_id', groupId)
      .eq('year', yearNum)
      .eq('month', monthNum)
      .eq('is_active', true);

    const { data: goalsData, error: goalsError } = await goalsQuery;

    if (goalsError) {
      console.error('Erro ao buscar metas:', goalsError);
      return NextResponse.json({ error: 'Erro ao buscar metas' }, { status: 500 });
    }

    let goalsFiltered: any[] = goalsData || [];
    if (companyId) {
      goalsFiltered = goalsFiltered.filter((g: any) => !g.company_id || g.company_id === companyId);
    }

    if (goalsFiltered.length === 0) {
      return NextResponse.json({
        goals: [],
        summary: {
          total_entradas_meta: 0,
          total_entradas_realizado: 0,
          total_saidas_meta: 0,
          total_saidas_realizado: 0,
          resultado_meta: 0,
          resultado_realizado: 0,
          faturamento_total: 0
        }
      });
    }

    // 2. Mapear category_id → external_ids (external_cash_flow_statement.category_id)
    const categoryIds = [...new Set(goalsFiltered.map((g: any) => g.category_id).filter(Boolean))];
    const categoryExternalIdsMap: Record<string, string[]> = {};

    for (const catId of categoryIds) {
      const { data: catMappings } = await supabaseAdmin
        .from('category_mappings')
        .select('external_category_id')
        .eq('category_id', catId)
        .eq('company_group_id', groupId);

      if (catMappings && catMappings.length > 0) {
        const extCatUuids = catMappings.map((m: any) => m.external_category_id);
        const { data: extCats } = await supabaseAdmin
          .from('external_categories')
          .select('external_id')
          .in('id', extCatUuids);

        categoryExternalIdsMap[catId] = (extCats || []).map((ec: any) => String(ec.external_id || '')).filter(Boolean);
      } else {
        categoryExternalIdsMap[catId] = [];
      }
    }

    // 3. Mapear company_id → external_ids (MESMA LÓGICA do /dashboard/realizado)
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select(`
        id, name,
        company_mappings (external_company_id)
      `)
      .eq('company_group_id', groupId)
      .eq('is_active', true);

    const { data: externalCompanies } = await supabaseAdmin
      .from('external_companies')
      .select('id, external_id, name')
      .eq('company_group_id', groupId);

    const extCompanyMap = new Map<string, { external_id: string; name: string }>();
    externalCompanies?.forEach((ec: any) => {
      extCompanyMap.set(ec.id, { external_id: String(ec.external_id || ''), name: ec.name });
    });

    const companyToExternalIds = new Map<string, string[]>();
    companies?.forEach((comp: any) => {
      const mappings = comp.company_mappings || [];
      const externalIds: string[] = [];
      mappings.forEach((m: any) => {
        const extData = extCompanyMap.get(m.external_company_id);
        if (extData) externalIds.push(extData.external_id);
      });
      if (externalIds.length > 0) {
        companyToExternalIds.set(comp.id, externalIds);
      }
    });

    const companyExternalIdsMap: Record<string, string[]> = Object.fromEntries(companyToExternalIds);

    // Se filtro de empresa na request, garantir que está no mapa
    if (companyId && !companyExternalIdsMap[companyId]) {
      const { data: compMappings } = await supabaseAdmin
        .from('company_mappings')
        .select('external_company_id')
        .eq('company_id', companyId)
        .eq('company_group_id', groupId);
      if (compMappings?.length) {
        const extUuids = compMappings.map((m: any) => m.external_company_id);
        const { data: extComps } = await supabaseAdmin
          .from('external_companies')
          .select('external_id')
          .in('id', extUuids);
        companyExternalIdsMap[companyId] = (extComps || []).map((ec: any) => String(ec.external_id || '')).filter(Boolean);
      }
    }

    // 4. Buscar TODOS os dados do fluxo de caixa do período
    const allExtCategoryIds = Object.values(categoryExternalIdsMap).flat();
    const uniqueExtCategoryIds = [...new Set(allExtCategoryIds)];

    let statementQuery = supabaseAdmin
      .from('external_cash_flow_statement')
      .select('category_id, external_company_id, amount')
      .eq('company_group_id', groupId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (uniqueExtCategoryIds.length > 0) {
      statementQuery = statementQuery.in('category_id', uniqueExtCategoryIds);
    }

    const { data: cashFlowData, error: cfError } = await statementQuery;
    if (cfError) {
      console.error('Erro ao buscar external_cash_flow_statement:', cfError);
    }

    // 5. Buscar faturamento (external_cash_flow) - MESMA FONTE do /dashboard/realizado
    const allExternalCompanyIds = Array.from(new Set(Array.from(companyToExternalIds.values()).flat()));
    let revenueData: any[] = [];

    if (allExternalCompanyIds.length > 0) {
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore && page < 100) {
        const { data, error } = await supabaseAdmin
          .from('external_cash_flow')
          .select('external_company_id, amount')
          .eq('company_group_id', groupId)
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .in('external_company_id', allExternalCompanyIds)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error('Erro ao buscar external_cash_flow:', error);
          break;
        }
        if (data && data.length > 0) {
          revenueData.push(...data);
          if (data.length < pageSize) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }
    }

    const getRevenueForCompany = (metaCompanyId: string | null, filterCompanyId: string | null) => {
      const effectiveId = filterCompanyId || metaCompanyId;
      if (!effectiveId) {
        return revenueData.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      }
      const extIds = companyToExternalIds.get(effectiveId) || companyExternalIdsMap[effectiveId] || [];
      return revenueData
        .filter((r) => extIds.includes(String(r.external_company_id || '')))
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    };

    // 6. Para cada meta, calcular realizado e status
    const processedGoals: any[] = [];

    for (const goal of goalsFiltered) {
      const extCatIds = categoryExternalIdsMap[goal.category_id] || [];
      // Se filtro de empresa na request: usar esse; senão, usar company_id da meta (null = todas)
      const effectiveCompanyId = companyId || goal.company_id;
      const extCompIds = effectiveCompanyId ? (companyExternalIdsMap[effectiveCompanyId] || []) : null;

      let realizedValue = 0;
      if (cashFlowData && extCatIds.length > 0) {
        realizedValue = cashFlowData
          .filter((cf: any) =>
            extCatIds.includes(String(cf.category_id || '')) &&
            (extCompIds === null || extCompIds.includes(String(cf.external_company_id || '')))
          )
          .reduce((sum: number, cf: any) => sum + Number(cf.amount || 0), 0);
      }

      const totalRevenue = getRevenueForCompany(goal.company_id, companyId || null);
      const absRealized = Math.abs(realizedValue);
      const absTotalRevenue = Math.abs(totalRevenue);
      const catType = goal.category?.type || 'saida';

      let progress = 0;
      let realizedPercentage = 0;

      if (goal.goal_type === 'value') {
        progress = goal.goal_value > 0 ? (absRealized / goal.goal_value) * 100 : 0;
        realizedPercentage = progress;
      } else {
        realizedPercentage = absTotalRevenue > 0 ? (absRealized / absTotalRevenue) * 100 : 0;
        progress = goal.goal_value > 0 ? (realizedPercentage / goal.goal_value) * 100 : 0;
      }

      let status: 'achieved' | 'ontrack' | 'behind' = 'behind';

      if (catType === 'saida') {
        const effectiveRealized = goal.goal_type === 'percentage' ? realizedPercentage : absRealized;
        const effectiveGoal = goal.goal_value;
        if (effectiveRealized <= effectiveGoal) {
          status = 'achieved';
        } else if (isCurrentMonth) {
          const expectedByNow = effectiveGoal * (currentDay / daysInMonth);
          status = effectiveRealized <= expectedByNow ? 'ontrack' : 'behind';
        }
      } else {
        if (progress >= 100) {
          status = 'achieved';
        } else if (!isPastMonth) {
          const expectedProportion = (currentDay / daysInMonth) * 100;
          status = progress >= expectedProportion ? 'ontrack' : 'behind';
        }
      }

      processedGoals.push({
        id: goal.id,
        category_id: goal.category_id,
        category_name: goal.category?.name || 'Categoria',
        category_type: catType,
        category_code: goal.category?.code || null,
        company_id: goal.company_id,
        company_name: goal.company?.name || 'Todas as empresas',
        goal_type: goal.goal_type,
        goal_value: goal.goal_value,
        realized_value: absRealized,
        realized_percentage: realizedPercentage,
        total_revenue: absTotalRevenue,
        progress: Math.min(Math.round(progress * 10) / 10, 150),
        status,
        responsibles: (goal.responsibles || []).map((r: any) => ({
          id: r.responsible?.id,
          name: r.responsible?.name,
          role: r.responsible?.role
        })).filter((r: any) => r.id),
        description: goal.description || null
      });
    }

    // 7. Summary
    const entradas = processedGoals.filter(g => g.category_type === 'entrada');
    const saidas = processedGoals.filter(g => g.category_type === 'saida');

    const total_entradas_meta = entradas
      .filter(g => g.goal_type === 'value')
      .reduce((s, g) => s + g.goal_value, 0);
    const total_entradas_realizado = entradas.reduce((s, g) => s + g.realized_value, 0);

    const total_saidas_meta = saidas
      .filter(g => g.goal_type === 'value')
      .reduce((s, g) => s + g.goal_value, 0);
    const total_saidas_realizado = saidas.reduce((s, g) => s + g.realized_value, 0);

    const faturamentoTotal = Math.abs(getRevenueForCompany(null, companyId || null));

    return NextResponse.json({
      goals: processedGoals,
      summary: {
        total_entradas_meta,
        total_entradas_realizado,
        total_saidas_meta,
        total_saidas_realizado,
        resultado_meta: total_entradas_meta - total_saidas_meta,
        resultado_realizado: total_entradas_realizado - total_saidas_realizado,
        faturamento_total: faturamentoTotal
      }
    });
  } catch (error) {
    console.error('Erro dashboard financeiro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
