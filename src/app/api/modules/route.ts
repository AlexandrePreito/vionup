import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { NAV_MODULES } from '@/lib/navigation-config';

/**
 * Sincroniza a configuração central de navegação (NAV_MODULES) com as tabelas
 * system_modules e system_pages. Assim, ao adicionar um novo menu ou tela em
 * src/lib/navigation-config.ts, ele passa a aparecer na tela de permissões.
 */
async function syncModulesAndPages() {
  const moduleIdsByName: Record<string, string> = {};

  for (const mod of NAV_MODULES) {
    // Inserir ou atualizar módulo (buscar por name)
    const { data: existingModule } = await supabaseAdmin
      .from('system_modules')
      .select('id, label, display_order')
      .eq('name', mod.name)
      .maybeSingle();

    let moduleId: string;
    if (existingModule) {
      moduleId = existingModule.id;
      await supabaseAdmin
        .from('system_modules')
        .update({ label: mod.label, display_order: mod.display_order, is_active: true })
        .eq('id', moduleId);
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from('system_modules')
        .insert({
          name: mod.name,
          label: mod.label,
          display_order: mod.display_order,
          is_active: true,
        })
        .select('id')
        .single();
      if (error) {
        console.error('Erro ao inserir módulo:', mod.name, error);
        continue;
      }
      moduleId = inserted.id;
    }
    moduleIdsByName[mod.name] = moduleId;

    for (const page of mod.pages) {
      const { data: existingPage } = await supabaseAdmin
        .from('system_pages')
        .select('id, module_id, label, display_order')
        .eq('route', page.route)
        .maybeSingle();

      if (existingPage) {
        await supabaseAdmin
          .from('system_pages')
          .update({
            module_id: moduleId,
            label: page.label,
            display_order: page.display_order,
          })
          .eq('id', existingPage.id);
      } else {
        await supabaseAdmin.from('system_pages').insert({
          module_id: moduleId,
          route: page.route,
          label: page.label,
          display_order: page.display_order,
        });
      }
    }
  }

}

export async function GET() {
  try {
    try {
      await syncModulesAndPages();
    } catch (syncErr: any) {
      console.error('Erro ao sincronizar módulos (continuando com dados do banco):', syncErr?.message);
      // Continua e retorna o que existir no banco
    }

    const { data, error } = await supabaseAdmin
      .from('system_modules')
      .select('*, pages:system_pages(*)')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    data?.forEach((m: any) => {
      if (m.pages) {
        m.pages.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
      }
    });

    return NextResponse.json({ modules: data || [] });
  } catch (error: any) {
    console.error('Erro em GET /api/modules:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
