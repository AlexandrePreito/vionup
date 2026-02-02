import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('Atualizando Materialized View...');
    
    const { error } = await supabaseAdmin.rpc('refresh_cash_flow_view');
    
    if (error) {
      console.error('Erro ao atualizar view:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('Materialized View atualizada com sucesso!');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
