import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unidadeId = searchParams.get('unidade_id');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    if (!unidadeId) {
      return NextResponse.json({ error: 'unidade_id é obrigatório' }, { status: 400 });
    }

    // Formatar mês para query
    const mesReferencia = `${year}-${month.toString().padStart(2, '0')}-01`;

    // Buscar unidade
    const { data: unidade } = await supabase
      .from('goomer_unidades')
      .select('*')
      .eq('id', unidadeId)
      .single();

    if (!unidade) {
      return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 });
    }

    // Buscar NPS do mês
    const { data: npsData } = await supabase
      .from('goomer_nps_mensal')
      .select('*')
      .eq('unidade_id', unidadeId)
      .eq('mes_referencia', mesReferencia)
      .single();

    // Buscar scores do mês
    const { data: scoresData } = await supabase
      .from('goomer_scores_mensal')
      .select('*')
      .eq('unidade_id', unidadeId)
      .eq('mes_referencia', mesReferencia);

    // Buscar evolução NPS (últimos 6 meses)
    const { data: evolucaoData } = await supabase
      .from('goomer_nps_mensal')
      .select('mes_referencia, nps_score')
      .eq('unidade_id', unidadeId)
      .not('nps_score', 'is', null)
      .order('mes_referencia', { ascending: true })
      .limit(12);

    // Buscar comentários recentes do mês
    const { data: comentariosData } = await supabase
      .from('goomer_feedbacks')
      .select('data_feedback, nps_nota, comentario')
      .eq('unidade_id', unidadeId)
      .eq('mes_referencia', mesReferencia)
      .not('comentario', 'is', null)
      .not('comentario', 'eq', '')
      .order('data_feedback', { ascending: false })
      .limit(50);

    // Calcular médias dos scores por categoria
    const scoresPorCategoria: Record<string, number> = {};
    if (scoresData) {
      for (const score of scoresData) {
        if (score.categoria && score.score_categoria) {
          // Mapear nomes de categoria
          let key = 'medio_geral';
          if (score.categoria.includes('comida')) key = 'comida';
          else if (score.categoria.includes('espera')) key = 'tempo_espera';
          else if (score.categoria.includes('mesa')) key = 'atendimento_mesa';
          else if (score.categoria.includes('recepção') || score.categoria.includes('recepcao')) key = 'atendimento_recepcao';
          
          scoresPorCategoria[key] = score.score_categoria;
        }
        if (score.score_medio_geral) {
          scoresPorCategoria['medio_geral'] = score.score_medio_geral;
        }
      }
    }

    // Se não tiver scores agregados, calcular dos feedbacks
    if (Object.keys(scoresPorCategoria).length === 0) {
      const { data: feedbackScores } = await supabase
        .from('goomer_feedbacks')
        .select('score_medio, score_comida, score_tempo_espera, score_atendimento_mesa, score_atendimento_recepcao')
        .eq('unidade_id', unidadeId)
        .eq('mes_referencia', mesReferencia);

      if (feedbackScores && feedbackScores.length > 0) {
        const sums = { medio: 0, comida: 0, espera: 0, mesa: 0, recepcao: 0 };
        const counts = { medio: 0, comida: 0, espera: 0, mesa: 0, recepcao: 0 };

        for (const f of feedbackScores) {
          if (f.score_medio) { sums.medio += f.score_medio; counts.medio++; }
          if (f.score_comida) { sums.comida += f.score_comida; counts.comida++; }
          if (f.score_tempo_espera) { sums.espera += f.score_tempo_espera; counts.espera++; }
          if (f.score_atendimento_mesa) { sums.mesa += f.score_atendimento_mesa; counts.mesa++; }
          if (f.score_atendimento_recepcao) { sums.recepcao += f.score_atendimento_recepcao; counts.recepcao++; }
        }

        if (counts.medio > 0) scoresPorCategoria['medio_geral'] = sums.medio / counts.medio;
        if (counts.comida > 0) scoresPorCategoria['comida'] = sums.comida / counts.comida;
        if (counts.espera > 0) scoresPorCategoria['tempo_espera'] = sums.espera / counts.espera;
        if (counts.mesa > 0) scoresPorCategoria['atendimento_mesa'] = sums.mesa / counts.mesa;
        if (counts.recepcao > 0) scoresPorCategoria['atendimento_recepcao'] = sums.recepcao / counts.recepcao;
      }
    }

    // Classificar comentários
    const comentariosRecentes = (comentariosData || []).map(c => ({
      data: new Date(c.data_feedback).toLocaleDateString('pt-BR'),
      nota: c.nps_nota,
      comentario: c.comentario,
      tipo: c.nps_nota >= 9 ? 'promotor' : c.nps_nota >= 7 ? 'neutro' : 'detrator'
    }));

    // Buscar dados de pesquisa (Perguntas.json)
    const { data: pesquisaData } = await supabase
      .from('goomer_pesquisa_respostas')
      .select('pergunta, opcao, frequencia')
      .eq('unidade_id', unidadeId)
      .eq('mes_referencia', mesReferencia)
      .order('ordem');

    // Separar por tipo de pergunta
    const frequencia: { opcao: string; frequencia: number }[] = [];
    const origem: { opcao: string; frequencia: number }[] = [];

    if (pesquisaData) {
      for (const p of pesquisaData) {
        if (p.pergunta?.includes('frequência') || p.pergunta?.includes('frequencia')) {
          frequencia.push({ opcao: p.opcao, frequencia: p.frequencia || 0 });
        } else if (p.pergunta?.includes('interesse') || p.pergunta?.includes('despertou')) {
          origem.push({ opcao: p.opcao, frequencia: p.frequencia || 0 });
        }
      }
    }

    // Montar resposta
    const total = (npsData?.total_respostas || 0);
    const promotores = (npsData?.promotores || 0);
    const neutros = (npsData?.neutros || 0);
    const detratores = (npsData?.detratores || 0);

    const response = {
      unidade,
      periodo: {
        mes: mesReferencia,
        ano: year
      },
      nps: {
        score: npsData?.nps_score || 0,
        promotores,
        neutros,
        detratores,
        total,
        percentPromotor: total > 0 ? (promotores / total) * 100 : 0,
        percentNeutro: total > 0 ? (neutros / total) * 100 : 0,
        percentDetrator: total > 0 ? (detratores / total) * 100 : 0,
      },
      scores: {
        medio_geral: scoresPorCategoria['medio_geral'] || 0,
        comida: scoresPorCategoria['comida'] || 0,
        tempo_espera: scoresPorCategoria['tempo_espera'] || 0,
        atendimento_mesa: scoresPorCategoria['atendimento_mesa'] || 0,
        atendimento_recepcao: scoresPorCategoria['atendimento_recepcao'] || 0,
      },
      evolucao: (evolucaoData || []).map(e => ({
        mes: e.mes_referencia.slice(0, 7),
        nps_score: e.nps_score
      })),
      comentariosRecentes,
      pesquisas: {
        frequencia,
        origem
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Erro ao buscar dashboard:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
