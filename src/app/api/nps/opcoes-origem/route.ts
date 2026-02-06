import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar opções
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const apenasAtivos = searchParams.get('apenas_ativos') !== 'false';

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('nps_opcoes_origem')
      .select('*')
      .eq('company_group_id', groupId)
      .order('ordem', { ascending: true });

    if (apenasAtivos) {
      query = query.eq('ativo', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ opcoes: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar opção
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, texto, icone, ordem } = body;

    if (!company_group_id || !texto) {
      return NextResponse.json({ error: 'company_group_id e texto são obrigatórios' }, { status: 400 });
    }

    // Calcular próxima ordem se não fornecida
    let ordemFinal = ordem;
    if (ordemFinal === undefined || ordemFinal === null) {
      const { data: existing } = await supabaseAdmin
        .from('nps_opcoes_origem')
        .select('ordem')
        .eq('company_group_id', company_group_id)
        .order('ordem', { ascending: false })
        .limit(1);
      
      ordemFinal = (existing?.[0]?.ordem || 0) + 1;
    }

    const { data, error } = await supabaseAdmin
      .from('nps_opcoes_origem')
      .insert({
        company_group_id,
        texto,
        icone: icone || '📌',
        ordem: ordemFinal,
        ativo: true
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ opcao: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar opção
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, texto, icone, ordem, ativo } = body;

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const updateData: any = {};
    if (texto !== undefined) updateData.texto = texto;
    if (icone !== undefined) updateData.icone = icone;
    if (ordem !== undefined) updateData.ordem = ordem;
    if (ativo !== undefined) updateData.ativo = ativo;

    const { data, error } = await supabaseAdmin
      .from('nps_opcoes_origem')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ opcao: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir opção
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    // Verificar se está sendo usada em respostas
    const { count } = await supabaseAdmin
      .from('nps_respostas')
      .select('*', { count: 'exact', head: true })
      .eq('como_conheceu_id', id);

    if (count && count > 0) {
      // Soft delete - apenas desativa
      await supabaseAdmin
        .from('nps_opcoes_origem')
        .update({ ativo: false })
        .eq('id', id);
      
      return NextResponse.json({ 
        message: 'Opção desativada (está em uso em respostas)', 
        softDelete: true 
      });
    }

    // Hard delete
    const { error } = await supabaseAdmin
      .from('nps_opcoes_origem')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ message: 'Opção excluída' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
