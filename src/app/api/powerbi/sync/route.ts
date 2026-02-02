import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { executeDaxQuery } from '@/lib/powerbi/auth';

// POST - Executar sincronização
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config_id, force_full_sync = false } = body;

    if (!config_id) {
      return NextResponse.json({ error: 'config_id é obrigatório' }, { status: 400 });
    }

    // Buscar configuração
    const { data: config, error: configError } = await supabaseAdmin
      .from('powerbi_sync_configs')
      .select('*')
      .eq('id', config_id)
      .single();

    if (configError || !config) {
      console.error('Erro ao buscar configuração:', configError);
      return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 });
    }

    // Buscar conexão separadamente
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('powerbi_connections')
      .select('*')
      .eq('id', config.connection_id)
      .single();

    if (connectionError || !connection) {
      console.error('Erro ao buscar conexão:', connectionError);
      return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
    }

    // Criar log de sincronização
    const { data: syncLog } = await supabaseAdmin
      .from('powerbi_sync_logs')
      .insert({
        connection_id: connection.id,
        sync_config_id: config.id,
        entity_type: config.entity_type,
        status: 'running'
      })
      .select()
      .single();

    const startTime = Date.now();

    try {
      // Determinar se é sync incremental ou completa
      let daxQuery = config.dax_query;
      let syncType = 'full';
      let filterDate: string | null = null;

      // SEMPRE respeitar a data inicial se estiver configurada
      if (config.initial_date && config.date_field) {
        filterDate = config.initial_date;
        syncType = 'initial';
      }

      if (config.is_incremental && config.date_field && !force_full_sync) {
        const isFirstSync = !config.last_sync_at;
        
        if (isFirstSync && config.initial_date) {
          filterDate = config.initial_date;
          syncType = 'initial';
        } else if (!isFirstSync) {
          const daysAgo = new Date();
          daysAgo.setDate(daysAgo.getDate() - (config.incremental_days || 7));
          filterDate = daysAgo.toISOString().split('T')[0];
          syncType = 'incremental';
        }
      }

      // Para vendas e caixa, NÃO adicionar filtro de data aqui - será feito em lotes
      const isLargeEntity = config.entity_type === 'sales' || config.entity_type === 'cash_flow';
      
      if (!isLargeEntity && filterDate && config.date_field) {
        daxQuery = addDateFilterToQuery(daxQuery, config.date_field, filterDate);
      }

      console.log('=== SINCRONIZAÇÃO ===');
      console.log('Tipo de sync:', syncType);
      console.log('Entity type:', config.entity_type);
      console.log('Filtro de data:', filterDate || 'Nenhum');
      console.log('DAX Query original:', daxQuery);

      // Para vendas e caixa, processar em lotes por PERÍODO DE DIAS
      if (isLargeEntity) {
        return await processInDateRangeBatches(
          config,
          connection,
          config.dax_query,
          syncType,
          filterDate,
          syncLog,
          startTime
        );
      }

      const result = await executeDaxQuery(connection, config.dataset_id, daxQuery);

      if (!result.success) {
        console.error('Erro na query DAX:', result.error);
        throw new Error(result.error || 'Erro ao executar query DAX');
      }

      const rows = result.data || [];
      console.log('Registros retornados:', rows.length);

      // Determinar tabela de destino
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
        throw new Error(`Tipo de entidade não suportado: ${config.entity_type}`);
      }

      // Transformar dados
      const mappedData = rows.map((row: any) => {
        const mapped: Record<string, any> = {
          company_group_id: connection.company_group_id,
          raw_data: row
        };

        for (const [pbiField, dbField] of Object.entries(config.field_mapping)) {
          const fieldName = dbField as string;
          const value = findValueInRow(row, pbiField, fieldName);
          
          if (value !== undefined && value !== null) {
            if (['quantity', 'total_value', 'cost', 'amount', 'min_quantity', 'max_quantity'].includes(fieldName)) {
              mapped[fieldName] = parseFloat(value) || 0;
            } else if (['sale_date', 'transaction_date', 'updated_at_external'].includes(fieldName)) {
              let dateValue = value;
              if (typeof dateValue === 'string' && dateValue.includes('T')) {
                dateValue = dateValue.split('T')[0];
              }
              mapped[fieldName] = dateValue;
            } else if (['layer_01', 'layer_02', 'layer_03', 'layer_04'].includes(fieldName)) {
              mapped[fieldName] = value ? String(value).trim() : null;
            } else {
              mapped[fieldName] = String(value).trim();
            }
          }
        }

        return mapped;
      });

      // Determinar campos obrigatórios
      const requiredFields: Record<string, string[]> = {
        companies: ['external_id'],
        employees: ['external_id', 'external_company_id'],
        products: ['external_id'],
        sales: ['external_id', 'external_product_id', 'external_company_id', 'sale_date', 'quantity', 'total_value'],
        cash_flow: ['external_id', 'transaction_date', 'amount'],
        cash_flow_statement: ['category_id', 'transaction_date', 'amount'],
        categories: ['external_id'],
        stock: ['external_product_id', 'quantity']
      };

      const required = requiredFields[config.entity_type] || ['external_id'];

      // Filtrar registros válidos
      let validData = mappedData.filter(item => {
        return required.every(field => {
          const value = item[field];
          if (value === undefined || value === null) return false;
          if (typeof value === 'string' && value.trim() === '') return false;
          if (typeof value === 'number' && isNaN(value)) return false;
          return true;
        });
      });
      
      console.log('Registros válidos:', validData.length);

      // Para cash_flow_statement: gerar external_id e deletar período antes de inserir
      if (config.entity_type === 'cash_flow_statement') {
        validData.forEach(item => {
          item.external_id = `${item.transaction_date}|${item.category_id || ''}`.toLowerCase();
        });

        if (filterDate && (syncType === 'incremental' || syncType === 'initial')) {
          await supabaseAdmin
            .from(tableName)
            .delete()
            .eq('company_group_id', connection.company_group_id)
            .gte('transaction_date', filterDate);
        }
      }

      // TRATAMENTO ESPECIAL PARA ESTOQUE
      if (config.entity_type === 'stock') {
        const stockMap = new Map<string, any>();
        
        validData.forEach(item => {
          const key = `${item.external_product_id}|${item.external_company_id || ''}`.toLowerCase();
          
          if (stockMap.has(key)) {
            const existing = stockMap.get(key);
            existing.quantity = (existing.quantity || 0) + (item.quantity || 0);
            existing.min_quantity = item.min_quantity ?? existing.min_quantity;
            existing.max_quantity = item.max_quantity ?? existing.max_quantity;
            existing.unit = item.unit ?? existing.unit;
          } else {
            stockMap.set(key, { ...item, external_id: key });
          }
        });
        
        validData = Array.from(stockMap.values());

        const today = new Date().toISOString().split('T')[0];
        const historyData = validData.map(item => ({
          company_group_id: item.company_group_id,
          external_product_id: item.external_product_id,
          external_company_id: item.external_company_id || null,
          snapshot_date: today,
          unit: item.unit || null,
          min_quantity: item.min_quantity || 0,
          max_quantity: item.max_quantity || 0,
          quantity: item.quantity || 0
        }));

        await supabaseAdmin
          .from('external_stock_history')
          .delete()
          .eq('company_group_id', connection.company_group_id)
          .eq('snapshot_date', today);

        await supabaseAdmin.from('external_stock_history').insert(historyData);

        await supabaseAdmin
          .from('external_stock')
          .delete()
          .eq('company_group_id', connection.company_group_id);

        await supabaseAdmin.from('external_stock').insert(validData);

        const duration = Date.now() - startTime;

        await supabaseAdmin
          .from('powerbi_sync_logs')
          .update({
            status: 'success',
            records_synced: validData.length,
            finished_at: new Date().toISOString(),
            duration_ms: duration
          })
          .eq('id', syncLog?.id);

        await supabaseAdmin
          .from('powerbi_sync_configs')
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_count: validData.length,
            sync_error: null
          })
          .eq('id', config.id);

        await supabaseAdmin
          .from('powerbi_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            sync_status: 'success',
            sync_error: null
          })
          .eq('id', connection.id);

        return NextResponse.json({
          success: true,
          records_synced: validData.length,
          duration_ms: duration,
          sync_type: syncType
        });
      }

      if (validData.length === 0) {
        if (syncType === 'incremental') {
          const duration = Date.now() - startTime;
          
          await supabaseAdmin
            .from('powerbi_sync_logs')
            .update({
              status: 'success',
              records_synced: 0,
              finished_at: new Date().toISOString(),
              duration_ms: duration
            })
            .eq('id', syncLog?.id);

          return NextResponse.json({
            success: true,
            records_synced: 0,
            duration_ms: duration,
            sync_type: syncType
          });
        }
        throw new Error(`Nenhum registro válido encontrado. Campos obrigatórios: ${required.join(', ')}`);
      }

      const { error: insertError } = await supabaseAdmin
        .from(tableName)
        .upsert(validData, { onConflict: 'company_group_id,external_id' });

      if (insertError) {
        throw new Error(`Erro ao inserir dados: ${insertError.message}`);
      }

      const duration = Date.now() - startTime;

      await supabaseAdmin
        .from('powerbi_sync_logs')
        .update({
          status: 'success',
          records_synced: validData.length,
          finished_at: new Date().toISOString(),
          duration_ms: duration
        })
        .eq('id', syncLog?.id);

      await supabaseAdmin
        .from('powerbi_sync_configs')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_count: validData.length,
          sync_error: null
        })
        .eq('id', config.id);

      await supabaseAdmin
        .from('powerbi_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          sync_status: 'success',
          sync_error: null
        })
        .eq('id', connection.id);

      return NextResponse.json({
        success: true,
        records_synced: validData.length,
        duration_ms: duration,
        sync_type: syncType
      });

    } catch (syncError: any) {
      const duration = Date.now() - startTime;
      console.error('Erro na sincronização:', syncError);

      await supabaseAdmin
        .from('powerbi_sync_logs')
        .update({
          status: 'error',
          error_message: syncError.message,
          finished_at: new Date().toISOString(),
          duration_ms: duration
        })
        .eq('id', syncLog?.id);

      await supabaseAdmin
        .from('powerbi_sync_configs')
        .update({ sync_error: syncError.message })
        .eq('id', config.id);

      return NextResponse.json({ success: false, error: syncError.message }, { status: 500 });
    }

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// ============================================
// FUNÇÃO: Processar em lotes por PERÍODO DE DIAS
// Injeta FILTER(ALL(campo_data), ...) no SUMMARIZECOLUMNS
// ============================================
async function processInDateRangeBatches(
  config: any,
  connection: any,
  baseQuery: string,
  syncType: string,
  filterDate: string | null,
  syncLog: any,
  startTime: number
) {
  // Configuração de dias por lote
  const DAYS_PER_BATCH = config.entity_type === 'cash_flow' ? 10 : 5;
  const entityLabel = config.entity_type === 'sales' ? 'VENDAS' : 'CAIXA';
  
  console.log(`\n========================================`);
  console.log(`SINCRONIZAÇÃO DE ${entityLabel} POR PERÍODO`);
  console.log(`Lotes de ${DAYS_PER_BATCH} dias`);
  console.log(`========================================\n`);

  // Extrair nome da tabela do Power BI
  const tableMatch = baseQuery.match(/(\w+)\[/);
  const pbiTableName = tableMatch ? tableMatch[1] : '';

  if (!pbiTableName) {
    throw new Error('Não foi possível extrair nome da tabela da query DAX');
  }

  // Encontrar o campo de data no mapeamento
  let dateFieldPbi = '';
  for (const [pbiField, dbField] of Object.entries(config.field_mapping)) {
    if (dbField === 'sale_date' || dbField === 'transaction_date') {
      dateFieldPbi = pbiField;
      break;
    }
  }

  if (!dateFieldPbi) {
    dateFieldPbi = config.date_field || '';
  }

  // Extrair nome do campo sem colchetes
  let dateFieldClean = dateFieldPbi.replace(/\[|\]/g, '');

  console.log(`Tabela Power BI: ${pbiTableName}`);
  console.log(`Campo de data: ${dateFieldClean}`);
  console.log(`Filtro de data inicial: ${filterDate || 'Nenhum'}`);

  // Tabela de destino no Supabase
  const destTableMap: Record<string, string> = {
    sales: 'external_sales',
    cash_flow: 'external_cash_flow'
  };
  const destTable = destTableMap[config.entity_type];

  // Campos obrigatórios
  const requiredFieldsMap: Record<string, string[]> = {
    sales: ['external_id', 'external_product_id', 'external_company_id', 'sale_date', 'quantity', 'total_value'],
    cash_flow: ['external_id', 'transaction_date', 'amount']
  };
  const required = requiredFieldsMap[config.entity_type];

  // Calcular período total
  const startDate = filterDate ? new Date(filterDate) : new Date('2025-01-01');
  const endDate = new Date(); // Hoje
  
  console.log(`Período: ${startDate.toISOString().split('T')[0]} até ${endDate.toISOString().split('T')[0]}`);

  let totalRecords = 0;
  let totalValid = 0;
  let batchNumber = 0;
  const errors: string[] = [];

  // Processar em lotes de dias
  let currentStart = new Date(startDate);
  
  while (currentStart <= endDate) {
    batchNumber++;
    
    // Calcular fim do lote
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + DAYS_PER_BATCH - 1);
    
    if (currentEnd > endDate) {
      currentEnd.setTime(endDate.getTime());
    }

    const startStr = currentStart.toISOString().split('T')[0];
    const endStr = currentEnd.toISOString().split('T')[0];

    console.log(`\n📦 LOTE ${batchNumber}: ${startStr} até ${endStr}`);

    try {
      // Construir query injetando o FILTER(ALL(...)) no SUMMARIZECOLUMNS
      const query = injectDateFilterIntoQuery(
        baseQuery,
        pbiTableName,
        dateFieldClean,
        startStr,
        endStr
      );

      console.log('Query:', query.substring(0, 500) + (query.length > 500 ? '...' : ''));

      const result = await executeDaxQuery(connection, config.dataset_id, query);

      if (!result.success) {
        console.error(`❌ Erro na query do lote ${batchNumber}:`, result.error);
        errors.push(`Lote ${batchNumber} (${startStr} - ${endStr}): ${result.error}`);
        
        if (batchNumber === 1) {
          throw new Error(`Erro no primeiro lote: ${result.error}`);
        }
        
        currentStart.setDate(currentStart.getDate() + DAYS_PER_BATCH);
        continue;
      }

      const rows = result.data || [];
      console.log(`📊 Registros retornados: ${rows.length.toLocaleString()}`);

      totalRecords += rows.length;

      if (rows.length > 0) {
        const validCount = await saveValidData(rows, config, connection, required, destTable);
        totalValid += validCount;
        console.log(`✅ Salvos: ${validCount.toLocaleString()} registros`);
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`⏱️ Tempo: ${elapsed}s | Total: ${totalRecords.toLocaleString()} | Válidos: ${totalValid.toLocaleString()}`);

    } catch (batchError: any) {
      console.error(`❌ Erro no lote ${batchNumber}:`, batchError.message);
      errors.push(`Lote ${batchNumber}: ${batchError.message}`);
      
      if (batchNumber === 1) {
        throw batchError;
      }
    }

    // Avançar para próximo período
    currentStart.setDate(currentStart.getDate() + DAYS_PER_BATCH);

    // Limite de segurança
    if (batchNumber >= 200) {
      console.log(`⚠️ Limite de 200 lotes atingido`);
      break;
    }
  }

  const duration = Date.now() - startTime;

  console.log(`\n========================================`);
  console.log(`RESUMO FINAL - ${entityLabel}`);
  console.log(`========================================`);
  console.log(`Lotes: ${batchNumber} | Registros: ${totalRecords.toLocaleString()} | Válidos: ${totalValid.toLocaleString()}`);
  console.log(`Erros: ${errors.length} | Duração: ${Math.round(duration / 1000)}s`);
  console.log(`========================================\n`);

  // Atualizar logs e configs
  await supabaseAdmin
    .from('powerbi_sync_logs')
    .update({
      status: errors.length > batchNumber / 2 ? 'error' : 'success',
      records_processed: totalRecords,
      records_created: totalValid,
      records_synced: totalValid,
      error_message: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
      finished_at: new Date().toISOString(),
      duration_ms: duration
    })
    .eq('id', syncLog?.id);

  await supabaseAdmin
    .from('powerbi_sync_configs')
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_count: totalValid,
      sync_error: errors.length > 0 ? `${errors.length} erro(s)` : null
    })
    .eq('id', config.id);

  await supabaseAdmin
    .from('powerbi_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      sync_status: 'success',
      sync_error: null
    })
    .eq('id', connection.id);

  // Atualizar materialized views
  if (config.entity_type === 'sales') {
    console.log('🔄 Atualizando materialized views de vendas...');
    try {
      await supabaseAdmin.rpc('refresh_sales_views');
      console.log('✅ Materialized views atualizadas!');
    } catch (refreshError) {
      console.error('⚠️ Erro ao atualizar materialized views:', refreshError);
    }
  }

  if (config.entity_type === 'cash_flow') {
    console.log('🔄 Atualizando materialized view de cash flow...');
    try {
      await supabaseAdmin.rpc('refresh_cash_flow_views');
      console.log('✅ Materialized view atualizada!');
    } catch (refreshError) {
      console.error('⚠️ Erro ao atualizar materialized view:', refreshError);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Sincronização de ${entityLabel.toLowerCase()} concluída`,
    details: {
      lotes_processados: batchNumber,
      total_registros: totalRecords,
      registros_validos: totalValid,
      duracao_segundos: Math.round(duration / 1000),
      erros: errors.length
    }
  });
}

// ============================================
// FUNÇÃO: Injetar filtro de data no SUMMARIZECOLUMNS
// Formato: FILTER(ALL(Tabela[campo]), Tabela[campo] >= DATE(...) && Tabela[campo] <= DATE(...))
// ============================================
function injectDateFilterIntoQuery(
  baseQuery: string,
  tableName: string,
  dateField: string,
  startDate: string,
  endDate: string
): string {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

  // Construir o filtro de data
  const dateFilter = `FILTER(ALL(${tableName}[${dateField}]), ${tableName}[${dateField}] >= DATE(${startYear}, ${startMonth}, ${startDay}) && ${tableName}[${dateField}] <= DATE(${endYear}, ${endMonth}, ${endDay}))`;

  // Encontrar onde injetar - logo antes da medida ("alias", ...)
  // Procurar por: "algo", [Medida] ou "algo", SUM(...)
  const measurePattern = /("[\w]+",\s*(?:\[[\w]+\]|SUM|COUNT|AVERAGE|MIN|MAX))/i;
  
  if (measurePattern.test(baseQuery)) {
    // Injetar o filtro antes da primeira medida
    return baseQuery.replace(measurePattern, `${dateFilter},\n    $1`);
  }

  // Fallback: se não encontrar o padrão, tentar inserir antes do último parêntese do SUMMARIZECOLUMNS
  // Encontrar SUMMARIZECOLUMNS e seu conteúdo
  const summarizeMatch = baseQuery.match(/SUMMARIZECOLUMNS\s*\(([\s\S]*?)\)\s*,?\s*(?:NOT ISBLANK|$)/i);
  
  if (summarizeMatch) {
    const summarizeContent = summarizeMatch[1];
    const lastCommaIndex = summarizeContent.lastIndexOf(',');
    
    if (lastCommaIndex > 0) {
      // Encontrar a posição para inserir (antes da última coluna/medida)
      const beforeMeasure = summarizeContent.substring(0, lastCommaIndex);
      const afterMeasure = summarizeContent.substring(lastCommaIndex);
      
      const newContent = `${beforeMeasure},\n    ${dateFilter}${afterMeasure}`;
      return baseQuery.replace(summarizeContent, newContent);
    }
  }

  // Se nada funcionar, retorna a query original (vai falhar, mas pelo menos não quebra)
  console.warn('⚠️ Não foi possível injetar filtro de data na query');
  return baseQuery;
}

// Salvar dados válidos no Supabase
async function saveValidData(
  rows: any[],
  config: any,
  connection: any,
  required: string[],
  destTable: string
): Promise<number> {
  if (rows.length === 0) return 0;

  // Mapear dados
  const mappedData = rows.map((row: any) => {
    const mapped: Record<string, any> = {
      company_group_id: connection.company_group_id,
      raw_data: row
    };

    for (const [pbiField, dbField] of Object.entries(config.field_mapping)) {
      const fieldName = dbField as string;
      const value = findValueInRow(row, pbiField, fieldName);

      if (value !== undefined && value !== null) {
        if (['quantity', 'total_value', 'cost', 'amount'].includes(fieldName)) {
          mapped[fieldName] = parseFloat(value) || 0;
        } else if (['sale_date', 'transaction_date'].includes(fieldName)) {
          let dateValue = value;
          if (typeof dateValue === 'string' && dateValue.includes('T')) {
            dateValue = dateValue.split('T')[0];
          }
          mapped[fieldName] = dateValue;
        } else {
          mapped[fieldName] = String(value).trim();
        }
      }
    }

    return mapped;
  });

  // Filtrar válidos
  const validData = mappedData.filter(item => {
    return required.every(field => {
      const value = item[field];
      if (value === undefined || value === null) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      if (typeof value === 'number' && isNaN(value)) return false;
      return true;
    });
  });

  if (validData.length === 0) return 0;

  // Salvar em lotes de 100
  const upsertBatchSize = 100;
  let savedCount = 0;

  for (let i = 0; i < validData.length; i += upsertBatchSize) {
    const batch = validData.slice(i, i + upsertBatchSize);

    const { error: upsertError } = await supabaseAdmin
      .from(destTable)
      .upsert(batch, { onConflict: 'company_group_id,external_id', ignoreDuplicates: false });

    if (!upsertError) {
      savedCount += batch.length;
    }
  }

  return savedCount;
}

// Função para encontrar valor no row
function findValueInRow(row: Record<string, any>, fieldName: string, dbFieldName?: string): any {
  const normalizedField = fieldName.toLowerCase().replace(/[\[\]]/g, '');
  
  for (const [key, value] of Object.entries(row)) {
    if (key === fieldName) return value;
    if (key === `[${fieldName}]`) return value;
    
    const match = key.match(/\[([^\]]+)\]$/);
    if (match && match[1].toLowerCase() === normalizedField) return value;
    if (key.toLowerCase().endsWith(`[${normalizedField}]`)) return value;
    if (key.toLowerCase().replace(/[\[\]]/g, '') === normalizedField) return value;
    
    const keyParts = key.split('[');
    const lastPart = keyParts[keyParts.length - 1]?.replace(']', '');
    if (lastPart?.toLowerCase() === normalizedField) return value;
    
    if (dbFieldName) {
      const normalizedDbField = dbFieldName.toLowerCase();
      if (key === `[${dbFieldName}]`) return value;
      if (key.toLowerCase() === `[${normalizedDbField}]`) return value;
      if (lastPart?.toLowerCase() === normalizedDbField) return value;
    }
  }
  
  return undefined;
}

// Função para adicionar filtro de data na query DAX (para entidades não-grandes)
function addDateFilterToQuery(query: string, dateField: string, filterDate: string): string {
  const [year, month, day] = filterDate.split('-');
  const dateFilter = `DATE(${year}, ${parseInt(month)}, ${parseInt(day)})`;

  const tableMatch = query.match(/(\w+)\[/);
  const tableName = tableMatch ? tableMatch[1] : '';

  if (!tableName) {
    return query;
  }

  if (query.includes('NOT ISBLANK')) {
    return query.replace(
      /NOT ISBLANK\(\[(\w+)\]\)/,
      `NOT ISBLANK([$1]) && ${tableName}[${dateField}] >= ${dateFilter}`
    );
  }

  return query;
}

// GET - Buscar logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connection_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('powerbi_sync_logs')
      .select(`*, connection:powerbi_connections(id, name)`)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}