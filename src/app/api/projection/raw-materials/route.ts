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
      projected: Math.round(projected * 1000) / 1000,
      isHoliday: isHolidayDate
    });
  }

  return { total: Math.round(total * 1000) / 1000, dailyProjection };
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
      console.log(`[MP] Buscando mapeamentos para company_id: ${companyId}, group_id: ${groupId}`);
      
      const { data: mappings, error: mappingError } = await supabaseAdmin
        .from('company_mappings')
        .select(`
          external_company_id,
          external_company:external_companies(id, external_id)
        `)
        .eq('company_group_id', groupId)
        .eq('company_id', companyId);
      
      if (mappingError) {
        console.error('[MP] Erro ao buscar mapeamentos:', mappingError);
      }
      
      if (mappings && mappings.length > 0) {
        externalCompanyCodes = mappings
          .map(m => (m.external_company as { id: string; external_id: string })?.external_id)
          .filter(Boolean);
        console.log(`[MP] Empresa ${companyId} mapeada para códigos: ${externalCompanyCodes.join(', ')}`);
      } else {
        console.log(`[MP] AVISO: Empresa ${companyId} não tem mapeamentos!`);
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

    console.log(`[MP] Referência: ${referenceDate.toISOString().split('T')[0]}`);
    console.log(`[MP] Histórico de: ${historyStartDate.toISOString().split('T')[0]} até ${referenceDate.toISOString().split('T')[0]}`);
    console.log(`[MP] Projeção de: ${projectionStartDate.toISOString().split('T')[0]} para ${validProjectionDays} dias`);

    // Buscar feriados para o ano atual e próximo
    const currentYear = referenceDate.getFullYear();
    const [holidaysCurrentYear, holidaysNextYear] = await Promise.all([
      fetchHolidays(currentYear),
      fetchHolidays(currentYear + 1)
    ]);
    const allHolidays = [...holidaysCurrentYear, ...holidaysNextYear];

    // Buscar todas as matérias-primas ativas do grupo
    const { data: rawMaterials, error: rmError } = await supabaseAdmin
      .from('raw_materials')
      .select(`
        id,
        name,
        unit,
        min_stock,
        category,
        loss_factor,
        raw_material_products (
          id,
          external_product_id,
          quantity_per_unit
        ),
        raw_material_stock (
          id,
          external_stock_id
        )
      `)
      .eq('company_group_id', groupId)
      .eq('is_active', true)
      .order('name');

    if (rmError) {
      console.error('[MP] Erro ao buscar matérias-primas:', rmError);
      return NextResponse.json({ error: rmError.message }, { status: 500 });
    }

    if (!rawMaterials || rawMaterials.length === 0) {
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

    console.log(`[MP] Matérias-primas encontradas: ${rawMaterials.length}`);
    
    // Debug: mostrar vínculos de cada MP
    for (const rm of rawMaterials) {
      console.log(`[MP] MP "${rm.name}": ${rm.raw_material_products?.length || 0} produtos venda, ${rm.raw_material_stock?.length || 0} produtos estoque`);
      if (rm.raw_material_stock && rm.raw_material_stock.length > 0) {
        console.log(`[MP] - Stock IDs:`, rm.raw_material_stock.map(s => s.external_stock_id));
      }
    }

    // Buscar todos os external_products do grupo para criar um mapa
    const { data: externalProducts, error: epError } = await supabaseAdmin
      .from('external_products')
      .select('id, external_id, name, category')
      .eq('company_group_id', groupId);

    if (epError) {
      console.error('[MP] Erro ao buscar produtos externos:', epError);
    }

    // Criar mapa de produtos externos por external_id (código do produto)
    // IMPORTANTE: raw_material_products.external_product_id guarda o external_id (código), não o UUID
    const externalProductsMap = new Map(
      (externalProducts || []).map(p => [p.external_id, p])
    );

    // Buscar todos os external_stock do grupo para criar um mapa (com paginação)
    const stockQuery = supabaseAdmin
      .from('external_stock')
      .select('id, external_product_id, external_company_id, quantity, product_name, conversion_factor, purchase_unit, unit')
      .eq('company_group_id', groupId);
    
    const externalStockData = await fetchAllRecords<{
      id: string;
      external_product_id: string;
      external_company_id?: string;
      quantity: number;
      product_name?: string;
      conversion_factor?: number;
      purchase_unit?: string;
      unit?: string;
    }>(stockQuery);

    // Criar mapa de estoque externo por ID
    const externalStockMap = new Map(
      (externalStockData || []).map(s => [s.id, s])
    );
    
    console.log(`[MP] Estoque externo carregado: ${externalStockData?.length || 0} registros`);

    // Coletar todos os external_product_ids dos produtos de venda vinculados
    // rmp.external_product_id já é o external_id (código) do produto
    const allExternalProductIds = new Set<string>();
    for (const rm of rawMaterials) {
      for (const rmp of rm.raw_material_products || []) {
        // rmp.external_product_id já é o código (external_id) do produto
        if (rmp.external_product_id) {
          allExternalProductIds.add(rmp.external_product_id);
        }
      }
    }

    console.log(`[MP] Produtos de venda vinculados: ${allExternalProductIds.size}`);

    // Buscar TODAS as vendas do período histórico para os produtos vinculados
    let salesData: { external_product_id: string; sale_date: string; quantity: number }[] = [];
    
    if (allExternalProductIds.size > 0) {
      let salesQueryBuilder = supabaseAdmin
        .from('external_sales')
        .select('external_product_id, sale_date, quantity')
        .eq('company_group_id', groupId)
        .in('external_product_id', Array.from(allExternalProductIds))
        .gte('sale_date', historyStartDate.toISOString().split('T')[0])
        .lte('sale_date', referenceDate.toISOString().split('T')[0]);

      if (externalCompanyCodes.length > 0) {
        salesQueryBuilder = salesQueryBuilder.in('external_company_id', externalCompanyCodes);
      }

      salesData = await fetchAllRecords<{
        external_product_id: string;
        sale_date: string;
        quantity: number;
      }>(salesQueryBuilder);
    }

    console.log(`[MP] Vendas encontradas no período: ${salesData.length}`);

    // Criar mapa de vendas por produto
    const salesByProduct = new Map<string, { sale_date: string; quantity: number }[]>();
    for (const sale of salesData) {
      const productSales = salesByProduct.get(sale.external_product_id) || [];
      productSales.push({ sale_date: sale.sale_date, quantity: sale.quantity });
      salesByProduct.set(sale.external_product_id, productSales);
    }

    // Calcular projeção para cada matéria-prima
    const projectionResults = [];
    let productsNeedPurchase = 0;

    for (const rm of rawMaterials) {
      // Coletar vendas de todos os produtos de venda vinculados (multiplicado por quantity_per_unit)
      const mpSales: { sale_date: string; quantity: number }[] = [];
      const linkedSaleProducts: { name: string; externalId: string; quantityPerUnit: number; totalSales: number }[] = [];
      
      for (const rmp of rm.raw_material_products || []) {
        // rmp.external_product_id já é o código (external_id) do produto
        const externalId = rmp.external_product_id;
        if (!externalId) continue;
        
        // Buscar o produto externo pelo external_id (código) usando o mapa
        const ep = externalProductsMap.get(externalId);
        
        const productSales = salesByProduct.get(externalId) || [];
        const quantityPerUnit = rmp.quantity_per_unit || 1;
        let totalSales = 0;
        
        // Multiplicar cada venda pela quantidade por unidade
        for (const sale of productSales) {
          const adjustedQty = sale.quantity * quantityPerUnit;
          mpSales.push({ sale_date: sale.sale_date, quantity: adjustedQty });
          totalSales += sale.quantity;
        }
        
        linkedSaleProducts.push({
          name: ep?.name || externalId,
          externalId,
          quantityPerUnit,
          totalSales
        });
      }

      // Calcular estoque total dos produtos de estoque vinculados
      let currentStock = 0;
      let conversionFactor = 1;
      let purchaseUnit = rm.unit;
      const linkedStockProducts: { name: string; externalId: string; quantity: number; companyId: string }[] = [];
      
      for (const rms of rm.raw_material_stock || []) {
        // Buscar o estoque externo pelo ID usando o mapa
        const es = externalStockMap.get(rms.external_stock_id);
        
        if (!es) continue;
        
        // Se tiver filtro de filial, verificar se o estoque é da filial selecionada
        if (externalCompanyCodes.length > 0 && !externalCompanyCodes.includes(es.external_company_id)) {
          continue;
        }
        
        currentStock += es.quantity || 0;
        
        // Usar o fator de conversão e unidade de compra do primeiro estoque
        if (linkedStockProducts.length === 0) {
          conversionFactor = es.conversion_factor || 1;
          purchaseUnit = es.purchase_unit || es.unit || rm.unit;
        }
        
        linkedStockProducts.push({
          name: es.product_name || es.external_product_id,
          externalId: es.external_product_id,
          quantity: es.quantity || 0,
          companyId: es.external_company_id
        });
      }

      // Calcular média diária histórica
      const totalHistorySales = mpSales.reduce((sum, s) => sum + s.quantity, 0);
      const avgDailySales = validHistoryDays > 0 ? totalHistorySales / validHistoryDays : 0;

      // Calcular médias por dia da semana
      const averages = calculateAveragesByDayOfWeek(mpSales, allHolidays);
      
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
            projected: Math.round(avgDailySales * 1000) / 1000,
            isHoliday: isHolidayDate
          });
        }
        
        projection = {
          total: Math.round(avgDailySales * validProjectionDays * 1000) / 1000,
          dailyProjection
        };
      } else {
        // Projeção Semanal: considera dia da semana e feriados
        projection = projectConsumption(averages, projectionStartDate, validProjectionDays, allHolidays);
      }
      
      // Aplicar fator de perda se houver
      const lossFactor = rm.loss_factor || 0;
      const projectedWithLoss = projection.total * (1 + lossFactor / 100);

      // Dados de estoque
      const minStock = rm.min_stock || 0;

      // Calcular necessidade de compra
      // Necessidade = Consumo Projetado (com perda) + Estoque Mínimo - Estoque Atual
      const purchaseNeed = Math.max(0, projectedWithLoss + minStock - currentStock);
      
      // Quantidade de compra = Necessidade / Fator de Conversão
      const purchaseQuantity = conversionFactor > 0 ? purchaseNeed / conversionFactor : purchaseNeed;
      
      if (purchaseNeed > 0) {
        productsNeedPurchase++;
      }

      projectionResults.push({
        rawMaterialId: rm.id,
        name: rm.name,
        unit: rm.unit,
        category: rm.category || '',
        lossFactor,
        // Histórico
        totalHistorySales: Math.round(totalHistorySales * 1000) / 1000,
        avgDailySales: Math.round(avgDailySales * 1000) / 1000,
        // Médias por dia da semana
        averagesByDay: {
          domingo: Math.round(averages[0] * 1000) / 1000,
          segunda: Math.round(averages[1] * 1000) / 1000,
          terca: Math.round(averages[2] * 1000) / 1000,
          quarta: Math.round(averages[3] * 1000) / 1000,
          quinta: Math.round(averages[4] * 1000) / 1000,
          sexta: Math.round(averages[5] * 1000) / 1000,
          sabado: Math.round(averages[6] * 1000) / 1000,
          feriado: Math.round(averages.holiday * 1000) / 1000
        },
        // Projeção
        projectedConsumption: Math.round(projectedWithLoss * 1000) / 1000,
        dailyProjection: projection.dailyProjection,
        // Estoque
        currentStock: Math.round(currentStock * 1000) / 1000,
        minStock: Math.round(minStock * 1000) / 1000,
        // Conversão
        conversionFactor: Math.round(conversionFactor * 1000) / 1000,
        purchaseUnit,
        // Necessidade
        purchaseNeed: Math.round(purchaseNeed * 1000) / 1000,
        purchaseQuantity: Math.round(purchaseQuantity * 1000) / 1000,
        needsPurchase: purchaseNeed > 0,
        // Status
        stockStatus: currentStock <= 0 ? 'out' : currentStock <= minStock ? 'low' : 'ok',
        // Produtos vinculados
        linkedSaleProducts,
        linkedStockProducts
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
        totalProducts: rawMaterials.length,
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
    console.error('[MP] Erro na API de projeção:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
