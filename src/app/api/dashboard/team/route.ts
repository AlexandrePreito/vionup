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

    // 5. Faturamento realizado: mesmo critério do dashboard funcionário (external_sales, sale_uuid not null, ordem sale_date + sale_uuid, só códigos)
    const allCodes = Object.values(employeeCodes).flat();
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = new Date(yearNum, monthNum, 0).toISOString().split('T')[0];

    let salesByCode: Record<string, number> = {};
    const pageSize = 1000;

    console.log('=================================================');
    console.log('🔍 BUSCANDO VENDAS DA EQUIPE (external_sales)');
    console.log(`📅 Período: ${startDate} a ${endDate}`);
    console.log(`🏢 Company Group ID: ${companyGroupId}`);
    console.log(`👥 Total de códigos externos: ${allCodes.length}`);
    console.log(`📊 Códigos:`, allCodes);
    console.log('=================================================');

    if (allCodes.length > 0) {
      // Primeiro, contar quantos registros existem (mesma lógica do employee dashboard)
      const { count: totalCount } = await supabaseAdmin
        .from('external_sales')
        .select('*', { count: 'exact', head: true })
        .eq('company_group_id', companyGroupId)
        .in('external_employee_id', allCodes)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)
        .not('sale_uuid', 'is', null);

      const totalExpected = totalCount || 0;
      console.log(`📊 Total de registros esperados (count): ${totalExpected}`);

      const allSalesRows: any[] = [];
      let page = 0;
      let hasMore = true;
      const maxPages = 100;
      
      while (hasMore && page < maxPages) {
        const from = page * pageSize;
        const to = (page + 1) * pageSize - 1;
        
        console.log(`📄 Buscando página ${page + 1} (range: ${from} a ${to})...`);
        
        const { data: salesRows, error: salesError } = await supabaseAdmin
          .from('external_sales')
          .select('external_employee_id, total_value, sale_uuid')
          .eq('company_group_id', companyGroupId)
          .in('external_employee_id', allCodes)
          .gte('sale_date', startDate)
          .lte('sale_date', endDate)
          .not('sale_uuid', 'is', null)
          .order('sale_date', { ascending: true })
          .order('sale_uuid', { ascending: true })
          .range(from, to);

        if (salesError) {
          console.error('❌ Erro ao buscar vendas:', salesError);
          hasMore = false;
        } else if (salesRows && salesRows.length > 0) {
          allSalesRows.push(...salesRows);
          console.log(`✅ Página ${page + 1}: ${salesRows.length} registros (total acumulado: ${allSalesRows.length} de ${totalExpected})`);
          
          if (allSalesRows.length >= totalExpected) {
            console.log(`✅ Todos os ${totalExpected} registros foram buscados!`);
            hasMore = false;
          } else {
            page++;
          }
        } else {
          console.log(`✅ Página ${page + 1}: vazia - busca concluída`);
          hasMore = false;
        }
      }

      if (page >= maxPages) {
        console.warn(`⚠️ Atingido limite máximo de ${maxPages} páginas! Registros buscados: ${allSalesRows.length} de ${totalExpected}`);
      }
      
      // Somar faturamento por código
      for (const row of allSalesRows) {
        const code = String(row.external_employee_id ?? '').trim();
        if (!salesByCode[code]) salesByCode[code] = 0;
        salesByCode[code] += Number(row.total_value) || 0;
      }
      
      console.log(`✅ Total de registros processados: ${allSalesRows.length}`);
      console.log(`💰 Vendas por código:`, salesByCode);
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
    
    // Buscar vendas por produto usando MESMA lógica do dashboard funcionário (mv_employee_product_sales)
    let productSalesByCode: Record<string, Record<string, number>> = {};
    
    console.log('\n========== BUSCANDO VENDAS POR PRODUTO (EQUIPE) ==========');
    console.log(`Total de códigos de funcionários: ${allCodes.length}`);
    console.log(`Códigos:`, allCodes);
    
    if (allCodes.length > 0) {
      // Buscar da materialized view (mesmo que employee dashboard)
      const { data: productSales } = await supabaseAdmin
        .from('mv_employee_product_sales')
        .select('external_employee_id, external_product_id, total_quantity')
        .eq('company_group_id', companyGroupId)
        .in('external_employee_id', allCodes)
        .eq('year', yearNum)
        .eq('month', monthNum);

      console.log(`View mv_employee_product_sales retornou: ${productSales?.length || 0} registros`);
      
      if (productSales && productSales.length > 0) {
        console.log('Primeiros 5 registros da view:');
        productSales.slice(0, 5).forEach((ps: any) => {
          console.log(`  - Emp: ${ps.external_employee_id}, Prod: ${ps.external_product_id}, Qty: ${ps.total_quantity}`);
        });
        
        for (const ps of productSales) {
          const empKey = String(ps.external_employee_id ?? '').trim();
          const prodKey = String(ps.external_product_id ?? '').trim();
          if (!productSalesByCode[empKey]) productSalesByCode[empKey] = {};
          productSalesByCode[empKey][prodKey] = (productSalesByCode[empKey][prodKey] || 0) + (ps.total_quantity || 0);
        }
      } else {
        // Fallback SOMENTE se a view não retornou nada (view pode estar desatualizada)
        console.log('⚠️ View vazia, buscando fallback de external_sales...');
        let prodPage = 0;
        let prodHasMore = true;
        while (prodHasMore) {
          const pFrom = prodPage * pageSize;
          const pTo = pFrom + pageSize - 1;
          const { data: productRows } = await supabaseAdmin
            .from('external_sales')
            .select('external_employee_id, external_product_id, quantity')
            .eq('company_group_id', companyGroupId)
            .in('external_employee_id', allCodes)
            .gte('sale_date', startDate)
            .lte('sale_date', endDate)
            .order('sale_date', { ascending: true })
            .range(pFrom, pTo);

          if (productRows && productRows.length > 0) {
            for (const row of productRows) {
              const empKey = String(row.external_employee_id ?? '').trim();
              const prodKey = String(row.external_product_id ?? '').trim();
              if (!productSalesByCode[empKey]) productSalesByCode[empKey] = {};
              productSalesByCode[empKey][prodKey] = (productSalesByCode[empKey][prodKey] || 0) + (Number(row.quantity) || 0);
            }
          }
          prodHasMore = productRows && productRows.length === pageSize;
          prodPage++;
          if (prodPage > 100) prodHasMore = false;
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

    // Calcular metas de produtos atingidas por funcionário (mesma lógica do employee dashboard)
    for (const goal of productGoals || []) {
      if (!productGoalsByEmployee[goal.employee_id]) {
        productGoalsByEmployee[goal.employee_id] = { total: 0, achieved: 0 };
      }
      productGoalsByEmployee[goal.employee_id].total++;

      const codes = employeeCodes[goal.employee_id] || [];
      const externalCodes = productIdToExternalCodes[goal.product_id] || [];

      let realized = 0;

      for (const empCode of codes) {
        const empProductSales = productSalesByCode[empCode] || {};
        for (const prodCode of externalCodes) {
          realized += empProductSales[prodCode] || 0;
        }
      }

      console.log(`Meta produto - Funcionário: ${goal.employee_id}, Produto: ${goal.product_id}, Códigos produto: ${externalCodes}, Realizado: ${realized}, Meta: ${goal.goal_value}`);

      if (realized >= goal.goal_value) {
        productGoalsByEmployee[goal.employee_id].achieved++;
      }
    }

    // 7b. Metas de pesquisa (research_quantity_employee) para o mês/ano selecionado + realizado (NPS no período)
    const employeeIds = employees.map((e: any) => e.id);
    const { data: researchGoals } = await supabaseAdmin
      .from('sales_goals')
      .select('employee_id, goal_value')
      .eq('company_group_id', companyGroupId)
      .in('employee_id', employeeIds)
      .eq('goal_type', 'research_quantity_employee')
      .eq('year', yearNum)
      .eq('month', monthNum)
      .eq('is_active', true);

    const researchGoalsByEmployee: Record<string, { total: number; achieved: number; goalValue: number; realized: number }> = {};
    employeeIds.forEach((id: string) => {
      researchGoalsByEmployee[id] = { total: 0, achieved: 0, goalValue: 0, realized: 0 };
    });

    // Realizado = respostas NPS no período (mês/ano selecionado), por funcionário da filial (com paginação)
    const researchRespostasStart = `${startDate}T00:00:00`;
    const researchRespostasEnd = `${endDate}T23:59:59`;
    const respostasCountByEmployee: Record<string, number> = {};
    let respPage = 0;
    let respHasMore = true;
    while (respHasMore) {
      const rFrom = respPage * pageSize;
      const rTo = rFrom + pageSize - 1;
      const { data: respostasRows } = await supabaseAdmin
        .from('nps_respostas')
        .select('employee_id')
        .in('employee_id', employeeIds)
        .gte('created_at', researchRespostasStart)
        .lte('created_at', researchRespostasEnd)
        .range(rFrom, rTo);
      (respostasRows || []).forEach((r: any) => {
        const eid = r.employee_id;
        if (eid) {
          respostasCountByEmployee[eid] = (respostasCountByEmployee[eid] || 0) + 1;
        }
      });
      respHasMore = respostasRows && respostasRows.length === pageSize;
      respPage++;
      if (respPage > 50) respHasMore = false;
    }

    for (const goal of researchGoals || []) {
      researchGoalsByEmployee[goal.employee_id].total++;
      researchGoalsByEmployee[goal.employee_id].goalValue += goal.goal_value || 0;
      const realized = respostasCountByEmployee[goal.employee_id] || 0;
      researchGoalsByEmployee[goal.employee_id].realized = realized;
      if (realized >= goal.goal_value) {
        researchGoalsByEmployee[goal.employee_id].achieved++;
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
      const researchGoalsInfo = researchGoalsByEmployee[emp.id] || { total: 0, achieved: 0, goalValue: 0, realized: 0 };
      const researchGoalValue = researchGoalsInfo.goalValue || 0;
      const researchRealized = researchGoalsInfo.realized ?? 0;
      const researchProgressPct = researchGoalValue > 0 ? Math.round((researchRealized / researchGoalValue) * 100) : 0;

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
        },
        research: {
          total: researchGoalsInfo.total,
          achieved: researchGoalsInfo.achieved,
          goalValue: researchGoalValue,
          realized: researchRealized,
          progress: researchProgressPct
        }
      };
    });

    // Ordenar por faturamento realizado (decrescente)
    employeesData.sort((a: any, b: any) => b.revenue.realized - a.revenue.realized);

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
      totalProductsAchieved: Object.values(productGoalsByEmployee).reduce((sum: number, p: any) => sum + p.achieved, 0),
      totalResearchGoals: (researchGoals || []).length,
      totalResearchAchieved: Object.values(researchGoalsByEmployee).reduce((sum: number, p: any) => sum + p.achieved, 0)
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