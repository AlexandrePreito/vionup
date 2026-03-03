import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cache global de tokens do Power BI
const tokenCache = new Map<string, { token: string; expires: number }>();

/** Limite da API Power BI: 100k linhas ou 1M valores. Acima disso os dados vêm truncados (200 OK). */
const POWERBI_MAX_ROWS_PER_QUERY = 100000;
const POWERBI_TRUNCATION_THRESHOLD = 95000;

async function getPowerBIToken(connection: any): Promise<string> {
  const cacheKey = connection.client_id;
  const cached = tokenCache.get(cacheKey);
  
  // Se tem cache válido, usar
  if (cached && cached.expires > Date.now()) {
    console.log('✅ Usando token em cache');
    return cached.token;
  }
  
  // Buscar novo token
  console.log('🔑 Buscando novo token do Power BI...');
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: connection.client_id,
        client_secret: connection.client_secret,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
        grant_type: 'client_credentials',
      }),
    }
  );

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Erro ao obter token do Power BI: ${errorText}`);
  }

  const { access_token, expires_in } = await tokenResponse.json();
  
  if (!access_token) {
    throw new Error('Token não retornado na resposta do Power BI');
  }
  
  // Cachear por 50 minutos (expires_in geralmente é 3600s = 1h)
  tokenCache.set(cacheKey, {
    token: access_token,
    expires: Date.now() + ((expires_in || 3600) - 600) * 1000 // 10min de margem
  });
  
  console.log('✅ Novo token obtido e cacheado');
  return access_token;
}

// ============================================================
// INTERFACES E TIPOS
// ============================================================

interface DaxQueryOptions {
  workspaceId: string;
  datasetId: string;
  accessToken: string;
  query: string;
  timeoutMs?: number;
  retryableColumns?: { column: string; entityType: string }[];
}

interface DaxQueryResult {
  rows: any[];
  retried?: boolean;
  retriedColumn?: string;
}

// ============================================================
// EXECUÇÃO DE QUERY DAX
// ============================================================

async function executeDaxQuery(options: DaxQueryOptions): Promise<DaxQueryResult> {
  const {
    workspaceId,
    datasetId,
    accessToken,
    query,
    timeoutMs = 600000,  // 10 minutos
    retryableColumns = []
  } = options;

  const url = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/executeQueries`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  const executeQuery = async (daxQuery: string): Promise<Response> => {
    return Promise.race([
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          queries: [{ query: daxQuery }],
          serializerSettings: { includeNulls: true },
        }),
      }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: Query demorou mais de ${timeoutMs / 1000} segundos`)), timeoutMs)
      )
    ]) as Promise<Response>;
  };

  // Primeira tentativa
  let response: Response;
  try {
    response = await executeQuery(query);
  } catch (fetchError: any) {
    throw new Error(`Erro de rede ao executar query DAX: ${fetchError.message}`);
  }

  // Se OK, retornar resultados
  if (response.ok) {
    const result = await response.json();
    return { rows: result?.results?.[0]?.tables?.[0]?.rows || [] };
  }

  // Se erro, verificar se é retryable
  const errorText = await response.text();

  for (const { column, entityType } of retryableColumns) {
    const isColumnError = errorText.includes(column) &&
      (errorText.includes('cannot be found') ||
       errorText.includes('não pode ser encontrada') ||
       errorText.includes('not be used'));

    if (isColumnError && query.includes(column)) {
      console.log(`🔄 Retrying sem coluna ${column}...`);

      // Remover coluna da query (genérico)
      const cleanedQuery = query
        .replace(new RegExp(`,\\s*\\w+\\[${column}\\]`, 'gi'), '')
        .replace(new RegExp(`\\w+\\[${column}\\],\\s*`, 'gi'), '');

      try {
        const retryResponse = await executeQuery(cleanedQuery);
        if (retryResponse.ok) {
          const result = await retryResponse.json();
          console.log(`✅ Query executada com sucesso sem ${column}`);
          return {
            rows: result?.results?.[0]?.tables?.[0]?.rows || [],
            retried: true,
            retriedColumn: column
          };
        }
        const retryErrorText = await retryResponse.text();
        throw new Error(`Retry sem ${column} também falhou: ${retryErrorText}`);
      } catch (retryError: any) {
        throw new Error(`Erro DAX: ${errorText}. Retry sem ${column}: ${retryError.message}`);
      }
    }
  }

  // Não é retryable — propagar erro original
  throw new Error(`Erro ao executar query DAX: ${errorText}`);
}

/**
 * Encontra a posição do ')' que fecha o FILTER externo,
 * usando contagem de parênteses para lidar com aninhamento.
 * Retorna a posição do último ')' do FILTER, ou -1 se não encontrou.
 */
function findFilterConditionEnd(query: string): number {
  // Encontrar o '(' de abertura do FILTER
  const filterStart = query.search(/FILTER\s*\(/i);
  if (filterStart === -1) return -1;
  
  // Posição do '(' de abertura
  const openParen = query.indexOf('(', filterStart);
  if (openParen === -1) return -1;
  
  let depth = 1;
  let i = openParen + 1;
  
  while (i < query.length && depth > 0) {
    const char = query[i];
    if (char === '(') depth++;
    else if (char === ')') {
      depth--;
      if (depth === 0) {
        // Encontrou o ')' de fechamento do FILTER
        // O filtro de data deve ser inserido antes deste ')'
        return i;
      }
    }
    i++;
  }
  
  return -1;
}

/**
 * Injeta filtro de data em query DAX de forma segura
 * Usa contagem de parênteses para lidar com queries aninhadas
 * @param daxQuery Query DAX original
 * @param dateField Campo de data (ex: 'dt_contabil')
 * @param tableName Nome da tabela (ex: 'CaixaItem')
 * @param startDate Data inicial (formato: YYYY-MM-DD)
 * @param endDate Data final (formato: YYYY-MM-DD)
 * @returns Query DAX com filtro de data injetado
 */
function injectDateFilter(
  daxQuery: string,
  dateField: string,
  tableName: string,
  startDate: string,
  endDate: string
): string {
  // Formatar datas para DATE(YYYY,MM,DD)
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  
  const dateFilter = `${tableName}[${dateField}] >= DATE(${startYear}, ${startMonth}, ${startDay}) && ${tableName}[${dateField}] <= DATE(${endYear}, ${endMonth}, ${endDay})`;

  // Validar que tableName existe na query, senão tentar extrair
  if (!daxQuery.includes(tableName)) {
    console.warn(`⚠️ Tabela ${tableName} não encontrada na query. Tentando extrair...`);
    const tableMatch = daxQuery.match(/(?:SUMMARIZECOLUMNS|FILTER|SELECTCOLUMNS)\s*\(\s*([^\[]+)\[/i);
    if (tableMatch) {
      const extractedTable = tableMatch[1].trim();
      if (extractedTable !== tableName) {
        // Chamar recursivamente com tabela corrigida
        return injectDateFilter(daxQuery, dateField, extractedTable, startDate, endDate);
      }
    }
  }

  // Normalizar: remover EVALUATE do início
  const queryBody = daxQuery.replace(/^EVALUATE\s*/i, '').trim();

  // Caso 1: Query já tem FILTER externo — adicionar condição com &&
  // Usar contagem de parênteses para encontrar o último argumento do FILTER
  const filterMatch = queryBody.match(/^FILTER\s*\(/i);
  if (filterMatch) {
    const insertPos = findFilterConditionEnd(queryBody);
    if (insertPos > 0) {
      // Inserir && dateFilter antes do último )
      const beforeClose = queryBody.substring(0, insertPos).trimEnd();
      const afterClose = queryBody.substring(insertPos);
      return `EVALUATE\n${beforeClose} && (${dateFilter})${afterClose}`;
    }
    // Fallback: envolver tudo
    console.warn('⚠️ Não conseguiu encontrar fim do FILTER. Envolvendo em novo FILTER.');
    return `EVALUATE\nFILTER(\n  ${queryBody},\n  ${dateFilter}\n)`;
  }

  // Caso 2/3/4: Query sem FILTER externo — envolver com FILTER
  return `EVALUATE\nFILTER(\n  ${queryBody},\n  ${dateFilter}\n)`;
}

/** Extrai nome da tabela da query DAX (ex.: VendaItemGeral, CaixaItem). */
function getTableNameFromDaxQuery(daxQuery: string): string {
  const tableMatch = daxQuery.match(/SUMMARIZECOLUMNS\s*\(\s*([^\[]+)\[/i) ||
    daxQuery.match(/FILTER\s*\(\s*'?([^'\[]+)'?\[/i) ||
    daxQuery.match(/SELECTCOLUMNS\s*\(\s*([^\[]+)\[/i) ||
    daxQuery.match(/SUMMARIZE\s*\(\s*([^\s,[]+)\s*[,[]/i) ||
    daxQuery.match(/ADDCOLUMNS\s*\(\s*SUMMARIZE\s*\(\s*([^\s,[]+)\s*[,[]/i);
  return tableMatch ? tableMatch[1].trim() : 'VendaItemGeral';
}

/** Injeta filtro por empresa na query DAX (evita truncamento ao buscar por empresa). */
function injectCompanyFilter(daxQuery: string, tableName: string, companyCode: string): string {
  const escaped = String(companyCode).replace(/"/g, '""'); // DAX usa "" para escapar aspas duplas
  const companyFilter = `${tableName}[Empresa] = "${escaped}"`;
  const queryBody = daxQuery.replace(/^EVALUATE\s*/i, '').trim();
  const filterMatch = queryBody.match(/^FILTER\s*\(/i);
  if (filterMatch) {
    const insertPos = findFilterConditionEnd(queryBody);
    if (insertPos > 0) {
      const before = queryBody.substring(0, insertPos).trimEnd();
      const after = queryBody.substring(insertPos);
      return `EVALUATE\n${before} && (${companyFilter})${after}`;
    }
  }
  return daxQuery;
}

interface ProcessResult {
  status: 'processing' | 'completed' | 'empty' | 'day_error' | 'cancelled';
  queue_id: string;
  day?: string;
  day_records?: number;
  processed_days?: number;
  total_days?: number;
  processed_records?: number;
  has_more?: boolean;
  progress?: number;
  error?: string;
}

// ============================================================
// POST - Processar próximo dia da fila
// ============================================================
export async function POST(req: NextRequest): Promise<NextResponse<ProcessResult>> {
  let queueIdForError: string | undefined;
  console.log('🔔 [SYNC-PROCESS] API chamada');
  try {
    // Usar supabaseAdmin (sem autenticação de usuário)
    const body = await req.json();
    const { queue_id } = body;
    console.log('🔔 [SYNC-PROCESS] queue_id:', queue_id);
    queueIdForError = queue_id;

    // 1. Pegar próximo item para processar
    let queueItem: any;

    if (queue_id) {
      // Primeiro, garantir que o status é 'processing'
      await supabaseAdmin
        .from('sync_queue')
        .update({ status: 'processing', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', queue_id)
        .in('status', ['pending', 'processing']); // Só atualiza se pending ou já processing

      const { data } = await supabaseAdmin
        .from('sync_queue')
        .select('*')
        .eq('id', queue_id)
        .single();
      queueItem = data;
      
      if (queueItem) {
        console.log(`📋 Queue item: id=${queueItem.id}, status=${queueItem.status}, processed_days=${queueItem.processed_days}/${queueItem.total_days}`);
      }
    } else {
      const { data } = await supabaseAdmin.rpc('get_next_sync_queue_item');
      queueItem = data;
    }

    // Fila vazia ou item não encontrado
    if (!queueItem || !queueItem.id) {
      return NextResponse.json({
        status: 'empty',
        queue_id: '',
        message: 'Nenhum item na fila'
      } as any);
    }

    // ============================================================
    // VALIDAÇÃO DE SEGURANÇA: detectar dados corrompidos
    // ============================================================
    if (queueItem.total_days > 1095) {
      console.error(`❌ ABORTANDO: total_days=${queueItem.total_days} (máx 1095). Bug de data detectado.`);
      console.error(`❌ start_date=${queueItem.start_date}, end_date=${queueItem.end_date}`);

      await supabaseAdmin
        .from('sync_queue')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error_message: `Abortado: total_days=${queueItem.total_days} indica bug de data (start=${queueItem.start_date}, end=${queueItem.end_date})`
        })
        .eq('id', queueItem.id);

      return NextResponse.json({
        status: 'day_error',
        queue_id: queueItem.id,
        error: `Período inválido: ${queueItem.total_days} dias (máx 1095). Corrija as datas e tente novamente.`,
      }, { status: 400 });
    }

    // Validar anos das datas
    const qStartYear = new Date(queueItem.start_date).getFullYear();
    const qEndYear = new Date(queueItem.end_date).getFullYear();
    if (qStartYear < 2000 || qEndYear < 2000) {
      console.error(`❌ ABORTANDO: Ano inválido detectado: start=${qStartYear}, end=${qEndYear}`);

      await supabaseAdmin
        .from('sync_queue')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: `Abortado: ano inválido (start=${qStartYear}, end=${qEndYear}). Formato de data incorreto.`
        })
        .eq('id', queueItem.id);

      return NextResponse.json({
        status: 'day_error',
        queue_id: queueItem.id,
        error: `Ano inválido: ${qStartYear}/${qEndYear}. Datas devem ser entre 2000-2100.`,
      }, { status: 400 });
    }

    // Item já completado
    // Verificar se item foi cancelado entre iterações
    if (queueItem.status === 'cancelled') {
      return NextResponse.json({
        status: 'cancelled',
        queue_id: queueItem.id,
        message: 'Sincronização cancelada pelo usuário'
      });
    }

    if (queueItem.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        queue_id: queueItem.id,
        processed_days: queueItem.total_days,
        total_days: queueItem.total_days,
        processed_records: queueItem.processed_records,
        progress: 100,
      });
    }

    // ----------------------------------------------------------
    // 2. Buscar configuração (precisa do entity_type para batch size)
    // ----------------------------------------------------------
    const { data: config, error: configError } = await supabaseAdmin
      .from('powerbi_sync_configs')
      .select('*, connection:powerbi_connections(*)')
      .eq('id', queueItem.config_id)
      .single();

    if (configError) {
      console.error('❌ Erro ao buscar configuração:', configError);
      await supabaseAdmin.rpc('finish_sync_queue_item', {
        p_queue_id: queueItem.id,
        p_status: 'failed',
        p_total_records: queueItem.processed_records || 0,
        p_error_message: `Erro ao buscar configuração: ${configError.message}`,
      });

      return NextResponse.json({
        status: 'day_error',
        queue_id: queueItem.id,
        error: `Erro ao buscar configuração: ${configError.message}`,
      }, { status: 500 });
    }

    if (!config) {
      await supabaseAdmin.rpc('finish_sync_queue_item', {
        p_queue_id: queueItem.id,
        p_status: 'failed',
        p_total_records: queueItem.processed_records || 0,
        p_error_message: 'Configuração não encontrada',
      });

      return NextResponse.json({
        status: 'day_error',
        queue_id: queueItem.id,
        error: 'Configuração não encontrada',
      }, { status: 500 });
    }

    const connName = (config.connection as any)?.name || 'N/A';
    const groupId = queueItem.company_group_id || (config.connection as any)?.company_group_id;
    console.log(`📦 Processando sync: entidade=${config.entity_type} | conexão=${connName} | grupo=${groupId?.slice(0, 8)}...`);

    // ----------------------------------------------------------
    // 3. Calcular próximos DIAS a processar (batch)
    // ----------------------------------------------------------
    // Vendas: 3 dias (query DAX grande, evita timeout no Power BI)
    // Caixa: 7 dias (menos dados, pode ser maior)
    const DAYS_PER_BATCH = config.entity_type === 'sales' ? 3 : 7;
    const startDate = new Date(queueItem.start_date);
    const endDate = new Date(queueItem.end_date);
    const processedDays = queueItem.processed_days || 0;

    // Calcular range de dias deste batch
    const batchStartDate = new Date(startDate);
    batchStartDate.setDate(batchStartDate.getDate() + processedDays);

    const batchEndDate = new Date(batchStartDate);
    batchEndDate.setDate(batchEndDate.getDate() + DAYS_PER_BATCH - 1);

    // Não ultrapassar o endDate
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const batchEndDateOnly = new Date(batchEndDate.getFullYear(), batchEndDate.getMonth(), batchEndDate.getDate());

    if (batchEndDateOnly > endDateOnly) {
      batchEndDate.setTime(endDate.getTime());
    }

    // Verificar se já processou todos
    const batchStartDateOnly = new Date(batchStartDate.getFullYear(), batchStartDate.getMonth(), batchStartDate.getDate());
    if (batchStartDateOnly > endDateOnly) {
      // Finalizar item se já passou do último dia
      await supabaseAdmin.rpc('finish_sync_queue_item', {
        p_queue_id: queueItem.id,
        p_status: 'completed',
        p_total_records: queueItem.processed_records || 0,
        p_error_message: null,
      });

      return NextResponse.json({
        status: 'completed',
        queue_id: queueItem.id,
        processed_days: queueItem.total_days,
        total_days: queueItem.total_days,
        processed_records: queueItem.processed_records,
        progress: 100,
      });
    }

    const batchStartDateStr = batchStartDate.toISOString().split('T')[0];
    const batchEndDateStr = batchEndDate.toISOString().split('T')[0];
    const daysInBatch = Math.ceil((batchEndDate.getTime() - batchStartDate.getTime()) / 86400000) + 1;

    console.log(`📊 Processando batch de ${daysInBatch} dias: ${batchStartDateStr} até ${batchEndDateStr}`);

    // ----------------------------------------------------------
    // 4. Validar conexão (config já carregado no passo 2)
    // ----------------------------------------------------------
    if (!config.connection) {
      console.error('❌ Conexão não encontrada na configuração:', config);
      await supabaseAdmin.rpc('finish_sync_queue_item', {
        p_queue_id: queueItem.id,
        p_status: 'failed',
        p_total_records: queueItem.processed_records || 0,
        p_error_message: 'Conexão do Power BI não encontrada',
      });

      return NextResponse.json({
        status: 'day_error',
        queue_id: queueItem.id,
        error: 'Conexão do Power BI não encontrada',
      }, { status: 500 });
    }

    // Verificar se a entidade tem campo de data
    // Apenas vendas, caixa e fluxo de caixa têm campo de data
    const entitiesWithDate = ['sales', 'cash_flow', 'cash_flow_statement'];
    // Entidades "tabela full": sempre trazem a tabela completa, sem filtro de período
    const entitiesFullTable = ['companies', 'products', 'employees', 'categories', 'stock'];
    // hasDateField: verifica se a entidade tem campo de data configurado
    // NOTA: NÃO depende de is_incremental. Sync FULL também precisa processar dia-a-dia
    // para evitar timeout. A diferença entre full e incremental é apenas o RANGE de datas.
    const hasDateField = config.date_field && entitiesWithDate.includes(config.entity_type);

    // ----------------------------------------------------------
    // 5. Buscar token do Power BI
    // ----------------------------------------------------------
    if (!config.connection.tenant_id || !config.connection.client_id || !config.connection.client_secret) {
      const missingFields = [];
      if (!config.connection.tenant_id) missingFields.push('tenant_id');
      if (!config.connection.client_id) missingFields.push('client_id');
      if (!config.connection.client_secret) missingFields.push('client_secret');
      
      console.error('❌ Campos obrigatórios da conexão não encontrados:', missingFields);
      await supabaseAdmin.rpc('finish_sync_queue_item', {
        p_queue_id: queueItem.id,
        p_status: 'failed',
        p_total_records: queueItem.processed_records || 0,
        p_error_message: `Campos obrigatórios da conexão não encontrados: ${missingFields.join(', ')}`,
      });

      return NextResponse.json({
        status: 'day_error',
        queue_id: queueItem.id,
        error: `Campos obrigatórios da conexão não encontrados: ${missingFields.join(', ')}`,
      }, { status: 500 });
    }

    let access_token: string;
    try {
      access_token = await getPowerBIToken(config.connection);
    } catch (tokenError: any) {
      console.error('❌ Erro ao obter token do Power BI:', tokenError.message);
      await supabaseAdmin.rpc('finish_sync_queue_item', {
        p_queue_id: queueItem.id,
        p_status: 'failed',
        p_total_records: queueItem.processed_records || 0,
        p_error_message: `Erro ao obter token do Power BI: ${tokenError.message}`,
      });

      return NextResponse.json({
        status: 'day_error',
        queue_id: queueItem.id,
        error: `Erro ao obter token do Power BI: ${tokenError.message}`,
      }, { status: 500 });
    }

    // ----------------------------------------------------------
    // 5. Construir query DAX com filtro de range de datas
    // ----------------------------------------------------------
    if (!config.dax_query) {
      throw new Error('Query DAX não encontrada na configuração');
    }
    const startYear = batchStartDate.getFullYear();
    const startMonth = batchStartDate.getMonth() + 1;
    const startDay = batchStartDate.getDate();

    const endYear = batchEndDate.getFullYear();
    const endMonth = batchEndDate.getMonth() + 1;
    const endDay = batchEndDate.getDate();

    if (entitiesFullTable.includes(config.entity_type)) {
      console.log(`📋 [TABELA FULL] ${config.entity_type}: buscando tabela completa (independente de período)`);
    } else {
      console.log(`📊 Range de datas: ${startYear}-${startMonth}-${startDay} até ${endYear}-${endMonth}-${endDay}`);
    }

    // Usar query do config se disponível, senão gerar query otimizada para vendas
    let daxQuery: string;
    
    if (config.dax_query && config.dax_query.trim()) {
      // Usar query do config (pode ser para cash_flow, sales, etc.)
      daxQuery = config.dax_query;
      
      // Se tem campo de data, adicionar filtro de range de forma segura
      if (hasDateField && config.date_field) {
        // Extrair nome da tabela da query original
        const tableMatch = daxQuery.match(/SUMMARIZECOLUMNS\s*\(\s*([^\[]+)\[/i) || 
                                        daxQuery.match(/FILTER\s*\(\s*'?([^'\[]+)'?\[/i) ||
                                        daxQuery.match(/SELECTCOLUMNS\s*\(\s*([^\[]+)\[/i) ||
                                        daxQuery.match(/SUMMARIZE\s*\(\s*([^\s,[]+)\s*[,[]/i) ||
                                        daxQuery.match(/ADDCOLUMNS\s*\(\s*SUMMARIZE\s*\(\s*([^\s,[]+)\s*[,[]/i);
        const tableName = tableMatch ? tableMatch[1].trim() : '';
        
        if (!tableName) {
          console.warn('⚠️ Não foi possível extrair nome da tabela da query. Usando campo de data sem prefixo.');
        }
        
        // Formatar datas para YYYY-MM-DD
        const startDateStr = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
        const endDateStr = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
        
        // Usar tabela extraída ou tentar inferir do campo de data
        const finalTableName = tableName || (config.date_field.includes('[') ? 
          config.date_field.split('[')[0] : 
          'Tabela'); // Fallback genérico
        
        // Injetar filtro de data de forma segura
        daxQuery = injectDateFilter(
          daxQuery,
          config.date_field.replace(/\[|\]/g, ''), // Remove colchetes se houver
          finalTableName,
          startDateStr,
          endDateStr
        );
        
        console.log(`📅 Filtro de data injetado: ${finalTableName}[${config.date_field}] de ${startDateStr} até ${endDateStr}`);
      }
      
      // Adicionar TOPN apenas se necessário
      // - Entidades com data (vendas, caixa): NÃO adicionar TOPN (filtro já limita)
      // - Tabela full (empresas, produtos, funcionários, categorias): TOPN(100000) - tabela completa
      // - Outras sem data: TOPN(5000) - proteção contra timeout
      if (!daxQuery.toUpperCase().includes('TOPN')) {
        const stripEvaluate = (q: string) => q.replace(/^(\s*EVALUATE\s*\n?\s*)+/i, '').trim();
        const cleanQuery = stripEvaluate(daxQuery);

        if (hasDateField) {
          daxQuery = `EVALUATE\n${cleanQuery}`;
          console.log('📊 Sem TOPN (filtro de data já limita resultados)');
        } else if (entitiesFullTable.includes(config.entity_type)) {
          const topN = 100000;
          daxQuery = `EVALUATE TOPN(${topN}, ${cleanQuery})`;
          console.log(`📋 [TABELA FULL] ${config.entity_type}: sem período, TOPN(${topN}) para tabela completa`);
        } else {
          daxQuery = `EVALUATE TOPN(5000, ${cleanQuery})`;
          console.log('📊 TOPN(5000) adicionado (sem filtro de data)');
        }
      }
      
      console.log('📊 Usando Query DAX do config:', daxQuery.substring(0, 200));
      if (hasDateField) {
        console.log('📅 DAX com filtro:', daxQuery);
      } else {
        console.log(`📊 DAX para entidade sem data (${config.entity_type}):`, daxQuery.substring(0, 200));
      }
    } else {
      // Fallback: Query otimizada para vendas (compatibilidade)
      const tableName = 'VendaItemGeral';
      const dateField = config.date_field || 'dt_contabil';
      const dateFilter = `${tableName}[${dateField}] >= DATE(${startYear}, ${startMonth}, ${startDay}) && ${tableName}[${dateField}] <= DATE(${endYear}, ${endMonth}, ${endDay})`;

      daxQuery = `EVALUATE
