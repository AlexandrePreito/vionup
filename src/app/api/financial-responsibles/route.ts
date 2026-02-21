import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar responsáveis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = supabaseAdmin
      .from('financial_responsibles')
      .select('*')
      .order('name', { ascending: true });

    if (groupId) {
      query = query.eq('company_group_id', groupId);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar responsáveis:', error);
      return NextResponse.json({ error: 'Erro ao buscar responsáveis' }, { status: 500 });
    }

    return NextResponse.json({ responsibles: data || [] });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar responsável
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { company_group_id, name, email, phone, role } = body;

    if (!company_group_id || !name) {
      return NextResponse.json(
        { error: 'company_group_id e name são obrigatórios' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('financial_responsibles')
      .insert({
        company_group_id,
        name,
        email: email || null,
        phone: phone || null,
        role: role || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar responsável:', error);
      return NextResponse.json({ error: 'Erro ao criar responsável' }, { status: 500 });
    }

    return NextResponse.json({ responsible: data }, { status: 201 });
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
