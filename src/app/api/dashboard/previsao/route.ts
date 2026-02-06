import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Feriados nacionais 2025-2026
const FERIADOS = [
  // 2025
  '2025-01-01', '2025-03-03', '2025-03-04', '2025-04-18', '2025-04-21',
  '2025-05-01', '2025-06-19', '2025-09-07', '2025-10-12', '2025-11-02',
  '2025-11-15', '2025-11-20', '2025-12-25',
  // 2026
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-04-03', '2026-04-21',
  '2026-05-01', '2026-06-04', '2026-09-07', '2026-10-12', '2026-11-02',
  '2026-11-15', '2026-12-25',
];

function isFeriado(date: Date): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return FERIADOS.includes(dateStr);
}

function getDayType(date: Date): 'weekday' | 'saturday' | 'sunday' | 'holiday' {
  if (isFeriado(date)) return 'holiday';
  const day = date.getDay();
  if (day === 0) return 'sunday';
  if (day === 6) return 'saturday';
  return 'weekday';
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a: any, b: any) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const groupId = searchParams.get('group_id');
    const periodoBase = searchParams.get('periodo_base') || '6';
    const compararMesAnterior = searchParams.get('comparar_mes_anterior') === 'true';

    if (!companyId || !year || !month) {
      return NextResponse.json(
        { error: 'company_id, year e month são obrigatórios' },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const periodoBaseNum = parseInt(periodoBase);

    console.log('\n========== PREVISÃO DE VENDAS ==========');
    console.log('Empresa:', companyId, 'Ano:', yearNum, 'Mês:', monthNum);

    // 1. Buscar dados da empresa
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, company_group_id')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const companyGroupId = groupId || company.company_group_id;

    // 2. Buscar mapeamentos (IGUAL AO DASHBOARD DE EMPRESAS)
    const { data: companyMappings } = await supabaseAdmin
      .from('company_mappings')
      .select('external_company_id')
      .eq('company_id', companyId)
      .eq('company_group_id', companyGroupId);

    if (!companyMappings || companyMappings.length === 0) {
      return NextResponse.json({ error: 'Nenhum mapeamento encontrado' }, { status: 404 });
    }

    // 3. Buscar external_id (código TEXTO) das empresas externas
    const externalCompanyIds = companyMappings.map((m: any) => m.external_company_id);
    const { data: externalCompanies } = await supabaseAdmin
      .from('external_companies')
      .select('id, external_id')
      .in('id', externalCompanyIds);

    if (!externalCompanies || externalCompanies.length === 0) {
      return NextResponse.json({ error: 'Nenhuma empresa externa encontrada' }, { status: 404 });
    }

    // IMPORTANTE: usar external_id (código texto), igual ao dashboard de empresas
    const externalCodes = externalCompanies.map((ec: any) => ec.external_id);
    console.log('Códigos externos:', externalCodes);

    // Usar externalCodes diretamente (sem formatação)
    const externalCodesFormatted = externalCodes;

    // 4. BUSCAR REALIZADO DO MÊS USANDO MATERIALIZED VIEW (igual dashboard)
    let realizadoTotal = 0;
    const { data: cashFlowSummaries } = await supabaseAdmin
      .from('mv_company_cash_flow_summary')
      .select('total_amount')
      .eq('company_group_id', companyGroupId)
      .in('external_company_id', externalCodesFormatted)
      .eq('year', yearNum)
      .eq('month', monthNum);

    if (cashFlowSummaries && cashFlowSummaries.length > 0) {
      realizadoTotal = cashFlowSummaries.reduce((sum: number, cf: any) => sum + (cf.total_amount || 0), 0);
    }
    console.log('Realizado total (materialized view):', realizadoTotal);

    // 5. Calcular período base para histórico (últimos X meses ANTES do mês atual)
    const endDateForHistory = new Date(yearNum, monthNum - 1, 1); // Primeiro dia do mês selecionado
    const startDateForHistory = new Date(endDateForHistory);
    startDateForHistory.setMonth(startDateForHistory.getMonth() - periodoBaseNum);

    const startDateStr = startDateForHistory.toISOString().split('T')[0];
    const endDateStr = endDateForHistory.toISOString().split('T')[0];

    console.log(`Buscando histórico de ${startDateStr} a ${endDateStr} (${periodoBaseNum} meses)`);

    // 6. Buscar dados históricos AGREGADOS POR DIA usando RPC
    const { data: historicalDaily, error: histError } = await supabaseAdmin
      .rpc('get_historical_daily_totals', {
        p_company_group_id: companyGroupId,
        p_external_company_ids: externalCodesFormatted,
        p_start_date: startDateStr,
        p_end_date: endDateStr
      });

    if (histError) {
      console.error('Erro ao buscar histórico:', histError);
    }

    console.log(`Registros históricos (dias) encontrados: ${historicalDaily?.length || 0}`);

    // 7. Agrupar histórico por DIA DA SEMANA (0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab)
    const valuesByDayOfWeek: Record<number, number[]> = {
      0: [], // Domingo
      1: [], // Segunda
      2: [], // Terça
      3: [], // Quarta
      4: [], // Quinta
      5: [], // Sexta
      6: [], // Sábado
    };

    (historicalDaily || []).forEach((item: { transaction_date: string | Date; day_of_week: number; total: number }) => {
      const dateStr = typeof item.transaction_date === 'string' 
        ? item.transaction_date.split('T')[0]
        : item.transaction_date.toISOString().split('T')[0];
      const date = new Date(dateStr + 'T12:00:00');
      const amount = Number(item.total) || 0;
      
      if (amount > 0) {
        // Se for feriado, adiciona aos sábados
        if (isFeriado(date)) {
          valuesByDayOfWeek[6].push(amount);
        } else {
          valuesByDayOfWeek[item.day_of_week].push(amount);
        }
      }
    });

    console.log('Quantidade de dias por dia da semana:', {
      dom: valuesByDayOfWeek[0].length,
      seg: valuesByDayOfWeek[1].length,
      ter: valuesByDayOfWeek[2].length,
      qua: valuesByDayOfWeek[3].length,
      qui: valuesByDayOfWeek[4].length,
      sex: valuesByDayOfWeek[5].length,
      sab: valuesByDayOfWeek[6].length,
    });

    // 8. Calcular médias e percentis por dia da semana
    const calcStats = (values: number[]) => ({
      media: values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0,
      p25: calculatePercentile(values, 25),
      p75: calculatePercentile(values, 75)
    });

    const mediasPorDia: Record<number, { media: number; p25: number; p75: number }> = {
      0: calcStats(valuesByDayOfWeek[0]), // Domingo
      1: calcStats(valuesByDayOfWeek[1]), // Segunda
      2: calcStats(valuesByDayOfWeek[2]), // Terça
      3: calcStats(valuesByDayOfWeek[3]), // Quarta
      4: calcStats(valuesByDayOfWeek[4]), // Quinta
      5: calcStats(valuesByDayOfWeek[5]), // Sexta
      6: calcStats(valuesByDayOfWeek[6]), // Sábado
    };

    console.log('Médias por dia da semana:', {
      dom: mediasPorDia[0].media.toFixed(2),
      seg: mediasPorDia[1].media.toFixed(2),
      ter: mediasPorDia[2].media.toFixed(2),
      qua: mediasPorDia[3].media.toFixed(2),
      qui: mediasPorDia[4].media.toFixed(2),
      sex: mediasPorDia[5].media.toFixed(2),
      sab: mediasPorDia[6].media.toFixed(2),
    });

    // Manter compatibilidade com estrutura antiga (para os cards)
    const medias = {
      diasUteis: {
        media: [1,2,3,4,5].reduce((sum: number, d: number) => sum + mediasPorDia[d].media, 0) / 5,
        p25: [1,2,3,4,5].reduce((sum: number, d: number) => sum + mediasPorDia[d].p25, 0) / 5,
        p75: [1,2,3,4,5].reduce((sum: number, d: number) => sum + mediasPorDia[d].p75, 0) / 5,
      },
      sabados: mediasPorDia[6],
      domingos: mediasPorDia[0],
    };

    // 9. Configurações de datas
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === yearNum && today.getMonth() + 1 === monthNum;
    const currentDay = isCurrentMonth ? today.getDate() : 0;
    const monthEnd = new Date(yearNum, monthNum, 0);
    const daysInMonth = monthEnd.getDate();

    // 10. Buscar dados diários do mês atual AGREGADOS POR DIA
    const monthStartStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const nextMonthStart = new Date(yearNum, monthNum, 1);
    const nextMonthStr = nextMonthStart.toISOString().split('T')[0];

    console.log('=== DEBUG FILTROS ===');
    console.log('Período buscado:', monthStartStr, 'até', nextMonthStr);
    console.log('external_company_id IN:', externalCodesFormatted);

    // Usar query SQL direta para agregar por dia
    const { data: dailyData, error: dailyError } = await supabaseAdmin
      .rpc('get_daily_cash_flow', {
        p_company_group_id: companyGroupId,
        p_external_company_ids: externalCodesFormatted,
        p_start_date: monthStartStr,
        p_end_date: nextMonthStr
      });

    // Declarar variáveis que serão usadas depois
    let realizadoPorDia: Record<number, number> = {};
    let somaVerificacao = 0;

    if (dailyError) {
      console.error('Erro RPC:', dailyError);
      // Fallback: usar query normal mas sem limit
      console.log('Usando fallback - query normal');
      const { data: currentMonthData } = await supabaseAdmin
        .from('external_cash_flow')
        .select('transaction_date, amount')
        .eq('company_group_id', companyGroupId)
        .in('external_company_id', externalCodesFormatted)
        .gte('transaction_date', monthStartStr)
        .lt('transaction_date', nextMonthStr)
        .order('transaction_date', { ascending: true });

      (currentMonthData || []).forEach((item: any) => {
        const dateStr = typeof item.transaction_date === 'string' 
          ? item.transaction_date.split('T')[0] 
          : new Date(item.transaction_date).toISOString().split('T')[0];
        const parts = dateStr.split('-');
        const day = parseInt(parts[2], 10);
        const amount = Number(item.amount) || 0;
        somaVerificacao += amount;
        if (!realizadoPorDia[day]) realizadoPorDia[day] = 0;
        realizadoPorDia[day] += amount;
      });

      console.log('=== DEBUG REALIZADO POR DIA (FALLBACK) ===');
      console.log('Total de registros do mês:', currentMonthData?.length || 0);
    } else {
      // Agrupar por dia (dados já vêm agregados)
      if (dailyData) {
        dailyData.forEach((item: { day: number; total: number }) => {
          realizadoPorDia[item.day] = Number(item.total) || 0;
          somaVerificacao += Number(item.total) || 0;
        });
      }

      console.log('=== DEBUG REALIZADO POR DIA ===');
    }

    // Logs comuns
    console.log('Dias com dados:', Object.keys(realizadoPorDia).length);
    console.log('Distribuição por dia:', JSON.stringify(realizadoPorDia, null, 2));
    console.log('Soma total:', somaVerificacao);
    console.log(`Soma diária: ${somaVerificacao.toFixed(2)}, Total MV: ${realizadoTotal.toFixed(2)}`);

    // Encontrar o último dia com dados reais
    const diasComDados = Object.keys(realizadoPorDia).map(Number).sort((a: any, b: any) => a - b);
    const ultimoDiaComDados = diasComDados.length > 0 ? Math.max(...diasComDados) : 0;
    console.log('Último dia com dados:', ultimoDiaComDados);

    const diasPassados = isCurrentMonth ? currentDay : daysInMonth;
    const mediaDiaria = diasPassados > 0 ? realizadoTotal / diasPassados : 0;

    // 11. Calcular dias restantes (a partir do último dia com dados)
    const diaCorteParaRestantes = ultimoDiaComDados > 0 ? ultimoDiaComDados : currentDay;
    const diasRestantes = {
      total: isCurrentMonth ? daysInMonth - diaCorteParaRestantes : 0,
      diasUteis: 0,
      sabados: 0,
      domingos: 0,
      feriados: 0
    };

    if (isCurrentMonth) {
      for (let day = diaCorteParaRestantes + 1; day <= daysInMonth; day++) {
        const date = new Date(yearNum, monthNum - 1, day);
        const dayType = getDayType(date);
        if (dayType === 'weekday') diasRestantes.diasUteis++;
        else if (dayType === 'saturday') diasRestantes.sabados++;
        else if (dayType === 'sunday') diasRestantes.domingos++;
        else if (dayType === 'holiday') diasRestantes.feriados++;
      }
    }

    // 12. Calcular cenários usando médias por dia da semana
    let projecaoOtimista = 0;
    let projecaoRealista = 0;
    let projecaoPessimista = 0;

    if (isCurrentMonth) {
      for (let day = diaCorteParaRestantes + 1; day <= daysInMonth; day++) {
        const date = new Date(yearNum, monthNum - 1, day, 12, 0, 0);
        let dayOfWeek = date.getDay(); // 0=Dom, 1=Seg, ..., 6=Sab
        
        // Se for feriado, usar média de sábado
        if (isFeriado(date)) {
          dayOfWeek = 6;
        }
        
        projecaoOtimista += mediasPorDia[dayOfWeek].p75;
        projecaoRealista += mediasPorDia[dayOfWeek].media;
        projecaoPessimista += mediasPorDia[dayOfWeek].p25;
      }
    }

    const cenarios = {
      otimista: realizadoTotal + projecaoOtimista,
      realista: realizadoTotal + projecaoRealista,
      pessimista: realizadoTotal + projecaoPessimista
    };

    // 13. Construir gráfico principal
    const grafico: any[] = [];
    let acumuladoRealizado = 0;
    let acumuladoOtimista = 0;
    let acumuladoRealista = 0;
    let acumuladoPessimista = 0;

    // Usar o último dia com dados ao invés do dia atual
    const diaCorte = Math.min(currentDay, ultimoDiaComDados > 0 ? ultimoDiaComDados : currentDay);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(yearNum, monthNum - 1, day, 12, 0, 0); // Adicionar hora para evitar timezone
      const dateStr = date.toISOString().split('T')[0];
      const dayType = getDayType(date);
      const isPastDay = day <= diaCorte;
      const isFutureDay = day > diaCorte;

      // Acumular realizado
      if (isPastDay) {
        acumuladoRealizado += realizadoPorDia[day] || 0;
      }

      let otimista: number | null = null;
      let realista: number | null = null;
      let pessimista: number | null = null;

      // Projeções começam no último dia com dados
      if (day === diaCorte) {
        acumuladoOtimista = acumuladoRealizado;
        acumuladoRealista = acumuladoRealizado;
        acumuladoPessimista = acumuladoRealizado;
        otimista = acumuladoRealizado;
        realista = acumuladoRealizado;
        pessimista = acumuladoRealizado;
      } else if (isFutureDay) {
        let dayOfWeek = date.getDay();
        
        // Se for feriado, usar média de sábado
        if (isFeriado(date)) {
          dayOfWeek = 6;
        }
        
        const valorOtimista = mediasPorDia[dayOfWeek].p75;
        const valorRealista = mediasPorDia[dayOfWeek].media;
        const valorPessimista = mediasPorDia[dayOfWeek].p25;

        acumuladoOtimista += valorOtimista;
        acumuladoRealista += valorRealista;
        acumuladoPessimista += valorPessimista;

        otimista = acumuladoOtimista;
        realista = acumuladoRealista;
        pessimista = acumuladoPessimista;
      }

      grafico.push({
        dia: day,
        data: dateStr,
        realizado: isPastDay ? acumuladoRealizado : null,
        otimista,
        realista,
        pessimista
      });
    }

    // 14. Gráfico de realizado (valores diários - não acumulados)
    const graficoRealizado: any[] = [];
    let acumuladoParaGrafico = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(yearNum, monthNum - 1, day);
      const dateStr = date.toISOString().split('T')[0];
      const valor = realizadoPorDia[day] || 0;
      acumuladoParaGrafico += valor;
      graficoRealizado.push({ dia: day, data: dateStr, valor, acumulado: acumuladoParaGrafico });
    }

    // 15. Projeção diária (tabela)
    const projecaoDiaria: any[] = [];
    const nomeDias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    if (isCurrentMonth) {
      for (let day = diaCorteParaRestantes + 1; day <= daysInMonth; day++) {
        const date = new Date(yearNum, monthNum - 1, day, 12, 0, 0);
        const dateStr = date.toISOString().split('T')[0];
        let dayOfWeek = date.getDay();
        let tipoDia = nomeDias[dayOfWeek];
        
        // Se for feriado, usar média de sábado mas mostrar como Feriado
        if (isFeriado(date)) {
          tipoDia = 'Feriado';
          dayOfWeek = 6; // Usar média de sábado
        }

        projecaoDiaria.push({
          dia: day,
          data: dateStr,
          tipoDia,
          otimista: mediasPorDia[dayOfWeek].p75,
          realista: mediasPorDia[dayOfWeek].media,
          pessimista: mediasPorDia[dayOfWeek].p25
        });
      }
    }

    // 16. Calcular estatísticas (apenas até o último dia com dados importados)
    const valoresDiarios = graficoRealizado
      .filter((d: any) => d.valor > 0 && d.dia <= ultimoDiaComDados)
      .map((d: any) => d.valor);
    const media = valoresDiarios.length > 0 ? valoresDiarios.reduce((a: number, b: number) => a + b, 0) / valoresDiarios.length : 0;
    const sorted = [...valoresDiarios].sort((a: any, b: any) => a - b);
    const mediana = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

    // Regressão linear (apenas até o último dia com dados importados)
    const dadosComValor = graficoRealizado.filter((d: any) => d.valor > 0 && d.dia <= ultimoDiaComDados);
    let slope = 0, intercept = 0;
    let tendencia: 'crescente' | 'decrescente' | 'estável' = 'estável';

    if (dadosComValor.length > 1) {
      const n = dadosComValor.length;
      const sumX = dadosComValor.reduce((a: number, d: any) => a + d.dia, 0);
      const sumY = dadosComValor.reduce((a: number, d: any) => a + d.valor, 0);
      const sumXY = dadosComValor.reduce((a: number, d: any) => a + d.dia * d.valor, 0);
      const sumX2 = dadosComValor.reduce((a: number, d: any) => a + d.dia * d.dia, 0);
      const denom = n * sumX2 - sumX * sumX;
      if (denom !== 0) {
        slope = (n * sumXY - sumX * sumY) / denom;
        intercept = (sumY - slope * sumX) / n;
        tendencia = slope > 50 ? 'crescente' : slope < -50 ? 'decrescente' : 'estável';
      }
    }

    // 17. Mês anterior (se solicitado)
    let mesAnterior: any = null;
    if (compararMesAnterior) {
      const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
      const prevYear = monthNum === 1 ? yearNum - 1 : yearNum;

      const { data: prevSummary } = await supabaseAdmin
        .from('mv_company_cash_flow_summary')
        .select('total_amount')
        .eq('company_group_id', companyGroupId)
        .in('external_company_id', externalCodesFormatted)
        .eq('year', prevYear)
        .eq('month', prevMonth);

      if (prevSummary && prevSummary.length > 0) {
        const prevTotal = prevSummary.reduce((sum: number, cf: any) => sum + (cf.total_amount || 0), 0);
        const prevMonthEnd = new Date(prevYear, prevMonth, 0);
        const prevMonthStartStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
        const prevMonthEndStr = prevMonthEnd.toISOString().split('T')[0];

        const { data: prevData } = await supabaseAdmin
          .from('external_cash_flow')
          .select('transaction_date, amount')
          .eq('company_group_id', companyGroupId)
          .in('external_company_id', externalCodesFormatted)
          .gte('transaction_date', prevMonthStartStr)
          .lte('transaction_date', prevMonthEndStr)
          .limit(100000);

        const prevPorDia: Record<number, number> = {};
        (prevData || []).forEach((item: any) => {
          const day = new Date(item.transaction_date).getDate();
          if (!prevPorDia[day]) prevPorDia[day] = 0;
          prevPorDia[day] += item.amount || 0;
        });

        const prevGrafico: any[] = [];
        let prevAcumulado = 0;
        for (let day = 1; day <= prevMonthEnd.getDate(); day++) {
          prevAcumulado += prevPorDia[day] || 0;
          prevGrafico.push({ dia: day, valor: prevAcumulado });
        }

        mesAnterior = { total: prevTotal, grafico: prevGrafico };
      }
    }

    console.log('========== RESULTADO ==========');
    console.log('Realizado:', realizadoTotal);
    console.log('Cenários:', cenarios);
    console.log('Dias restantes:', diasRestantes);

    return NextResponse.json({
      empresa: { id: company.id, name: company.name },
      periodo: { year: yearNum, month: monthNum },
      realizado: { total: realizadoTotal, diasPassados, mediaDiaria },
      diasRestantes,
      medias,
      cenarios,
      grafico,
      graficoRealizado,
      projecaoDiaria,
      estatisticas: { media, mediana, tendencia, slope, intercept },
      ultimoDiaComDados,
      mesAnterior
    });
  } catch (error: any) {
    console.error('Erro na previsão:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
