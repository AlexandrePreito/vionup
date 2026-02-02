import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ImportType = 'comentarios' | 'nps' | 'scores' | 'perguntas';

// Função para garantir que a unidade existe
async function ensureUnidade(idEmpresa: string, nomeEmpresa: string): Promise<string> {
  // Busca unidade existente
  const { data: existing } = await supabase
    .from('goomer_unidades')
    .select('id')
    .eq('id_empresa_goomer', idEmpresa)
    .single();

  if (existing) return existing.id;

  // Cria nova unidade
  const { data: newUnidade, error } = await supabase
    .from('goomer_unidades')
    .insert({ id_empresa_goomer: idEmpresa, nome_goomer: nomeEmpresa })
    .select('id')
    .single();

  if (error) throw error;
  return newUnidade.id;
}

// Importar Comentários
async function importComentarios(data: any[]) {
  let imported = 0;
  let updated = 0;
  let errors = 0;

  // Agrupar por empresa para otimizar
  const byEmpresa = new Map<string, any[]>();
  for (const item of data) {
    const key = item.IdEmpresa;
    if (!byEmpresa.has(key)) byEmpresa.set(key, []);
    byEmpresa.get(key)!.push(item);
  }

  for (const [idEmpresa, items] of byEmpresa) {
    try {
      const unidadeId = await ensureUnidade(idEmpresa, items[0].empresa);
      
      const records = items.map(item => ({
        unidade_id: unidadeId,
        mes_referencia: `${item.mes_referencia}-01`,
        data_feedback: item.data_feedback,
        hora_feedback: item.hora_feedback || null,
        telefone: item.telefone || null,
        nps_nota: item.nps_nota,
        nps_value: item.nps_value,
        comentario: item.comentario || null,
        score_medio: item.score_medio,
        score_comida: item.score_comida,
        score_tempo_espera: item.score_tempo_espera,
        score_atendimento_mesa: item.score_atendimento_mesa,
        score_atendimento_recepcao: item.score_atendimento_recepcao,
      }));

      // Inserir em lotes de 1000
      for (let i = 0; i < records.length; i += 1000) {
        const batch = records.slice(i, i + 1000);
        const { error } = await supabase
          .from('goomer_feedbacks')
          .upsert(batch, { 
            onConflict: 'unidade_id,data_feedback,hora_feedback,telefone',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error('Erro ao inserir batch:', error);
          errors += batch.length;
        } else {
          imported += batch.length;
        }
      }
    } catch (err) {
      console.error('Erro na empresa', idEmpresa, err);
      errors += items.length;
    }
  }

  return { imported, updated, errors };
}

// Importar NPS Mensal
async function importNps(data: any[]) {
  let imported = 0;
  let errors = 0;

  for (const item of data) {
    try {
      const unidadeId = await ensureUnidade(item.IdEmpresa, item.empresa);
      
      const { error } = await supabase
        .from('goomer_nps_mensal')
        .upsert({
          unidade_id: unidadeId,
          mes_referencia: `${item.mes_referencia}-01`,
          nps_score: item.nps_score,
          promotores: item.promotores,
          neutros: item.neutros,
          detratores: item.detratores,
          total_respostas: item.total_respostas,
        }, { onConflict: 'unidade_id,mes_referencia' });

      if (error) {
        errors++;
      } else {
        imported++;
      }
    } catch (err) {
      errors++;
    }
  }

  return { imported, updated: 0, errors };
}

// Importar Scores
async function importScores(data: any[]) {
  let imported = 0;
  let errors = 0;

  for (const item of data) {
    try {
      const unidadeId = await ensureUnidade(item.IdEmpresa, item.empresa);
      
      const { error } = await supabase
        .from('goomer_scores_mensal')
        .upsert({
          unidade_id: unidadeId,
          mes_referencia: `${item.mes_referencia}-01`,
          score_medio_geral: item.score_medio_geral,
          categoria: item.categoria,
          score_categoria: item.score_categoria,
        }, { onConflict: 'unidade_id,mes_referencia,categoria' });

      if (error) {
        errors++;
      } else {
        imported++;
      }
    } catch (err) {
      errors++;
    }
  }

  return { imported, updated: 0, errors };
}

// Importar Perguntas
async function importPerguntas(data: any[]) {
  let imported = 0;
  let errors = 0;

  for (const item of data) {
    try {
      const unidadeId = await ensureUnidade(item.IdEmpresa, item.empresa);
      
      const { error } = await supabase
        .from('goomer_pesquisa_respostas')
        .upsert({
          unidade_id: unidadeId,
          mes_referencia: `${item.mes_referencia}-01`,
          pergunta: item.pergunta,
          opcao: item.opcao,
          ordem: item.ordem,
          frequencia: item.frequencia,
        }, { onConflict: 'unidade_id,mes_referencia,pergunta,opcao' });

      if (error) {
        errors++;
      } else {
        imported++;
      }
    } catch (err) {
      errors++;
    }
  }

  return { imported, updated: 0, errors };
}

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();

    if (!type || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { success: false, message: 'Tipo e dados são obrigatórios' },
        { status: 400 }
      );
    }

    let result;

    switch (type as ImportType) {
      case 'comentarios':
        result = await importComentarios(data);
        break;
      case 'nps':
        result = await importNps(data);
        break;
      case 'scores':
        result = await importScores(data);
        break;
      case 'perguntas':
        result = await importPerguntas(data);
        break;
      default:
        return NextResponse.json(
          { success: false, message: 'Tipo de importação inválido' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${result.imported} registros`,
      ...result,
    });

  } catch (error: any) {
    console.error('Erro na importação:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
