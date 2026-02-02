import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Função para buscar todos os registros (sem limite de 1000)
async function fetchAllRecords<T>(
  query: ReturnType<typeof supabaseAdmin.from>,
  pageSize: number = 1000
): Promise<T[]> {
  const allRecords: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      allRecords.push(...(data as T[]));
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allRecords;
}

// Buscar feriados nacionais via BrasilAPI
async function fetchHolidays(year: number): Promise<Date[]> {
  try {
    const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
    if (!response.ok) return [];
    
    const holidays = await response.json();
    return holidays.map((h: { date: string }) => new Date(h.date + 'T00:00:00'));
  } catch (error) {
    console.error('Erro ao buscar feriados:', error);
    return [];
  }
}

// Verificar se uma data é feriado
function isHoliday(date: Date, holidays: Date[]): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return holidays.some(h => h.toISOString().split('T')[0] === dateStr);
}

// Obter dia da semana (0 = domingo, 6 = sábado)
function getDayOfWeek(date: Date): number {
  return date.getDay();
}

// Calcular média por dia da semana
function calculateAveragesByDayOfWeek(
  sales: { sale_date: string; quantity: number }[],
  holidays: Date[]
): { [key: number]: number; holiday: number } {
  const sumByDay: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const countByDay: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let sumHoliday = 0;
  let countHoliday = 0;

  // Agrupar vendas por data
  const salesByDate: { [date: string]: number } = {};
  for (const sale of sales) {
    const dateKey = sale.sale_date;
    salesByDate[dateKey] = (salesByDate[dateKey] || 0) + sale.quantity;
  }

  // Calcular soma e contagem por dia da semana
  for (const [dateStr, totalQty] of Object.entries(salesByDate)) {
    const date = new Date(dateStr + 'T00:00:00');
    
    if (isHoliday(date, holidays)) {
      sumHoliday += totalQty;
      countHoliday++;
    } else {
      const dayOfWeek = getDayOfWeek(date);
      sumByDay[dayOfWeek] += totalQty;
      countByDay[dayOfWeek]++;
    }
  }

  // Calcular médias
  const averages: { [key: number]: number; holiday: number } = {
    0: countByDay[0] > 0 ? sumByDay[0] / countByDay[0] : 0,
    1: countByDay[1] > 0 ? sumByDay[1] / countByDay[1] : 0,
    2: countByDay[2] > 0 ? sumByDay[2] / countByDay[2] : 0,
    3: countByDay[3] > 0 ? sumByDay[3] / countByDay[3] : 0,
    4: countByDay[4] > 0 ? sumByDay[4] / countByDay[4] : 0,
    5: countByDay[5] > 0 ? sumByDay[5] / countByDay[5] : 0,
    6: countByDay[6] > 0 ? sumByDay[6] / countByDay[6] : 0,
    holiday: countHoliday > 0 ? sumHoliday / countHoliday : 0
  };

  return averages;
}

