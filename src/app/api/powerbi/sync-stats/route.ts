import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth/get-user';

// GET - Buscar estatísticas por empresa
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('config_id');

    if (!configId) {
      return NextResponse.json({ error: 'config_id é obrigatório' }, { status: 400 });
    }

    // Buscar configuração com conexão
    const { data: config, error: configError } = await supabaseAdmin
      .from('powerbi_sync_configs')
      .select(`
        *,
        connection:powerbi_connections(
          id,
          company_group_id
        )
      `)
      .eq('id', configId)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 });
    }

    const entityType = config.entity_type;
    const companyGroupId = (config as any).connection?.company_group_id;
    
    if (!companyGroupId) {
      return NextResponse.json({ error: 'Grupo de empresa não encontrado' }, { status: 404 });
    }

    // Determinar período de filtro baseado na última sincronização
    let dateFilterStart: string | null = null;
    let dateFilterEnd: string | null = null;
    
    // Sempre usar um período para filtrar os dados
    if (config.is_incremental) {
      // Para sincronização incremental, mostrar apenas os últimos N dias
      const daysBack = config.incremental_days || 7;
      const today = new Date();
      dateFilterStart = new Date(today);
      dateFilterStart.setDate(dateFilterStart.getDate() - daysBack);
      dateFilterStart = dateFilterStart.toISOString().split('T')[0];
      dateFilterEnd = today.toISOString().split('T')[0];
    } else if (config.initial_date) {
      // Para sincronização completa, usar o período da configuração até hoje
      dateFilterStart = config.initial_date;
      dateFilterEnd = new Date().toISOString().split('T')[0];
    } else {
      // Fallback: últimos 30 dias se não houver configuração de data
      const today = new Date();
      dateFilterStart = new Date(today);
      dateFilterStart.setDate(dateFilterStart.getDate() - 30);
      dateFilterStart = dateFilterStart.toISOString().split('T')[0];
      dateFilterEnd = today.toISOString().split('T')[0];
    }

    const stats: any[] = [];

    // Buscar estatísticas por empresa apenas para vendas, caixa e fluxo de caixa
    if (['sales', 'cash_flow', 'cash_flow_statement'].includes(entityType)) {
      let tableName = '';
      let companyField = '';
      let dateField = '';

      if (entityType === 'sales') {
        tableName = 'external_sales';
        companyField = 'external_company_id';
        dateField = 'sale_date';
      } else if (entityType === 'cash_flow') {
        tableName = 'external_cash_flow';
        companyField = 'external_company_id';
        dateField = 'transaction_date';
      } else if (entityType === 'cash_flow_statement') {
        tableName = 'external_cash_flow_statement';
        companyField = 'external_company_id';
        dateField = 'transaction_date';
      }

      if (tableName) {
        // Construir query base com filtros de data
        let baseQuery = supabaseAdmin
          .from(tableName)
          .select(companyField)
          .eq('company_group_id', companyGroupId)
          .not(companyField, 'is', null);

        // Aplicar filtro de data se disponível
        if (dateFilterStart && dateField) {
          baseQuery = baseQuery.gte(dateField, dateFilterStart);
        }
        if (dateFilterEnd && dateField) {
          baseQuery = baseQuery.lte(dateField, dateFilterEnd);
        }

        // Buscar todos os external_company_id únicos no período
        const { data: distinctCompanies, error: distinctError } = await baseQuery;

        if (!distinctError && distinctCompanies && distinctCompanies.length > 0) {
          // Obter códigos únicos
          const uniqueCodes = [...new Set(distinctCompanies.map((r: any) => r[companyField]).filter(Boolean))];
          
          // Buscar empresas externas pelos códigos
          const { data: externalCompanies, error: extError } = await supabaseAdmin
            .from('external_companies')
            .select('id, external_id')
            .eq('company_group_id', companyGroupId)
            .in('external_id', uniqueCodes);

          if (!extError && externalCompanies) {
            // Criar mapa de código -> UUID
            const codeToUuid = new Map<string, string>();
            externalCompanies.forEach((ec: any) => {
              codeToUuid.set(ec.external_id, ec.id);
            });

            // Buscar mapeamentos
            const externalUuids = Array.from(codeToUuid.values());
            if (externalUuids.length > 0) {
              const { data: mappings, error: mapError } = await supabaseAdmin
                .from('company_mappings')
                .select(`
                  external_company_id,
                  company:companies(id, name)
                `)
                .eq('company_group_id', companyGroupId)
                .in('external_company_id', externalUuids);

              if (!mapError && mappings) {
                // Criar mapa de UUID externo -> empresa interna
                const uuidToCompany = new Map<string, any>();
                mappings.forEach((m: any) => {
                  if (m.company) {
                    uuidToCompany.set(m.external_company_id, m.company);
                  }
                });

                // Agrupar por empresa interna
                const companyMap = new Map<string, any>();

                for (const code of uniqueCodes) {
                  const uuid = codeToUuid.get(code);
                  if (!uuid) continue;

                  const company = uuidToCompany.get(uuid);
                  if (!company) continue;

                  const companyId = company.id;
                  if (!companyMap.has(companyId)) {
                    companyMap.set(companyId, {
                      company_id: companyId,
                      company_name: company.name,
                      record_count: 0,
                      min_date: null,
                      max_date: null
                    });
                  }
                }

                // Buscar contagem e datas min/max em UMA query agregada (evita N+1)
                let statsQuery = supabaseAdmin
                  .from(tableName)
                  .select(`${companyField}, ${dateField}`)
                  .eq('company_group_id', companyGroupId)
                  .in(companyField, uniqueCodes);

                if (dateFilterStart && dateField) {
                  statsQuery = statsQuery.gte(dateField, dateFilterStart);
                }
                if (dateFilterEnd && dateField) {
                  statsQuery = statsQuery.lte(dateField, dateFilterEnd);
                }

                // Usar range para pegar todos os registros (até 100k)
                const { data: allRecords, error: allError } = await statsQuery.range(0, 99999);

                if (!allError && allRecords) {
                  // Agregar em memória (muito mais rápido que N queries)
                  const aggregated = new Map<string, { count: number; minDate: string | null; maxDate: string | null }>();
                  
                  for (const row of allRecords) {
                    const code = row[companyField];
                    if (!code) continue;
                    
                    let agg = aggregated.get(code);
                    if (!agg) {
                      agg = { count: 0, minDate: null, maxDate: null };
                      aggregated.set(code, agg);
                    }
                    
                    agg.count++;
                    const dateVal = row[dateField];
                    if (dateVal) {
                      if (!agg.minDate || dateVal < agg.minDate) agg.minDate = dateVal;
                      if (!agg.maxDate || dateVal > agg.maxDate) agg.maxDate = dateVal;
                    }
                  }

                  // Preencher stats usando os dados agregados
                  for (const [code, agg] of aggregated) {
                    const uuid = codeToUuid.get(code);
                    if (!uuid) continue;
                    const company = uuidToCompany.get(uuid);
                    if (!company) continue;

                    const companyId = company.id;
                    let stat = companyMap.get(companyId);
                    if (!stat) {
                      stat = {
                        company_id: companyId,
                        company_name: company.name,
                        record_count: 0,
                        min_date: null,
                        max_date: null
                      };
                      companyMap.set(companyId, stat);
                    }
                    
                    stat.record_count += agg.count;
                    if (agg.minDate && (!stat.min_date || agg.minDate < stat.min_date)) {
                      stat.min_date = agg.minDate;
                    }
                    if (agg.maxDate && (!stat.max_date || agg.maxDate > stat.max_date)) {
                      stat.max_date = agg.maxDate;
                    }
                  }
                }

                stats.push(...Array.from(companyMap.values()));
                
                // Ordenar por nome da empresa
                stats.sort((a, b) => a.company_name.localeCompare(b.company_name));
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
