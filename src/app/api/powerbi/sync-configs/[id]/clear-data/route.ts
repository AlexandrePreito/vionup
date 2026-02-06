import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// DELETE - Limpar todos os dados de uma entidade específica
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar configuração
    const { data: config, error: configError } = await supabaseAdmin
      .from('powerbi_sync_configs')
      .select(`
        *,
        connection:powerbi_connections(company_group_id)
      `)
      .eq('id', id)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 });
    }

    const companyGroupId = (config as any).connection?.company_group_id;
    if (!companyGroupId) {
      return NextResponse.json({ error: 'Grupo de empresa não encontrado' }, { status: 404 });
    }

    // Mapear entity_type para nome da tabela
    const tableMap: Record<string, string> = {
      products: 'external_products',
      employees: 'external_employees',
      companies: 'external_companies',
      sales: 'external_sales',
      cash_flow: 'external_cash_flow',
      cash_flow_statement: 'external_cash_flow_statement',
      categories: 'external_categories',
      stock: 'external_stock'
    };

    const tableName = tableMap[config.entity_type];
    if (!tableName) {
      return NextResponse.json({ 
        error: `Tipo de entidade não suportado: ${config.entity_type}` 
      }, { status: 400 });
    }

    // Deletar todos os registros da entidade para o grupo
    const { error: deleteError, count } = await supabaseAdmin
      .from(tableName)
      .delete()
      .eq('company_group_id', companyGroupId)
      .select('*', { count: 'exact', head: true });

    if (deleteError) {
      console.error('Erro ao limpar dados:', deleteError);
      return NextResponse.json({ 
        error: `Erro ao limpar dados: ${deleteError.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Dados de ${config.entity_type} limpos com sucesso`,
      table: tableName
    });
  } catch (error: any) {
    console.error('Erro ao limpar dados:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