TOPN(
  2000,
  FILTER(
    SUMMARIZECOLUMNS(
      ${tableName}[Empresa],
      ${tableName}[idVenda],
      ${tableName}[venda_id],
      ${tableName}[dt_contabil],
      ${tableName}[CodigoMaterial],
      ${tableName}[modo_venda_descr],
      ${tableName}[CodigoFuncionario],
      "cost", [CMV],
      "quantity", [Quantidades],
      "total_value", [Vendas Valor]
    ),
    ${dateFilter}
  )
)`;
      console.log('📊 Usando Query DAX padrão (vendas):', daxQuery.substring(0, 200));
    }

    console.log('🔍 FULL DAX QUERY:', daxQuery);
    console.log('📊 Query DAX final:', daxQuery);

    // ----------------------------------------------------------
    // 6. Executar query no Power BI
    // ----------------------------------------------------------
    if (!config.connection.workspace_id || !config.dataset_id) {
      const missingFields = [];
      if (!config.connection.workspace_id) missingFields.push('workspace_id');
      if (!config.dataset_id) missingFields.push('dataset_id');

      await supabaseAdmin.rpc('finish_sync_queue_item', {
        p_queue_id: queueItem.id,
        p_status: 'failed',
        p_total_records: queueItem.processed_records || 0,
        p_error_message: `Campos obrigatórios não encontrados: ${missingFields.join(', ')}`,
      });

      return NextResponse.json({
        status: 'day_error',
        queue_id: queueItem.id,
        error: `Campos obrigatórios não encontrados: ${missingFields.join(', ')}`,
      }, { status: 500 });
    }

    let queryResult: DaxQueryResult;
    try {
      queryResult = await executeDaxQuery({
        workspaceId: config.connection.workspace_id,
        datasetId: config.dataset_id,
        accessToken: access_token,
        query: daxQuery,
        retryableColumns: [
          { column: 'Periodo', entityType: 'cash_flow' }
        ]
      });
    } catch (queryError: any) {
      console.error('❌ Erro ao executar query DAX:', queryError.message);
      await supabaseAdmin.rpc('finish_sync_queue_item', {
        p_queue_id: queueItem.id,
        p_status: 'failed',
        p_total_records: queueItem.processed_records || 0,
        p_error_message: queryError.message,
      });

      return NextResponse.json({
        status: 'day_error',
        queue_id: queueItem.id,
        error: queryError.message,
      }, { status: 500 });
    }

    let rows = queryResult.rows;
    console.log(`📊 Power BI retornou ${rows.length} registros para o período ${batchStartDateStr} a ${batchEndDateStr}`);
    if (config.entity_type === 'companies') {
      console.log(`🏢 [Empresas] DAX retornou ${rows.length} empresas. Valores:`, rows.slice(0, 6).map((r: any) => {
        const idKey = Object.keys(r).find(k => /id|cod|empresa/i.test(k));
        const nameKey = Object.keys(r).find(k => /name|nome|fantasia/i.test(k));
        return { id: idKey ? r[idKey] : r, name: nameKey ? r[nameKey] : '-' };
      }));
    }

    // API Power BI limita a 100k linhas por request; acima disso retorna truncado (200 OK). Refazer por empresa.
    if (config.entity_type === 'sales' && rows.length >= POWERBI_TRUNCATION_THRESHOLD) {
      console.warn(`⚠️ Possível truncamento (${rows.length} >= ${POWERBI_TRUNCATION_THRESHOLD}). Refazendo por empresa para trazer todas as linhas.`);
      const tableName = getTableNameFromDaxQuery(daxQuery);
      const dateCol = config.date_field?.includes('[') ? config.date_field : `${tableName}[${config.date_field || 'dt_contabil'}]`;
      const distinctCompaniesDax = `EVALUATE SUMMARIZE(FILTER(${tableName}, ${dateCol} >= DATE(${startYear}, ${startMonth}, ${startDay}) && ${dateCol} <= DATE(${endYear}, ${endMonth}, ${endDay})), ${tableName}[Empresa])`;
      let companiesResult: DaxQueryResult | null = null;
      try {
        companiesResult = await executeDaxQuery({
          workspaceId: config.connection.workspace_id,
          datasetId: config.dataset_id,
          accessToken: access_token,
          query: distinctCompaniesDax,
        });
      } catch (err: any) {
        console.error('❌ Erro ao buscar empresas para refetch:', err.message);
      }
      const companyRows = companiesResult?.rows ?? [];
      const companyKey = companyRows.length > 0 ? Object.keys(companyRows[0]).find(k => /Empresa/i.test(k)) : null;
      const companies = companyKey ? companyRows.map((r: any) => String(r[companyKey] ?? '')).filter(Boolean) : [];
      if (companies.length === 0) {
        console.warn('⚠️ Nenhuma empresa retornada; mantendo resultado original.');
      } else {
        const allRows: any[] = [];
        for (const companyCode of companies) {
          const daxByCompany = injectCompanyFilter(daxQuery, tableName, companyCode);
          const res = await executeDaxQuery({
            workspaceId: config.connection.workspace_id,
            datasetId: config.dataset_id,
            accessToken: access_token,
            query: daxByCompany,
          });
          if (res.rows?.length) allRows.push(...res.rows);
        }
        rows = allRows;
        console.log(`📊 Refetch por empresa: ${companies.length} empresas, ${rows.length} linhas totais.`);
      }
    }

    if (rows.length > 5000) {
      console.warn(`⚠️ MUITOS REGISTROS (${rows.length})! Considere reduzir o batch size.`);
    }

    // ----------------------------------------------------------
    // 7. Transformar e salvar dados via Edge Function
    // ----------------------------------------------------------
    if (rows.length > 0) {
      if (!queueItem.company_group_id) {
        console.error('❌ company_group_id não encontrado no queueItem:', queueItem);
        await supabaseAdmin.rpc('finish_sync_queue_item', {
          p_queue_id: queueItem.id,
          p_status: 'failed',
          p_total_records: queueItem.processed_records || 0,
          p_error_message: 'company_group_id não encontrado no item da fila',
        });

        return NextResponse.json({
          status: 'day_error',
          queue_id: queueItem.id,
          error: 'company_group_id não encontrado no item da fila',
        }, { status: 500 });
      }

      // Transformar todos os registros
      const transformedRecords = rows.map((row: any) => transformRecord(row, config, queueItem.company_group_id));

      // ============================================================
      // GERAR external_id DETERMINÍSTICO para registros sem ID
      // ============================================================

      /** Hash determinístico baseado no conteúdo do registro */
      function deterministicHash(input: string): string {
        let hash = 5381;
        for (let i = 0; i < input.length; i++) {
          hash = ((hash << 5) + hash + input.charCodeAt(i)) & 0x7fffffff;
        }
        return hash.toString(36);
      }

      /** Gera external_id baseado no conteúdo do registro (sem randomness) */
      function generateExternalId(record: any, entityType: string, row: any): string {
        switch (entityType) {
          case 'cash_flow': {
            // Prioridade 1: idCaixa do Power BI + empresa para garantir unicidade
            const idCaixa = row?.['CaixaItem[Idcaixa]'] || row?.['CaixaItem[idCaixa]'] || 
                            row?.['[Idcaixa]'] || row?.idCaixa || row?.['[idCaixa]'];
            if (idCaixa) {
              // Incluir empresa no ID para evitar colisão entre filiais
              const empresa = record.external_company_id || 
                              row?.['CaixaItem[Empresa]'] || row?.['[Empresa]'] || row?.Empresa || '';
              return empresa ? `${String(idCaixa).trim()}-${String(empresa).trim()}`.toLowerCase() : String(idCaixa).trim().toLowerCase();
            }

            // Prioridade 2: hash determinístico dos campos do registro
            const cfKey = JSON.stringify({
              date: record.transaction_date || '',
              employee: record.external_employee_id || '',
              company: record.external_company_id || '',
              amount: record.amount ?? 0,
              type: record.transaction_type || '',
              method: record.payment_method || '',
              mode: record.transaction_mode || ''
            });
            return `cf_${deterministicHash(cfKey)}`;
          }

          case 'cash_flow_statement': {
            const date = record.transaction_date ? String(record.transaction_date).split('T')[0] : '';
            const catId = record.category_id ? String(record.category_id) : '';
            const companyId = record.external_company_id ? String(record.external_company_id) : '';
            if (date && catId) return `${date}|${catId}|${companyId}`.toLowerCase();
            // Fallback determinístico
            const cfsKey = JSON.stringify({ date, catId, companyId, amount: record.amount ?? 0 });
            return `cfs_${deterministicHash(cfsKey)}`;
          }

          case 'sales': {
            // Usar venda_id + produto + empresa + funcionário + quantidade + valor
            // Isso garante que o mesmo item de venda gera sempre o mesmo external_id
            const vendaId = record.venda_id || record.sale_uuid || '';
            const productId = record.external_product_id || '';
            const companyId = record.external_company_id || '';
            const employeeId = record.external_employee_id || '';
            const qty = String(record.quantity ?? '');
            const value = String(record.total_value ?? '');
            
            if (vendaId && productId) {
              const salesKey = `${vendaId}|${productId}|${companyId}|${employeeId}|${qty}|${value}`;
              return `sv_${deterministicHash(salesKey)}`;
            }
            
            // Fallback: hash dos campos principais
            const salesFallbackKey = JSON.stringify({
              venda_id: vendaId,
              product: productId,
              company: companyId,
              employee: employeeId,
              date: record.sale_date || '',
              qty,
              value
            });
            return `sv_${deterministicHash(salesFallbackKey)}`;
          }

          default: {
            // Tentar campos comuns de ID
            for (const field of ['codigo', 'id', 'code', 'Codigo', 'Id', 'Code']) {
              const val = record[field] || row?.[field] || row?.[`[${field}]`];
              if (val !== null && val !== undefined && val !== '') {
                return String(val).trim().toLowerCase();
              }
            }
            // Fallback: hash do registro inteiro
            const genericKey = JSON.stringify(row || record);
            return `${entityType}_${deterministicHash(genericKey)}`;
          }
        }
      }

      // Aplicar a todos os registros sem external_id
      transformedRecords.forEach((record: any, index: number) => {
        if (!record.external_id || record.external_id === null || record.external_id === '') {
          record.external_id = generateExternalId(record, config.entity_type, rows[index]);
          if (index < 3 && process.env.NODE_ENV === 'development') {
            console.log(`🔑 Generated external_id for ${config.entity_type}:`, record.external_id);
          }
        }
      });

      // ============================================================
      // DEDUPLICATE: Remover duplicados pelo external_id
      // ============================================================
      const uniqueRecords = Array.from(
        new Map(
          transformedRecords.map(record => [record.external_id, record])
        ).values()
      );

      const duplicatesRemoved = transformedRecords.length - uniqueRecords.length;
      if (duplicatesRemoved > 0) {
        console.log(`⚠️ Removidos ${duplicatesRemoved} registros duplicados no batch`);
      }

      console.log(`💾 Processando ${uniqueRecords.length} registros únicos...`);

      // Use uniqueRecords em vez de transformedRecords daqui em diante
      const transformedRecordsUnique = uniqueRecords;

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
        throw new Error(`Tipo de entidade não suportado: ${config.entity_type}`);
      }

      // Campos permitidos por entidade — DEVE estar em sincronia com entityTypeConfig no page.tsx
      // e com as colunas reais das tabelas external_* no Supabase
      const allowedFields: Record<string, Set<string>> = {
        companies: new Set([
          'external_id', 'name', 'fantasy_name', 'cnpj', 'status',
          'code', 'codigo'
        ]),
        employees: new Set([
          'external_id', 'name', 'external_company_id', 'external_code',
          'email', 'department', 'position', 'status',
          'code', 'codigo'
        ]),
        products: new Set([
          'external_id', 'name', 'external_company_id',
          'type', 'category', 'product_group',
          'code', 'codigo', 'description'
        ]),
        sales: new Set([
          'external_id', 'venda_id', 'sale_uuid', 'external_product_id', 'external_employee_id',
          'external_company_id', 'sale_date', 'sale_mode', 'period',
          'quantity', 'total_value', 'cost'
        ]),
        cash_flow: new Set([
          'external_id', 'external_employee_id', 'external_company_id',
          'transaction_date', 'payment_method', 'transaction_type',
          'transaction_mode', 'period', 'amount'
        ]),
        cash_flow_statement: new Set([
          'external_id', 'category_id', 'external_company_id',
          'transaction_date', 'amount'
        ]),
        categories: new Set([
          'external_id', 'name', 'external_company_id',
          'layer_01', 'layer_02', 'layer_03', 'layer_04',
          'code', 'codigo', 'parent_id'
        ]),
        stock: new Set([
          'external_id', 'external_product_id', 'product_name', 'product_group',
          'external_company_id', 'unit', 'purchase_unit', 'conversion_factor',
          'min_quantity', 'max_quantity', 'quantity',
          'last_cost', 'average_cost', 'updated_at_external'
        ]),
      };

      const allowed = allowedFields[config.entity_type] || new Set();

      // Criar objeto limpo: company_group_id + external_id + raw_data + campos permitidos
      const cleanedRecords = transformedRecordsUnique.map((record: any) => {
        const cleaned: any = {
          company_group_id: record.company_group_id,
          external_id: record.external_id,
          raw_data: record.raw_data,
        };
        for (const field of allowed) {
          if (record[field] !== undefined && record[field] !== null) {
            cleaned[field] = record[field];
          }
        }
        return cleaned;
      });

      // Log resumo apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development' && cleanedRecords.length > 0) {
        console.log(`📤 Enviando ${cleanedRecords.length} registros para ${config.entity_type}`);
        console.log(`📤 Exemplo external_id:`, cleanedRecords[0].external_id);
      }

      // Recovery: tentar recuperar campos obrigatórios do raw_data ANTES da validação
      cleanedRecords.forEach((record: any) => {
        const amountAliases = [
          'valor', 'value', 'valortotal', 'valor_total', 'valorcxa', 'valorcaixa', 'valorliquido',
          'montante', 'quantia', 'total', 'vlr', 'valormoviment', 'valormovimento'
        ];
        if (config.entity_type === 'cash_flow' && (record.amount == null || record.amount === 0)) {
          const recovered = recoverNumericFromRawData(record.raw_data, 'amount', amountAliases);
          if (recovered !== null) record.amount = recovered;
        }
        if (config.entity_type === 'cash_flow_statement' && (record.amount == null || record.amount === 0)) {
          const recovered = recoverNumericFromRawData(record.raw_data, 'amount', amountAliases);
          if (recovered !== null) record.amount = recovered;
        }
        if (config.entity_type === 'sales') {
          if (record.quantity == null || record.quantity === 0) {
            const recovered = recoverNumericFromRawData(record.raw_data, 'quantity', ['qtd', 'quantidade']);
            if (recovered !== null) record.quantity = recovered;
          }
          if (record.total_value == null || record.total_value === 0) {
            const recovered = recoverNumericFromRawData(record.raw_data, 'total_value', ['valor_total', 'totalvalue']);
            if (recovered !== null) record.total_value = recovered;
          }
          if ((!record.sale_uuid || record.sale_uuid === '') && record.venda_id) {
            record.sale_uuid = record.venda_id;
          }
        }
      });

      // ============================================================
      // VALIDAR registros transformados DEPOIS da limpeza e recovery
      // ============================================================
      const validationRules: Record<string, { required: string[], types: Record<string, 'string' | 'number' | 'date'> }> = {
        companies: {
          required: ['external_id'],
          types: {}
        },
        employees: {
          required: ['external_id', 'external_company_id'],
          types: {}
        },
        products: {
          required: ['external_id'],
          types: {}
        },
        sales: {
          required: ['external_id', 'external_product_id', 'external_company_id', 'sale_date'],
          types: { quantity: 'number', total_value: 'number', cost: 'number', sale_date: 'date' }
        },
        cash_flow: {
          required: ['external_id', 'transaction_date', 'amount'],
          types: { amount: 'number', transaction_date: 'date' }
        },
        cash_flow_statement: {
          required: ['external_id', 'category_id', 'transaction_date', 'amount'],
          types: { amount: 'number', transaction_date: 'date' }
        },
        categories: {
          required: ['external_id'],
          types: {}
        },
        stock: {
          required: ['external_product_id', 'quantity'],
          types: { quantity: 'number' }
        },
      };

      const rules = validationRules[config.entity_type];
      if (rules) {
        const invalidRecords: any[] = [];
        const validRecords: any[] = [];

        cleanedRecords.forEach((record: any) => {
          // Checar campos obrigatórios
          const missingFields = rules.required.filter(f => {
            const val = record[f];
            return val === undefined || val === null || val === '';
          });

          if (missingFields.length > 0) {
            invalidRecords.push({ record, reason: `Campos faltando: ${missingFields.join(', ')}` });
            return;
          }

          // Checar tipos
          for (const [field, type] of Object.entries(rules.types)) {
            const val = record[field];
            if (val === undefined || val === null) continue; // Já checado em required

            if (type === 'number' && typeof val !== 'number') {
              const num = parseFloat(val);
              if (isNaN(num)) {
                invalidRecords.push({ record, reason: `${field} não é número: ${val}` });
                return;
              }
              record[field] = num; // Auto-fix
            }
            if (type === 'date' && typeof val === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(val)) {
              invalidRecords.push({ record, reason: `${field} não é data válida: ${val}` });
              return;
            }
          }

          validRecords.push(record);
        });

        if (invalidRecords.length > 0) {
          console.warn(`⚠️ ${invalidRecords.length}/${cleanedRecords.length} registros inválidos removidos`);
          invalidRecords.slice(0, 3).forEach(({ record, reason }, i) => {
            console.warn(`  ⚠️ [${i + 1}] ${reason} | external_id: ${record.external_id}`);
            if (record.raw_data && i === 0) {
              console.warn(`  📋 Chaves do raw_data (1º inválido): ${Object.keys(record.raw_data).join(', ')}`);
            }
          });
        }

        if (validRecords.length === 0) {
          throw new Error(`Nenhum registro válido. Total: ${cleanedRecords.length}, Inválidos: ${invalidRecords.length}. Motivo mais comum: ${invalidRecords[0]?.reason || 'desconhecido'}`);
        }

        // Substituir array com apenas os válidos
        cleanedRecords.splice(0, cleanedRecords.length, ...validRecords);
      }

      // Safety check: verificar se há campos inesperados (não deveria acontecer após allowedFields)
      if (process.env.NODE_ENV === 'development' && cleanedRecords.length > 0) {
        const sample = cleanedRecords[0];
        const expectedFields = ['company_group_id', 'external_id', 'raw_data', ...Array.from(allowed)];
        const unexpected = Object.keys(sample).filter(k => !expectedFields.includes(k));
        if (unexpected.length > 0) {
          console.warn(`⚠️ Campos inesperados em ${config.entity_type}: ${unexpected.join(', ')}`);
        }
      }

      // ============================================================
      // SALVAMENTO OTIMIZADO: Filtrar duplicados SÓ do período, depois INSERT
      // Em vez de UPSERT (que escaneia índice UNIQUE da tabela inteira),
      // buscamos os external_ids que JÁ existem no período e inserimos só os novos.
      // ============================================================

      // Mapa de campo de data por tabela (para filtrar só o período)
      const dateFieldMap: Record<string, string> = {
        external_sales: 'sale_date',
        external_cash_flow: 'transaction_date',
        external_cash_flow_statement: 'transaction_date',
        external_stock: 'updated_at_external',
      };
      const dateColumn = dateFieldMap[tableName];

      // Coletar todos os external_ids do batch atual
      const batchExternalIds = cleanedRecords.map((r: any) => r.external_id).filter(Boolean);

      console.log(`💾 Salvando ${cleanedRecords.length} registros em ${tableName} (insert otimizado)...`);

      // Buscar external_ids que JÁ existem no banco — FILTRADO pelo período
      const existingIds = new Set<string>();
      const LOOKUP_BATCH_SIZE = 500;

      for (let i = 0; i < batchExternalIds.length; i += LOOKUP_BATCH_SIZE) {
        const idChunk = batchExternalIds.slice(i, i + LOOKUP_BATCH_SIZE);

        let query = supabaseAdmin
          .from(tableName)
          .select('external_id')
          .eq('company_group_id', queueItem.company_group_id)
          .in('external_id', idChunk);

        // Se a entidade tem campo de data, filtrar só no período (MUITO mais rápido)
        if (dateColumn && hasDateField) {
          query = query
            .gte(dateColumn, batchStartDateStr)
            .lte(dateColumn, batchEndDateStr);
        }

        const { data: existingRows } = await query;
        if (existingRows) {
          existingRows.forEach((r: any) => existingIds.add(r.external_id));
        }
      }

      // Filtrar: inserir APENAS registros que NÃO existem no período
      const newRecords = cleanedRecords.filter((r: any) => !existingIds.has(r.external_id));
      const skippedCount = cleanedRecords.length - newRecords.length;

      if (skippedCount > 0) {
        console.log(`⏭️ ${skippedCount} registros já existem no período — ignorados`);
      }

      const batchSize = 500; // Maior que antes (era 200) — INSERT simples é mais rápido
      let savedCount = 0;
      let failedBatches = 0;
      const totalBatches = Math.ceil(newRecords.length / batchSize);

      if (newRecords.length === 0) {
        console.log(`✅ Nenhum registro novo para inserir (todos já existiam no período)`);
      }

      for (let i = 0; i < newRecords.length; i += batchSize) {
        const batch = newRecords.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        let success = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            // INSERT simples com ignoreDuplicates: true
            // Se por acaso um registro duplicado escapar do filtro, é ignorado silenciosamente
            const { error: insertError } = await supabaseAdmin
              .from(tableName)
              .upsert(batch, { onConflict: 'company_group_id,external_id', ignoreDuplicates: true });

            if (!insertError) {
              savedCount += batch.length;
              success = true;
              break;
            }

            // Se é erro de schema/constraint, não adianta retry
            if (insertError.message.includes('column') ||
                insertError.message.includes('violates') ||
                insertError.message.includes('schema')) {
              console.error(`❌ Erro de schema no lote ${batchNumber}:`, insertError.message);
              if (batch.length > 0) {
                console.error(`❌ Exemplo de registro:`, JSON.stringify(batch[0], null, 2).substring(0, 500));
              }
              break;
            }

            if (attempt < 3) {
              console.warn(`⚠️ Lote ${batchNumber}: tentativa ${attempt} falhou, retry em 1s...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              console.error(`❌ Lote ${batchNumber} falhou após 3 tentativas: ${insertError.message}`);
            }
          } catch (error: any) {
            if (attempt >= 3) {
              console.error(`❌ Exceção no lote ${batchNumber}: ${error.message}`);
            } else {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        if (!success) {
          failedBatches++;
          console.warn(`⚠️ Lote ${batchNumber}/${totalBatches} falhou, continuando...`);
        }

        if (batchNumber % 5 === 0 || batchNumber === totalBatches) {
          console.log(`📊 Progresso: ${batchNumber}/${totalBatches} lotes (${savedCount} inseridos, ${failedBatches} falharam)`);
        }
      }

      if (savedCount === 0 && newRecords.length > 0) {
        throw new Error(`Nenhum registro salvo. Todos os ${totalBatches} lotes falharam.`);
      }

      if (failedBatches > 0) {
        console.warn(`⚠️ ${failedBatches}/${totalBatches} lotes falharam. ${savedCount}/${newRecords.length} registros inseridos.`);
      }

      console.log(`✅ Salvamento: ${savedCount} novos + ${skippedCount} já existiam = ${cleanedRecords.length} total em ${tableName}`);
    }

    // ----------------------------------------------------------
    // 8. Atualizar progresso
    // ----------------------------------------------------------
    if (hasDateField) {
      const newProcessedDays = processedDays + daysInBatch;
      const newProcessedRecords = (queueItem.processed_records || 0) + rows.length;
      const newProgress = Math.min(Math.round((newProcessedDays / queueItem.total_days) * 100), 100);
      const hasMore = newProcessedDays < queueItem.total_days;

      console.log(`📊 Atualizando progresso: ${processedDays} → ${newProcessedDays}/${queueItem.total_days} dias`);

      // CRÍTICO: salvar progresso no banco — sem isso, o loop repete o mesmo dia infinitamente
      const { error: updateError } = await supabaseAdmin
        .from('sync_queue')
        .update({
          processed_days: newProcessedDays,
          processed_records: newProcessedRecords,
          progress: newProgress,
          status: hasMore ? 'processing' : 'completed',
          updated_at: new Date().toISOString(),
          ...(hasMore ? {} : { finished_at: new Date().toISOString() }),
        })
        .eq('id', queueItem.id);

      if (updateError) {
        console.error('❌ ERRO CRÍTICO ao atualizar progresso no banco:', updateError);
        return NextResponse.json({
          status: 'day_error',
          queue_id: queueItem.id,
          error: `Falha ao salvar progresso: ${updateError.message}. Loop interrompido para evitar duplicação.`,
        }, { status: 500 });
      }

      console.log(`✅ Progresso salvo: ${newProcessedDays}/${queueItem.total_days} dias, ${newProcessedRecords} registros`);

      // Se não há mais dias E o update acima não marcou completed, finalizar via RPC
      if (!hasMore) {
        console.log('✅ Todos os dias processados. Finalizando item da fila...');
        await supabaseAdmin.rpc('finish_sync_queue_item', {
          p_queue_id: queueItem.id,
          p_status: 'completed',
          p_total_records: newProcessedRecords,
          p_error_message: null,
        });
      }

      return NextResponse.json({
        status: hasMore ? 'processing' : 'completed',
        queue_id: queueItem.id,
        day: `${batchStartDateStr} até ${batchEndDateStr}`,
        day_records: rows.length,
        processed_days: newProcessedDays,
        total_days: queueItem.total_days,
        processed_records: newProcessedRecords,
        has_more: hasMore,
        progress: newProgress,
      });
    } else {
      // Entidades sem campo de data: processar tudo de uma vez e finalizar
      // NOTA: Para entidades sem data (companies, employees, products, categories, stock),
      // processamos tudo de uma vez, mas com proteção TOPN(5000) já adicionada acima
      // para evitar timeout ao buscar todos os registros de uma vez
      
      const newProcessedDays = queueItem.total_days; // Marcar todos os dias como processados
      const newProcessedRecords = rows.length;

      console.log(`📊 Processando entidade sem data (${config.entity_type}): ${rows.length} registros`);
      if (config.entity_type === 'companies') {
        console.log(`🏢 [Empresas] Sync finalizada: ${rows.length} empresas gravadas/atualizadas`);
      }

      // Finalizar item imediatamente
      await supabaseAdmin.rpc('finish_sync_queue_item', {
        p_queue_id: queueItem.id,
        p_status: 'completed',
        p_total_records: newProcessedRecords,
        p_error_message: null,
      });

      return NextResponse.json({
        status: 'completed',
        queue_id: queueItem.id,
        day_records: rows.length,
        processed_days: newProcessedDays,
        total_days: queueItem.total_days,
        processed_records: newProcessedRecords,
        has_more: false,
        progress: 100,
      });
    }

  } catch (error: any) {
    console.error('❌ Erro ao processar dia:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // Tentar atualizar o status do item da fila se tivermos o ID
    if (queueIdForError) {
      try {
        await supabaseAdmin.rpc('finish_sync_queue_item', {
          p_queue_id: queueIdForError,
          p_status: 'failed',
          p_total_records: 0,
          p_error_message: error.message || 'Erro desconhecido ao processar',
        });
      } catch (updateError) {
        console.error('❌ Erro ao atualizar status da fila:', updateError);
      }
    }
    
    return NextResponse.json({
      status: 'day_error',
      queue_id: queueIdForError || '',
      error: error.message || 'Erro ao processar dia',
    }, { status: 500 });
  }
}

