-- ============================================================
-- QUERY PARA VERIFICAR ESTATÍSTICAS DE CAIXA - AQUARIUS
-- ============================================================
-- Config ID: 898f49f6-3c8a-4eff-8ca6-f4b7a1599ee3
-- Grupo: Aquarius
-- Última sincronização: 2026-02-03 13:45:29
-- Total registros última sync: 22.900
-- ============================================================

WITH config_info AS (
  SELECT 
    sc.id as config_id,
    sc.entity_type,
    sc.is_incremental,
    COALESCE(sc.incremental_days, 7) as incremental_days,
    sc.initial_date,
    sc.last_sync_at,
    c.company_group_id,
    c.name as connection_name
  FROM powerbi_sync_configs sc
  INNER JOIN powerbi_connections c ON sc.connection_id = c.id
  WHERE sc.id = '898f49f6-3c8a-4eff-8ca6-f4b7a1599ee3'
    AND sc.entity_type = 'cash_flow'
),
period_calc AS (
  SELECT 
    *,
    CASE 
      WHEN is_incremental THEN 
        CURRENT_DATE - incremental_days
      WHEN initial_date IS NOT NULL THEN 
        initial_date::date
      ELSE 
        CURRENT_DATE - 30
    END as filter_start_date,
    CURRENT_DATE as filter_end_date
  FROM config_info
)
SELECT 
  -- Informações da configuração
  pc.config_id,
  pc.connection_name,
  pc.is_incremental,
  pc.incremental_days,
  pc.initial_date,
  pc.last_sync_at,
  pc.filter_start_date as periodo_inicio,
  pc.filter_end_date as periodo_fim,
  
  -- Informações da empresa
  c.id as company_id,
  c.name as empresa,
  ec.external_id as codigo_externo,
  
  -- Estatísticas
  COUNT(cf.id) as total_registros,
  MIN(cf.transaction_date) as data_inicial,
  MAX(cf.transaction_date) as data_final

FROM period_calc pc
INNER JOIN external_cash_flow cf ON 
  cf.company_group_id = pc.company_group_id
  AND cf.external_company_id IS NOT NULL
  AND cf.transaction_date >= pc.filter_start_date
  AND cf.transaction_date <= pc.filter_end_date
INNER JOIN external_companies ec ON 
  ec.company_group_id = pc.company_group_id
  AND ec.external_id = cf.external_company_id
INNER JOIN company_mappings cm ON 
  cm.company_group_id = pc.company_group_id
  AND cm.external_company_id = ec.id
INNER JOIN companies c ON c.id = cm.company_id

GROUP BY 
  pc.config_id,
  pc.connection_name,
  pc.is_incremental,
  pc.incremental_days,
  pc.initial_date,
  pc.last_sync_at,
  pc.filter_start_date,
  pc.filter_end_date,
  c.id,
  c.name,
  ec.external_id

ORDER BY c.name;

-- ============================================================
-- QUERY ALTERNATIVA: Ver total geral sem agrupar por empresa
-- ============================================================
/*
WITH config_info AS (
  SELECT 
    sc.id as config_id,
    sc.is_incremental,
    COALESCE(sc.incremental_days, 7) as incremental_days,
    sc.initial_date,
    c.company_group_id
  FROM powerbi_sync_configs sc
  INNER JOIN powerbi_connections c ON sc.connection_id = c.id
  WHERE sc.id = '898f49f6-3c8a-4eff-8ca6-f4b7a1599ee3'
),
period_calc AS (
  SELECT 
    *,
    CASE 
      WHEN is_incremental THEN CURRENT_DATE - incremental_days
      WHEN initial_date IS NOT NULL THEN initial_date::date
      ELSE CURRENT_DATE - 30
    END as filter_start_date,
    CURRENT_DATE as filter_end_date
  FROM config_info
)
SELECT 
  COUNT(cf.id) as total_registros_periodo,
  COUNT(DISTINCT cf.external_company_id) as total_empresas_externas,
  COUNT(DISTINCT cm.company_id) as total_empresas_internas,
  MIN(cf.transaction_date) as data_inicial,
  MAX(cf.transaction_date) as data_final,
  pc.filter_start_date as periodo_inicio,
  pc.filter_end_date as periodo_fim
FROM period_calc pc
INNER JOIN external_cash_flow cf ON 
  cf.company_group_id = pc.company_group_id
  AND cf.external_company_id IS NOT NULL
  AND cf.transaction_date >= pc.filter_start_date
  AND cf.transaction_date <= pc.filter_end_date
LEFT JOIN external_companies ec ON 
  ec.company_group_id = pc.company_group_id
  AND ec.external_id = cf.external_company_id
LEFT JOIN company_mappings cm ON 
  cm.company_group_id = pc.company_group_id
  AND cm.external_company_id = ec.id;
*/
