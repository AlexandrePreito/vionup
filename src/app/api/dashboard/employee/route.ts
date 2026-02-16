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
    console.log('Employee ID:', employeeId);
    console.log('Ano:', yearNum, 'Mês:', monthNum);
    console.log('Group ID recebido:', groupId);

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

    const mappedExternalEmployeeUuids = mappings?.map((m: any) => m.external_employee_id) || [];
    console.log('Mapeamentos encontrados:', mappings?.length || 0);
    console.log('UUIDs externos mapeados:', mappedExternalEmployeeUuids);

    let externalEmployeeCodes: string[] = [];
    if (mappedExternalEmployeeUuids.length > 0) {
      const { data: externalEmployees, error: extEmpError } = await supabaseAdmin
        .from('external_employees')
        .select('id, external_id, name')
        .in('id', mappedExternalEmployeeUuids);
      
      if (extEmpError) {
        console.error('Erro ao buscar funcionários externos:', extEmpError);
      } else {
        console.log('Funcionários externos encontrados:', externalEmployees?.length || 0);
        externalEmployeeCodes = externalEmployees?.map((e: any) => e.external_id) || [];
        console.log('Códigos externos:', externalEmployeeCodes);
      }
    } else {
      console.warn('⚠️ Nenhum mapeamento encontrado para o funcionário!');
      console.warn('Verifique se há registros em employee_mappings para este funcionário.');
    }
    console.log('Company Group ID:', companyGroupId);
    console.log('Ano:', yearNum, 'Mês:', monthNum);

    // 3. Buscar faturamento diretamente da tabela external_sales
    // Valor realizado = SUM(total_value)
    // Quantidade de vendas = COUNT(DISTINCT sale_uuid)
    // Ticket médio = SUM(total_value) / COUNT(DISTINCT sale_uuid)
    let totalRevenue = 0;
    let totalQuantity = 0; // Mantido para compatibilidade, mas não usado no ticket médio
    let distinctSalesCount = 0;
    let averageTicket = 0;
    let salesByDate: Record<string, { revenue: number; saleUuids: Set<string> }> = {};
    
    if (externalEmployeeCodes.length > 0) {
      // Buscar diretamente da tabela external_sales (fonte de verdade)
      // Valor total = SUM(total_value)
      // Quantidade de vendas = COUNT(DISTINCT sale_uuid)
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Validação: garantir que as datas estão corretas
      const expectedStartDay = 1;
      const expectedEndDay = new Date(yearNum, monthNum, 0).getDate();
      const actualStartDay = parseInt(startDateStr.split('-')[2]);
      const actualEndDay = parseInt(endDateStr.split('-')[2]);
      
      if (actualStartDay !== expectedStartDay || actualEndDay !== expectedEndDay) {
        console.error('❌ ERRO: Cálculo de datas incorreto!');
        console.error(`   Esperado: ${yearNum}-${String(monthNum).padStart(2, '0')}-01 a ${yearNum}-${String(monthNum).padStart(2, '0')}-${expectedEndDay}`);
        console.error(`   Obtido: ${startDateStr} a ${endDateStr}`);
      }
      
      // Log detalhado do período
      console.log(`📅 Cálculo do período:`);
      console.log(`   yearNum: ${yearNum}, monthNum: ${monthNum}`);
      console.log(`   startDate objeto: ${startDate.toISOString()}`);
      console.log(`   endDate objeto: ${endDate.toISOString()}`);
      console.log(`   startDateStr: ${startDateStr} (deve ser ${yearNum}-${String(monthNum).padStart(2, '0')}-01)`);
      console.log(`   endDateStr: ${endDateStr} (deve ser ${yearNum}-${String(monthNum).padStart(2, '0')}-${expectedEndDay})`);
      
      console.log('=================================================');
      console.log('🔍 BUSCANDO VENDAS DA TABELA external_sales');
      console.log(`📅 Período: ${startDateStr} a ${endDateStr}`);
      console.log(`🏢 Company Group ID: ${companyGroupId}`);
      console.log(`👤 External Employee Codes (${externalEmployeeCodes.length}):`, JSON.stringify(externalEmployeeCodes, null, 2));
      console.log(`📊 Ano: ${yearNum}, Mês: ${monthNum}`);
      console.log('=================================================');
      
      // Buscar com paginação para não ter limite
      // IMPORTANTE: Supabase limita a 1000 registros por query, mesmo com range maior
      const allDirectSales: any[] = [];
      const pageSize = 1000; // Limite real do Supabase
      let page = 0;
      let hasMore = true;
      const maxPages = 100; // Limite de segurança
      let totalExpected = 0;
      
      // Primeiro, contar quantos registros existem (para debug)
      // Inclui sale_uuid OU venda_id (sync pode popular um ou outro)
      const { count: totalCount } = await supabaseAdmin
        .from('external_sales')
        .select('*', { count: 'exact', head: true })
        .eq('company_group_id', companyGroupId)
        .in('external_employee_id', externalEmployeeCodes)
        .gte('sale_date', startDateStr)
        .lte('sale_date', endDateStr)
        .or('sale_uuid.not.is.null,venda_id.not.is.null');
      
      console.log(`📊 Total de registros esperados (count): ${totalCount || 'N/A'}`);
      totalExpected = totalCount || 0;
      
      while (hasMore && page < maxPages) {
        const from = page * pageSize;
        const to = (page + 1) * pageSize - 1;
        
        console.log(`📄 Buscando página ${page + 1} (range: ${from} a ${to})...`);
        
        const { data: directSales, error: directError } = await supabaseAdmin
          .from('external_sales')
          .select('total_value, sale_uuid, venda_id, external_employee_id, sale_date')
          .eq('company_group_id', companyGroupId)
          .in('external_employee_id', externalEmployeeCodes)
          .gte('sale_date', startDateStr)
          .lte('sale_date', endDateStr)
          .or('sale_uuid.not.is.null,venda_id.not.is.null')
          .order('sale_date', { ascending: true })
          .order('sale_uuid', { ascending: true })
          .range(from, to);
        
        if (directError) {
          console.error('❌ Erro ao buscar vendas diretamente:', directError);
          console.error('   Detalhes do erro:', JSON.stringify(directError, null, 2));
          hasMore = false;
        } else {
          if (directSales && directSales.length > 0) {
            allDirectSales.push(...directSales);
            console.log(`✅ Página ${page + 1}: ${directSales.length} registros encontrados (total acumulado: ${allDirectSales.length} de ${totalExpected})`);
            
            // Verificar se pegou todos os registros
            if (allDirectSales.length >= totalExpected) {
              console.log(`✅ Todos os ${totalExpected} registros foram buscados!`);
              hasMore = false;
            } else if (directSales.length === 0) {
              // Página vazia, parar
              console.log(`✅ Página ${page + 1} vazia. Busca concluída.`);
              hasMore = false;
            } else {
              // Continuar para próxima página se ainda há registros para buscar
              // IMPORTANTE: Supabase pode limitar a 1000 mesmo com range maior
              // Por isso continuamos mesmo se retornou menos que pageSize
              if (allDirectSales.length < totalExpected) {
                page++;
                console.log(`📄 Continuando para página ${page + 1}... (${allDirectSales.length} de ${totalExpected} registros já buscados)`);
              } else {
                hasMore = false;
              }
            }
          } else {
            hasMore = false;
            if (page === 0) {
              console.log('⚠️ Nenhum registro encontrado na primeira página!');
            } else {
              console.log(`✅ Página ${page + 1} vazia. Busca concluída.`);
            }
          }
        }
      }
      
      if (page >= maxPages) {
        console.warn(`⚠️ Atingido limite máximo de ${maxPages} páginas! Pode haver mais registros.`);
        console.warn(`   Registros buscados: ${allDirectSales.length} de ${totalExpected}`);
      }
      
      if (allDirectSales.length > 0) {
        // Verificar se as datas dos registros estão dentro do período esperado
        const datesOutOfRange = allDirectSales.filter((s: any) => {
          if (!s.sale_date) return true;
          const saleDate = new Date(s.sale_date).toISOString().split('T')[0];
          return saleDate < startDateStr || saleDate > endDateStr;
        });
        
        if (datesOutOfRange.length > 0) {
          console.warn(`⚠️ ATENÇÃO: ${datesOutOfRange.length} registros com datas fora do período esperado!`);
          console.warn(`   Período esperado: ${startDateStr} a ${endDateStr}`);
          console.warn(`   Exemplo de data fora: ${datesOutOfRange[0]?.sale_date}`);
        }
        
        // Calcular valor total: SUM(total_value)
        totalRevenue = allDirectSales.reduce((sum: number, s: any) => sum + (s.total_value || 0), 0);
        
        // Calcular quantidade de vendas distintas: COUNT(DISTINCT sale_uuid ou venda_id)
        // Sync pode popular venda_id ou sale_uuid; usamos o que estiver preenchido
        const uniqueSaleUuids = new Set<string>();
        const salesByCode: Record<string, { count: number; revenue: number }> = {};
        salesByDate = {};
        
        allDirectSales.forEach((s: any) => {
          const saleId = (s.sale_uuid || s.venda_id || '').toString().trim();
          if (saleId) uniqueSaleUuids.add(saleId);
          // Agrupar por código externo para debug
          const code = s.external_employee_id || 'UNKNOWN';
          if (!salesByCode[code]) {
            salesByCode[code] = { count: 0, revenue: 0 };
          }
          salesByCode[code].count++;
          salesByCode[code].revenue += s.total_value || 0;
          
          // Agrupar por data (revenue + distinct sale_uuid/venda_id para transactions)
          const saleDate = s.sale_date ? new Date(s.sale_date).toISOString().split('T')[0] : 'SEM_DATA';
          if (saleDate !== 'SEM_DATA') {
            if (!salesByDate[saleDate]) {
              salesByDate[saleDate] = { revenue: 0, saleUuids: new Set() };
            }
            salesByDate[saleDate].revenue += s.total_value || 0;
            if (saleId) salesByDate[saleDate].saleUuids.add(saleId);
          }
        });
        distinctSalesCount = uniqueSaleUuids.size;
        
        console.log('=================================================');
        console.log(`✅ Total de registros processados: ${allDirectSales.length}`);
        console.log(`✅ Valor total (SUM total_value): R$ ${totalRevenue.toFixed(2)}`);
        console.log(`✅ Quantidade de vendas distintas (COUNT DISTINCT sale_uuid): ${distinctSalesCount}`);
        console.log(`✅ Vendas por código externo:`, salesByCode);
        console.log(`✅ Primeiras 5 datas com vendas:`, Object.keys(salesByDate).slice(0, 5).map(d => `${d}: ${salesByDate[d].saleUuids.size} vendas, R$ ${salesByDate[d].revenue.toFixed(2)}`));
        console.log(`✅ Últimas 5 datas com vendas:`, Object.keys(salesByDate).slice(-5).map(d => `${d}: ${salesByDate[d].saleUuids.size} vendas, R$ ${salesByDate[d].revenue.toFixed(2)}`));
        console.log(`✅ Exemplo de sale_uuid (primeiros 3):`, Array.from(uniqueSaleUuids).slice(0, 3));
        console.log('=================================================');
      } else {
        console.log('⚠️ Nenhuma venda encontrada na tabela external_sales para o período.');
        console.log(`   Verificando se há dados sem filtro de sale_uuid...`);
        
        // Debug: verificar se há registros sem o filtro de sale_uuid
        const { data: debugSales } = await supabaseAdmin
          .from('external_sales')
          .select('total_value, sale_uuid, external_employee_id')
          .eq('company_group_id', companyGroupId)
          .in('external_employee_id', externalEmployeeCodes)
          .gte('sale_date', startDateStr)
          .lte('sale_date', endDateStr)
          .limit(10);
        
        if (debugSales && debugSales.length > 0) {
          console.log(`⚠️ Encontrados ${debugSales.length} registros SEM filtro de sale_uuid`);
          console.log(`   Exemplo:`, debugSales[0]);
          const nullCount = debugSales.filter(s => !s.sale_uuid || s.sale_uuid === null).length;
          console.log(`   Registros com sale_uuid NULL: ${nullCount}`);
        }
      }

      // Calcular ticket médio: SUM(total_value) / COUNT(DISTINCT sale_uuid)
      if (distinctSalesCount > 0) {
        averageTicket = totalRevenue / distinctSalesCount;
        console.log('Ticket médio calculado (totalRevenue / distinctSalesCount):', averageTicket);
      } else {
        console.log('⚠️ Não foi possível calcular ticket médio: nenhuma venda distinta encontrada');
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

    // 6. Buscar vendas por produto: tentar view; se vazia, buscar direto em external_sales
    let salesByProduct: Record<string, { quantity: number; value: number }> = {};
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = new Date(yearNum, monthNum, 0).toISOString().split('T')[0];

    if (externalEmployeeCodes.length > 0) {
      const { data: productSales } = await supabaseAdmin
        .from('mv_employee_product_sales')
        .select('external_product_id, total_value, total_quantity')
        .eq('company_group_id', companyGroupId)
        .in('external_employee_id', externalEmployeeCodes)
        .eq('year', yearNum)
        .eq('month', monthNum);

      if (productSales && productSales.length > 0) {
        for (const ps of productSales) {
          const key = String(ps.external_product_id ?? '');
          salesByProduct[key] = {
            quantity: ps.total_quantity || 0,
            value: ps.total_value || 0
          };
        }
      }

      // Fallback: sempre buscar em external_sales e preencher onde a view está vazia/zero (igual equipe)
      const employeeIdsToTry = [...new Set([...externalEmployeeCodes, ...mappedExternalEmployeeUuids])];
      const fallbackByProduct: Record<string, { quantity: number; value: number }> = {};
      const fallbackProductPageSize = 1000;
      let fallbackProductPage = 0;
      let fallbackProductHasMore = true;
      while (fallbackProductHasMore && fallbackProductPage < 100) {
        const fFrom = fallbackProductPage * fallbackProductPageSize;
        const fTo = fFrom + fallbackProductPageSize - 1;
        const { data: salesRows } = await supabaseAdmin
          .from('external_sales')
          .select('external_product_id, quantity, total_value')
          .eq('company_group_id', companyGroupId)
          .in('external_employee_id', employeeIdsToTry)
          .gte('sale_date', startDate)
          .lte('sale_date', endDate)
          .order('sale_date', { ascending: true })
          .range(fFrom, fTo);

        if (salesRows && salesRows.length > 0) {
          for (const row of salesRows) {
            const key = String(row.external_product_id ?? '').trim();
            if (!fallbackByProduct[key]) fallbackByProduct[key] = { quantity: 0, value: 0 };
            fallbackByProduct[key].quantity += Number(row.quantity) || 0;
            fallbackByProduct[key].value += Number(row.total_value) || 0;
          }
        }
        fallbackProductHasMore = salesRows && salesRows.length === fallbackProductPageSize;
        fallbackProductPage++;
      }
      for (const key of Object.keys(fallbackByProduct)) {
        const current = salesByProduct[key]?.quantity ?? 0;
        if (current === 0 && fallbackByProduct[key].quantity > 0) {
          if (!salesByProduct[key]) salesByProduct[key] = { quantity: 0, value: 0 };
          salesByProduct[key].quantity = fallbackByProduct[key].quantity;
          salesByProduct[key].value = fallbackByProduct[key].value;
        }
      }
    }

    // 7. Calcular ranking do funcionário (mesma base da página Equipe: external_sales, mesmo período e filtros)
    let ranking = { position: 0, total: 0 };
    
    if (companyId) {
      const { data: companyEmployees } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (companyEmployees && companyEmployees.length > 0) {
        const { data: allMappings } = await supabaseAdmin
          .from('employee_mappings')
          .select('employee_id, external_employee_id')
          .in('employee_id', companyEmployees.map((e: any) => e.id))
          .eq('company_group_id', companyGroupId);

        if (allMappings && allMappings.length > 0) {
          const { data: allExternalEmployees } = await supabaseAdmin
            .from('external_employees')
            .select('id, external_id')
            .in('id', allMappings.map((m: any) => m.external_employee_id));

          const uuidToCodeRank: Record<string, string> = {};
          if (allExternalEmployees) {
            for (const ee of allExternalEmployees) {
              uuidToCodeRank[ee.id] = ee.external_id;
            }
          }

          const employeeCodesRank: Record<string, string[]> = {};
          for (const mapping of allMappings) {
            const code = uuidToCodeRank[mapping.external_employee_id];
            if (code) {
              if (!employeeCodesRank[mapping.employee_id]) {
                employeeCodesRank[mapping.employee_id] = [];
              }
              employeeCodesRank[mapping.employee_id].push(code);
            }
          }

          const allCodesRank = Object.values(employeeCodesRank).flat();
          if (allCodesRank.length > 0) {
            const rankStart = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
            const rankEnd = new Date(yearNum, monthNum, 0).toISOString().split('T')[0];
            const rankPageSize = 1000;
            let rankPage = 0;
            let rankHasMore = true;
            const rankingSalesByCode: Record<string, number> = {};

            while (rankHasMore && rankPage < 100) {
              const from = rankPage * rankPageSize;
              const to = from + rankPageSize - 1;
              const { data: rankRows } = await supabaseAdmin
                .from('external_sales')
                .select('external_employee_id, total_value')
                .eq('company_group_id', companyGroupId)
                .in('external_employee_id', allCodesRank)
                .gte('sale_date', rankStart)
                .lte('sale_date', rankEnd)
                .or('sale_uuid.not.is.null,venda_id.not.is.null')
                .order('sale_date', { ascending: true })
                .range(from, to);

              if (rankRows && rankRows.length > 0) {
                for (const row of rankRows) {
                  const code = String(row.external_employee_id ?? '').trim();
                  if (!rankingSalesByCode[code]) rankingSalesByCode[code] = 0;
                  rankingSalesByCode[code] += Number(row.total_value) || 0;
                }
              }
              rankHasMore = rankRows && rankRows.length === rankPageSize;
              rankPage++;
            }

            const employeeSales: { employeeId: string; total: number }[] = [];
            for (const emp of companyEmployees) {
              const codes = employeeCodesRank[emp.id] || [];
              let total = 0;
              for (const code of codes) {
                total += rankingSalesByCode[code] || 0;
              }
              employeeSales.push({ employeeId: emp.id, total });
            }

            employeeSales.sort((a: any, b: any) => b.total - a.total);
            const position = employeeSales.findIndex((e: any) => e.employeeId === employeeId) + 1;
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
            const externalProductUuids = productMappings.map((pm: any) => pm.external_product_id);
            const { data: externalProducts } = await supabaseAdmin
              .from('external_products')
              .select('id, external_id')
              .in('id', externalProductUuids);

            // View/external_sales podem usar external_product_id como código (external_id) ou UUID
            const byCode: Record<string, string> = {};
            (externalProducts || []).forEach((ep: any) => { byCode[ep.id] = ep.external_id; });
            for (const pm of productMappings) {
              const uuid = String(pm.external_product_id ?? '').trim();
              const code = (byCode[pm.external_product_id] ?? '').trim();
              const qtyFromCode = code && salesByProduct[code] ? salesByProduct[code].quantity : 0;
              const qtyFromUuid = uuid && salesByProduct[uuid] ? salesByProduct[uuid].quantity : 0;
              realized = Math.max(realized, qtyFromCode || qtyFromUuid);
            }
          }
        }

        const progress = goal.goal_value > 0 ? (realized / goal.goal_value) * 100 : 0;
        const progressRounded = Math.round(progress * 10) / 10;

        // Status proporcional ao mês: só no mês vigente; mês passado = bateu ou não bateu
        const now = new Date();
        const isCurrentMonth = now.getFullYear() === yearNum && now.getMonth() + 1 === monthNum;
        let status: string;
        if (progress >= 100) {
          status = 'achieved';
        } else if (!isCurrentMonth) {
          status = 'behind'; // mês fechado: só "atingida" ou "não atingida"
        } else {
          const dayOfMonth = now.getDate();
          const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
          const monthProgress = (dayOfMonth / daysInMonth) * 100; // % do mês já decorrido
          const remainingTime = Math.max(0, 100 - monthProgress); // % do mês que falta
          const remainingGoal = 100 - progress; // % da meta que falta
          if (remainingGoal > remainingTime) {
            status = 'behind'; // Alerta: falta mais % da meta do que % do mês
          } else if (progress >= 80) {
            status = 'almost'; // Quase lá: perto da meta e no ritmo
          } else {
            status = 'ontrack'; // No caminho: tempo suficiente para fechar
          }
        }

        return {
          id: goal.id,
          productId: goal.product_id,
          productName,
          goalValue: goal.goal_value,
          goalUnit: goal.goal_unit,
          realized,
          progress: progressRounded,
          status
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

      // Buscar vendas diárias com paginação para não ter limite
      const allDailySales: any[] = [];
      const pageSize = 10000;
      let page = 0;
      let hasMore = true;
      const maxPages = 100; // Limite de segurança
      
      while (hasMore && page < maxPages) {
        const { data: dailySales, error: dailyError } = await supabaseAdmin
          .from('external_sales')
          .select('sale_date, total_value')
          .eq('company_group_id', companyGroupId)
          .in('external_employee_id', externalEmployeeCodes)
          .gte('sale_date', startDate.toISOString().split('T')[0])
          .lte('sale_date', endDate.toISOString().split('T')[0])
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (dailyError) {
          console.error('Erro ao buscar vendas diárias:', dailyError);
          hasMore = false;
        } else {
          if (dailySales && dailySales.length > 0) {
            allDailySales.push(...dailySales);
            if (dailySales.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        }
      }
      
      const dailySales = allDailySales;

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

    // 11. Montar vendas diárias para gráfico (igual tela Realizado)
    const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const lastDayOfMonth = new Date(yearNum, monthNum, 0).getDate();
    const dailyMap = new Map<string, { revenue: number; transactions: number }>();
    
    for (let day = 1; day <= lastDayOfMonth; day++) {
      const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyMap.set(dateStr, { revenue: 0, transactions: 0 });
    }
    
    if (Object.keys(salesByDate).length > 0) {
      for (const [dateStr, data] of Object.entries(salesByDate)) {
        if (dailyMap.has(dateStr)) {
          dailyMap.set(dateStr, {
            revenue: Math.round(data.revenue * 100) / 100,
            transactions: data.saleUuids?.size ?? 0
          });
        }
      }
    }
    
    const dailyRevenue = Array.from(dailyMap.entries()).map(([date, data]) => {
      const dateObj = new Date(date + 'T12:00:00');
      const dayOfWeekIndex = dateObj.getDay();
      return {
        date,
        day: dateObj.getDate(),
        dayOfWeek: DAYS_OF_WEEK[dayOfWeekIndex] || 'Dom',
        revenue: data.revenue,
        transactions: data.transactions
      };
    }).sort((a, b) => a.day - b.day);

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
        month: monthNum,
        isCurrentMonth: (() => {
          const n = new Date();
          return n.getFullYear() === yearNum && n.getMonth() + 1 === monthNum;
        })()
      },
      revenue: {
        goal: revenueGoal,
        realized: Math.round(totalRevenue * 100) / 100,
        progress: Math.round(revenueProgress * 10) / 10,
        status: revenueProgress >= 100 ? 'achieved' : revenueProgress >= 70 ? 'ontrack' : 'behind'
      },
      sales: {
        count: distinctSalesCount || 0,
        averageTicket: Math.round(averageTicket * 100) / 100 || 0,
        totalQuantity: totalQuantity || 0
      },
      dailyRevenue,
      tendency,
      products: productGoalsWithRealized,
      summary: {
        totalProductGoals: productGoalsWithRealized.length,
        productsAchieved: productGoalsWithRealized.filter((p: any) => p.status === 'achieved').length,
        productsAlmost: productGoalsWithRealized.filter((p: any) => p.status === 'almost').length,
        productsOnTrack: productGoalsWithRealized.filter((p: any) => p.status === 'ontrack').length,
        productsBehind: productGoalsWithRealized.filter((p: any) => p.status === 'behind').length
      }
    };

    console.log('=================================================');
    console.log('📊 RESUMO FINAL DOS DADOS CALCULADOS:');
    console.log(`💰 Valor Realizado (totalRevenue): R$ ${totalRevenue.toFixed(2)}`);
    console.log(`📦 Quantidade de Vendas (distinctSalesCount): ${distinctSalesCount}`);
    console.log(`🎫 Ticket Médio (averageTicket): R$ ${averageTicket.toFixed(2)}`);
    console.log(`📈 Progresso: ${revenueProgress.toFixed(1)}%`);
    console.log(`📅 Período: ${yearNum}-${String(monthNum).padStart(2, '0')}`);
    console.log(`👤 Employee ID: ${employeeId}`);
    console.log(`🏢 Company Group ID: ${companyGroupId}`);
    console.log(`🔑 External Employee Codes: ${JSON.stringify(externalEmployeeCodes)}`);
    console.log('=================================================\n');
    
    // Validação: verificar se os valores fazem sentido
    if (totalRevenue > 0 && distinctSalesCount === 0) {
      console.warn('⚠️ ATENÇÃO: Valor total > 0 mas nenhuma venda distinta encontrada!');
    }
    if (distinctSalesCount > 0 && totalRevenue === 0) {
      console.warn('⚠️ ATENÇÃO: Vendas encontradas mas valor total = 0!');
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro na API de dashboard do funcionário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
