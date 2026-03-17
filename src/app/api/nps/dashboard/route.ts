import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const companyId = searchParams.get('company_id');
    const employeeId = searchParams.get('employee_id');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const tiposParam = searchParams.get('tipos');
    const pesquisaIdsParam = searchParams.get('pesquisa_ids');
    const evolucaoPor = (searchParams.get('evolucao_por') || 'dia') as 'dia' | 'mes';

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    // Validar mês e ano
    if (month < 1 || month > 12) {
      return NextResponse.json({ error: 'Mês inválido (deve ser entre 1 e 12)' }, { status: 400 });
    }

    // Período do mês selecionado
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Buscar pesquisas do grupo (filtradas por tipo e/ou IDs específicos)
    let pesquisaQuery = supabaseAdmin
      .from('nps_pesquisas')
      .select('id, nome, tipo')
      .eq('company_group_id', groupId)
      .eq('ativo', true);

    if (pesquisaIdsParam) {
      // Filtrar por pesquisas específicas
      const ids = pesquisaIdsParam.split(',').filter(Boolean);
      pesquisaQuery = pesquisaQuery.in('id', ids);
    } else if (tiposParam) {
      // Filtrar por tipos
      const tipos = tiposParam.split(',').filter(Boolean);
      pesquisaQuery = pesquisaQuery.in('tipo', tipos);
    }
    // Se nenhum filtro, traz todas (cliente + cliente_misterioso)

    const { data: pesquisas, error: pesquisasError } = await pesquisaQuery;

    if (pesquisasError) {
      console.error('Erro ao buscar pesquisas:', pesquisasError);
      return NextResponse.json({ error: pesquisasError.message }, { status: 500 });
    }

    const pesquisaIds = pesquisas?.map((p: any) => p.id) || [];

    // Retorno vazio se não há pesquisas
    if (pesquisaIds.length === 0) {
    return NextResponse.json({
      periodo: { year, month },
        pesquisaCards: [],
        nps: {
          score: 0,
          promotores: 0,
          neutros: 0,
          detratores: 0,
          total: 0,
          percentPromotor: 0,
          percentNeutro: 0,
          percentDetrator: 0
        },
        scores: {},
        evolucao: [],
        comentarios: [],
        frequencia: [],
        origem: []
      });
    }

    // Buscar respostas do período (com paginação para não perder registros)
    const baseQuery = () => {
      let q = supabaseAdmin
        .from('nps_respostas')
        .select(`
          id, pesquisa_id, nps_score, frequencia_visita, como_conheceu_id, comentario, created_at,
          company:companies (id, name),
          employee:employees (id, name),
          como_conheceu:nps_opcoes_origem (id, texto, icone),
          respostas_perguntas:nps_respostas_perguntas (
            nota,
            pergunta:nps_perguntas (id, texto, categoria)
          )
        `)
        .in('pesquisa_id', pesquisaIds)
        .gte('created_at', startDate)
        .lte('created_at', `${endDate}T23:59:59`);

      if (companyId) q = q.eq('company_id', companyId);
      if (employeeId) q = q.eq('employee_id', employeeId);
      return q;
    };

    const allRespostas: any[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore && page < 50) {
      const { data: rows, error: err } = await baseQuery()
        .order('created_at', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (err) {
        console.error('Erro ao buscar respostas:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
      }

      if (rows && rows.length > 0) {
        allRespostas.push(...rows);
        hasMore = rows.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    const respostas = allRespostas;

    // ========== CALCULAR NPS ==========
    const comNps = (respostas || []).filter((r: any) => r.nps_score !== null && r.nps_score !== undefined);
    const promotores = comNps.filter((r: any) => r.nps_score >= 4).length;
    const neutros = comNps.filter((r: any) => r.nps_score === 3).length;
    const detratores = comNps.filter((r: any) => r.nps_score <= 2).length;
    const total = comNps.length;
    const npsScore = total > 0 ? Math.round(((promotores - detratores) / total) * 100) : 0;

    // ========== SCORES POR CATEGORIA ==========
    const scoresPorCat: Record<string, { soma: number; count: number }> = {};
    let somaGeral = 0;
    let countGeral = 0;

    (respostas || []).forEach((r: any) => {
      if (r.respostas_perguntas && Array.isArray(r.respostas_perguntas)) {
        r.respostas_perguntas.forEach((rp: any) => {
          if (rp.nota && rp.pergunta?.categoria) {
            const cat = rp.pergunta.categoria;
            if (!scoresPorCat[cat]) {
              scoresPorCat[cat] = { soma: 0, count: 0 };
            }
            scoresPorCat[cat].soma += rp.nota;
            scoresPorCat[cat].count += 1;
            somaGeral += rp.nota;
            countGeral += 1;
          }
        });
      }
    });

    const scores: Record<string, number> = {
      medio_geral: countGeral > 0 ? Math.round((somaGeral / countGeral) * 100) / 100 : 0
    };
    
    Object.entries(scoresPorCat).forEach(([cat, data]) => {
      if (data.count > 0) {
        const key = cat.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        scores[key] = Math.round((data.soma / data.count) * 100) / 100;
      }
    });

    // ========== EVOLUÇÃO NPS ==========
    // evolucao_por = 'dia' (padrão): por dia do mês filtrado | 'mes': por mês do ano filtrado (ignora mês)
    const evolucao: { mes: string; mesNome: string; nps_score: number | null; total: number }[] = [];

    if (evolucaoPor === 'mes') {
      // Por mês do ano selecionado (Jan a Dez do year)
      for (let m = 1; m <= 12; m++) {
        const start = `${year}-${String(m).padStart(2, '0')}-01`;
        const lastDayOfMonth = new Date(year, m, 0).getDate();
        const end = `${year}-${String(m).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

        let evolQuery = supabaseAdmin
          .from('nps_respostas')
          .select('nps_score')
          .in('pesquisa_id', pesquisaIds)
          .gte('created_at', start)
          .lte('created_at', `${end}T23:59:59`)
          .not('nps_score', 'is', null);

        if (companyId) evolQuery = evolQuery.eq('company_id', companyId);
        if (employeeId) evolQuery = evolQuery.eq('employee_id', employeeId);

        const { data: evolData } = await evolQuery.order('created_at', { ascending: true });
        const prom = (evolData || []).filter((r: any) => r.nps_score >= 4).length;
        const det = (evolData || []).filter((r: any) => r.nps_score <= 2).length;
        const tot = (evolData || []).length;

        evolucao.push({
          mes: `${String(m).padStart(2, '0')}/${year}`,
          mesNome: new Date(year, m - 1).toLocaleString('pt-BR', { month: 'short' }),
          nps_score: tot > 0 ? Math.round(((prom - det) / tot) * 100) : null,
          total: tot
        });
      }
    } else {
      // Por dia do mês filtrado (padrão)
      const lastDay = new Date(year, month, 0).getDate();
      for (let day = 1; day <= lastDay; day++) {
        const start = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const end = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59`;

        let evolQuery = supabaseAdmin
          .from('nps_respostas')
          .select('nps_score')
          .in('pesquisa_id', pesquisaIds)
          .gte('created_at', start)
          .lte('created_at', end)
          .not('nps_score', 'is', null);

        if (companyId) evolQuery = evolQuery.eq('company_id', companyId);
        if (employeeId) evolQuery = evolQuery.eq('employee_id', employeeId);

        const { data: evolData } = await evolQuery.order('created_at', { ascending: true });
        const prom = (evolData || []).filter((r: any) => r.nps_score >= 4).length;
        const det = (evolData || []).filter((r: any) => r.nps_score <= 2).length;
        const tot = (evolData || []).length;

        evolucao.push({
          mes: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
          mesNome: String(day),
          nps_score: tot > 0 ? Math.round(((prom - det) / tot) * 100) : null,
          total: tot
        });
      }
    }

    // ========== COMENTÁRIOS RECENTES ==========
    const comentarios = (respostas || [])
      .filter((r: any) => r.comentario && r.comentario.trim())
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
      .map((r: any) => ({
        id: r.id,
        data: new Date(r.created_at).toLocaleDateString('pt-BR'),
        nota: r.nps_score,
        comentario: r.comentario,
        tipo: r.nps_score >= 4 ? 'promotor' : r.nps_score === 3 ? 'neutro' : 'detrator',
        unidade: r.company?.name || 'N/A',
        garcom: r.employee?.name || null
      }));

    // ========== FREQUÊNCIA DE VISITA ==========
    const freqMap: Record<string, number> = {};
    const freqLabels: Record<string, string> = {
      'primeira_vez': 'Primeira vez',
      'segunda_vez': 'Segunda vez',
      'as_vezes': 'Às vezes',
      'sempre': 'Sempre :)'
    };
    
    (respostas || []).forEach((r: any) => {
      if (r.frequencia_visita) {
        const label = freqLabels[r.frequencia_visita] || r.frequencia_visita;
        freqMap[label] = (freqMap[label] || 0) + 1;
      }
    });
    
    const frequencia = Object.entries(freqMap)
      .map(([opcao, freq]) => ({ opcao, frequencia: freq }))
      .sort((a, b) => {
        const ordem = ['Primeira vez', 'Segunda vez', 'Às vezes', 'Sempre :)'];
        const indexA = ordem.indexOf(a.opcao);
        const indexB = ordem.indexOf(b.opcao);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

    // ========== COMO CONHECEU ==========
    const origemMap: Record<string, { texto: string; icone: string; count: number }> = {};
    (respostas || []).forEach((r: any) => {
      if (r.como_conheceu) {
        const key = r.como_conheceu.texto;
        if (!origemMap[key]) {
          origemMap[key] = { 
            texto: r.como_conheceu.texto, 
            icone: r.como_conheceu.icone || '📌', 
            count: 0 
          };
        }
        origemMap[key].count += 1;
      }
    });
    
    const origem = Object.values(origemMap)
      .map((o) => ({ opcao: o.texto, icone: o.icone, frequencia: o.count }))
      .sort((a, b) => b.frequencia - a.frequencia);

    // ========== CARDS POR PESQUISA (quantidade de respostas por tipo) ==========
    const countPorPesquisa: Record<string, number> = {};
    (respostas || []).forEach((r: any) => {
      const pid = r.pesquisa_id;
      if (pid) {
        countPorPesquisa[pid] = (countPorPesquisa[pid] || 0) + 1;
      }
    });
    const pesquisaCards = (pesquisas || []).map((p: any) => ({
      id: p.id,
      nome: p.nome || 'Pesquisa',
      tipo: p.tipo || 'cliente',
      total: countPorPesquisa[p.id] || 0
    }));

    // ========== RETORNO ==========
    return NextResponse.json({
      periodo: { year, month },
      pesquisaCards,
      nps: {
        score: npsScore,
        promotores,
        neutros,
        detratores,
        total,
        percentPromotor: total > 0 ? Math.round((promotores / total) * 100) : 0,
        percentNeutro: total > 0 ? Math.round((neutros / total) * 100) : 0,
        percentDetrator: total > 0 ? Math.round((detratores / total) * 100) : 0
      },
      scores,
      evolucao,
      comentarios,
      frequencia,
      origem
    });
  } catch (error: any) {
    console.error('Erro na API dashboard NPS:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
