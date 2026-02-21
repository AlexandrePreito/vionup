import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const group_id = searchParams.get('group_id');
  const company_id = searchParams.get('company_id'); // filtro opcional por filial

  if (!group_id) {
    return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
  }

  let listsData: any[] | null = null;
  const { data: withPlc, error: errPlc } = await supabaseAdmin
    .from('purchase_lists')
    .select('*, purchase_list_items(count), purchase_list_companies(company_id)')
    .eq('company_group_id', group_id)
    .order('target_date', { ascending: false });

  if (errPlc) {
    // Tabela purchase_list_companies pode não existir ainda: fallback sem relação
    const { data: fallback, error: errFallback } = await supabaseAdmin
      .from('purchase_lists')
      .select('*, purchase_list_items(count)')
      .eq('company_group_id', group_id)
      .order('target_date', { ascending: false });
    if (errFallback) {
      return NextResponse.json({ error: errFallback.message }, { status: 500 });
    }
    listsData = fallback;
  } else {
    listsData = withPlc;
  }

  const lists = (listsData || []).map((list: any) => {
    const plc = list.purchase_list_companies || [];
    const company_ids = plc.length > 0
      ? plc.map((c: any) => c.company_id)
      : (list.company_id ? [list.company_id] : []); // backward compat
    const { purchase_list_companies: _, ...rest } = list;
    return { ...rest, company_ids };
  });

  // Filtrar por filial: incluir lista se for "todas" (company_ids vazio) ou se contém a company_id
  const filtered = company_id
    ? lists.filter((l: any) => l.company_ids.length === 0 || l.company_ids.includes(company_id))
    : lists;

  return NextResponse.json({ lists: filtered });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { company_group_id, company_id, company_ids, name, target_date, projection_days, notes, items } = body;
  const filialIds = Array.isArray(company_ids) ? company_ids : (company_id ? [company_id] : []);

  if (!company_group_id || !name || !target_date) {
    return NextResponse.json({ error: 'company_group_id, name e target_date são obrigatórios' }, { status: 400 });
  }

  // Criar a lista (company_id legado: null quando usa purchase_list_companies)
  const { data: list, error: listError } = await supabaseAdmin
    .from('purchase_lists')
    .insert({
      company_group_id,
      company_id: filialIds.length === 1 ? filialIds[0] : null,
      name,
      target_date,
      projection_days,
      notes,
      status: 'rascunho'
    })
    .select()
    .single();

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  // Vincular filiais (todas = nenhuma linha; uma ou mais = uma linha por company_id)
  if (filialIds.length > 0) {
    const { error: plcError } = await supabaseAdmin
      .from('purchase_list_companies')
      .insert(filialIds.map((cid: string) => ({ purchase_list_id: list.id, company_id: cid })));

    if (plcError) {
      await supabaseAdmin.from('purchase_lists').delete().eq('id', list.id);
      return NextResponse.json({ error: plcError.message }, { status: 500 });
    }
  }

  // Inserir itens se fornecidos (MP = raw_material_id UUID; Revenda = external_product_id código)
  if (items && items.length > 0) {
    const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s));
    const itemsToInsert = items.map((item: any) => {
      const hasExternalProduct = item.external_product_id != null && String(item.external_product_id).trim() !== '';
      const fromRevenda = hasExternalProduct || (item.raw_material_id != null && String(item.raw_material_id).trim() !== '' && !isUuid(String(item.raw_material_id)));
      return {
        purchase_list_id: list.id,
        raw_material_id: fromRevenda ? null : (item.raw_material_id || null),
        external_product_id: fromRevenda ? (item.external_product_id || item.raw_material_id) : null,
        raw_material_name: item.raw_material_name ?? '',
        parent_name: item.parent_name || null,
        unit: item.unit || 'kg',
        projected_quantity: item.projected_quantity || 0,
        adjusted_quantity: item.adjusted_quantity || item.projected_quantity || 0,
        current_stock: item.current_stock || 0,
        min_stock: item.min_stock || 0,
        loss_factor: item.loss_factor || 0,
        notes: item.notes || null
      };
    });

    const { error: itemsError } = await supabaseAdmin
      .from('purchase_list_items')
      .insert(itemsToInsert);

    if (itemsError) {
      await supabaseAdmin.from('purchase_list_companies').delete().eq('purchase_list_id', list.id);
      await supabaseAdmin.from('purchase_lists').delete().eq('id', list.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }
  }

  const ids = filialIds.length > 0 ? filialIds : (list.company_id ? [list.company_id] : []);
  return NextResponse.json({ list: { ...list, company_ids: ids } });
}
