import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Buscar empresas vinculadas ao usuário
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    const { data, error } = await supabaseAdmin
      .from('user_companies')
      .select('company_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao buscar empresas do usuário:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const company_ids = data?.map(uc => uc.company_id) || [];

    return NextResponse.json({ company_ids });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar empresas vinculadas ao usuário
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { company_ids } = await request.json();

    // Remover vínculos antigos
    await supabaseAdmin
      .from('user_companies')
      .delete()
      .eq('user_id', userId);

    // Adicionar novos vínculos
    if (company_ids && company_ids.length > 0) {
      const inserts = company_ids.map((companyId: string) => ({
        user_id: userId,
        company_id: companyId
      }));

      const { error } = await supabaseAdmin
        .from('user_companies')
        .insert(inserts);

      if (error) {
        console.error('Erro ao vincular empresas:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
