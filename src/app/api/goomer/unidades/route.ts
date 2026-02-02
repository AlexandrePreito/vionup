import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: unidades, error } = await supabase
      .from('goomer_unidades')
      .select('*')
      .order('nome_goomer');

    if (error) throw error;

    return NextResponse.json({ unidades });
  } catch (error: any) {
    console.error('Erro ao buscar unidades:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