// ============================================================
// HELPERS - Funções de transformação
// ============================================================

/** Encontra valor de um campo no row do Power BI, testando várias variações de nome */
function findFieldValue(row: any, fieldName: string): any {
  // 1. Nome exato
  if (row[fieldName] !== undefined) return row[fieldName];

  // 2. Com colchetes: [fieldName]
  if (fieldName.startsWith('[') && fieldName.endsWith(']')) {
    const clean = fieldName.slice(1, -1);
    if (row[clean] !== undefined) return row[clean];
    if (row[fieldName] !== undefined) return row[fieldName];
    return undefined;
  }

  // 3. Procurar variações nas chaves do row
  const keys = Object.keys(row);
  const match = keys.find(k =>
    k === fieldName ||
    k === `[${fieldName}]` ||
    k.endsWith(`[${fieldName}]`) ||
    k.toLowerCase() === fieldName.toLowerCase() ||
    k.toLowerCase() === `[${fieldName.toLowerCase()}]` ||
    k.toLowerCase().endsWith(`[${fieldName.toLowerCase()}]`)
  );

  return match ? row[match] : undefined;
}

/** Converte valor para número, retornando fallback se impossível */
function toNumber(value: any, fallback: number | null = null): number | null {
  if (value === null || value === undefined) return fallback;
  const num = parseFloat(value);
  return isNaN(num) ? fallback : num;
}

