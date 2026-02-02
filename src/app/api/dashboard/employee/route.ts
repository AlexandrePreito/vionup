import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const groupId = searchParams.get('group_id');

    if (!employeeId || !year || !month) {
      return NextResponse.json(
        { error: 'employee_id, year e month são obrigatórios' },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    console.log('\n========== DASHBOARD FUNCIONÁRIO (OTIMIZADO) ==========');
    console.log('Employee ID:', employeeId, 'Ano:', yearNum, 'Mês:', monthNum);

    // 1. Buscar dados do funcionário
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select(`
        id,
        name,
        code,
        email,
        phone,
        position,
        photo_url,
        is_active,
        company:companies (
          id,
          name,
          company_group_id
        )
      `)
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      console.error('Erro ao buscar funcionário:', employeeError);
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      );
    }

    const companyGroupId = groupId || (employee.company as any)?.company_group_id;
    const companyId = (employee.company as any)?.id;

    if (!companyGroupId) {
      return NextResponse.json(
        { error: 'Grupo da empresa não encontrado' },
        { status: 400 }
      );
    }

    // 2. Buscar códigos externos do funcionário
    const { data: mappings } = await supabaseAdmin
      .from('employee_mappings')
      .select('external_employee_id')
      .eq('employee_id', employeeId)
      .eq('company_group_id', companyGroupId);

    const mappedExternalEmployeeUuids = mappings?.map(m => m.external_employee_id) || [];

    let externalEmployeeCodes: string[] = [];
    if (mappedExternalEmployeeUuids.length > 0) {
      const { data: externalEmployees } = await supabaseAdmin
        .from('external_employees')
        .select('id, external_id, name')
        .in('id', mappedExternalEmployeeUuids);
      
      externalEmployeeCodes = externalEmployees?.map(e => e.external_id) || [];
    }

    console.log('Códigos externos:', externalEmployeeCodes);

    // 3. Buscar faturamento usando a MATERIALIZED VIEW otimizada
    let totalRevenue = 0;
    
    if (externalEmployeeCodes.length > 0) {
      const { data: salesSummary, error: salesError } = await supabaseAdmin
        .from('mv_employee_sales_summary')
        .select('total_revenue, total_quantity, total_sales')
        .eq('company_group_id', companyGroupId)
        .in('external_employee_id', externalEmployeeCodes)
        .eq('year', yearNum)
        .eq('month', monthNum);

      if (salesError) {
        console.error('Erro ao buscar vendas da materialized view:', salesError);
      } else if (salesSummary && salesSummary.length > 0) {
        totalRevenue = salesSummary.reduce((sum: number, s: any) => sum + (s.total_revenue || 0), 0);
        console.log('Faturamento total (via MATERIALIZED VIEW):', totalRevenue);
      }
    }

    // 4. Buscar metas de faturamento
    const { data: revenueGoals } = await supabaseAdmin
      .from('sales_goals')
      .select('*')
      .eq('company_group_id', companyGroupId)
      .eq('employee_id', employeeId)
      .eq('goal_type', 'employee_revenue')
      .eq('year', yearNum)
      .eq('month', monthNum)
      .eq('is_active', true);

    // 5. Buscar metas de produtos
    const { data: productGoals } = await supabaseAdmin
      .from('sales_goals')
      .select('*')
      .eq('company_group_id', companyGroupId)
      .eq('employee_id', employeeId)
      .eq('goal_type', 'employee_product')
      .eq('year', yearNum)
      .eq('month', monthNum)
      .eq('is_active', true);

    // 6. Buscar vendas por produto usando a MATERIALIZED VIEW otimizada
    let salesByProduct: Record<string, { quantity: number; value: number }> = {};
    
    if (externalEmployeeCodes.length > 0) {
      const { data: productSales } = await supabaseAdmin
        .from('mv_employee_product_sales')
        .select('external_product_id, total_value, total_quantity')
        .eq('company_group_id', companyGroupId)
        .in('external_employee_id', externalEmployeeCodes)
        .eq('year', yearNum)
        .eq('month', monthNum);

      if (productSales) {
        for (const ps of productSales) {
          salesByProduct[ps.external_product_id] = {
            quantity: ps.total_quantity || 0,
            value: ps.total_value || 0
          };
        }
      }
    }

    // 7. Calcular ranking do funcionário (otimizado)
    let ranking = { position: 0, total: 0 };
    
    if (companyId) {
      // Buscar todos os funcionários ativos da empresa e seus códigos externos
      const { data: companyEmployees } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (companyEmployees && companyEmployees.length > 0) {
        // Buscar mapeamentos de todos os funcionários
        const { data: allMappings } = await supabaseAdmin
          .from('employee_mappings')
          .select('employee_id, external_employee_id')
          .in('employee_id', companyEmployees.map(e => e.id))
          .eq('company_group_id', companyGroupId);

        if (allMappings && allMappings.length > 0) {
          // Buscar códigos externos
          const { data: allExternalEmployees } = await supabaseAdmin
            .from('external_employees')
            .select('id, external_id')
            .in('id', allMappings.map(m => m.external_employee_id));

          // Mapear UUID -> código externo
          const uuidToCode: Record<string, string> = {};
          if (allExternalEmployees) {
            for (const ee of allExternalEmployees) {
              uuidToCode[ee.id] = ee.external_id;
            }
          }

          // Mapear employee_id -> códigos externos
          const employeeCodes: Record<string, string[]> = {};
          for (const mapping of allMappings) {
            const code = uuidToCode[mapping.external_employee_id];
            if (code) {
              if (!employeeCodes[mapping.employee_id]) {
                employeeCodes[mapping.employee_id] = [];
              }
              employeeCodes[mapping.employee_id].push(code);
            }
          }

          // Buscar vendas de todos usando a MATERIALIZED VIEW
          const allCodes = Object.values(employeeCodes).flat();
          if (allCodes.length > 0) {
            const { data: allSales } = await supabaseAdmin
              .from('mv_employee_sales_summary')
              .select('external_employee_id, total_revenue')
              .eq('company_group_id', companyGroupId)
              .in('external_employee_id', allCodes)
              .eq('year', yearNum)
              .eq('month', monthNum);

            // Agrupar por funcionário interno
            const employeeSales: { employeeId: string; total: number }[] = [];
            
            for (const emp of companyEmployees) {
              const codes = employeeCodes[emp.id] || [];
              let total = 0;
              
              if (allSales) {
                for (const sale of allSales) {
                  if (codes.includes(sale.external_employee_id)) {
                    total += sale.total_revenue || 0;
                  }
                }
              }
              
              employeeSales.push({ employeeId: emp.id, total });
            }

            // Ordenar e encontrar posição
            employeeSales.sort((a, b) => b.total - a.total);
            const position = employeeSales.findIndex(e => e.employeeId === employeeId) + 1;
            ranking = { position, total: employeeSales.length };
          }
        }
      }
    }

    console.log('Ranking:', ranking);

    // 8. Mapear metas de produtos com realizado
    const productGoalsWithRealized = await Promise.all(
      (productGoals || []).map(async (goal: any) => {
        let realized = 0;
        let productName = 'Produto';

        // Buscar nome do produto
        if (goal.product_id) {
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('name')
            .eq('id', goal.product_id)
            .single();
          
          if (product) productName = product.name;

          // Buscar mapeamento do produto
          const { data: productMappings } = await supabaseAdmin
            .from('product_mappings')
            .select('external_product_id')
            .eq('product_id', goal.product_id)
            .eq('company_group_id', companyGroupId);

          if (productMappings && productMappings.length > 0) {
            const { data: externalProducts } = await supabaseAdmin
              .from('external_products')
              .select('external_id')
              .in('id', productMappings.map(pm => pm.external_product_id));

            const externalProductCodes = externalProducts?.map(ep => ep.external_id) || [];
            
            for (const code of externalProductCodes) {
              if (salesByProduct[code]) {
                realized += salesByProduct[code].quantity;
              }
            }
          }
        }

        const progress = goal.goal_value > 0 ? (realized / goal.goal_value) * 100 : 0;

        return {
          id: goal.id,
          productId: goal.product_id,
          productName,
          goalValue: goal.goal_value,
          goalUnit: goal.goal_unit,
          realized,
          progress: Math.round(progress * 10) / 10,
          status: progress >= 100 ? 'achieved' : progress >= 70 ? 'ontrack' : 'behind'
        };
      })
    );

    // 9. Calcular meta de faturamento consolidada
    const revenueGoal = revenueGoals && revenueGoals.length > 0 
      ? revenueGoals.reduce((sum: number, g: any) => sum + (g.goal_value || 0), 0)
      : 0;

    const revenueProgress = revenueGoal > 0 ? (totalRevenue / revenueGoal) * 100 : 0;

    // 10. Calcular tendência baseada em dias úteis vs finais de semana/feriados
    // Feriados nacionais brasileiros 2026 (tratar como sábados)
    const holidays2026 = [
      '2026-01-01', // Ano Novo
      '2026-02-16', // Carnaval
      '2026-02-17', // Carnaval
      '2026-04-03', // Sexta-feira Santa
      '2026-04-21', // Tiradentes
      '2026-05-01', // Dia do Trabalho
      '2026-06-04', // Corpus Christi
      '2026-09-07', // Independência
      '2026-10-12', // Nossa Senhora Aparecida
      '2026-11-02', // Finados
      '2026-11-15', // Proclamação da República
      '2026-12-25', // Natal
    ];

    // Função para verificar se é final de semana ou feriado
    const isWeekendOrHoliday = (date: Date): boolean => {
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];
      return dayOfWeek === 0 || dayOfWeek === 6 || holidays2026.includes(dateStr);
    };

    // Buscar vendas diárias para calcular médias separadas
    let tendency = {
      projectedTotal: 0,
      willMeetGoal: false,
      avgWeekday: 0,
      avgWeekend: 0,
      remainingDays: 0,
      remainingWeekdays: 0,
      remainingWeekends: 0,
      confidence: 'low' as 'low' | 'medium' | 'high'
    };

    if (externalEmployeeCodes.length > 0 && revenueGoal > 0) {
      // Buscar vendas diárias do funcionário no mês
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0);
      const today = new Date();
      const currentDay = today.getFullYear() === yearNum && today.getMonth() + 1 === monthNum 
        ? today.getDate() 
        : endDate.getDate();

      const { data: dailySales } = await supabaseAdmin
        .from('external_sales')
        .select('sale_date, total_value')
        .eq('company_group_id', companyGroupId)
        .in('external_employee_id', externalEmployeeCodes)
        .gte('sale_date', startDate.toISOString().split('T')[0])
        .lte('sale_date', endDate.toISOString().split('T')[0])
        .limit(50000);

      if (dailySales && dailySales.length > 0) {
        // Agrupar vendas por dia
        const salesByDay: Record<string, number> = {};
        for (const sale of dailySales) {
          const day = sale.sale_date;
          salesByDay[day] = (salesByDay[day] || 0) + (sale.total_value || 0);
        }

        // Separar dias úteis de finais de semana/feriados
        let weekdayTotal = 0;
        let weekdayCount = 0;
        let weekendTotal = 0;
        let weekendCount = 0;

        for (const [dateStr, value] of Object.entries(salesByDay)) {
          const date = new Date(dateStr + 'T12:00:00');
          if (isWeekendOrHoliday(date)) {
            weekendTotal += value;
            weekendCount++;
          } else {
            weekdayTotal += value;
            weekdayCount++;
          }
        }

        // Calcular médias
        const avgWeekday = weekdayCount > 0 ? weekdayTotal / weekdayCount : 0;
        const avgWeekend = weekendCount > 0 ? weekendTotal / weekendCount : avgWeekday * 0.7; // Estimar 70% se não tiver dados

        // Contar dias restantes no mês
        let remainingWeekdays = 0;
        let remainingWeekends = 0;
        
        for (let d = currentDay + 1; d <= endDate.getDate(); d++) {
          const date = new Date(yearNum, monthNum - 1, d);
          if (isWeekendOrHoliday(date)) {
            remainingWeekends++;
          } else {
            remainingWeekdays++;
          }
        }

        // Projetar faturamento restante
        const projectedRemaining = (avgWeekday * remainingWeekdays) + (avgWeekend * remainingWeekends);
        const projectedTotal = totalRevenue + projectedRemaining;
        
        // Determinar confiança baseado na quantidade de dados
        const totalDaysWithData = weekdayCount + weekendCount;
        const confidence = totalDaysWithData >= 15 ? 'high' : totalDaysWithData >= 7 ? 'medium' : 'low';

        tendency = {
          projectedTotal: Math.round(projectedTotal * 100) / 100,
          willMeetGoal: projectedTotal >= revenueGoal,
          avgWeekday: Math.round(avgWeekday * 100) / 100,
          avgWeekend: Math.round(avgWeekend * 100) / 100,
          remainingDays: remainingWeekdays + remainingWeekends,
          remainingWeekdays,
          remainingWeekends,
          confidence
        };
      }
    }

    // 12. Montar resposta
    const response = {
      employee: {
        id: employee.id,
        name: employee.name,
        code: employee.code,
        position: employee.position,
        photoUrl: employee.photo_url,
        company: employee.company
      },
      ranking,
      period: {
        year: yearNum,
        month: monthNum
      },
      revenue: {
        goal: revenueGoal,
        realized: Math.round(totalRevenue * 100) / 100,
        progress: Math.round(revenueProgress * 10) / 10,
        status: revenueProgress >= 100 ? 'achieved' : revenueProgress >= 70 ? 'ontrack' : 'behind'
      },
      tendency,
      products: productGoalsWithRealized,
      summary: {
        totalProductGoals: productGoalsWithRealized.length,
        productsAchieved: productGoalsWithRealized.filter(p => p.status === 'achieved').length,
        productsOnTrack: productGoalsWithRealized.filter(p => p.status === 'ontrack').length,
        productsBehind: productGoalsWithRealized.filter(p => p.status === 'behind').length
      }
    };

    console.log('Resposta gerada com sucesso!');
    console.log('=================================================\n');

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro na API de dashboard do funcionário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
