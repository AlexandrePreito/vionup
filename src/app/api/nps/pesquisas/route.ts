import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar pesquisas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const tipo = searchParams.get('tipo');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('nps_pesquisas')
      .select(`
        *,
        company_group:company_groups (id, name),
        nps_pesquisa_perguntas (
          id, ordem, obrigatoria,
          pergunta:nps_perguntas (id, texto, tipo_resposta, categoria)
        ),
        nps_links (id, company_id, employee_id, hash_link, tipo, ativo, total_respostas)
      `)
      .eq('company_group_id', groupId)
      .order('created_at', { ascending: false });

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar pesquisas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pesquisas: data || [] });
  } catch (error: any) {
    console.error('Erro interno ao buscar pesquisas:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar pesquisa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, nome, tipo, descricao, perguntas } = body;

    if (!company_group_id || !nome || !tipo) {
      return NextResponse.json(
        { error: 'company_group_id, nome e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar tipo
    const tiposValidos = ['cliente', 'cliente_misterioso'];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: `tipo deve ser um dos seguintes: ${tiposValidos.join(', ')}` },
        { status: 400 }
      );
    }

    // Criar pesquisa
    const { data: pesquisa, error: pesquisaError } = await supabaseAdmin
      .from('nps_pesquisas')
      .insert({
        company_group_id,
        nome,
        tipo,
        descricao: descricao || null,
        ativo: true
      })
      .select()
      .single();

    if (pesquisaError) {
      console.error('Erro ao criar pesquisa:', pesquisaError);
      return NextResponse.json({ error: pesquisaError.message }, { status: 500 });
    }

    // Vincular perguntas se fornecidas
    if (perguntas && Array.isArray(perguntas) && perguntas.length > 0) {
      const vinculos = perguntas.map((p: any, i: number) => ({
        pesquisa_id: pesquisa.id,
        pergunta_id: p.pergunta_id,
        ordem: p.ordem ?? i + 1,
        obrigatoria: p.obrigatoria ?? true
      }));

      const { error: vinculosError } = await supabaseAdmin
        .from('nps_pesquisa_perguntas')
        .insert(vinculos);

      if (vinculosError) {
        console.error('Erro ao vincular perguntas:', vinculosError);
        // Não falhar a criação da pesquisa se houver erro ao vincular perguntas
        // Apenas logar o erro
      }
    }

    // Buscar pesquisa completa com relacionamentos
    const { data: pesquisaCompleta, error: fetchError } = await supabaseAdmin
      .from('nps_pesquisas')
      .select(`
        *,
        nps_pesquisa_perguntas (
          id, ordem, obrigatoria,
          pergunta:nps_perguntas (id, texto, tipo_resposta, categoria)
        )
      `)
      .eq('id', pesquisa.id)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar pesquisa criada:', fetchError);
      // Retornar pesquisa sem relacionamentos se houver erro
      return NextResponse.json({ pesquisa }, { status: 201 });
    }

    return NextResponse.json({ pesquisa: pesquisaCompleta }, { status: 201 });
  } catch (error: any) {
    console.error('Erro interno ao criar pesquisa:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar pesquisa
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nome, descricao, ativo, perguntas } = body;

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    // Verificar se pesquisa existe
    const { data: pesquisaExistente, error: checkError } = await supabaseAdmin
      .from('nps_pesquisas')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !pesquisaExistente) {
      return NextResponse.json({ error: 'Pesquisa não encontrada' }, { status: 404 });
    }

    // Atualizar dados da pesquisa
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    
    if (nome !== undefined) updateData.nome = nome;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (ativo !== undefined) updateData.ativo = ativo;

    const { data: pesquisaAtualizada, error: updateError } = await supabaseAdmin
      .from('nps_pesquisas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar pesquisa:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Atualizar perguntas vinculadas se fornecido
    if (perguntas !== undefined) {
      // Remover vínculos existentes
      const { error: deleteError } = await supabaseAdmin
        .from('nps_pesquisa_perguntas')
        .delete()
        .eq('pesquisa_id', id);

      if (deleteError) {
        console.error('Erro ao remover vínculos antigos:', deleteError);
        // Continuar mesmo se houver erro
      }

      // Criar novos vínculos se houver perguntas
      if (Array.isArray(perguntas) && perguntas.length > 0) {
        const vinculos = perguntas.map((p: any, i: number) => ({
          pesquisa_id: id,
          pergunta_id: p.pergunta_id,
          ordem: p.ordem ?? i + 1,
          obrigatoria: p.obrigatoria ?? true
        }));

        const { error: vinculosError } = await supabaseAdmin
          .from('nps_pesquisa_perguntas')
          .insert(vinculos);

        if (vinculosError) {
          console.error('Erro ao vincular perguntas:', vinculosError);
          // Não falhar a atualização se houver erro ao vincular perguntas
        }
      }
    }

    // Buscar pesquisa completa com relacionamentos
    const { data: pesquisaCompleta, error: fetchError } = await supabaseAdmin
      .from('nps_pesquisas')
      .select(`
        *,
        nps_pesquisa_perguntas (
          id, ordem, obrigatoria,
          pergunta:nps_perguntas (id, texto, tipo_resposta, categoria)
        ),
        nps_links (id, company_id, employee_id, hash_link, tipo, ativo, total_respostas)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar pesquisa atualizada:', fetchError);
      // Retornar pesquisa sem relacionamentos se houver erro
      return NextResponse.json({ pesquisa: pesquisaAtualizada });
    }

    return NextResponse.json({ pesquisa: pesquisaCompleta });
  } catch (error: any) {
    console.error('Erro interno ao atualizar pesquisa:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir pesquisa
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    // Verificar se pesquisa existe
    const { data: pesquisaExistente, error: checkError } = await supabaseAdmin
      .from('nps_pesquisas')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !pesquisaExistente) {
      return NextResponse.json({ error: 'Pesquisa não encontrada' }, { status: 404 });
    }

    // Verificar se há respostas
    const { count, error: countError } = await supabaseAdmin
      .from('nps_respostas')
      .select('*', { count: 'exact', head: true })
      .eq('pesquisa_id', id);

    if (countError) {
      console.error('Erro ao verificar respostas:', countError);
      // Continuar com exclusão mesmo se houver erro na verificação
    }

    // Se houver respostas, fazer soft delete (desativar)
    if (count && count > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('nps_pesquisas')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) {
        console.error('Erro ao desativar pesquisa:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Pesquisa desativada (possui respostas associadas)',
        softDelete: true,
        totalRespostas: count
      });
    }

    // Se não houver respostas, excluir permanentemente
    // Primeiro, excluir vínculos de perguntas
    const { error: deleteVinculosError } = await supabaseAdmin
      .from('nps_pesquisa_perguntas')
      .delete()
      .eq('pesquisa_id', id);

    if (deleteVinculosError) {
      console.error('Erro ao excluir vínculos:', deleteVinculosError);
      // Continuar mesmo se houver erro
    }

    // Excluir links associados (se houver)
    const { error: deleteLinksError } = await supabaseAdmin
      .from('nps_links')
      .delete()
      .eq('pesquisa_id', id);

    if (deleteLinksError) {
      console.error('Erro ao excluir links:', deleteLinksError);
      // Continuar mesmo se houver erro
    }

    // Excluir pesquisa
    const { error: deleteError } = await supabaseAdmin
      .from('nps_pesquisas')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir pesquisa:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Pesquisa excluída permanentemente' });
  } catch (error: any) {
    console.error('Erro interno ao excluir pesquisa:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
