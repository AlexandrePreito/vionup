-- Query para verificar estatísticas de sincronização por empresa
-- Ajuste os parâmetros abaixo conforme necessário

-- ============================================================
-- PARÂMETROS (AJUSTE AQUI)
-- ============================================================
-- Substitua 'SEU_CONFIG_ID' pelo ID da configuração que você quer verificar
-- Substitua 'cash_flow' pela entidade desejada: 'sales', 'cash_flow', 'cash_flow_statement'

WITH config_data AS (
  SELECT 
    sc.id as config_id,
    sc.entity_type,
    sc.is_incremental,
    sc.incremental_days,
    sc.initial_date,
    sc.last_sync_at,
    sc.date_field,
    c.company_group_id
  FROM powerbi_sync_configs sc
  INNER JOIN powerbi_connections c ON sc.connection_id = c.id
  WHERE sc.id = 'SEU_CONFIG_ID' -- SUBSTITUA PELO ID DA CONFIGURAÇÃO
    AND sc.entity_type = 'cash_flow' -- SUBSTITUA PELA ENTIDADE: 'sales', 'cash_flow', 'cash_flow_statement'
),
period_filter AS (
  SELECT 
    *,
    CASE 
      WHEN is_incremental THEN 
        (CURRENT_DATE - (incremental_days || 7))::date
      WHEN initial_date IS NOT NULL THEN 
        initial_date::date
      ELSE 
        (CURRENT_DATE - 30)::date
    END as filter_start_date,
    CURRENT_DATE as filter_end_date
  FROM config_data
)
SELECT 
  -- Informações da configuração
  cd.config_id,
  cd.entity_type,
  cd.is_incremental,
  cd.incremental_days,
  cd.initial_date,
  cd.last_sync_at,
  pf.filter_start_date,
  pf.filter_end_date,
  
  -- Informações da empresa
  cm.company_id,
  c.name as company_name,
  ec.external_id as external_company_code,
  
  -- Estatísticas
  COUNT(DISTINCT CASE 
    WHEN cd.entity_type = 'sales' THEN s.id
    WHEN cd.entity_type = 'cash_flow' THEN cf.id
    WHEN cd.entity_type = 'cash_flow_statement' THEN cfs.id
  END) as total_records,
  
  MIN(CASE 
    WHEN cd.entity_type = 'sales' THEN s.sale_date
    WHEN cd.entity_type = 'cash_flow' THEN cf.transaction_date
    WHEN cd.entity_type = 'cash_flow_statement' THEN cfs.transaction_date
  END) as min_date,
  
  MAX(CASE 
    WHEN cd.entity_type = 'sales' THEN s.sale_date
    WHEN cd.entity_type = 'cash_flow' THEN cf.transaction_date
    WHEN cd.entity_type = 'cash_flow_statement' THEN cfs.transaction_date
  END) as max_date

FROM period_filter pf
CROSS JOIN config_data cd
LEFT JOIN LATERAL (
  -- Buscar empresas externas com registros no período
  SELECT DISTINCT 
    CASE 
      WHEN cd.entity_type = 'sales' THEN s.external_company_id
      WHEN cd.entity_type = 'cash_flow' THEN cf.external_company_id
      WHEN cd.entity_type = 'cash_flow_statement' THEN cfs.external_company_id
    END as external_company_code
  FROM 
    CASE 
      WHEN cd.entity_type = 'sales' THEN external_sales s
      WHEN cd.entity_type = 'cash_flow' THEN external_cash_flow cf
      WHEN cd.entity_type = 'cash_flow_statement' THEN external_cash_flow_statements cfs
    END
  WHERE 
    CASE 
      WHEN cd.entity_type = 'sales' THEN s.company_group_id = cd.company_group_id
        AND s.external_company_id IS NOT NULL
        AND s.sale_date >= pf.filter_start_date
        AND s.sale_date <= pf.filter_end_date
      WHEN cd.entity_type = 'cash_flow' THEN cf.company_group_id = cd.company_group_id
        AND cf.external_company_id IS NOT NULL
        AND cf.transaction_date >= pf.filter_start_date
        AND cf.transaction_date <= pf.filter_end_date
      WHEN cd.entity_type = 'cash_flow_statement' THEN cfs.company_group_id = cd.company_group_id
        AND cfs.external_company_id IS NOT NULL
        AND cfs.transaction_date >= pf.filter_start_date
        AND cfs.transaction_date <= pf.filter_end_date
    END
) companies ON true

