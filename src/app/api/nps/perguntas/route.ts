import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar perguntas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const categoria = searchParams.get('categoria');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('nps_perguntas')
      .select('*')
      .eq('company_group_id', groupId)
      .eq('ativo', true)
      .order('categoria')
      .order('texto');

    if (categoria) {
      query = query.eq('categoria', categoria);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar perguntas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Extrair categorias únicas
    const categorias = [...new Set((data || []).map((p: any) => p.categoria).filter(Boolean))];

    return NextResponse.json({ perguntas: data || [], categorias });
  } catch (error: any) {
    console.error('Erro interno ao buscar perguntas:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar pergunta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, texto, tipo_resposta, categoria, requer_confirmacao_uso, texto_confirmacao_uso } = body;

    if (!company_group_id || !texto) {
      return NextResponse.json(
        { error: 'company_group_id e texto são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar tipo_resposta
    const tiposValidos = ['estrelas', 'texto'];
    const tipoRespostaFinal = tipo_resposta || 'estrelas';
    
    if (!tiposValidos.includes(tipoRespostaFinal)) {
      return NextResponse.json(
        { error: `tipo_resposta deve ser um dos seguintes: ${tiposValidos.join(', ')}` },
        { status: 400 }
      );
    }

    // Validar confirmação de uso
    if (requer_confirmacao_uso && !texto_confirmacao_uso?.trim()) {
      return NextResponse.json(
        { error: 'texto_confirmacao_uso é obrigatório quando requer_confirmacao_uso é true' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('nps_perguntas')
      .insert({
        company_group_id,
        texto: texto.trim(),
        tipo_resposta: tipoRespostaFinal,
        categoria: categoria || null,
        requer_confirmacao_uso: requer_confirmacao_uso || false,
        texto_confirmacao_uso: requer_confirmacao_uso && texto_confirmacao_uso ? texto_confirmacao_uso.trim() : null,
        ativo: true
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar pergunta:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pergunta: data }, { status: 201 });
  } catch (error: any) {
    console.error('Erro interno ao criar pergunta:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar pergunta
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, texto, tipo_resposta, categoria, ativo, requer_confirmacao_uso, texto_confirmacao_uso } = body;

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    // Verificar se pergunta existe
    const { data: perguntaExistente, error: checkError } = await supabaseAdmin
      .from('nps_perguntas')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !perguntaExistente) {
      return NextResponse.json({ error: 'Pergunta não encontrada' }, { status: 404 });
    }

    // Validar tipo_resposta se fornecido
    if (tipo_resposta !== undefined) {
      const tiposValidos = ['estrelas', 'texto'];
      if (!tiposValidos.includes(tipo_resposta)) {
        return NextResponse.json(
          { error: `tipo_resposta deve ser um dos seguintes: ${tiposValidos.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validar confirmação de uso
    if (requer_confirmacao_uso && !texto_confirmacao_uso?.trim()) {
      return NextResponse.json(
        { error: 'texto_confirmacao_uso é obrigatório quando requer_confirmacao_uso é true' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    
    if (texto !== undefined) updateData.texto = texto.trim();
    if (tipo_resposta !== undefined) updateData.tipo_resposta = tipo_resposta;
    if (categoria !== undefined) updateData.categoria = categoria || null;
    if (ativo !== undefined) updateData.ativo = ativo;
    if (requer_confirmacao_uso !== undefined) updateData.requer_confirmacao_uso = requer_confirmacao_uso;
    if (texto_confirmacao_uso !== undefined) {
      updateData.texto_confirmacao_uso = requer_confirmacao_uso && texto_confirmacao_uso 
        ? texto_confirmacao_uso.trim() 
        : null;
    }

    const { data, error } = await supabaseAdmin
      .from('nps_perguntas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar pergunta:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pergunta: data });
  } catch (error: any) {
    console.error('Erro interno ao atualizar pergunta:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir pergunta
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    // Verificar se pergunta existe
    const { data: perguntaExistente, error: checkError } = await supabaseAdmin
      .from('nps_perguntas')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !perguntaExistente) {
      return NextResponse.json({ error: 'Pergunta não encontrada' }, { status: 404 });
    }

    // Verificar se está vinculada a alguma pesquisa
    const { count, error: countError } = await supabaseAdmin
      .from('nps_pesquisa_perguntas')
      .select('*', { count: 'exact', head: true })
      .eq('pergunta_id', id);

    if (countError) {
      console.error('Erro ao verificar vínculos:', countError);
      // Continuar com exclusão mesmo se houver erro na verificação
    }

    // Se estiver vinculada, fazer soft delete (desativar)
    if (count && count > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('nps_perguntas')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) {
        console.error('Erro ao desativar pergunta:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Pergunta desativada (está vinculada a pesquisas)',
        softDelete: true,
        totalVinculos: count
      });
    }

    // Se não estiver vinculada, excluir permanentemente
    const { error: deleteError } = await supabaseAdmin
      .from('nps_perguntas')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir pergunta:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Pergunta excluída permanentemente' });
  } catch (error: any) {
    console.error('Erro interno ao excluir pergunta:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