/** Converte valor para data ISO (YYYY-MM-DD) */
function toDateISO(value: any): string | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

/** Busca campo no raw_data por nome parcial */
function findInRawData(rawData: any, ...searchTerms: string[]): any {
  if (!rawData) return undefined;
  const keys = Object.keys(rawData);
  for (const term of searchTerms) {
    // Prioridade 1: match exato com colchetes
    const exact = keys.find(k => k === `[${term}]` || k === term);
    if (exact) return rawData[exact];
    // Prioridade 2: match parcial case-insensitive
    const partial = keys.find(k => k.toLowerCase().includes(term.toLowerCase()));
    if (partial) return rawData[partial];
  }
  return undefined;
}

/**
 * Tenta recuperar um valor numérico do raw_data usando fuzzy matching de chaves.
 * Power BI retorna chaves como "CaixaItem[Valor]" ou "[Valor]" - o match parcial encontra.
 */
function recoverNumericFromRawData(rawData: any, fieldName: string, aliases: string[]): number | null {
  if (!rawData) return null;

  const keys = Object.keys(rawData);

  // 1. Tentar match exato
  for (const alias of [fieldName, `[${fieldName}]`, ...aliases]) {
    if (rawData[alias] !== undefined && rawData[alias] !== null) {
      const num = parseFloat(rawData[alias]);
      if (!isNaN(num)) return num;
    }
  }

  // 2. Tentar match parcial (case-insensitive) - ex: "CaixaItem[Valor]" contém "valor"
  for (const alias of [fieldName, ...aliases]) {
    const match = keys.find(k => k.toLowerCase().includes(alias.toLowerCase()));
    if (match && rawData[match] !== undefined && rawData[match] !== null) {
      const num = parseFloat(rawData[match]);
      if (!isNaN(num)) return num;
    }
  }

  // 3. Fallback para amount: primeira coluna cujo nome sugere valor monetário
  if (fieldName === 'amount') {
    const amountLike = /valor|value|total|amount|montante|quantia|vlr|sum\(|\[valor\]/i;
    for (const key of keys) {
      if (!amountLike.test(key)) continue;
      const val = rawData[key];
      if (val !== undefined && val !== null) {
        const num = parseFloat(val);
        if (!isNaN(num)) return num;
      }
    }
  }

  return null;
}

// Campos numéricos por entidade
const NUMERIC_FIELDS = ['amount', 'quantity', 'total_value', 'cost'];
// Campos de data por entidade
const DATE_FIELDS = ['sale_date', 'transaction_date', 'date', 'updated_at_external'];
// Campos obrigatórios com fallback 0
const REQUIRED_NUMERIC: Record<string, string[]> = {
  sales: ['quantity', 'total_value'],
  cash_flow: ['amount'],
  cash_flow_statement: ['amount'],
};

function transformRecord(row: any, config: any, companyGroupId: string): any {
  const fieldMappings = config.field_mapping || config.field_mappings || {};
  const record: any = {
    company_group_id: companyGroupId,
    raw_data: row,
  };

  // field_mapping é SEMPRE { pbiField: localField }
  // (garantido pelo frontend após Cmd 8 do Batch 1)
  Object.entries(fieldMappings).forEach(([pbiField, localField]) => {
    if (!localField || typeof localField !== 'string') return;
    
    let value = null;
    
    // Tentar encontrar o valor no row com diferentes formatos de nome PBI
    // 1. Nome exato
    if (row[pbiField] !== undefined) {
      value = row[pbiField];
    }
    // 2. Com colchetes: [NomeCampo] ou Table[NomeCampo]
    else {
      const cleanPbi = pbiField.replace(/^\[|\]$/g, '');
      const keys = Object.keys(row);
      const matchingKey = keys.find(k => 
        k === pbiField ||
        k === `[${cleanPbi}]` ||
        k === cleanPbi ||
        k.endsWith(`[${cleanPbi}]`)
      );
      if (matchingKey) {
        value = row[matchingKey];
      }
    }
    
    // Converter datas para YYYY-MM-DD
    if (value != null && (localField.includes('date') || localField.includes('Date'))) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          value = date.toISOString().split('T')[0];
        }
      } catch (e) {
        // Manter valor original se não conseguir converter
      }
    }
    
    // Converter campos numéricos
    if (['amount', 'quantity', 'total_value', 'cost', 'min_quantity', 'max_quantity', 
         'last_cost', 'average_cost', 'conversion_factor'].includes(localField)) {
      if (value != null) {
        const numValue = parseFloat(value);
        value = isNaN(numValue) ? 0 : numValue;
      } else if (['quantity', 'total_value'].includes(localField) && config.entity_type === 'sales') {
        value = 0; // Campos obrigatórios de vendas
      }
    }
    
    // Adicionar ao registro
    if (value != null) {
      record[localField] = value;
    }
  });

  // Recovery: tentar encontrar campos obrigatórios no raw_data se não foram mapeados
  if (config.entity_type === 'cash_flow' && record.amount == null) {
    const recovered = recoverNumericFromRawData(record.raw_data, 'amount', ['valor', 'value']);
    if (recovered !== null) record.amount = recovered;
  }
  
  if (config.entity_type === 'sales') {
    if (record.quantity == null || record.quantity === 0) {
      const recovered = recoverNumericFromRawData(record.raw_data, 'quantity', ['qtd', 'quantidade']);
      if (recovered !== null) record.quantity = recovered;
    }
    if (record.total_value == null || record.total_value === 0) {
      const recovered = recoverNumericFromRawData(record.raw_data, 'total_value', ['valor_total', 'totalvalue']);
      if (recovered !== null) record.total_value = recovered;
    }
  }

  // Verificar campos não mapeados do Power BI (log apenas 1% para não spammar)
  if (Math.random() < 0.01) {
    const unmappedRecordKeys = Object.keys(row).filter(k => {
      return !Object.keys(fieldMappings).some(pbi =>
        k === pbi ||
        k === `[${pbi}]` ||
        k.endsWith(`[${pbi}]`) ||
        k.toLowerCase() === pbi.toLowerCase()
      );
    });
    
    if (unmappedRecordKeys.length > 0) {
      console.log('⚠️ Campos não mapeados do Power BI:', unmappedRecordKeys);
    }
  }

  return record;
}