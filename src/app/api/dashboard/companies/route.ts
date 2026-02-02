import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!groupId || !year || !month) {
      return NextResponse.json(
        { error: 'group_id, year e month são obrigatórios' },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    console.log('\n========== DASHBOARD EMPRESAS ==========');
    console.log('Grupo:', groupId, 'Ano:', yearNum, 'Mês:', monthNum);

    // 1. Buscar todas as empresas do grupo
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id, name, company_group_id')
      .eq('company_group_id', groupId)
      .order('name');

    if (!companies || companies.length === 0) {
      return NextResponse.json({ 
        companies: [],
        summary: { total: 0, achievedRevenue: 0, totalRevenueGoal: 0, totalRevenueRealized: 0 }
      });
    }

    console.log('Empresas encontradas:', companies.length);

    // 2. Buscar mapeamentos de todas as empresas (pode haver múltiplos por empresa)
    const { data: allMappings } = await supabaseAdmin
      .from('company_mappings')
      .select('company_id, external_company_id')
      .in('company_id', companies.map(c => c.id))
      .eq('company_group_id', groupId);

    // 3. Buscar códigos externos
    const externalUuids = [...new Set(allMappings?.map(m => m.external_company_id) || [])];
    let uuidToCode: Record<string, string> = {};
    
    if (externalUuids.length > 0) {
      const { data: externalCompanies } = await supabaseAdmin
        .from('external_companies')
        .select('id, external_id')
        .in('id', externalUuids);

      if (externalCompanies) {
        for (const ec of externalCompanies) {
          uuidToCode[ec.id] = ec.external_id;
        }
      }
    }

    // Mapear company_id -> array de códigos externos (pode ter múltiplos)
    const companyCodes: Record<string, string[]> = {};
    for (const mapping of allMappings || []) {
      const code = uuidToCode[mapping.external_company_id];
      if (code) {
        if (!companyCodes[mapping.company_id]) {
          companyCodes[mapping.company_id] = [];
        }
        if (!companyCodes[mapping.company_id].includes(code)) {
          companyCodes[mapping.company_id].push(code);
        }
      }
    }

    // 4. Buscar faturamento de todas usando a MATERIALIZED VIEW
    // Coletar todos os códigos únicos
    const allCodes = [...new Set(Object.values(companyCodes).flat())];
    let revenueByCode: Record<string, number> = {};
    
    if (allCodes.length > 0) {
      const { data: allRevenue } = await supabaseAdmin
        .from('mv_company_cash_flow_summary')
        .select('external_company_id, total_amount')
        .eq('company_group_id', groupId)
        .in('external_company_id', allCodes)
        .eq('year', yearNum)
        .eq('month', monthNum);

      if (allRevenue) {
        for (const rev of allRevenue) {
          revenueByCode[rev.external_company_id] = rev.total_amount || 0;
        }
      }
    }

    // 5. Buscar metas de faturamento de todas as empresas
    const { data: revenueGoals } = await supabaseAdmin
      .from('sales_goals')
      .select('company_id, goal_value')
      .eq('company_group_id', groupId)
      .in('company_id', companies.map(c => c.id))
      .eq('goal_type', 'company_revenue')
      .eq('year', yearNum)
      .eq('month', monthNum)
      .eq('is_active', true);

    // Mapear company_id -> meta de faturamento
    const revenueGoalByCompany: Record<string, number> = {};
    for (const goal of revenueGoals || []) {
      revenueGoalByCompany[goal.company_id] = (revenueGoalByCompany[goal.company_id] || 0) + goal.goal_value;
    }

    // 6. Buscar metas por turno de todas as empresas
    const { data: shiftGoals } = await supabaseAdmin
      .from('sales_goals')
      .select('company_id, shift_id, goal_value')
      .eq('company_group_id', groupId)
      .in('company_id', companies.map(c => c.id))
      .eq('goal_type', 'shift')
      .eq('year', yearNum)
      .eq('month', monthNum)
      .eq('is_active', true);

    // Agrupar metas de turno por empresa
    const shiftGoalsByCompany: Record<string, { total: number; achieved: number }> = {};
    
    for (const goal of shiftGoals || []) {
      if (!shiftGoalsByCompany[goal.company_id]) {
        shiftGoalsByCompany[goal.company_id] = { total: 0, achieved: 0 };
      }
      shiftGoalsByCompany[goal.company_id].total++;
      
      // Por enquanto, considerar que se a empresa bateu a meta de faturamento, 
      // provavelmente bateu as metas de turno também (simplificado)
      const codes = companyCodes[goal.company_id] || [];
      const companyRevenue = codes.reduce((sum, code) => sum + (revenueByCode[code] || 0), 0);
      const companyGoal = revenueGoalByCompany[goal.company_id] || 0;
      if (companyGoal > 0 && companyRevenue >= companyGoal) {
        shiftGoalsByCompany[goal.company_id].achieved++;
      }
    }

    // 7. Buscar metas por modo de venda de todas as empresas
    const { data: saleModeGoals } = await supabaseAdmin
      .from('sales_goals')
      .select('company_id, sale_mode_id, goal_value')
      .eq('company_group_id', groupId)
      .in('company_id', companies.map(c => c.id))
      .eq('goal_type', 'sale_mode')
      .eq('year', yearNum)
      .eq('month', monthNum)
      .eq('is_active', true);

    // Agrupar metas de modo de venda por empresa
    const saleModeGoalsByCompany: Record<string, { total: number; achieved: number }> = {};
    
    for (const goal of saleModeGoals || []) {
      if (!saleModeGoalsByCompany[goal.company_id]) {
        saleModeGoalsByCompany[goal.company_id] = { total: 0, achieved: 0 };
      }
      saleModeGoalsByCompany[goal.company_id].total++;
      
      // Similar ao turno, usar lógica simplificada
      const codes = companyCodes[goal.company_id] || [];
      const companyRevenue = codes.reduce((sum, code) => sum + (revenueByCode[code] || 0), 0);
      const companyGoal = revenueGoalByCompany[goal.company_id] || 0;
      if (companyGoal > 0 && companyRevenue >= companyGoal) {
        saleModeGoalsByCompany[goal.company_id].achieved++;
      }
    }

    // 8. Montar dados das empresas
    const companiesData = companies.map(company => {
      // Somar faturamento de todas as empresas externas vinculadas
      const codes = companyCodes[company.id] || [];
      const totalRevenue = codes.reduce((sum, code) => {
        return sum + (revenueByCode[code] || 0);
      }, 0);
      
      const revenueGoal = revenueGoalByCompany[company.id] || 0;
      const revenueProgress = revenueGoal > 0 ? (totalRevenue / revenueGoal) * 100 : 0;
      const revenueStatus = revenueProgress >= 100 ? 'achieved' : revenueProgress >= 70 ? 'ontrack' : 'behind';

      const shiftGoalsInfo = shiftGoalsByCompany[company.id] || { total: 0, achieved: 0 };
      const saleModeGoalsInfo = saleModeGoalsByCompany[company.id] || { total: 0, achieved: 0 };

      return {
        id: company.id,
        name: company.name,
        revenue: {
          goal: revenueGoal,
          realized: Math.round(totalRevenue * 100) / 100,
          progress: Math.round(revenueProgress * 10) / 10,
          status: revenueStatus
        },
        shifts: {
          total: shiftGoalsInfo.total,
          achieved: shiftGoalsInfo.achieved,
          progress: shiftGoalsInfo.total > 0 
            ? Math.round((shiftGoalsInfo.achieved / shiftGoalsInfo.total) * 100) 
            : 0
        },
        saleModes: {
          total: saleModeGoalsInfo.total,
          achieved: saleModeGoalsInfo.achieved,
          progress: saleModeGoalsInfo.total > 0 
            ? Math.round((saleModeGoalsInfo.achieved / saleModeGoalsInfo.total) * 100) 
            : 0
        }
      };
    });

    // Ordenar por faturamento realizado (decrescente)
    companiesData.sort((a, b) => b.revenue.realized - a.revenue.realized);

    // Adicionar ranking
    const companiesWithRanking = companiesData.map((company, index) => ({
      ...company,
      ranking: index + 1
    }));

    // 9. Calcular resumo
    const summary = {
      total: companies.length,
      achievedRevenue: companiesData.filter(c => c.revenue.status === 'achieved').length,
      onTrackRevenue: companiesData.filter(c => c.revenue.status === 'ontrack').length,
      behindRevenue: companiesData.filter(c => c.revenue.status === 'behind').length,
      totalRevenueGoal: Object.values(revenueGoalByCompany).reduce((a, b) => a + b, 0),
      totalRevenueRealized: companiesData.reduce((sum, c) => sum + c.revenue.realized, 0),
      totalShiftGoals: (shiftGoals || []).length,
      totalShiftsAchieved: Object.values(shiftGoalsByCompany).reduce((sum, s) => sum + s.achieved, 0),
      totalSaleModeGoals: (saleModeGoals || []).length,
      totalSaleModesAchieved: Object.values(saleModeGoalsByCompany).reduce((sum, s) => sum + s.achieved, 0)
    };

    console.log('Resumo:', summary);
    console.log('==========================================\n');

    return NextResponse.json({
      period: { year: yearNum, month: monthNum },
      companies: companiesWithRanking,
      summary
    });

  } catch (error) {
    console.error('Erro na API de dashboard de empresas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
