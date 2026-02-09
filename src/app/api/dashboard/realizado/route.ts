import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variáveis de ambiente do Supabase não configuradas');
}

const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceKey || ''
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    // Definir período
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Mês anterior para comparação
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
    const prevEndDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;

    // Constantes para dias da semana (definidas uma única vez no topo)
    const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const WEEKDAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // 1. Buscar empresas do grupo (companies) com mapeamento para external_companies
    const { data: companies, error: companiesError } = await supabase
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

    // 2. Buscar external_companies do grupo para pegar os external_ids
    const { data: externalCompanies, error: extCompError } = await supabase
      .from('external_companies')
      .select('id, external_id, name')
      .eq('company_group_id', groupId);

    if (extCompError) {
      console.error('Erro ao buscar external_companies:', extCompError);
      throw extCompError;
    }

    // Criar mapa de external_company_id (UUID) -> external_id (texto como "01", "02")
    const extCompanyMap = new Map<string, { external_id: string; name: string }>();
    externalCompanies?.forEach(ec => {
      extCompanyMap.set(ec.id, { external_id: ec.external_id, name: ec.name });
    });

    // Criar mapa de company_id -> external_ids (pode ter múltiplos)
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

    // Pegar todos os external_ids únicos para a query
    const allExternalIds = Array.from(new Set(
      Array.from(companyToExternalIds.values()).flat()
    ));

    if (allExternalIds.length === 0) {
      // Retornar dados vazios se não houver mapeamento
      return NextResponse.json({
        period: { year, month },
        companies: companies?.map(c => ({
          id: c.id,
          name: c.name,
          revenue: 0,
          transactions: 0,
          averageTicket: 0,
          trend: 0,
          mom: 0,
          yoy: 0
        })) || [],
        summary: {
          totalRevenue: 0,
          totalTransactions: 0,
          averageTicket: 0,
          bestDay: { date: '', revenue: 0 },
          worstDay: { date: '', revenue: 0 },
          comparisonLastMonth: 0
        },
        dailyRevenue: [],
        saleModeRevenue: [],
        shiftRevenue: [],
        weekdayAverage: []
      });
    }

    // 3. Buscar vendas do mês atual de external_cash_flow (com paginação)
    let cashFlowData: any[] = [];
    
    if (allExternalIds.length > 0) {
      const allCashFlow: any[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;
      const maxPages = 100; // Limite de segurança para evitar loops infinitos

      console.log('API /realizado - Buscando cash flow do mês atual. Total de external_ids:', allExternalIds.length);

      while (hasMore && page < maxPages) {
        let query = supabase
          .from('external_cash_flow')
          .select('external_company_id, transaction_date, amount, transaction_mode, period')
          .eq('company_group_id', groupId)
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .in('external_company_id', allExternalIds)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao buscar external_cash_flow:', error);
          throw error;
        }

        if (data && data.length > 0) {
          allCashFlow.push(...data);
          console.log(`API /realizado - Página ${page + 1}: ${data.length} registros encontrados. Total acumulado: ${allCashFlow.length}`);
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      if (page >= maxPages) {
        console.warn('API /realizado - Atingido limite máximo de páginas. Pode haver mais registros.');
      }

      console.log('API /realizado - Total de registros de cash flow encontrados:', allCashFlow.length);
      if (allCashFlow.length > 0) {
        console.log('API /realizado - Exemplo de registro:', {
          external_company_id: allCashFlow[0].external_company_id,
          transaction_date: allCashFlow[0].transaction_date,
          amount: allCashFlow[0].amount,
          transaction_mode: allCashFlow[0].transaction_mode,
          period: allCashFlow[0].period
        });
      }
      cashFlowData = allCashFlow;
    } else {
      console.log('API /realizado - Nenhum external_id encontrado, retornando cash flow vazio');
    }

    // 4. Buscar cash flow do mês anterior para comparação MoM (com paginação)
    let prevCashFlowData: any[] = [];
    
    if (allExternalIds.length > 0) {
      const allPrevCashFlow: any[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;
      const maxPages = 100;

      console.log('API /realizado - Buscando cash flow do mês anterior');

      while (hasMore && page < maxPages) {
        let query = supabase
          .from('external_cash_flow')
          .select('external_company_id, amount')
          .eq('company_group_id', groupId)
          .gte('transaction_date', prevStartDate)
          .lte('transaction_date', prevEndDate)
          .in('external_company_id', allExternalIds)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao buscar cash flow anterior:', error);
          hasMore = false;
        } else {
          if (data && data.length > 0) {
            allPrevCashFlow.push(...data);
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        }
      }

      console.log('API /realizado - Total de registros de cash flow do mês anterior:', allPrevCashFlow.length);
      prevCashFlowData = allPrevCashFlow;
    } else {
      console.log('API /realizado - Nenhum external_id encontrado, retornando cash flow anterior vazio');
    }

    // Calcular total do mês anterior por empresa (para MoM)
    const prevRevenueByExtId = new Map<string, number>();
    prevCashFlowData?.forEach(cf => {
      const extId = cf.external_company_id;
      prevRevenueByExtId.set(extId, (prevRevenueByExtId.get(extId) || 0) + (Number(cf.amount) || 0));
    });

    // 4.1. Buscar cash flow do mesmo mês do ano anterior para comparação YoY (com paginação)
    // Usando yoyYear para evitar conflito com prevYear (usado para MoM na linha 34)
    const yoyYear = year - 1;
    const prevYearStartDate = `${yoyYear}-${String(month).padStart(2, '0')}-01`;
    const prevYearLastDay = new Date(yoyYear, month, 0).getDate();
    const prevYearEndDate = `${yoyYear}-${String(month).padStart(2, '0')}-${String(prevYearLastDay).padStart(2, '0')}`;
    
    let prevYearCashFlowData: any[] = [];
    
    if (allExternalIds.length > 0) {
      const allPrevYearCashFlow: any[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;
      const maxPages = 100;

      console.log('API /realizado - Buscando cash flow do mesmo mês do ano anterior');

      while (hasMore && page < maxPages) {
        let query = supabase
          .from('external_cash_flow')
          .select('external_company_id, amount')
          .eq('company_group_id', groupId)
          .gte('transaction_date', prevYearStartDate)
          .lte('transaction_date', prevYearEndDate)
          .in('external_company_id', allExternalIds)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao buscar cash flow do ano anterior:', error);
          hasMore = false;
        } else {
          if (data && data.length > 0) {
            allPrevYearCashFlow.push(...data);
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        }
      }

      console.log('API /realizado - Total de registros de cash flow do ano anterior:', allPrevYearCashFlow.length);
      prevYearCashFlowData = allPrevYearCashFlow;
    }

    // Calcular total do mesmo mês do ano anterior por empresa (para YoY)
    const prevYearRevenueByExtId = new Map<string, number>();
    prevYearCashFlowData?.forEach(cf => {
      const extId = cf.external_company_id;
      prevYearRevenueByExtId.set(extId, (prevYearRevenueByExtId.get(extId) || 0) + (Number(cf.amount) || 0));
    });

    // 5. Processar dados por empresa
    const companiesData = companies?.map(company => {
      const externalIds = companyToExternalIds.get(company.id) || [];
      const companyCashFlow = cashFlowData?.filter(cf => externalIds.includes(cf.external_company_id)) || [];
      
      const revenue = companyCashFlow.reduce((sum, cf) => sum + (Number(cf.amount) || 0), 0);
      const transactions = companyCashFlow.length;
      
      // Calcular MoM (Month over Month) - comparação com mês anterior
      const prevMonthRevenue = externalIds.reduce((sum, extId) => sum + (prevRevenueByExtId.get(extId) || 0), 0);
      const mom = prevMonthRevenue > 0 ? ((revenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;
      
      // Calcular YoY (Year over Year) - comparação com mesmo mês do ano anterior
      const prevYearRevenue = externalIds.reduce((sum, extId) => sum + (prevYearRevenueByExtId.get(extId) || 0), 0);
      const yoy = prevYearRevenue > 0 ? ((revenue - prevYearRevenue) / prevYearRevenue) * 100 : 0;
      
      return {
        id: company.id,
        name: company.name,
        revenue,
        transactions,
        averageTicket: transactions > 0 ? revenue / transactions : 0,
        trend: Math.round(mom * 10) / 10, // Manter trend para compatibilidade (agora é MoM)
        mom: Math.round(mom * 10) / 10,
        yoy: Math.round(yoy * 10) / 10
      };
    }).sort((a, b) => b.revenue - a.revenue) || [];

    // 6. Processar faturamento diário
    const dailyMap = new Map<string, { revenue: number; transactions: number }>();
    
    // Inicializar todos os dias do mês
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyMap.set(dateStr, { revenue: 0, transactions: 0 });
    }

    // Preencher com dados reais
    cashFlowData?.forEach(cf => {
      const dateStr = typeof cf.transaction_date === 'string' 
        ? cf.transaction_date.split('T')[0] 
        : new Date(cf.transaction_date).toISOString().split('T')[0];
      if (dailyMap.has(dateStr)) {
        const existing = dailyMap.get(dateStr)!;
        dailyMap.set(dateStr, {
          revenue: existing.revenue + (Number(cf.amount) || 0),
          transactions: existing.transactions + 1
        });
      }
    });

    const dailyRevenue = Array.from(dailyMap.entries()).map(([date, data]) => {
      const dateObj = new Date(date + 'T12:00:00');
      const dayOfWeekIndex = dateObj.getDay(); // 0 = domingo, 6 = sábado
      return {
        date,
        day: dateObj.getDate(),
        dayOfWeek: DAYS_OF_WEEK[dayOfWeekIndex] || 'Dom', // Fallback para domingo se índice inválido
        revenue: Math.round(data.revenue * 100) / 100,
        transactions: data.transactions
      };
    }).sort((a, b) => a.day - b.day);

    const totalRevenue = companiesData.reduce((sum, c) => sum + c.revenue, 0);

    // 7. Processar por modo de venda
    const saleModeMap = new Map<string, { revenue: number; transactions: number }>();
    
    // Inicializar ambos os modos
    saleModeMap.set('Delivery', { revenue: 0, transactions: 0 });
    saleModeMap.set('Local', { revenue: 0, transactions: 0 });
    
    cashFlowData?.forEach(cf => {
      // Usar transaction_mode: se for "entrega" = "Delivery", qualquer outro (mesa, etc) = "Local"
      const transactionMode = cf.transaction_mode ? String(cf.transaction_mode).trim().toLowerCase() : '';
      const mode = transactionMode === 'entrega' || transactionMode === 'delivery' ? 'Delivery' : 'Local';
      
      const existing = saleModeMap.get(mode) || { revenue: 0, transactions: 0 };
      saleModeMap.set(mode, {
        revenue: existing.revenue + (Number(cf.amount) || 0),
        transactions: existing.transactions + 1
      });
    });
    
    console.log('API /realizado - Modos de venda processados:', Array.from(saleModeMap.entries()).map(([mode, data]) => ({
      mode,
      revenue: data.revenue,
      transactions: data.transactions
    })));

    const saleModeRevenue = Array.from(saleModeMap.entries()).map(([mode, data]) => ({
      mode,
      revenue: Math.round(data.revenue * 100) / 100,
      transactions: data.transactions,
      percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0
    })).sort((a, b) => b.revenue - a.revenue);

    // 8. Processar por turno/período
    const shiftMap = new Map<string, { revenue: number; transactions: number }>();
    cashFlowData?.forEach(cf => {
      // Usar o campo period se disponível
      let shift = (cf.period || '').toString().toLowerCase();
      if (shift.includes('almo') || shift.includes('lunch')) {
        shift = 'Almoço';
      } else if (shift.includes('jant') || shift.includes('dinner') || shift.includes('noite')) {
        shift = 'Jantar';
      } else {
        // Se não tiver período definido, usar default
        shift = 'Almoço';
      }
      
      const existing = shiftMap.get(shift) || { revenue: 0, transactions: 0 };
      shiftMap.set(shift, {
        revenue: existing.revenue + (Number(cf.amount) || 0),
        transactions: existing.transactions + 1
      });
    });

    // Se só tiver um turno, criar o outro com 0
    if (!shiftMap.has('Almoço')) shiftMap.set('Almoço', { revenue: 0, transactions: 0 });
    if (!shiftMap.has('Jantar')) shiftMap.set('Jantar', { revenue: 0, transactions: 0 });

    const shiftRevenue = Array.from(shiftMap.entries()).map(([shift, data]) => ({
      shift,
      revenue: Math.round(data.revenue * 100) / 100,
      transactions: data.transactions,
      percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0
    })).sort((a, b) => b.revenue - a.revenue);

    // 9. Processar média diária por dia da semana
    const weekdayMap = new Map<string, { totalRevenue: number; dayCount: number }>();
    
    // Agrupar por dia da semana
    dailyRevenue.forEach(day => {
      if (day.revenue > 0) {
        const weekday = day.dayOfWeek;
        const existing = weekdayMap.get(weekday) || { totalRevenue: 0, dayCount: 0 };
        weekdayMap.set(weekday, {
          totalRevenue: existing.totalRevenue + day.revenue,
          dayCount: existing.dayCount + 1
        });
      }
    });
    
    // Calcular média por dia da semana (usando DAYS_OF_WEEK já definido acima)
    const weekdayAverage = DAYS_OF_WEEK.map((day, index) => {
      const data = weekdayMap.get(day) || { totalRevenue: 0, dayCount: 0 };
      const average = data.dayCount > 0 ? data.totalRevenue / data.dayCount : 0;
      return {
        dayOfWeek: day,
        dayOfWeekFull: WEEKDAY_NAMES_FULL[index] || day, // Fallback para o nome curto se índice inválido
        average: Math.round(average * 100) / 100,
        totalRevenue: Math.round(data.totalRevenue * 100) / 100,
        dayCount: data.dayCount
      };
    });

    // 10. Calcular resumo
    const totalTransactions = companiesData.reduce((sum, c) => sum + c.transactions, 0);
    const sortedDaily = [...dailyRevenue].filter(d => d.revenue > 0).sort((a, b) => b.revenue - a.revenue);
    const bestDay = sortedDaily[0] || { date: '', revenue: 0 };
    const worstDay = sortedDaily[sortedDaily.length - 1] || { date: '', revenue: 0 };

    // Comparação com mês anterior
    const prevTotalRevenue = prevCashFlowData?.reduce((sum, cf) => sum + (Number(cf.amount) || 0), 0) || 0;
    const comparisonLastMonth = prevTotalRevenue > 0 
      ? Math.round(((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 1000) / 10
      : 0;

    // 11. Buscar faturamento por dia e por empresa (para tabela)
    let dailyRevenueByCompany: Array<{
      day: number;
      date: string;
      dayOfWeek: string;
      companies: Array<{ companyId: string; companyName: string; revenue: number }>;
    }> = [];

    if (allExternalIds.length > 0 && cashFlowData && cashFlowData.length > 0) {
      // Criar estrutura de dados: dia -> empresa -> faturamento
      const dailyMap = new Map<string, Map<string, number>>();
      
      // Inicializar todos os dias do mês
      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dailyMap.set(dateStr, new Map<string, number>());
      }

      // Preencher com dados reais do cashFlowData
      cashFlowData.forEach((cf: any) => {
        const dateStr = typeof cf.transaction_date === 'string' 
          ? cf.transaction_date.split('T')[0] 
          : new Date(cf.transaction_date).toISOString().split('T')[0];
        
        const extId = cf.external_company_id;
        const amount = Number(cf.amount) || 0;

        // Encontrar qual empresa pertence a este external_id
        for (const [companyId, externalIds] of companyToExternalIds.entries()) {
          if (externalIds.includes(extId)) {
            const dayMap = dailyMap.get(dateStr);
            if (dayMap) {
              const current = dayMap.get(companyId) || 0;
              dayMap.set(companyId, current + amount);
            }
            break;
          }
        }
      });

      // Converter para array
      dailyRevenueByCompany = Array.from(dailyMap.entries()).map(([dateStr, companyMap]) => {
        const dateObj = new Date(dateStr + 'T12:00:00');
        const day = dateObj.getDate();
        const dayOfWeekIndex = dateObj.getDay();
        const dayOfWeek = DAYS_OF_WEEK[dayOfWeekIndex] || 'Dom';
        
        const companies = Array.from(companyMap.entries()).map(([companyId, revenue]) => {
          const company = companiesData.find(c => c.id === companyId);
          return {
            companyId,
            companyName: company?.name || 'Desconhecida',
            revenue: Math.round(revenue * 100) / 100
          };
        }).sort((a, b) => a.companyName.localeCompare(b.companyName));

        return {
          day,
          date: dateStr,
          dayOfWeek,
          companies
        };
      }).sort((a, b) => a.day - b.day);
    }

    return NextResponse.json({
      period: { year, month },
      companies: companiesData,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTransactions,
        averageTicket: totalTransactions > 0 ? Math.round((totalRevenue / totalTransactions) * 100) / 100 : 0,
        bestDay: { date: bestDay.date, revenue: bestDay.revenue },
        worstDay: { date: worstDay.date, revenue: worstDay.revenue },
        comparisonLastMonth
      },
      dailyRevenue,
      saleModeRevenue,
      shiftRevenue,
      weekdayAverage,
      dailyRevenueByCompany
    });

  } catch (error: any) {
    console.error('Erro na API realizado:', error);
    console.error('Stack trace:', error?.stack);
    return NextResponse.json({ 
      error: error?.message || 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
}