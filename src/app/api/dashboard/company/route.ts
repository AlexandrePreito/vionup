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

    console.log('\n========== DASHBOARD EMPRESA ==========');
    console.log('Empresa:', companyId, 'Ano:', yearNum, 'Mês:', monthNum, 'Grupo:', groupId);

    // 1. Buscar dados da empresa
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, company_group_id')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    const companyGroupId = groupId || company.company_group_id;

    // 2. Buscar meta de faturamento da empresa
    const { data: companyRevenueGoals } = await supabaseAdmin
      .from('sales_goals')
      .select('id, goal_value, goal_unit')
      .eq('company_group_id', companyGroupId)
      .eq('company_id', companyId)
      .eq('goal_type', 'company_revenue')
      .eq('year', yearNum)
      .eq('month', monthNum)
      .eq('is_active', true);

    const companyRevenueGoal = companyRevenueGoals && companyRevenueGoals.length > 0
      ? companyRevenueGoals.reduce((sum: number, g: any) => sum + (g.goal_value || 0), 0)
      : 0;

    // 3. Buscar faturamento realizado da empresa usando cash_flow (MATERIALIZED VIEW)
    let totalRevenue = 0;
    let distinctSalesCount = 0;
    let averageTicket = 0;
    
    // Buscar código externo da empresa (pode ter múltiplos)
    const { data: companyMappings, error: mappingsError } = await supabaseAdmin
      .from('company_mappings')
      .select('external_company_id')
      .eq('company_id', companyId)
      .eq('company_group_id', companyGroupId);

    if (mappingsError) {
      console.error('Erro ao buscar mapeamentos:', mappingsError);
    }

    console.log('Buscando mapeamentos da empresa...');
    if (companyMappings && companyMappings.length > 0) {
      console.log(`Encontrados ${companyMappings.length} mapeamento(s)`);
      // Buscar todos os códigos externos vinculados
      const externalCompanyIds = companyMappings.map((m: any) => m.external_company_id);
      const { data: externalCompanies, error: externalCompaniesError } = await supabaseAdmin
        .from('external_companies')
        .select('id, external_id')
        .in('id', externalCompanyIds);

      if (externalCompaniesError) {
        console.error('Erro ao buscar empresas externas:', externalCompaniesError);
      }

      if (externalCompanies && externalCompanies.length > 0) {
        console.log(`Encontradas ${externalCompanies.length} empresa(s) externa(s)`);
        const externalCodes = externalCompanies.map((ec: any) => ec.external_id);
        console.log('Códigos externos:', externalCodes);
        
        // Buscar faturamento total usando MATERIALIZED VIEW de cash_flow
        const { data: cashFlowSummaries, error: cashFlowError } = await supabaseAdmin
          .from('mv_company_cash_flow_summary')
          .select('total_amount')
          .eq('company_group_id', companyGroupId)
          .in('external_company_id', externalCodes)
          .eq('year', yearNum)
          .eq('month', monthNum);

        if (cashFlowError) {
          console.error('Erro ao buscar faturamento:', cashFlowError);
        }

        if (cashFlowSummaries) {
          totalRevenue = cashFlowSummaries.reduce((sum: number, cf: any) => sum + (cf.total_amount || 0), 0);
          console.log('Faturamento total:', totalRevenue);
        }

        // Buscar quantidade de vendas distintas (COUNT DISTINCT de external_id)
        try {
          const startDate = new Date(yearNum, monthNum - 1, 1);
          const endDate = new Date(yearNum, monthNum, 0);
          const startDateStr = startDate.toISOString().split('T')[0];
          const endDateStr = endDate.toISOString().split('T')[0];

          // Buscar external_ids únicos de forma mais eficiente
          // Limitar a busca para evitar timeout
          const { data: allSales, error: salesError } = await supabaseAdmin
            .from('external_cash_flow')
            .select('external_id')
            .eq('company_group_id', companyGroupId)
            .in('external_company_id', externalCodes)
            .gte('transaction_date', startDateStr)
            .lte('transaction_date', endDateStr)
            .limit(100000);

          if (salesError) {
            console.error('Erro ao buscar vendas distintas:', salesError);
            console.error('Detalhes do erro:', JSON.stringify(salesError, null, 2));
            // Continua com 0 se houver erro
            distinctSalesCount = 0;
          } else if (allSales && allSales.length > 0) {
            // Contar external_ids únicos
            const uniqueIds = new Set(allSales.map((s: any) => s.external_id));
            distinctSalesCount = uniqueIds.size;
            console.log(`Vendas distintas encontradas: ${distinctSalesCount} (de ${allSales.length} registros)`);
          } else {
            console.log('Nenhuma venda encontrada no período');
            distinctSalesCount = 0;
          }
        } catch (countError: any) {
          console.error('Erro ao contar vendas distintas:', countError);
          console.error('Stack:', countError?.stack);
          // Continua com 0 se houver erro
          distinctSalesCount = 0;
        }

        // Calcular ticket médio
        if (distinctSalesCount > 0) {
          averageTicket = totalRevenue / distinctSalesCount;
          console.log('Ticket médio calculado:', averageTicket);
        }
      } else {
        console.log('Nenhuma empresa externa encontrada para os mapeamentos');
      }
    } else {
      console.log('Nenhum mapeamento encontrado para a empresa');
    }

    const revenueProgress = companyRevenueGoal > 0 ? (totalRevenue / companyRevenueGoal) * 100 : 0;
    const revenueStatus = revenueProgress >= 100 ? 'achieved' : revenueProgress >= 70 ? 'ontrack' : 'behind';

    // 3.5. Calcular tendência baseada em dias úteis vs finais de semana/feriados
    const holidays2026 = [
      '2026-01-01', '2026-02-16', '2026-02-17', '2026-04-03', '2026-04-21',
      '2026-05-01', '2026-06-04', '2026-09-07', '2026-10-12', '2026-11-02',
      '2026-11-15', '2026-12-25',
    ];

    const isWeekendOrHoliday = (date: Date): boolean => {
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];
      return dayOfWeek === 0 || dayOfWeek === 6 || holidays2026.includes(dateStr);
    };

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

    if (companyRevenueGoal > 0 && companyMappings && companyMappings.length > 0) {
      // Buscar todos os códigos externos vinculados
      const externalCompanyIds = companyMappings.map((m: any) => m.external_company_id);
      const { data: externalCompaniesForTendency } = await supabaseAdmin
        .from('external_companies')
        .select('id, external_id')
        .in('id', externalCompanyIds);

      if (externalCompaniesForTendency && externalCompaniesForTendency.length > 0) {
        const externalCodesForTendency = externalCompaniesForTendency.map((ec: any) => ec.external_id);
        
        const startDate = new Date(yearNum, monthNum - 1, 1);
        const endDate = new Date(yearNum, monthNum, 0);
        const today = new Date();
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Buscar faturamento diário para calcular médias
        const { data: dailyCashFlow } = await supabaseAdmin
          .from('external_cash_flow')
          .select('transaction_date, amount')
          .eq('company_group_id', companyGroupId)
          .in('external_company_id', externalCodesForTendency)
          .gte('transaction_date', startDateStr)
          .lte('transaction_date', endDateStr);

        if (dailyCashFlow && dailyCashFlow.length > 0) {
          // Agrupar por data
          const revenueByDate: Record<string, number> = {};
          for (const cf of dailyCashFlow) {
            const date = cf.transaction_date;
            revenueByDate[date] = (revenueByDate[date] || 0) + (cf.amount || 0);
          }

          // Separar dias úteis e finais de semana/feriados
          let weekdayTotal = 0;
          let weekdayCount = 0;
          let weekendTotal = 0;
          let weekendCount = 0;

          for (const [dateStr, amount] of Object.entries(revenueByDate)) {
            const date = new Date(dateStr + 'T12:00:00');
            if (isWeekendOrHoliday(date)) {
              weekendTotal += amount;
              weekendCount++;
            } else {
              weekdayTotal += amount;
              weekdayCount++;
            }
          }

          const avgWeekday = weekdayCount > 0 ? weekdayTotal / weekdayCount : 0;
          const avgWeekend = weekendCount > 0 ? weekendTotal / weekendCount : 0;

          // Contar dias restantes no mês
          let remainingWeekdays = 0;
          let remainingWeekends = 0;
          
          const currentDate = new Date(today);
          currentDate.setHours(0, 0, 0, 0);
          
          // Se estamos no mês atual, começar do dia seguinte
          // Se estamos vendo um mês futuro, contar todos os dias
          // Se estamos vendo um mês passado, não há dias restantes
          const isCurrentMonth = today.getFullYear() === yearNum && today.getMonth() + 1 === monthNum;
          const isFutureMonth = yearNum > today.getFullYear() || 
            (yearNum === today.getFullYear() && monthNum > today.getMonth() + 1);
          
          if (isCurrentMonth) {
            // Começar do dia seguinte
            const nextDay = new Date(today);
            nextDay.setDate(nextDay.getDate() + 1);
            
            for (let d = new Date(nextDay); d <= endDate; d.setDate(d.getDate() + 1)) {
              if (isWeekendOrHoliday(d)) {
                remainingWeekends++;
              } else {
                remainingWeekdays++;
              }
            }
          } else if (isFutureMonth) {
            // Contar todos os dias do mês
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
              if (isWeekendOrHoliday(d)) {
                remainingWeekends++;
              } else {
                remainingWeekdays++;
              }
            }
          }
          // Se é mês passado, remainingWeekdays e remainingWeekends permanecem 0

          const remainingDays = remainingWeekdays + remainingWeekends;
          const projectedRemaining = (avgWeekday * remainingWeekdays) + (avgWeekend * remainingWeekends);
          const projectedTotal = totalRevenue + projectedRemaining;

          // Calcular confiança baseada na quantidade de dados
          const totalDaysWithData = weekdayCount + weekendCount;
          let confidence: 'low' | 'medium' | 'high' = 'low';
          if (totalDaysWithData >= 15) {
            confidence = 'high';
          } else if (totalDaysWithData >= 7) {
            confidence = 'medium';
          }

          tendency = {
            projectedTotal: Math.round(projectedTotal * 100) / 100,
            willMeetGoal: projectedTotal >= companyRevenueGoal,
            avgWeekday: Math.round(avgWeekday * 100) / 100,
            avgWeekend: Math.round(avgWeekend * 100) / 100,
            remainingDays,
            remainingWeekdays,
            remainingWeekends,
            confidence
          };
        }
      }
    }

    // 4. Buscar metas por turno
    const { data: shiftGoals, error: shiftGoalsError } = await supabaseAdmin
      .from('sales_goals')
      .select(`
        id,
        shift_id,
        goal_value,
        goal_unit,
        shift:shifts (
          id,
          name
        )
      `)
      .eq('company_group_id', companyGroupId)
      .eq('company_id', companyId)
      .eq('goal_type', 'shift')
      .eq('year', yearNum)
      .eq('month', monthNum)
      .eq('is_active', true);

    if (shiftGoalsError) {
      console.error('Erro ao buscar metas de turno:', shiftGoalsError);
    }

    // Calcular realizado por turno
    let shiftsWithRealized: any[] = [];
    try {
      shiftsWithRealized = await Promise.all(
        (shiftGoals || []).map(async (goal: any) => {
        let realized = 0;

        // Buscar código externo da empresa (pode ter múltiplos)
        if (companyMappings && companyMappings.length > 0) {
          const externalCompanyIds = companyMappings.map((m: any) => m.external_company_id);
          const { data: externalCompaniesForShift } = await supabaseAdmin
            .from('external_companies')
            .select('id, external_id')
            .in('id', externalCompanyIds);

          if (externalCompaniesForShift && externalCompaniesForShift.length > 0) {
            const externalCodesForShift = externalCompaniesForShift.map((ec: any) => ec.external_id);
            
            // Buscar vendas do turno (precisa mapear turno interno para externo)
            // Por enquanto, vamos buscar todas as vendas da empresa e filtrar por turno se houver campo
            const startDate = new Date(yearNum, monthNum - 1, 1);
            const endDate = new Date(yearNum, monthNum, 0);
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // Buscar cash_flow da empresa no período
            const { data: allCashFlow } = await supabaseAdmin
              .from('external_cash_flow')
              .select('amount')
              .eq('company_group_id', companyGroupId)
              .in('external_company_id', externalCodesForShift)
              .gte('transaction_date', startDateStr)
              .lte('transaction_date', endDateStr)
              .limit(50000);

            if (allCashFlow && allCashFlow.length > 0) {
              // Distribuir proporcionalmente entre turnos (simplificado)
              // Em produção, você usaria o campo de turno do cash_flow se existir
              const totalAmount = allCashFlow.reduce((sum: number, cf: any) => sum + (cf.amount || 0), 0);
              const shiftCount = (shiftGoals || []).length;
              realized = shiftCount > 0 ? totalAmount / shiftCount : 0;
            }
          }
        }

        const progress = goal.goal_value > 0 ? (realized / goal.goal_value) * 100 : 0;

        return {
          id: goal.id,
          shiftId: goal.shift_id,
          shiftName: goal.shift?.name || 'Turno',
          goalValue: goal.goal_value,
          goalUnit: goal.goal_unit,
          realized: Math.round(realized * 100) / 100,
          progress: Math.round(progress * 10) / 10,
          status: progress >= 100 ? 'achieved' : progress >= 70 ? 'ontrack' : 'behind'
        };
        })
      );
    } catch (shiftError: any) {
      console.error('Erro ao calcular realizados de turno:', shiftError);
      shiftsWithRealized = [];
    }

    // 5. Buscar metas por modo de venda
    const { data: saleModeGoals, error: saleModeGoalsError } = await supabaseAdmin
      .from('sales_goals')
      .select(`
        id,
        sale_mode_id,
        shift_id,
        goal_value,
        goal_unit,
        sale_mode:sale_modes (
          id,
          name
        ),
        shift:shifts (
          id,
          name
        )
      `)
      .eq('company_group_id', companyGroupId)
      .eq('company_id', companyId)
      .eq('goal_type', 'sale_mode')
      .eq('year', yearNum)
      .eq('month', monthNum)
      .eq('is_active', true);

    if (saleModeGoalsError) {
      console.error('Erro ao buscar metas de modo de venda:', saleModeGoalsError);
    }

    console.log('=== DEBUG SALE MODES ===');
    console.log('Metas de modo de venda encontradas:', saleModeGoals?.length || 0);
    if (saleModeGoals && saleModeGoals.length > 0) {
      saleModeGoals.forEach((g: any) => {
        console.log(`- Meta: ${g.sale_mode?.name}, Valor: ${g.goal_value}, ID: ${g.id}`);
      });
    }

    // Calcular realizado por modo de venda
    let saleModesWithRealized: any[] = [];
    try {
      // Buscar todos os cash_flow do período para mapear por transaction_mode
      let cashFlowByMode: Record<string, number> = {
        'delivery': 0,
        'local': 0
      };

      if (companyMappings && companyMappings.length > 0) {
        const externalCompanyIds = companyMappings.map((m: any) => m.external_company_id);
        const { data: externalCompaniesForMode } = await supabaseAdmin
          .from('external_companies')
          .select('id, external_id')
          .in('id', externalCompanyIds);

        if (externalCompaniesForMode && externalCompaniesForMode.length > 0) {
          const externalCodesForMode = externalCompaniesForMode.map((ec: any) => ec.external_id);
          const startDate = new Date(yearNum, monthNum - 1, 1);
          const endDate = new Date(yearNum, monthNum, 0);
          const startDateStr = startDate.toISOString().split('T')[0];
          const endDateStr = endDate.toISOString().split('T')[0];

          // Buscar cash_flow com transaction_mode
          const { data: allCashFlow } = await supabaseAdmin
            .from('external_cash_flow')
            .select('amount, transaction_mode')
            .eq('company_group_id', companyGroupId)
            .in('external_company_id', externalCodesForMode)
            .gte('transaction_date', startDateStr)
            .lte('transaction_date', endDateStr)
            .limit(100000);

          if (allCashFlow && allCashFlow.length > 0) {
            for (const cf of allCashFlow) {
              const mode = (cf.transaction_mode || '').toLowerCase().trim();
              const amount = cf.amount || 0;
              
              if (mode === 'entrega') {
                cashFlowByMode['delivery'] += amount;
              } else if (mode === 'balcão' || mode === 'balcao' || mode === 'mesa') {
                cashFlowByMode['local'] += amount;
              }
            }
            console.log('Cash flow por modo:', cashFlowByMode);
          }
        }
      }

      // Mapear para cada meta de modo de venda
      saleModesWithRealized = (saleModeGoals || []).map((goal: any) => {
        const modeName = (goal.sale_mode?.name || '').toLowerCase().trim();
        let realized = 0;

        if (modeName === 'delivery') {
          realized = cashFlowByMode['delivery'];
        } else if (modeName === 'local') {
          realized = cashFlowByMode['local'];
        }

        const progress = goal.goal_value > 0 ? (realized / goal.goal_value) * 100 : 0;

        return {
          id: goal.id,
          saleModeId: goal.sale_mode_id,
          saleModeName: goal.sale_mode?.name || 'Modo de Venda',
          shiftId: goal.shift_id,
          shiftName: goal.shift?.name || null,
          goalValue: goal.goal_value,
          goalUnit: goal.goal_unit,
          realized: Math.round(realized * 100) / 100,
          progress: Math.round(progress * 10) / 10,
          status: progress >= 100 ? 'achieved' : progress >= 70 ? 'ontrack' : 'behind'
        };
      });
      console.log('saleModesWithRealized:', JSON.stringify(saleModesWithRealized, null, 2));
    } catch (saleModeError: any) {
      console.error('Erro ao calcular realizados de modo de venda:', saleModeError);
      saleModesWithRealized = [];
    }

    console.log('Resumo gerado com sucesso!');
    console.log('Faturamento:', totalRevenue);
    console.log('Vendas distintas:', distinctSalesCount);
    console.log('Ticket médio:', averageTicket);
    console.log('==========================================\n');

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name
      },
      period: {
        year: yearNum,
        month: monthNum
      },
      revenue: {
        goal: companyRevenueGoal,
        realized: Math.round(totalRevenue * 100) / 100,
        progress: Math.round(revenueProgress * 10) / 10,
        status: revenueStatus
      },
      sales: {
        count: distinctSalesCount || 0,
        averageTicket: Math.round(averageTicket * 100) / 100 || 0
      },
      tendency,
      shifts: shiftsWithRealized || [],
      saleModes: saleModesWithRealized || [],
      summary: {
        totalShifts: (shiftsWithRealized || []).length,
        shiftsAchieved: (shiftsWithRealized || []).filter((s: any) => s.status === 'achieved').length,
        totalSaleModes: (saleModesWithRealized || []).length,
        saleModesAchieved: (saleModesWithRealized || []).filter((s: any) => s.status === 'achieved').length
      }
    });

  } catch (error: any) {
    console.error('Erro na API de dashboard da empresa:', error);
    console.error('Stack trace:', error?.stack);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error?.message || 'Erro desconhecido',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}