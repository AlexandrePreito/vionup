import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Função auxiliar para determinar tipo NPS
const getTipoNps = (score: number): 'promotor' | 'neutro' | 'detrator' => {
  if (score >= 4) return 'promotor';
  if (score === 3) return 'neutro';
  return 'detrator';
};

// GET - Listar respostas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pesquisaId = searchParams.get('pesquisa_id');
    const companyId = searchParams.get('company_id');
    const employeeId = searchParams.get('employee_id');
    const tipoNps = searchParams.get('tipo_nps'); // promotor, neutro, detrator
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('nps_respostas')
      .select(`
        *,
        pesquisa:nps_pesquisas (id, nome, tipo),
        company:companies (id, name),
        employee:employees (id, name),
        como_conheceu:nps_opcoes_origem (id, texto, icone),
        respostas_perguntas:nps_respostas_perguntas (
          id, nota, texto_resposta,
          pergunta:nps_perguntas (id, texto, categoria)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (pesquisaId) {
      query = query.eq('pesquisa_id', pesquisaId);
    }
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (dataInicio) {
      query = query.gte('created_at', dataInicio);
    }
    if (dataFim) {
      query = query.lte('created_at', `${dataFim}T23:59:59`);
    }

    // Filtro por tipo NPS
    if (tipoNps === 'promotor') {
      query = query.gte('nps_score', 4);
    } else if (tipoNps === 'neutro') {
      query = query.eq('nps_score', 3);
    } else if (tipoNps === 'detrator') {
      query = query.lte('nps_score', 2);
    }

    const { data, error, count } = await query;
    
    if (error) {
      console.error('Erro ao buscar respostas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Adicionar tipo_nps a cada resposta
    const respostas = (data || []).map((r: any) => ({
      ...r,
      tipo_nps: getTipoNps(r.nps_score)
    }));

    return NextResponse.json({
      respostas,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('Erro interno ao buscar respostas:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar resposta (formulário público)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      link_hash,
      nome_respondente,
      telefone_respondente,
      nps_score,
      frequencia_visita,
      como_conheceu_id,
      comentario,
      respostas_perguntas,
      confirmacoes_uso,
      dispositivo,
      user_agent
    } = body;

    console.log('Recebendo resposta NPS:', {
      link_hash,
      nome_respondente,
      nps_score,
      respostas_perguntas_count: respostas_perguntas?.length || 0,
      confirmacoes_uso_count: confirmacoes_uso?.length || 0
    });

    // Validações
    if (!link_hash) {
      return NextResponse.json({ error: 'Link inválido' }, { status: 400 });
    }
    
    if (!nome_respondente || nome_respondente.trim().length < 2) {
      return NextResponse.json(
        { error: 'Nome é obrigatório (mínimo 2 caracteres)' },
        { status: 400 }
      );
    }
    
    if (!nps_score || nps_score < 1 || nps_score > 5) {
      return NextResponse.json(
        { error: 'Nota NPS inválida (deve ser de 1 a 5)' },
        { status: 400 }
      );
    }
    
    if (!comentario || comentario.trim().length < 5) {
      return NextResponse.json(
        { error: 'Comentário é obrigatório (mínimo 5 caracteres)' },
        { status: 400 }
      );
    }

    // Buscar link
    const { data: link, error: linkError } = await supabaseAdmin
      .from('nps_links')
      .select(`
        *,
        pesquisa:nps_pesquisas(id, tipo, ativo, company_group_id)
      `)
      .eq('hash_link', link_hash)
      .eq('ativo', true)
      .single();

    if (linkError || !link) {
      return NextResponse.json(
        { error: 'Link não encontrado ou inativo' },
        { status: 404 }
      );
    }

    // Verificar se pesquisa está ativa
    if (!link.pesquisa || !link.pesquisa.ativo) {
      return NextResponse.json(
        { error: 'Pesquisa desativada' },
        { status: 403 }
      );
    }

    // Buscar perguntas obrigatórias da pesquisa com informações de confirmação
    const { data: perguntasObrigatorias, error: perguntasError } = await supabaseAdmin
      .from('nps_pesquisa_perguntas')
      .select(`
        pergunta_id, 
        obrigatoria,
        pergunta:nps_perguntas(id, requer_confirmacao_uso)
      `)
      .eq('pesquisa_id', link.pesquisa.id)
      .eq('obrigatoria', true);

    if (perguntasError) {
      console.error('Erro ao buscar perguntas obrigatórias:', perguntasError);
    }

    // Validar respostas das perguntas obrigatórias
    if (perguntasObrigatorias && perguntasObrigatorias.length > 0) {
      // Criar mapa de confirmações de uso
      const confirmacoesMap = new Map();
      if (confirmacoes_uso && Array.isArray(confirmacoes_uso)) {
        confirmacoes_uso.forEach((c: any) => {
          confirmacoesMap.set(c.pergunta_id, c.confirmou_uso);
        });
      }

      // Filtrar perguntas que realmente precisam ser respondidas
      // (não requerem confirmação OU requerem e confirmou uso)
      const perguntasQuePrecisamResposta = perguntasObrigatorias.filter((p: any) => {
        const requerConfirmacao = p.pergunta?.requer_confirmacao_uso;
        if (!requerConfirmacao) {
          // Se não requer confirmação, precisa de resposta
          return true;
        }
        // Se requer confirmação, só precisa de resposta se confirmou uso
        const confirmou = confirmacoesMap.get(p.pergunta_id);
        return confirmou === true;
      });

      const perguntasObrigatoriasIds = perguntasQuePrecisamResposta.map((p: any) => p.pergunta_id);
      const respostasFornecidas = (respostas_perguntas || []).map((r: any) => r.pergunta_id);
      
      const faltando = perguntasObrigatoriasIds.filter(
        (id: string) => !respostasFornecidas.includes(id)
      );
      
      if (faltando.length > 0) {
        console.error('Perguntas obrigatórias faltando:', faltando);
        return NextResponse.json(
          { error: `Perguntas obrigatórias não respondidas: ${faltando.length}` },
          { status: 400 }
        );
      }
    }

    // Criar resposta principal
    // Nota: tipo_nps é calculado dinamicamente a partir de nps_score quando necessário
    const { data: resposta, error: respostaError } = await supabaseAdmin
      .from('nps_respostas')
      .insert({
        pesquisa_id: link.pesquisa.id,
        link_id: link.id,
        company_id: link.company_id,
        employee_id: link.employee_id,
        nome_respondente: nome_respondente.trim(),
        telefone_respondente: telefone_respondente?.trim() || null,
        nps_score,
        frequencia_visita: frequencia_visita || null,
        como_conheceu_id: como_conheceu_id || null,
        comentario: comentario.trim(),
        dispositivo: dispositivo || null,
        user_agent: user_agent || null
      })
      .select()
      .single();

    if (respostaError) {
      console.error('Erro ao criar resposta:', respostaError);
      console.error('Detalhes do erro:', {
        code: respostaError.code,
        message: respostaError.message,
        details: respostaError.details,
        hint: respostaError.hint
      });
      return NextResponse.json({ 
        error: respostaError.message || 'Erro ao salvar resposta',
        details: respostaError.details 
      }, { status: 500 });
    }

    // Salvar respostas das perguntas
    if (respostas_perguntas && Array.isArray(respostas_perguntas) && respostas_perguntas.length > 0) {
      // Criar um mapa de confirmações de uso por pergunta_id
      const confirmacoesMap = new Map();
      if (confirmacoes_uso && Array.isArray(confirmacoes_uso)) {
        confirmacoes_uso.forEach((c: any) => {
          confirmacoesMap.set(c.pergunta_id, c.confirmou_uso);
        });
      }

      const respostasPerguntasData = respostas_perguntas.map((r: any) => {
        const confirmou = confirmacoesMap.get(r.pergunta_id);
        return {
          resposta_id: resposta.id,
          pergunta_id: r.pergunta_id,
          nota: r.nota || null,
          texto_resposta: r.texto_resposta?.trim() || null,
          confirmou_uso: confirmou !== undefined ? confirmou : null
        };
      });

      const { error: respostasPerguntasError } = await supabaseAdmin
        .from('nps_respostas_perguntas')
        .insert(respostasPerguntasData);

      if (respostasPerguntasError) {
        console.error('Erro ao salvar respostas das perguntas:', respostasPerguntasError);
        // Não falhar a criação da resposta principal se houver erro nas perguntas
      }
    }
    
    // Salvar confirmações de uso mesmo quando não há resposta (quando respondeu "Não")
    if (confirmacoes_uso && Array.isArray(confirmacoes_uso)) {
      const confirmacoesSemResposta = confirmacoes_uso.filter((c: any) => {
        // Verificar se não há resposta para esta pergunta
        const temResposta = respostas_perguntas?.some((r: any) => r.pergunta_id === c.pergunta_id);
        return !temResposta && c.confirmou_uso === false;
      });

      if (confirmacoesSemResposta.length > 0) {
        const confirmacoesData = confirmacoesSemResposta.map((c: any) => ({
          resposta_id: resposta.id,
          pergunta_id: c.pergunta_id,
          nota: null,
          texto_resposta: null,
          confirmou_uso: false
        }));

        const { error: confirmacoesError } = await supabaseAdmin
          .from('nps_respostas_perguntas')
          .insert(confirmacoesData);

        if (confirmacoesError) {
          console.error('Erro ao salvar confirmações de uso:', confirmacoesError);
          // Não falhar se houver erro
        }
      }
    }

    // Incrementar total_respostas no link
    const { error: updateLinkError } = await supabaseAdmin
      .from('nps_links')
      .update({
        total_respostas: (link.total_respostas || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', link.id);

    if (updateLinkError) {
      console.error('Erro ao incrementar total_respostas:', updateLinkError);
      // Não falhar se houver erro ao atualizar contador
    }

    // Buscar resposta completa com relacionamentos
    const { data: respostaCompleta, error: fetchError } = await supabaseAdmin
      .from('nps_respostas')
      .select(`
        *,
        pesquisa:nps_pesquisas (id, nome, tipo),
        company:companies (id, name),
        employee:employees (id, name),
        como_conheceu:nps_opcoes_origem (id, texto, icone),
        respostas_perguntas:nps_respostas_perguntas (
          id, nota, texto_resposta,
          pergunta:nps_perguntas (id, texto, categoria)
        )
      `)
      .eq('id', resposta.id)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar resposta criada:', fetchError);
      // Retornar resposta sem relacionamentos se houver erro
      return NextResponse.json({ resposta }, { status: 201 });
    }

    return NextResponse.json({ resposta: respostaCompleta }, { status: 201 });
  } catch (error: any) {
    console.error('Erro interno ao criar resposta:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir resposta (admin)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    // Verificar se resposta existe
    const { data: respostaExistente, error: checkError } = await supabaseAdmin
      .from('nps_respostas')
      .select('id, link_id')
      .eq('id', id)
      .single();

    if (checkError || !respostaExistente) {
      return NextResponse.json({ error: 'Resposta não encontrada' }, { status: 404 });
    }

    // Excluir respostas das perguntas primeiro
    const { error: deleteRespostasPerguntasError } = await supabaseAdmin
      .from('nps_respostas_perguntas')
      .delete()
      .eq('resposta_id', id);

    if (deleteRespostasPerguntasError) {
      console.error('Erro ao excluir respostas das perguntas:', deleteRespostasPerguntasError);
      // Continuar mesmo se houver erro
    }

    // Excluir resposta principal
    const { error: deleteError } = await supabaseAdmin
      .from('nps_respostas')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir resposta:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Decrementar total_respostas no link
    if (respostaExistente.link_id) {
      const { data: linkData } = await supabaseAdmin
        .from('nps_links')
        .select('total_respostas')
        .eq('id', respostaExistente.link_id)
        .single();

      if (linkData) {
        const novoTotal = Math.max(0, (linkData.total_respostas || 0) - 1);
        await supabaseAdmin
          .from('nps_links')
          .update({
            total_respostas: novoTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', respostaExistente.link_id);
      }
    }

    return NextResponse.json({ message: 'Resposta excluída com sucesso' });
  } catch (error: any) {
    console.error('Erro interno ao excluir resposta:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
