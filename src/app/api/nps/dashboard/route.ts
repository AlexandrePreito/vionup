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

    // Buscar pesquisas do grupo (tipo cliente)
    const { data: pesquisas, error: pesquisasError } = await supabaseAdmin
      .from('nps_pesquisas')
      .select('id')
      .eq('company_group_id', groupId)
      .eq('tipo', 'cliente')
      .eq('ativo', true);

    if (pesquisasError) {
      console.error('Erro ao buscar pesquisas:', pesquisasError);
      return NextResponse.json({ error: pesquisasError.message }, { status: 500 });
    }

    const pesquisaIds = pesquisas?.map((p: any) => p.id) || [];

    // Retorno vazio se não há pesquisas
    if (pesquisaIds.length === 0) {
      return NextResponse.json({
        periodo: { year, month },
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

    // Buscar respostas do período
    let query = supabaseAdmin
      .from('nps_respostas')
      .select(`
        id, nps_score, frequencia_visita, como_conheceu_id, comentario, created_at,
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

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data: respostas, error: respostasError } = await query;
    
    if (respostasError) {
      console.error('Erro ao buscar respostas:', respostasError);
      return NextResponse.json({ error: respostasError.message }, { status: 500 });
    }

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

    // ========== EVOLUÇÃO ÚLTIMOS 6 MESES ==========
    const evolucao = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(y, m, 0).getDate();
      const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      let evolQuery = supabaseAdmin
        .from('nps_respostas')
        .select('nps_score')
        .in('pesquisa_id', pesquisaIds)
        .gte('created_at', start)
        .lte('created_at', `${end}T23:59:59`)
        .not('nps_score', 'is', null);

      if (companyId) {
        evolQuery = evolQuery.eq('company_id', companyId);
      }

      if (employeeId) {
        evolQuery = evolQuery.eq('employee_id', employeeId);
      }

      const { data: evolData } = await evolQuery;
      const prom = (evolData || []).filter((r: any) => r.nps_score >= 4).length;
      const det = (evolData || []).filter((r: any) => r.nps_score <= 2).length;
      const tot = (evolData || []).length;

      evolucao.push({
        mes: `${String(m).padStart(2, '0')}/${y}`,
        mesNome: new Date(y, m - 1).toLocaleString('pt-BR', { month: 'short' }),
        nps_score: tot > 0 ? Math.round(((prom - det) / tot) * 100) : null,
        total: tot
      });
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

    // ========== RETORNO ==========
    return NextResponse.json({
      periodo: { year, month },
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
