import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_modules')
      .select('*, pages:system_pages(*)')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ordenar pages dentro de cada módulo
    data?.forEach((m: any) => {
      if (m.pages) {
        m.pages.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
      }
    });

    return NextResponse.json({ modules: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
