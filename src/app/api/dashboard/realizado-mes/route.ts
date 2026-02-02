import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    // 1. Buscar empresas do grupo
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select(`
        id, 
        name,
        company_mappings (
          external_company_id
        )
      `)
      .eq('company_group_id', groupId)
      .eq('is_active', true);

    if (companiesError) {
      console.error('Erro ao buscar companies:', companiesError);
      throw companiesError;
    }

    // 2. Buscar external_companies do grupo
    const { data: externalCompanies, error: extCompError } = await supabaseAdmin
      .from('external_companies')
      .select('id, external_id, name')
      .eq('company_group_id', groupId);

    if (extCompError) {
      console.error('Erro ao buscar external_companies:', extCompError);
      throw extCompError;
    }

    // Criar mapa de external_company_id (UUID) -> external_id (texto)
    const extCompanyMap = new Map<string, { external_id: string; name: string }>();
    externalCompanies?.forEach(ec => {
      extCompanyMap.set(ec.id, { external_id: ec.external_id, name: ec.name });
    });

    // Criar mapa de company_id -> external_ids
    const companyToExternalIds = new Map<string, string[]>();
    companies?.forEach(company => {
      const mappings = (company as any).company_mappings || [];
      const externalIds: string[] = [];
      mappings.forEach((m: any) => {
        const extData = extCompanyMap.get(m.external_company_id);
        if (extData) {
          externalIds.push(extData.external_id);
        }
      });
      if (externalIds.length > 0) {
        companyToExternalIds.set(company.id, externalIds);
      }
    });

    const allExternalIds = Array.from(new Set(
      Array.from(companyToExternalIds.values()).flat()
    ));

    if (allExternalIds.length === 0) {
      return NextResponse.json({
        period: { year },
        companies: companies?.map(c => ({
          id: c.id,
          name: c.name,
          revenue: 0,
          transactions: 0,
          averageTicket: 0,
          trend: 0
        })) || [],
        summary: {
          totalRevenue: 0,
          totalTransactions: 0,
          averageTicket: 0,
          bestMonth: { month: 0, revenue: 0 },
          worstMonth: { month: 0, revenue: 0 },
          comparisonLastYear: 0
        },
        monthlyRevenue: [],
        monthlyGoals: []
      });
    }

    // 3. Buscar faturamento do ano atual usando MATERIALIZED VIEW (muito mais rápido)
    // Buscar todos os meses de uma vez
    const { data: allMonthData } = await supabaseAdmin
      .from('mv_company_cash_flow_summary')
      .select('external_company_id, month, total_amount')
      .eq('company_group_id', groupId)
      .in('external_company_id', allExternalIds)
      .eq('year', year)
      .in('month', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    const monthlyRevenueByCode: Record<string, Record<number, number>> = {}; // code -> month -> revenue
    
    if (allMonthData) {
      allMonthData.forEach((item: any) => {
        const code = item.external_company_id;
        const month = item.month;
        if (!monthlyRevenueByCode[code]) {
          monthlyRevenueByCode[code] = {};
        }
        monthlyRevenueByCode[code][month] = (monthlyRevenueByCode[code][month] || 0) + (Number(item.total_amount) || 0);
      });
    }

    // 4. Buscar faturamento do ano anterior para comparação (usando materialized view)
    const prevYear = year - 1;
    const { data: prevYearData } = await supabaseAdmin
      .from('mv_company_cash_flow_summary')
      .select('external_company_id, total_amount')
      .eq('company_group_id', groupId)
      .in('external_company_id', allExternalIds)
      .eq('year', prevYear)
      .in('month', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    const prevTotalRevenue = prevYearData?.reduce((sum: number, item: any) => sum + (Number(item.total_amount) || 0), 0) || 0;

    // Agrupar dados do ano anterior por código
    const prevRevenueByCode: Record<string, number> = {};
    if (prevYearData) {
      prevYearData.forEach((item: any) => {
        const code = item.external_company_id;
        prevRevenueByCode[code] = (prevRevenueByCode[code] || 0) + (Number(item.total_amount) || 0);
      });
    }

    // 5. Buscar metas por empresa ANTES de processar (para usar depois)
    const { data: revenueGoals } = await supabaseAdmin
      .from('sales_goals')
      .select('company_id, month, goal_value')
      .eq('company_group_id', groupId)
      .in('company_id', companies?.map((c: any) => c.id) || [])
      .eq('goal_type', 'company_revenue')
      .eq('year', year)
      .eq('is_active', true);

    // Agrupar metas por empresa (soma de todos os meses)
    const companyGoalsMap = new Map<string, number>();
    revenueGoals?.forEach((goal: any) => {
      const companyId = goal.company_id;
      const existing = companyGoalsMap.get(companyId) || 0;
      companyGoalsMap.set(companyId, existing + (Number(goal.goal_value) || 0));
    });

    // 6. Processar dados por empresa
    const companiesData = companies?.map(company => {
      const externalIds = companyToExternalIds.get(company.id) || [];
      
      // Calcular revenue e transactions somando todos os meses
      let revenue = 0;
      let transactions = 0;
      
      externalIds.forEach(code => {
        const codeRevenue = monthlyRevenueByCode[code] || {};
        revenue += Object.values(codeRevenue).reduce((sum, val) => sum + val, 0);
      });
      
      // Calcular transactions aproximado (usando média de ticket)
      // Para dashboard mensal, não é crítico ter o número exato de transações
      transactions = revenue > 0 ? Math.round(revenue / 50) : 0; // Aproximação baseada em ticket médio
      
      // Calcular tendência vs ano anterior (usar dados já buscados)
      let prevRevenue = 0;
      externalIds.forEach(code => {
        prevRevenue += prevRevenueByCode[code] || 0;
      });
      
      const trend = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
      
      // Buscar meta total da empresa
      const companyGoal = companyGoalsMap.get(company.id) || 0;
      const progress = companyGoal > 0 ? (revenue / companyGoal) * 100 : 0;
      
      // Determinar status baseado no progresso e no mês atual
      const currentMonth = new Date().getMonth() + 1;
      const expectedProgress = (currentMonth / 12) * 100;
      let status: 'achieved' | 'ontrack' | 'behind' = 'behind';
      
      if (progress >= 100) {
        status = 'achieved';
      } else if (progress >= expectedProgress * 0.9) { // 90% do esperado
        status = 'ontrack';
      } else {
        status = 'behind';
      }
      
      return {
        id: company.id,
        name: company.name,
        revenue: Math.round(revenue * 100) / 100,
        transactions,
        averageTicket: transactions > 0 ? revenue / transactions : 0,
        trend: Math.round(trend * 10) / 10,
        goal: Math.round(companyGoal * 100) / 100,
        progress: Math.round(progress * 10) / 10,
        status
      };
    }).sort((a, b) => b.revenue - a.revenue) || [];

    // 7. Processar faturamento mensal (agregar todos os códigos)
    const monthlyMap = new Map<number, { revenue: number; transactions: number }>();
    
    // Inicializar todos os meses do ano
    for (let m = 1; m <= 12; m++) {
      monthlyMap.set(m, { revenue: 0, transactions: 0 });
    }

    // Agregar dados de todos os códigos por mês
    allExternalIds.forEach(code => {
      const codeRevenue = monthlyRevenueByCode[code] || {};
      
      for (let month = 1; month <= 12; month++) {
        const existing = monthlyMap.get(month)!;
        const monthRevenue = codeRevenue[month] || 0;
        monthlyMap.set(month, {
          revenue: existing.revenue + monthRevenue,
          transactions: existing.transactions + Math.round(monthRevenue / 50) // Aproximação
        });
      }
    });

    const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const MONTH_NAMES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const monthlyRevenue = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      monthName: MONTH_NAMES[month - 1],
      monthNameFull: MONTH_NAMES_FULL[month - 1],
      revenue: Math.round(data.revenue * 100) / 100,
      transactions: data.transactions
    })).sort((a, b) => a.month - b.month);

    // 8. Agrupar metas por mês (soma de todas as empresas) para o gráfico
    const monthlyGoalsMap = new Map<number, number>();
    for (let m = 1; m <= 12; m++) {
      monthlyGoalsMap.set(m, 0);
    }

    revenueGoals?.forEach((goal: any) => {
      const month = goal.month;
      if (month >= 1 && month <= 12) {
        const existing = monthlyGoalsMap.get(month) || 0;
        monthlyGoalsMap.set(month, existing + (Number(goal.goal_value) || 0));
      }
    });

    const monthlyGoals = Array.from(monthlyGoalsMap.entries()).map(([month, goal]) => ({
      month,
      monthName: MONTH_NAMES[month - 1],
      monthNameFull: MONTH_NAMES_FULL[month - 1],
      goal: Math.round(goal * 100) / 100
    })).sort((a, b) => a.month - b.month);

    // 9. Calcular resumo
    const totalRevenue = companiesData.reduce((sum, c) => sum + c.revenue, 0);
    const totalTransactions = companiesData.reduce((sum, c) => sum + c.transactions, 0);
    const sortedMonthly = [...monthlyRevenue].filter(m => m.revenue > 0).sort((a, b) => b.revenue - a.revenue);
    const bestMonth = sortedMonthly[0] || { month: 0, revenue: 0 };
    const worstMonth = sortedMonthly[sortedMonthly.length - 1] || { month: 0, revenue: 0 };

    // Comparação com ano anterior (já calculado acima)
    const comparisonLastYear = prevTotalRevenue > 0 
      ? Math.round(((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 1000) / 10
      : 0;

    return NextResponse.json({
      period: { year },
      companies: companiesData,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTransactions,
        averageTicket: totalTransactions > 0 ? Math.round((totalRevenue / totalTransactions) * 100) / 100 : 0,
        bestMonth: { month: bestMonth.month, revenue: bestMonth.revenue },
        worstMonth: { month: worstMonth.month, revenue: worstMonth.revenue },
        comparisonLastYear
      },
      monthlyRevenue,
      monthlyGoals
    });

  } catch (error: any) {
    console.error('Erro na API realizado-mes:', error);
    console.error('Stack trace:', error?.stack);
    return NextResponse.json({ 
      error: error?.message || 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
}