-- Buscar empresa externa
LEFT JOIN external_companies ec ON 
  ec.company_group_id = cd.company_group_id 
  AND ec.external_id = companies.external_company_code

-- Buscar mapeamento para empresa interna
LEFT JOIN company_mappings cm ON 
  cm.company_group_id = cd.company_group_id
  AND cm.external_company_id = ec.id

-- Buscar empresa interna
LEFT JOIN companies c ON c.id = cm.company_id

-- Buscar registros para contagem
LEFT JOIN LATERAL (
  SELECT 
    CASE 
      WHEN cd.entity_type = 'sales' THEN s.id
      WHEN cd.entity_type = 'cash_flow' THEN cf.id
      WHEN cd.entity_type = 'cash_flow_statement' THEN cfs.id
    END as id,
    CASE 
      WHEN cd.entity_type = 'sales' THEN s.sale_date
      WHEN cd.entity_type = 'cash_flow' THEN cf.transaction_date
      WHEN cd.entity_type = 'cash_flow_statement' THEN cfs.transaction_date
    END as transaction_date
  FROM 
    CASE 
      WHEN cd.entity_type = 'sales' THEN external_sales s
      WHEN cd.entity_type = 'cash_flow' THEN external_cash_flow cf
      WHEN cd.entity_type = 'cash_flow_statement' THEN external_cash_flow_statements cfs
    END
  WHERE 
    CASE 
      WHEN cd.entity_type = 'sales' THEN 
        s.company_group_id = cd.company_group_id
        AND s.external_company_id = companies.external_company_code
        AND s.sale_date >= pf.filter_start_date
        AND s.sale_date <= pf.filter_end_date
      WHEN cd.entity_type = 'cash_flow' THEN 
        cf.company_group_id = cd.company_group_id
        AND cf.external_company_id = companies.external_company_code
        AND cf.transaction_date >= pf.filter_start_date
        AND cf.transaction_date <= pf.filter_end_date
      WHEN cd.entity_type = 'cash_flow_statement' THEN 
        cfs.company_group_id = cd.company_group_id
        AND cfs.external_company_id = companies.external_company_code
        AND cfs.transaction_date >= pf.filter_start_date
        AND cfs.transaction_date <= pf.filter_end_date
    END
) records ON true

WHERE cm.company_id IS NOT NULL
GROUP BY 
  cd.config_id,
  cd.entity_type,
  cd.is_incremental,
  cd.incremental_days,
  cd.initial_date,
  cd.last_sync_at,
  pf.filter_start_date,
  pf.filter_end_date,
  cm.company_id,
  c.name,
  ec.external_id

ORDER BY c.name;

-- ============================================================
-- QUERY SIMPLIFICADA PARA CASH_FLOW (MAIS FÁCIL DE USAR)
-- ============================================================
-- Use esta query se a anterior for muito complexa
-- Ajuste o config_id e o período conforme necessário

/*
WITH config_info AS (
  SELECT 
    sc.id,
    sc.entity_type,
    sc.is_incremental,
    sc.incremental_days,
    sc.initial_date,
    c.company_group_id
  FROM powerbi_sync_configs sc
  INNER JOIN powerbi_connections c ON sc.connection_id = c.id
  WHERE sc.id = 'SEU_CONFIG_ID' -- SUBSTITUA PELO ID
)
SELECT 
  c.name as empresa,
  ec.external_id as codigo_externo,
  COUNT(cf.id) as total_registros,
  MIN(cf.transaction_date) as data_inicial,
  MAX(cf.transaction_date) as data_final
FROM config_info ci
CROSS JOIN external_cash_flow cf
INNER JOIN external_companies ec ON 
  ec.company_group_id = ci.company_group_id
  AND ec.external_id = cf.external_company_id
INNER JOIN company_mappings cm ON 
  cm.company_group_id = ci.company_group_id
  AND cm.external_company_id = ec.id
INNER JOIN companies c ON c.id = cm.company_id
WHERE 
  cf.company_group_id = ci.company_group_id
  AND cf.external_company_id IS NOT NULL
  AND cf.transaction_date >= (
    CASE 
      WHEN ci.is_incremental THEN CURRENT_DATE - (ci.incremental_days || 7)
      WHEN ci.initial_date IS NOT NULL THEN ci.initial_date::date
      ELSE CURRENT_DATE - 30
    END
  )
  AND cf.transaction_date <= CURRENT_DATE
GROUP BY c.name, ec.external_id
ORDER BY c.name;
*/
