import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

const generateHash = () => crypto.randomBytes(8).toString('hex');

// GET - Buscar link por hash OU listar por pesquisa
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash');
    const pesquisaId = searchParams.get('pesquisa_id');

    // Buscar link específico por hash (formulário público)
    if (hash) {
      // Primeiro buscar o link básico
      const { data: linkData, error: linkError } = await supabaseAdmin
        .from('nps_links')
        .select('*')
        .eq('hash_link', hash)
        .single();

      if (linkError) {
        console.error('Erro ao buscar link:', linkError);
        if (linkError.code === 'PGRST116') {
          // Nenhum resultado encontrado
          return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 });
        }
        return NextResponse.json({ error: linkError.message || 'Erro ao buscar link' }, { status: 500 });
      }

      if (!linkData) {
        return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 });
      }

      console.log('Link encontrado:', {
        id: linkData.id,
        hash: linkData.hash_link,
        pesquisa_id: linkData.pesquisa_id,
        ativo: linkData.ativo
      });

      // Verificar se o link está ativo
      if (!linkData.ativo) {
        return NextResponse.json({ error: 'Link desativado' }, { status: 403 });
      }

      // Buscar pesquisa primeiro sem relacionamentos
      console.log('Buscando pesquisa com ID:', linkData.pesquisa_id);
      const { data: pesquisaBase, error: pesquisaBaseError } = await supabaseAdmin
        .from('nps_pesquisas')
        .select('id, nome, tipo, descricao, ativo, company_group_id')
        .eq('id', linkData.pesquisa_id)
        .single();

      if (pesquisaBaseError || !pesquisaBase) {
        console.error('Erro ao buscar pesquisa:', pesquisaBaseError);
        console.error('Pesquisa ID:', linkData.pesquisa_id);
        if (pesquisaBaseError?.code === 'PGRST116') {
          return NextResponse.json({ error: 'Pesquisa não encontrada' }, { status: 404 });
        }
        return NextResponse.json({ error: pesquisaBaseError?.message || 'Pesquisa não encontrada' }, { status: 404 });
      }

      if (!pesquisaBase.ativo) {
        return NextResponse.json({ error: 'Pesquisa desativada' }, { status: 403 });
      }

      // Buscar perguntas da pesquisa separadamente
      const { data: pesquisaPerguntas, error: perguntasError } = await supabaseAdmin
        .from('nps_pesquisa_perguntas')
        .select(`
          id, ordem, obrigatoria,
          pergunta:nps_perguntas (id, texto, tipo_resposta, categoria, requer_confirmacao_uso, texto_confirmacao_uso)
        `)
        .eq('pesquisa_id', linkData.pesquisa_id)
        .order('ordem');

      if (perguntasError) {
        console.error('Erro ao buscar perguntas da pesquisa:', perguntasError);
        // Continuar mesmo se houver erro nas perguntas
      }

      // Montar objeto pesquisa completo
      const pesquisa = {
        ...pesquisaBase,
        nps_pesquisa_perguntas: pesquisaPerguntas || []
      };

      console.log('Pesquisa encontrada:', {
        id: pesquisa.id,
        nome: pesquisa.nome,
        ativo: pesquisa.ativo,
        perguntas_count: pesquisa.nps_pesquisa_perguntas?.length || 0
      });

      if (!pesquisa.ativo) {
        return NextResponse.json({ error: 'Pesquisa desativada' }, { status: 403 });
      }

      // Buscar empresa se houver
      let company = null;
      if (linkData.company_id) {
        const { data: companyData } = await supabaseAdmin
          .from('companies')
          .select('id, name')
          .eq('id', linkData.company_id)
          .single();
        company = companyData;
      }

      // Buscar funcionário se houver
      let employee = null;
      if (linkData.employee_id) {
        const { data: employeeData } = await supabaseAdmin
          .from('employees')
          .select('id, name')
          .eq('id', linkData.employee_id)
          .single();
        employee = employeeData;
      }

      // Montar objeto completo
      const linkDataComplete = {
        ...linkData,
        pesquisa,
        company,
        employee
      };

      // Buscar opções de origem (como conheceu)
      const { data: opcoesOrigem, error: origemError } = await supabaseAdmin
        .from('nps_opcoes_origem')
        .select('*')
        .eq('company_group_id', pesquisa.company_group_id)
        .eq('ativo', true)
        .order('ordem');

      if (origemError) {
        console.error('Erro ao buscar opções de origem:', origemError);
        // Continuar mesmo se houver erro
      }

      // Incrementar acessos
      const { error: updateError } = await supabaseAdmin
        .from('nps_links')
        .update({ 
          total_acessos: (linkData.total_acessos || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', linkData.id);

      if (updateError) {
        console.error('Erro ao incrementar acessos:', updateError);
        // Continuar mesmo se houver erro
      }

      return NextResponse.json({ 
        link: linkDataComplete, 
        opcoesOrigem: opcoesOrigem || [] 
      });
    }

    // Listar links por pesquisa
    if (!pesquisaId) {
      return NextResponse.json(
        { error: 'pesquisa_id ou hash é obrigatório' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('nps_links')
      .select(`
        *,
        company:companies (id, name),
        employee:employees (id, name)
      `)
      .eq('pesquisa_id', pesquisaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar links:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ links: data || [] });
  } catch (error: any) {
    console.error('Erro interno ao buscar links:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pesquisa_id, company_id, employee_id, tipo } = body;

    if (!pesquisa_id || !tipo) {
      return NextResponse.json(
        { error: 'pesquisa_id e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar tipo
    const tiposValidos = ['unidade', 'garcom'];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: `tipo deve ser um dos seguintes: ${tiposValidos.join(', ')}` },
        { status: 400 }
      );
    }

    // Verificar se pesquisa existe e está ativa
    const { data: pesquisa, error: pesquisaError } = await supabaseAdmin
      .from('nps_pesquisas')
      .select('id, ativo')
      .eq('id', pesquisa_id)
      .single();

    if (pesquisaError || !pesquisa) {
      return NextResponse.json({ error: 'Pesquisa não encontrada' }, { status: 404 });
    }

    if (!pesquisa.ativo) {
      return NextResponse.json({ error: 'Pesquisa está desativada' }, { status: 400 });
    }

    // Verificar se já existe link para esta combinação
    let checkQuery = supabaseAdmin
      .from('nps_links')
      .select('*')
      .eq('pesquisa_id', pesquisa_id)
      .eq('tipo', tipo);

    if (company_id) {
      checkQuery = checkQuery.eq('company_id', company_id);
    } else {
      checkQuery = checkQuery.is('company_id', null);
    }

    if (employee_id) {
      checkQuery = checkQuery.eq('employee_id', employee_id);
    } else {
      checkQuery = checkQuery.is('employee_id', null);
    }

    const { data: existing, error: checkError } = await checkQuery;

    if (checkError) {
      console.error('Erro ao verificar link existente:', checkError);
      // Continuar mesmo se houver erro na verificação
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ 
        link: existing[0], 
        message: 'Link já existe para esta combinação' 
      });
    }

    // Gerar hash único (verificar se não existe)
    let hashLink = generateHash();
    let attempts = 0;
    let hashExists = true;

    while (hashExists && attempts < 10) {
      const { data: hashCheck } = await supabaseAdmin
        .from('nps_links')
        .select('id')
        .eq('hash_link', hashLink)
        .single();

      if (!hashCheck) {
        hashExists = false;
      } else {
        hashLink = generateHash();
        attempts++;
      }
    }

    if (hashExists) {
      return NextResponse.json(
        { error: 'Erro ao gerar hash único. Tente novamente.' },
        { status: 500 }
      );
    }

    // Criar novo link
    const { data, error } = await supabaseAdmin
      .from('nps_links')
      .insert({
        pesquisa_id,
        company_id: company_id || null,
        employee_id: employee_id || null,
        tipo,
        hash_link: hashLink,
        ativo: true,
        total_acessos: 0,
        total_respostas: 0
      })
      .select(`
        *,
        company:companies (id, name),
        employee:employees (id, name)
      `)
      .single();

    if (error) {
      console.error('Erro ao criar link:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ link: data }, { status: 201 });
  } catch (error: any) {
    console.error('Erro interno ao criar link:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Ativar/Desativar link
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ativo } = body;

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    if (ativo === undefined) {
      return NextResponse.json({ error: 'ativo é obrigatório' }, { status: 400 });
    }

    // Verificar se link existe
    const { data: linkExistente, error: checkError } = await supabaseAdmin
      .from('nps_links')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !linkExistente) {
      return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('nps_links')
      .update({ 
        ativo: Boolean(ativo),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        company:companies (id, name),
        employee:employees (id, name)
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar link:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ link: data });
  } catch (error: any) {
    console.error('Erro interno ao atualizar link:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir link
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    // Verificar se link existe
    const { data: linkExistente, error: checkError } = await supabaseAdmin
      .from('nps_links')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !linkExistente) {
      return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 });
    }

    // Verificar se tem respostas
    const { count, error: countError } = await supabaseAdmin
      .from('nps_respostas')
      .select('*', { count: 'exact', head: true })
      .eq('link_id', id);

    if (countError) {
      console.error('Erro ao verificar respostas:', countError);
      // Continuar com exclusão mesmo se houver erro na verificação
    }

    // Se tiver respostas, fazer soft delete (desativar)
    if (count && count > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('nps_links')
        .update({ 
          ativo: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.error('Erro ao desativar link:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Link desativado (possui respostas associadas)',
        softDelete: true,
        totalRespostas: count
      });
    }

    // Se não tiver respostas, excluir permanentemente
    const { error: deleteError } = await supabaseAdmin
      .from('nps_links')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir link:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Link excluído permanentemente' });
  } catch (error: any) {
    console.error('Erro interno ao excluir link:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
