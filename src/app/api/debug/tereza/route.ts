import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Executar queries de diagnóstico para a usuária Tereza
export async function GET(request: NextRequest) {
  try {
    const results: Record<string, any> = {};

    // 1. Buscar o ID da usuária Tereza
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, company_group_id')
      .eq('email', 'tereza@bpyou.com.br')
      .single();

    if (userError || !user) {
      return NextResponse.json({
        error: 'Usuária Tereza não encontrada',
        details: userError
      }, { status: 404 });
    }

    results.user = user;
    const userId = user.id;

    // 2. Verificar o membership dela (qual grupo ela pertence)
    // Tentar primeiro user_group_membership, depois verificar diretamente na tabela users
    let memberships: any[] = [];
    let membershipError: any = null;

    // Tentar buscar na tabela user_group_membership
    const { data: membershipData, error: membershipErr } = await supabaseAdmin
      .from('user_group_membership')
      .select(`
        *,
        company_group:company_groups(id, name)
      `)
      .eq('user_id', userId);

    if (membershipErr) {
      // Se não existir a tabela, buscar diretamente do usuário
      if (user.company_group_id) {
        const { data: groupData } = await supabaseAdmin
          .from('company_groups')
          .select('id, name')
          .eq('id', user.company_group_id)
          .single();

        memberships = [{
          user_id: userId,
          company_group_id: user.company_group_id,
          company_group: groupData
        }];
      }
      membershipError = membershipErr;
    } else {
      memberships = membershipData || [];
    }

    results.memberships = memberships;
    if (membershipError) {
      results.membershipError = membershipError;
    }

    // 3. Verificar a ordem de telas salva para ela
    const { data: screenOrders, error: screenOrderError } = await supabaseAdmin
      .from('user_screen_order')
      .select(`
        *,
        screen:powerbi_dashboard_screens(id, title)
      `)
      .eq('user_id', userId)
      .order('display_order', { ascending: true });

    if (screenOrderError) {
      results.screenOrderError = screenOrderError;
    } else {
      results.screenOrders = screenOrders || [];
    }

    // 4. Verificar se a tela "Joanas Parque" existe e está no grupo certo
    const screenId = '3946f83e-8402-4ef1-a768-3c935a6cabef';
    const { data: screen, error: screenError } = await supabaseAdmin
      .from('powerbi_dashboard_screens')
      .select('*')
      .eq('id', screenId)
      .single();

    if (screenError) {
      results.screenError = screenError;
    } else {
      results.screen = screen;
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Erro no diagnóstico:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