// Projetar consumo para os próximos dias
function projectConsumption(
  averages: { [key: number]: number; holiday: number },
  startDate: Date,
  days: number,
  holidays: Date[]
): { total: number; dailyProjection: { date: string; dayName: string; projected: number; isHoliday: boolean }[] } {
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  let total = 0;
  const dailyProjection: { date: string; dayName: string; projected: number; isHoliday: boolean }[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const isHolidayDate = isHoliday(date, holidays);
    const dayOfWeek = getDayOfWeek(date);
    
    // Se for feriado e tivermos média de feriado, usar ela; senão usar média do dia
    let projected = 0;
    if (isHolidayDate && averages.holiday > 0) {
      projected = averages.holiday;
    } else {
      projected = averages[dayOfWeek] || 0;
    }
    
    total += projected;
    dailyProjection.push({
      date: date.toISOString().split('T')[0],
      dayName: isHolidayDate ? 'Feriado' : dayNames[dayOfWeek],
      projected: Math.round(projected * 100) / 100,
      isHoliday: isHolidayDate
    });
  }

  return { total: Math.round(total * 100) / 100, dailyProjection };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const projectionDays = parseInt(searchParams.get('projection_days') || '10');
    const historyDays = parseInt(searchParams.get('history_days') || '7');
    const companyId = searchParams.get('company_id'); // Opcional: filtrar por empresa interna
    const projectionType = searchParams.get('projection_type') || 'weekly'; // 'linear' ou 'weekly'

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    // Validar limites (mínimo 1 dia)
    const validProjectionDays = Math.max(projectionDays, 1);
    const validHistoryDays = Math.max(historyDays, 1);

    // Se tiver company_id, buscar os external_ids das empresas externas mapeadas
    let externalCompanyCodes: string[] = [];
    if (companyId) {
      console.log(`Buscando mapeamentos para company_id: ${companyId}, group_id: ${groupId}`);
      
      // Buscar mapeamentos com os dados da empresa externa
      const { data: mappings, error: mappingError } = await supabaseAdmin
        .from('company_mappings')
        .select(`
          external_company_id,
          external_company:external_companies(id, external_id)
        `)
        .eq('company_group_id', groupId)
        .eq('company_id', companyId);
      
      if (mappingError) {
        console.error('Erro ao buscar mapeamentos:', mappingError);
      }
      
      if (mappings && mappings.length > 0) {
        // Usar o external_id (código) da empresa externa, não o UUID
        externalCompanyCodes = mappings
          .map(m => (m.external_company as { id: string; external_id: string })?.external_id)
          .filter(Boolean);
        console.log(`Empresa ${companyId} mapeada para ${mappings.length} empresa(s) externa(s), códigos: ${externalCompanyCodes.join(', ')}`);
      } else {
        console.log(`AVISO: Empresa ${companyId} não tem mapeamentos! O filtro não será aplicado.`);
      }
    }

    // Buscar a última data de venda para usar como referência
    let lastSaleQuery = supabaseAdmin
      .from('external_sales')
      .select('sale_date')
      .eq('company_group_id', groupId)
      .order('sale_date', { ascending: false })
      .limit(1);
    
    if (externalCompanyCodes.length > 0) {
      lastSaleQuery = lastSaleQuery.in('external_company_id', externalCompanyCodes);
    }

    const { data: lastSaleData } = await lastSaleQuery.single();

    // Usar última data de venda como "hoje" para cálculos
    const referenceDate = lastSaleData 
      ? new Date(lastSaleData.sale_date + 'T00:00:00')
      : new Date();
    referenceDate.setHours(0, 0, 0, 0);

    // Data de início do histórico
    const historyStartDate = new Date(referenceDate);
    historyStartDate.setDate(historyStartDate.getDate() - validHistoryDays);

    // Data de início da projeção (dia seguinte à última venda)
    const projectionStartDate = new Date(referenceDate);
    projectionStartDate.setDate(projectionStartDate.getDate() + 1);

    console.log(`Referência: ${referenceDate.toISOString().split('T')[0]}`);
    console.log(`Histórico de: ${historyStartDate.toISOString().split('T')[0]} até ${referenceDate.toISOString().split('T')[0]}`);
    console.log(`Projeção de: ${projectionStartDate.toISOString().split('T')[0]} para ${validProjectionDays} dias`);

    // Buscar feriados para o ano atual e próximo (caso a projeção cruze o ano)
    const currentYear = referenceDate.getFullYear();
    const [holidaysCurrentYear, holidaysNextYear] = await Promise.all([
      fetchHolidays(currentYear),
      fetchHolidays(currentYear + 1)
    ]);
    const allHolidays = [...holidaysCurrentYear, ...holidaysNextYear];

    // Buscar TODOS os produtos de revenda (sem limite de 1000)
    const productsQuery = supabaseAdmin
      .from('external_products')
      .select('id, external_id, name, category, product_group')
      .eq('company_group_id', groupId)
      .eq('type', 'Revenda')
      .order('name');

    const products = await fetchAllRecords<{
      id: string;
      external_id: string;
      name: string;
      category: string;
      product_group: string | null;
    }>(productsQuery);

    console.log(`Produtos de revenda encontrados: ${products.length}`);

    if (products.length === 0) {
      return NextResponse.json({ 
        projection: [],
        summary: {
          totalProducts: 0,
          productsNeedPurchase: 0,
          projectionDays: validProjectionDays,
          historyDays: validHistoryDays
        }
      });
    }

    // Buscar TODAS as vendas do período histórico (sem limite de 1000)
    let salesQueryBuilder = supabaseAdmin
      .from('external_sales')
      .select('external_product_id, sale_date, quantity')
      .eq('company_group_id', groupId)
      .gte('sale_date', historyStartDate.toISOString().split('T')[0])
      .lte('sale_date', referenceDate.toISOString().split('T')[0]);

    if (externalCompanyCodes.length > 0) {
      salesQueryBuilder = salesQueryBuilder.in('external_company_id', externalCompanyCodes);
    }

    const sales = await fetchAllRecords<{
      external_product_id: string;
      sale_date: string;
      quantity: number;
    }>(salesQueryBuilder);

    console.log(`Vendas encontradas no período: ${sales.length}`);

    // Buscar TODO o estoque atual (sem limite de 1000)
    let stockQueryBuilder = supabaseAdmin
      .from('external_stock')
      .select('external_product_id, quantity, min_quantity, max_quantity, unit, conversion_factor, purchase_unit')
      .eq('company_group_id', groupId);

    if (externalCompanyCodes.length > 0) {
      stockQueryBuilder = stockQueryBuilder.in('external_company_id', externalCompanyCodes);
    }

    const stock = await fetchAllRecords<{
      external_product_id: string;
      quantity: number;
      min_quantity: number;
      max_quantity: number;
      unit: string;
      conversion_factor: number | null;
      purchase_unit: string | null;
    }>(stockQueryBuilder);

    console.log(`Estoque encontrado: ${stock.length}`);

    // Criar mapa de estoque por produto
    const stockMap = new Map(
      stock.map(s => [s.external_product_id, s])
    );

    // Criar mapa de vendas por produto
    const salesByProduct = new Map<string, { sale_date: string; quantity: number }[]>();
    for (const sale of sales) {
      const productSales = salesByProduct.get(sale.external_product_id) || [];
      productSales.push({ sale_date: sale.sale_date, quantity: sale.quantity });
      salesByProduct.set(sale.external_product_id, productSales);
    }

    // Calcular projeção para cada produto
    const projectionResults = [];
    let productsNeedPurchase = 0;

    for (const product of products) {
      const productSales = salesByProduct.get(product.external_id) || [];
      const productStock = stockMap.get(product.external_id);

      // Calcular média diária histórica
      const totalHistorySales = productSales.reduce((sum, s) => sum + s.quantity, 0);
      const avgDailySales = validHistoryDays > 0 ? totalHistorySales / validHistoryDays : 0;

      // Calcular médias por dia da semana
      const averages = calculateAveragesByDayOfWeek(productSales, allHolidays);
      
      // Projetar consumo baseado no tipo de projeção
      let projection: { total: number; dailyProjection: { date: string; dayName: string; projected: number; isHoliday: boolean }[] };
      
      if (projectionType === 'linear') {
        // Projeção Linear: usa média diária simples
        const dailyProjection: { date: string; dayName: string; projected: number; isHoliday: boolean }[] = [];
        const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        
        for (let i = 0; i < validProjectionDays; i++) {
          const date = new Date(projectionStartDate);
          date.setDate(date.getDate() + i);
          const isHolidayDate = isHoliday(date, allHolidays);
          
          dailyProjection.push({
            date: date.toISOString().split('T')[0],
            dayName: isHolidayDate ? 'Feriado' : dayNames[date.getDay()],
            projected: Math.round(avgDailySales * 100) / 100,
            isHoliday: isHolidayDate
          });
        }
        
        projection = {
          total: Math.round(avgDailySales * validProjectionDays * 100) / 100,
          dailyProjection
        };
      } else {
        // Projeção Semanal: considera dia da semana e feriados
        projection = projectConsumption(averages, projectionStartDate, validProjectionDays, allHolidays);
      }
      
      // Dados de estoque
      const currentStock = productStock?.quantity || 0;
      const minStock = productStock?.min_quantity || 0;
      const unit = productStock?.unit || 'un';
      const conversionFactor = productStock?.conversion_factor || 1;
      const purchaseUnit = productStock?.purchase_unit || unit;

      // Calcular necessidade de compra
      // Necessidade = Consumo Projetado + Estoque Mínimo - Estoque Atual
      const purchaseNeed = Math.max(0, projection.total + minStock - currentStock);
      
      // Quantidade de compra = Necessidade / Fator de Conversão
      const purchaseQuantity = conversionFactor > 0 ? purchaseNeed / conversionFactor : purchaseNeed;
      
      if (purchaseNeed > 0) {
        productsNeedPurchase++;
      }

      projectionResults.push({
        productId: product.id,
        externalId: product.external_id,
        name: product.name,
        category: product.category,
        productGroup: product.product_group || '',
        unit,
        // Histórico
        totalHistorySales: Math.round(totalHistorySales * 100) / 100,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        // Médias por dia da semana
        averagesByDay: {
          domingo: Math.round(averages[0] * 100) / 100,
          segunda: Math.round(averages[1] * 100) / 100,
          terca: Math.round(averages[2] * 100) / 100,
          quarta: Math.round(averages[3] * 100) / 100,
          quinta: Math.round(averages[4] * 100) / 100,
          sexta: Math.round(averages[5] * 100) / 100,
          sabado: Math.round(averages[6] * 100) / 100,
          feriado: Math.round(averages.holiday * 100) / 100
        },
        // Projeção
        projectedConsumption: projection.total,
        dailyProjection: projection.dailyProjection,
        // Estoque
        currentStock: Math.round(currentStock * 100) / 100,
        minStock: Math.round(minStock * 100) / 100,
        // Conversão
        conversionFactor: Math.round(conversionFactor * 1000) / 1000,
        purchaseUnit,
        // Necessidade
        purchaseNeed: Math.round(purchaseNeed * 100) / 100,
        purchaseQuantity: Math.round(purchaseQuantity * 100) / 100,
        needsPurchase: purchaseNeed > 0,
        // Status
        stockStatus: currentStock <= 0 ? 'out' : currentStock <= minStock ? 'low' : 'ok'
      });
    }

    // Ordenar: primeiro os que precisam comprar, depois por nome
    projectionResults.sort((a, b) => {
      if (a.needsPurchase && !b.needsPurchase) return -1;
      if (!a.needsPurchase && b.needsPurchase) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      projection: projectionResults,
      summary: {
        totalProducts: products.length,
        productsNeedPurchase,
        projectionDays: validProjectionDays,
        historyDays: validHistoryDays,
        referenceDate: referenceDate.toISOString().split('T')[0],
        projectionStartDate: projectionStartDate.toISOString().split('T')[0],
        historyStartDate: historyStartDate.toISOString().split('T')[0],
        holidaysInPeriod: allHolidays
          .filter(h => {
            const hDate = new Date(h);
            const endDate = new Date(projectionStartDate);
            endDate.setDate(endDate.getDate() + validProjectionDays);
            return hDate >= projectionStartDate && hDate <= endDate;
          })
          .map(h => h.toISOString().split('T')[0])
      }
    });

  } catch (error) {
    console.error('Erro na API de projeção:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
