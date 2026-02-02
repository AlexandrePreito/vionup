import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const groupId = searchParams.get('group_id');

    if (!companyId || !year || !month) {
      return NextResponse.json(
        { error: 'company_id, year e month são obrigatórios' },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    console.log('\n========== DASHBOARD EQUIPE ==========');
    console.log('Filial:', companyId, 'Ano:', yearNum, 'Mês:', monthNum);

    // 1. Buscar empresa para obter company_group_id
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id, name, company_group_id')
      .eq('id', companyId)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const companyGroupId = groupId || company.company_group_id;

    // 2. Buscar todos os funcionários ativos da filial
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id, name, code, position, photo_url')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');

    if (!employees || employees.length === 0) {
      return NextResponse.json({ 
        company: { id: company.id, name: company.name },
        employees: [],
        summary: { total: 0, achievedRevenue: 0, achievedProducts: 0 }
      });
    }

    console.log('Funcionários encontrados:', employees.length);

    // 3. Buscar mapeamentos de todos os funcionários
    const { data: allMappings } = await supabaseAdmin
      .from('employee_mappings')
      .select('employee_id, external_employee_id')
      .in('employee_id', employees.map((e: any) => e.id))
      .eq('company_group_id', companyGroupId);

    // 4. Buscar códigos externos
    const externalUuids = allMappings?.map((m: any) => m.external_employee_id) || [];
    let uuidToCode: Record<string, string> = {};
    
    if (externalUuids.length > 0) {
      const { data: externalEmployees } = await supabaseAdmin
        .from('external_employees')
        .select('id, external_id')
        .in('id', externalUuids);

      if (externalEmployees) {
        for (const ee of externalEmployees) {
          uuidToCode[ee.id] = ee.external_id;
        }
      }
    }

    // Mapear employee_id -> códigos externos
    const employeeCodes: Record<string, string[]> = {};
    for (const mapping of allMappings || []) {
      const code = uuidToCode[mapping.external_employee_id];
      if (code) {
        if (!employeeCodes[mapping.employee_id]) {
          employeeCodes[mapping.employee_id] = [];
        }
        employeeCodes[mapping.employee_id].push(code);
      }
    }

    // 5. Buscar vendas de todos usando a MATERIALIZED VIEW
    const allCodes = Object.values(employeeCodes).flat();
    let salesByCode: Record<string, number> = {};
    
    if (allCodes.length > 0) {
      const { data: allSales } = await supabaseAdmin
        .from('mv_employee_sales_summary')
        .select('external_employee_id, total_revenue')
        .eq('company_group_id', companyGroupId)
        .in('external_employee_id', allCodes)
        .eq('year', yearNum)
        .eq('month', monthNum);

      if (allSales) {
        for (const sale of allSales) {
          salesByCode[sale.external_employee_id] = sale.total_revenue || 0;
        }
      }
    }

    // 6. Buscar metas de faturamento de todos os funcionários
    const { data: revenueGoals } = await supabaseAdmin
      .from('sales_goals')
      .select('employee_id, goal_value')
      .eq('company_group_id', companyGroupId)
      .in('employee_id', employees.map((e: any) => e.id))
      .eq('goal_type', 'employee_revenue')
      .eq('year', yearNum)
      .eq('month', monthNum)
      .eq('is_active', true);

    // Mapear employee_id -> meta de faturamento
    const revenueGoalByEmployee: Record<string, number> = {};
    for (const goal of revenueGoals || []) {
      revenueGoalByEmployee[goal.employee_id] = (revenueGoalByEmployee[goal.employee_id] || 0) + goal.goal_value;
    }

    // 7. Buscar metas de produtos de todos os funcionários
    const { data: productGoals } = await supabaseAdmin
      .from('sales_goals')
      .select('id, employee_id, product_id, goal_value')
      .eq('company_group_id', companyGroupId)
      .in('employee_id', employees.map((e: any) => e.id))
      .eq('goal_type', 'employee_product')
      .eq('year', yearNum)
      .eq('month', monthNum)
      .eq('is_active', true);

    // Agrupar metas de produtos por funcionário
    const productGoalsByEmployee: Record<string, { total: number; achieved: number }> = {};
    
    // Buscar vendas por produto para calcular realizado
    let productSalesByCode: Record<string, Record<string, number>> = {};
    
    if (allCodes.length > 0) {
      const { data: productSales } = await supabaseAdmin
        .from('mv_employee_product_sales')
        .select('external_employee_id, external_product_id, total_quantity')
        .eq('company_group_id', companyGroupId)
        .in('external_employee_id', allCodes)
        .eq('year', yearNum)
        .eq('month', monthNum);

      if (productSales) {
        for (const ps of productSales) {
          if (!productSalesByCode[ps.external_employee_id]) {
            productSalesByCode[ps.external_employee_id] = {};
          }
          productSalesByCode[ps.external_employee_id][ps.external_product_id] = ps.total_quantity || 0;
        }
      }
    }

    // Buscar mapeamentos de produtos
    const productIds = [...new Set((productGoals || []).map((g: any) => g.product_id).filter(Boolean))];
    let productIdToExternalCodes: Record<string, string[]> = {};
    
    if (productIds.length > 0) {
      const { data: productMappings } = await supabaseAdmin
        .from('product_mappings')
        .select('product_id, external_product_id')
        .in('product_id', productIds)
        .eq('company_group_id', companyGroupId);

      if (productMappings) {
        const externalProductUuids = productMappings.map((pm: any) => pm.external_product_id);
        const { data: externalProducts } = await supabaseAdmin
          .from('external_products')
          .select('id, external_id')
          .in('id', externalProductUuids);

        const productUuidToCode: Record<string, string> = {};
        if (externalProducts) {
          for (const ep of externalProducts) {
            productUuidToCode[ep.id] = ep.external_id;
          }
        }

        for (const pm of productMappings) {
          const code = productUuidToCode[pm.external_product_id];
          if (code) {
            if (!productIdToExternalCodes[pm.product_id]) {
              productIdToExternalCodes[pm.product_id] = [];
            }
            productIdToExternalCodes[pm.product_id].push(code);
          }
        }
      }
    }

    // Calcular metas de produtos atingidas por funcionário
    for (const goal of productGoals || []) {
      if (!productGoalsByEmployee[goal.employee_id]) {
        productGoalsByEmployee[goal.employee_id] = { total: 0, achieved: 0 };
      }
      productGoalsByEmployee[goal.employee_id].total++;

      // Calcular realizado para esta meta
      const codes = employeeCodes[goal.employee_id] || [];
      const productExternalCodes = productIdToExternalCodes[goal.product_id] || [];
      
      let realized = 0;
      for (const empCode of codes) {
        const empProductSales = productSalesByCode[empCode] || {};
        for (const prodCode of productExternalCodes) {
          realized += empProductSales[prodCode] || 0;
        }
      }

      if (realized >= goal.goal_value) {
        productGoalsByEmployee[goal.employee_id].achieved++;
      }
    }

    // 8. Montar dados dos funcionários
    const employeesData = employees.map((emp: any) => {
      const codes = employeeCodes[emp.id] || [];
      let totalRevenue = 0;
      for (const code of codes) {
        totalRevenue += salesByCode[code] || 0;
      }

      const revenueGoal = revenueGoalByEmployee[emp.id] || 0;
      const revenueProgress = revenueGoal > 0 ? (totalRevenue / revenueGoal) * 100 : 0;
      const revenueStatus = revenueProgress >= 100 ? 'achieved' : revenueProgress >= 70 ? 'ontrack' : 'behind';

      const productGoalsInfo = productGoalsByEmployee[emp.id] || { total: 0, achieved: 0 };

      return {
        id: emp.id,
        name: emp.name,
        code: emp.code,
        position: emp.position,
        photoUrl: emp.photo_url,
        revenue: {
          goal: revenueGoal,
          realized: Math.round(totalRevenue * 100) / 100,
          progress: Math.round(revenueProgress * 10) / 10,
          status: revenueStatus
        },
        products: {
          total: productGoalsInfo.total,
          achieved: productGoalsInfo.achieved,
          progress: productGoalsInfo.total > 0 
            ? Math.round((productGoalsInfo.achieved / productGoalsInfo.total) * 100) 
            : 0
        }
      };
    });

    // Ordenar por faturamento realizado (decrescente)
    employeesData.sort((a, b) => b.revenue.realized - a.revenue.realized);

    // Adicionar ranking
    const employeesWithRanking = employeesData.map((emp: any, index: number) => ({
      ...emp,
      ranking: index + 1
    }));

    // 9. Calcular resumo
    const summary = {
      total: employees.length,
      achievedRevenue: employeesData.filter((e: any) => e.revenue.status === 'achieved').length,
      onTrackRevenue: employeesData.filter((e: any) => e.revenue.status === 'ontrack').length,
      behindRevenue: employeesData.filter((e: any) => e.revenue.status === 'behind').length,
      totalRevenueGoal: Object.values(revenueGoalByEmployee).reduce((a: number, b: number) => a + b, 0),
      totalRevenueRealized: employeesData.reduce((sum: number, e: any) => sum + e.revenue.realized, 0),
      totalProductGoals: (productGoals || []).length,
      totalProductsAchieved: Object.values(productGoalsByEmployee).reduce((sum: number, p: any) => sum + p.achieved, 0)
    };

    console.log('Resumo:', summary);
    console.log('==========================================\n');

    return NextResponse.json({
      company: { id: company.id, name: company.name },
      period: { year: yearNum, month: monthNum },
      employees: employeesWithRanking,
      summary
    });

  } catch (error) {
    console.error('Erro na API de dashboard da equipe:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
